/* Entropic Labs — Butterfly Trails, the mountain lens.
   ==========================================================================
   A second way of looking at the same archive. Nothing in here knows what a
   story is: butterfly.js hands it the same resolved braid and the same node
   list the canvas trail is drawn from, and listens for the same two events.

   The idea
     the mountain is time      earlier years sit low, later years climb, and
                               above the newest memory the land runs on into
                               mist and stars — the part not written yet
     a trail is a life         one glowing path per strand, meandering,
                               passing behind ridges, coming back out
     a light is a memory       a lantern sitting on somebody's path
     an approach is a marriage two paths that come to travel side by side

   How it is built
     The landscape and the trails are drawn on one canvas. Everything with
     words in it — the lights, the decade marks, the names on the paths — is
     a real DOM element positioned over that canvas, which is what makes
     them focusable, labellable, tappable at 44px, and free of per-frame
     cost. Eighteen buttons is nothing; eighteen hundred canvas hit tests
     every frame is not.

   How it scrolls
     A native scroll container with a sticky canvas and a tall spacer under
     it. The browser owns the scrolling — no wheel handlers, no scroll
     jacking, momentum and accessibility for free — and the canvas simply
     redraws at the new offset. Parallax falls out of that: each terrain
     layer reads the scroll position through its own factor.

   Coordinate spaces
     axis     the controller's time axis. The braid's own units.
     world    pixels down the scroll container. y = 0 is the far future.
     screen   world minus the scroll offset. Background layers use their own
              slower offset, which is the parallax.
   ========================================================================== */

(function (global) {
  'use strict';

  var TAU = Math.PI * 2;

  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function smoothstep(e0, e1, x) {
    if (e1 === e0) return x < e0 ? 0 : 1;
    var t = clamp((x - e0) / (e1 - e0), 0, 1);
    return t * t * (3 - 2 * t);
  }
  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  /* Stable 0..1 from a string, so the same ridge, the same tree and the same
     wander come back on every visit and on every device. */
  function hash01(s) {
    var h = 2166136261;
    s = String(s);
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return ((h >>> 0) % 100000) / 100000;
  }

  function el(tag, cls) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    return n;
  }

  /* Ridged fractal in one dimension: four folded sines, each half the weight
     and twice the frequency of the last. Folding a sine about zero is what
     turns a wave into a skyline — the smooth troughs become sharp peaks. */
  function ridged(k, seed, rough) {
    var v = 0, a = 1, f = 1, tot = 0;
    for (var o = 0; o < 4; o++) {
      var s = Math.sin(k * f * 3.7 + seed * (o + 1) * 2.399 + o);
      v += a * (1 - Math.abs(s));
      tot += a;
      a *= 0.5 + 0.16 * rough;
      f *= 2.13;
    }
    /* The raw sum sits around the middle of its range, which draws hills.
       Biting into it with a power curve pushes the common case back down to
       the valley floor and leaves the peaks standing, which draws mountains. */
    return Math.pow(clamp(v / tot, 0, 1), 1.55);
  }

  /* ------------------------------------------------------------------------
     THE TERRAIN LAYERS
     Far to near. `p` is the parallax factor — how much of the scroll each
     layer feels — and everything else is in fractions of the viewport
     height, so the composition holds at 360px and at 1600px alike.
     ------------------------------------------------------------------------ */
  /* Atmospheric perspective, as a table. A distant range is lighter than
     the sky because there is air in front of it; the ground at your feet is
     darker than anything. `depth` is deliberately short on every layer —
     a silhouette that filled the screen below its own crest would blot out
     the whole climb behind it, and the point of this landscape is that you
     can see where you have been. */
  var LAYERS = [
    { key: 'far',  p: 0.26, spacing: 0.40, amp: 0.30, rough: 0.30,
      top: '#242e5a', bottom: '#171d40', depth: 0.52, trees: 0,    alpha: 0.85, rim: 0.22 },
    { key: 'mid',  p: 0.56, spacing: 0.42, amp: 0.30, rough: 0.62,
      top: '#151b3c', bottom: '#0c1027', depth: 0.40, trees: 0.16, alpha: 0.90, rim: 0.16 },
    { key: 'near', p: 1.00, spacing: 0.44, amp: 0.24, rough: 1.00,
      top: '#0b0a1e', bottom: '#060512', depth: 0.30, trees: 0.60, alpha: 1,    rim: 0.12 },
    { key: 'fore', p: 1.14, spacing: 0.76, amp: 0.28, rough: 1.30,
      top: '#040309', bottom: '#010004', depth: 0.42, trees: 1.00, alpha: 1,    rim: 0.05 }
  ];

  /* How long a converging path takes to arrive, and a branching one to pull
     away. Same rule as the canvas braid, so the two lenses agree about when
     two lives came together. */
  var MERGE_W = 1.15, BRANCH_W = 0.95;

  function create(host, options) {
    options = options || {};

    var mq = global.matchMedia ? global.matchMedia.bind(global) : null;
    var reduceMotion = mq ? mq('(prefers-reduced-motion: reduce)').matches : false;
    var coarse = mq ? mq('(pointer: coarse)').matches : false;

    /* ------------------------------------------------------------- the DOM */
    var canvas = el('canvas', 'mtn-canvas');
    canvas.setAttribute('aria-hidden', 'true');
    var ctx = canvas.getContext('2d', { alpha: true });

    var layer = el('div', 'mtn-layer');       /* holds every positioned thing */
    var tip = el('div', 'mtn-tip');
    tip.setAttribute('role', 'presentation');
    tip.hidden = true;

    host.appendChild(canvas);
    host.appendChild(layer);
    host.appendChild(tip);

    /* -------------------------------------------------------------- state */
    var vw = 0, vh = 0, dpr = 1, worldH = 0;
    var scrollTop = 0;
    var active = false, rafId = 0, lastFrame = 0, drawWanted = true;
    var listeners = {};

    var axis = { start: 0, end: 1 };
    var lanes = [], laneById = {}, laneW = 0.55;
    var lanePaths = [];                        /* sampled polyline per lane */
    var lights = [], lightById = {};
    var decades = [];
    var emphasis = { category: null, person: null, era: null, ids: null };
    var focusedId = null, hoveredId = null;
    var inset = { top: 0, bottom: 0 };

    var terrain = [];                          /* generated crests per layer */
    var stars = [];
    var flier = null;                          /* the one butterfly */
    var sweep = { on: false, t: 0, start: 0, dur: 2600, lane: null };

    /* Quality, seeded from what the device admits to. Same idea as the
       canvas renderer: fewer trees and fewer stars rather than a different
       picture. */
    var quality = 1;
    (function seedQuality() {
      var cores = global.navigator && global.navigator.hardwareConcurrency;
      var mem = global.navigator && global.navigator.deviceMemory;
      if ((cores && cores <= 4) || (mem && mem <= 4)) quality = 0.7;
      if ((cores && cores <= 2) || (mem && mem <= 2)) quality = 0.5;
    })();

    function now() { return (global.performance || Date).now(); }

    function on(name, fn) {
      (listeners[name] || (listeners[name] = [])).push(fn);
      return api;
    }
    function emit(name, payload) {
      var l = listeners[name];
      if (!l) return;
      for (var i = 0; i < l.length; i++) l[i](payload);
    }

    /* ====================================================== THE TIME AXIS */
    var skyLead = 0, groundTail = 0, pxPerUnit = 120;

    function span() { return Math.max(0.001, axis.end - axis.start); }

    /* Time runs up the screen: the newest moment sits `skyLead` below the
       top of the world, and everything above it is sky — the part of the
       story nobody has written yet. */
    function yAt(t) { return skyLead + (axis.end - t) * pxPerUnit; }
    function tAtY(y) { return axis.end - (y - skyLead) / pxPerUnit; }

    /* ========================================================== THE BRAID
       Lifted from the canvas renderer on purpose: a strand is measured from
       whatever it branched out of, never from zero, so a birth leaves its
       parent exactly and a marriage arrives exactly with no seam to line up.
       What differs here is the wobble — a mountain path should wander a good
       deal more than a diagram line, and a life the archive knows more about
       wanders more visibly than one it barely knows. */
    function wobble(t, lane) {
      /* Three waves, and the slowest of them is detuned per strand — if two
         lines share a frequency they weave in lockstep for ever, which is
         the difference between two lives running alongside each other and
         two rails on the same track. */
      var a = lane.amp;
      var f = lane.freq;
      return Math.sin(t * f + lane.phase * 6.283) * 0.95 * a
           + Math.sin(t * f * 0.44 + lane.phase * 14.1) * 0.48 * a
           + Math.sin(t * f * 2.3 + lane.phase * 3.9) * 0.14 * a;
    }

    function laneOffset(lane, t, depth) {
      if (!lane) return 0;
      depth = depth || 0;
      if (depth > 8) return 0;

      var base = lane.base ? laneOffset(laneById[lane.base], t, depth + 1) : 0;
      var own = base + lane.side * laneW + wobble(t, lane);

      if (lane.startKind === 'born') {
        var b = smoothstep(lane.from, lane.from + BRANCH_W, t);
        if (b < 1) own = lerp(base, own, b);
      }
      if (lane.endKind === 'joins') {
        var target = laneById[lane.joinTarget];
        if (target) {
          /* Two lives do not become one line. They come to travel beside
             each other and keep a hair's width between them, which is the
             honest picture and also the only way both stay findable. */
          var j = smoothstep(lane.to - MERGE_W, lane.to, t);
          if (j > 0) own = lerp(own, laneOffset(target, t, depth + 1) + lane.pairGap, j);
        }
      }
      return own;
    }

    /* The whole braid drifts across the mountain rather than climbing it in
       a column: two slow waves, so a decade of the family leans left and the
       next leans right, and the trails have terrain to pass through. */
    function drift(t) {
      /* Two waves, one about ten years long and one about twenty-five, so a
         decade of the family leans one way and the next leans back. Slower
         than this and the trails climb in a column; faster and they read as
         a graph of something. */
      return Math.sin(t * 0.63 + 0.9) * vw * 0.095
           + Math.sin(t * 0.26 + 2.4) * vw * 0.080;
    }

    var spread = 60;
    function xAt(lane, t) { return vw / 2 + drift(t) + laneOffset(lane, t) * spread; }

    function pointOn(strandId, t) {
      var lane = laneById[strandId] || lanes[0];
      if (!lane) return { x: vw / 2, y: yAt(t) };
      return { x: xAt(lane, t), y: yAt(t) };
    }

    /* A point `off` pixels to one side of a strand, measured at right angles
       to the direction the path is actually running. */
    function acrossFrom(strandId, t, off) {
      var p = pointOn(strandId, t);
      if (!off) return p;
      var eps = span() / 400;
      var q = pointOn(strandId, t + eps);
      var dx = q.x - p.x, dy = q.y - p.y;
      var len = Math.sqrt(dx * dx + dy * dy) || 1;
      return { x: p.x + (-dy / len) * off, y: p.y + (dx / len) * off };
    }

    /* ========================================================== THE LAND */
    function buildTerrain() {
      terrain = LAYERS.map(function (L, li) {
        var spacingPx = Math.max(120, L.spacing * vh);
        var reach = worldH * L.p + vh * 2;
        var crests = [];
        var count = Math.ceil(reach / spacingPx) + 2;
        for (var i = 0; i < count; i++) {
          var seed = hash01(L.key + ':' + i);
          crests.push({
            u: i * spacingPx - vh,
            seed: seed * 9.7,
            /* Which side of the valley this shoulder rises from. Alternating
               with a seeded exception keeps the corridor the trails climb
               through from turning into a straight chute. */
            anchor: (hash01(L.key + ':a:' + i) < 0.42) ? (i % 2 ? 0 : 1) : (i % 2 ? 1 : 0),
            amp: L.amp * vh * (0.62 + seed * 0.8),
            /* A crest is not the same shape twice, and its trees thin out
               and thicken along it the way a treeline actually does. */
            treeSeed: hash01(L.key + ':t:' + i),
            lean: (hash01(L.key + ':l:' + i) - 0.5) * 0.6
          });
        }
        return { def: L, index: li, crests: crests, spacing: spacingPx };
      });

      /* Stars sit on their own very slow layer and thicken toward the top of
         the world, where the land gives out. */
      var target = Math.round(clamp((vw * vh) / 7200, 40, 190) * quality);
      stars = [];
      var reachS = worldH * 0.14 + vh;
      for (var s = 0; s < target; s++) {
        var h1 = hash01('star-x' + s), h2 = hash01('star-y' + s), h3 = hash01('star-r' + s);
        var u = h2 * reachS;
        /* higher in the world (smaller u) = brighter and denser */
        var high = 1 - clamp(u / reachS, 0, 1);
        stars.push({
          x: h1 * vw,
          u: u,
          r: 0.5 + h3 * (high > 0.6 ? 1.35 : 0.85),
          a: (0.18 + h3 * 0.55) * (0.35 + high * 0.9),
          ph: hash01('star-p' + s) * TAU,
          sp: 0.4 + hash01('star-s' + s) * 1.1
        });
      }
    }

    /* How much of its height a shoulder has at a given x: full at the edge
       it rises from, and nearly nothing at the far one. This is what makes
       the landscape a valley with a corridor up the middle rather than a
       stack of horizontal bands. */
    function crestEnv(crest, x) {
      var d = Math.abs(x / Math.max(1, vw) - crest.anchor);
      return 0.18 + 0.82 * Math.pow(clamp(1 - d, 0, 1), 1.5);
    }

    /* Screen y of a crest at a given x, for a layer scrolled by its own
       parallax. Peaks rise, so the ridged term is subtracted. */
    function crestScreenY(L, crest, x, scroll) {
      var k = x / Math.max(1, vw);
      return crest.u - scroll * L.p
           - crest.amp * ridged(k + crest.lean, crest.seed, L.rough) * crestEnv(crest, x);
    }

    /* How much near terrain stands between the viewer and a world point.
       0 is open air, 1 is buried. Used for the trails, which are allowed to
       vanish, and for the lights, which are not — a memory behind the trees
       shows through the gaps instead of going out. */
    function occlusionAt(wx, wy) {
      var hide = 0;
      for (var i = 2; i < terrain.length; i++) {          /* near + fore only */
        var T = terrain[i], L = T.def;
        var fill = L.depth * vh * 0.5;       /* the part that is truly opaque */
        for (var c = 0; c < T.crests.length; c++) {
          var crest = T.crests[c];
          /* At parallax p, a world point at wy sits at screen wy - scroll;
             the crest sits at u - scroll*p. Comparing them at the scroll
             offset that puts the point on screen gives the standing
             relationship between the two, which is what we want. */
          var scroll = wy - vh * 0.5;
          var cy = crestScreenY(L, crest, wx, scroll);
          var py = wy - scroll;
          if (py > cy && py < cy + fill) {
            hide = Math.max(hide, 1 - (py - cy) / fill);
          }
        }
      }
      return clamp(hide, 0, 1);
    }

    /* ============================================================ LAYOUT */
    function layout() {
      var rect = host.getBoundingClientRect();
      vw = Math.max(1, Math.round(rect.width));
      vh = Math.max(1, Math.round(rect.height));
      dpr = clamp(global.devicePixelRatio || 1, 1, quality < 0.65 ? 1.5 : 2);

      canvas.style.width = vw + 'px';
      canvas.style.height = vh + 'px';
      canvas.width = Math.round(vw * dpr);
      canvas.height = Math.round(vh * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      /* How tall the climb is. Scaled from the viewport rather than from the
         data, so a short archive is not a two-screen hill and a long one is
         not a forty-screen slog — and a phone gets the longer journey, which
         is the point of a phone. */
      var screens = coarse ? 6.4 : 5.2;
      skyLead = vh * 0.92;
      groundTail = vh * 0.42;
      pxPerUnit = clamp((vh * screens) / span(), 60, 340);
      worldH = skyLead + span() * pxPerUnit + groundTail;

      spread = clamp(vw * 0.165, 30, 132);

      layer.style.marginTop = (-vh) + 'px';
      layer.style.height = worldH + 'px';

      buildTerrain();
      buildLanePaths();
      placeFurniture();
      drawWanted = true;
    }

    /* One polyline per strand, sampled finely enough that the meander reads
       as drawn rather than plotted. Stored in world pixels. */
    function buildLanePaths() {
      lanePaths = lanes.map(function (lane) {
        var step = Math.max(0.02, span() / 900);
        var pts = [];
        for (var t = lane.from; t <= lane.to + 1e-6; t += step) {
          pts.push({ t: t, x: xAt(lane, t), y: yAt(t) });
        }
        pts.push({ t: lane.to, x: xAt(lane, lane.to), y: yAt(lane.to) });
        return { lane: lane, pts: pts };
      });
    }

    function pathFor(id) {
      for (var i = 0; i < lanePaths.length; i++) {
        if (lanePaths[i].lane.id === id) return lanePaths[i];
      }
      return null;
    }

    /* ========================================================= FURNITURE
       Lights, decade marks and the names on the paths. All real elements,
       positioned once per layout and then left alone — the scroll moves
       them, not JavaScript. */
    function placeFurniture() {
      layer.textContent = '';
      if (!lanes.length) return;

      /* --- decade marks. Not an axis: a line of small type sitting on the
         slope at the height its years reach, alternating sides so the eye
         reads them as terrain markings rather than as a scale. */
      decades.forEach(function (d, i) {
        var mid = (d.t0 + d.t1) / 2;
        var mark = el('div', 'mtn-decade');
        mark.setAttribute('aria-hidden', 'true');
        mark.dataset.side = (i % 2) ? 'right' : 'left';
        mark.style.top = yAt(mid) + 'px';
        var rule = el('span', 'mtn-decade-rule');
        var name = el('span', 'mtn-decade-name');
        name.textContent = d.label;
        mark.appendChild(name);
        mark.appendChild(rule);
        layer.appendChild(mark);
      });

      /* --- the names on the paths. Whoever's line it is, written where the
         line starts, and pressable: a name is how you follow somebody. */
      var placed = [];
      lanes.forEach(function (lane) {
        if (!lane.label) return;
        var at = lane.from + Math.min(0.5, (lane.to - lane.from) * 0.16);
        var p = pointOn(lane.id, at);
        var y = p.y;
        /* Several lines can start in the same year — a wedding and the union
           it makes. Nudge them apart rather than writing them on top of each
           other. */
        for (var g = 0; g < 8; g++) {
          var clash = placed.some(function (q) {
            return Math.abs(q.y - y) < 20 && Math.abs(q.x - p.x) < 120;
          });
          if (!clash) break;
          y -= 22;
        }
        placed.push({ x: p.x, y: y });

        var b = el('button', 'mtn-name');
        b.type = 'button';
        b.dataset.strand = lane.id;
        b.style.setProperty('--tone', lane.tone);
        b.style.left = clamp(p.x, 46, vw - 46) + 'px';
        b.style.top = y + 'px';
        b.textContent = lane.label;
        b.setAttribute('aria-pressed', 'false');
        b.setAttribute('aria-label', 'Follow ' + lane.label + '’s trail');
        b.addEventListener('click', function () {
          emit('person', lane.id);
        });
        layer.appendChild(b);
      });

      /* Two memories from the same year on the same line would land on
         exactly the same pixel — one drawn over the other, and the one
         underneath unclickable. They fan *across* their path rather than
         along it, the same rule the canvas trail follows: sliding them
         along would move them in time and claim a year nobody wrote down.
         Here that means stepping off the trail at right angles, which reads
         as two lanterns pitched a little apart at the same camp. */
      var groups = {};
      lights.forEach(function (n) {
        var key = n.strand + '|' + n.t.toFixed(3);
        (groups[key] || (groups[key] = [])).push(n);
      });
      Object.keys(groups).forEach(function (key) {
        var g = groups[key];
        if (g.length < 2) { g[0].fan = 0; return; }
        g.forEach(function (n, i) { n.fan = (i - (g.length - 1) / 2) * 30; });
      });

      /* --- the memories. A 44px target with a small light inside it: the
         thing you can hit is not the thing you can see, which is the only
         way a lantern stays a lantern on a phone. */
      lights.forEach(function (n) {
        var p = acrossFrom(n.strand, n.t, n.fan);
        n.x = p.x; n.y = p.y;
        /* Trees and ridges stand in front of some of them. A memory never
           goes out entirely — it shows through the gaps. */
        n.hide = occlusionAt(p.x, p.y) * 0.44;

        var b = el('button', 'mtn-light');
        b.type = 'button';
        b.dataset.id = n.id;
        b.style.setProperty('--tone', n.tone);
        b.style.setProperty('--r', n.radius.toFixed(2) + 'px');
        b.style.left = clamp(p.x, 26, vw - 26) + 'px';
        b.style.top = p.y + 'px';
        if (n.chaos) b.dataset.chaos = '1';
        if (n.classified) b.dataset.classified = '1';
        b.setAttribute('aria-label', n.label);

        b.appendChild(el('span', 'mtn-halo'));
        b.appendChild(el('span', 'mtn-core'));

        b.addEventListener('click', function () { emit('select', n.ref); });
        b.addEventListener('pointerenter', function (e) {
          if (e.pointerType === 'touch') return;
          hoveredId = n.id;
          showTip(n, b);
          emit('hover', n.ref);
        });
        b.addEventListener('pointerleave', function () {
          if (hoveredId !== n.id) return;
          hoveredId = null;
          /* Scrolling a focused light into view slides it out from under a
             stationary pointer, which is not the visitor losing interest —
             a tooltip the keyboard raised stays with the keyboard. */
          if (!tipFor || !tipFor.viaFocus) hideTip();
        });
        b.addEventListener('focus', function () {
          showTip(n, b, true);
          emit('hover', n.ref);
          scrollIntoBand(n.y, 420);
        });
        b.addEventListener('blur', hideTip);

        n.node = b;
        layer.appendChild(b);
      });

      applyEmphasisToDom();
      markFocus();
    }

    /* ------------------------------------------------------------- tooltip */
    var tipFor = null;          /* what the tooltip is currently about */

    function placeTip(node) {
      var r = node.getBoundingClientRect();
      var tr = tip.getBoundingClientRect();
      var left = clamp(r.left + r.width / 2 - tr.width / 2, 8, global.innerWidth - tr.width - 8);
      var top = r.top - tr.height - 10;
      if (top < 8) top = r.bottom + 10;
      tip.style.left = left + 'px';
      tip.style.top = top + 'px';
    }

    function showTip(n, node, viaFocus) {
      /* A tooltip is a pointer's idea. A touch opens the memory instead —
         and a keyboard focus is told about it, because nothing else would
         say where the light is. */
      if (coarse && !viaFocus) return;
      tip.textContent = '';
      var when = el('span', 'mtn-tip-when');
      when.textContent = n.when || '';
      var title = el('span', 'mtn-tip-title');
      title.textContent = n.title;
      if (n.when) tip.appendChild(when);
      tip.appendChild(title);
      if (n.location) {
        var where = el('span', 'mtn-tip-where');
        where.textContent = n.location;
        tip.appendChild(where);
      }
      tip.style.setProperty('--tone', n.tone);
      tip.hidden = false;
      tipFor = { node: node, viaFocus: !!viaFocus };
      placeTip(node);
    }
    function hideTip() { tip.hidden = true; tipFor = null; }

    /* ============================================================ SCROLL */
    function scrollIntoBand(worldY, ms) {
      var band = visibleBand();
      var want = worldY - (band.top + band.bottom) / 2;
      scrollTo(want, ms);
    }

    /* The strip of screen the open panel has left. On a phone the sheet owns
       the bottom, on a wide screen it owns a side, and either way a memory
       should not be scrolled underneath it. */
    function visibleBand() {
      return { top: inset.top, bottom: vh - inset.bottom };
    }

    var scrollAnim = null;
    function scrollTo(y, ms) {
      var max = Math.max(0, worldH - vh);
      y = clamp(y, 0, max);
      if (reduceMotion || !ms) { host.scrollTop = y; return; }
      var from = host.scrollTop, start = now();
      scrollAnim = { from: from, to: y, start: start, dur: ms };
      wake();
    }

    function stepScroll() {
      if (!scrollAnim) return;
      var k = clamp((now() - scrollAnim.start) / scrollAnim.dur, 0, 1);
      host.scrollTop = lerp(scrollAnim.from, scrollAnim.to, easeInOutCubic(k));
      if (k >= 1) scrollAnim = null;
    }

    host.addEventListener('scroll', function () {
      scrollTop = host.scrollTop;
      drawWanted = true;
      /* A tooltip raised by the pointer belongs to a place on the screen and
         goes when the screen moves. One raised by the keyboard belongs to the
         thing that has focus — including while the landscape is scrolling
         that thing into view — so it travels with it instead. */
      if (tipFor && tipFor.viaFocus) placeTip(tipFor.node);
      else if (!tip.hidden) hideTip();
      wake();
    }, { passive: true });

    /* Dragging with a mouse, because on a wide screen the natural gesture
       over a landscape is to pull it. Touch is left entirely to the browser:
       native scrolling is better than anything reimplemented here. */
    (function mouseDrag() {
      var dragging = false, lastY = 0, id = null;
      var travelled = 0;
      canvas.addEventListener('pointerdown', function (e) {
        if (e.pointerType !== 'mouse' || e.button !== 0) return;
        dragging = true; lastY = e.clientY; id = e.pointerId; travelled = 0;
        canvas.setPointerCapture(id);
        host.dataset.drag = '1';
      });
      canvas.addEventListener('pointermove', function (e) {
        if (!dragging || e.pointerId !== id) return;
        travelled += Math.abs(e.clientY - lastY);
        host.scrollTop -= (e.clientY - lastY);
        lastY = e.clientY;
      });
      function end(e) {
        if (!dragging || (e && e.pointerId !== id)) return;
        dragging = false;
        delete host.dataset.drag;
        try { canvas.releasePointerCapture(id); } catch (err) { /* already gone */ }
      }
      canvas.addEventListener('pointerup', end);
      canvas.addEventListener('pointercancel', end);
      canvas.addEventListener('click', function () {
        /* Clicking the landscape, away from any light, means "never mind" —
           but pulling the landscape does not. */
        if (travelled > 6) { travelled = 0; return; }
        emit('empty');
      });
    })();

    /* ========================================================= EMPHASIS */
    function laneLit(lane) {
      if (emphasis.person) return lane.id === emphasis.person ? 1 : 0.16;
      return 1;
    }

    function applyEmphasisToDom() {
      var ids = emphasis.ids;
      lights.forEach(function (n) {
        if (!n.node) return;
        /* Two different kinds of quiet. A memory outside the filters is very
           nearly out; a memory that simply belongs to somebody else while
           one person is being followed is only further away — a family does
           not disappear because you are walking with one of them. */
        var on = !ids || ids[n.id];
        var mine = !emphasis.person || n.strand === emphasis.person;
        n.lit = on ? (mine ? 1 : 0.3) : 0.1;
        n.node.dataset.off = on ? '' : '1';
        n.node.dataset.aside = (on && !mine) ? '1' : '';
        n.node.style.setProperty('--lit', (n.lit * (1 - n.hide)).toFixed(3));
        n.node.setAttribute('aria-hidden', on ? 'false' : 'true');
        n.node.tabIndex = on ? 0 : -1;
      });
      [].slice.call(layer.querySelectorAll('.mtn-name')).forEach(function (b) {
        var mine = b.dataset.strand === emphasis.person;
        b.setAttribute('aria-pressed', mine ? 'true' : 'false');
        b.dataset.off = (emphasis.person && !mine) ? '1' : '';
      });
      drawWanted = true;
    }

    function markFocus() {
      lights.forEach(function (n) {
        if (!n.node) return;
        n.node.dataset.on = (n.id === focusedId) ? '1' : '';
      });
      drawWanted = true;
    }

    /* ======================================================= BUTTERFLIES
       One at a time, and only ever for a reason. It walks the trail of
       whoever is being followed and rests a moment at each of their
       memories, which is the whole of its job.  */
    function Butterfly(laneId, tone) {
      this.laneId = laneId;
      this.tone = tone;
      this.path = pathFor(laneId);
      this.i = 0;
      this.hold = 0;
      this.phase = 0;
      this.x = 0; this.y = 0; this.a = 0;
      this.stops = lights
        .filter(function (n) { return n.strand === laneId; })
        .map(function (n) { return n.t; })
        .sort(function (a, b) { return a - b; });
      this.next = 0;
      this.fade = 0;
    }
    Butterfly.prototype.step = function (dt) {
      if (!this.path || this.path.pts.length < 2) return;
      this.a = Math.min(1, this.a + dt / 700);
      this.phase += dt * 0.012;
      if (this.hold > 0) { this.hold -= dt; return; }

      var speed = 0.055 * dt;                 /* points per ms, gentle */
      this.i += speed;
      if (this.i >= this.path.pts.length - 1) { this.i = 0; this.next = 0; }

      var p = this.path.pts[Math.floor(this.i)];
      this.x = p.x; this.y = p.y;

      /* Pausing at a memory: the next stop it has passed. */
      while (this.next < this.stops.length && this.stops[this.next] < p.t) {
        this.hold = 900;
        this.next++;
        break;
      }
    };

    function releaseFlier() { flier = null; drawWanted = true; }

    /* The other butterfly: the one that turns up for a moment when a memory
       is opened, circles it once and goes. It is not a decoration on a
       timer — nothing summons it but somebody reading something. */
    var visitor = null;
    function flutterAt(n) {
      if (reduceMotion || !n) return;
      visitor = { cx: n.x, cy: n.y, tone: n.tone, age: 0, life: 2600,
                  ph: 0, r: 26 + hash01(n.id) * 14, dir: hash01(n.id + 'd') < 0.5 ? -1 : 1 };
      wake();
    }
    function stepVisitor(dt) {
      if (!visitor) return;
      visitor.age += dt;
      visitor.ph += dt * 0.0032 * visitor.dir;
      if (visitor.age > visitor.life) visitor = null;
    }
    function paintVisitor(time) {
      if (!visitor) return;
      var k = visitor.age / visitor.life;
      var a = Math.min(1, k * 6) * Math.min(1, (1 - k) * 3.4);
      /* It spirals out as it leaves, which is the whole of its opinion. */
      var r = visitor.r * (1 + k * 1.5);
      var x = visitor.cx + Math.cos(visitor.ph) * r;
      var y = visitor.cy + Math.sin(visitor.ph) * r * 0.7 - k * 26 - scrollTop;
      if (y < -30 || y > vh + 30) return;
      wing(x, y, visitor.tone, a * 0.8, 0.45 + 0.55 * Math.abs(Math.sin(time * 0.011)), 0.8);
    }

    /* One pair of wings, drawn additively so two lights behind it warm up
       rather than muddy. Shared by both butterflies. */
    function wing(x, y, tone, alpha, beat, size) {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.globalCompositeOperation = 'lighter';
      ctx.translate(x, y);
      ctx.scale(size, size);
      ctx.fillStyle = tone;
      for (var s = -1; s <= 1; s += 2) {
        ctx.beginPath();
        ctx.ellipse(s * 3.1 * beat, 0, 3.4 * beat, 5.2, s * 0.34, 0, TAU);
        ctx.fill();
      }
      ctx.globalAlpha = alpha * 0.45;
      ctx.beginPath();
      ctx.arc(0, 0, 7.5, 0, TAU);
      ctx.fill();
      ctx.restore();
    }

    function startFollow(laneId) {
      if (reduceMotion || !laneId) { flier = null; return; }
      var lane = laneById[laneId];
      if (!lane) { flier = null; return; }
      flier = new Butterfly(laneId, lane.tone);
      sweep = { on: true, t: 0, start: now(), dur: 2400, lane: laneId };
      wake();
    }

    /* ============================================================== DRAW */
    function paintSky() {
      var g = ctx.createLinearGradient(0, 0, 0, vh);
      /* The world's own gradient read through the scroll: cold and open at
         the top of the climb, warm and close at the bottom of it. */
      /* k0 is how far up the climb the viewer is: 0 at the top of the world,
         where the air is thin and cold, 1 at the bottom, where it is warm
         and close. The air is never black — the gaps between ridges have to
         read as distance, not as holes cut in the page. */
      var k0 = clamp(scrollTop / Math.max(1, worldH - vh), 0, 1);
      var hiA = lerp(0.10, 0.02, k0);
      g.addColorStop(0, 'rgb(' + Math.round(lerp(17, 10, k0)) + ',' +
                                 Math.round(lerp(21, 9, k0)) + ',' +
                                 Math.round(lerp(52, 27, k0)) + ')');
      g.addColorStop(1, 'rgb(' + Math.round(lerp(11, 7, k0)) + ',' +
                                 Math.round(lerp(11, 6, k0)) + ',' +
                                 Math.round(lerp(30, 17, k0)) + ')');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, vw, vh);

      /* One violet wash high, one amber wash low: the room's own two lights,
         kept faint enough to read as air rather than as colour. */
      var v = ctx.createRadialGradient(vw * 0.22, -vh * 0.1, 0, vw * 0.22, -vh * 0.1, vh * 1.2);
      v.addColorStop(0, 'rgba(124,77,255,' + (0.085 * (1 - k0) + 0.02).toFixed(3) + ')');
      v.addColorStop(1, 'rgba(124,77,255,0)');
      ctx.fillStyle = v;
      ctx.fillRect(0, 0, vw, vh);

      var a = ctx.createRadialGradient(vw * 0.82, vh * 1.05, 0, vw * 0.82, vh * 1.05, vh * 1.1);
      a.addColorStop(0, 'rgba(255,196,107,' + (0.02 + hiA * 0.5).toFixed(3) + ')');
      a.addColorStop(1, 'rgba(255,196,107,0)');
      ctx.fillStyle = a;
      ctx.fillRect(0, 0, vw, vh);
    }

    function paintStars(time) {
      var off = scrollTop * 0.14;
      ctx.save();
      for (var i = 0; i < stars.length; i++) {
        var s = stars[i];
        var y = s.u - off;
        if (y < -4 || y > vh + 4) continue;
        var tw = reduceMotion ? 1 : (0.72 + 0.28 * Math.sin(time * 0.0011 * s.sp + s.ph));
        ctx.globalAlpha = clamp(s.a * tw, 0, 1);
        ctx.fillStyle = '#F1EEFB';
        ctx.fillRect(s.x, y, s.r, s.r);
      }
      ctx.restore();
    }

    /* A crest, filled downward. The fill fades out over the layer's depth so
       terrain reads as air-thickened distance rather than as flat paper —
       and so a light standing behind the treeline still shows. */
    function paintCrest(T, crest, scroll) {
      var L = T.def;
      var fill = L.depth * vh;
      var step = Math.max(6, vw / (quality > 0.7 ? 96 : 54));
      /* Cheap cull. A crest never reaches more than `crest.amp` above its
         own baseline, so the baseline alone bounds the whole shape. */
      var baseY = crest.u - scroll * L.p;
      if (baseY - crest.amp > vh + 4 || baseY + fill < -4) return;
      var first = crestScreenY(L, crest, -step, scroll);

      ctx.beginPath();
      ctx.moveTo(-step, first);
      var x;
      for (x = 0; x <= vw + step; x += step) {
        ctx.lineTo(x, crestScreenY(L, crest, x, scroll));
      }
      var lastY = crestScreenY(L, crest, vw + step, scroll);
      ctx.lineTo(vw + step, lastY);
      ctx.lineTo(vw + step, Math.max(lastY, first) + fill);
      ctx.lineTo(-step, first + fill);
      ctx.closePath();

      /* Lit along the crest, deep shadow just under it, then a long fade
         into the dark of the valley — which is what lets a trail vanish
         under a ridge and come back out of the shade below it. */
      var top = Math.min(first, lastY) - crest.amp;
      var g = ctx.createLinearGradient(0, top, 0, top + crest.amp + fill);
      g.addColorStop(0, L.top);
      g.addColorStop(0.24, L.bottom);
      g.addColorStop(0.44, L.bottom);
      g.addColorStop(1, 'rgba(2,1,6,0)');
      ctx.globalAlpha = L.alpha;
      ctx.fillStyle = g;
      ctx.fill();
      ctx.globalAlpha = 1;

      /* A hairline of light along the crest: the sky catching the top of the
         ridge. It is what stops the silhouettes reading as cut paper. */
      ctx.beginPath();
      ctx.moveTo(-step, first);
      for (x = 0; x <= vw + step; x += step) {
        ctx.lineTo(x, crestScreenY(L, crest, x, scroll));
      }
      ctx.strokeStyle = 'rgba(186,202,255,' + L.rim.toFixed(3) + ')';
      ctx.lineWidth = 1;
      ctx.stroke();

      if (L.trees > 0) paintTrees(T, crest, scroll, step);
    }

    /* Conifers along a crest. Three tiers of triangle, seeded per position,
       thinning and thickening along the ridge so the treeline is a forest in
       places and a lone tree in others. */
    function paintTrees(T, crest, scroll, step) {
      var L = T.def;
      var gap = Math.max(9, vw / (34 * quality));
      var scale = L.p >= 1.1 ? 1.7 : 1;
      ctx.fillStyle = L.p >= 1.1 ? '#020106' : '#050410';
      for (var x = 0; x < vw + gap; x += gap) {
        var h = hash01(crest.seed + ':' + Math.round(x / gap));
        /* density waves along the ridge — forest, clearing, forest */
        var band = 0.5 + 0.5 * Math.sin(x / vw * 7.3 + crest.treeSeed * 12.9);
        if (h > L.trees * (0.35 + band * 0.85)) continue;
        var y = crestScreenY(L, crest, x, scroll);
        if (y < -30 || y > vh + 10) continue;
        var th = (7 + h * 15) * scale;
        var tw = th * (0.32 + h * 0.12);
        ctx.beginPath();
        for (var tier = 0; tier < 3; tier++) {
          var ty = y - th * (1 - tier * 0.30);
          var tws = tw * (0.5 + tier * 0.28);
          ctx.moveTo(x, ty);
          ctx.lineTo(x + tws, ty + th * 0.42);
          ctx.lineTo(x - tws, ty + th * 0.42);
        }
        ctx.closePath();
        ctx.fill();
      }
    }

    /* Mist: a few slow horizontal bands lying in the valleys, plus the big
       one at the top of the world where the record gives out. */
    function paintMist(time) {
      var drift0 = reduceMotion ? 0 : Math.sin(time * 0.00006) * vw * 0.05;
      var bands = Math.round((quality > 0.6 ? 14 : 8) * clamp(worldH / (vh * 5), 0.6, 2));
      for (var i = 0; i < bands; i++) {
        var u = (i + 0.35) * (worldH / (bands + 1));
        var y = u - scrollTop * 0.72;
        if (y < -vh * 0.5 || y > vh * 1.5) continue;
        var hgt = vh * (0.20 + hash01('mist' + i) * 0.22);
        var g = ctx.createLinearGradient(0, y - hgt / 2, 0, y + hgt / 2);
        g.addColorStop(0, 'rgba(160,180,230,0)');
        g.addColorStop(0.5, 'rgba(160,180,230,' + (0.026 + hash01('m' + i) * 0.03).toFixed(3) + ')');
        g.addColorStop(1, 'rgba(160,180,230,0)');
        ctx.fillStyle = g;
        ctx.fillRect(drift0 * (i % 2 ? 1 : -1), y - hgt / 2, vw, hgt);
      }

      /* The unwritten part. Above the newest memory the land simply keeps
         going, and the archive says so by not drawing an end to it. */
      var topY = yAt(axis.end) - scrollTop;
      if (topY > -vh) {
        var t2 = ctx.createLinearGradient(0, topY - vh * 0.95, 0, topY + vh * 0.25);
        t2.addColorStop(0, 'rgba(140,160,220,0.085)');
        t2.addColorStop(0.7, 'rgba(120,140,210,0.035)');
        t2.addColorStop(1, 'rgba(120,140,210,0)');
        ctx.fillStyle = t2;
        ctx.fillRect(0, topY - vh * 0.95, vw, vh * 1.2);
      }
    }

    /* The trails. Drawn between the middle distance and the near ridges, so
       the land in front of them genuinely covers them up. */
    function paintTrails(time) {
      var lit;
      for (var i = 0; i < lanePaths.length; i++) {
        var P = lanePaths[i];
        lit = laneLit(P.lane);
        if (lit <= 0.02) continue;
        var pts = P.pts;
        if (pts.length < 2) continue;

        /* The illuminating sweep: when somebody is being followed, their
           path lights from its earliest point toward the present. */
        var reach = 1;
        if (sweep.on && sweep.lane === P.lane.id) {
          reach = clamp((time - sweep.start) / sweep.dur, 0, 1);
          if (reach >= 1) sweep.on = false;
        }

        /* pts[0] is the earliest moment on this line, so the head of the
           sweep runs forward from it toward the present. */
        var top = pts.length - 1;
        var head = Math.round(top * reach);

        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        /* two passes: a wide, faint bloom and a fine core */
        for (var pass = 0; pass < 2; pass++) {
          ctx.beginPath();
          var drawing = false;
          for (var j = 0; j <= top; j++) {
            if (j > head) break;
            var p = pts[j];
            var sy = p.y - scrollTop;
            if (sy < -60 || sy > vh + 60) { drawing = false; continue; }
            if (!drawing) { ctx.moveTo(p.x, sy); drawing = true; }
            else ctx.lineTo(p.x, sy);
          }
          ctx.strokeStyle = P.lane.tone;
          ctx.globalAlpha = (pass === 0 ? 0.13 : 0.55) * lit;
          ctx.lineWidth = pass === 0 ? 7 : 1.2;
          if (pass === 0) ctx.globalCompositeOperation = 'lighter';
          ctx.stroke();
          ctx.globalCompositeOperation = 'source-over';
        }
        ctx.globalAlpha = 1;
      }
    }

    function paintFlier() {
      if (!flier) return;
      var y = flier.y - scrollTop;
      if (y < -40 || y > vh + 40) return;
      var beat = reduceMotion ? 0.75 : (0.45 + 0.55 * Math.abs(Math.sin(flier.phase)));
      wing(flier.x, y, flier.tone, flier.a, beat, 1);
    }

    function draw(time) {
      ctx.clearRect(0, 0, vw, vh);
      paintSky();
      paintStars(time);

      /* far and middle distance */
      var i, c;
      for (i = 0; i < 2 && i < terrain.length; i++) {
        for (c = 0; c < terrain[i].crests.length; c++) {
          paintCrest(terrain[i], terrain[i].crests[c], scrollTop);
        }
      }
      paintMist(time);

      paintTrails(time);
      paintFlier();
      paintVisitor(time);

      /* near ground last, so the paths run behind it */
      for (i = 2; i < terrain.length; i++) {
        for (c = 0; c < terrain[i].crests.length; c++) {
          paintCrest(terrain[i], terrain[i].crests[c], scrollTop);
        }
      }
    }

    /* ============================================================== LOOP
       Idles at eight frames a second — enough for a star to breathe — and
       goes to full rate only while something is actually moving. Stops dead
       when the lens is put away or the tab is hidden. */
    var lastDrawn = 0;

    function frame(time) {
      rafId = 0;
      if (!active) return;

      var dt = lastFrame ? Math.min(60, time - lastFrame) : 16;
      lastFrame = time;

      var busy = !!scrollAnim || !!visitor || (flier && !reduceMotion) || sweep.on;
      if (scrollAnim) stepScroll();
      if (flier && !reduceMotion) { flier.step(dt); drawWanted = true; }
      if (visitor) { stepVisitor(dt); drawWanted = true; }

      var interval = busy ? 0 : 118;
      if (drawWanted || busy || (!reduceMotion && time - lastDrawn > interval)) {
        draw(time);
        drawWanted = false;
        lastDrawn = time;
      }
      /* With reduced motion nothing breathes, so once the last frame is on
         screen the loop stops dead and waits to be woken by a scroll or a
         change of emphasis. */
      if (reduceMotion && !busy && !drawWanted) return;
      schedule();
    }

    function schedule() {
      if (!active || rafId) return;
      rafId = global.requestAnimationFrame(frame);
    }
    function wake() {
      if (!active || document.hidden) return;
      schedule();
    }

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) {
        if (rafId) { global.cancelAnimationFrame(rafId); rafId = 0; }
      } else wake();
    });

    /* ================================================================ API */
    var api = {
      on: on,

      /* The braid, in the controller's own axis units — the same object the
         canvas lens is handed, so the two cannot disagree about the family.
           { laneW, lanes: [...], axis: {start, end}, decades: [...] } */
      setWorld: function (spec) {
        laneW = spec.laneW || 0.55;
        axis = { start: spec.axis.start, end: spec.axis.end };
        decades = spec.decades || [];
        lanes = (spec.lanes || []).map(function (l) {
          var seed = hash01(l.id);
          return {
            id: l.id,
            label: l.label || '',
            tone: l.tone || '#FFC46B',
            side: l.side || 0,
            base: l.base || null,
            startKind: l.startKind || 'union',
            endKind: l.endKind || 'open',
            joinTarget: l.joinTarget || null,
            from: l.from,
            to: l.to,
            phase: seed,
            /* How much a life wanders. A path the archive has a lot to say
               about wanders visibly; one it barely knows keeps closer to its
               lane, because there is less of it to wander with. */
            amp: 0.52 + (l.weight || 0) * 0.46 + seed * 0.3,
            freq: 0.78 + seed * 0.42,
            /* Two lines that marry travel side by side rather than fusing.
               Which side is decided by where the line came from, so nobody
               crosses over their partner to get there. */
            pairGap: (l.side < 0 ? -1 : 1) * 0.20
          };
        });
        laneById = {};
        lanes.forEach(function (l) { laneById[l.id] = l; });
        return api;
      },

      /* lights: [{ id, strand, t, tone, title, when, location, label,
                    weight, chaos, classified, ref }] */
      setLights: function (list) {
        lights = (list || []).map(function (n) {
          return {
            id: n.id,
            strand: n.strand,
            t: n.t,
            tone: n.tone || '#FFC46B',
            title: n.title || '',
            when: n.when || '',
            location: n.location || '',
            label: n.label || n.title || '',
            /* Importance, where the archive has said anything about it.
               Restrained on purpose: a featured memory is a slightly bigger
               lantern, not a floodlight. */
            radius: 2.6 + clamp(n.weight || 0, 0, 1) * 2.6,
            chaos: !!n.chaos,
            classified: !!n.classified,
            ref: n.ref || { id: n.id },
            lit: 1, hide: 0, x: 0, y: 0, node: null
          };
        });
        lightById = {};
        lights.forEach(function (n) { lightById[n.id] = n; });
        return api;
      },

      layout: function () { layout(); return api; },
      resize: function () { if (active) layout(); return api; },

      activate: function (opts) {
        opts = opts || {};
        if (active) return api;
        active = true;
        host.hidden = false;
        layout();
        scrollTop = host.scrollTop;
        lastFrame = 0; lastDrawn = 0; drawWanted = true;
        if (opts.at !== undefined && opts.at !== null) {
          this.focus(opts.at, { instant: true });
        } else if (opts.t !== undefined && opts.t !== null) {
          scrollTo(yAt(opts.t) - vh * 0.5, 0);
        } else {
          /* The foot of the climb — but with the first memory already in
             sight. The very bottom of the world is the years before anybody
             wrote anything down, and there is nothing to look at there. */
          var lowest = 0;
          lights.forEach(function (n) { if (n.y > lowest) lowest = n.y; });
          scrollTo(lowest ? lowest - vh * 0.60 : worldH, 0);
        }
        scrollTop = host.scrollTop;
        wake();
        return api;
      },

      deactivate: function () {
        active = false;
        if (rafId) { global.cancelAnimationFrame(rafId); rafId = 0; }
        hideTip();
        flier = null;
        visitor = null;
        host.hidden = true;
        return api;
      },

      isActive: function () { return active; },

      focus: function (id, opts) {
        opts = opts || {};
        var changed = id !== focusedId;
        focusedId = id || null;
        markFocus();
        var n = id && lightById[id];
        if (n && active) {
          scrollIntoBand(n.y, opts.instant || reduceMotion ? 0 : 900);
          if (changed && !opts.instant) flutterAt(n);
        }
        return api;
      },

      clearFocus: function () { focusedId = null; markFocus(); return api; },

      /* ids is a lookup of the story ids that survive the current filters,
         or null for "everything". person is a strand id, and is what turns a
         trail up and everything else down. */
      setEmphasis: function (next) {
        var wasPerson = emphasis.person;
        emphasis = {
          category: next.category || null,
          person: next.person || null,
          era: next.era || null,
          ids: next.ids || null
        };
        applyEmphasisToDom();
        if (emphasis.person && emphasis.person !== wasPerson) startFollow(emphasis.person);
        if (!emphasis.person) { releaseFlier(); sweep.on = false; }
        wake();
        return api;
      },

      /* Scroll the mountain to the years an era covers. */
      showEra: function (era) {
        if (!era || !active) return api;
        var t = (era.t0 + era.t1) / 2;
        scrollIntoBand(yAt(t), 900);
        return api;
      },

      showPerson: function (id) {
        var P = pathFor(id);
        if (!P || !P.pts.length || !active) return api;
        scrollIntoBand(P.pts[Math.floor(P.pts.length * 0.72)].y, 900);
        return api;
      },

      setInset: function (top, bottom) {
        inset.top = top || 0;
        inset.bottom = bottom || 0;
        return api;
      },

      isReduced: function () { return reduceMotion; },
      isCoarse: function () { return coarse; },
      /* Where the visitor currently is, in axis units — so the other lens
         can pick up roughly where this one left off. */
      hereAt: function () { return tAtY(scrollTop + vh * 0.5); }
    };

    host.hidden = true;
    return api;
  }

  global.BUTTERFLY_MOUNTAIN = { create: create };
})(window);
