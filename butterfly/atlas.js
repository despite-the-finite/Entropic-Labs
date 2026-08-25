/* Entropic Labs — Butterfly Trails, the atlas.
   ==========================================================================
   The braid, walked across a country.

   This is the same layout the canvas trail draws — one line per life, lives
   running alongside each other, converging when they marry and dividing
   again each time somebody is born — laid over a painted map instead of a
   dark plane. Nothing about the family is decided here: butterfly.js hands
   over the same resolved lanes and the same time axis the canvas lens gets,
   and this file only says where on the paper they fall.

   The spine
     One meandering line crosses the country from the east, where the record
     starts, to the west, where the paint gives out. Time runs along it. Each
     strand is drawn at its own offset either side of that line — the braid's
     own offsets, unchanged — so a birth still leaves its parent exactly and
     a marriage still arrives exactly.

   The ground is chapters, and none of it is named
     Because time runs along the spine, a stretch of ground can only be a
     stretch of years — so each one wears the landscape of wherever that
     chapter mostly happened: plains before 1986, copper savanna through the
     Zambian years, a coast and an island for the years of leaving, alpine
     country for Colorado, water at the far end, and then the paper stops.

     Not one of them carries an invented name. These are real memories, and a
     made-up place name printed over them makes a true story look like a made
     -up one. The only names on this paper are the archive's own: the towns
     where the memories actually happened.

   How it is drawn
     The whole static map — paper, land, water, terrain, the braid itself —
     is painted once into an offscreen canvas at map resolution and blitted
     under the camera. Only what actually moves is drawn per frame: the
     trees, three animals, and the butterflies. That is what buys a
     watercolour this detailed on a phone.

     Everything with words in it is a real DOM element inside one transformed
     layer, so panning and zooming is a single transform rather than a
     hundred style writes, and the labels counter-scale through one custom
     property so type stays type at every zoom.

   Coordinate spaces
     map      the country's own units, 1600 × 1000. Everything below is in
              these unless it says otherwise.
     axis     the controller's compressed time axis. The braid's own units.
     screen   CSS pixels. The camera converts.
   ========================================================================== */

(function (global) {
  'use strict';

  var TAU = Math.PI * 2;
  var MAP = { w: 1600, h: 1000 };

  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function hash01(s) {
    var h = 2166136261;
    s = String(s);
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return ((h >>> 0) % 100000) / 100000;
  }
  function rng(seed) {
    var s = Math.floor(hash01(seed) * 1e9) || 1;
    return function () {
      s |= 0; s = (s + 0x6D2B79F5) | 0;
      var t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null) n.textContent = text;
    return n;
  }

  /* Catmull-Rom through a list of points, sampled into a polyline. Same
     curve the canvas trail uses, for the same reason: it keeps a route
     looking walked rather than plotted. */
  function spline(pts, per) {
    if (pts.length < 2) return pts.slice();
    var out = [];
    var p = [pts[0]].concat(pts, [pts[pts.length - 1]]);
    for (var i = 1; i < p.length - 2; i++) {
      var p0 = p[i - 1], p1 = p[i], p2 = p[i + 1], p3 = p[i + 2];
      for (var j = 0; j < per; j++) {
        var t = j / per, t2 = t * t, t3 = t2 * t;
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
    out.push(pts[pts.length - 1]);
    return out;
  }

  /* A brush does not follow a ruler. Every outline in here gets pushed off
     course by a slow seeded wander before it is drawn.

     Slow is the word that matters, and it used to be a lie: the wander
     stepped once per point, so on a spline resampled every two or three
     pixels a five-pixel amplitude turned a full circle inside one short
     run and the outline sawed back over itself, dozens of times along the
     shore. That is what made the coast read as a scribble. The wander now
     advances by the distance actually travelled — one full wave every
     `wave` pixels of path, whatever the points are spaced at — so the
     displacement can never change faster than the path itself moves and a
     roughened outline cannot cross itself. */
  function waver(pts, amp, seed, wave) {
    var r = rng(seed);
    var ph = r() * TAU, ph2 = r() * TAU;
    var per = (wave || 110) / TAU;
    var d = 0, out = [], i;
    for (i = 0; i < pts.length; i++) {
      if (i) {
        var dx = pts[i].x - pts[i - 1].x, dy = pts[i].y - pts[i - 1].y;
        d += Math.sqrt(dx * dx + dy * dy);
      }
      var a = d / per + ph, b = d / (per * 2.3) + ph2;
      out.push({ x: pts[i].x + (Math.sin(a) * 0.6 + Math.sin(b) * 0.4) * amp,
                 y: pts[i].y + (Math.cos(a * 1.13) * 0.6 + Math.cos(b * 0.87) * 0.4) * amp });
    }
    return out;
  }

  function ring(cx, cy, rx, ry, n, rough, seed) {
    var r = rng(seed), out = [];
    for (var i = 0; i < n; i++) {
      var a = (i / n) * TAU;
      var k = 1 + (r() - 0.5) * rough;
      out.push({ x: cx + Math.cos(a) * rx * k, y: cy + Math.sin(a) * ry * k });
    }
    return out;
  }

  function tracePath(ctx, pts, close) {
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    if (close) ctx.closePath();
  }

  /* ------------------------------------------------------------------------
     THE PALETTE
     Sun-bleached paper and pigment. The route is the one hot colour on the
     sheet until the waypoints light, which is the whole point of the design:
     the country is painted, the memories are lit.
     ------------------------------------------------------------------------ */
  var PIG = {
    paper:      '#F4EDDC',
    paperEdge:  '#E4D8BC',
    ink:        '#4A3B2C',
    inkSoft:    'rgba(74,59,44,0.52)',
    sea:        '#9FC9CD',
    seaDeep:    '#7FB3BC',
    land:       '#CBD9A8',
    veld:       '#D9C68C',
    plain:      '#E0CE94',
    prairie:    '#E5D59B',
    pine:       '#9DBE96',
    rock:       '#BFBBC4',
    rockHigh:   '#D9D4D6',
    lagoon:     '#8FD2CE',
    gorge:      '#B7C4A2',
    near:       '#DCD3B4',
    river:      '#8FBFC7',
    trail:      '#B4432E',
    trailInk:   '#8E2F1E',
    forest:     '#6E8F62',
    forestDeep: '#4E6E4A',
    hide:       '#8A5A3C',
    hideDark:   '#5F3A25',
    /* Ground the chapters do not have a wash for: standing water, bare
       rock, wet sand, reeds. A country is not six colours. */
    tarn:       '#8ABCC4',
    scree:      '#B2ADB5',
    sand:       '#E6DAB4',
    marsh:      '#9DB77E'
  };

  /* One green was doing all the work. Woods read as a single flat mass when
     every tree in them is the same colour, so each chapter gets a short list
     to pick from and every tree picks once — which is enough variety to make
     a wood look like a wood without any of it competing with the braid. */
  var LEAF = {
    peak:    ['#5B7A55', '#456A46', '#6E8F62', '#3E5F41'],
    hill:    ['#63855A', '#4E6E4A', '#7C9A66', '#456A46'],
    bush:    ['#8A9E62', '#6E8F62', '#9CAA6C', '#7A8E58'],
    plain:   ['#8FA168', '#A2AE76', '#7C9A66', '#B0864A'],
    prairie: ['#9BAA70', '#AEB77E', '#849B63', '#B89457'],
    coast:   ['#7FA06A', '#94AE72', '#6E8F62', '#A6B87E'],
    isle:    ['#69A183', '#7FB18C', '#5C8F73', '#8CBE97'],
    falls:   ['#5F8A72', '#4E7A63', '#79A184', '#9DB77E'],
    soft:    ['#88A06B', '#9CAE76', '#749162', '#AF8B52']
  };
  function leafOf(terrain, r) {
    var list = LEAF[terrain] || LEAF.plain;
    return list[Math.min(list.length - 1, Math.floor(r * list.length))];
  }

  /* ------------------------------------------------------------------------
     THE COUNTRY
     Chapters of one life, in order, because time runs along the spine and a
     stretch of ground can therefore only be a stretch of years. `from` and
     `to` are years; everything else is how that stretch is painted. `span`
     is how far either side of the spine the wash reaches.

     None of them is named. The landscape says which years these are — the
     copper savanna, the alpine years, the water at the far end — and the
     only names printed on this paper are the ones the archive supplies
     itself: the towns where the memories actually happened.
     ------------------------------------------------------------------------ */
  var REGIONS = [
    { id: 'plain', from: -Infinity, to: 1985, wash: '#E2CE8E', terrain: 'plain', span: 190 },
    { id: 'copper', from: 1986, to: 2004, wash: '#D9BA76', terrain: 'bush', span: 218 },
    { id: 'crossing', from: 2005, to: 2009, wash: '#CBDFC6', terrain: 'coast', span: 186 },
    { id: 'range', from: 2010, to: 2019, wash: '#B6BAC8', terrain: 'peak', span: 205 },
    { id: 'water', from: 2020, to: 2024, wash: '#A6C6BC', terrain: 'falls', span: 160 },
    { id: 'near', from: 2025, to: Infinity, wash: '#DFD6B6', terrain: 'soft', span: 150 }
  ];
  var REGION_BY = {};
  REGIONS.forEach(function (r) { REGION_BY[r.id] = r; });

  /* Two pieces of ground inside those chapters that are too particular to
     lose: a pine upland beside the copper years, and an island off the years
     of leaving. Unnamed, like the chapters — they are landscape, not places.
     `at` is the year they sit beside, `side` which bank of the spine. */
  var FEATURES = [
    { id: 'hills', at: 1999, side: -1,
      out: 188, rx: 158, ry: 98, wash: PIG.pine, terrain: 'hill' },
    { id: 'isles', at: 2007, side: 1,
      out: 265, rx: 132, ry: 96, wash: PIG.lagoon, terrain: 'isle', island: true }
  ];

  /* Which chapter a year belongs to. */
  function regionForYear(y) {
    for (var i = 0; i < REGIONS.length; i++) {
      if (y >= REGIONS[i].from && y <= REGIONS[i].to) return REGIONS[i];
    }
    return REGIONS[REGIONS.length - 1];
  }

  function create(host, options) {
    options = options || {};

    var mq = global.matchMedia ? global.matchMedia.bind(global) : null;
    var reduceMotion = mq ? mq('(prefers-reduced-motion: reduce)').matches : false;
    var coarse = mq ? mq('(pointer: coarse)').matches : false;

    /* ------------------------------------------------------------- the DOM */
    var canvas = el('canvas', 'atlas-canvas');
    canvas.setAttribute('aria-hidden', 'true');
    var ctx = canvas.getContext('2d', { alpha: false });

    var layer = el('div', 'atlas-layer');      /* pans and zooms as one thing */
    var tip = el('div', 'atlas-tip');
    tip.hidden = true;
    var hud = el('div', 'atlas-hud');
    hud.setAttribute('aria-hidden', 'true');

    host.appendChild(canvas);
    host.appendChild(layer);
    host.appendChild(hud);
    host.appendChild(tip);

    /* -------------------------------------------------------------- state */
    var vw = 0, vh = 0, dpr = 1;
    var cam = { x: MAP.w / 2, y: MAP.h / 2, z: 1 };
    var camTo = null, camFrom = null, camT = 1, camStart = 0, camDur = 900;
    var zMin = 0.3, zMax = 3.4, zFit = 1, zCover = 1;

    var active = false, rafId = 0, lastFrame = 0, drawWanted = true, lastDrawn = 0;
    var listeners = {};

    var sheet = null;                          /* the painted map, offscreen */
    var sheetScale = 1;
    var waypoints = [], wpById = {};
    var lanes = [], laneById = {}, lanePaths = [], laneW = 0.55;
    var axis = { start: 0, end: 1 };
    var trunkId = null, marriedWord = 'Married';
    var joints = [];                           /* births and marriages */
    var trees = [], fauna = [];
    var eras = [];
    var emphasis = { category: null, person: null, era: null, ids: null };
    var focusedId = null;
    var inset = { top: 0, bottom: 0 };
    var lod = 'far';

    var quality = 1;
    (function seedQuality() {
      var cores = global.navigator && global.navigator.hardwareConcurrency;
      var mem = global.navigator && global.navigator.deviceMemory;
      if ((cores && cores <= 4) || (mem && mem <= 4)) quality = 0.7;
      if ((cores && cores <= 2) || (mem && mem <= 2)) quality = 0.5;
    })();

    function now() { return (global.performance || Date).now(); }
    function on(name, fn) { (listeners[name] || (listeners[name] = [])).push(fn); return api; }
    function emit(name, payload) {
      var l = listeners[name];
      if (!l) return;
      for (var i = 0; i < l.length; i++) l[i](payload);
    }

    /* ============================================================ THE SPINE
       One line across the country, east to west, and time runs along it. It
       is hand-drawn rather than derived: a country's shape is a decision,
       and this one has to leave room for a range in the west, a coast in the
       middle and a plain in the east. Everything else in the map is placed
       off it. */
    /* The spine is generated rather than plotted, because it has one hard
       requirement a hand-drawn line keeps breaking: every strand is drawn at
       an offset from it, and an offset curve folds over itself wherever the
       curve it follows turns tighter than that offset. So the shape is a
       long sweep from east to west with one slow wave laid over it and a
       second, much slower one to stop that reading as a formula — chosen so
       the tightest bend anywhere is comfortably wider than the widest lane.

           radius of a sine's tightest bend = (wavelength / 2π)² / amplitude

       which at these numbers is about 290 map units against a widest lane
       of some 170: enough room, and the reason it stays a braid. */
    /* West to east, because that is the way the canvas trail runs and the
       way anybody reads. It also settles which bank is which: the normal of
       a line running rightward points down, so a strand at side -1 sits
       above the trunk here exactly as it does there. */
    /* Shallow on purpose. The canvas trail is a level ribbon, and the
       whole of its readability comes from that: the eye follows a line that
       stays where it was. A map wants some wander in it, so there is some —
       but a fraction of what a landscape would take, because the moment the
       braid climbs and dives across the sheet it stops being followable. */
    var SPINE = { x0: 128, x1: 1552, y0: 500, amp: 58, drift: 18 };
    var spinePts = [], spineLen = [];

    function buildSpine() {
      /* Both waves complete a whole number of turns across the sheet, so the
         line comes back to the height it started at. A spine that drifts —
         1.05 turns, say — reads as one long diagonal, and the braid slides
         off two corners of the paper however wide the country is drawn. */
      var pts = [], n = 170;
      for (var i = 0; i <= n; i++) {
        var k = i / n;
        pts.push({
          x: SPINE.x0 + (SPINE.x1 - SPINE.x0) * k,
          y: SPINE.y0
             + Math.sin(k * TAU + 0.9) * SPINE.amp
             + Math.sin(k * TAU * 2 + 2.4) * SPINE.drift
        });
      }
      spinePts = waver(pts, 2.2, 'spine');
      spineLen = [0];
      for (var j = 1; j < spinePts.length; j++) {
        var dx = spinePts[j].x - spinePts[j - 1].x, dy = spinePts[j].y - spinePts[j - 1].y;
        spineLen[j] = spineLen[j - 1] + Math.sqrt(dx * dx + dy * dy);
      }
    }

    /* A point and a direction some fraction of the way along the spine. */
    function onSpine(u) {
      if (!spinePts.length) return { x: 0, y: 0, nx: 0, ny: -1 };
      var total = spineLen[spineLen.length - 1];
      var want = clamp(u, -0.06, 1.06) * total;
      var i = 1;
      while (i < spineLen.length - 1 && spineLen[i] < want) i++;
      var a = spinePts[i - 1], b = spinePts[i];
      var seg = spineLen[i] - spineLen[i - 1] || 1;
      var k = (want - spineLen[i - 1]) / seg;
      var dx = b.x - a.x, dy = b.y - a.y;
      var d = Math.sqrt(dx * dx + dy * dy) || 1;

      /* The direction is read across a window, not off the one segment
         under the point. The spine is a roughened line — a couple of
         pixels of wander, which is what keeps it from looking ruled — and
         its segments are only eight pixels long, so a two-pixel wobble
         swings a single segment's angle by twenty-odd degrees. Anything
         hung off that normal at a distance swings with it: the shore is
         three hundred pixels out, so it was moving a hundred and fifty
         pixels between neighbouring samples and folding over itself the
         whole way along. That fold, roughened and inked, was the scribble
         round the edge of the land. Averaged over a dozen segments the
         direction is the line's, not the wobble's, while the position it
         is taken at keeps every bit of the wander. */
      var W = 6, lo = clamp(i - 1 - W, 0, spinePts.length - 1),
          hi = clamp(i + W, 0, spinePts.length - 1);
      var tx = spinePts[hi].x - spinePts[lo].x, ty = spinePts[hi].y - spinePts[lo].y;
      var tl = Math.sqrt(tx * tx + ty * ty) || 1;

      /* Off the ends the spine keeps going straight, so a line that runs in
         from before the record still has somewhere to run in from. */
      var over = want < 0 ? want : (want > total ? want - total : 0);
      return {
        x: a.x + dx * k + (over ? tx / tl * over : 0),
        y: a.y + dy * k + (over ? ty / tl * over : 0),
        nx: -ty / tl, ny: tx / tl
      };
    }

    function uOf(t) {
      var span = Math.max(0.001, axis.end - axis.start);
      return (t - axis.start) / span;
    }

    /* ========================================================== THE BRAID
       Lifted from the canvas renderer on purpose, so the two lenses cannot
       disagree about the family: a strand is measured from whatever it
       branched out of, never from zero, so a birth leaves its parent exactly
       and a marriage arrives exactly, with no seam to line up by hand. */
    var MERGE_W = 1.15, BRANCH_W = 0.95;
    var LANE_PX = 104;                      /* one lane, in map units */

    function smoothstepL(e0, e1, x) {
      if (e1 === e0) return x < e0 ? 0 : 1;
      var t = clamp((x - e0) / (e1 - e0), 0, 1);
      return t * t * (3 - 2 * t);
    }

    /* Two slow sines per strand, so no two lines wander the same way — and
       these are the canvas trail's own numbers, not larger ones. A map is a
       bigger sheet than a screen and it is tempting to let the lines wander
       further across it; that is exactly what made the braid hard to follow.
       The wander stays small and the distance between lanes does the work. */
    function wobble(t, lane) {
      return Math.sin(t * 1.45 + lane.phase) * 0.058
           + Math.sin(t * 0.62 + lane.phase * 2.3) * 0.036;
    }

    function laneOffset(lane, t, depth) {
      if (!lane) return 0;
      depth = depth || 0;
      if (depth > 8) return 0;
      var base = lane.base ? laneOffset(laneById[lane.base], t, depth + 1) : 0;
      var own = base + lane.side * laneW + wobble(t, lane);
      if (lane.startKind === 'born') {
        var br = smoothstepL(lane.from, lane.from + BRANCH_W, t);
        if (br < 1) own = lerp(base, own, br);
      }
      if (lane.endKind === 'joins') {
        var target = laneById[lane.joinTarget];
        if (target) {
          /* A line gives up its own position for the one it joins, exactly —
             the same interpolation the canvas trail makes, wobble included,
             so the confluence is exact by construction and there is no seam
             to line up. Two trails become one. */
          var jn = smoothstepL(lane.to - MERGE_W, lane.to, t);
          if (jn > 0) own = lerp(own, laneOffset(target, t, depth + 1), jn);
        }
      }
      return own;
    }

    function laneAt(lane, t) {
      var p = onSpine(uOf(t));
      var off = laneOffset(lane, t) * LANE_PX;
      return { x: p.x + p.nx * off, y: p.y + p.ny * off };
    }

    function buildBraid() {
      buildSpine();
      lanePaths = lanes.map(function (lane) {
        var step = Math.max(0.02, (axis.end - axis.start) / 700);
        var pts = [];
        for (var t = lane.from; t <= lane.to + 1e-6; t += step) pts.push(laneAt(lane, t));
        pts.push(laneAt(lane, lane.to));
        return { lane: lane, pts: pts };
      });

      /* The joints: where a life starts and where two lines become one. They
         are structure rather than memory, and the map writes them the way a
         trail map writes a trailhead. */
      joints = [];
      var weddings = {};
      lanes.forEach(function (lane) {
        if (lane.startKind === 'born' || lane.startKind === 'begins') {
          var p = laneAt(lane, lane.from + 0.12);
          joints.push({
            kind: 'birth', id: 'b-' + lane.id, tone: lane.tone,
            strand: lane.id, who: lane.label,
            text: lane.label + (lane.startsAt === null ? '' : ' · ' + lane.startsAt),
            x: p.x, y: p.y
          });
        }
        if (lane.endKind === 'joins' && lane.joinTarget) {
          var key = lane.joinTarget + '@' + lane.to.toFixed(2);
          if (weddings[key]) { weddings[key].who.push(lane.label); return; }
          weddings[key] = { lane: lane, who: [lane.label] };
        }
      });
      Object.keys(weddings).forEach(function (k) {
        var w = weddings[k];
        var target = laneById[w.lane.joinTarget];
        if (!target) return;
        var p = laneAt(target, w.lane.to);
        joints.push({
          kind: 'union', id: 'u-' + w.lane.joinTarget, tone: target.tone,
          text: marriedWord + (w.lane.endsAt === null ? '' : ' · ' + w.lane.endsAt),
          x: p.x, y: p.y
        });
      });
    }

    function lanePathFor(id) {
      for (var i = 0; i < lanePaths.length; i++) {
        if (lanePaths[i].lane.id === id) return lanePaths[i];
      }
      return null;
    }

    /* ============================================================ CAMERA */
    function project(mx, my) {
      return { x: (mx - cam.x) * cam.z + vw / 2, y: (my - cam.y) * cam.z + vh / 2 };
    }
    function unproject(sx, sy) {
      return { x: (sx - vw / 2) / cam.z + cam.x, y: (sy - vh / 2) / cam.z + cam.y };
    }

    /* The country cannot be dragged off the screen: the camera is held so
       that the sheet always covers the view once it is bigger than it, and
       stays centred while it is smaller. */
    function clampCam() {
      cam.z = clamp(cam.z, zMin, zMax);
      var padX = MAP.w * 0.08, padY = MAP.h * 0.08;

      var halfW = vw / (2 * cam.z);
      if (halfW * 2 > MAP.w + padX * 2) cam.x = MAP.w / 2;
      else cam.x = clamp(cam.x, halfW - padX, MAP.w - halfW + padX);

      /* Vertically the country is held inside the strip of screen the room
         has actually left, not inside the whole window. With a memory open
         the strip can be a fifth of the height, and clamping to the window
         would drag the map back down under the sheet every time. */
      var b = band();
      var bandH = Math.max(80, b.bottom - b.top);
      var shift = ((b.top + b.bottom) / 2 - vh / 2) / cam.z;
      var look = cam.y + shift;                 /* what sits in the strip */
      var halfH = bandH / (2 * cam.z);
      if (halfH * 2 > MAP.h + padY * 2) look = MAP.h / 2;
      else look = clamp(look, halfH - padY, MAP.h - halfH + padY);
      cam.y = look - shift;
    }

    function tweenTo(x, y, z, ms) {
      if (ms === 0 || reduceMotion) {
        cam.x = x; cam.y = y; cam.z = z;
        camTo = null; camT = 1;
        clampCam(); drawWanted = true; wake();
        return;
      }
      camFrom = { x: cam.x, y: cam.y, z: cam.z };
      camTo = { x: x, y: y, z: z };
      camT = 0; camStart = now(); camDur = ms || 900;
      wake();
    }

    function stepCam() {
      if (camT >= 1 || !camTo) return;
      var k = clamp((now() - camStart) / camDur, 0, 1);
      var e = easeInOutCubic(k);
      cam.x = lerp(camFrom.x, camTo.x, e);
      cam.y = lerp(camFrom.y, camTo.y, e);
      cam.z = lerp(camFrom.z, camTo.z, e);
      camT = k;
      clampCam();
      if (k >= 1) camTo = null;
      drawWanted = true;
    }

    /* The strip of screen an open panel has left. A waypoint is centred in
       that, never underneath the sheet that is covering half the map. */
    function band() { return { top: inset.top, bottom: vh - inset.bottom }; }

    /* Where a first look should land. On a wide screen the whole country
       fits and that is the best possible opening image. On a phone held
       upright it does not: fitting would print the map as a band across the
       middle with dead paper above and below, so the map opens partway in,
       over the middle of the route, and a double tap takes the visitor out
       to the whole thing whenever they want it. */
    function openingView() {
      if (vh / vw < 1.15) { fitAll(0); return; }
      var cx = MAP.w / 2, cy = MAP.h / 2;
      if (waypoints.length) {
        var sx = 0, sy = 0;
        waypoints.forEach(function (w) { sx += w.x; sy += w.y; });
        cx = sx / waypoints.length; cy = sy / waypoints.length;
      }
      goTo(cx, cy, lerp(zFit, zCover, 0.62), 0);
    }

    function fitAll(ms) {
      var b = band();
      var usableH = Math.max(120, b.bottom - b.top);
      var z = Math.min(vw / (MAP.w * 1.04), usableH / (MAP.h * 1.04));
      var cy = MAP.h / 2 - ((b.top + b.bottom) / 2 - vh / 2) / z;
      tweenTo(MAP.w / 2, cy, z, ms);
    }

    function goTo(mx, my, z, ms) {
      var b = band();
      var cy = my - ((b.top + b.bottom) / 2 - vh / 2) / z;
      tweenTo(mx, cy, z, ms);
    }

    /* ============================================================ LAYOUT */
    function layout() {
      var r = host.getBoundingClientRect();
      vw = Math.max(1, Math.round(r.width));
      vh = Math.max(1, Math.round(r.height));
      dpr = clamp(global.devicePixelRatio || 1, 1, quality < 0.65 ? 1.5 : 2);
      canvas.style.width = vw + 'px';
      canvas.style.height = vh + 'px';
      canvas.width = Math.round(vw * dpr);
      canvas.height = Math.round(vh * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      zFit = Math.min(vw / (MAP.w * 1.04), vh / (MAP.h * 1.04));
      /* what it takes to fill the screen rather than fit inside it — which
         on a phone held upright is a very different number, because the
         country is landscape and the phone is not */
      zCover = Math.max(vw / MAP.w, vh / MAP.h);
      zMin = zFit * 0.85;
      zMax = Math.max(zCover * 3.4, 2.6);

      if (!sheet) paintSheet();
      clampCam();
      drawWanted = true;
    }

    /* ====================================================== THE PAINTED MAP
       Everything that never moves, painted once at map resolution. On a slow
       device the sheet is smaller and the paint is thinner; it is the same
       picture, printed on cheaper paper. */
    function paintSheet() {
      sheetScale = quality > 0.85 ? 1.6 : (quality > 0.6 ? 1.25 : 0.95);
      var c = document.createElement('canvas');
      c.width = Math.round(MAP.w * sheetScale);
      c.height = Math.round(MAP.h * sheetScale);
      var g = c.getContext('2d');
      g.setTransform(sheetScale, 0, 0, sheetScale, 0, 0);
      g.lineJoin = 'round';
      g.lineCap = 'round';

      paintPaper(g);
      paintSea(g);
      paintSwell(g);
      paintLand(g);

      /* Chapters, rivers, terrain and woods all belong to the land, so they
         are painted inside its outline. Without this a chapter's wash runs
         out past its own coast and the island stops reading as one. */
      g.save();
      tracePath(g, coast(), true);
      g.clip();
      REGIONS.forEach(function (R) { paintRegion(g, R); });
      paintRivers(g);
      REGIONS.forEach(function (R) { paintTerrain(g, R); });
      g.restore();

      /* The isles are offshore, so they bring their own water and are not */
      FEATURES.forEach(function (F) {
        if (F.water) wash(g, F.water, PIG.sea, 0.55, F.id + 'water', true);
        paintRegion(g, F);
        paintTerrain(g, F);
      });

      paintCountry(g);
      paintForest(g);
      paintCoastInk(g);
      paintNorth(g);
      paintBraid(g);
      paintEdgeOfSurvey(g);
      paintGrain(g);
      sheet = c;
    }

    function paintPaper(g) {
      g.fillStyle = PIG.paper;
      g.fillRect(0, 0, MAP.w, MAP.h);
      /* Sunlight across the sheet, so the lit waypoints have something to be
         lit against. Paper is never one flat colour. */
      var s = g.createRadialGradient(MAP.w * 0.42, MAP.h * 0.36, 0,
                                     MAP.w * 0.42, MAP.h * 0.36, MAP.w * 0.78);
      s.addColorStop(0, 'rgba(255,252,240,0.85)');
      s.addColorStop(0.55, 'rgba(246,238,220,0.25)');
      s.addColorStop(1, 'rgba(214,198,166,0.42)');
      g.fillStyle = s;
      g.fillRect(0, 0, MAP.w, MAP.h);
    }

    /* A wash is three passes of thin colour that do not quite line up, plus
       the darker rim a brush leaves where the water dries last. */
    function wash(g, pts, colour, alpha, seed, rim) {
      var r = rng(seed);
      for (var pass = 0; pass < 3; pass++) {
        var off = pass === 0 ? 0 : (r() - 0.5) * 9;
        var k = pass === 0 ? 1 : 1 + (r() - 0.5) * 0.045;
        g.save();
        g.translate(off, (r() - 0.5) * 9);
        var cx = pts.reduce(function (a, p) { return a + p.x; }, 0) / pts.length;
        var cy = pts.reduce(function (a, p) { return a + p.y; }, 0) / pts.length;
        g.translate(cx, cy); g.scale(k, k); g.translate(-cx, -cy);
        tracePath(g, pts, true);
        g.globalAlpha = alpha * (pass === 0 ? 0.72 : 0.3);
        g.fillStyle = colour;
        g.fill();
        g.restore();
      }
      /* The rim a brush leaves where the water dries last. Coastlines want
         it; a region does not — on a region it draws the very ellipse the
         shape is trying not to look like. */
      if (rim === false) { g.globalAlpha = 1; return; }
      g.save();
      tracePath(g, pts, true);
      g.clip();
      tracePath(g, pts, true);
      g.globalAlpha = alpha * 0.55;
      g.strokeStyle = colour;
      g.lineWidth = 14;
      g.stroke();
      g.restore();
      g.globalAlpha = 1;
    }

    /* Open water, everywhere the country is not. An island, because a life
       has edges on every side of it. */
    function paintSea(g) {
      var pts = [{ x: -40, y: -40 }, { x: MAP.w + 40, y: -40 },
                 { x: MAP.w + 40, y: MAP.h + 40 }, { x: -40, y: MAP.h + 40 }];
      /* Punch the island out of the water rather than painting the water
         under it — otherwise every green on the map is a green mixed with
         blue, and the land goes cold. */
      g.save();
      g.beginPath();
      g.rect(-40, -40, MAP.w + 80, MAP.h + 80);
      var land = coast();
      g.moveTo(land[0].x, land[0].y);
      for (var i = 1; i < land.length; i++) g.lineTo(land[i].x, land[i].y);
      g.closePath();
      g.clip('evenodd');
      wash(g, pts, PIG.sea, 0.62, 'sea-a', false);
      wash(g, pts, PIG.seaDeep, 0.16, 'sea-b', false);

      /* Open water and nothing else. The cartographer's wave ticks used to
         run across it, and at a fitted zoom they collected along the coast
         and read as a scribbled border round the land rather than as sea —
         the one thing on the paper that looked drawn on rather than
         painted. Two washes hold the water on their own. */
      g.restore();
      g.globalAlpha = 1;
    }

    /* The swell. Not the cartographer's wave ticks that used to be here —
       those were short scratchy strokes scattered at random, and at a fitted
       zoom enough of them collected along the shore to read as a scribbled
       border. This is the same idea drawn the other way round: four bands
       following the coast at increasing distance, each fainter than the
       last, the way water actually stacks up against a shore. Offsetting
       outward is the safe direction — a curve offset away from itself
       cannot fold — so these need none of the care the coastline does. */
    function offsetPoly(pts, d) {
      var n = pts.length, out = [], i;
      for (i = 0; i < n; i++) {
        var a = pts[(i - 1 + n) % n], b = pts[(i + 1) % n];
        var tx = b.x - a.x, ty = b.y - a.y;
        var tl = Math.sqrt(tx * tx + ty * ty) || 1;
        /* the coast is wound so that this normal points out to sea */
        out.push({ x: pts[i].x + (ty / tl) * d, y: pts[i].y - (tx / tl) * d });
      }
      return out;
    }

    function paintSwell(g) {
      var land = coast();
      /* which way is out: push one point and see whether it left the land */
      var probe = offsetPoly(land, 12);
      var sign = inside(land, probe[0].x, probe[0].y) ? -1 : 1;
      g.save();
      g.strokeStyle = PIG.seaDeep;
      g.lineJoin = 'round';
      [[26, 0.13, 2.4], [58, 0.1, 2], [96, 0.075, 1.7], [142, 0.05, 1.5]]
        .forEach(function (band, i) {
          var ring = offsetPoly(land, band[0] * sign);
          g.globalAlpha = band[1];
          g.lineWidth = band[2];
          tracePath(g, ring, true);
          g.stroke();
        });
      g.globalAlpha = 1;
      g.restore();
    }

    /* North, on the paper rather than on the glass. A scale bar has to live
       on the glass — one that zooms with the map stops being a scale bar —
       but north does not change with the zoom, so it belongs on the sheet,
       where a phone can see it too. */
    function paintNorth(g) {
      var x = 232, y = 168, r = 34;
      g.save();
      g.translate(x, y);
      g.globalAlpha = 0.42;
      g.strokeStyle = PIG.ink;
      g.lineWidth = 1.1;
      g.beginPath(); g.arc(0, 0, r, 0, TAU); g.stroke();
      g.globalAlpha = 0.16;
      g.beginPath(); g.arc(0, 0, r - 4, 0, TAU); g.stroke();

      /* the needle: half of it inked, half of it left as paper, which is how
         a drawn compass says which end is north without a legend */
      g.globalAlpha = 0.7;
      g.beginPath();
      g.moveTo(0, -r + 5); g.lineTo(r * 0.2, 0); g.lineTo(0, r * 0.3);
      g.closePath();
      g.fillStyle = PIG.ink;
      g.fill();
      g.beginPath();
      g.moveTo(0, -r + 5); g.lineTo(-r * 0.2, 0); g.lineTo(0, r * 0.3);
      g.closePath();
      g.fillStyle = 'rgba(250,245,232,0.92)';
      g.fill();
      g.globalAlpha = 0.5;
      g.strokeStyle = PIG.ink;
      g.lineWidth = 0.9;
      g.stroke();

      /* the three quiet quarters */
      g.globalAlpha = 0.28;
      g.fillStyle = PIG.ink;
      for (var q = 1; q < 4; q++) {
        g.save(); g.rotate(q * Math.PI / 2);
        g.beginPath();
        g.moveTo(0, -r + 9); g.lineTo(r * 0.09, 0); g.lineTo(-r * 0.09, 0);
        g.closePath(); g.fill();
        g.restore();
      }

      g.globalAlpha = 0.62;
      g.fillStyle = PIG.ink;
      g.font = '600 13px Georgia, "Iowan Old Style", serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText('N', 0, -r - 9);
      g.globalAlpha = 1;
      g.restore();
    }

    /* The mainland. One irregular mass, deliberately unfinished at the
       south-west, where the paint gives out and the country carries on. */
    /* The country is an island, and its shape is the braid's: the coast is
       the spine walked at arm's length either side, tapering to a point at
       each end. A hand-drawn outline kept having to be re-drawn every time
       the family's layout moved; this one cannot fall out of step with it. */
    var coastPts = null;
    function coast() {
      if (coastPts) return coastPts;
      var n = 120, ts = [], ws = [], up = [], down = [], i;

      /* How far the land reaches at each step, worked out first and on its
         own. `spanAt` answers with the widest chapter that reaches a moment,
         which is a step function: at a chapter boundary the width jumps by
         up to seventy pixels between one sample and the next. An offset
         curve loops wherever its width changes faster than the curve
         travels, so twenty passes of a three-tap average turn those cliffs
         into slopes before anything is offset. (The scribbled shore this
         replaced had a second and larger cause — see `onSpine`.) */
      for (i = 0; i <= n; i++) {
        ts.push(lerp(axis.start - 1.6, axis.end + 1.6, i / n));
        ws.push(spanAt(ts[i]));
      }
      for (var pass = 0; pass < 20; pass++) {
        var next = ws.slice();
        for (i = 1; i < n; i++) next[i] = (ws[i - 1] + ws[i] * 2 + ws[i + 1]) * 0.25;
        ws = next;
      }

      for (i = 0; i <= n; i++) {
        /* both ends taper, so the island has a nose */
        var k = i / n;
        var taper = Math.pow(Math.sin(clamp(k, 0, 1) * Math.PI), 0.42);
        /* close enough that the country reads as the ground the braid
           crosses, rather than a continent with the family in a stripe */
        var sp = onSpine(uOf(ts[i]));
        /* Whatever the chapters ask for, the shore takes only the room the
           paper actually has at this point — measured against the spine
           where it is, not against a number decided once. A coast that runs
           out of paper gets clamped, and a clamped coast is a ruled line.

           And never wider than the spine's own turn. An offset curve folds
           wherever the curve it is offset from turns tighter than the
           offset is wide; this spine bends at a radius of about five
           hundred pixels at its sharpest, so a shore held inside two
           thirds of that cannot cross itself on the inside of a bend. */
        var room = Math.min(sp.y, MAP.h - sp.y) - 62;
        var w = Math.min(ws[i] * taper + 26, room, COAST_MAX);
        up.push({ x: sp.x + sp.nx * w, y: sp.y + sp.ny * w });
        down.push({ x: sp.x - sp.nx * w, y: sp.y - sp.ny * w });
      }
      down.reverse();
      /* And a light hand with the roughening: five pixels of wander over a
         hundred-pixel wave is a coastline, eleven over nine points was a
         saw. Checked rather than hoped — at these numbers the closed
         outline has no self-intersections anywhere. */
      coastPts = waver(spline(up.concat(down), 5), 5, 'coast');
      return coastPts;
    }

    /* How far the land reaches at a given moment: far enough to hold the
       widest chapter and any offshore piece of ground near it, and never
       so far that the shore runs into the edge of the paper — a coast that
       hits the clamp goes flat, and a flat run of shore is the one shape
       that cannot be mistaken for a coastline. */
    var COAST_MAX = 336;
    function spanAt(t) {
      var w = 150 * 1.28;
      REGIONS.forEach(function (R) {
        if (R.t0 === undefined) return;
        var pad = 1.2;
        if (t < R.t0 - pad || t > R.t1 + pad) return;
        w = Math.max(w, R.span * 1.28);
      });
      FEATURES.forEach(function (F) {
        if (F.tAt === undefined) return;
        if (Math.abs(t - F.tAt) > 1.6) return;
        /* a feature already carries its own extent, so it is reached, not
           multiplied — the normal here is very nearly vertical, which makes
           `ry` the half-height that has to fit inside the shore */
        w = Math.max(w, Math.abs(F.out) + F.ry * 1.1 + 26);
      });
      return w;
    }

    function paintLand(g) {
      var pts = coast();
      g.save();
      tracePath(g, pts, true);
      g.clip();
      wash(g, pts, PIG.land, 0.68, 'land-a', false);
      wash(g, pts, '#B9CE95', 0.24, 'land-b', false);
      g.restore();
    }

    /* The unpainted corner. Not a hole — the wash simply thins out and stops,
       the way a map does where the survey ran out. Laid over everything,
       route included, so the whole country fades together. */
    function paintEdgeOfSurvey(g) {
      g.save();
      /* Wherever the trail ends up running out, rather than a corner chosen
         by hand — so the paint gives out at the end of the record however
         the country is laid out. */
      var end = onSpine(1.04);
      var grad = g.createRadialGradient(end.x, end.y, 24, end.x, end.y, 320);
      grad.addColorStop(0, 'rgba(244,237,220,0.97)');
      grad.addColorStop(0.5, 'rgba(244,237,220,0.72)');
      grad.addColorStop(1, 'rgba(244,237,220,0)');
      g.fillStyle = grad;
      g.fillRect(end.x - 340, end.y - 340, 680, 680);
      g.restore();
    }

    function paintCoastInk(g) {
      var pts = coast();
      g.save();
      /* a pale strand just inside the line, which is what makes a coast read
         as a shore rather than as a cut edge */
      g.globalAlpha = 0.5;
      g.strokeStyle = '#EFE3C4';
      g.lineWidth = 7;
      tracePath(g, pts, true);
      g.stroke();
      g.globalAlpha = 0.36;
      g.strokeStyle = PIG.ink;
      g.lineWidth = 1.4;
      g.stroke();
      g.restore();
      g.globalAlpha = 1;
    }

    /* Chapters get their outline from the spine in buildRegions; features
       are small enough to be a blob of their own. */
    function regionShape(R) {
      if (R.shape) return R.shape;
      R.shape = waver(spline(ring(R.x || 0, R.y || 0, R.rx || 120, R.ry || 90,
                                  13, 0.42, R.id), 8), 8, R.id + 'w');
      return R.shape;
    }

    function paintRegion(g, R) {
      var pts = regionShape(R);
      wash(g, pts, R.wash, R.island ? 0.72 : 0.44, R.id + 'wash', !!R.island);
    }

    function paintRivers(g) {
      /* One river out of the hills, through the veld, over the falls. The
         country needs a reason for its towns to be where they are. */
      var r1 = waver(spline([
        { x: 1215, y: 250 }, { x: 1120, y: 350 }, { x: 1000, y: 400 },
        { x: 900, y: 470 }, { x: 860, y: 610 }, { x: 828, y: 742 }, { x: 796, y: 862 }
      ], 14), 4, 'river1');
      var r2 = waver(spline([
        { x: 400, y: 330 }, { x: 520, y: 420 }, { x: 640, y: 470 }, { x: 760, y: 500 }
      ], 12), 4, 'river2');
      [r1, r2].forEach(function (pts, i) {
        g.save();
        g.globalAlpha = 0.75;
        g.strokeStyle = PIG.river;
        g.lineWidth = i ? 3.2 : 5;
        tracePath(g, pts, false);
        g.stroke();
        g.globalAlpha = 0.3;
        g.lineWidth = i ? 7 : 11;
        g.stroke();
        g.restore();
      });
      /* a lake in the hills */
      var lake = waver(spline(ring(1272, 232, 52, 33, 9, 0.2, 'lake'), 8), 3, 'lakew');
      wash(g, lake, PIG.river, 0.9, 'lakewash');
    }

    /* ------------------------------------------------------------ terrain
       Hand-drawn map furniture: chevrons for peaks, bumps for hills, stipple
       for bush, dashes for prairie. Drawn inside the region's own outline so
       the texture never spills into the next era. */
    function paintTerrain(g, R) {
      var pts = regionShape(R);
      var r = rng(R.id + 'terrain');
      /* A chapter's texture is scattered over the box its outline occupies,
         then clipped to that outline — which is what lets a shape derived
         from the spine carry the same glyphs a hand-drawn blob would. */
      var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      pts.forEach(function (p) {
        if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y;
      });
      R.x = (minX + maxX) / 2; R.y = (minY + maxY) / 2;
      R.rx = Math.max(40, (maxX - minX) / 2); R.ry = Math.max(40, (maxY - minY) / 2);
      var area = clamp((R.rx * R.ry) / (240 * 190), 0.35, 3.2);
      g.save();
      tracePath(g, pts, true);
      g.clip();
      g.lineCap = 'round';
      g.lineJoin = 'round';

      var n, i, x, y, s;
      if (R.terrain === 'peak' || R.terrain === 'hill') {
        var big = R.terrain === 'peak';
        n = Math.round((big ? 64 : 30) * area * (0.7 + quality * 0.4));
        /* Back rows sit higher and paler: the range recedes. */
        for (i = 0; i < n; i++) {
          x = R.x + (r() - 0.5) * R.rx * 1.9;
          y = R.y + (r() - 0.5) * R.ry * 1.85;
          var depth = clamp((y - (R.y - R.ry)) / (R.ry * 2), 0, 1);
          s = (big ? 26 : 15) * (0.55 + depth * 0.9) * (0.7 + r() * 0.6);
          g.globalAlpha = 0.2 + depth * 0.42;
          g.strokeStyle = big ? PIG.ink : PIG.forestDeep;
          g.lineWidth = 1.2 + depth * 0.9;
          g.beginPath();
          g.moveTo(x - s, y + s * 0.52);
          g.lineTo(x - s * 0.18, y - s * 0.62);
          g.lineTo(x + s * 0.42, y + s * 0.1);
          g.lineTo(x + s * 0.72, y - s * 0.26);
          g.lineTo(x + s * 1.25, y + s * 0.52);
          g.stroke();
          /* a shaded flank, which is what makes a chevron read as rock */
          if (big && r() > 0.45) {
            g.globalAlpha = 0.13 + depth * 0.16;
            g.fillStyle = PIG.ink;
            g.beginPath();
            g.moveTo(x - s * 0.18, y - s * 0.62);
            g.lineTo(x + s * 0.42, y + s * 0.1);
            g.lineTo(x - s * 0.02, y + s * 0.52);
            g.closePath();
            g.fill();
          }
          /* snow on the tallest, which is how a reader knows it is high */
          if (big && s > 30) {
            g.globalAlpha = 0.5;
            g.strokeStyle = PIG.rockHigh;
            g.lineWidth = 2.4;
            g.beginPath();
            g.moveTo(x - s * 0.42, y - s * 0.18);
            g.lineTo(x - s * 0.18, y - s * 0.62);
            g.lineTo(x + s * 0.08, y - s * 0.24);
            g.stroke();
          }
        }
      } else if (R.terrain === 'bush') {
        n = Math.round(230 * area * (0.6 + quality * 0.5));
        for (i = 0; i < n; i++) {
          x = R.x + (r() - 0.5) * R.rx * 1.95;
          y = R.y + (r() - 0.5) * R.ry * 1.95;
          g.globalAlpha = 0.16 + r() * 0.3;
          g.fillStyle = r() > 0.35 ? PIG.forest : PIG.hide;
          s = 1.8 + r() * 3.4;
          g.beginPath();
          g.ellipse(x, y, s, s * 0.8, r() * 3, 0, TAU);
          g.fill();
        }
        /* the flat-topped trees the veld is actually made of */
        n = Math.round(40 * area * (0.6 + quality * 0.6));
        for (i = 0; i < n; i++) {
          x = R.x + (r() - 0.5) * R.rx * 1.8;
          y = R.y + (r() - 0.5) * R.ry * 1.8;
          s = 7 + r() * 6;
          g.globalAlpha = 0.5;
          g.strokeStyle = PIG.forestDeep;
          g.lineWidth = 1.1;
          g.beginPath(); g.moveTo(x, y); g.lineTo(x, y - s * 0.9); g.stroke();
          g.globalAlpha = 0.38;
          g.fillStyle = PIG.forest;
          g.beginPath();
          g.ellipse(x, y - s, s * 1.15, s * 0.42, 0, 0, TAU);
          g.fill();
        }
      } else if (R.terrain === 'prairie' || R.terrain === 'plain' || R.terrain === 'soft') {
        n = Math.round(270 * area * (0.6 + quality * 0.5));
        for (i = 0; i < n; i++) {
          x = R.x + (r() - 0.5) * R.rx * 1.95;
          y = R.y + (r() - 0.5) * R.ry * 1.95;
          g.globalAlpha = 0.14 + r() * 0.2;
          g.strokeStyle = R.terrain === 'plain' ? PIG.hide : PIG.forest;
          g.lineWidth = 1.1;
          var w = 5 + r() * 11;
          g.beginPath(); g.moveTo(x, y); g.lineTo(x + w, y - (r() - 0.5) * 3); g.stroke();
        }
      } else if (R.terrain === 'coast') {
        /* The years of leaving: flat country on one bank of the line and
           open water on the other, with the strait between them. */
        n = Math.round(150 * area * (0.6 + quality * 0.5));
        for (i = 0; i < n; i++) {
          x = R.x + (r() - 0.5) * R.rx * 1.95;
          y = R.y + (r() - 0.5) * R.ry * 1.95;
          g.globalAlpha = 0.13 + r() * 0.18;
          g.strokeStyle = PIG.forest;
          g.lineWidth = 1.1;
          g.beginPath(); g.moveTo(x, y); g.lineTo(x + 5 + r() * 10, y - (r() - 0.5) * 3); g.stroke();
        }
        g.globalAlpha = 0.28;
        g.strokeStyle = PIG.seaDeep;
        g.lineWidth = 1.5;
        for (i = 0; i < 26; i++) {
          x = R.x + (r() - 0.5) * R.rx * 1.7;
          y = R.y + (r() - 0.5) * R.ry * 1.7;
          var ww = 26 + r() * 60;
          g.beginPath();
          g.moveTo(x, y);
          g.bezierCurveTo(x + ww * 0.3, y - 4, x + ww * 0.7, y + 4, x + ww, y);
          g.stroke();
        }
      } else if (R.terrain === 'isle') {
        /* a volcanic cone and some palms, which is the whole of an island */
        g.globalAlpha = 0.4;
        g.strokeStyle = PIG.ink;
        g.lineWidth = 1.6;
        g.beginPath();
        g.moveTo(R.x - 52, R.y + 26);
        g.lineTo(R.x - 8, R.y - 44);
        g.lineTo(R.x + 44, R.y + 26);
        g.stroke();
        g.globalAlpha = 0.18;
        g.fillStyle = PIG.ink;
        g.beginPath();
        g.moveTo(R.x - 8, R.y - 44); g.lineTo(R.x + 44, R.y + 26);
        g.lineTo(R.x + 6, R.y + 26); g.closePath(); g.fill();
        n = 14;
        for (i = 0; i < n; i++) {
          x = R.x + (r() - 0.5) * R.rx * 1.7;
          y = R.y + 30 + r() * 50;
          g.globalAlpha = 0.5;
          g.strokeStyle = PIG.forestDeep;
          g.lineWidth = 1.1;
          g.beginPath(); g.moveTo(x, y); g.lineTo(x + 2, y - 12); g.stroke();
          for (var f = 0; f < 4; f++) {
            var a = -Math.PI * 0.5 + (f - 1.5) * 0.55;
            g.beginPath();
            g.moveTo(x + 2, y - 12);
            g.quadraticCurveTo(x + 2 + Math.cos(a) * 5, y - 12 + Math.sin(a) * 5,
                               x + 2 + Math.cos(a) * 9, y - 10 + Math.sin(a) * 9);
            g.stroke();
          }
        }
      } else if (R.terrain === 'falls') {
        /* the gorge: two ink lips and the mist between them */
        g.globalAlpha = 0.42;
        g.strokeStyle = PIG.ink;
        g.lineWidth = 2;
        var lip = waver(spline([
          { x: R.x - 150, y: R.y - 20 }, { x: R.x - 40, y: R.y + 8 },
          { x: R.x + 60, y: R.y - 6 }, { x: R.x + 150, y: R.y + 20 }
        ], 10), 3, 'lip');
        tracePath(g, lip, false); g.stroke();
        g.globalAlpha = 0.55;
        g.fillStyle = '#FFFFFF';
        for (i = 0; i < 34; i++) {
          x = R.x - 140 + r() * 280;
          y = R.y + 10 + r() * 70;
          g.beginPath();
          g.ellipse(x, y, 8 + r() * 18, 4 + r() * 9, 0, 0, TAU);
          g.globalAlpha = 0.1 + r() * 0.22;
          g.fill();
        }
      }
      g.restore();
      g.globalAlpha = 1;
    }

    function paintGrain(g) {
      var t = document.createElement('canvas');
      t.width = t.height = 120;
      var tg = t.getContext('2d');
      var img = tg.createImageData(120, 120);
      var r = rng('grain');
      for (var i = 0; i < img.data.length; i += 4) {
        var v = 200 + r() * 55;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
        img.data[i + 3] = 255;
      }
      tg.putImageData(img, 0, 0);
      g.save();
      g.globalCompositeOperation = 'multiply';
      g.globalAlpha = 0.15;
      var pat = g.createPattern(t, 'repeat');
      g.fillStyle = pat;
      g.fillRect(0, 0, MAP.w, MAP.h);
      g.restore();
    }

    /* ====================================================== THE MEMORIES
       A memory sits on its own strand at its own year — the same rule the
       canvas trail follows. Nothing is placed by hand. */
    function placeWaypoints() {
      waypoints.forEach(function (w, i) {
        w.i = i;
        var lane = laneById[w.strand] || laneById[trunkId] || lanes[0];
        w.lane = lane ? lane.id : null;
        var t = clamp(w.t, axis.start, axis.end);
        var p = lane ? laneAt(lane, t) : onSpine(uOf(t));
        w.x = p.x; w.y = p.y;
      });

      /* Two memories in the same year on the same line land on one pixel.
         They fan *across* their line rather than along it — the same rule
         the canvas trail follows, because sliding them along would move
         them in time and claim a year nobody wrote down. */
      var groups = {};
      waypoints.forEach(function (w) {
        var key = w.lane + '|' + w.t.toFixed(3);
        (groups[key] || (groups[key] = [])).push(w);
      });
      Object.keys(groups).forEach(function (key) {
        var g = groups[key];
        if (g.length < 2) return;
        var lane = laneById[g[0].lane];
        var t = g[0].t;
        var eps = (axis.end - axis.start) / 400;
        var p0 = lane ? laneAt(lane, t) : onSpine(uOf(t));
        var p1 = lane ? laneAt(lane, t + eps) : onSpine(uOf(t + eps));
        var dx = p1.x - p0.x, dy = p1.y - p0.y;
        var d = Math.sqrt(dx * dx + dy * dy) || 1;
        g.forEach(function (w, k) {
          var off = (k - (g.length - 1) / 2) * 34;
          w.x = p0.x + (-dy / d) * off;
          w.y = p0.y + (dx / d) * off;
        });
      });

      /* and then nothing at all is allowed to sit on top of anything else */
      for (var pass = 0; pass < 6; pass++) {
        var moved = false;
        for (var i = 0; i < waypoints.length; i++) {
          for (var j = i + 1; j < waypoints.length; j++) {
            var A = waypoints[i], B = waypoints[j];
            var ddx = B.x - A.x, ddy = B.y - A.y;
            var dd = Math.sqrt(ddx * ddx + ddy * ddy);
            if (dd >= 34) continue;
            if (dd < 0.001) { ddx = 1; ddy = 0; dd = 1; }
            var push = (34 - dd) / 2 + 0.5;
            A.x -= ddx / dd * push; A.y -= ddy / dd * push;
            B.x += ddx / dd * push; B.y += ddy / dd * push;
            moved = true;
          }
        }
        if (!moved) break;
      }
    }

    /* ========================================================= THE REGIONS
       A chapter is a stretch of the spine, so its shape is derived from the
       spine rather than placed: sample the years it covers, walk out to
       either bank, and close the loop. The wash then follows the country
       instead of sitting on it as a circle. */
    function buildRegions() {
      REGIONS.forEach(function (R) {
        var y0 = R.from === -Infinity ? yearOfT(axis.start) - 6 : R.from;
        var y1 = R.to === Infinity ? yearOfT(axis.end) + 6 : R.to;
        var t0 = tOfYear(y0) - (R.from === -Infinity ? 1.4 : 0.45);
        var t1 = tOfYear(y1) + (R.to === Infinity ? 1.4 : 0.45);
        R.t0 = t0; R.t1 = t1;

        var n = 16, up = [], down = [], i, p, sp;
        for (i = 0; i <= n; i++) {
          var t = lerp(t0, t1, i / n);
          sp = onSpine(uOf(t));
          /* the banks bulge in the middle of a chapter and pinch at its ends,
             so consecutive chapters run into one another rather than butting */
          var k = Math.sin((i / n) * Math.PI);
          var w = R.span * (0.42 + k * 0.72);
          up.push({ x: sp.x + sp.nx * w, y: sp.y + sp.ny * w });
          down.push({ x: sp.x - sp.nx * w, y: sp.y - sp.ny * w });
        }
        down.reverse();
        R.mid = onSpine(uOf((t0 + t1) / 2));
        R.shape = waver(spline(up.concat(down), 5), 9, R.id + 'shape');
      });

      FEATURES.forEach(function (F) {
        F.tAt = tOfYear(F.at);
        var sp = onSpine(uOf(F.tAt));
        /* `side` means uphill or seaward, not left or right: which way the
           spine's normal happens to point at that moment is an accident of
           where the wave is, so it is resolved against the page here. */
        var flip = F.side * (sp.ny > 0 ? 1 : -1);
        F.x = sp.x + sp.nx * F.out * flip;
        F.y = sp.y + sp.ny * F.out * flip;
        F.shape = waver(spline(ring(F.x, F.y, F.rx, F.ry, 13, 0.42, F.id), 8), 8, F.id + 'w');
        /* An island needs water around it, and the open sea is a long way
           east of where the crossing falls — so it brings its own. */
        if (F.island) {
          F.water = waver(spline(ring(F.x, F.y, F.rx * 1.58, F.ry * 1.62, 12, 0.3, F.id + 'sea'), 8),
                          10, F.id + 'sw');
        }
      });
    }

    /* the controller's axis, read backwards — only used to size a chapter */
    var yearAnchors = [];
    function tOfYear(y) {
      if (!yearAnchors.length) return axis.start;
      if (y <= yearAnchors[0].year) return yearAnchors[0].t;
      var last = yearAnchors[yearAnchors.length - 1];
      if (y >= last.year) return last.t;
      for (var i = 1; i < yearAnchors.length; i++) {
        var A = yearAnchors[i - 1], B = yearAnchors[i];
        if (y <= B.year) {
          var span = B.year - A.year;
          return span ? A.t + (B.t - A.t) * ((y - A.year) / span) : A.t;
        }
      }
      return last.t;
    }
    function yearOfT(t) {
      if (!yearAnchors.length) return 2000;
      if (t <= yearAnchors[0].t) return yearAnchors[0].year;
      var last = yearAnchors[yearAnchors.length - 1];
      if (t >= last.t) return last.year;
      for (var i = 1; i < yearAnchors.length; i++) {
        var A = yearAnchors[i - 1], B = yearAnchors[i];
        if (t <= B.t) {
          var span = B.t - A.t;
          return span ? A.year + (B.year - A.year) * ((t - A.t) / span) : A.year;
        }
      }
      return last.year;
    }

    /* ============================================================ THE INK
       Every life gets its own line, in its own colour, knocked out of the
       terrain by a pale casing the way a printed route is. The trunk — the
       line two people became — is drawn heaviest, because it is the one
       carrying everybody. */
    function paintBraid(g) {
      if (!lanePaths.length) return;
      g.save();
      g.lineJoin = 'round';
      g.lineCap = 'round';

      /* The casing goes down for every strand before any strand is inked, so
         no line is knocked out of another where they cross. Two things about
         it were wrong, and between them they are the breaks people saw
         wherever the trails divide and come together.

         It compounded. Nine translucent casings stroked one after another
         onto the paper, and everywhere two or three lines ran together —
         which is precisely at a birth and at a marriage — the paper under
         them went from just-there to nearly opaque, and a fat cream ribbon
         swallowed the thin coloured cores running down the middle of it. So
         it is stroked opaque into a scratch sheet first and laid down once:
         a union, which is what a casing was always meant to be.

         And it did not fade. A line that begins mid-braid had its ink faded
         up over its first sixth and its casing drawn at full strength for
         the whole length, so that sixth was a bare pale stripe with no
         colour in it at all. The casing now fades exactly where its own
         line does. */
      var cs = document.createElement('canvas');
      cs.width = Math.round(MAP.w * sheetScale);
      cs.height = Math.round(MAP.h * sheetScale);
      var cg = cs.getContext('2d');
      cg.setTransform(sheetScale, 0, 0, sheetScale, 0, 0);
      cg.lineJoin = 'round';
      cg.lineCap = 'round';
      lanePaths.forEach(function (P) {
        if (P.pts.length < 2) return;
        rampStroke(cg, P.pts, headCut(P), PIG.paper, 9, 1);
      });
      g.globalAlpha = 0.62;
      g.drawImage(cs, 0, 0, MAP.w, MAP.h);
      g.globalAlpha = 1;

      /* Then each line: a soft bloom in its own colour and a darker core
         inside it, which is the canvas trail's structure read onto paper —
         and every strand at the same weight, because the line two people
         became is not more important than either of them. */
      lanePaths.forEach(function (P) {
        if (P.pts.length < 2) return;
        strokeStrand(g, P);
      });
      g.restore();
      g.globalAlpha = 1;
    }

    /* How much of a line's head fades in. A line that simply begins —
       somebody whose own parents are not in this archive — comes up out of
       nothing rather than switching on. */
    function headCut(P) {
      return P.lane.fadeIn ? Math.max(2, Math.round(P.pts.length * 0.16)) : 0;
    }

    /* One stroke, optionally fading up over its first `cut` points. Built
       from a gradient rather than from stacked partial strokes: three
       translucent copies of the same line, each starting a little further
       along, band where they overlap and leave two visible steps in the
       head. A gradient has no steps in it. */
    function rampStroke(g, pts, cut, colour, width, alpha) {
      var i;
      g.lineWidth = width;
      if (!cut || cut >= pts.length - 1) {
        g.globalAlpha = alpha;
        g.strokeStyle = colour;
        tracePath(g, pts, false);
        g.stroke();
        return;
      }
      var a = pts[0], b = pts[cut];
      var grad = g.createLinearGradient(a.x, a.y, b.x, b.y);
      grad.addColorStop(0, tint(colour, 0));
      grad.addColorStop(1, tint(colour, alpha));
      g.globalAlpha = 1;
      g.strokeStyle = grad;
      g.beginPath();
      g.moveTo(a.x, a.y);
      for (i = 1; i <= cut; i++) g.lineTo(pts[i].x, pts[i].y);
      g.stroke();

      g.globalAlpha = alpha;
      g.strokeStyle = colour;
      g.beginPath();
      g.moveTo(pts[cut].x, pts[cut].y);
      for (i = cut + 1; i < pts.length; i++) g.lineTo(pts[i].x, pts[i].y);
      g.stroke();
    }

    function strokeStrand(g, P) {
      /* Darker than it was. On a dark plane a thin bright line is the only
         thing on the screen; on painted paper, over woods and terrain and
         chapter washes, the same line goes to nothing. So the bloom stays
         the life's own colour and the core is drawn in a deepened version
         of it, with a hairline of ink inside that — which is what makes a
         printed route sit on top of a map rather than in it. */
      var cut = headCut(P);
      var tone = P.lane.tone;
      var passes = [[8, tone, 0.2], [3.2, tone, 1], [1.7, P.lane.deep, 0.85],
                    [0.7, PIG.trailInk, 0.4]];
      for (var k = 0; k < passes.length; k++) {
        rampStroke(g, P.pts, cut, passes[k][1], passes[k][0], passes[k][2]);
      }
    }

    /* ============================================================ SCENERY
       The part that moves. A few dozen trees that lean in the wind and a
       handful of animals, drawn as painted silhouettes rather than as
       portraits — a map illustration, not a field guide. */
    /* A country has trees everywhere, not only where the map has a name for
       the ground. These are the ones that move: seeded, culled to the view,
       and thickened wherever the chapter they stand in is wooded. */
    function buildScenery() {
      var r = rng('trees');
      trees = [];
      var want = Math.round(360 * (0.45 + quality * 0.75));
      var KIND = { peak: 'conifer', hill: 'conifer', bush: 'flat',
                   plain: 'round', prairie: 'round', coast: 'round',
                   isle: 'palm', falls: 'round', soft: 'round' };
      var pool = REGIONS.concat(FEATURES);
      /* The country between the chapters is country too. A third of the
         planting goes everywhere the island reaches, so the ground is not
         bare wherever the archive happens to have nothing to say. */
      var open = coast();
      var oMinX = Infinity, oMaxX = -Infinity, oMinY = Infinity, oMaxY = -Infinity;
      open.forEach(function (p) {
        if (p.x < oMinX) oMinX = p.x; if (p.x > oMaxX) oMaxX = p.x;
        if (p.y < oMinY) oMinY = p.y; if (p.y > oMaxY) oMaxY = p.y;
      });
      var loose = Math.round(want * 0.42);
      for (var q = 0; q < loose; q++) {
        var lx = oMinX + r() * (oMaxX - oMinX);
        var ly = oMinY + r() * (oMaxY - oMinY);
        if (!inside(open, lx, ly)) { q--; if (r() > 0.99) break; continue; }
        trees.push({
          x: lx, y: ly, s: 7 + r() * 11,
          kind: r() > 0.55 ? 'round' : 'conifer',
          col: leafOf('plain', r()),
          ph: r() * TAU, sp: 0.55 + r() * 0.8
        });
      }

      /* how much of the planting each chapter gets: bigger chapters and
         wooded ones take more of it */
      var weights = pool.map(function (R) {
        var wooded = R.terrain === 'peak' || R.terrain === 'hill' || R.terrain === 'bush';
        return (R.span || R.rx || 140) * (wooded ? 1.5 : 0.7);
      });
      var total = weights.reduce(function (a, b) { return a + b; }, 0) || 1;

      pool.forEach(function (R, ri) {
        var pts = R.shape;
        if (!pts || !pts.length) return;
        var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        pts.forEach(function (p) {
          if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x;
          if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y;
        });
        var n = Math.round(want * (weights[ri] / total));
        var kind = KIND[R.terrain] || 'round';
        var land = R.island ? null : coast();
        for (var i = 0; i < n; i++) {
          var x = minX + r() * (maxX - minX);
          var y = minY + r() * (maxY - minY);
          if (!inside(pts, x, y) || (land && !inside(land, x, y))) {
            i--; if (r() > 0.985) break; continue;
          }
          trees.push({
            x: x, y: y, s: 8 + r() * 13, kind: kind,
            col: leafOf(R.terrain, r()),
            ph: r() * TAU, sp: 0.55 + r() * 0.8
          });
        }
      });
      trees.sort(function (a, b) { return a.y - b.y; });

      /* Seven of them, each drawn about a third smaller than the three
         used to be. At the old size they were the largest things on the
         paper and the country was their backdrop; at this one they are
         wildlife you come across, which is what an animal on a map is
         for. Every one stands in the ground it belongs to. */
      fauna = [
        { kind: 'elk',    x: 0, y: 0, s: 0.86, ph: 0 },
        { kind: 'eagle',  x: 0, y: 0, s: 0.68, ph: 0 },
        { kind: 'dodo',   x: 0, y: 0, s: 0.6,  ph: 0 },
        { kind: 'heron',  x: 0, y: 0, s: 0.66, ph: 1.7 },
        { kind: 'hare',   x: 0, y: 0, s: 0.6,  ph: 0.9 },
        { kind: 'turtle', x: 0, y: 0, s: 0.66, ph: 2.4 },
        { kind: 'fish',   x: 0, y: 0, s: 0.58, ph: 0.35 }
      ];
      /* On the land: the elk over the high range, the fish eagle above the
         far water, the dodo on the island off the crossing, a hare out on
         the open plain — and a heron down at the shore, which is the only
         place to put one. */
      placeBeast('elk', REGION_BY.range, 1, 1.15);
      placeBeast('eagle', REGION_BY.water, -1, 1.3);
      placeShore('heron', REGION_BY.copper, 1);
      placeBeast('hare', REGION_BY.plain, -1, 0.72);
      var isles = FEATURES.filter(function (f) { return f.id === 'isles'; })[0];
      if (isles) { fauna[2].x = isles.x + isles.rx * 0.1; fauna[2].y = isles.y + isles.ry * 0.72; }

      /* And two in the water, which needs the opposite test: walk out from
         the spine until the coast is behind you, then keep going a little,
         so neither of them is ever beached by a change in the family's
         dates moving the shoreline. */
      placeSwimmer('turtle', REGION_BY.crossing, 1);
      placeSwimmer('fish', REGION_BY.range, -1);
    }

    /* Where a beast can stand without being in the sea, the title, or the
       room's own furniture. */
    function beastSpot(f, x, y) {
      f.x = clamp(x, 150, MAP.w - 210);
      f.y = clamp(y, 175, MAP.h - 215);
      /* the room's own view switch lives in the top right corner of the
         screen, and at a fitted zoom that is the top right of the paper */
      if (f.y < 470 && f.x > MAP.w - 540) f.x = MAP.w - 540;
    }

    function faunaBy(kind) {
      return fauna.filter(function (x) { return x.kind === kind; })[0];
    }

    function placeBeast(kind, R, side, out) {
      var f = faunaBy(kind);
      if (!f || !R) return;
      var sp = onSpine(uOf((R.t0 + R.t1) / 2));
      beastSpot(f, sp.x + sp.nx * (R.span || 200) * out * side,
                   sp.y + sp.ny * (R.span || 200) * out * side);
    }

    /* At the water's edge: out to the coast, then a step back onto the sand.
       Worked out from the shore rather than from a coordinate, so a change
       in the family's dates moves the heron with the beach it is standing
       on instead of leaving it in a field. */
    function placeShore(kind, R, side) {
      var f = faunaBy(kind);
      if (!f || !R) return;
      var sp = onSpine(uOf((R.t0 + R.t1) / 2));
      var land = coast(), out = 60;
      for (var i = 0; i < 60; i++) {
        if (!inside(land, sp.x + sp.nx * out * side, sp.y + sp.ny * out * side)) break;
        out += 12;
      }
      out -= 26;
      beastSpot(f, sp.x + sp.nx * out * side, sp.y + sp.ny * out * side);
    }

    function placeSwimmer(kind, R, side) {
      var f = faunaBy(kind);
      if (!f || !R) return;
      var sp = onSpine(uOf((R.t0 + R.t1) / 2));
      var land = coast();
      var out = (R.span || 200) * 0.9;
      /* step out until the land is behind us, then a further 70 so the
         wake has open water around it rather than a shoreline */
      for (var i = 0; i < 40; i++) {
        var x = sp.x + sp.nx * out * side, y = sp.y + sp.ny * out * side;
        if (!inside(land, x, y)) break;
        out += 22;
      }
      out += 70;
      f.x = clamp(sp.x + sp.nx * out * side, 90, MAP.w - 110);
      f.y = clamp(sp.y + sp.ny * out * side, 90, MAP.h - 110);
    }

    /* Even–odd crossing test, so a tree planted in a chapter's bounding box
       that misses the chapter itself is thrown away rather than drawn in the
       sea. */
    function inside(pts, x, y) {
      var hit = false;
      for (var i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        var a = pts[i], b = pts[j];
        if (((a.y > y) !== (b.y > y)) &&
            (x < (b.x - a.x) * (y - a.y) / ((b.y - a.y) || 1e-6) + a.x)) hit = !hit;
      }
      return hit;
    }

    /* The ground the chapters have no wash for. Six washes and a wood was
       the whole country, and at a fitted zoom it read as six coloured
       blobs with trees on. These are the things a real stretch of ground
       has that a chapter is too big to describe: standing water, a run of
       pasture, bare rock where the range is steepest, wet sand along the
       shore. All of it is quiet and none of it is saturated — a backdrop
       that competes with the braid is a backdrop that has failed, and the
       braid is the only strong colour on the sheet. */
    function paintCountry(g) {
      var r = rng('country');
      var land = coast();
      g.save();
      tracePath(g, land, true);
      g.clip();

      /* --- wet sand, just inside the shore. It reads as a beach because it
         is exactly where a beach is, not because it is drawn like one. */
      var beach = offsetPoly(land, -16 * (inside(land, offsetPoly(land, 12)[0].x,
                                                 offsetPoly(land, 12)[0].y) ? -1 : 1));
      g.globalAlpha = 0.22;
      g.strokeStyle = PIG.sand;
      g.lineWidth = 26;
      g.lineJoin = 'round';
      tracePath(g, beach, true);
      g.stroke();

      /* --- pasture. Long soft strokes lying the way the ground does, in the
         open chapters only: a wood does not need help looking busy. */
      REGIONS.forEach(function (R) {
        if (R.terrain !== 'plain' && R.terrain !== 'prairie' && R.terrain !== 'soft') return;
        var pts = R.shape;
        if (!pts || !pts.length) return;
        var bb = bounds(pts);
        g.save();
        tracePath(g, pts, true);
        g.clip();
        for (var f = 0; f < 14; f++) {
          var fx = bb.minX + r() * (bb.maxX - bb.minX);
          var fy = bb.minY + r() * (bb.maxY - bb.minY);
          var fw = 60 + r() * 130, fh = 26 + r() * 42;
          var tilt = (r() - 0.5) * 0.5;
          g.save();
          g.translate(fx, fy);
          g.rotate(tilt);
          g.globalAlpha = 0.09 + r() * 0.07;
          g.strokeStyle = PIG.marsh;
          g.lineWidth = 2.4;
          for (var row = -fh / 2; row < fh / 2; row += 7) {
            g.beginPath();
            g.moveTo(-fw / 2, row);
            g.lineTo(fw / 2 - r() * 20, row + (r() - 0.5) * 3);
            g.stroke();
          }
          g.restore();
        }
        g.restore();
      });

      /* --- scree, where the range is steepest: bare rock coming through. */
      var range = REGION_BY.range;
      if (range && range.shape) {
        var rb = bounds(range.shape);
        g.save();
        tracePath(g, range.shape, true);
        g.clip();
        for (var sc = 0; sc < 9; sc++) {
          var sx = rb.minX + r() * (rb.maxX - rb.minX);
          var sy = rb.minY + r() * (rb.maxY - rb.minY);
          var pat = waver(spline(ring(sx, sy, 34 + r() * 40, 20 + r() * 24, 9, 0.5,
                                      'scree' + sc), 6), 4, 'screew' + sc);
          wash(g, pat, PIG.scree, 0.2, 'screewash' + sc, false);
          g.globalAlpha = 0.24;
          g.fillStyle = PIG.ink;
          for (var d = 0; d < 22; d++) {
            var dx = sx + (r() - 0.5) * 70, dy = sy + (r() - 0.5) * 40;
            g.beginPath();
            g.ellipse(dx, dy, 0.9 + r() * 1.4, 0.7 + r(), r() * TAU, 0, TAU);
            g.fill();
          }
          g.globalAlpha = 1;
        }
        g.restore();
      }

      /* --- tarns. Five of them, wherever they land on the island, because
         where water sits is not something the archive has an opinion on. */
      var bb2 = bounds(land);
      var made = 0;
      for (var tries = 0; tries < 200 && made < 5; tries++) {
        var lx = bb2.minX + r() * (bb2.maxX - bb2.minX);
        var ly = bb2.minY + r() * (bb2.maxY - bb2.minY);
        if (!inside(land, lx, ly)) continue;
        /* not on top of the braid: a pond over a trail is a trail that
           looks broken */
        if (nearBraid(lx, ly, 46)) continue;
        var rx = 22 + r() * 26, ry = 14 + r() * 16;
        var pond = waver(spline(ring(lx, ly, rx, ry, 10, 0.34, 'tarn' + made), 8),
                         3, 'tarnw' + made);
        wash(g, pond, PIG.tarn, 0.62, 'tarnwash' + made, true);
        made++;
      }

      g.restore();
      g.globalAlpha = 1;
    }

    function bounds(pts) {
      var b = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity };
      pts.forEach(function (p) {
        if (p.x < b.minX) b.minX = p.x; if (p.x > b.maxX) b.maxX = p.x;
        if (p.y < b.minY) b.minY = p.y; if (p.y > b.maxY) b.maxY = p.y;
      });
      return b;
    }

    /* Is this spot on top of somebody's line? Sampled coarsely — it only has
       to keep scenery off the braid, not measure anything. */
    function nearBraid(x, y, d) {
      var dd = d * d;
      for (var i = 0; i < lanePaths.length; i++) {
        var pts = lanePaths[i].pts;
        for (var j = 0; j < pts.length; j += 3) {
          var ex = pts[j].x - x, ey = pts[j].y - y;
          if (ex * ex + ey * ey < dd) return true;
        }
      }
      return false;
    }

    /* And a great many more that do not move, printed into the sheet: the
       woods themselves, against which the moving ones read as individuals. */
    function paintForest(g) {
      var r = rng('forest');
      var pool = REGIONS.concat(FEATURES);
      var land = coast();

      /* the woods between the chapters */
      var bMinX = Infinity, bMaxX = -Infinity, bMinY = Infinity, bMaxY = -Infinity;
      land.forEach(function (p) {
        if (p.x < bMinX) bMinX = p.x; if (p.x > bMaxX) bMaxX = p.x;
        if (p.y < bMinY) bMinY = p.y; if (p.y > bMaxY) bMaxY = p.y;
      });
      g.save();
      tracePath(g, land, true);
      g.clip();
      var loose = Math.round(520 * (0.5 + quality * 0.7));
      for (var q = 0; q < loose; q++) {
        var lx = bMinX + r() * (bMaxX - bMinX);
        var ly = bMinY + r() * (bMaxY - bMinY);
        var ls = 4 + r() * 7;
        g.globalAlpha = 0.16 + r() * 0.2;
        g.fillStyle = r() > 0.5 ? PIG.forest : PIG.forestDeep;
        if (r() > 0.5) {
          g.beginPath();
          g.moveTo(lx, ly - ls);
          g.lineTo(lx + ls * 0.4, ly + ls * 0.32);
          g.lineTo(lx - ls * 0.4, ly + ls * 0.32);
          g.closePath();
          g.fill();
        } else {
          g.beginPath();
          g.ellipse(lx, ly, ls * 0.36, ls * 0.32, 0, 0, TAU);
          g.fill();
        }
      }
      g.restore();
      g.globalAlpha = 1;

      pool.forEach(function (R) {
        var pts = R.shape;
        if (!pts || !pts.length) return;
        var wooded = R.terrain === 'peak' || R.terrain === 'hill' || R.terrain === 'bush';
        var n = Math.round((wooded ? 320 : 120) * (0.5 + quality * 0.7));
        var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        pts.forEach(function (p) {
          if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x;
          if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y;
        });
        g.save();
        if (!R.island) { tracePath(g, land, true); g.clip(); }
        tracePath(g, pts, true);
        g.clip();
        for (var i = 0; i < n; i++) {
          var x = minX + r() * (maxX - minX);
          var y = minY + r() * (maxY - minY);
          var s = 5 + r() * 8;
          g.globalAlpha = 0.24 + r() * 0.28;
          if (R.terrain === 'peak' || R.terrain === 'hill') {
            g.fillStyle = r() > 0.4 ? PIG.forestDeep : PIG.forest;
            g.beginPath();
            g.moveTo(x, y - s);
            g.lineTo(x + s * 0.42, y + s * 0.35);
            g.lineTo(x - s * 0.42, y + s * 0.35);
            g.closePath();
            g.fill();
          } else if (R.terrain === 'bush') {
            g.fillStyle = PIG.forest;
            g.beginPath();
            g.ellipse(x, y, s * 0.62, s * 0.24, 0, 0, TAU);
            g.fill();
          } else {
            g.fillStyle = PIG.forest;
            g.beginPath();
            g.ellipse(x, y, s * 0.34, s * 0.3, 0, 0, TAU);
            g.fill();
          }
        }
        g.restore();
        g.globalAlpha = 1;
      });
    }

    function drawTree(g, t, time) {
      var sway = reduceMotion ? 0 : Math.sin(time * 0.0011 * t.sp + t.ph) * 0.055;
      g.save();
      g.translate(t.x, t.y);
      g.rotate(sway);
      var s = t.s;
      g.globalAlpha = 0.5;
      g.strokeStyle = PIG.hideDark;
      g.lineWidth = Math.max(0.8, s * 0.1);
      g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -s * 0.55); g.stroke();
      g.globalAlpha = 0.78;
      g.fillStyle = t.col || PIG.forest;
      if (t.kind === 'conifer') {
        for (var i = 0; i < 3; i++) {
          var y = -s * (0.5 + i * 0.28);
          var w = s * (0.46 - i * 0.1);
          g.beginPath();
          g.moveTo(0, y - s * 0.4);
          g.lineTo(w, y);
          g.lineTo(-w, y);
          g.closePath();
          g.fill();
        }
      } else if (t.kind === 'flat') {
        g.beginPath();
        g.ellipse(0, -s * 0.72, s * 0.62, s * 0.24, 0, 0, TAU);
        g.fill();
      } else if (t.kind === 'palm') {
        g.strokeStyle = t.col || PIG.forest;
        g.lineWidth = Math.max(1, s * 0.09);
        for (var f = 0; f < 5; f++) {
          var a = -Math.PI / 2 + (f - 2) * 0.52;
          g.beginPath();
          g.moveTo(0, -s * 0.55);
          g.quadraticCurveTo(Math.cos(a) * s * 0.34, -s * 0.55 + Math.sin(a) * s * 0.34,
                             Math.cos(a) * s * 0.6, -s * 0.4 + Math.sin(a) * s * 0.6);
          g.stroke();
        }
      } else {
        g.beginPath();
        g.ellipse(0, -s * 0.78, s * 0.42, s * 0.38, 0, 0, TAU);
        g.fill();
      }
      g.restore();
      g.globalAlpha = 1;
    }

    /* --- the animals -------------------------------------------------------
       Still painted rather than drawn — this is a watercolour country and a
       line-art animal would sit on it like a sticker — but painted with the
       three things that separate a creature from a cut-out shape: a body
       lit from above and shadowed underneath, a soft shadow on the ground
       it is standing on, and a broken edge instead of a hard one. Each is
       cheap; together they are most of the difference.

       They are drawn smaller than they were, too. A map animal that reads
       as the same size as a town is a mascot; at this scale they are
       wildlife, noticed rather than announced.
       --------------------------------------------------------------------- */

    /* One shared path builder, so a body can be filled with a gradient and
       then edged, rather than flat-filled twice. */
    function blobPath(g, pts) {
      g.beginPath();
      g.moveTo(pts[0][0], pts[0][1]);
      for (var i = 1; i <= pts.length; i++) {
        var p = pts[i % pts.length], q = pts[(i + 1) % pts.length];
        g.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2);
      }
      g.closePath();
    }

    function paintBlob(g, pts, colour, alpha) {
      g.globalAlpha = alpha;
      g.fillStyle = colour;
      blobPath(g, pts);
      g.fill();
      g.globalAlpha = 1;
    }

    /* A body with a top and a bottom to it, in four steps rather than two.
       Two stops give a smooth ramp, and a smooth ramp is what plastic looks
       like. An animal lit from above has a bright line along its back where
       the light grazes it, a broad midtone, a dark under the belly, and then
       a little light coming back up off the ground into that dark. Those
       four bands are most of what separates a painted animal from a filled
       silhouette, and they cost one gradient. */
    function mixHex(a, b, k) {
      var pa = /^#?([0-9a-f]{6})$/i.exec(a), pb = /^#?([0-9a-f]{6})$/i.exec(b);
      if (!pa || !pb) return a;
      var va = parseInt(pa[1], 16), vb = parseInt(pb[1], 16);
      var r = Math.round(((va >> 16) & 255) * (1 - k) + ((vb >> 16) & 255) * k);
      var gg = Math.round(((va >> 8) & 255) * (1 - k) + ((vb >> 8) & 255) * k);
      var bl = Math.round((va & 255) * (1 - k) + (vb & 255) * k);
      return 'rgb(' + r + ',' + gg + ',' + bl + ')';
    }

    function shadeBlob(g, pts, top, bottom, alpha, edge) {
      var y0 = Infinity, y1 = -Infinity;
      for (var i = 0; i < pts.length; i++) {
        if (pts[i][1] < y0) y0 = pts[i][1];
        if (pts[i][1] > y1) y1 = pts[i][1];
      }
      var grad = g.createLinearGradient(0, y0, 0, y1 + 0.001);
      grad.addColorStop(0, mixHex(top, '#FFF6E4', 0.3));
      grad.addColorStop(0.13, top);
      grad.addColorStop(0.62, mixHex(top, bottom, 0.68));
      grad.addColorStop(0.88, bottom);
      /* the ground throwing a little light back up under the belly */
      grad.addColorStop(1, mixHex(bottom, '#C9B994', 0.24));
      g.globalAlpha = alpha;
      g.fillStyle = grad;
      blobPath(g, pts);
      g.fill();
      /* The edge is the tell. A single hard outline is cartoon; a soft dark
         one at a fifth of the strength is a wet edge where the pigment
         gathered. */
      if (edge !== false) {
        g.globalAlpha = alpha * 0.22;
        g.strokeStyle = PIG.hideDark;
        g.lineWidth = 1.1;
        g.stroke();
      }
      g.globalAlpha = 1;
    }

    /* What an animal is standing on. Without it they float. */
    function groundShadow(g, x, y, rx, ry, a) {
      var grad = g.createRadialGradient(x, y, 0, x, y, Math.max(rx, ry));
      grad.addColorStop(0, 'rgba(74,59,44,' + a + ')');
      grad.addColorStop(1, 'rgba(74,59,44,0)');
      g.fillStyle = grad;
      g.save();
      g.translate(x, y);
      g.scale(1, ry / Math.max(rx, ry));
      g.beginPath();
      g.arc(0, 0, Math.max(rx, ry), 0, TAU);
      g.fill();
      g.restore();
    }

    /* A few short strokes with the lie of the coat. Not fur — the suggestion
       of it, which at this size is all that survives anyway. */
    function coat(g, x0, y0, x1, y1, n, len, colour, alpha, seed) {
      var r = rng(seed);
      g.save();
      g.strokeStyle = colour;
      g.lineCap = 'round';
      /* Two lengths in two weights. One length of hair at one weight is
         hatching; a coat is short hair with longer hair lying over it. */
      for (var pass = 0; pass < 2; pass++) {
        g.lineWidth = pass ? 0.55 : 0.85;
        g.globalAlpha = alpha * (pass ? 0.65 : 1);
        var m = pass ? Math.round(n * 1.6) : n;
        for (var i = 0; i < m; i++) {
          var k = (i + r() * 0.7) / m;
          var x = lerp(x0, x1, k) + (r() - 0.5) * 4;
          var y = lerp(y0, y1, k) + (r() - 0.5) * 6;
          var d = len * (pass ? 0.4 : 1) * (0.6 + r() * 0.8);
          g.beginPath();
          g.moveTo(x, y);
          g.quadraticCurveTo(x - d * 0.4, y + d * 0.3, x - d, y + d * 0.55);
          g.stroke();
        }
      }
      g.restore();
      g.globalAlpha = 1;
    }

    /* An eye that is looking at something: a dark ball, a lid over the top
       of it, and one speck of the sky in it. */
    function eye(g, x, y, r, dark) {
      g.globalAlpha = 0.95;
      g.fillStyle = dark || '#241708';
      g.beginPath(); g.ellipse(x, y, r, r, 0, 0, TAU); g.fill();
      g.globalAlpha = 0.75;
      g.fillStyle = '#FBF6E9';
      g.beginPath(); g.ellipse(x - r * 0.32, y - r * 0.34, r * 0.34, r * 0.3, 0, 0, TAU); g.fill();
      g.globalAlpha = 1;
    }

    /* One cubic, sampled: the beam and the tines that spring off it read as
       one antler only if they are worked out from the same curve. The beam
       leaves the skull, sweeps back over the shoulders and turns up at the
       end, which is the shape that says elk before any other detail does. */
    var ANTLER = [[38, -50], [50, -66], [40, -86], [16, -90]];
    function antlerAt(sx, depth, k, axis) {
      var m = 1 - k, P = ANTLER, i = axis;
      var v = m * m * m * P[0][i] +
              3 * m * m * k * (P[1][i] + (i ? 0 : sx * 4)) +
              3 * m * k * k * (P[2][i] + (i ? 0 : sx * 6)) +
              k * k * k * (P[3][i] + (i ? 0 : sx * 7));
      return i ? v * depth : v;
    }

    /* One leg: a tapered shape from shoulder to fetlock, with a hoof on the
       end of it. `bend` is how far the foot lands from under the shoulder,
       which is what makes four of them read as a standing animal rather
       than as a table. */
    function elkLeg(g, x, y, bend, len, wTop, wBot, colour) {
      var mx = x + bend * 0.45, my = y + len * 0.52;
      var ex = x + bend, ey = y + len;
      g.globalAlpha = 0.94;
      g.fillStyle = colour;
      g.beginPath();
      g.moveTo(x - wTop / 2, y);
      g.quadraticCurveTo(mx - wBot * 0.8, my, ex - wBot / 2, ey);
      g.lineTo(ex + wBot / 2, ey);
      g.quadraticCurveTo(mx + wTop * 0.5, my, x + wTop / 2, y);
      g.closePath();
      g.fill();
      g.globalAlpha = 0.9;
      g.fillStyle = '#33200F';
      g.beginPath();
      g.ellipse(ex, ey + 0.6, wBot * 0.78, wBot * 0.62, 0, 0, TAU);
      g.fill();
      g.globalAlpha = 1;
    }

    /* An elk is a wedge: the shoulder is the high point, the rump falls away
       behind it, the chest is deep and the belly tucks up. Get that line
       wrong and no amount of shading rescues it — which is what was wrong
       before, when the body was an oval and the neck a stalk coming out of
       the top of it. The neck is short and thick and comes off the chest,
       not off the withers, and the head is big enough to carry the antlers.
       Everything is drawn about the shoulder, at (16, -16). */
    function drawElk(g, f, time) {
      var s = f.s * 40;
      var turn = reduceMotion ? 0 : Math.sin(time * 0.00034) * 0.06;
      var ear = reduceMotion ? 0 : Math.sin(time * 0.0019) * 0.16;
      var breathe = reduceMotion ? 0 : Math.sin(time * 0.0012) * 0.006;
      g.save();
      g.translate(f.x, f.y);
      g.scale(s / 46, s / 46 * (1 + breathe));

      groundShadow(g, -2, 34, 36, 8, 0.26);

      /* the far pair first, a shade darker for standing behind */
      elkLeg(g, -20, 6, -2.5, 27, 7.4, 2.8, '#4E2F1D');
      elkLeg(g, 13, 4, 2.5, 29, 6.6, 2.6, '#4E2F1D');

      /* Body: high at the withers, falling to the rump, deep through the
         chest, tucked at the flank. */
      shadeBlob(g, [[-30, -1], [-27, -12], [-13, -17], [2, -18], [14, -17],
                    [24, -11], [27, -3], [23, 8], [8, 14], [-9, 15], [-25, 10]],
                '#9A6A45', '#472B1A', 0.96);
      coat(g, -24, -12, 20, -14, 11, 6, '#5A3722', 0.24, 'elk-coat');

      /* the pale rump patch an elk is known by */
      g.globalAlpha = 0.4;
      g.fillStyle = '#DCC098';
      g.beginPath();
      g.ellipse(-25, -1, 7.5, 10, 0.18, 0, TAU);
      g.fill();
      g.globalAlpha = 0.85;
      g.fillStyle = '#3E2415';
      g.beginPath(); g.ellipse(-31, -3, 2.4, 5.4, 0.35, 0, TAU); g.fill();
      g.globalAlpha = 1;

      /* the near pair, in front of the body */
      elkLeg(g, -14, 7, 1.5, 27, 7.8, 3.0, '#6A4128');
      elkLeg(g, 20, 3, -1.5, 30, 7.0, 2.8, '#6A4128');

      /* Neck, head, antlers — the part that moves, hinged at the chest. */
      g.save();
      g.translate(16, -14);
      g.rotate(turn);

      /* neck: thick where it leaves the chest, narrowing to the skull */
      shadeBlob(g, [[-8, 6], [-6, -6], [0, -18], [9, -28], [20, -35],
                    [25, -30], [16, -21], [8, -10], [3, 2]],
                '#95673F', '#4E2F1D', 0.97);
      /* the dark mane down the throat, which is where an elk's colour
         changes and the single most recognisable thing about the animal
         after the antlers */
      g.globalAlpha = 0.42;
      g.fillStyle = '#341F11';
      g.beginPath();
      g.moveTo(-5, 5); g.quadraticCurveTo(3, -10, 16, -25);
      g.quadraticCurveTo(9, -12, 1, 6);
      g.closePath(); g.fill();
      g.globalAlpha = 1;
      coat(g, 2, -10, 18, -28, 7, 5, '#4A2C19', 0.28, 'elk-mane');

      /* head */
      shadeBlob(g, [[16, -34], [22, -40], [30, -40], [35, -35], [33, -28], [22, -26]],
                '#8E6039', '#4A2C19', 0.97);
      /* muzzle, long and squared off */
      shadeBlob(g, [[31, -38], [40, -38], [44, -34], [41, -29], [32, -28]],
                '#6B452C', '#33200F', 0.95);
      g.globalAlpha = 0.9;
      g.fillStyle = '#241708';
      g.beginPath(); g.ellipse(42, -34, 1.6, 1.4, 0, 0, TAU); g.fill();
      g.globalAlpha = 1;
      eye(g, 28, -36, 1.7);

      /* two ears, the near one flicking */
      [[-0.7, 1, ear], [-0.35, 0.86, ear * 0.6]].forEach(function (e) {
        g.save();
        g.translate(20, -38);
        g.rotate(e[0] + e[2]);
        g.globalAlpha = 0.95;
        g.fillStyle = '#875839';
        g.beginPath(); g.ellipse(0, -5, 2.6, 5.6 * e[1], 0, 0, TAU); g.fill();
        g.globalAlpha = 0.45;
        g.fillStyle = '#3E2415';
        g.beginPath(); g.ellipse(0.4, -5, 1.2, 3.8 * e[1], 0, 0, TAU); g.fill();
        g.restore();
      });
      g.globalAlpha = 1;

      /* Antlers: one sweep back per side with tines off the front edge.
         Drawn as strokes rather than as a shape, because an antler is a line
         and a filled one always reads as a plant — and in four narrowing
         pieces per beam, because a constant-width antler reads as wire. */
      g.strokeStyle = '#7A5638';
      g.lineCap = 'round';
      [[-1, 0.88, 0.72], [1, 1, 0.95]].forEach(function (side) {
        var sx = side[0], depth = side[1];
        g.globalAlpha = side[2];
        var b, k0, k1;
        for (b = 0; b < 4; b++) {
          k0 = b / 4; k1 = (b + 1) / 4;
          g.lineWidth = 3.6 - b * 0.66;
          g.beginPath();
          g.moveTo(antlerAt(sx, depth, k0, 0), antlerAt(sx, depth, k0, 1));
          g.quadraticCurveTo(antlerAt(sx, depth, (k0 + k1) / 2, 0),
                             antlerAt(sx, depth, (k0 + k1) / 2, 1),
                             antlerAt(sx, depth, k1, 0), antlerAt(sx, depth, k1, 1));
          g.stroke();
        }
        /* five tines off the front of the beam, shortening towards the tip */
        for (var t = 0; t < 5; t++) {
          var k = 0.12 + t * 0.19;
          var bx = antlerAt(sx, depth, k, 0), by = antlerAt(sx, depth, k, 1);
          g.lineWidth = 2.3 - t * 0.3;
          g.beginPath();
          g.moveTo(bx, by);
          g.quadraticCurveTo(bx + 7, by - 7, bx + 11 - t * 1.2, by - 14 + t * 1.6);
          g.stroke();
        }
      });
      g.globalAlpha = 1;
      g.restore();

      g.restore();
    }

    function drawEagle(g, f, time) {
      var s = f.s * 38;
      var beat = reduceMotion ? 0.5 : (0.5 + 0.5 * Math.sin(time * 0.0014));
      var glide = reduceMotion ? 0 : Math.sin(time * 0.00035) * 7;
      g.save();
      g.translate(f.x + glide, f.y + Math.cos(time * 0.0004) * 4);
      g.scale(s / 38, s / 38);

      /* tail, behind everything */
      shadeBlob(g, [[-7, 14], [-4, 27], [0, 30], [4, 27], [7, 14]],
                '#5E3823', '#3A2314', 0.9, false);
      g.globalAlpha = 0.94;
      g.fillStyle = '#F3EDDD';
      g.beginPath();
      g.moveTo(-6.5, 17); g.quadraticCurveTo(0, 31, 6.5, 17);
      g.quadraticCurveTo(0, 21, -6.5, 17); g.closePath(); g.fill();
      g.globalAlpha = 1;

      /* Wings. The far one is a shade darker for being the far one. */
      [[-1, 0], [1, 1]].forEach(function (side) {
        var sx = side[0], near = side[1];
        g.save();
        g.scale(sx, 1);
        g.rotate(-0.18 + beat * 0.2);
        shadeBlob(g, [
          /* leading edge, shoulder to tip */
          [5, -13], [21, -20], [39, -22], [54, -19], [63, -13],
          /* and back along the trailing edge, notched into primaries */
          [61, -5], [54, -6], [55, 1], [47, -1], [46, 6], [38, 3],
          [35, 9], [26, 5], [14, 5], [6, 2]
        ], near ? '#6E4429' : '#553220', near ? '#3E2614' : '#2E1B0D', 0.92, false);
        /* the pale band along the covert line */
        g.globalAlpha = 0.16;
        g.fillStyle = '#E7D9B8';
        g.beginPath();
        g.moveTo(8, -12); g.quadraticCurveTo(30, -17, 52, -17);
        g.quadraticCurveTo(30, -12, 9, -8); g.closePath(); g.fill();
        g.globalAlpha = 1;
        g.restore();
      });

      /* body between them */
      shadeBlob(g, [[-6, -16], [0, -19], [6, -16], [8, 2], [4, 16], [-4, 16], [-8, 2]],
                '#6E4429', '#3A2314', 0.95);

      /* the white head of a fish eagle, and the bill */
      g.globalAlpha = 0.96;
      g.fillStyle = '#F6F1E4';
      g.beginPath(); g.ellipse(0, -20, 6, 7.2, 0, 0, TAU); g.fill();
      g.globalAlpha = 0.2;
      g.fillStyle = '#A3987C';
      g.beginPath(); g.ellipse(0, -16.5, 5.6, 3.4, 0, 0, TAU); g.fill();
      g.globalAlpha = 0.96;
      g.fillStyle = '#D9A03C';
      g.beginPath();
      g.moveTo(2.6, -24); g.quadraticCurveTo(10, -22.5, 3.4, -18.5);
      g.closePath(); g.fill();
      eye(g, 2.4, -22.2, 1.15, '#1E1408');
      g.globalAlpha = 1;
      g.restore();
    }

    /* Facing west, because everything on this paper does. Heavy in the body,
       short in the leg, and carrying the two things a dodo is recognised by:
       the hooked bill and the curl of plumes where a tail should be. */
    function drawDodo(g, f, time) {
      var s = f.s * 40;
      var bob = reduceMotion ? 0 : Math.sin(time * 0.0009) * 1;
      var peck = reduceMotion ? 0 : Math.max(0, Math.sin(time * 0.00042)) * 0.16;
      g.save();
      g.translate(f.x, f.y + bob);
      g.scale(s / 40, s / 40);
      groundShadow(g, -1, 32, 24, 6, 0.2);

      /* the plumes, behind the body */
      g.globalAlpha = 0.66;
      g.strokeStyle = '#D2CAB4';
      g.lineCap = 'round';
      for (var i = 0; i < 5; i++) {
        g.lineWidth = 2.6 - i * 0.3;
        g.beginPath();
        g.moveTo(16, -2);
        g.quadraticCurveTo(30 + i * 2.5, -6 - i * 4, 24 + i * 5, 4 - i * 5);
        g.stroke();
      }
      g.globalAlpha = 1;

      /* legs, stout, with toes */
      g.globalAlpha = 0.94;
      g.strokeStyle = '#A07C44';
      g.lineWidth = 3.6;
      [[-5, 15], [6, 16]].forEach(function (p) {
        g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(p[0] - 1, p[1] + 14); g.stroke();
        g.lineWidth = 2.1;
        g.beginPath();
        g.moveTo(p[0] - 5.5, p[1] + 15); g.lineTo(p[0] - 1, p[1] + 14);
        g.lineTo(p[0] + 3.5, p[1] + 15); g.stroke();
        g.lineWidth = 3.6;
      });
      g.globalAlpha = 1;

      /* body */
      shadeBlob(g, [[-20, -4], [-14, -16], [0, -20], [14, -14], [20, 0],
                    [15, 13], [0, 18], [-16, 10]], '#C2BAA6', '#7C7360', 0.95);
      coat(g, -14, -12, 14, -10, 9, 5, '#6E6552', 0.2, 'dodo-coat');
      /* the folded wing, which on a dodo is barely there */
      g.globalAlpha = 0.28;
      g.fillStyle = '#6E6552';
      g.beginPath();
      g.moveTo(-2, -4); g.quadraticCurveTo(11, -6, 16, 2);
      g.quadraticCurveTo(6, 3, -2, 0); g.closePath(); g.fill();
      g.globalAlpha = 1;

      /* neck and head, which dip and come back up */
      g.save();
      g.translate(-15, -13);
      g.rotate(peck);
      shadeBlob(g, [[2, 6], [-2, -3], [-4, -11], [1, -14], [5, -8], [6, 2]],
                '#C2BAA6', '#8A8069', 0.95, false);
      shadeBlob(g, [[-13, -14], [-10, -22], [-2, -24], [3, -19], [2, -12], [-7, -10]],
                '#CAC2AE', '#8F856E', 0.96);
      /* the hooked bill */
      g.globalAlpha = 0.95;
      g.fillStyle = '#93835F';
      g.beginPath();
      g.moveTo(-11, -20); g.quadraticCurveTo(-27, -18, -25, -8);
      g.quadraticCurveTo(-19, -11, -9, -13); g.closePath(); g.fill();
      g.globalAlpha = 0.4;
      g.fillStyle = '#645941';
      g.beginPath();
      g.moveTo(-11, -20); g.quadraticCurveTo(-24, -18.5, -24, -13);
      g.quadraticCurveTo(-17, -14.5, -10, -16); g.closePath(); g.fill();
      g.globalAlpha = 1;
      eye(g, -6, -19, 2);
      g.restore();

      g.globalAlpha = 1;
      g.restore();
    }

    /* A heron at the shallow end. Standing still is what a heron does, so
       almost nothing about it moves: the head shifts, and once in a while
       the whole neck folds and strikes. */
    function drawHeron(g, f, time) {
      var s = f.s * 40;
      var cycle = reduceMotion ? 0 : (Math.sin(time * 0.00025) + 1) / 2;
      var strike = reduceMotion ? 0 : Math.pow(Math.max(0, Math.sin(time * 0.00048)), 18);
      var lean = cycle * 0.06 + strike * 0.45;
      g.save();
      g.translate(f.x, f.y);
      g.scale(s / 40, s / 40);

      /* Standing in water, so what it casts is a reflection, not a shadow. */
      g.globalAlpha = 0.16;
      g.fillStyle = '#6F9AA1';
      g.beginPath(); g.ellipse(0, 30, 15, 3.4, 0, 0, TAU); g.fill();
      g.globalAlpha = 1;

      /* One leg in the water and one folded up against the body, which is
         how a heron waits. Long, and jointed backwards at the hock — get
         that joint the wrong way and it stops being a wading bird. */
      g.globalAlpha = 0.9;
      g.strokeStyle = '#8A6A3E';
      g.lineCap = 'round';
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(1, 9); g.lineTo(4, 19); g.lineTo(0, 30);
      g.stroke();
      g.lineWidth = 1.7;
      g.beginPath(); g.moveTo(-3, 9); g.lineTo(-9, 18); g.lineTo(-2, 22); g.stroke();

      /* body: a long wedge, tail high, breast low */
      shadeBlob(g, [[-18, 4], [-13, -5], [-1, -9], [9, -5], [12, 2], [5, 10], [-8, 11]],
                '#CBD3DA', '#8A98A4', 0.94);
      /* the folded wing, a shade darker than the breast */
      g.globalAlpha = 0.42;
      g.fillStyle = '#7C8A98';
      g.beginPath();
      g.moveTo(-15, 1); g.quadraticCurveTo(-4, -6, 8, -2);
      g.quadraticCurveTo(-2, 5, -14, 5); g.closePath(); g.fill();
      g.globalAlpha = 1;

      /* neck and head, folded into an S and unfolding to strike */
      g.save();
      g.translate(7, -6);
      g.rotate(lean);
      g.globalAlpha = 0.94;
      g.strokeStyle = '#C3CCD4';
      g.lineWidth = 3.4;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(0, 2);
      g.bezierCurveTo(6, -4, 2 + strike * 5, -12, 8 + strike * 9, -18 + strike * 7);
      g.stroke();
      g.save();
      g.translate(8 + strike * 9, -18 + strike * 7);
      g.rotate(strike * 0.6);
      g.globalAlpha = 0.95;
      g.fillStyle = '#CBD3DA';
      g.beginPath(); g.ellipse(0, 0, 4.2, 3.1, -0.2, 0, TAU); g.fill();
      /* the black crown plume */
      g.globalAlpha = 0.62;
      g.strokeStyle = '#4A4F55';
      g.lineWidth = 1.3;
      g.beginPath(); g.moveTo(-1, -2.4); g.quadraticCurveTo(-7, -4, -10, -1); g.stroke();
      /* the dagger */
      g.globalAlpha = 0.95;
      g.fillStyle = '#D6A93F';
      g.beginPath();
      g.moveTo(3, -0.8); g.lineTo(15, 1.4); g.lineTo(3, 2.2); g.closePath(); g.fill();
      eye(g, 1.2, -0.9, 1.05, '#2A2118');
      g.restore();
      g.restore();
      g.globalAlpha = 1;
      g.restore();
    }

    /* A hare on the open ground. Sits, listens, and every so often takes
       two hops and sits again — which is the whole of a hare. */
    function drawHare(g, f, time) {
      var s = f.s * 40;
      /* It used to hop across the ground and then vanish back to where it
         started, because the loop was a sawtooth and the animal was tied to
         it. Nothing here travels any more: an animal on a map has a place,
         and a place it walks away from is a place it is no longer marking.
         What is left is what a hare does while it is sitting — the ears
         turn, and it settles on its haunches and comes back up. Every term
         is a full sine, so there is no wrap for the eye to catch. */
      var settle = reduceMotion ? 0 : (Math.sin(time * 0.00042 + f.ph) * 0.5 + 0.5);
      var ear = reduceMotion ? 0 : Math.sin(time * 0.0016 + f.ph) * 0.13;
      var ear2 = reduceMotion ? 0 : Math.sin(time * 0.0011 + f.ph * 2.1) * 0.1;
      g.save();
      g.translate(f.x, f.y + settle * 1.4);
      g.scale(s / 40, s / 40);

      groundShadow(g, 0, 15, 15, 4, 0.19);

      /* haunch, then body in front of it: a hare is mostly back legs */
      shadeBlob(g, [[-13, 2], [-14, -6], [-8, -10], [-2, -6], [-2, 4], [-8, 8]],
                '#B08A5E', '#6E4E30', 0.95, false);
      g.globalAlpha = 0.9;
      g.strokeStyle = '#5C3F26';
      g.lineCap = 'round';
      g.lineWidth = 2;
      g.beginPath(); g.moveTo(-11, 6); g.quadraticCurveTo(-4, 11, 2, 10); g.stroke();
      g.beginPath(); g.moveTo(7, 4); g.lineTo(8, 10); g.stroke();
      shadeBlob(g, [[-11, -2], [-5, -9], [4, -10], [10, -5], [10, 3], [2, 8], [-8, 6]],
                '#BE9668', '#775635', 0.96);
      coat(g, -9, -7, 8, -8, 6, 3.4, '#63462B', 0.26, 'hare-coat');
      /* head, up and listening */
      shadeBlob(g, [[6, -6], [12, -10], [17, -8], [18, -3], [13, 1], [7, 0]],
                '#C29B6C', '#7C5A38', 0.96);
      g.globalAlpha = 0.94;
      g.fillStyle = '#4A3520';
      g.beginPath(); g.ellipse(18.4, -4.6, 1.3, 1.1, 0, 0, TAU); g.fill();
      eye(g, 14, -6.4, 1.25);
      /* the ears, which is where a hare keeps its attention */
      [[-0.18, 1], [0.1, 0.92]].forEach(function (e, i) {
        g.save();
        g.translate(9.5, -8);
        g.rotate(e[0] + (i ? ear2 : ear));
        g.globalAlpha = 0.95;
        g.fillStyle = '#B58F62';
        g.beginPath(); g.ellipse(0, -8, 2.1, 8.4 * e[1], 0.05, 0, TAU); g.fill();
        g.globalAlpha = 0.45;
        g.fillStyle = '#7A4F35';
        g.beginPath(); g.ellipse(0.2, -8, 1, 6.4 * e[1], 0.05, 0, TAU); g.fill();
        g.restore();
      });
      /* the scut */
      g.globalAlpha = 0.85;
      g.fillStyle = '#EDE4CE';
      g.beginPath(); g.ellipse(-14, -2, 3, 3.4, 0.3, 0, TAU); g.fill();
      g.globalAlpha = 1;
      g.restore();
    }

    /* --- and two in the water ---------------------------------------------
       Sea animals get no ground shadow and no cast: what they get is the
       water closing over them. Both are drawn half-submerged, with the line
       of the surface across them and a wake behind, which is the only way a
       painted animal reads as being *in* something rather than on it. */
    function waterLine(g, w, a) {
      g.globalAlpha = a;
      g.strokeStyle = '#EFE7D2';
      g.lineCap = 'round';
      g.lineWidth = 1.4;
      g.beginPath();
      g.moveTo(-w, 0);
      g.quadraticCurveTo(-w * 0.4, -2.2, 0, 0);
      g.quadraticCurveTo(w * 0.4, 2.2, w, 0);
      g.stroke();
      g.globalAlpha = 1;
    }

    function drawTurtle(g, f, time) {
      var s = f.s * 40;
      var swim = reduceMotion ? 0 : Math.sin(time * 0.00042 + f.ph);
      var flip = reduceMotion ? 0.2 : Math.sin(time * 0.001 + f.ph) * 0.26;
      g.save();
      g.translate(f.x + swim * 5, f.y + Math.cos(time * 0.00041) * 2);
      g.rotate(swim * 0.05);
      g.scale(s / 40, s / 40);

      /* what is under the surface, seen through it */
      g.globalAlpha = 0.22;
      g.fillStyle = '#4E7C79';
      g.beginPath(); g.ellipse(-2, 5, 20, 9, 0, 0, TAU); g.fill();
      g.globalAlpha = 1;

      /* front flippers, the far one dimmer for being through more water */
      [[-1, 0.42], [1, 0.92]].forEach(function (side, i) {
        g.save();
        g.scale(1, side[0]);
        g.rotate(flip * (i ? 1 : -0.7));
        g.globalAlpha = side[1];
        g.fillStyle = '#5E7F5A';
        g.beginPath();
        g.moveTo(4, 1);
        g.quadraticCurveTo(18, -4, 25, 4);
        g.quadraticCurveTo(15, 5, 4, 4);
        g.closePath(); g.fill();
        g.restore();
      });
      g.globalAlpha = 1;

      /* the shell, and the plates on it */
      shadeBlob(g, [[-17, 0], [-11, -8], [2, -10], [13, -6], [15, 2], [6, 8], [-9, 7]],
                '#7D9A66', '#3F5A44', 0.95);
      g.globalAlpha = 0.3;
      g.strokeStyle = '#2F4634';
      g.lineWidth = 0.9;
      [-8, -1, 6].forEach(function (x) {
        g.beginPath(); g.moveTo(x, -8.6); g.quadraticCurveTo(x - 1.5, -1, x - 0.5, 7); g.stroke();
      });
      g.beginPath(); g.moveTo(-15, -1.5); g.quadraticCurveTo(0, -4, 14, 0); g.stroke();
      g.globalAlpha = 1;

      /* head, just up for air */
      shadeBlob(g, [[14, -3], [20, -6], [25, -4], [25, 1], [19, 3], [14, 2]],
                '#7E9765', '#4A6349', 0.95);
      eye(g, 21.5, -3, 1.05, '#1F2A1B');
      waterLine(g, 26, 0.4);
      g.restore();
    }

    /* One fish, out of the water for about a second at a time. It spends the
       rest of the loop as a shadow and a ring, which is what you actually
       see of a fish from a boat. */
    function drawFish(g, f, time) {
      var s = f.s * 40;
      /* The rise is a sine, so it comes back to nothing before the loop
         turns over — but the fish used to be swept sideways by a sawtooth as
         well, and that snapped back to the start every time round. It breaks
         the surface where it is now. */
      var k = reduceMotion ? 0.28 : ((time * 0.00018 + f.ph) % 1);
      var air = Math.max(0, Math.sin(k * Math.PI * 2 - 1.2));
      var rise = Math.pow(air, 0.7);
      g.save();
      g.translate(f.x, f.y);

      /* the ring it left, still opening */
      if (rise > 0.02) {
        g.globalAlpha = 0.3 * (1 - rise);
        g.strokeStyle = '#EFE7D2';
        g.lineWidth = 1.3;
        g.beginPath(); g.ellipse(0, 2, 10 + rise * 26, 3 + rise * 8, 0, 0, TAU); g.stroke();
        g.globalAlpha = 1;
      }
      /* the fish itself, under the surface or over it */
      g.save();
      g.translate(0, -rise * 11);
      g.rotate(-0.42 + rise * 0.6);
      g.scale(s / 40, s / 40);
      g.globalAlpha = 0.35 + rise * 0.6;
      shadeBlob(g, [[-15, 0], [-6, -6], [6, -6], [14, -1], [6, 5], [-6, 6]],
                '#8FA9AE', '#41615F', 1, false);
      g.globalAlpha = 0.3 + rise * 0.55;
      g.fillStyle = '#41615F';
      g.beginPath();
      g.moveTo(-13, 0); g.lineTo(-23, -7); g.lineTo(-20, 0); g.lineTo(-23, 7);
      g.closePath(); g.fill();
      g.beginPath();
      g.moveTo(-2, -5); g.lineTo(2, -12); g.lineTo(7, -4); g.closePath(); g.fill();
      if (rise > 0.35) eye(g, 9, -1.4, 1.1, '#22322F');
      g.globalAlpha = 1;
      g.restore();

      /* and the surface it is coming through */
      g.save();
      g.scale(s / 40, s / 40);
      waterLine(g, 16 + rise * 10, 0.28 + rise * 0.3);
      g.restore();
      g.restore();
    }

    var FAUNA_DRAW = {
      elk: drawElk, eagle: drawEagle, dodo: drawDodo,
      heron: drawHeron, hare: drawHare, turtle: drawTurtle, fish: drawFish
    };

    /* ========================================================= BUTTERFLIES
       The room's own, over the country. There are four reasons one appears
       and no others: you followed a category, you are following a person,
       you opened a memory, or the map is simply being looked at. None of
       them is a decoration on a timer.

       A butterfly carries the colour of whatever sent it — a category's
       tone, a life's tone — which is the same code the dock, the chips and
       the memory lights all run on, so the violet butterfly that leaves the
       Chaos chip arrives at a violet light.
       ------------------------------------------------------------------- */
    var fliers = [];

    function Flier(o) {
      o = o || {};
      this.x = o.x || 0; this.y = o.y || 0;
      this.tone = o.tone || PIG.trail;
      this.size = o.size || 1;
      this.speed = o.speed || 0.19;          /* map units per ms */
      this.arriveAt = o.arriveAt || 16;
      this.trailCap = o.trailCap === undefined ? 46 : o.trailCap;
      this.target = o.target || null;
      this.onArrive = o.onArrive || null;
      this.kind = o.kind || 'idle';
      this.trail = [];
      this.ph = hash01((o.seed || 'f') + 'p') * TAU;
      this.weave = 0.5 + hash01((o.seed || 'f') + 'w') * 0.9;
      this.a = 0;
      this.fade = 0;
      this.hold = 0;
      this.done = false;
    }
    Flier.prototype.aim = function (pt, onArrive) {
      this.target = pt; this.onArrive = onArrive || null;
    };
    Flier.prototype.step = function (dt) {
      this.ph += dt * 0.012;
      this.a = this.fade ? Math.max(0, this.a - dt * this.fade) : Math.min(1, this.a + dt / 500);
      if (this.fade && this.a <= 0) { this.done = true; return; }
      if (this.hold > 0) { this.hold -= dt; return; }
      if (!this.target) return;

      var dx = this.target.x - this.x, dy = this.target.y - this.y;
      var d = Math.sqrt(dx * dx + dy * dy);
      if (d < this.arriveAt) {
        var fn = this.onArrive;
        this.onArrive = null;
        if (fn) fn(this);
        return;
      }
      /* A butterfly does not fly at a thing, it flies about it and gets
         there anyway: the heading is the bearing plus a slow sideways
         weave, which is the whole of the illusion. */
      var ux = dx / d, uy = dy / d;
      var w = Math.sin(this.ph * this.weave) * 0.55;
      var vx = ux + -uy * w, vy = uy + ux * w;
      var vl = Math.sqrt(vx * vx + vy * vy) || 1;
      var step = Math.min(d, this.speed * dt);
      this.x += vx / vl * step;
      this.y += vy / vl * step;
      if (this.trailCap) {
        this.trail.push({ x: this.x, y: this.y });
        if (this.trail.length > this.trailCap) this.trail.shift();
      }
    };

    function spawnFlier(o) {
      var f = new Flier(o);
      fliers.push(f);
      wake();
      return f;
    }
    function releaseFlier(f, ms) {
      if (!f) return;
      f.fade = 1 / (ms || 900);
      wake();
    }

    /* Somewhere off the edge of the paper, where a butterfly on an errand
       should come from. */
    function offPaper() {
      var r = Math.random();
      if (r < 0.5) return { x: r < 0.25 ? -90 : MAP.w + 90, y: 120 + Math.random() * (MAP.h - 240) };
      return { x: 140 + Math.random() * (MAP.w - 280), y: r < 0.75 ? -90 : MAP.h + 90 };
    }

    /* --- the one on an errand: a category's butterfly, sent to fetch one of
       its memories, exactly as the canvas trail sends it. */
    var escort = null;
    function sendTo(opts) {
      var w = wpById[opts.id];
      if (!w) return;
      if (escort) { releaseFlier(escort, 500); escort = null; }
      if (reduceMotion) { emit('select', w.ref); return; }
      var at = offPaper();
      escort = spawnFlier({
        x: at.x, y: at.y, tone: opts.tone || w.tone, size: 1.1,
        speed: 0.58, trailCap: 90, kind: 'escort', seed: opts.id
      });
      escort.aim({ x: w.x, y: w.y }, function (f) {
        releaseFlier(f, 1400);
        if (escort === f) escort = null;
        emit('select', w.ref);
      });
      /* the camera goes along behind it, so you see it arrive */
      goTo(w.x, w.y, Math.max(cam.z, zFit * 1.7), 1500);
    }

    /* --- the ones with nowhere to be. Two of them live over the country. */
    var ambient = [];
    function startAmbient() {
      if (reduceMotion) return;
      var want = quality > 0.7 ? 2 : 1;
      while (ambient.length < want) {
        var at = offPaper();
        var f = spawnFlier({
          /* An idle butterfly leaves no thread. The ones that do are the
             ones on an errand — a thread means somebody sent it. */
          x: at.x, y: at.y, tone: '#C97A55', size: 0.8,
          speed: 0.1, trailCap: 0, kind: 'ambient', seed: 'amb' + ambient.length
        });
        f.a = 0.6;
        ambient.push(f);
        wander(f);
      }
    }
    function wander(f) {
      if (!f) return;
      f.aim({ x: 120 + Math.random() * (MAP.w - 240),
              y: 120 + Math.random() * (MAP.h - 240) },
            function (self) { self.hold = 700 + Math.random() * 2600; wanderSoon(self); });
    }
    function wanderSoon(f) {
      global.setTimeout(function () { if (active && !f.done) wander(f); }, 900 + Math.random() * 2200);
    }

    /* --- the one following a life: it walks that strand and rests a moment
       at each of that person's memories. */
    var walker = null, walkStops = [], walkNext = 0;
    function startFollow(strandId) {
      stopFollow();
      if (reduceMotion || !strandId) return;
      var P = lanePathFor(strandId);
      var lane = laneById[strandId];
      if (!P || P.pts.length < 2 || !lane) return;
      walkStops = waypoints
        .filter(function (w) { return w.lane === strandId; })
        .sort(function (a, b) { return a.t - b.t; });
      walkNext = 0;
      walker = spawnFlier({
        x: P.pts[0].x, y: P.pts[0].y, tone: lane.tone, size: 1.05,
        speed: 0.2, trailCap: 70, kind: 'walker', seed: strandId
      });
      walker.i = 0;
      stepWalk();
    }
    function stepWalk() {
      if (!walker) return;
      var P = lanePathFor(emphasis.person);
      if (!P) { stopFollow(); return; }
      if (walkNext >= walkStops.length) {
        /* past the last of their memories, on to the end of their line */
        var end = P.pts[P.pts.length - 1];
        walker.aim({ x: end.x, y: end.y }, function (f) {
          releaseFlier(f, 1600);
          walker = null;
        });
        walkNext++;
        return;
      }
      var w = walkStops[walkNext++];
      walker.aim({ x: w.x, y: w.y }, function (f) {
        f.hold = 950;
        stepWalk();
      });
    }
    function stopFollow() {
      if (walker) { releaseFlier(walker, 600); walker = null; }
      walkStops = []; walkNext = 0;
    }

    /* --- the one that turns up for a moment when a memory is opened,
       circles it once and goes. */
    var visitor = null;
    function flutterAt(w) {
      if (reduceMotion || !w) return;
      visitor = { cx: w.x, cy: w.y, tone: w.tone, age: 0, life: 2500, ph: 0,
                  r: 24 + hash01(w.id) * 14, dir: hash01(w.id + 'd') < 0.5 ? -1 : 1 };
      wake();
    }

    /* One pair of wings and the thread of light behind them. */
    function wings(g, x, y, tone, alpha, beat, size) {
      g.save();
      g.globalAlpha = alpha;
      g.translate(x, y);
      g.scale(size, size);
      g.fillStyle = tone;
      for (var s = -1; s <= 1; s += 2) {
        g.beginPath();
        g.ellipse(s * 4.2 * beat, 0, 4.6 * beat, 6.8, s * 0.34, 0, TAU);
        g.fill();
      }
      g.globalAlpha = alpha * 0.75;
      g.strokeStyle = PIG.ink;
      g.lineWidth = 1;
      g.beginPath(); g.moveTo(0, -5.5); g.lineTo(0, 6.5); g.stroke();
      g.restore();
      g.globalAlpha = 1;
    }

    function paintFlier(g, f) {
      if (f.trail.length > 1) {
        g.save();
        g.lineCap = 'round';
        g.lineJoin = 'round';
        g.strokeStyle = f.tone;
        for (var i = 1; i < f.trail.length; i++) {
          var k = i / f.trail.length;
          g.globalAlpha = f.a * k * k * (f.kind === 'ambient' ? 0.2 : 0.42);
          g.lineWidth = 0.5 + k * 1.5;
          g.beginPath();
          g.moveTo(f.trail[i - 1].x, f.trail[i - 1].y);
          g.lineTo(f.trail[i].x, f.trail[i].y);
          g.stroke();
        }
        g.restore();
        g.globalAlpha = 1;
      }
      var beat = reduceMotion ? 0.75 : (0.42 + 0.58 * Math.abs(Math.sin(f.ph * 1.7)));
      wings(g, f.x, f.y, f.tone, f.a, beat, f.size);
    }

    function stepFliers(dt) {
      for (var i = fliers.length - 1; i >= 0; i--) {
        fliers[i].step(dt);
        if (fliers[i].done) {
          var gone = fliers.splice(i, 1)[0];
          var k = ambient.indexOf(gone);
          if (k >= 0) ambient.splice(k, 1);
          if (gone === escort) escort = null;
          if (gone === walker) walker = null;
        }
      }
      if (visitor) {
        visitor.age += dt;
        visitor.ph += dt * 0.0032 * visitor.dir;
        if (visitor.age > visitor.life) visitor = null;
      }
    }

    function clearFliers() {
      fliers.length = 0;
      ambient.length = 0;
      escort = null; walker = null; visitor = null;
      walkStops = []; walkNext = 0;
    }

    /* ============================================================== DRAW */
    function draw(time) {
      ctx.fillStyle = PIG.paperEdge;
      ctx.fillRect(0, 0, vw, vh);

      ctx.save();
      ctx.translate(vw / 2, vh / 2);
      ctx.scale(cam.z, cam.z);
      ctx.translate(-cam.x, -cam.y);

      if (sheet) {
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(sheet, 0, 0, MAP.w, MAP.h);
      }

      /* the living layer, culled to what is actually on the paper */
      var tl = unproject(-40, -40), br = unproject(vw + 40, vh + 40);
      var i;
      for (i = 0; i < trees.length; i++) {
        var t = trees[i];
        if (t.x < tl.x || t.x > br.x || t.y < tl.y || t.y > br.y) continue;
        drawTree(ctx, t, time);
      }
      for (i = 0; i < fauna.length; i++) {
        var f = fauna[i];
        if (f.x < tl.x - 120 || f.x > br.x + 120 || f.y < tl.y - 120 || f.y > br.y + 120) continue;
        FAUNA_DRAW[f.kind](ctx, f, time);
      }

      for (i = 0; i < fliers.length; i++) paintFlier(ctx, fliers[i]);
      if (visitor) {
        var k = visitor.age / visitor.life;
        var a = Math.min(1, k * 6) * Math.min(1, (1 - k) * 3.4);
        var rr = visitor.r * (1 + k * 1.5);
        wings(ctx, visitor.cx + Math.cos(visitor.ph) * rr,
              visitor.cy + Math.sin(visitor.ph) * rr * 0.7 - k * 20,
              visitor.tone, a * 0.9,
              0.45 + 0.55 * Math.abs(Math.sin(time * 0.011)), 1);
      }

      ctx.restore();
      drawHud();
    }

    /* Compass and scale live on the glass rather than on the paper, because
       a scale bar that zooms with the map stops being a scale bar. The bar
       is in years: this is a map of a life, and that is its distance. */
    function drawHud() {
      /* North used to be drawn here, on the glass, and hidden on a phone for
         want of a spare corner. It is on the paper now — north does not
         change with the zoom, so it has no business being on the glass, and
         on the sheet every device gets one. What is left here is the scale,
         which does have to be on the glass: a scale bar that zooms with the
         map stops being a scale bar. */
      if (coarse || vw < 700 || inset.top || inset.bottom) return;
      var pad = 20;

      /* the scale, in years */
      var ypp = yearsPerPixel();
      var nice = niceYears(ypp * 120);
      var barPx = nice / ypp;
      var steps = [1, 2, 5, 10, 20, 50, 100];
      for (var si = 0; si < steps.length && barPx > 150; si++) {
        if (steps[si] >= nice) continue;
        nice = steps[si]; barPx = nice / ypp;
      }
      while (barPx > 150 && nice > 1) { nice = Math.max(1, Math.round(nice / 2)); barPx = nice / ypp; }
      while (barPx < 48 && nice < 100) { nice *= 2; barPx = nice / ypp; }
      ctx.save();
      ctx.globalAlpha = 0.72;
      /* directly under the rose, so the two read as one instrument and
         neither lands on anything the room has put down */
      var bx = vw - pad - Math.max(barPx, 40);
      var by = vh - pad - inset.bottom + 6;
      ctx.strokeStyle = PIG.ink;
      ctx.fillStyle = PIG.ink;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(bx, by - 4); ctx.lineTo(bx, by + 4);
      ctx.moveTo(bx, by); ctx.lineTo(bx + barPx, by);
      ctx.moveTo(bx + barPx, by - 4); ctx.lineTo(bx + barPx, by + 4);
      ctx.stroke();
      ctx.font = '11px ui-monospace, Menlo, monospace';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'bottom';
      ctx.fillText('≈ ' + nice + (nice === 1 ? ' year' : ' years'), bx + barPx, by - 7);
      ctx.restore();
    }

    /* How much of a life a pixel is worth here. Derived from the route: its
       whole length is the span of the archive. */
    function yearsPerPixel() {
      if (!waypoints.length || !spineLen.length) return 1;
      var y0 = waypoints[0].year, y1 = waypoints[waypoints.length - 1].year;
      if (!y0 || !y1 || y1 === y0) return 1;
      /* the whole spine is the whole span of the archive */
      var len = spineLen[spineLen.length - 1] || 1;
      return ((y1 - y0) / len) / cam.z;
    }
    function niceYears(v) {
      var steps = [1, 2, 5, 10, 20, 50];
      for (var i = 0; i < steps.length; i++) if (v <= steps[i]) return steps[i];
      return 100;
    }

    /* ========================================================== FURNITURE
       Waypoints, region names and town names, as elements inside one
       transformed layer. `--z` is written once per frame and every label
       counter-scales off it, so type never grows with the paper. */
    function placeFurniture() {
      layer.textContent = '';
      if (!waypoints.length) return;

      /* Everything written on the paper goes through one collision list, so
         a chapter, a name, a trailhead and a memory can never be printed on
         top of one another however the family's dates move. Memories are in
         it first and never move: they are the thing being labelled. */
      var taken = waypoints.map(function (w) {
        return { x: w.x, y: w.y, w: 40, h: 26 };
      });
      /* Step and tries are arguments because the two things using this want
         different amounts of freedom. A memory's caption may wander a long
         way to find room; a label tied to a mark on the braid may not — it
         has to stay near the thing it is labelling, and a label that walks
         three hundred pixels to avoid a collision has not solved anything,
         it has just moved the confusion somewhere else. */
      function clear(p, w, h, dirx, diry, step, tries) {
        step = step || 22;
        tries = tries || 16;
        for (var g = 0; g < tries; g++) {
          var hit = false;
          for (var i = 0; i < taken.length; i++) {
            var q = taken[i];
            if (Math.abs(q.x - p.x) < (q.w + w) / 2 &&
                Math.abs(q.y - p.y) < (q.h + h) / 2) { hit = true; break; }
          }
          if (!hit) break;
          p = { x: p.x + dirx * step, y: p.y + diry * step };
        }
        taken.push({ x: p.x, y: p.y, w: w, h: h });
        return p;
      }

      /* Nothing on this paper is named. The chapters never were — they
         decide the landscape, which ground is savanna, which is alpine,
         where the water is, and an invented name over a real memory only
         makes a true story look made up. The towns went the same way for
         the opposite reason: fifteen real place names, printed at fifteen
         lights, and the map became a page of type with a country behind
         it. Where a memory happened is in the memory, which is one press
         away. The paper keeps the ground, the braid and the lights. */

      /* --- whose line is whose. A name goes where a line is still going,
         and nowhere else. The lines that run in from before the record used
         to be named at their western end too, and that was the one label on
         the map with nothing under it: a name in blank ground, at the edge
         of the paper, marking a beginning nobody wrote down. The braid runs
         in colour and the rail of names is the key to it, so those two have
         a name without needing it printed on empty country. */
      /* Every label on the paper is now two things: a mark that stays exactly
         where the braid put it, and a piece of type that is allowed to move
         out of the way. Before, the whole label moved — so a marriage
         diamond could end up sixty pixels from the two lines it marked, and
         a name could drift off the line it named. What the collision list
         negotiates is where the words go; where the mark goes was never
         negotiable. */
      function labelOffset(anchor, w, h, dirx, diry, reach) {
        var p = clear({ x: anchor.x + dirx * reach, y: anchor.y + diry * reach },
                      w, h, dirx, diry, 11, 5);
        return { dx: p.x - anchor.x, dy: p.y - anchor.y };
      }

      lanes.forEach(function (lane) {
        if (!lane.label) return;
        if (lane.endKind !== 'open') return;
        /* On its own line, near the end of it, where the eye already is when
           it runs out of trail. Not staggered back down the braid: that put
           four names across the middle of the country, each of them nearer
           somebody else's line than its own. */
        /* Far enough back from the end that the name is not written under
           the decade rail, which is fixed to the right of the glass and does
           not move when the paper does. */
        var t = lane.to - 1.7;
        var anchor = laneAt(lane, t);
        var away = laneOffset(lane, t) >= 0 ? 1 : -1;
        var sp0 = onSpine(uOf(t));
        var off = labelOffset(anchor, Math.max(70, lane.label.length * 7.4), 22,
                              sp0.nx * away, sp0.ny * away, 18);
        var b = el('button', 'atlas-name');
        b.type = 'button';
        b.dataset.strand = lane.id;
        b.style.setProperty('--tone', lane.tone);
        b.style.left = clamp(anchor.x, 40, MAP.w - 60) + 'px';
        b.style.top = clamp(anchor.y, 24, MAP.h - 24) + 'px';
        b.style.setProperty('--dx', off.dx.toFixed(1) + 'px');
        b.style.setProperty('--dy', off.dy.toFixed(1) + 'px');
        b.appendChild(el('span', 'atlas-name-mark'));
        b.appendChild(el('span', 'atlas-name-text', lane.label));
        b.setAttribute('aria-pressed', 'false');
        b.setAttribute('aria-label', 'Follow ' + lane.label + '’s trail');
        b.addEventListener('click', function () { emit('person', lane.id); });
        layer.appendChild(b);
      });

      /* --- the joints of the braid: a life starting, two becoming one */
      joints.forEach(function (j) {
        /* A birth is where a life is named, so it is also where you press to
           follow it — the mark and the name are one thing. A marriage names
           no one new, so it stays a mark on the paper. */
        var follows = j.kind === 'birth' && j.strand;
        var n = el(follows ? 'button' : 'div', 'atlas-joint');
        var off = labelOffset({ x: j.x, y: j.y },
                              Math.max(84, j.text.length * 6.2), 20, 0, -1, 15);
        n.dataset.kind = j.kind;
        n.style.setProperty('--tone', j.tone);
        n.style.left = j.x + 'px';
        n.style.top = j.y + 'px';
        n.style.setProperty('--dx', off.dx.toFixed(1) + 'px');
        n.style.setProperty('--dy', off.dy.toFixed(1) + 'px');
        n.appendChild(el('span', 'atlas-joint-mark'));
        n.appendChild(el('span', 'atlas-joint-text', j.text));
        if (follows) {
          n.type = 'button';
          n.dataset.strand = j.strand;
          n.setAttribute('aria-pressed', 'false');
          n.setAttribute('aria-label', 'Follow ' + j.who + '’s trail');
          n.addEventListener('click', function () { emit('person', j.strand); });
        } else {
          n.setAttribute('aria-hidden', 'true');
        }
        layer.appendChild(n);
      });

      /* --- the memories. A light on the ground, in its category's colour.
         It carried a number for a while, the way a trail map numbers its
         segments — but a life is not a set of segments and the numbers only
         told you the order, which the trail itself already tells you. */
      waypoints.forEach(function (w) {
        var b = el('button', 'atlas-wp');
        b.type = 'button';
        b.dataset.id = w.id;
        b.style.left = w.x + 'px';
        b.style.top = w.y + 'px';
        b.style.setProperty('--tone', w.tone);
        b.style.setProperty('--deep', w.deep);
        /* Importance, where the archive has stated any — a featured memory
           carries a wider halo, not a bigger disc, because the numbers along
           a line have to stay one size to be read as a sequence. */
        b.style.setProperty('--w', (0.82 + w.weight * 0.5).toFixed(2));
        if (w.chaos) b.dataset.chaos = '1';
        if (w.classified) b.dataset.classified = '1';
        b.setAttribute('aria-label', w.label);

        b.appendChild(el('span', 'atlas-wp-glow'));
        b.appendChild(el('span', 'atlas-wp-disc'));
        var year = el('span', 'atlas-wp-year');
        year.textContent = w.year || '';
        if (w.year) b.appendChild(year);
        var cap = el('span', 'atlas-wp-cap');
        cap.textContent = w.title;
        b.appendChild(cap);

        b.addEventListener('click', function () { emit('select', w.ref); });
        b.addEventListener('pointerenter', function (e) {
          if (e.pointerType === 'touch') return;
          showTip(w, b, false);
          emit('hover', w.ref);
        });
        b.addEventListener('pointerleave', function () {
          if (!tipFor || !tipFor.viaFocus) hideTip();
        });
        b.addEventListener('focus', function () {
          showTip(w, b, true);
          emit('hover', w.ref);
          goTo(w.x, w.y, Math.max(cam.z, zFit * 2), 520);
        });
        b.addEventListener('blur', hideTip);

        w.node = b;
        layer.appendChild(b);
      });

      /* Where the record starts, and where the paint gives out. No finish:
         the country carries on past the last thing anybody has written. */
      var first = waypoints[0];
      var start = el('div', 'atlas-mark');
      var sp = clear({ x: first.x - 58, y: first.y - 30 }, 108, 26, -0.7, -0.7);
      start.style.left = clamp(sp.x, 70, MAP.w - 70) + 'px';
      start.style.top = sp.y + 'px';
      start.textContent = 'Start · ' + (first.year || '');
      layer.appendChild(start);

      /* And it goes through the collision list like everything else — it was
         the one label that did not, which is how it ended up printed under
         the name of the line it was meant to be following. */
      var last = onSpine(1.0);
      var op = clear({ x: last.x - 30, y: last.y + 96 }, 150, 24, -0.3, 1);
      var on = el('div', 'atlas-mark onward');
      on.style.left = clamp(op.x, 80, MAP.w - 230) + 'px';
      on.style.top = clamp(op.y, 40, MAP.h - 40) + 'px';
      on.textContent = 'The trail continues';
      layer.appendChild(on);

      applyEmphasisToDom();
      markFocus();
    }

    function syncLayer() {
      var s = cam.z;
      layer.style.transform = 'translate(' + (vw / 2) + 'px,' + (vh / 2) + 'px) scale(' + s +
                              ') translate(' + (-cam.x) + 'px,' + (-cam.y) + 'px)';
      layer.style.setProperty('--z', s.toFixed(4));
      /* How much to say is a question of how large the paper is being drawn,
         which is the same question as how much room a name has. Keying it to
         how much country is on screen looks right on a desktop and wrong on
         a phone, where the same stretch of country arrives in a third of the
         width and every town name lands on its neighbour. */
      var next = s < 0.95 ? 'far' : (s < 1.6 ? 'mid' : 'near');
      if (next !== lod) { lod = next; layer.dataset.lod = lod; }
    }

    /* ------------------------------------------------------------- tooltip */
    var tipFor = null;
    function placeTip(node) {
      var r = node.getBoundingClientRect();
      var tr = tip.getBoundingClientRect();
      var left = clamp(r.left + r.width / 2 - tr.width / 2, 8, global.innerWidth - tr.width - 8);
      var top = r.top - tr.height - 10;
      if (top < 8) top = r.bottom + 10;
      tip.style.left = left + 'px';
      tip.style.top = top + 'px';
    }
    function showTip(w, node, viaFocus) {
      if (coarse && !viaFocus) return;
      tip.textContent = '';
      var when = el('span', 'atlas-tip-when');
      when.textContent = w.when || '';
      if (w.when) tip.appendChild(when);
      var t = el('span', 'atlas-tip-title');
      t.textContent = w.title;
      tip.appendChild(t);
      if (w.location) {
        var l = el('span', 'atlas-tip-where');
        l.textContent = w.location;
        tip.appendChild(l);
      }
      tip.style.setProperty('--tone', w.deep);
      tip.hidden = false;
      tipFor = { node: node, viaFocus: !!viaFocus };
      placeTip(node);
    }
    function hideTip() { tip.hidden = true; tipFor = null; }

    /* ========================================================== EMPHASIS */
    function applyEmphasisToDom() {
      var ids = emphasis.ids;
      waypoints.forEach(function (w) {
        if (!w.node) return;
        var on = !ids || ids[w.id];
        var mine = !emphasis.person || w.strand === emphasis.person;
        w.node.dataset.off = on ? '' : '1';
        w.node.dataset.aside = (on && !mine) ? '1' : '';
        w.node.setAttribute('aria-hidden', on ? 'false' : 'true');
        w.node.tabIndex = on ? 0 : -1;
      });
      /* The name of whoever is being followed is marked as chosen, and the
         other lives step back — the same gesture the people rail makes, so
         pressing either one shows the same thing. */
      [].slice.call(layer.querySelectorAll('.atlas-name, .atlas-joint[data-strand]'))
        .forEach(function (n) {
          var mine = n.dataset.strand === emphasis.person;
          n.setAttribute('aria-pressed', mine ? 'true' : 'false');
          n.dataset.off = (emphasis.person && !mine) ? '1' : '';
        });
      drawWanted = true;
    }
    function markFocus() {
      waypoints.forEach(function (w) {
        if (!w.node) return;
        w.node.dataset.on = (w.id === focusedId) ? '1' : '';
      });
      drawWanted = true;
    }



    /* ========================================================= INTERACTION */
    (function pointer() {
      var pts = {}, n = 0, moved = 0;
      var lastMid = null, lastDist = 0;

      function mid() {
        var k = Object.keys(pts), a = pts[k[0]], b = pts[k[1]];
        return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      }
      function dist() {
        var k = Object.keys(pts), a = pts[k[0]], b = pts[k[1]];
        return Math.hypot(a.x - b.x, a.y - b.y) || 1;
      }

      host.addEventListener('pointerdown', function (e) {
        if (e.target.closest && e.target.closest('.atlas-wp')) return;
        pts[e.pointerId] = { x: e.clientX, y: e.clientY };
        n = Object.keys(pts).length;
        moved = 0;
        camTo = null;
        if (n === 2) { lastMid = mid(); lastDist = dist(); }
        host.setPointerCapture(e.pointerId);
        host.dataset.drag = '1';
      });

      host.addEventListener('pointermove', function (e) {
        if (!pts[e.pointerId]) return;
        var prev = pts[e.pointerId];
        pts[e.pointerId] = { x: e.clientX, y: e.clientY };
        n = Object.keys(pts).length;
        if (n === 1) {
          var dx = e.clientX - prev.x, dy = e.clientY - prev.y;
          moved += Math.abs(dx) + Math.abs(dy);
          cam.x -= dx / cam.z;
          cam.y -= dy / cam.z;
          clampCam();
          drawWanted = true;
          if (!tip.hidden) hideTip();
          wake();
        } else if (n === 2) {
          var m = mid(), d = dist();
          var before = unproject(m.x, m.y);
          cam.z = clamp(cam.z * (d / lastDist), zMin, zMax);
          var after = unproject(m.x, m.y);
          cam.x += before.x - after.x - (m.x - lastMid.x) / cam.z;
          cam.y += before.y - after.y - (m.y - lastMid.y) / cam.z;
          lastMid = m; lastDist = d;
          moved += 8;
          clampCam();
          drawWanted = true;
          wake();
        }
      });

      function up(e) {
        if (!pts[e.pointerId]) return;
        delete pts[e.pointerId];
        n = Object.keys(pts).length;
        if (!n) {
          delete host.dataset.drag;
          /* a tap on open country, rather than a drag, means "never mind" */
          if (moved < 7) emit('empty');
        }
        try { host.releasePointerCapture(e.pointerId); } catch (err) { /* gone */ }
      }
      host.addEventListener('pointerup', up);
      host.addEventListener('pointercancel', up);

      host.addEventListener('wheel', function (e) {
        e.preventDefault();
        camTo = null;
        var at = unproject(e.clientX - host.getBoundingClientRect().left,
                           e.clientY - host.getBoundingClientRect().top);
        var f = Math.pow(0.9987, e.deltaY * (e.deltaMode === 1 ? 16 : 1));
        cam.z = clamp(cam.z * f, zMin, zMax);
        var after = unproject(e.clientX - host.getBoundingClientRect().left,
                              e.clientY - host.getBoundingClientRect().top);
        cam.x += at.x - after.x;
        cam.y += at.y - after.y;
        clampCam();
        drawWanted = true;
        if (!tip.hidden) hideTip();
        wake();
      }, { passive: false });

      /* Double tap is the one gesture every map shares. Here it toggles:
         in on whatever was tapped, or — once you are already in — back out
         to the whole country, which is the other thing anybody ever wants
         from a map and would otherwise need a button of its own. */
      function doubleTap(e) {
        var r = host.getBoundingClientRect();
        var at = unproject(e.clientX - r.left, e.clientY - r.top);
        if (cam.z > zFit * 1.28) fitAll(640);
        else goTo(at.x, at.y, clamp(Math.max(cam.z * 2.1, zFit * 2.2), zMin, zMax), 620);
      }
      host.addEventListener('dblclick', doubleTap);

      /* Safari on iOS does not send dblclick to a non-form element, so the
         second tap is counted here as well. */
      var lastTap = 0, lastX = 0, lastY = 0;
      host.addEventListener('pointerup', function (e) {
        if (e.pointerType !== 'touch') return;
        if (e.target.closest && e.target.closest('.atlas-wp')) return;
        var t = now();
        if (t - lastTap < 320 && Math.abs(e.clientX - lastX) < 30 &&
            Math.abs(e.clientY - lastY) < 30) {
          doubleTap(e);
          lastTap = 0;
          return;
        }
        lastTap = t; lastX = e.clientX; lastY = e.clientY;
      });

      /* the keyboard gets the same map: arrows walk it, +/- change the
         scale, 0 puts the whole country back on the screen */
      host.addEventListener('keydown', function (e) {
        var step = 90 / cam.z;
        var k = e.key;
        if (k === 'ArrowLeft') cam.x -= step;
        else if (k === 'ArrowRight') cam.x += step;
        else if (k === 'ArrowUp') cam.y -= step;
        else if (k === 'ArrowDown') cam.y += step;
        else if (k === '+' || k === '=') cam.z = clamp(cam.z * 1.22, zMin, zMax);
        else if (k === '-' || k === '_') cam.z = clamp(cam.z / 1.22, zMin, zMax);
        else if (k === '0') { fitAll(600); e.preventDefault(); return; }
        else return;
        e.preventDefault();
        camTo = null;
        clampCam();
        drawWanted = true;
        wake();
      });
    })();

    /* ============================================================== LOOP */
    function frame(time) {
      rafId = 0;
      if (!active) return;
      var dt = lastFrame ? Math.min(60, time - lastFrame) : 16;
      lastFrame = time;

      if (camTo) stepCam();
      if (fliers.length || visitor) { stepFliers(dt); drawWanted = true; }

      var busy = !!camTo || !!visitor || fliers.length > 0;
      var interval = busy ? 0 : 96;
      if (drawWanted || busy || (!reduceMotion && time - lastDrawn > interval)) {
        syncLayer();
        draw(time);
        drawWanted = false;
        lastDrawn = time;
      }
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
      if (document.hidden) { if (rafId) { global.cancelAnimationFrame(rafId); rafId = 0; } }
      else wake();
    });

    /* ================================================================ API */
    var api = {
      on: on,

      /* Everything the country needs that the archive already knows: its
         places, its eras, and nothing invented here. */
      /* The braid, in the controller's own axis units — the same object the
         canvas lens is handed, so the two cannot disagree about the family —
         plus the archive's places and its decades. */
      setWorld: function (spec) {
        /* `spec.places` is still handed over — it is the archive's, and both
           lenses are given the same world — but the paper no longer prints
           any of it. */
        eras = spec.decades || [];
        laneW = spec.laneW || 0.55;
        trunkId = spec.trunk || null;
        marriedWord = spec.married || 'Married';
        if (spec.axis) axis = { start: spec.axis.start, end: spec.axis.end };

        lanes = (spec.lanes || []).map(function (l) {
          var seed = hash01(l.id);
          return {
            id: l.id, label: l.label || '', tone: l.tone || PIG.trail,
            /* the same colour with the light taken out of it, for the core
               of the line — a life's tone reads on a dark plane and washes
               out on paper, so on paper it is inked as well as bloomed */
            deep: deepen(l.tone || PIG.trail),
            side: l.side || 0, base: l.base || null,
            startKind: l.startKind || 'union', endKind: l.endKind || 'open',
            joinTarget: l.joinTarget || null,
            from: l.from, to: l.to,
            startsAt: l.startsAt === undefined ? null : l.startsAt,
            endsAt: l.endsAt === undefined ? null : l.endsAt,
            /* One number per strand, and the same wander for every life:
               how much the archive happens to say about somebody is not a
               reason to draw their line differently. */
            phase: seed * TAU,
            fadeIn: !!l.fadeIn
          };
        });
        laneById = {};
        lanes.forEach(function (l) { laneById[l.id] = l; });

        /* The year-to-axis anchors, which is all a chapter needs in order to
           know which stretch of the spine it covers. */
        var anchors = [];
        (spec.decades || []).forEach(function (d) {
          if (typeof d.from === 'number' && typeof d.t0 === 'number') anchors.push({ year: d.from, t: d.t0 });
          if (typeof d.to === 'number' && typeof d.t1 === 'number') anchors.push({ year: d.to, t: d.t1 });
        });
        anchors.sort(function (a, b) { return a.year - b.year; });
        yearAnchors = anchors;
        return api;
      },

      /* waypoints: [{ id, year, era, strand, tone, title, when,
                       location, label, weight, chaos, classified, ref }] */
      setLights: function (list) {
        waypoints = (list || []).map(function (w) {
          return {
            id: w.id,
            year: w.year || null,
            t: (w.t === undefined || w.t === null) ? axis.start : w.t,
            era: w.era || null,
            strand: w.strand || null,
            tone: w.tone || PIG.trail,
            deep: deepen(w.tone || PIG.trail),
            title: w.title || '',
            when: w.when || '',
            location: w.location || '',
            label: w.label || w.title || '',
            weight: clamp(w.weight || 0, 0, 1),
            chaos: !!w.chaos,
            classified: !!w.classified,
            ref: w.ref || { id: w.id },
            x: 0, y: 0, node: null, lane: null
          };
        });
        wpById = {};
        waypoints.forEach(function (w) { wpById[w.id] = w; });

        /* Order matters: the braid decides where everything is, the chapters
           are cut from the braid's spine, and the trees are planted inside
           the chapters. */
        buildBraid();
        placeWaypoints();
        buildRegions();
        coastPts = null;
        buildScenery();
        sheet = null;
        return api;
      },

      layout: function () { layout(); return api; },
      resize: function () {
        if (!active) return api;
        sheet = null;
        layout();
        placeFurniture();
        openingView();
        return api;
      },

      activate: function (opts) {
        opts = opts || {};
        if (active) return api;
        active = true;
        host.hidden = false;
        layout();
        placeFurniture();
        lastFrame = 0; lastDrawn = 0; drawWanted = true;
        startAmbient();
        var w = opts.at && wpById[opts.at];
        if (w) { cam.z = zFit; cam.x = MAP.w / 2; cam.y = MAP.h / 2; goTo(w.x, w.y, zFit * 2.4, 0); }
        else openingView();
        camT = 1; camTo = null;
        clampCam();
        syncLayer();
        wake();
        return api;
      },

      deactivate: function () {
        active = false;
        if (rafId) { global.cancelAnimationFrame(rafId); rafId = 0; }
        hideTip();
        clearFliers();
        host.hidden = true;
        return api;
      },

      isActive: function () { return active; },

      focus: function (id, opts) {
        opts = opts || {};
        var changed = id !== focusedId;
        focusedId = id || null;
        markFocus();
        var w = id && wpById[id];
        if (w && active) {
          goTo(w.x, w.y, Math.max(cam.z, zFit * 2.4), opts.instant ? 0 : 780);
          if (changed && !opts.instant) flutterAt(w);
        }
        return api;
      },

      clearFocus: function () { focusedId = null; markFocus(); return api; },

      setEmphasis: function (next) {
        var was = emphasis.person;
        emphasis = {
          category: next.category || null,
          person: next.person || null,
          era: next.era || null,
          ids: next.ids || null
        };
        applyEmphasisToDom();
        if (emphasis.person && emphasis.person !== was) startFollow(emphasis.person);
        if (!emphasis.person) stopFollow();
        wake();
        return api;
      },

      /* A decade is a stretch of country. Frame the memories in it. */
      showEra: function (era) {
        if (!active || !era) return api;
        var inEra = waypoints.filter(function (w) { return w.era === era.id; });
        if (!inEra.length) return api;
        frameOn(inEra);
        return api;
      },

      showPerson: function (id) {
        if (!active) return api;
        var theirs = waypoints.filter(function (w) { return w.lane === id; });
        if (theirs.length) { frameOn(theirs); return api; }
        /* A life with no memories of its own still has a line. Frame that. */
        var P = lanePathFor(id);
        if (P && P.pts.length) frameOn(P.pts.filter(function (p, i) { return i % 12 === 0; }));
        return api;
      },

      /* Follow a category: its own butterfly crosses the country, and the
         memory opens when it gets there. The room's oldest gesture, on a
         map instead of a dark plane. */
      follow: function (opts) { sendTo(opts || {}); return api; },

      fit: function (ms) { if (active) fitAll(ms === undefined ? 700 : ms); return api; },

      setInset: function (top, bottom) {
        inset.top = top || 0;
        inset.bottom = bottom || 0;
        drawWanted = true;
        return api;
      },

      isReduced: function () { return reduceMotion; },
      isCoarse: function () { return coarse; }
    };

    /* Put the camera where a set of memories all fit, with room around them. */
    function frameOn(list) {
      var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      list.forEach(function (w) {
        minX = Math.min(minX, w.x); maxX = Math.max(maxX, w.x);
        minY = Math.min(minY, w.y); maxY = Math.max(maxY, w.y);
      });
      var pad = 160;
      var b = band();
      var usableH = Math.max(120, b.bottom - b.top);
      var z = clamp(Math.min(vw / (maxX - minX + pad * 2), usableH / (maxY - minY + pad * 2)),
                    zFit, zFit * 3);
      goTo((minX + maxX) / 2, (minY + maxY) / 2, z, 820);
    }

    /* The archive's tones were mixed for a black room. On paper they need
       taking down a stop or they read as highlighter — so the disc is the
       deepened tone and the halo around it keeps the original light. */
    /* The same colour at a given alpha, for gradient stops — which cannot
       use globalAlpha. Handles the two forms the room's tones come in. */
    function tint(colour, a) {
      var m = /^#?([0-9a-f]{6})$/i.exec(colour);
      if (m) {
        var v = parseInt(m[1], 16);
        return 'rgba(' + ((v >> 16) & 255) + ',' + ((v >> 8) & 255) + ',' + (v & 255) + ',' + a + ')';
      }
      m = /^rgba?\(([^)]+)\)$/i.exec(colour);
      if (m) {
        var parts = m[1].split(',');
        return 'rgba(' + parts[0] + ',' + parts[1] + ',' + parts[2] + ',' + a + ')';
      }
      return colour;
    }

    function deepen(hex) {
      var m = /^#?([0-9a-f]{6})$/i.exec(hex);
      if (!m) return hex;
      var v = parseInt(m[1], 16);
      var r = (v >> 16) & 255, g = (v >> 8) & 255, b = v & 255;
      r = Math.round(r * 0.62); g = Math.round(g * 0.6); b = Math.round(b * 0.66);
      return 'rgb(' + r + ',' + g + ',' + b + ')';
    }

    host.hidden = true;
    return api;
  }

  global.BUTTERFLY_ATLAS = { create: create, MAP: MAP, REGIONS: REGIONS };
})(window);
