/* Entropic Labs — Butterfly Trails renderer.
   ==========================================================================
   A 2D canvas world with a pannable camera, three layouts a node can morph
   between, and a small population of butterflies that fly under their own
   steering. It knows about drawing, movement and hit-testing, and nothing
   about what a story is: butterfly.js hands it a flat node list and listens.

   Coordinate spaces
     world    the archive's own units. One unit is roughly the gap between
              two neighbouring memories. The camera lives here.
     screen   CSS pixels. project() converts; unproject() goes back.

   Layouts — every node carries up to three positions and eases between them,
   so switching view is a migration rather than a cut:
     trail         the reading order. Memories strung along one meandering
                   spine, ordered by year.
     constellation clustered by era, linked by cause. The whole archive at
                   once.
     map           by geography, on a graticule. Nodes with no coordinates
                   fade out and are counted instead.

   Performance
     - one pre-rendered glow sprite, scaled with drawImage
     - dust is plain fillRects; the ribbon is three strokes over one polyline
     - the loop idles at ~30fps, rises to full rate only while something
       moves, and stops dead when the tab is hidden
     - an adaptive quality governor watches frame time and sheds dust,
       butterfly trail length and glow passes on slow devices
     - with prefers-reduced-motion nothing drifts, wings do not beat, and the
       loop draws on demand only
   ========================================================================== */

(function (global) {
  'use strict';

  var TAU = Math.PI * 2;

  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }
  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

  function mulberry32(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* Stable 0..1 from a string, so a node's wobble is its own every visit. */
  function hash01(s) {
    var h = 2166136261;
    s = String(s);
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return ((h >>> 0) % 100000) / 100000;
  }

  function fontMono() {
    return 'ui-monospace, "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace';
  }

  /* Manual letter spacing — ctx.letterSpacing is still too new to lean on,
     and every label in this building is spaced out like a dymo strip. */
  function spacedText(ctx, text, x, y, spacing, align) {
    var i, w = 0;
    for (i = 0; i < text.length; i++) w += ctx.measureText(text[i]).width + spacing;
    w -= spacing;
    var cx = align === 'center' ? x - w / 2 : (align === 'right' ? x - w : x);
    for (i = 0; i < text.length; i++) {
      ctx.fillText(text[i], cx, y);
      cx += ctx.measureText(text[i]).width + spacing;
    }
    return w;
  }

  /* Catmull-Rom through a list of points, sampled into a polyline. This is
     what keeps a trail feeling drawn rather than plotted. */
  function smoothPath(points, perSpan) {
    var out = [];
    if (points.length < 2) return points.slice();
    var pts = [points[0]].concat(points, [points[points.length - 1]]);
    for (var i = 1; i < pts.length - 2; i++) {
      var p0 = pts[i - 1], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2];
      for (var j = 0; j < perSpan; j++) {
        var t = j / perSpan, t2 = t * t, t3 = t2 * t;
        out.push({
          x: 0.5 * ((2 * p1.x) + (-p0.x + p2.x) * t +
             (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
             (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
          y: 0.5 * ((2 * p1.y) + (-p0.y + p2.y) * t +
             (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
             (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3)
        });
      }
    }
    out.push(points[points.length - 1]);
    return out;
  }

  function create(canvas, options) {
    options = options || {};

    var ctx = canvas.getContext('2d', { alpha: true });
    var mq = global.matchMedia ? global.matchMedia.bind(global) : null;
    var coarse = mq ? mq('(pointer: coarse)').matches : false;
    var reduceMotion = mq ? mq('(prefers-reduced-motion: reduce)').matches : false;

    var palette = options.palette || {
      paper: '#F1EEFB', ash: '#9C93B8', ember: '#FFC46B',
      signal: '#FF3FA0', violet: '#7C4DFF', trace: '#2FE0C7'
    };

    /* ---------------------------------------------------------- viewport */
    var W = 0, H = 0, dpr = 1, portrait = false;
    var unit = 260;                 /* world unit -> px at zoom 1 */
    var inset = { x: 0, y: 0 }, insetTo = { x: 0, y: 0 };

    /* ------------------------------------------------------------- state */
    var nodes = [];
    var spine = [];                 /* sampled ribbon polyline, world space */
    var links = [];                 /* causal edges */
    var dust = [];
    var flies = [];                 /* butterflies */
    var motes = [];                 /* lights travelling the ribbon */
    var ghostBranch = null;         /* the life that never happened */

    var braid = null;               /* the strands, if the archive has any */
    var braidPaths = [];            /* one sampled polyline per strand */

    var mode = 'trail';
    var morph = { t: 1, dur: 1, start: 0 };
    var focused = null, hovered = null;

    var cam = { x: 0, y: 0, z: 1 };
    var camFrom = { x: 0, y: 0, z: 1 }, camTo = { x: 0, y: 0, z: 1 };
    var camT = 1, camDur = 1, camStart = 0;
    var camFollow = null;           /* a butterfly the camera is tracking */
    var vel = { x: 0, y: 0 };       /* pan inertia, world units per ms */

    var bounds = { minX: -1, maxX: 1, minY: -1, maxY: 1 };
    var zoomRange = { min: 0.35, max: 3.2 };

    var running = false, rafId = 0, last = 0, lastDraw = 0;
    var listeners = {};
    var glowSprite = null;

    /* Adaptive quality: 1 is everything, 0.4 is a phone having a hard time.
       Seeded from what the device admits to, then corrected by measurement. */
    var quality = 1;
    var frameAvg = 16;
    (function seedQuality() {
      var cores = global.navigator && global.navigator.hardwareConcurrency;
      var mem = global.navigator && global.navigator.deviceMemory;
      if ((cores && cores <= 4) || (mem && mem <= 4)) quality = 0.65;
      if ((cores && cores <= 2) || (mem && mem <= 2)) quality = 0.45;
    })();

    /* ------------------------------------------------------- tiny emitter */
    function on(name, fn) {
      (listeners[name] || (listeners[name] = [])).push(fn);
      return api;
    }
    function emit(name, payload) {
      var l = listeners[name];
      if (!l) return;
      for (var i = 0; i < l.length; i++) l[i](payload);
    }

    function now() { return (global.performance || Date).now(); }

    /* --------------------------------------------------------- the glow */
    function buildGlow() {
      var size = 64;
      var c = document.createElement('canvas');
      c.width = c.height = size;
      var g = c.getContext('2d');
      var grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
      grad.addColorStop(0, 'rgba(255,255,255,0.95)');
      grad.addColorStop(0.16, 'rgba(255,255,255,0.42)');
      grad.addColorStop(0.44, 'rgba(255,255,255,0.11)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grad;
      g.fillRect(0, 0, size, size);
      glowSprite = c;
    }

    /* Warm light. The sprite is white, so colour comes from a soft disc laid
       over it additively — cheaper than a tinted gradient per light, and
       overlapping lights build warmth instead of muddying. */
    function tintGlow(x, y, r, alpha, colour) {
      if (!glowSprite) return;
      if (alpha <= 0.004) return;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = clamp(alpha * 0.55, 0, 1);
      ctx.drawImage(glowSprite, x - r, y - r, r * 2, r * 2);
      if (quality > 0.5) {
        ctx.globalAlpha = clamp(alpha * 0.5, 0, 1);
        ctx.fillStyle = colour;
        ctx.beginPath();
        ctx.arc(x, y, r * 0.55, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }

    /* ------------------------------------------------------------ layout */
    function layout() {
      var rect = canvas.getBoundingClientRect();
      W = Math.max(1, Math.round(rect.width));
      H = Math.max(1, Math.round(rect.height));
      dpr = clamp(global.devicePixelRatio || 1, 1, quality < 0.6 ? 1.5 : 2);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      portrait = H > W;
      unit = portrait ? Math.max(150, W * 0.42) : Math.max(190, Math.min(W * 0.17, H * 0.30));

      buildDust();
      computeLayouts();
    }

    function buildDust() {
      var rnd = mulberry32(20260816);
      var target = Math.round(clamp((W * H) / 5200, 60, 260) * quality);
      dust = [];
      for (var i = 0; i < target; i++) {
        var depth = 0.18 + rnd() * 0.8;
        dust.push({
          x: (rnd() * 2 - 1) * 5.2,
          y: (rnd() * 2 - 1) * 3.4,
          d: depth,
          r: 0.5 + rnd() * (depth > 0.72 ? 1.5 : 0.8),
          a: 0.14 + rnd() * 0.5 * depth,
          ph: rnd() * TAU,
          sp: 0.2 + rnd() * 0.55,
          vx: (rnd() - 0.5) * 0.0022,
          vy: (rnd() - 0.5) * 0.0016
        });
      }
    }

    /* ---- trail: one meandering spine, memories strung along it in order.
       The wave is two out-of-phase sines plus a per-node wobble, so the path
       never repeats a shape and never doubles back. */
    function trailPos(node, i, total) {
      var span = portrait ? 0.86 : 1.0;
      var x = i * span;
      var w = hash01(node.id + 'w') - 0.5;
      var y = Math.sin(i * 0.72 + 1.25) * 0.40
            + Math.sin(i * 0.29 + 0.42) * 0.24
            + w * 0.16;
      if (portrait) {
        /* A tall screen reads the trail as a descent rather than a march:
           the same order, turned on its side, so it still scrolls naturally
           under a thumb. */
        return { x: y * 0.92, y: x };
      }
      return { x: x, y: y * (total > 1 ? 1 : 0) };
    }

    /* ======================================================== THE BRAID
       The trail is not one line. Two lives run alongside each other, become
       one, and divide again each time somebody is born.

       Geometry lives in (t, offset) space — t is the time axis the
       controller computes, offset is distance from the trunk — and is mapped
       into world coordinates at the end, so portrait can turn the whole
       braid on its side without any of this changing.

       The rule that makes it read as a braid rather than a flowchart: every
       strand is measured from the trunk, not from zero. A parent's offset
       decays to nothing at the union and a child's grows from nothing at its
       birth, so joins are exact by construction — there is no seam to line
       up, and the wobble that keeps the lines organic dies away to nothing
       at exactly the point where two lines have to touch. */
    var MERGE_W = 1.15;             /* how long a parent takes to converge */
    var BRANCH_W = 0.95;            /* how long a child takes to pull away */

    function smoothstep(e0, e1, x) {
      if (e1 === e0) return x < e0 ? 0 : 1;
      var t = clamp((x - e0) / (e1 - e0), 0, 1);
      return t * t * (3 - 2 * t);
    }

    /* Two slow sines, per strand, so no two lines wander the same way. */
    function wobbleAt(t, phase) {
      return Math.sin(t * 1.45 + phase) * 0.058 + Math.sin(t * 0.62 + phase * 2.3) * 0.036;
    }

    function laneById(id) {
      if (!braid || !id) return null;
      return braid.byId[id] || null;
    }

    /* Where a strand sits, across the trail, at a given moment.

       Three rules, applied in that order:
         it sits `side` lanes off whatever it is measured from;
         if it was born out of that line, it starts on it and pulls away;
         if it joins another line, it gives up its own position for that
         line's as the year arrives.

       Because both of those are interpolations towards another strand's
       actual position — wobble included — a birth leaves its parent exactly,
       and a marriage arrives exactly, with no seam to line up by hand. It is
       also what lets the second generation hang off the first and the third
       off the second without a single absolute position being written down. */
    function laneOffset(lane, t, depth) {
      if (!lane) return 0;
      depth = depth || 0;
      if (depth > 8) return 0;                       /* malformed data guard */

      var base = lane.base ? laneOffset(laneById(lane.base), t, depth + 1) : 0;
      var own = base + lane.side * braid.laneW + wobbleAt(t, lane.phase);

      if (lane.startKind === 'born') {
        var b = smoothstep(lane.from, lane.from + BRANCH_W, t);
        if (b < 1) own = lerp(base, own, b);
      }
      if (lane.endKind === 'joins') {
        var target = laneById(lane.joinTarget);
        if (target) {
          var j = smoothstep(lane.to - MERGE_W, lane.to, t);
          if (j > 0) own = lerp(own, laneOffset(target, t, depth + 1), j);
        }
      }
      return own;
    }

    /* (time, offset) -> world. Portrait reads the braid as a descent rather
       than a march, which is what a thumb wants. */
    function braidToWorld(t, off) {
      /* Portrait has width to spare and height to save, so the strands sit
         further apart across the screen than they would on a wide one —
         otherwise a braid scaled to fit a phone closes up into one line. */
      return portrait ? { x: off * 2.6, y: t } : { x: t, y: off };
    }

    function braidPos(strandId, t) {
      var lane = laneById(strandId) || (braid ? braid.trunk : null);
      return braidToWorld(t, laneOffset(lane, t));
    }

    function buildBraidPaths() {
      braidPaths = [];
      if (!braid) return;
      braid.lanes.forEach(function (lane) {
        var step = 0.11;
        var pts = [];
        for (var t = lane.from; t <= lane.to + 0.0001; t += step) {
          pts.push(braidToWorld(t, laneOffset(lane, t)));
        }
        pts.push(braidToWorld(lane.to, laneOffset(lane, lane.to)));
        braidPaths.push({ lane: lane, pts: pts, stagger: 0 });
      });

      /* Portrait runs time down the screen, so every line still going ends
         at the same moment — and every one of their names would be written
         across the same row. Give each a row of its own, ordered across the
         screen so neighbours are never on the same line. */
      if (portrait) {
        ['start', 'end'].forEach(function (which) {
          var group = braidPaths.filter(function (p) { return p.lane.labelAt === which; });
          group.sort(function (a, b) {
            var pa = which === 'start' ? a.pts[0] : a.pts[a.pts.length - 1];
            var pb = which === 'start' ? b.pts[0] : b.pts[b.pts.length - 1];
            return pa.x - pb.x;
          });
          group.forEach(function (p, i) { p.stagger = i * 15; });
        });
      }
    }

    /* ---- constellation: era clusters on a golden-angle spiral, each node
       on a ring inside its cluster. Groups fall out of the data — an era if
       the story has one, its decade if not — so the shape is the archive's,
       not a template's. */
    function webLayout(list) {
      var groups = {}, order = [];
      list.forEach(function (n) {
        var key = n.era || (n.year ? (Math.floor(n.year / 10) * 10) + 's' : 'unplaced');
        if (!groups[key]) { groups[key] = []; order.push(key); }
        groups[key].push(n);
      });

      var GA = Math.PI * (3 - Math.sqrt(5));
      return order.map(function (key, gi) {
        var kids = groups[key];
        var rad = order.length === 1 ? 0 : 1.15 * Math.sqrt(gi + 0.55);
        var ang = gi * GA;
        var cx = Math.cos(ang) * rad;
        var cy = Math.sin(ang) * rad * 0.82;
        var ring = 0.30 + Math.sqrt(kids.length) * 0.18;
        kids.forEach(function (n, i) {
          if (kids.length === 1) { n.pw = { x: cx, y: cy }; return; }
          var a = (i / kids.length) * TAU + hash01(key) * TAU;
          var rr = ring * (0.72 + (i % 2) * 0.4);
          n.pw = { x: cx + Math.cos(a) * rr, y: cy + Math.sin(a) * rr * 0.85 };
        });
        return { key: key, x: cx, y: cy, count: kids.length };
      });
    }

    /* ---- map: equirectangular, gently squashed. Not a projection anybody
       navigates by — a way of saying "these things happened far apart". */
    var MAP = { w: 4.6, h: 2.3 };
    function mapPos(lat, lon) {
      return { x: (lon / 180) * (MAP.w / 2), y: -(lat / 90) * (MAP.h / 2) };
    }

    var clusters = [];
    function computeLayouts() {
      buildBraidPaths();

      var story = nodes.filter(function (n) { return n.kind === 'story'; });
      var total = story.length;

      /* With a braid, a memory sits on its own strand at its own year. Without
         one, the trail falls back to a single meandering line in reading
         order — an archive that has not said who its strands are still gets a
         trail. */
      story.forEach(function (n, i) {
        n.ptr = (braid && n.t !== null) ? braidPos(n.strand, n.t) : trailPos(n, i, total);
      });

      /* Two memories that land on the same point: one draws over the other,
         only one label survives, and the one underneath cannot be clicked
         at all.

         The test is distance on the trail rather than a shared strand and
         year, because two lives that have already merged are one line from
         then on — a memory on Amma's strand in 2026 and one on Dad's sit at
         the same place, and keying on the strand would call them strangers
         and stack them anyway. Anything closer together than a third of a
         lane is in the same spot as far as a reader's eye or thumb is
         concerned.

         They fan out ACROSS the line rather than along it. Moving them along
         it would slide them in time and claim a year nobody wrote down;
         moving them across it says what is true — these happened together. */
      var NEAR_T = 0.3;
      var together = [];
      story.forEach(function (n) {
        if (!braid || n.t === null) return;
        for (var g = 0; g < together.length; g++) {
          var lead = together[g][0];
          var ndx = n.ptr.x - lead.ptr.x, ndy = n.ptr.y - lead.ptr.y;
          if (ndx * ndx + ndy * ndy < NEAR_T * NEAR_T) { together[g].push(n); return; }
        }
        together.push([n]);
      });
      together.forEach(function (group) {
        if (group.length < 2) return;
        var head = group[0];
        var ahead = braidPos(head.strand, head.t + 0.02);
        var dx = ahead.x - head.ptr.x, dy = ahead.y - head.ptr.y;
        var len = Math.sqrt(dx * dx + dy * dy);
        /* A lane running dead flat still has a direction; if the sample
           degenerates, fall back to straight across the axis. */
        var px = len > 1e-6 ? -dy / len : 0;
        var py = len > 1e-6 ? dx / len : 1;
        var step = 0.42;
        group.forEach(function (n, i) {
          var off = (i - (group.length - 1) / 2) * step;
          n.ptr = { x: n.ptr.x + px * off, y: n.ptr.y + py * off };
        });
      });

      clusters = webLayout(story);

      /* Markers are the braid's own furniture — a union, a birth. They belong
         to the trail and have no place in a constellation of memories or on a
         map, so they stay where they are and fade out instead. */
      nodes.filter(function (n) { return n.kind === 'marker'; }).forEach(function (n) {
        n.ptr = braid ? braidPos(n.strand, n.t) : { x: 0, y: 0 };
        n.pw = n.ptr;
        n.pm = null;
      });

      /* Map positions. Memories close together on a world map read as one
         dot, so anything that lands within a dot's width of something else
         opens into a small ring — the place stays where it is, the memories
         separate.

         The test is distance on the map and not a shared place id: two towns
         an hour's drive apart are half a pixel apart at this scale, and the
         reader cannot click what they cannot see. NEAR is a little under the
         ring radius, so a cluster is exactly the set of points a ring can
         pull apart. */
      var NEAR = 0.09;
      var nearby = [];
      story.forEach(function (n) {
        n.pm = (n.lat === null || n.lat === undefined) ? null : mapPos(n.lat, n.lon);
        if (!n.pm) return;
        var g = null;
        for (var i = 0; i < nearby.length; i++) {
          if (Math.abs(nearby[i].x - n.pm.x) < NEAR &&
              Math.abs(nearby[i].y - n.pm.y) < NEAR) { g = nearby[i]; break; }
        }
        if (!g) { g = { x: n.pm.x, y: n.pm.y, at: [] }; nearby.push(g); }
        g.at.push(n);
      });
      nearby.forEach(function (g) {
        if (g.at.length < 2) return;
        var r = 0.055 + g.at.length * 0.012;
        var seed = hash01(g.x.toFixed(3) + ',' + g.y.toFixed(3)) * TAU;
        g.at.forEach(function (n, i) {
          var a = (i / g.at.length) * TAU + seed;
          n.pm = { x: g.x + Math.cos(a) * r, y: g.y + Math.sin(a) * r };
        });
      });

      /* Ghost markers: the dim, unidentified points ahead of the archive.
         They sit past the end of whatever exists, receding into the dark. */
      var ghosts = nodes.filter(function (n) { return n.kind === 'ghost'; });
      ghosts.forEach(function (n, i) {
        n.ptr = (braid && n.t !== null)
          ? braidPos(n.strand, n.t)
          : trailPos(n, total + i + 1, total + ghosts.length);
        n.pw = { x: Math.cos(i * 1.7) * (1.6 + i * 0.25), y: Math.sin(i * 1.7) * (1.2 + i * 0.2) };
        n.pm = null;
      });

      nodes.forEach(function (n) {
        if (!n.pos) n.pos = { x: n.ptr.x, y: n.ptr.y };
        n.from = { x: n.pos.x, y: n.pos.y };
        n.to = layoutPos(n);
      });

      buildSpine();
      measureBounds();
    }

    function layoutPos(n) {
      if (mode === 'constellation') return n.pw || n.ptr;
      if (mode === 'map') return n.pm || n.ptr;
      return n.ptr;
    }

    function buildSpine() {
      if (braid) {
        /* The braid is the trail. Lights travel each strand rather than one
           line, so a merge reads as two streams arriving. */
        spine = [];
        var count = Math.round(clamp(braidPaths.length * 1.6, 2, 10) * quality);
        motes = [];
        for (var m = 0; m < count; m++) {
          motes.push({
            t: (m * 0.37) % 1,
            sp: 0.000035 + hash01('m' + m) * 0.00005,
            path: m % Math.max(1, braidPaths.length)
          });
        }
        return;
      }

      var pts = nodes
        .filter(function (n) { return n.kind !== 'ghost'; })
        .map(function (n) { return { x: n.ptr.x, y: n.ptr.y }; });

      var ghosts = nodes.filter(function (n) { return n.kind === 'ghost'; })
        .map(function (n) { return { x: n.ptr.x, y: n.ptr.y }; });

      var all = pts.concat(ghosts);
      if (!all.length) { spine = []; return; }

      /* Lead the trail in from off-screen and let it leave again, so it
         reads as a section of something longer rather than a diagram with
         two ends. */
      var first = all[0], secondPt = all[1] || { x: first.x + 1, y: first.y };
      var lastPt = all[all.length - 1];
      var prev = all[all.length - 2] || { x: lastPt.x - 1, y: lastPt.y };
      var lead = {
        x: first.x - (secondPt.x - first.x) * 1.6,
        y: first.y - (secondPt.y - first.y) * 1.6 - 0.3
      };
      var tail = {
        x: lastPt.x + (lastPt.x - prev.x) * 1.9,
        y: lastPt.y + (lastPt.y - prev.y) * 1.9 + 0.25
      };

      spine = smoothPath([lead].concat(all, [tail]), 14);

      /* Lights that travel the trail. Few, slow, and only where there is
         trail to travel. */
      var count = Math.round(clamp(spine.length / 26, 2, 9) * quality);
      motes = [];
      for (var i = 0; i < count; i++) {
        motes.push({ t: i / count, sp: 0.000035 + hash01('m' + i) * 0.00005 });
      }
    }

    function measureBounds() {
      var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      nodes.forEach(function (n) {
        /* In map mode the ghosts and the unplaced have nowhere to be, so
           they must not stretch the frame around what does. */
        if (mode === 'map' && (n.kind === 'ghost' || !n.pm)) return;
        var p = layoutPos(n);
        if (!p) return;
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
      });

      /* The braid is the thing to frame in the trail view, whether or not
         any memory has landed on it yet. */
      if (mode === 'trail' && braidPaths.length) {
        braidPaths.forEach(function (path) {
          path.pts.forEach(function (p) {
            if (p.x < minX) minX = p.x;
            if (p.x > maxX) maxX = p.x;
            if (p.y < minY) minY = p.y;
            if (p.y > maxY) maxY = p.y;
          });
        });
        /* The names sit past the open ends of the lines, along the time
           axis, so the frame has to allow for them or they land under the
           title. */
        if (portrait) { minY -= 1.1; maxY += 2.3; }
        else { minX -= 0.5; maxX += 0.6; }
      }
      if (mode === 'map') {
        minX = Math.min(minX, -MAP.w / 2); maxX = Math.max(maxX, MAP.w / 2);
        minY = Math.min(minY, -MAP.h / 2); maxY = Math.max(maxY, MAP.h / 2);
      }
      if (!isFinite(minX)) { minX = -1; maxX = 1; minY = -0.6; maxY = 0.6; }
      bounds = { minX: minX, maxX: maxX, minY: minY, maxY: maxY };

      /* The floor has to be at or below whatever framing the whole thing
         needs, or fitView gets clamped before it can fit and a tall braid on
         a phone stays half off the screen. One calculation, used by both. */
      zoomRange.min = Math.min(0.4, fitZoom() * 0.8);
      zoomRange.max = 3.4;
    }

    /* The zoom at which the current layout sits inside the band the page
       furniture leaves clear. A phone stacks its chrome top and bottom and
       leaves much less than a wide screen does. */
    function fitZoom() {
      var wSpan = Math.max(0.9, bounds.maxX - bounds.minX);
      var hSpan = Math.max(0.7, bounds.maxY - bounds.minY);
      var safeW = portrait ? 0.88 : 0.86;
      var safeH = portrait ? 0.42 : 0.70;
      return Math.min(
        (W * safeW) / (unit * (wSpan + 0.9)),
        (H * safeH) / (unit * (hSpan + 0.7))
      );
    }

    /* Camera that frames the current layout. The page keeps furniture at the
       top and bottom — a title plate and a dock — so the frame is computed
       against the band actually left clear, not the whole window. Otherwise
       the outermost memory always lands under something. */
    function fitView(ms) {
      var cx = (bounds.minX + bounds.maxX) / 2;
      var cy = (bounds.minY + bounds.maxY) / 2;
      tweenCam(cx, cy, clamp(fitZoom(), zoomRange.min, mode === 'trail' ? 1.15 : 1.6), ms);
    }

    /* ---------------------------------------------------------- projection */
    function project(wx, wy, depth) {
      var d = depth === undefined ? 1 : depth;
      return {
        x: W / 2 + inset.x + (wx - cam.x * d) * unit * cam.z,
        y: H / 2 + inset.y + (wy - cam.y * d) * unit * cam.z
      };
    }
    function unproject(px, py) {
      return {
        x: (px - W / 2 - inset.x) / (unit * cam.z) + cam.x,
        y: (py - H / 2 - inset.y) / (unit * cam.z) + cam.y
      };
    }

    /* ------------------------------------------------------------ camera */
    function tweenCam(x, y, z, ms) {
      camFollow = null;
      vel.x = 0; vel.y = 0;
      camFrom.x = cam.x; camFrom.y = cam.y; camFrom.z = cam.z;
      camTo.x = x; camTo.y = y;
      camTo.z = clamp(z === undefined ? cam.z : z, zoomRange.min, zoomRange.max);
      camDur = reduceMotion ? 1 : (ms === undefined ? 1200 : ms);
      camStart = now();
      camT = 0;
      wake();
    }

    function stepCam(time, dt) {
      if (camFollow) {
        var f = camFollow;
        var k = reduceMotion ? 1 : 0.055;
        cam.x += (f.x - cam.x) * k;
        cam.y += (f.y - cam.y) * k;
        return true;
      }
      if (camT >= 1) {
        /* inertia after a drag */
        if (Math.abs(vel.x) > 0.00002 || Math.abs(vel.y) > 0.00002) {
          cam.x -= vel.x * dt;
          cam.y -= vel.y * dt;
          var damp = Math.pow(0.92, dt / 16);
          vel.x *= damp; vel.y *= damp;
          clampCam();
          return true;
        }
        return false;
      }
      var p = camDur <= 0 ? 1 : clamp((time - camStart) / camDur, 0, 1);
      camT = p;
      var e = easeInOutCubic(p);
      cam.x = lerp(camFrom.x, camTo.x, e);
      cam.y = lerp(camFrom.y, camTo.y, e);
      cam.z = lerp(camFrom.z, camTo.z, e);
      return p < 1;
    }

    /* Keep the world reachable but not escapable — you can drift a screen
       past the last memory and no further. */
    function clampCam() {
      var padX = (W / (unit * cam.z)) * 0.45 + 0.6;
      var padY = (H / (unit * cam.z)) * 0.45 + 0.5;
      cam.x = clamp(cam.x, bounds.minX - padX, bounds.maxX + padX);
      cam.y = clamp(cam.y, bounds.minY - padY, bounds.maxY + padY);
    }

    /* ======================================================== BUTTERFLIES */
    /* A butterfly is a steering agent with a memory of where it has been.
       It seeks a target, wanders while it does, banks into its turns, and
       beats its wings faster when it is working harder. Everything visible
       about it comes out of that. */
    function Butterfly(opts) {
      opts = opts || {};
      this.id = opts.id || ('fly-' + Math.random().toString(36).slice(2, 7));
      this.space = opts.space || 'world';
      this.x = opts.x || 0;
      this.y = opts.y || 0;
      this.vx = 0; this.vy = 0;
      this.tone = opts.tone || palette.ember;
      this.size = opts.size || 1;
      this.speed = opts.speed || 0.0016;
      this.phase = Math.random() * TAU;
      this.seed = Math.random() * 100;
      this.trail = [];
      this.trailCap = Math.round((opts.trailCap || 90) * clamp(quality, 0.45, 1));
      this.target = opts.target || null;   /* {x,y} in this agent's space */
      this.node = opts.node || null;       /* or a node to home in on */
      this.state = opts.state || 'idle';
      this.onArrive = opts.onArrive || null;
      this.arriveAt = opts.arriveAt || 0.10;
      this.life = opts.life || Infinity;
      this.age = 0;
      this.perch = null;
      this.perchUntil = 0;
      this.wrongWay = 0;                   /* the correcting-itself easter egg */
      this.taps = 0;
      this.spin = 0;
      this.alpha = opts.alpha === undefined ? 1 : opts.alpha;
      this.fade = 0;
      this.rare = !!opts.rare;
      this.label = opts.label || '';
    }

    Butterfly.prototype.aim = function (pt) { this.target = pt; this.node = null; };
    Butterfly.prototype.aimNode = function (n) { this.node = n; this.target = null; };

    Butterfly.prototype.step = function (time, dt) {
      this.age += dt;
      var tx = null, ty = null;

      if (this.node) {
        var p = this.node.pos;
        tx = p.x; ty = p.y;
      } else if (this.target) {
        tx = this.target.x; ty = this.target.y;
      }

      if (reduceMotion) {
        /* No flight. It is simply where it was asked to be. */
        if (tx !== null) {
          this.x = tx; this.y = ty;
          if (this.onArrive) { var f = this.onArrive; this.onArrive = null; f(this); }
        }
        this.trail.length = 0;
        return;
      }

      /* Steering is on velocity, not acceleration: a butterfly has a cruise
         speed it approaches smoothly and no meaningful momentum. `speed` is
         in this agent's own units per millisecond, so the same model drives
         a world-space flight and a screen-space one. */
      var wx = Math.sin(time * 0.0008 + this.seed) * 0.55
             + Math.sin(time * 0.0021 + this.seed * 2.3) * 0.28;
      var wy = Math.cos(time * 0.0011 + this.seed * 1.7) * 0.5
             + Math.sin(time * 0.0026 + this.seed) * 0.24;

      var wantX = 0, wantY = 0;
      if (tx !== null && !this.perch) {
        var dx = tx - this.x, dy = ty - this.y;
        var dist = Math.sqrt(dx * dx + dy * dy) || 0.0001;

        /* Once in a while it sets off the wrong way and has to think again.
           Rare, brief, and never on the last stretch. */
        if (this.state === 'seeking' && !this.wrongWay && dist > this.arriveAt * 12 &&
            this.age > 300 && Math.random() < 0.0009) {
          this.wrongWay = 1;
          this.wrongUntil = this.age + 800 + Math.random() * 700;
        }
        var sign = 1;
        if (this.wrongWay === 1) {
          sign = -0.7;
          if (this.age > this.wrongUntil) { this.wrongWay = 2; emit('correct', this); }
        }

        /* ease off over the last stretch so it settles rather than skids */
        var cruise = this.speed * clamp(dist / (this.arriveAt * 5), 0.28, 1);
        wantX = (dx / dist) * cruise * sign;
        wantY = (dy / dist) * cruise * sign;

        if (dist < this.arriveAt && this.onArrive && this.wrongWay !== 1) {
          var fn = this.onArrive;
          this.onArrive = null;
          fn(this);
        }
      }

      var wanderAmt = this.perch ? 0 : (this.state === 'searching' ? 0.62 : 0.34);
      wantX += wx * this.speed * wanderAmt;
      wantY += wy * this.speed * wanderAmt;

      var k = 1 - Math.pow(0.90, dt / 16);
      this.vx += (wantX - this.vx) * k;
      this.vy += (wantY - this.vy) * k;

      var sp = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
      var maxSp = this.speed * 1.7;
      if (sp > maxSp) { this.vx *= maxSp / sp; this.vy *= maxSp / sp; }

      if (this.perch) {
        /* Perched: it sits, tilts, and breathes with its wings. */
        this.x += (this.perch.x - this.x) * 0.12;
        this.y += (this.perch.y - this.y) * 0.12;
        this.vx *= 0.6; this.vy *= 0.6;
        if (time > this.perchUntil) this.perch = null;
      } else {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
      }

      /* Wings beat with effort, and a tapped butterfly spins once. */
      var effort = clamp(sp / (this.speed || 1), 0, 1.4);
      this.phase += (0.009 + effort * 0.013) * dt * (this.perch ? 0.35 : 1);
      if (this.spin > 0) {
        this.spin = Math.max(0, this.spin - dt * 0.0015);
        this.phase += 0.02 * dt;
      }

      /* trail memory */
      if (!this.perch && (sp > this.speed * 0.06 || this.trail.length)) {
        this.trail.push({ x: this.x, y: this.y });
        if (this.trail.length > this.trailCap) this.trail.shift();
      }
    };

    Butterfly.prototype.draw = function (time) {
      var p = this.space === 'screen' ? { x: this.x, y: this.y } : project(this.x, this.y, 1);
      var scale = this.space === 'screen' ? 1 : clamp(cam.z, 0.6, 1.7);
      var s = 7.4 * this.size * scale;
      var a = this.alpha;
      if (a <= 0.01) return;

      /* the luminous trail */
      if (this.trail.length > 2 && quality > 0.42) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.lineCap = 'round';
        var n = this.trail.length;
        var step = quality < 0.7 ? 2 : 1;
        for (var i = 1; i < n; i += step) {
          var t = i / n;
          var q0 = this.trail[i - step] || this.trail[i - 1];
          var q1 = this.trail[i];
          var a0 = this.space === 'screen' ? q0 : project(q0.x, q0.y, 1);
          var a1 = this.space === 'screen' ? q1 : project(q1.x, q1.y, 1);
          ctx.globalAlpha = t * t * 0.20 * a;
          ctx.strokeStyle = this.tone;
          ctx.lineWidth = Math.max(0.5, t * 2.1 * scale);
          ctx.beginPath();
          ctx.moveTo(a0.x, a0.y);
          ctx.lineTo(a1.x, a1.y);
          ctx.stroke();
        }
        ctx.restore();

        /* a few brighter grains left behind, so the trail has texture */
        if (quality > 0.7) {
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          for (var k = 4; k < this.trail.length; k += 9) {
            var g = this.trail[k];
            var gp = this.space === 'screen' ? g : project(g.x, g.y, 1);
            ctx.globalAlpha = (k / this.trail.length) * 0.22 * a;
            ctx.fillStyle = this.tone;
            ctx.fillRect(gp.x - 0.6, gp.y - 0.6, 1.2, 1.2);
          }
          ctx.restore();
        }
      }

      var ang = Math.atan2(this.vy, this.vx);
      if (this.perch || (Math.abs(this.vx) + Math.abs(this.vy) < 0.00002)) ang = -Math.PI / 2;

      /* Wing foreshortening: the flap is a scale on the wing's short axis,
         which is what makes a two-dimensional shape read as a wingbeat. */
      var flap = reduceMotion ? 0.72 : Math.abs(Math.cos(this.phase));
      var open = 0.28 + flap * 0.72;

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(ang + Math.PI / 2);
      ctx.globalCompositeOperation = 'lighter';

      tintGlow(0, 0, s * 2.6, 0.30 * a * (0.7 + flap * 0.5), this.tone);

      ctx.globalAlpha = (0.62 + flap * 0.3) * a;
      ctx.fillStyle = this.tone;

      /* four wings, two mirrored pairs */
      var i2;
      for (i2 = 0; i2 < 2; i2++) {
        var side = i2 === 0 ? -1 : 1;
        ctx.beginPath();
        ctx.moveTo(0, -s * 0.14);
        ctx.bezierCurveTo(
          side * s * 1.15 * open, -s * 1.06,
          side * s * 1.30 * open, -s * 0.10,
          0, s * 0.02
        );
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(0, s * 0.02);
        ctx.bezierCurveTo(
          side * s * 0.92 * open, s * 0.42,
          side * s * 0.66 * open, s * 1.02,
          0, s * 0.30
        );
        ctx.globalAlpha = (0.42 + flap * 0.26) * a;
        ctx.fill();
        ctx.globalAlpha = (0.62 + flap * 0.3) * a;
      }

      /* body */
      ctx.globalAlpha = 0.85 * a;
      ctx.fillStyle = palette.paper;
      ctx.fillRect(-s * 0.055, -s * 0.34, s * 0.11, s * 0.74);
      ctx.restore();
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    };

    /* ============================================================== DRAW */
    function drawDust(time, dt) {
      if (!dust.length) return;
      ctx.fillStyle = palette.paper;
      for (var i = 0; i < dust.length; i++) {
        var n = dust[i];
        if (!reduceMotion) {
          n.x += n.vx * dt * 0.06;
          n.y += n.vy * dt * 0.06;
          if (n.x > 5.4) n.x = -5.4; else if (n.x < -5.4) n.x = 5.4;
          if (n.y > 3.6) n.y = -3.6; else if (n.y < -3.6) n.y = 3.6;
        }
        var p = project(n.x, n.y, n.d);
        if (p.x < -12 || p.x > W + 12 || p.y < -12 || p.y > H + 12) continue;
        var a = n.a;
        if (!reduceMotion) a *= 0.68 + 0.32 * Math.sin(time * 0.001 * n.sp + n.ph);
        ctx.globalAlpha = a * 0.75;
        ctx.fillRect(p.x - n.r / 2, p.y - n.r / 2, n.r, n.r);
      }
      ctx.globalAlpha = 1;
    }

    /* The trail itself: three passes over one polyline — a wide soft bloom,
       a body, and a thin bright core. Fades out as the view leaves the
       reading order behind. */
    /* One strand: the wide bloom in the room's amber so the braid reads as a
       single warm system, the core in the strand's own light so a life is
       still traceable through it. */
    function drawStrand(path, time, strength) {
      var pts = [];
      for (var i = 0; i < path.pts.length; i++) {
        pts.push(project(path.pts[i].x, path.pts[i].y, 1));
      }
      if (pts.length < 2) return;

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';

      var passes = quality > 0.6
        ? [[9 * cam.z, 0.026, palette.ember], [3.2 * cam.z, 0.05, palette.ember], [1.05, 0.17, path.lane.tone]]
        : [[3.4 * cam.z, 0.055, palette.ember], [1.05, 0.16, path.lane.tone]];

      /* A line that simply begins — somebody whose own parents are not in
         this archive — comes up out of nothing rather than switching on. */
      var cut = path.lane.fadeIn ? Math.max(2, Math.round(pts.length * 0.16)) : 0;

      function strokeFrom(i0, alphaMul) {
        for (var k = 0; k < passes.length; k++) {
          ctx.lineWidth = Math.max(0.7, passes[k][0]);
          ctx.strokeStyle = passes[k][2];
          ctx.globalAlpha = passes[k][1] * strength * alphaMul;
          ctx.beginPath();
          ctx.moveTo(pts[i0].x, pts[i0].y);
          for (var j = i0 + 1; j < pts.length; j++) ctx.lineTo(pts[j].x, pts[j].y);
          ctx.stroke();
        }
      }

      if (cut) {
        /* stacked partial strokes: each starts later and adds a little more,
           so the head of the line is faint and it reaches full weight by the
           time it is properly under way */
        strokeFrom(Math.round(cut * 0.55), 0.34);
        strokeFrom(Math.round(cut * 0.8), 0.33);
        strokeFrom(cut, 0.33);
      } else {
        strokeFrom(0, 1);
      }
      ctx.restore();
      ctx.globalAlpha = 1;
      return pts;
    }

    /* The name at the open end of a strand — where it arrives from, or where
       it is still going. */
    /* A name goes at whichever end of a line is open — where it arrives
       from, or where it is still going. A line that starts and ends inside
       the braid is named by its markers instead, so no name is drawn twice. */
    function drawStrandLabel(path, strength) {
      var lane = path.lane;
      if (!lane.label || !lane.labelAt || strength <= 0.12) return;
      var atStart = lane.labelAt === 'start';
      var at = atStart ? path.pts[0] : path.pts[path.pts.length - 1];
      if (!at) return;
      var p = project(at.x, at.y, 1);
      if (p.x < -90 || p.x > W + 90 || p.y < -50 || p.y > H + 50) return;

      ctx.save();
      ctx.globalAlpha = 0.66 * strength;
      ctx.fillStyle = lane.tone;
      ctx.font = '10px ' + fontMono();
      ctx.textBaseline = 'middle';
      var pad = 13;
      if (portrait) {
        var row = pad + (path.stagger || 0);
        spacedText(ctx, lane.label.toUpperCase(), p.x, p.y + (atStart ? -row : row), 1.6, 'center');
      } else {
        spacedText(ctx, lane.label.toUpperCase(),
          p.x + (atStart ? -pad : pad), p.y, 1.6, atStart ? 'right' : 'left');
      }
      ctx.restore();
      ctx.globalAlpha = 1;
    }

    function drawBraid(time, strength) {
      if (!braidPaths.length || strength <= 0.01) return;
      var i;
      var drawn = [];
      for (i = 0; i < braidPaths.length; i++) {
        drawn.push(drawStrand(braidPaths[i], time, strength) || []);
      }

      /* lights travelling the strands */
      if (!reduceMotion) {
        ctx.save();
        for (i = 0; i < motes.length; i++) {
          var m = motes[i];
          m.t += m.sp * 16;
          if (m.t > 1) m.t -= 1;
          var lane = drawn[m.path % drawn.length];
          if (!lane || !lane.length) continue;
          var mp = lane[Math.floor(m.t * (lane.length - 1))];
          if (!mp) continue;
          tintGlow(mp.x, mp.y, 9 * cam.z, 0.2 * Math.sin(m.t * Math.PI) * strength, palette.ember);
        }
        ctx.restore();
      }

      for (i = 0; i < braidPaths.length; i++) drawStrandLabel(braidPaths[i], strength);
    }

    function drawSpine(time, strength) {
      if (braid) { drawBraid(time, strength); return; }
      if (spine.length < 2 || strength <= 0.01) return;
      var i, p;
      var pts = [];
      for (i = 0; i < spine.length; i++) {
        p = project(spine[i].x, spine[i].y, 1);
        pts.push(p);
      }

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';

      var passes = quality > 0.6
        ? [[9 * cam.z, 0.030], [3.2 * cam.z, 0.055], [1.05, 0.15]]
        : [[3.4 * cam.z, 0.06], [1.05, 0.14]];

      for (var k = 0; k < passes.length; k++) {
        ctx.lineWidth = Math.max(0.7, passes[k][0]);
        ctx.strokeStyle = palette.ember;
        ctx.globalAlpha = passes[k][1] * strength;
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.stroke();
      }

      /* lights travelling the trail */
      if (!reduceMotion) {
        for (i = 0; i < motes.length; i++) {
          var m = motes[i];
          m.t += m.sp * 16;
          if (m.t > 1) m.t -= 1;
          var idx = Math.floor(m.t * (spine.length - 1));
          var mp = pts[idx];
          if (!mp) continue;
          var fade = Math.sin(m.t * Math.PI);
          tintGlow(mp.x, mp.y, 9 * cam.z, 0.22 * fade * strength, palette.ember);
        }
      }
      ctx.restore();
      ctx.globalAlpha = 1;
    }

    /* Causal edges. Not database lines — each one bows to one side, and the
       bow is stable per pair, so the web looks drawn by a hand that meant
       it. */
    function drawLinks(time, strength) {
      if (!links.length || strength <= 0.01) return;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';

      for (var i = 0; i < links.length; i++) {
        var L = links[i];
        var a = L.a.pos, b = L.b.pos;
        var lit = L.lit || 0;
        var alpha = (L.kind === 'related' ? 0.10 : 0.17) * strength + lit * 0.55;
        if (alpha <= 0.012) continue;

        var pa = project(a.x, a.y, 1), pb = project(b.x, b.y, 1);
        var mx = (pa.x + pb.x) / 2, my = (pa.y + pb.y) / 2;
        var dx = pb.x - pa.x, dy = pb.y - pa.y;
        var len = Math.sqrt(dx * dx + dy * dy) || 1;
        var bow = (L.bow || 0.18) * len;
        var cx = mx - (dy / len) * bow;
        var cy = my + (dx / len) * bow;

        ctx.strokeStyle = L.kind === 'related' ? palette.ash : palette.ember;
        ctx.globalAlpha = clamp(alpha, 0, 0.85);
        ctx.lineWidth = Math.max(0.6, (0.9 + lit * 2.2) * cam.z);
        if (L.kind === 'related' && quality > 0.5) ctx.setLineDash([2, 6]);
        ctx.beginPath();
        ctx.moveTo(pa.x, pa.y);
        ctx.quadraticCurveTo(cx, cy, pb.x, pb.y);
        ctx.stroke();
        ctx.setLineDash([]);

        /* a light running the edge while it is lit — causality, moving */
        if (lit > 0.05 && !reduceMotion) {
          var t = ((time * 0.0004) + (L.phase || 0)) % 1;
          var it = 1 - t;
          var px = it * it * pa.x + 2 * it * t * cx + t * t * pb.x;
          var py = it * it * pa.y + 2 * it * t * cy + t * t * pb.y;
          tintGlow(px, py, 8 * cam.z, 0.4 * lit, palette.ember);
        }
        if (L.lit) L.lit = Math.max(0, L.lit - 0.006);
      }
      ctx.restore();
      ctx.globalAlpha = 1;
    }

    /* The graticule. A map that says "far apart" without pretending to be a
       chart anybody could navigate by. */
    function drawGraticule(strength) {
      if (strength <= 0.01) return;
      ctx.save();
      ctx.strokeStyle = palette.ash;
      ctx.lineWidth = 0.6;

      var lon, lat, p, q;
      for (lon = -180; lon <= 180; lon += 30) {
        p = mapPos(-90, lon); q = mapPos(90, lon);
        var pp = project(p.x, p.y, 1), qq = project(q.x, q.y, 1);
        ctx.globalAlpha = (Math.abs(lon) === 180 || lon === 0 ? 0.18 : 0.11) * strength;
        ctx.beginPath();
        ctx.moveTo(pp.x, pp.y); ctx.lineTo(qq.x, qq.y);
        ctx.stroke();
      }
      for (lat = -90; lat <= 90; lat += 30) {
        p = mapPos(lat, -180); q = mapPos(lat, 180);
        var p2 = project(p.x, p.y, 1), q2 = project(q.x, q.y, 1);
        ctx.globalAlpha = (lat === 0 ? 0.24 : (Math.abs(lat) === 90 ? 0.18 : 0.11)) * strength;
        ctx.lineWidth = lat === 0 ? 0.9 : 0.6;
        ctx.beginPath();
        ctx.moveTo(p2.x, p2.y); ctx.lineTo(q2.x, q2.y);
        ctx.stroke();
      }

      /* the tropics, dashed — the band most of this archive will sit in */
      ctx.setLineDash([3, 7]);
      ctx.globalAlpha = 0.14 * strength;
      [23.44, -23.44].forEach(function (l) {
        var a = project(mapPos(l, -180).x, mapPos(l, -180).y, 1);
        var b = project(mapPos(l, 180).x, mapPos(l, 180).y, 1);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
        ctx.stroke();
      });
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    /* Migration arcs: a crossing drawn the way a butterfly would fly it. */
    var migrations = [];
    function drawMigrations(time, strength) {
      if (!migrations.length || strength <= 0.01) return;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (var i = 0; i < migrations.length; i++) {
        var m = migrations[i];
        var a = project(m.a.x, m.a.y, 1), b = project(m.b.x, m.b.y, 1);
        var dx = b.x - a.x, dy = b.y - a.y;
        var len = Math.sqrt(dx * dx + dy * dy) || 1;
        var cx = (a.x + b.x) / 2 - (dy / len) * len * 0.24;
        var cy = (a.y + b.y) / 2 + (dx / len) * len * 0.24;
        ctx.strokeStyle = palette.ember;
        ctx.globalAlpha = 0.20 * strength;
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.quadraticCurveTo(cx, cy, b.x, b.y);
        ctx.stroke();

        if (!reduceMotion) {
          var t = ((time * 0.00016) + i * 0.3) % 1;
          var it = 1 - t;
          tintGlow(
            it * it * a.x + 2 * it * t * cx + t * t * b.x,
            it * it * a.y + 2 * it * t * cy + t * t * b.y,
            7, 0.34 * strength * Math.sin(t * Math.PI), palette.ember
          );
        }
      }
      ctx.restore();
      ctx.globalAlpha = 1;
    }

    /* The branch that did not happen: a dashed limb growing off a node,
       drawn in violet so it can never be mistaken for the trail. */
    function drawGhostBranch(time) {
      if (!ghostBranch) return;
      var g = ghostBranch;
      g.grow = Math.min(1, g.grow + (reduceMotion ? 1 : 0.02));
      if (g.dying) {
        g.alpha = Math.max(0, g.alpha - 0.02);
        if (g.alpha <= 0) { ghostBranch = null; return; }
      }
      var node = g.node;
      if (!node) return;

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = palette.violet;
      ctx.setLineDash([4, 8]);
      ctx.lineWidth = 1.2;
      ctx.globalAlpha = 0.42 * g.alpha;

      var start = project(node.pos.x, node.pos.y, 1);
      var pts = [];
      var steps = 30;
      for (var i = 0; i <= steps * g.grow; i++) {
        var t = i / steps;
        var wx = node.pos.x + Math.cos(g.dir) * t * 2.1;
        var wy = node.pos.y + Math.sin(g.dir) * t * 2.1 + Math.sin(t * 5.5) * 0.18;
        pts.push(project(wx, wy, 1));
      }
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      for (var k = 0; k < pts.length; k++) ctx.lineTo(pts[k].x, pts[k].y);
      ctx.stroke();
      ctx.setLineDash([]);

      /* pale, unlit nodes on the branch — places that were never reached */
      for (var j = 1; j <= 3; j++) {
        var at = pts[Math.floor((pts.length - 1) * (j / 3))];
        if (!at) continue;
        tintGlow(at.x, at.y, 10, 0.18 * g.alpha, palette.violet);
        ctx.globalAlpha = 0.5 * g.alpha;
        ctx.fillStyle = palette.violet;
        ctx.beginPath();
        ctx.arc(at.x, at.y, 2.1, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
      ctx.globalAlpha = 1;
    }

    function nodeRadius(n) {
      var base = n.kind === 'ghost' ? 1.7 : 2.9;
      if (n.featured) base += 0.7;
      return (base + n.em * 1.6) * clamp(cam.z, 0.7, 1.6);
    }

    /* A marker is not a memory. It is the shape of the family showing
       through: the point where two lines became one, or where a new one
       started. Drawn as a joint rather than a light, so nobody mistakes it
       for a story that has been written. */
    function drawMarker(n, time, p, a) {
      var tone = n.tone || palette.ember;
      var r = (n.markerKind === 'union' ? 5.2 : 3.8) * clamp(cam.z, 0.7, 1.5);
      n.screenR = r;

      tintGlow(p.x, p.y, r * 6, 0.16 * a, tone);

      ctx.save();
      ctx.globalAlpha = 0.5 * a * (0.85 + n.em * 0.15);
      ctx.strokeStyle = tone;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, TAU);
      ctx.stroke();

      if (n.markerKind === 'union') {
        /* two rings, overlapping */
        ctx.globalAlpha = 0.4 * a;
        ctx.beginPath();
        ctx.arc(p.x - r * 0.5, p.y, r * 0.78, 0, TAU);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(p.x + r * 0.5, p.y, r * 0.78, 0, TAU);
        ctx.stroke();
      } else {
        /* a small opening: four short rays */
        ctx.globalAlpha = 0.55 * a;
        var s = r * 1.9;
        ctx.beginPath();
        for (var k = 0; k < 4; k++) {
          var ang = k * (Math.PI / 2) + Math.PI / 4;
          ctx.moveTo(p.x + Math.cos(ang) * r * 1.15, p.y + Math.sin(ang) * r * 1.15);
          ctx.lineTo(p.x + Math.cos(ang) * s, p.y + Math.sin(ang) * s);
        }
        ctx.stroke();
        ctx.globalAlpha = 0.85 * a;
        ctx.fillStyle = tone;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r * 0.32, 0, TAU);
        ctx.fill();
      }

      /* Label: the year above, the name below. A birth sits on the line it
         branches off, so in portrait two children of the same parents land
         on the same spot on screen a few years apart — each one's name
         therefore leans the way its own line is about to go. */
      var lx = p.x;
      if (portrait && n.lean) lx += n.lean * 46;   /* lean is signed, and carries its own size */
      ctx.globalAlpha = (0.62 + n.em * 0.38) * a;
      ctx.fillStyle = palette.ash;
      ctx.font = '9px ' + fontMono();
      ctx.textBaseline = 'alphabetic';
      if (n.yearLabel) spacedText(ctx, n.yearLabel, lx, p.y - r * 2.6, 1.4, 'center');

      /* Framed to fit on a phone, the whole braid puts its lanes about a
         thumb's width apart — enough for a year, not for a name. The years
         hold the shape together at that size; the names arrive as soon as
         there is room for them, or on the way past. */
      var roomForName = !portrait || cam.z > 0.42;
      if (n.title && (roomForName || n.em > 0.35 || n.selected)) {
        ctx.globalAlpha = (0.5 + n.em * 0.5) * a * (roomForName ? 1 : Math.max(n.em, 0.5));
        ctx.fillStyle = n.em > 0.3 ? palette.paper : tone;
        spacedText(ctx, n.title, lx, p.y + r * 2.6 + 8, 1.4, 'center');
      }
      ctx.restore();
      ctx.globalAlpha = 1;
    }

    function drawNode(n, time) {
      if (n.alpha <= 0.02) return;
      var p = project(n.pos.x, n.pos.y, 1);
      n.screen = p;
      if (p.x < -80 || p.x > W + 80 || p.y < -80 || p.y > H + 80) { n.onScreen = false; return; }
      n.onScreen = true;

      var r = nodeRadius(n);
      n.screenR = r;
      var tone = n.tone || palette.ember;
      var a = n.alpha;

      if (n.kind === 'marker') { drawMarker(n, time, p, a); return; }

      if (n.kind === 'ghost') {
        /* Unidentified. It surfaces, holds for a moment, and goes again —
           the archive breathing while it waits for something to remember. */
        var flick = 0.5 + 0.5 * Math.sin(time * 0.00042 + n.seed * 6.2);
        var vis = Math.pow(flick, 3.2);
        if (reduceMotion) vis = 0.35;
        tintGlow(p.x, p.y, r * 7, 0.13 * vis * a, palette.ash);
        ctx.globalAlpha = 0.5 * vis * a;
        ctx.fillStyle = palette.ash;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, TAU);
        ctx.fill();
        ctx.globalAlpha = 1;
        return;
      }

      /* chaos events keep a slow second pulse under the light */
      var pulse = 1;
      if (n.chaos && !reduceMotion) pulse = 0.86 + 0.24 * Math.sin(time * 0.0016 + n.seed);

      tintGlow(p.x, p.y, r * 8.5, (0.16 + n.em * 0.30) * a * pulse, tone);

      ctx.globalAlpha = (0.86 + n.em * 0.14) * a;
      ctx.fillStyle = n.selected ? palette.paper : tone;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r * pulse, 0, TAU);
      ctx.fill();

      /* A classified memory is a light behind a shutter. */
      if (n.classified) {
        ctx.globalAlpha = 0.7 * a;
        ctx.strokeStyle = palette.ash;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r * 2.3, 0, TAU);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(p.x - r * 2.3, p.y);
        ctx.lineTo(p.x + r * 2.3, p.y);
        ctx.stroke();
      }

      /* the halo on the focused memory */
      if (n.em > 0.02 || n.selected) {
        var em = Math.max(n.em, n.selected ? 1 : 0);
        ctx.globalAlpha = 0.24 * em * a;
        ctx.strokeStyle = tone;
        ctx.lineWidth = 0.9;
        var breathe = reduceMotion ? 1 : 1 + Math.sin(time * 0.0018 + n.seed) * 0.06;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r * 3.4 * breathe, 0, TAU);
        ctx.stroke();
      }

      /* Labels. The year is always there once you are close enough; the hook
         waits until the memory is actually being looked at. On touch there
         is no hover, so the year appears for everything at reading zoom. */
      var near = cam.z > 0.7;
      var yearAlpha = (n.selected ? 1 : (near ? 0.5 : 0.16) + n.em * 0.5) * a;
      if (n.yearLabel && yearAlpha > 0.05) {
        ctx.globalAlpha = clamp(yearAlpha, 0, 1);
        ctx.fillStyle = n.em > 0.3 || n.selected ? palette.paper : palette.ash;
        ctx.font = '9.5px ' + fontMono();
        ctx.textBaseline = 'alphabetic';
        spacedText(ctx, n.yearLabel, p.x, p.y - r * 3.6 - 4, 1.2, 'center');
      }

      var hookAlpha = (n.selected ? 1 : n.em) * a;
      if (hookAlpha > 0.06) {
        ctx.globalAlpha = clamp(hookAlpha * 0.92, 0, 1);
        ctx.fillStyle = palette.paper;
        ctx.font = '11px ' + fontMono();
        var below = r * 3.6 + 15;
        if (n.title) spacedText(ctx, n.title, p.x, p.y + below, 0.6, 'center');
        if (n.hook) {
          ctx.globalAlpha = clamp(hookAlpha * 0.55, 0, 1);
          ctx.fillStyle = palette.ash;
          ctx.font = '9.5px ' + fontMono();
          spacedText(ctx, n.hook, p.x, p.y + below + 14, 0.8, 'center');
        }
      }
      ctx.globalAlpha = 1;
    }

    function drawClusterLabels(strength) {
      if (strength <= 0.05 || !clusters.length) return;
      ctx.save();
      ctx.font = '9px ' + fontMono();
      ctx.fillStyle = palette.ash;
      for (var i = 0; i < clusters.length; i++) {
        var c = clusters[i];
        var p = project(c.x, c.y, 1);
        ctx.globalAlpha = 0.34 * strength;
        spacedText(ctx, String(c.key).toUpperCase(), p.x, p.y - 26, 1.6, 'center');
      }
      ctx.restore();
      ctx.globalAlpha = 1;
    }

    /* ------------------------------------------------------------- frame */
    function frame(time) {
      rafId = 0;
      if (!running) return;

      var dt = last ? Math.min(60, time - last) : 16;
      last = time;

      var camMoving = stepCam(time, dt);

      inset.x += (insetTo.x - inset.x) * 0.12;
      inset.y += (insetTo.y - inset.y) * 0.12;

      /* morph between layouts */
      var morphing = false;
      if (morph.t < 1) {
        morph.t = clamp((time - morph.start) / morph.dur, 0, 1);
        morphing = morph.t < 1;
      }

      var busy = camMoving || morphing || flies.length > 0 || !!ghostBranch
        || Math.abs(insetTo.x - inset.x) > 0.4 || Math.abs(insetTo.y - inset.y) > 0.4;

      var minFrame = busy ? 0 : 32;
      if (!reduceMotion && time - lastDraw < minFrame) { schedule(); return; }

      var t0 = now();
      lastDraw = time;
      draw(time, dt);

      /* quality governor — measured, not guessed */
      frameAvg = frameAvg * 0.92 + (now() - t0) * 0.08;
      if (frameAvg > 13 && quality > 0.45) { quality = Math.max(0.45, quality - 0.05); trimForQuality(); }
      else if (frameAvg < 6 && quality < 1) { quality = Math.min(1, quality + 0.02); }

      if (reduceMotion) {
        if (busy) schedule();
        else running = false;
      } else {
        schedule();
      }
    }

    function trimForQuality() {
      if (dust.length > 40) dust.length = Math.max(40, Math.round(dust.length * 0.8));
      flies.forEach(function (f) {
        f.trailCap = Math.max(24, Math.round(f.trailCap * 0.8));
        if (f.trail.length > f.trailCap) f.trail.splice(0, f.trail.length - f.trailCap);
      });
    }

    function draw(time, dt) {
      ctx.clearRect(0, 0, W, H);

      var mt = reduceMotion ? 1 : easeInOutCubic(morph.t);

      /* resolve node positions and eased emphasis */
      var i, n;
      for (i = 0; i < nodes.length; i++) {
        n = nodes[i];
        n.pos.x = lerp(n.from.x, n.to.x, mt);
        n.pos.y = lerp(n.from.y, n.to.y, mt);

        var wantEm = (n === hovered ? 1 : 0);
        if (n.selected) wantEm = 1;
        n.em += (wantEm - n.em) * (reduceMotion ? 1 : 0.16);

        var wantAlpha = 1;
        if (mode === 'map' && !n.pm && n.kind !== 'ghost') wantAlpha = 0;
        if (mode === 'map' && n.kind === 'ghost') wantAlpha = 0;
        if (n.kind === 'marker' && mode !== 'trail') wantAlpha = 0;
        if (n.dimmed) wantAlpha = 0.18;
        n.alpha += (wantAlpha - n.alpha) * (reduceMotion ? 1 : 0.12);
      }

      drawDust(time, dt);

      /* Each layer fades in on the way to its own mode and out on the way
         away from it, so a change of view is a dissolve rather than a cut. */
      var mapStrength = mode === 'map' ? mt : 0;

      if (mode !== 'map') drawSpine(time, mode === 'trail' ? mt : 1 - mt);
      if (mapStrength > 0.01) { drawGraticule(mapStrength); drawMigrations(time, mapStrength); }
      drawLinks(time, mode === 'constellation' ? Math.max(0.35, mt) : 0.5);
      if (mode === 'constellation') drawClusterLabels(mt);
      drawGhostBranch(time);

      for (i = 0; i < nodes.length; i++) drawNode(nodes[i], time);

      /* butterflies fly over everything except the reticle */
      for (i = flies.length - 1; i >= 0; i--) {
        var f = flies[i];
        f.step(time, dt);
        if (f.fade) {
          f.alpha = Math.max(0, f.alpha - f.fade * dt);
          if (f.alpha <= 0.01) { flies.splice(i, 1); continue; }
        }
        if (f.life !== Infinity && f.age > f.life && !f.fade) f.fade = 0.0016;
        f.draw(time);
      }
    }

    function schedule() {
      if (rafId || !running) return;
      rafId = global.requestAnimationFrame(frame);
    }
    function wake() {
      if (document.hidden) return;
      if (!running) { running = true; last = 0; }
      schedule();
    }
    function stop() {
      running = false;
      if (rafId) { global.cancelAnimationFrame(rafId); rafId = 0; }
    }

    /* --------------------------------------------------- pointer & input */
    var pointers = {};
    var dragging = false, dragMoved = 0, dragLast = null, pinchDist = 0;

    function localPoint(e) {
      var r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    }

    function hitTest(px, py) {
      var best = null, bestD = Infinity;
      for (var i = 0; i < nodes.length; i++) {
        var n = nodes[i];
        if (n.kind === 'ghost' || !n.onScreen || n.alpha < 0.25) continue;
        var dx = n.screen.x - px, dy = n.screen.y - py;
        var d = Math.sqrt(dx * dx + dy * dy);
        var pad = Math.max(n.screenR * 3.6, coarse ? 32 : 22);
        if (d < pad && d < bestD) { bestD = d; best = n; }
      }
      return best;
    }

    /* Butterflies are hit-tested separately and more generously — they are
       moving targets, and tapping one is meant to be a small delight rather
       than a test of aim. */
    function hitFly(px, py) {
      for (var i = flies.length - 1; i >= 0; i--) {
        var f = flies[i];
        if (f.alpha < 0.3) continue;
        var p = f.space === 'screen' ? { x: f.x, y: f.y } : project(f.x, f.y, 1);
        var dx = p.x - px, dy = p.y - py;
        if (Math.sqrt(dx * dx + dy * dy) < (coarse ? 34 : 26)) return f;
      }
      return null;
    }

    canvas.addEventListener('pointerdown', function (e) {
      canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId);
      pointers[e.pointerId] = localPoint(e);
      pointers[e.pointerId].t = now();
      if (Object.keys(pointers).length === 2) {
        var ks = Object.keys(pointers);
        var a = pointers[ks[0]], b = pointers[ks[1]];
        pinchDist = Math.hypot(a.x - b.x, a.y - b.y);
      }
      dragging = true;
      dragMoved = 0;
      dragLast = { x: localPoint(e).x, y: localPoint(e).y, t: now() };
      camFollow = null;
      vel.x = 0; vel.y = 0;
      camT = 1;
    });

    canvas.addEventListener('pointermove', function (e) {
      var p = localPoint(e);
      var known = pointers[e.pointerId];
      if (known) { known.x = p.x; known.y = p.y; }

      var ids = Object.keys(pointers);
      if (ids.length === 2 && known) {
        /* pinch zoom, anchored between the fingers */
        var a = pointers[ids[0]], b = pointers[ids[1]];
        var d = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinchDist > 0 && d > 0) {
          var mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
          zoomAt(mid.x, mid.y, d / pinchDist);
          pinchDist = d;
        }
        dragMoved = 999;
        wake();
        return;
      }

      if (dragging && dragLast) {
        var dx = p.x - dragLast.x, dy = p.y - dragLast.y;
        dragMoved += Math.abs(dx) + Math.abs(dy);
        if (dragMoved > 6) {
          cam.x -= dx / (unit * cam.z);
          cam.y -= dy / (unit * cam.z);
          var dtm = Math.max(8, now() - dragLast.t);
          vel.x = (dx / (unit * cam.z)) / dtm;
          vel.y = (dy / (unit * cam.z)) / dtm;
          clampCam();
          canvas.style.cursor = 'grabbing';
        }
        dragLast = { x: p.x, y: p.y, t: now() };
        wake();
        return;
      }

      setHover(p.x, p.y, e.pointerType === 'mouse');
    });

    function setHover(px, py, fine) {
      var hit = hitTest(px, py);
      if (hit !== hovered) {
        hovered = hit;
        canvas.style.cursor = hit ? 'pointer' : (fine ? 'grab' : 'default');
        emit('hover', hit ? hit.ref : null);
        wake();
      }
    }

    function endPointer(e) {
      var p = localPoint(e);
      var was = pointers[e.pointerId];
      delete pointers[e.pointerId];
      if (Object.keys(pointers).length < 2) pinchDist = 0;

      var quick = was && (now() - was.t) < 600;
      dragging = Object.keys(pointers).length > 0;
      canvas.style.cursor = 'grab';

      if (dragMoved <= 6 && quick) {
        var fly = hitFly(p.x, p.y);
        if (fly) {
          fly.taps++;
          fly.spin = 1;
          fly.vx *= -0.4; fly.vy *= -0.4;
          emit('flytap', fly);
          wake();
          return;
        }
        var hit = hitTest(p.x, p.y);
        if (hit) emit('select', hit.ref);
        else emit('empty', unproject(p.x, p.y));
      }
      dragMoved = 0;
      dragLast = null;
      wake();
    }

    canvas.addEventListener('pointerup', endPointer);
    canvas.addEventListener('pointercancel', function (e) {
      delete pointers[e.pointerId];
      dragging = false; dragMoved = 0; dragLast = null; pinchDist = 0;
    });
    canvas.addEventListener('pointerleave', function () {
      if (hovered) { hovered = null; emit('hover', null); wake(); }
    });

    function zoomAt(px, py, factor) {
      var before = unproject(px, py);
      camT = 1;
      camFollow = null;
      cam.z = clamp(cam.z * factor, zoomRange.min, zoomRange.max);
      var after = unproject(px, py);
      cam.x += before.x - after.x;
      cam.y += before.y - after.y;
      clampCam();
    }

    canvas.addEventListener('wheel', function (e) {
      /* Trackpads send two-finger scroll as wheel events; treat a plain
         scroll as panning the trail and a pinch/ctrl-wheel as zoom, which is
         what both kinds of hardware expect. */
      e.preventDefault();
      camFollow = null;
      camT = 1;
      if (e.ctrlKey) {
        zoomAt(e.offsetX, e.offsetY, Math.exp(-e.deltaY * 0.01));
      } else {
        cam.x += e.deltaX / (unit * cam.z);
        cam.y += e.deltaY / (unit * cam.z);
        clampCam();
      }
      wake();
    }, { passive: false });

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stop(); else wake();
    });

    /* ---------------------------------------------------------------- api */
    var api = {
      on: on,

      /* The braid. Lanes are in time-axis units, which the controller owns:
           { laneW, lanes: [{ id, label, tone, side, kind, from, to }] }
         kind is 'parent' (converges at `to`), 'union' (the trunk) or 'child'
         (leaves the trunk at `from`). Pass null for an archive with no
         strands and the trail falls back to a single line. */
      setBraid: function (spec) {
        if (!spec || !spec.lanes || !spec.lanes.length) {
          braid = null;
          braidPaths = [];
        } else {
          braid = {
            laneW: spec.laneW || 0.55,
            byId: {},
            lanes: spec.lanes.map(function (l) {
              return {
                id: l.id,
                label: l.label || '',
                labelAt: l.labelAt || null,      /* 'start' | 'end' | null */
                tone: l.tone || palette.ember,
                side: l.side || 0,
                base: l.base || null,
                startKind: l.startKind || 'union',
                endKind: l.endKind || 'open',
                joinTarget: l.joinTarget || null,
                fadeIn: !!l.fadeIn,
                from: l.from,
                to: l.to,
                phase: hash01(l.id) * TAU
              };
            })
          };
          braid.lanes.forEach(function (l) { braid.byId[l.id] = l; });
        }
        computeLayouts();
        nodes.forEach(function (n) { n.from = n.pos || n.ptr; n.to = layoutPos(n); });
        measureBounds();
        wake();
        return api;
      },

      /* nodes: [{ id, kind:'story'|'ghost'|'marker', title, hook, yearLabel,
                   year, era, tone, strand, t, lat, lon, chaos, classified,
                   featured, markerKind, ref }]
         `strand` and `t` place a node on the braid: which line, and where
         along the time axis. */
      setNodes: function (list) {
        var prev = {};
        nodes.forEach(function (n) { prev[n.id] = n.pos; });

        nodes = list.map(function (n, i) {
          return {
            id: n.id,
            kind: n.kind || 'story',
            title: (n.title || '').toUpperCase(),
            hook: n.hook || '',
            yearLabel: n.yearLabel || '',
            year: n.year || null,
            era: n.era || null,
            strand: n.strand || null,
            t: (n.t === undefined || n.t === null) ? null : n.t,
            markerKind: n.markerKind || null,
            lean: n.lean || 0,
            tone: n.tone || palette.ember,
            lat: n.lat === undefined ? null : n.lat,
            lon: n.lon === undefined ? null : n.lon,
            chaos: !!n.chaos,
            classified: !!n.classified,
            featured: !!n.featured,
            ref: n.ref || { id: n.id },
            seed: hash01(n.id) * 10 + i * 0.3,
            em: 0,
            alpha: n.kind === 'ghost' ? 1 : 0,
            selected: false,
            dimmed: false,
            pos: prev[n.id] ? { x: prev[n.id].x, y: prev[n.id].y } : null,
            screen: { x: 0, y: 0 },
            screenR: 3,
            onScreen: false
          };
        });
        computeLayouts();
        nodes.forEach(function (n) { n.from = n.pos; n.to = layoutPos(n); });
        morph.t = 1;
        wake();
        return api;
      },

      /* links: [{ from, to, kind:'cause'|'related' }] */
      setLinks: function (list) {
        var byId = {};
        nodes.forEach(function (n) { byId[n.id] = n; });
        links = (list || []).map(function (l, i) {
          var a = byId[l.from], b = byId[l.to];
          if (!a || !b) return null;
          return {
            a: a, b: b, kind: l.kind || 'cause',
            bow: (hash01(l.from + l.to) - 0.5) * 0.5,
            phase: hash01(l.to + l.from),
            lit: 0
          };
        }).filter(Boolean);
        wake();
        return api;
      },

      /* migrations: [{ from:{lat,lon}, to:{lat,lon} }] */
      setMigrations: function (list) {
        migrations = (list || []).map(function (m) {
          return { a: mapPos(m.from.lat, m.from.lon), b: mapPos(m.to.lat, m.to.lon) };
        });
        wake();
        return api;
      },

      setMode: function (next, opts) {
        opts = opts || {};
        if (next === mode && !opts.force) return api;
        mode = next;
        nodes.forEach(function (n) {
          n.from = { x: n.pos.x, y: n.pos.y };
          n.to = layoutPos(n);
        });
        morph.t = 0;
        morph.dur = reduceMotion ? 1 : 1100;
        morph.start = now();
        measureBounds();
        if (opts.fit !== false) fitView(reduceMotion ? 1 : 1300);
        wake();
        return api;
      },

      mode: function () { return mode; },

      focus: function (id, opts) {
        opts = opts || {};
        focused = null;
        nodes.forEach(function (n) {
          n.selected = (n.id === id);
          if (n.selected) focused = n;
        });
        if (focused && opts.move !== false) {
          tweenCam(focused.pos.x, focused.pos.y,
            Math.max(cam.z, opts.zoom || 1.35), opts.ms || 1000);
        }
        wake();
        return api;
      },

      clearFocus: function () {
        nodes.forEach(function (n) { n.selected = false; n.dimmed = false; });
        focused = null;
        wake();
        return api;
      },

      /* Dim everything except a set — used while a causal chain is walked. */
      spotlight: function (ids) {
        var keep = {};
        (ids || []).forEach(function (i) { keep[i] = true; });
        nodes.forEach(function (n) { n.dimmed = ids ? !keep[n.id] : false; });
        wake();
        return api;
      },

      litLink: function (fromId, toId) {
        links.forEach(function (l) {
          if ((l.a.id === fromId && l.b.id === toId) || (l.a.id === toId && l.b.id === fromId)) {
            l.lit = 1;
          }
        });
        wake();
        return api;
      },

      nodeFor: function (id) {
        for (var i = 0; i < nodes.length; i++) if (nodes[i].id === id) return nodes[i];
        return null;
      },

      screenFor: function (id) {
        var n = api.nodeFor(id);
        return n && n.onScreen ? { x: n.screen.x, y: n.screen.y } : null;
      },

      /* A point some fraction of the way along a strand, in world space. */
      strandPoint: function (id, at) {
        for (var i = 0; i < braidPaths.length; i++) {
          if (braidPaths[i].lane.id !== id) continue;
          var pts = braidPaths[i].pts;
          if (!pts.length) return null;
          return pts[clamp(Math.round((at === undefined ? 0.5 : at) * (pts.length - 1)), 0, pts.length - 1)];
        }
        return null;
      },

      /* ---- butterflies ---- */
      spawn: function (opts) {
        var f = new Butterfly(opts);
        flies.push(f);
        wake();
        return f;
      },

      release: function (f, fadeMs) {
        if (!f) return api;
        f.fade = 1 / (fadeMs || 900);
        wake();
        return api;
      },

      releaseAll: function () {
        flies.forEach(function (f) { f.fade = 1 / 700; });
        wake();
        return api;
      },

      /* Send a butterfly to a node and bring the camera along behind it. */
      flyTo: function (f, nodeId, opts) {
        opts = opts || {};
        var n = api.nodeFor(nodeId);
        if (!f || !n) return api;
        f.state = 'seeking';
        f.wrongWay = 0;
        f.aimNode(n);
        f.onArrive = opts.onArrive || null;
        if (opts.follow !== false) camFollow = f;
        wake();
        return api;
      },

      stopFollowing: function () { camFollow = null; return api; },

      /* A butterfly perches on a point of the page — the easter egg where
         one lands on the interface instead of on the archive. Handing it a
         screen point moves it into screen space at its current position, so
         it flies to the perch from wherever it actually was. */
      perchAt: function (f, screenPt, ms) {
        if (!f) return api;
        if (f.space !== 'screen') {
          var here = project(f.x, f.y, 1);
          f.x = here.x; f.y = here.y;
          f.trail.length = 0;
          f.space = 'screen';
          f.speed = 0.24;
          f.arriveAt = 16;
          f.vx = 0; f.vy = 0;
        }
        f.node = null;
        f.target = { x: screenPt.x, y: screenPt.y };
        f.onArrive = function (fly) {
          fly.perch = { x: screenPt.x, y: screenPt.y };
          fly.perchUntil = now() + (ms || 4200);
        };
        wake();
        return api;
      },

      /* Put a screen-space butterfly back into the world it came from. */
      toWorld: function (f, opts) {
        if (!f || f.space !== 'screen') return api;
        var w = unproject(f.x, f.y);
        f.x = w.x; f.y = w.y;
        f.trail.length = 0;
        f.space = 'world';
        f.perch = null;
        f.speed = (opts && opts.speed) || 0.0016;
        f.arriveAt = (opts && opts.arriveAt) || 0.1;
        f.vx = 0; f.vy = 0;
        wake();
        return api;
      },

      screenPoint: function (wx, wy) { return project(wx, wy, 1); },
      worldPoint: function (px, py) { return unproject(px, py); },
      viewport: function () { return { w: W, h: H }; },

      /* ---- the branch that never happened ---- */
      showGhostBranch: function (nodeId, dir) {
        var n = api.nodeFor(nodeId);
        if (!n) return api;
        ghostBranch = {
          node: n,
          dir: dir === undefined ? (hash01(nodeId) * TAU) : dir,
          grow: 0, alpha: 1, dying: false
        };
        wake();
        return api;
      },
      hideGhostBranch: function () {
        if (ghostBranch) ghostBranch.dying = true;
        wake();
        return api;
      },

      /* ---- camera ---- */
      fit: fitView,
      panTo: function (x, y, z, ms) { tweenCam(x, y, z, ms); return api; },
      nudge: function (dx, dy) {
        camT = 1; camFollow = null;
        cam.x += dx / (unit * cam.z);
        cam.y += dy / (unit * cam.z);
        clampCam();
        wake();
        return api;
      },
      zoomBy: function (factor) { zoomAt(W / 2, H / 2, factor); wake(); return api; },
      setInset: function (x, y) { insetTo.x = x || 0; insetTo.y = y || 0; wake(); return api; },

      resize: function () { layout(); measureBounds(); wake(); return api; },
      wake: wake,
      stop: stop,
      isReduced: function () { return reduceMotion; },
      isCoarse: function () { return coarse; },
      quality: function () { return quality; },
      bounds: function () { return bounds; }
    };

    buildGlow();
    layout();
    canvas.style.cursor = 'grab';
    wake();
    return api;
  }

  global.BUTTERFLY_TRAILS = { create: create };
})(window);
