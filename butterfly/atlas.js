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

  function el(tag, cls) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
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
     course by a slow seeded wander before it is drawn. */
  function waver(pts, amp, seed) {
    var r = rng(seed);
    var ph = r() * TAU, ph2 = r() * TAU;
    return pts.map(function (p, i) {
      var a = i * 0.7 + ph, b = i * 0.31 + ph2;
      return { x: p.x + (Math.sin(a) * 0.6 + Math.sin(b) * 0.4) * amp,
               y: p.y + (Math.cos(a * 1.13) * 0.6 + Math.cos(b * 0.87) * 0.4) * amp };
    });
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
    hideDark:   '#5F3A25'
  };

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
      out: 250, rx: 165, ry: 118, wash: PIG.pine, terrain: 'hill' },
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
    var placeById = {}, eras = [];
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
    var SPINE = { x0: 1552, x1: 128, y0: 500, amp: 158, waves: 1.05, drift: 42 };
    var spinePts = [], spineLen = [];

    function buildSpine() {
      var pts = [], n = 170;
      for (var i = 0; i <= n; i++) {
        var k = i / n;
        pts.push({
          x: SPINE.x0 + (SPINE.x1 - SPINE.x0) * k,
          y: SPINE.y0
             + Math.sin(k * TAU * SPINE.waves + 0.55) * SPINE.amp
             + Math.sin(k * TAU * 0.4 + 2.1) * SPINE.drift
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
      /* Off the ends the spine keeps going straight, so a line that runs in
         from before the record still has somewhere to run in from. */
      var over = want < 0 ? want : (want > total ? want - total : 0);
      return {
        x: a.x + dx * k + (over ? dx / d * over : 0),
        y: a.y + dy * k + (over ? dy / d * over : 0),
        nx: -dy / d, ny: dx / d
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
    var LANE_PX = 78;                       /* one lane, in map units */

    function smoothstepL(e0, e1, x) {
      if (e1 === e0) return x < e0 ? 0 : 1;
      var t = clamp((x - e0) / (e1 - e0), 0, 1);
      return t * t * (3 - 2 * t);
    }

    function wobble(t, lane) {
      var a = lane.amp, f = lane.freq;
      return Math.sin(t * f + lane.phase * 6.283) * 0.34 * a
           + Math.sin(t * f * 0.43 + lane.phase * 14.1) * 0.2 * a
           + Math.sin(t * f * 2.2 + lane.phase * 3.9) * 0.06 * a;
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
          /* Two lives do not become one line. They come to travel beside
             each other and keep a hair's width between them, which is the
             honest drawing and the only way both stay findable. */
          var jn = smoothstepL(lane.to - MERGE_W, lane.to, t);
          if (jn > 0) own = lerp(own, laneOffset(target, t, depth + 1) + lane.pairGap, jn);
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

      paintForest(g);
      paintCoastInk(g);
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

      /* the ticks a cartographer uses for open water, thinning as they get
         further from the shore so the eye still goes to the land */
      var r = rng('waves');
      g.save();
      g.globalAlpha = 0.26;
      g.strokeStyle = PIG.seaDeep;
      g.lineWidth = 1.5;
      for (var y = 30; y < MAP.h; y += 30) {
        for (var b = 0; b < 5; b++) {
          var x = r() * MAP.w;
          var w = 34 + r() * 70;
          g.globalAlpha = 0.12 + r() * 0.2;
          g.beginPath();
          g.moveTo(x, y);
          g.bezierCurveTo(x + w * 0.3, y - 5, x + w * 0.7, y + 5, x + w, y);
          g.stroke();
        }
      }
      g.restore();
      g.restore();
      g.globalAlpha = 1;
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
      var n = 74, up = [], down = [], i;
      for (i = 0; i <= n; i++) {
        var k = i / n;
        /* the widest chapter anywhere near this point decides how far the
           land reaches, and both ends taper so the island has a nose */
        var t = lerp(axis.start - 1.6, axis.end + 1.6, k);
        var span = spanAt(t);
        var taper = Math.pow(Math.sin(clamp(k, 0, 1) * Math.PI), 0.42);
        var w = span * 1.62 * taper + 26;
        var sp = onSpine(uOf(t));
        up.push({ x: sp.x + sp.nx * w, y: clamp(sp.y + sp.ny * w, 54, MAP.h - 54) });
        down.push({ x: sp.x - sp.nx * w, y: clamp(sp.y - sp.ny * w, 54, MAP.h - 54) });
      }
      down.reverse();
      coastPts = waver(spline(up.concat(down), 5), 11, 'coast');
      return coastPts;
    }

    /* How wide the country is at a given moment — the widest chapter that
       reaches it, so the coast never cuts a chapter in half. */
    function spanAt(t) {
      var w = 150;
      REGIONS.forEach(function (R) {
        if (R.t0 === undefined) return;
        var pad = 1.2;
        if (t < R.t0 - pad || t > R.t1 + pad) return;
        w = Math.max(w, R.span);
      });
      FEATURES.forEach(function (F) {
        if (F.tAt === undefined) return;
        if (Math.abs(t - F.tAt) > 1.6) return;
        w = Math.max(w, Math.abs(F.out) + Math.max(F.rx, F.ry) * 1.15);
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
      var grad = g.createRadialGradient(6, 812, 24, 6, 812, 300);
      grad.addColorStop(0, 'rgba(244,237,220,0.97)');
      grad.addColorStop(0.5, 'rgba(244,237,220,0.72)');
      grad.addColorStop(1, 'rgba(244,237,220,0)');
      g.fillStyle = grad;
      g.fillRect(0, 512, 340, 488);
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

      /* casing first, all of them, so no line is knocked out of another */
      g.globalAlpha = 0.62;
      g.strokeStyle = PIG.paper;
      lanePaths.forEach(function (P) {
        if (P.pts.length < 2) return;
        g.lineWidth = P.lane.id === trunkId ? 9.5 : 7.5;
        tracePath(g, P.pts, false);
        g.stroke();
      });

      lanePaths.forEach(function (P) {
        if (P.pts.length < 2) return;
        var trunk = P.lane.id === trunkId;
        tracePath(g, P.pts, false);
        g.globalAlpha = 0.16;
        g.strokeStyle = P.lane.tone;
        g.lineWidth = trunk ? 8 : 6;
        g.stroke();
        g.globalAlpha = 0.92;
        g.lineWidth = trunk ? 3.9 : 2.7;
        g.stroke();
        /* a hair of ink along it, so a pale strand still reads on paper */
        g.globalAlpha = 0.3;
        g.strokeStyle = PIG.ink;
        g.lineWidth = 0.7;
        g.stroke();
      });
      g.restore();
      g.globalAlpha = 1;
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
            ph: r() * TAU, sp: 0.55 + r() * 0.8
          });
        }
      });
      trees.sort(function (a, b) { return a.y - b.y; });

      fauna = [
        { kind: 'elk',   x: 0, y: 0, s: 1.25, ph: 0 },
        { kind: 'eagle', x: 0, y: 0, s: 1, ph: 0 },
        { kind: 'dodo',  x: 0, y: 0, s: 0.9, ph: 0 }
      ];
      /* Each animal stands in the country it comes from: the elk over the
         high range, the fish eagle above the far water, the dodo on the
         island off the crossing. */
      placeBeast('elk', REGION_BY.range, -1, 0.95);
      placeBeast('eagle', REGION_BY.water, -1, 1.35);
      var isles = FEATURES.filter(function (f) { return f.id === 'isles'; })[0];
      if (isles) { fauna[2].x = isles.x + isles.rx * 0.1; fauna[2].y = isles.y + isles.ry * 0.72; }
    }

    function placeBeast(kind, R, side, out) {
      var f = fauna.filter(function (x) { return x.kind === kind; })[0];
      if (!f || !R) return;
      var sp = onSpine(uOf((R.t0 + R.t1) / 2));
      f.x = clamp(sp.x + sp.nx * (R.span || 200) * out * side, 110, MAP.w - 110);
      f.y = clamp(sp.y + sp.ny * (R.span || 200) * out * side, 120, MAP.h - 190);
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
      g.fillStyle = PIG.forest;
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
        g.strokeStyle = PIG.forest;
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

    /* --- the animals. Painted shapes: a body wash, a darker edge, and one
       part that moves. Anything more detailed would read as clip art. */
    function paintBlob(g, pts, colour, alpha) {
      g.globalAlpha = alpha;
      g.fillStyle = colour;
      g.beginPath();
      g.moveTo(pts[0][0], pts[0][1]);
      for (var i = 1; i < pts.length; i++) {
        var p = pts[i], q = pts[(i + 1) % pts.length];
        g.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2);
      }
      g.closePath();
      g.fill();
      g.globalAlpha = 1;
    }

    function drawElk(g, f, time) {
      var s = f.s * 40;
      var turn = reduceMotion ? 0 : Math.sin(time * 0.00042) * 0.13;
      var ear = reduceMotion ? 0 : Math.sin(time * 0.0027) * 0.3;
      var breathe = reduceMotion ? 0 : Math.sin(time * 0.0016) * 0.01;
      g.save();
      g.translate(f.x, f.y);
      g.scale(s / 40, s / 40 * (1 + breathe));

      /* Legs first, so the body sits in front of them. Short and heavy —
         the commonest way a drawn animal goes wrong is stilts. */
      g.globalAlpha = 0.88;
      g.strokeStyle = PIG.hideDark;
      g.lineCap = 'round';
      [[-20, 12, -3], [-13, 13, 1], [15, 12, 2], [22, 11, -2]].forEach(function (p, i) {
        g.lineWidth = i < 2 ? 4.6 : 4.2;
        g.beginPath();
        g.moveTo(p[0], p[1]);
        g.quadraticCurveTo(p[0] + p[2], p[1] + 9, p[0] + p[2] * 1.8, p[1] + 19);
        g.stroke();
      });

      /* Body: deep chest forward, higher shoulder than rump, tucked belly. */
      paintBlob(g, [[-27, 2], [-22, -9], [-6, -14], [12, -15], [24, -9],
                    [27, 0], [23, 10], [6, 14], [-12, 13], [-25, 9]],
                PIG.hide, 0.95);
      /* the pale rump patch an elk is known by */
      g.globalAlpha = 0.5;
      g.fillStyle = '#D8B98C';
      g.beginPath();
      g.ellipse(-22, 0, 8, 10, 0.2, 0, TAU);
      g.fill();
      g.globalAlpha = 1;

      /* Neck, head, antlers — the part that moves. */
      g.save();
      g.translate(21, -10);
      g.rotate(turn);
      /* neck */
      paintBlob(g, [[-6, 8], [-2, -4], [4, -16], [11, -23], [15, -20],
                    [10, -10], [6, 0], [3, 8]], PIG.hide, 0.96);
      /* muzzle */
      paintBlob(g, [[9, -25], [16, -29], [22, -27], [22, -22], [15, -19], [10, -20]],
                PIG.hideDark, 0.92);
      g.globalAlpha = 0.95;
      g.fillStyle = '#2C1D12';
      g.beginPath(); g.ellipse(12, -25, 1.9, 1.9, 0, 0, TAU); g.fill();
      /* one ear, flicking */
      g.save();
      g.translate(8, -24);
      g.rotate(-0.5 + ear);
      g.fillStyle = PIG.hide;
      g.globalAlpha = 0.95;
      g.beginPath(); g.ellipse(0, -4, 2.6, 5, 0, 0, TAU); g.fill();
      g.restore();

      /* Antlers: one sweep back per side with tines off the front edge.
         Drawn as two strokes rather than a shape, because an antler is a
         line and a filled one always reads as a plant. */
      g.globalAlpha = 0.92;
      g.strokeStyle = '#7A5638';
      g.lineWidth = 2.2;
      [[-1, 0.86], [1, 1]].forEach(function (side) {
        var sx = side[0], depth = side[1];
        g.save();
        g.scale(1, 1);
        g.beginPath();
        g.moveTo(8, -27);
        g.bezierCurveTo(4 + sx * 3, -40 * depth, 12 + sx * 4, -50 * depth, 26 + sx * 5, -52 * depth);
        g.stroke();
        for (var t = 0; t < 4; t++) {
          var k = 0.22 + t * 0.22;
          var bx = 8 + (26 + sx * 5 - 8) * k * k;
          var by = -27 + (-52 * depth + 27) * (k * 1.15);
          g.beginPath();
          g.moveTo(bx, by);
          g.quadraticCurveTo(bx + 5, by - 9, bx + 9 + t, by - 13 - t);
          g.lineWidth = 1.8 - t * 0.2;
          g.stroke();
        }
        g.restore();
      });
      g.restore();

      /* tail */
      g.globalAlpha = 0.9;
      g.fillStyle = PIG.hideDark;
      g.beginPath(); g.ellipse(-27, -2, 2.4, 5, 0.3, 0, TAU); g.fill();

      g.globalAlpha = 1;
      g.restore();
    }

    function drawEagle(g, f, time) {
      var s = f.s * 38;
      var beat = reduceMotion ? 0.55 : (0.5 + 0.5 * Math.sin(time * 0.0022));
      var glide = reduceMotion ? 0 : Math.sin(time * 0.00035) * 26;
      g.save();
      g.translate(f.x + glide, f.y + Math.cos(time * 0.0004) * 14);
      g.scale(s / 38, s / 38);
      /* body */
      paintBlob(g, [[-6, -18], [4, -14], [8, 4], [4, 22], [-4, 24], [-8, 4]],
                PIG.hideDark, 0.9);
      /* wings, which are all anybody sees of a bird at this distance */
      [-1, 1].forEach(function (side) {
        g.save();
        g.scale(side, 1);
        g.rotate(-0.3 + beat * 0.5);
        paintBlob(g, [[4, -10], [30, -22], [58, -18], [66, -6], [44, 2], [18, 2]],
                  PIG.hideDark, 0.86);
        g.restore();
      });
      /* the white head and tail of a fish eagle */
      g.globalAlpha = 0.95;
      g.fillStyle = '#F6F1E4';
      g.beginPath(); g.ellipse(0, -20, 7, 8, 0, 0, TAU); g.fill();
      g.beginPath(); g.ellipse(0, 25, 8, 6, 0, 0, TAU); g.fill();
      g.globalAlpha = 0.95;
      g.fillStyle = '#D9A03C';
      g.beginPath(); g.moveTo(4, -22); g.lineTo(13, -19); g.lineTo(4, -16); g.closePath(); g.fill();
      g.globalAlpha = 1;
      g.restore();
    }

    function drawDodo(g, f, time) {
      var s = f.s * 40;
      var bob = reduceMotion ? 0 : Math.sin(time * 0.0013) * 2.2;
      var peck = reduceMotion ? 0 : Math.max(0, Math.sin(time * 0.0005)) * 0.32;
      g.save();
      g.translate(f.x, f.y + bob);
      g.scale(s / 40, s / 40);
      /* legs */
      g.globalAlpha = 0.9;
      g.strokeStyle = '#B08A4E';
      g.lineWidth = 3.4;
      [[-6, 18], [6, 18]].forEach(function (p) {
        g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(p[0], p[1] + 14); g.stroke();
      });
      /* body */
      paintBlob(g, [[-26, 0], [-18, -18], [0, -24], [18, -16], [24, 2],
                    [14, 18], [-8, 20], [-24, 12]], '#A9A290', 0.92);
      g.save();
      g.translate(-20, -14);
      g.rotate(peck);
      paintBlob(g, [[-10, 2], [-8, -10], [0, -16], [8, -10], [8, 2], [0, 8]],
                '#A9A290', 0.94);
      g.globalAlpha = 0.95;
      g.fillStyle = '#8A7A5E';
      g.beginPath();
      g.moveTo(-8, -6); g.quadraticCurveTo(-24, -2, -20, 8);
      g.quadraticCurveTo(-12, 4, -6, 2); g.closePath(); g.fill();
      g.fillStyle = PIG.ink;
      g.beginPath(); g.ellipse(1, -8, 2.2, 2.2, 0, 0, TAU); g.fill();
      g.restore();
      /* the plume it is famous for */
      g.globalAlpha = 0.7;
      g.strokeStyle = '#C6BEA8';
      g.lineWidth = 2.6;
      for (var i = 0; i < 4; i++) {
        g.beginPath();
        g.moveTo(20, 4);
        g.quadraticCurveTo(32 + i * 2, -4 - i * 3, 30 + i * 5, 6 - i * 4);
        g.stroke();
      }
      g.globalAlpha = 1;
      g.restore();
    }

    var FAUNA_DRAW = { elk: drawElk, eagle: drawEagle, dodo: drawDodo };

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
      /* The instrument needs a spare corner, and there are two ways not to
         have one: a phone, whose bottom the room's own furniture already
         owns, and an open memory, which leaves the map a strip. A compass
         rose is the first thing a map can do without. */
      if (coarse || vw < 700 || inset.top || inset.bottom) return;
      var pad = 20;
      var size = 54;
      var cx = vw - pad - size / 2;
      var cy = vh - pad - size / 2 - 30 - inset.bottom;
      ctx.save();
      ctx.globalAlpha = 0.75;
      ctx.translate(cx, cy);
      ctx.strokeStyle = PIG.ink;
      ctx.fillStyle = PIG.ink;
      ctx.lineWidth = 1.1;
      ctx.beginPath(); ctx.arc(0, 0, size / 2, 0, TAU); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, size / 2 - 4, 0, TAU);
      ctx.globalAlpha = 0.2; ctx.stroke(); ctx.globalAlpha = 0.75;
      for (var q = 0; q < 4; q++) {
        ctx.save(); ctx.rotate(q * Math.PI / 2);
        ctx.beginPath();
        ctx.moveTo(0, -size / 2 + 3);
        ctx.lineTo(size * 0.1, 0);
        ctx.lineTo(0, size * 0.16);
        ctx.lineTo(-size * 0.1, 0);
        ctx.closePath();
        ctx.globalAlpha = q === 0 ? 0.85 : 0.3;
        ctx.fill();
        ctx.restore();
      }
      ctx.globalAlpha = 0.85;
      ctx.font = '600 ' + Math.round(size * 0.2) + 'px Georgia, "Iowan Old Style", serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('N', 0, -size * 0.34);
      ctx.restore();

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
      function clear(p, w, h, dirx, diry) {
        for (var g = 0; g < 16; g++) {
          var hit = false;
          for (var i = 0; i < taken.length; i++) {
            var q = taken[i];
            if (Math.abs(q.x - p.x) < (q.w + w) / 2 &&
                Math.abs(q.y - p.y) < (q.h + h) / 2) { hit = true; break; }
          }
          if (!hit) break;
          p = { x: p.x + dirx * 22, y: p.y + diry * 22 };
        }
        taken.push({ x: p.x, y: p.y, w: w, h: h });
        return p;
      }

      /* The chapters are not named. They still decide the landscape — which
         ground is savanna, which is alpine, where the water is — but an
         invented place name on a map of real memories does the archive a
         disservice: it makes a true story look like a made-up one. The only
         names on this paper are the ones the archive itself supplies.

      /* --- the towns. Every place a memory actually happened in gets its
         name on the paper, at the memory that happened there — so the map's
         settlements come out of the archive rather than out of a list kept
         here that would drift the moment a story was added. */
      var townAt = {};
      waypoints.forEach(function (w) {
        if (!w.place || townAt[w.place] || !placeById[w.place]) return;
        townAt[w.place] = w;
      });
      Object.keys(townAt).forEach(function (id, i) {
        var w = townAt[id];
        var n = el('div', 'atlas-town');
        /* alternate which side of its memory a town writes itself, so two
           near neighbours do not print over one another */
        n.dataset.side = (i % 2) ? 'left' : 'right';
        n.style.left = w.x + 'px';
        n.style.top = (w.y + (i % 4 < 2 ? -22 : 22)) + 'px';
        var dot = el('span', 'atlas-town-dot');
        var name = el('span', 'atlas-town-name');
        name.textContent = placeById[id].name;
        n.appendChild(dot);
        n.appendChild(name);
        layer.appendChild(n);
      });

      /* --- whose line is whose. Written at whichever end of a life stays
         open — the lines that run in from before the record are named in
         the east, the lines still going are named in the west — and
         pressable, because a name is how you follow somebody. */
      /* The canvas trail names a line only at whichever end of it stays
         open, and lets its markers name the rest. A map cannot do that: a
         name here is the thing you press to follow somebody, so every life
         gets one, written on its own line — at the start for a line running
         in from before the record, near the end for one still going, and in
         the middle of a life that both begins and joins inside the braid. */
      var nameN = 0;
      lanes.forEach(function (lane) {
        if (!lane.label) return;
        var openStart = lane.startKind === 'origin';
        var openEnd = lane.endKind === 'open';
        var t = openStart ? lane.from + 0.2 + nameN * 0.34
              : (openEnd ? lane.to - 0.4 - nameN * 1.5
                         : lane.from + (lane.to - lane.from) * 0.42);
        nameN++;
        var p = laneAt(lane, t);
        /* Every line still going ends at the same moment, so their names
           would otherwise be written on the same row. Each steps off its own
           line until it is clear — the way its line already leans, so a name
           never crosses the braid to find room. */
        var away = laneOffset(lane, t) >= 0 ? 1 : -1;
        var sp0 = onSpine(uOf(t));
        p = clear(p, Math.max(70, lane.label.length * 8), 28,
                  sp0.nx * away, sp0.ny * away);
        var b = el('button', 'atlas-name');
        b.type = 'button';
        b.dataset.strand = lane.id;
        b.style.setProperty('--tone', lane.tone);
        b.style.left = clamp(p.x, 60, MAP.w - 60) + 'px';
        b.style.top = clamp(p.y, 30, MAP.h - 30) + 'px';
        b.textContent = lane.label;
        b.setAttribute('aria-pressed', 'false');
        b.setAttribute('aria-label', 'Follow ' + lane.label + '’s trail');
        b.addEventListener('click', function () { emit('person', lane.id); });
        layer.appendChild(b);
      });

      /* --- the joints of the braid: a life starting, two becoming one */
      joints.forEach(function (j) {
        var n = el('div', 'atlas-joint');
        var jp = clear({ x: j.x, y: j.y }, Math.max(80, j.text.length * 6), 24, 0, -1);
        n.dataset.kind = j.kind;
        n.style.setProperty('--tone', j.tone);
        n.style.left = jp.x + 'px';
        n.style.top = jp.y + 'px';
        n.setAttribute('aria-hidden', 'true');
        var mark = el('span', 'atlas-joint-mark');
        var text = el('span', 'atlas-joint-text');
        text.textContent = j.text;
        n.appendChild(mark);
        n.appendChild(text);
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
      var sp = clear({ x: first.x, y: first.y - 34 }, 108, 26, -0.6, -0.8);
      start.style.left = clamp(sp.x, 70, MAP.w - 70) + 'px';
      start.style.top = sp.y + 'px';
      start.textContent = 'Start · ' + (first.year || '');
      layer.appendChild(start);

      var last = onSpine(1.05);
      var on = el('div', 'atlas-mark onward');
      on.style.left = clamp(last.x - 40, 80, MAP.w - 80) + 'px';
      on.style.top = clamp(last.y + 86, 40, MAP.h - 40) + 'px';
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
      [].slice.call(layer.querySelectorAll('.atlas-name')).forEach(function (n) {
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
        placeById = {};
        (spec.places || []).forEach(function (p) { placeById[p.id] = p; });
        eras = spec.decades || [];
        laneW = spec.laneW || 0.55;
        trunkId = spec.trunk || null;
        marriedWord = spec.married || 'Married';
        if (spec.axis) axis = { start: spec.axis.start, end: spec.axis.end };

        lanes = (spec.lanes || []).map(function (l) {
          var seed = hash01(l.id);
          return {
            id: l.id, label: l.label || '', tone: l.tone || PIG.trail,
            side: l.side || 0, base: l.base || null,
            startKind: l.startKind || 'union', endKind: l.endKind || 'open',
            joinTarget: l.joinTarget || null,
            from: l.from, to: l.to,
            startsAt: l.startsAt === undefined ? null : l.startsAt,
            endsAt: l.endsAt === undefined ? null : l.endsAt,
            phase: seed,
            /* How much a life wanders. A line the archive has a lot to say
               about wanders visibly; one it barely knows keeps closer to its
               lane, because there is less of it to wander with. */
            amp: 0.5 + (l.weight || 0) * 0.42 + seed * 0.26,
            freq: 0.74 + seed * 0.4,
            /* Two lines that marry travel side by side rather than fusing.
               Which side is decided by where each came from, so neither
               crosses over its partner to get there. */
            pairGap: (l.side < 0 ? -1 : 1) * 0.2
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

      /* waypoints: [{ id, place, year, era, strand, tone, title, when,
                       location, label, weight, chaos, classified, ref }] */
      setLights: function (list) {
        waypoints = (list || []).map(function (w) {
          return {
            id: w.id,
            place: w.place || null,
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
