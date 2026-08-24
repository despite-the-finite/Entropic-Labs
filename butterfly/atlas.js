/* Entropic Labs — Butterfly Trails, the atlas.
   ==========================================================================
   A trail map of one family, drawn the way a long-distance trail gets drawn:
   the whole country on one sheet, a route running through it, and the
   memories numbered along the route in the order they happened.

   The country is invented. Its regions are not — each one is an era of the
   archive wearing the landscape of wherever that era actually happened, so
   the map is made of the real places without pretending to be a real map:

     The Long Plain        Lucknow, Kolkata          the years before
     The Copper Veld       Kitwe, Chingola, Lusaka   the Zambian childhood
     The Deodar Hills      Nainital                  the mountain school
     The Flat Country      Peoria, Illinois          university
     The Turquoise Isles   Péreybère, Chamarel       Mauritius
     The Front Range       Denver, Steamboat         Colorado
     The Great Falls       Livingstone               the return
     The Near Country      now                       and then the paper stops

   The veld sits at the centre because the archive keeps going back to it.
   Everything else radiates off it, so the route leaves and returns the way a
   life does, and the map ends not at a summit but at the edge of what has
   been painted — the country carries on into blank paper.

   How it is drawn
     The whole static map — paper, land, water, terrain, the route itself —
     is painted once into an offscreen canvas at map resolution and then
     blitted under the camera. Only what actually moves is drawn per frame:
     the trees, the animals, one butterfly. That is what buys a watercolour
     this detailed on a phone.

     Everything with words in it is a real DOM element inside one transformed
     layer, so panning and zooming is a single transform rather than a
     hundred style writes, and the labels counter-scale through one custom
     property so type stays type at every zoom.

   Coordinate spaces
     map      the country's own units, 1600 × 1000. Everything below is in
              these unless it says otherwise.
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
     Regions are eras. The veld is the middle because the archive keeps
     coming back to it; everything else is a spur off it.
     ------------------------------------------------------------------------ */
  var REGIONS = [
    { id: 'plain', name: 'The Long Plain', sub: 'Lucknow · Kolkata',
      x: 1330, y: 620, rx: 215, ry: 175, wash: PIG.plain, terrain: 'plain', lx: -128, ly: -104 },
    { id: 'hills', name: 'The Deodar Hills', sub: 'Nainital',
      x: 1235, y: 195, rx: 175, ry: 130, wash: PIG.pine, terrain: 'hill' },
    { id: 'flat', name: 'The Flat Country', sub: 'Peoria',
      x: 455, y: 172, rx: 200, ry: 122, wash: PIG.prairie, terrain: 'prairie' },
    { id: 'veld', name: 'The Copper Veld', sub: 'Kitwe · Chingola · Lusaka',
      x: 815, y: 505, rx: 270, ry: 215, wash: PIG.veld, terrain: 'bush', ly: 150 },
    { id: 'range', name: 'The Front Range', sub: 'Denver · Steamboat',
      x: 305, y: 520, rx: 215, ry: 225, wash: PIG.rock, terrain: 'peak', ly: 175 },
    { id: 'isles', name: 'The Turquoise Isles', sub: 'Péreybère · Chamarel',
      x: 1330, y: 830, rx: 118, ry: 88, wash: PIG.lagoon, terrain: 'isle', island: true, lx: 132, ly: -6 },
    { id: 'falls', name: 'The Great Falls', sub: 'Livingstone',
      x: 800, y: 880, rx: 165, ry: 110, wash: PIG.gorge, terrain: 'falls', lx: -20, ly: 78 },
    { id: 'near', name: 'The Near Country', sub: 'now',
      x: 330, y: 880, rx: 140, ry: 100, wash: PIG.near, terrain: 'soft' }
  ];
  var REGION_BY = {};
  REGIONS.forEach(function (r) { REGION_BY[r.id] = r; });

  /* Which region a memory's place belongs to. A place the archive adds later
     and this table has not heard of falls back to the region its neighbours
     in time are in, so a new story never lands nowhere. */
  var PLACE_REGION = {
    lucknow: 'plain', kolkata: 'plain', india: 'plain',
    kitwe: 'veld', chingola: 'veld', lusaka: 'veld', zambia: 'veld',
    nainital: 'hills',
    bradley: 'flat', illinois: 'flat',
    mauritius: 'isles', pereybere: 'isles', chamarel: 'isles',
    denver: 'range', ptarmigan: 'range', trestle: 'range', 'lookout-mountain': 'range',
    'ken-caryl': 'range', chatfield: 'range', lakewood: 'range', centennial: 'range',
    'emerald-mountain': 'range', haverford: 'range', loveland: 'range',
    'idaho-springs': 'range', california: 'range',
    livingstone: 'falls', avani: 'falls', 'livingstone-island': 'falls',
    'victoria-falls-bridge': 'falls',
    america: 'near', china: 'near'
  };

  /* Towns. They are labels on the paper, not data — the archive's own place
     list decides which ones a reader ever sees, because a settlement is only
     drawn where a memory actually happened. */
  var SETTLEMENTS = [
    { place: 'lucknow', region: 'plain', dx: -60, dy: -40 },
    { place: 'kolkata', region: 'plain', dx: 95, dy: 60 },
    { place: 'nainital', region: 'hills', dx: 0, dy: 20 },
    { place: 'kitwe', region: 'veld', dx: -105, dy: -85 },
    { place: 'chingola', region: 'veld', dx: 70, dy: -110 },
    { place: 'lusaka', region: 'veld', dx: 120, dy: 95 },
    { place: 'bradley', region: 'flat', dx: 0, dy: 10 },
    { place: 'pereybere', region: 'isles', dx: 40, dy: -45 },
    { place: 'chamarel', region: 'isles', dx: -45, dy: 40 },
    { place: 'denver', region: 'range', dx: 80, dy: 60 },
    { place: 'ptarmigan', region: 'range', dx: -60, dy: -110 },
    { place: 'trestle', region: 'range', dx: -110, dy: 20 },
    { place: 'lookout-mountain', region: 'range', dx: 105, dy: -70 },
    { place: 'loveland', region: 'range', dx: 30, dy: -160 },
    { place: 'livingstone', region: 'falls', dx: -30, dy: -30 }
  ];

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
    var route = [], routeLen = 0;
    var trees = [], fauna = [];
    var placeById = {}, eras = [];
    var emphasis = { category: null, person: null, era: null, ids: null };
    var focusedId = null;
    var inset = { top: 0, bottom: 0 };
    var flier = null, visitor = null;
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
      REGIONS.forEach(function (R) { paintRegion(g, R); });
      paintRivers(g);
      REGIONS.forEach(function (R) { paintTerrain(g, R); });
      paintCoastInk(g);
      paintRoute(g);
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

    function paintSea(g) {
      var pts = waver(spline([
        { x: MAP.w + 70, y: 250 }, { x: 1476, y: 400 }, { x: 1392, y: 570 },
        { x: 1258, y: 668 }, { x: 1152, y: 782 }, { x: 1062, y: 918 },
        { x: 960, y: MAP.h + 70 }, { x: MAP.w + 90, y: MAP.h + 90 }
      ], 14), 5, 'sea');
      wash(g, pts, PIG.sea, 0.85, 'sea-a');
      wash(g, pts, PIG.seaDeep, 0.28, 'sea-b');

      /* the horizontal ticks a cartographer uses for open water */
      g.save();
      tracePath(g, pts, true);
      g.clip();
      g.globalAlpha = 0.3;
      g.strokeStyle = PIG.seaDeep;
      g.lineWidth = 1.6;
      var r = rng('waves');
      for (var y = 300; y < MAP.h + 60; y += 26) {
        var x = 1050 + r() * 460;
        var w = 40 + r() * 90;
        g.beginPath();
        g.moveTo(x, y);
        g.bezierCurveTo(x + w * 0.3, y - 5, x + w * 0.7, y + 5, x + w, y);
        g.stroke();
      }
      g.restore();
      g.globalAlpha = 1;
    }

    /* The mainland. One irregular mass, deliberately unfinished at the
       south-west, where the paint gives out and the country carries on. */
    var coastPts = null;
    function coast() {
      if (coastPts) return coastPts;
      coastPts = waver(spline([
        { x: 620, y: 40 }, { x: 1000, y: 52 }, { x: 1300, y: 34 }, { x: 1466, y: 156 },
        { x: 1494, y: 336 }, { x: 1452, y: 512 }, { x: 1330, y: 618 }, { x: 1206, y: 700 },
        { x: 1128, y: 812 }, { x: 1010, y: 930 }, { x: 800, y: 972 }, { x: 560, y: 984 },
        { x: 320, y: 962 }, { x: 118, y: 852 }, { x: 42, y: 648 }, { x: 62, y: 428 },
        { x: 126, y: 246 }, { x: 306, y: 108 }
      ], 16), 8, 'coast');
      return coastPts;
    }

    function paintLand(g) {
      var pts = coast();
      wash(g, pts, PIG.land, 0.62, 'land-a');
      wash(g, pts, '#B9CE95', 0.22, 'land-b');
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
      g.globalAlpha = 0.34;
      g.strokeStyle = PIG.ink;
      g.lineWidth = 1.5;
      tracePath(g, pts, true);
      g.stroke();
      g.restore();
    }

    function regionShape(R) {
      if (R.shape) return R.shape;
      R.shape = waver(spline(ring(R.x, R.y, R.rx, R.ry, 15, 0.5, R.id), 8), 11, R.id + 'w');
      return R.shape;
    }

    function paintRegion(g, R) {
      var pts = regionShape(R);
      wash(g, pts, R.wash, R.island ? 0.72 : 0.34, R.id + 'wash', !!R.island);
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
      g.save();
      tracePath(g, pts, true);
      g.clip();
      g.lineCap = 'round';
      g.lineJoin = 'round';

      var n, i, x, y, s;
      if (R.terrain === 'peak' || R.terrain === 'hill') {
        var big = R.terrain === 'peak';
        n = Math.round((big ? 64 : 30) * (0.7 + quality * 0.4));
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
        n = Math.round(230 * (0.6 + quality * 0.5));
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
        n = Math.round(40 * (0.6 + quality * 0.6));
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
        n = Math.round(270 * (0.6 + quality * 0.5));
        for (i = 0; i < n; i++) {
          x = R.x + (r() - 0.5) * R.rx * 1.95;
          y = R.y + (r() - 0.5) * R.ry * 1.95;
          g.globalAlpha = 0.14 + r() * 0.2;
          g.strokeStyle = R.terrain === 'plain' ? PIG.hide : PIG.forest;
          g.lineWidth = 1.1;
          var w = 5 + r() * 11;
          g.beginPath(); g.moveTo(x, y); g.lineTo(x + w, y - (r() - 0.5) * 3); g.stroke();
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

    /* =========================================================== THE ROUTE
       The memories in the order they happened, each placed in the region its
       own place belongs to, joined by a walked line. Where the route leaves
       the veld and comes back it bows out one way and returns the other, so
       an out-and-back reads as a loop rather than as one line drawn twice. */
    function buildRoute() {
      if (!waypoints.length) { route = []; return; }
      waypoints.forEach(function (w, i) { w.i = i; });

      /* A run is a stretch of consecutive memories that happened in the same
         region. The route enters a region once per run, wanders through its
         memories, and leaves — which is what stops four separate returns to
         the veld from being drawn as four lines across the same ground. */
      var runs = [];
      waypoints.forEach(function (w) {
        var last = runs[runs.length - 1];
        if (last && last.region === w.region) last.list.push(w);
        else runs.push({ region: w.region, list: [w] });
      });

      var ENTRY = { x: MAP.w + 110, y: 690 };      /* the road in, off the east */
      var EXIT = { x: 28, y: 790 };                /* and where the paint ends */

      function norm(dx, dy) {
        var d = Math.sqrt(dx * dx + dy * dy) || 1;
        return { x: dx / d, y: dy / d };
      }
      /* A point on a region's rim, in the direction of somewhere else. */
      function rim(R, towards, f) {
        var n = norm(towards.x - R.x, towards.y - R.y);
        return { x: R.x + n.x * R.rx * f, y: R.y + n.y * R.ry * f };
      }

      runs.forEach(function (run, ri) {
        var R = REGION_BY[run.region] || REGION_BY.veld;
        var before = ri > 0 ? (REGION_BY[runs[ri - 1].region] || R) : null;
        var after = ri < runs.length - 1 ? (REGION_BY[runs[ri + 1].region] || R) : null;
        run.R = R;
        run.enter = rim(R, before || ENTRY, 0.78);
        run.leave = rim(R, after || EXIT, 0.78);

        /* Where the wander through this region bulges. A run of one memory
           still gets a bulge, so the route bends around it rather than
           clipping the corner of the region on its way past. */
        var mx = (run.enter.x + run.leave.x) / 2;
        var my = (run.enter.y + run.leave.y) / 2;
        var toC = norm(R.x - mx, R.y - my);
        var seed = hash01(run.region + ri);
        /* the more memories a region holds, the further into it the route
           has to go to fit them all in without stacking them on one bend */
        var crowd = 1 + Math.max(0, run.list.length - 2) * 0.18;
        var push = Math.min((0.5 + seed * 0.7) * Math.min(R.rx, R.ry) * 0.9 * crowd,
                            Math.min(R.rx, R.ry) * 1.05);
        run.bulge = { x: mx + toC.x * push, y: my + toC.y * push };

        /* the memories, spread along that bend in the order they happened */
        var k = run.list.length;
        run.list.forEach(function (w, j) {
          var t = k === 1 ? 0.5 : 0.1 + (j / (k - 1)) * 0.8;
          var u = 1 - t;
          var jit = hash01(w.id) - 0.5;
          var jit2 = hash01(w.id + 'y') - 0.5;
          var spread = k > 2 ? 0.4 : 0.24;
          w.x = u * u * run.enter.x + 2 * u * t * run.bulge.x + t * t * run.leave.x
                + jit * R.rx * spread;
          w.y = u * u * run.enter.y + 2 * u * t * run.bulge.y + t * t * run.leave.y
                + jit2 * R.ry * spread;
        });
      });

      /* The control polyline: in at the rim, round the bend past every
         memory, out at the rim, then one bowed midpoint on the leg to the
         next region. Consecutive legs bow opposite ways, so a trip out and
         the trip back open into a loop instead of lying on top of each
         other — which is exactly what an out-and-back looks like when a
         cartographer draws one. */
      var ctrl = [ENTRY];
      runs.forEach(function (run, ri) {
        ctrl.push(run.enter);
        if (run.list.length > 1) ctrl.push(run.bulge);
        run.list.forEach(function (w) { ctrl.push({ x: w.x, y: w.y }); });
        ctrl.push(run.leave);

        var to = ri < runs.length - 1 ? runs[ri + 1] : null;
        var target = to ? to.enter : EXIT;
        var dx = target.x - run.leave.x, dy = target.y - run.leave.y;
        var d = Math.sqrt(dx * dx + dy * dy);
        if (d > 150) {
          var side = (ri % 2 === 0) ? 1 : -1;
          var bow = clamp(d * 0.17, 30, 130) * side;
          ctrl.push({
            x: (run.leave.x + target.x) / 2 - dy / d * bow,
            y: (run.leave.y + target.y) / 2 + dx / d * bow
          });
        }
      });
      ctrl.push(EXIT);
      ctrl.push({ x: -130, y: 762 });

      route = waver(spline(ctrl, 14), 2.4, 'route');

      /* Nothing is allowed to sit on top of anything else. Two memories that
         land within a disc of each other are eased apart along the line
         between them — the same fan the canvas trail does for a shared year,
         done in two dimensions because a map has them. */
      for (var pass = 0; pass < 5; pass++) {
        var moved = false;
        for (var a = 0; a < waypoints.length; a++) {
          for (var b = a + 1; b < waypoints.length; b++) {
            var A = waypoints[a], B = waypoints[b];
            var dx2 = B.x - A.x, dy2 = B.y - A.y;
            var dd2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
            if (dd2 >= 38) continue;
            var push2 = (38 - dd2) / 2 + 0.5;
            if (dd2 < 0.001) { dx2 = 1; dy2 = 0; dd2 = 1; }
            A.x -= dx2 / dd2 * push2; A.y -= dy2 / dd2 * push2;
            B.x += dx2 / dd2 * push2; B.y += dy2 / dd2 * push2;
            moved = true;
          }
        }
        if (!moved) break;
      }

      /* where on the polyline each memory sits, for the butterfly to rest at */
      waypoints.forEach(function (w) {
        var best = 0, bd = Infinity;
        for (var j = 0; j < route.length; j++) {
          var ddx = route[j].x - w.x, ddy = route[j].y - w.y;
          var dd = ddx * ddx + ddy * ddy;
          if (dd < bd) { bd = dd; best = j; }
        }
        w.at = best;
      });
      routeLen = route.length;
    }

    function paintRoute(g) {
      if (route.length < 2) return;
      g.save();
      g.lineJoin = 'round';
      g.lineCap = 'round';
      /* a pale casing under the line, the way a printed route is knocked out
         of whatever it crosses so it stays readable over terrain */
      g.globalAlpha = 0.72;
      g.strokeStyle = PIG.paper;
      g.lineWidth = 7.5;
      tracePath(g, route, false);
      g.stroke();
      g.globalAlpha = 0.92;
      g.strokeStyle = PIG.trail;
      g.lineWidth = 2.6;
      g.stroke();
      g.globalAlpha = 0.34;
      g.strokeStyle = PIG.trailInk;
      g.lineWidth = 0.9;
      g.stroke();
      g.restore();
      g.globalAlpha = 1;
    }

    /* ============================================================ SCENERY
       The part that moves. A few dozen trees that lean in the wind and a
       handful of animals, drawn as painted silhouettes rather than as
       portraits — a map illustration, not a field guide. */
    function buildScenery() {
      var r = rng('trees');
      trees = [];
      var want = Math.round(58 * (0.5 + quality * 0.7));
      var pools = [
        { id: 'range', n: 0.3, kind: 'conifer' },
        { id: 'hills', n: 0.22, kind: 'conifer' },
        { id: 'veld', n: 0.28, kind: 'flat' },
        { id: 'flat', n: 0.1, kind: 'round' },
        { id: 'near', n: 0.1, kind: 'round' }
      ];
      pools.forEach(function (p) {
        var R = REGION_BY[p.id];
        var n = Math.round(want * p.n);
        for (var i = 0; i < n; i++) {
          var a = r() * TAU, rad = Math.sqrt(r());
          trees.push({
            x: R.x + Math.cos(a) * R.rx * rad * 0.92,
            y: R.y + Math.sin(a) * R.ry * rad * 0.92,
            s: 9 + r() * 11,
            kind: p.kind,
            ph: r() * TAU,
            sp: 0.6 + r() * 0.7
          });
        }
      });
      trees.sort(function (a, b) { return a.y - b.y; });

      fauna = [
        { kind: 'elk',   x: 300, y: 250, s: 1.25, ph: 0 },
        { kind: 'eagle', x: 1382, y: 306, s: 1, ph: 0, drift: 0 },
        { kind: 'dodo',  x: 1232, y: 872, s: 0.9, ph: 0 }
      ];
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
       One walks the route of whoever is being followed. One turns up when a
       memory is opened, circles it and goes. Neither is on a timer. */
    function Walker(ids, tone) {
      this.tone = tone;
      this.stops = ids.slice();
      this.i = 0;
      this.hold = 0;
      this.ph = 0;
      this.next = 0;
      this.a = 0;
      var first = wpById[this.stops[0]];
      this.i = first ? Math.max(0, first.at - 60) : 0;
      this.x = route.length ? route[this.i].x : 0;
      this.y = route.length ? route[this.i].y : 0;
    }
    Walker.prototype.step = function (dt) {
      if (!route.length) return;
      this.a = Math.min(1, this.a + dt / 600);
      this.ph += dt * 0.013;
      if (this.hold > 0) { this.hold -= dt; return; }
      this.i += dt * 0.06;
      if (this.i >= route.length - 1) {
        var f = wpById[this.stops[0]];
        this.i = f ? Math.max(0, f.at - 60) : 0;
        this.next = 0;
      }
      var p = route[Math.floor(this.i)];
      this.x = p.x; this.y = p.y;
      while (this.next < this.stops.length) {
        var w = wpById[this.stops[this.next]];
        if (w && this.i >= w.at) { this.hold = 950; this.next++; break; }
        if (!w) { this.next++; continue; }
        break;
      }
    };

    function wings(g, x, y, tone, alpha, beat, size) {
      g.save();
      g.globalAlpha = alpha;
      g.translate(x, y);
      g.scale(size, size);
      g.fillStyle = tone;
      for (var s = -1; s <= 1; s += 2) {
        g.beginPath();
        g.ellipse(s * 4 * beat, 0, 4.4 * beat, 6.6, s * 0.34, 0, TAU);
        g.fill();
      }
      g.globalAlpha = alpha * 0.6;
      g.strokeStyle = PIG.ink;
      g.lineWidth = 0.9;
      g.beginPath(); g.moveTo(0, -5); g.lineTo(0, 6); g.stroke();
      g.restore();
      g.globalAlpha = 1;
    }

    function flutterAt(w) {
      if (reduceMotion || !w) return;
      visitor = { cx: w.x, cy: w.y, tone: w.tone, age: 0, life: 2500,
                  ph: 0, r: 22 + hash01(w.id) * 14,
                  dir: hash01(w.id + 'd') < 0.5 ? -1 : 1 };
      wake();
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

      if (flier) {
        var beat = reduceMotion ? 0.75 : (0.45 + 0.55 * Math.abs(Math.sin(flier.ph)));
        wings(ctx, flier.x, flier.y, flier.tone, flier.a, beat, 1.1);
      }
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
      if (!waypoints.length || route.length < 2) return 1;
      var y0 = waypoints[0].year, y1 = waypoints[waypoints.length - 1].year;
      if (!y0 || !y1 || y1 === y0) return 1;
      var len = 0;
      for (var i = 1; i < route.length; i++) {
        var dx = route[i].x - route[i - 1].x, dy = route[i].y - route[i - 1].y;
        len += Math.sqrt(dx * dx + dy * dy);
      }
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

      REGIONS.forEach(function (R) {
        var n = el('div', 'atlas-region');
        n.style.left = (R.x + (R.lx || 0)) + 'px';
        n.style.top = (R.y + (R.ly || 0)) + 'px';
        var name = el('span', 'atlas-region-name');
        name.textContent = R.name;
        n.appendChild(name);
        if (R.sub) {
          var sub = el('span', 'atlas-region-sub');
          sub.textContent = R.sub;
          n.appendChild(sub);
        }
        layer.appendChild(n);
      });

      SETTLEMENTS.forEach(function (S) {
        var place = placeById[S.place];
        if (!place) return;
        var R = REGION_BY[S.region];
        if (!R) return;
        var n = el('div', 'atlas-town');
        n.style.left = (R.x + S.dx) + 'px';
        n.style.top = (R.y + S.dy) + 'px';
        var dot = el('span', 'atlas-town-dot');
        var name = el('span', 'atlas-town-name');
        name.textContent = place.name;
        n.appendChild(dot);
        n.appendChild(name);
        layer.appendChild(n);
      });

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
           a route have to stay one size to be read as a sequence. */
        b.style.setProperty('--w', (0.82 + w.weight * 0.5).toFixed(2));
        if (w.chaos) b.dataset.chaos = '1';
        if (w.classified) b.dataset.classified = '1';
        b.setAttribute('aria-label', w.label);

        b.appendChild(el('span', 'atlas-wp-glow'));
        var disc = el('span', 'atlas-wp-disc');
        disc.textContent = String(w.i + 1);
        b.appendChild(disc);
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

      /* START, and no finish: the route runs on off the painted corner. */
      var first = waypoints[0];
      var start = el('div', 'atlas-mark');
      start.style.left = (first.x + 46) + 'px';
      start.style.top = (first.y - 34) + 'px';
      start.textContent = 'Start · ' + (first.year || '');
      layer.appendChild(start);

      var on = el('div', 'atlas-mark onward');
      on.style.left = '162px';
      on.style.top = '748px';
      on.textContent = 'The country continues';
      layer.appendChild(on);

      applyEmphasisToDom();
      markFocus();
    }

    function syncLayer() {
      var s = cam.z;
      layer.style.transform = 'translate(' + (vw / 2) + 'px,' + (vh / 2) + 'px) scale(' + s +
                              ') translate(' + (-cam.x) + 'px,' + (-cam.y) + 'px)';
      layer.style.setProperty('--z', s.toFixed(4));
      /* How much to say is a question about how much country is on the
         screen, not about how far from a fit we happen to be — otherwise a
         phone, whose fit is tiny, opens shouting every town name it has. */
      var across = vw / s;
      var next = across > 1250 ? 'far' : (across > 620 ? 'mid' : 'near');
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
      when.textContent = (w.i + 1) + ' · ' + (w.when || '');
      tip.appendChild(when);
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
      drawWanted = true;
    }
    function markFocus() {
      waypoints.forEach(function (w) {
        if (!w.node) return;
        w.node.dataset.on = (w.id === focusedId) ? '1' : '';
      });
      drawWanted = true;
    }

    function startFollow(strand) {
      if (reduceMotion || !strand) { flier = null; return; }
      var ids = waypoints.filter(function (w) { return w.strand === strand; })
                         .map(function (w) { return w.id; });
      if (!ids.length) { flier = null; return; }
      var tone = wpById[ids[0]] ? wpById[ids[0]].deep : PIG.trail;
      flier = new Walker(ids, tone);
      wake();
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
      if (flier && !reduceMotion) { flier.step(dt); drawWanted = true; }
      if (visitor) {
        visitor.age += dt;
        visitor.ph += dt * 0.0032 * visitor.dir;
        if (visitor.age > visitor.life) visitor = null;
        drawWanted = true;
      }

      var busy = !!camTo || !!visitor || (flier && !reduceMotion);
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
      setWorld: function (spec) {
        placeById = {};
        (spec.places || []).forEach(function (p) { placeById[p.id] = p; });
        eras = spec.decades || [];
        return api;
      },

      /* waypoints: [{ id, place, year, era, strand, tone, title, when,
                       location, label, weight, chaos, classified, ref }] */
      setLights: function (list) {
        waypoints = (list || []).map(function (w) {
          return {
            id: w.id,
            place: w.place || null,
            region: PLACE_REGION[w.place] || null,
            year: w.year || null,
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
            x: 0, y: 0, at: 0, node: null
          };
        });

        /* A place the table has not heard of takes the region of whichever
           memory it sits next to in time — so the archive can add stories
           anywhere and none of them lands off the map. */
        var lastRegion = 'veld';
        waypoints.forEach(function (w) {
          if (!w.region) w.region = lastRegion;
          lastRegion = w.region;
        });

        wpById = {};
        waypoints.forEach(function (w) { wpById[w.id] = w; });
        buildRoute();
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
        var w = opts.at && wpById[opts.at];
        if (w) { cam.z = zFit; cam.x = MAP.w / 2; cam.y = MAP.h / 2; goTo(w.x, w.y, zFit * 2.4, 0); }
        else if (opts.region && REGION_BY[opts.region]) {
          var R = REGION_BY[opts.region];
          cam.z = zFit; goTo(R.x, R.y, zFit * 1.9, 0);
        } else openingView();
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
        if (!emphasis.person) flier = null;
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
        var theirs = waypoints.filter(function (w) { return w.strand === id; });
        if (!theirs.length) return api;
        frameOn(theirs);
        return api;
      },

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
