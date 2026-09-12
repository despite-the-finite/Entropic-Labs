/* Entropic Labs — Observatory star field.
   ==========================================================================
   A 2D canvas renderer with a tweened camera. It knows about drawing and
   hit-testing and nothing about the catalogue: observatory.js hands it a
   flat list of nodes and listens for events.

   Coordinate spaces
     sky      the chart's own units. Roughly -1.4..1.4 across. Portrait
              screens squeeze x and stretch y at layout time so the same
              composition reads on a phone without re-authoring positions.
     screen   CSS pixels. project() converts, applying camera, zoom, the
              panel inset, and per-layer parallax.

   Performance
     - one pre-rendered glow sprite, scaled with drawImage, instead of a
       radial gradient per star per frame
     - ambient stars are plain fillRects
     - idles at ~30fps and runs at full rate only while something is moving
     - stops entirely when the tab is hidden
     - with prefers-reduced-motion it draws on demand only: no drift, no
       twinkle, no rAF sitting in the background
   ========================================================================== */

(function (global) {
  'use strict';

  var TAU = Math.PI * 2;

  /* Deterministic RNG, so the chart is the same chart every visit. */
  function mulberry32(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }

  /* Draws text with manual letter spacing. ctx.letterSpacing is too new to
     rely on, and every label in this room is spaced out like a dymo strip. */
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

  function spacedWidth(ctx, text, spacing) {
    var w = 0;
    for (var i = 0; i < text.length; i++) w += ctx.measureText(text[i]).width + spacing;
    return w - spacing;
  }

  function create(canvas, options) {
    options = options || {};

    var ctx = canvas.getContext('2d', { alpha: true });
    var dpr = 1;
    var W = 0, H = 0;
    var portrait = false;
    var coarse = global.matchMedia ? global.matchMedia('(pointer: coarse)').matches : false;
    var reduceMotion = global.matchMedia
      ? global.matchMedia('(prefers-reduced-motion: reduce)').matches : false;

    var palette = options.palette || {
      paper: '#F1EEFB', ash: '#9C93B8', trace: '#2FE0C7',
      signal: '#FF3FA0', violet: '#7C4DFF'
    };

    /* ------------------------------------------------------------ state */
    var nodes = [];               // supplied by the controller
    var ambient = [];             // background stars
    var links = [];               // faint background constellation segments
    var glowSprite = null;

    var cam = { x: 0, y: 0, z: 1 };
    var camFrom = { x: 0, y: 0, z: 1 };
    var camTo = { x: 0, y: 0, z: 1 };
    var camT = 1, camDur = 1, camStart = 0;

    var inset = { x: 0, y: 0 };
    var insetTo = { x: 0, y: 0 };

    var unit = 300;               // sky unit -> px at zoom 1
    var catRadius = 0.26;         // observation ring radius, sky units
    var squeeze = { x: 1, y: 1 };

    var pointer = { x: -9999, y: -9999, nx: 0, ny: 0, active: false, fine: !coarse };
    var parallax = { x: 0, y: 0 };

    var hovered = null;
    var active = null;            // the focused category, if any
    var selected = null;          // the focused observation, if any
    var mode = 'field';

    var running = false, rafId = 0;
    var t0 = (global.performance || Date).now();
    var last = 0, lastDraw = 0;
    var dirty = true;
    var listeners = {};
    var lastCoordKey = '';

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

    /* ------------------------------------------------------- glow sprite */
    function buildGlow() {
      var size = 64;
      var c = document.createElement('canvas');
      c.width = c.height = size;
      var g = c.getContext('2d');
      var grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
      grad.addColorStop(0, 'rgba(255,255,255,0.95)');
      grad.addColorStop(0.18, 'rgba(255,255,255,0.45)');
      grad.addColorStop(0.45, 'rgba(255,255,255,0.12)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = grad;
      g.fillRect(0, 0, size, size);
      glowSprite = c;
    }

    function glow(x, y, r, alpha, tint) {
      if (!glowSprite) return;
      ctx.globalAlpha = alpha;
      if (tint) {
        ctx.globalCompositeOperation = 'lighter';
      }
      ctx.drawImage(glowSprite, x - r, y - r, r * 2, r * 2);
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
    }

    /* --------------------------------------------------------- ambient */
    function buildAmbient() {
      var rnd = mulberry32(20260816);
      var target = clamp(Math.round((W * H) / 3200), 150, 460);
      ambient = [];
      for (var i = 0; i < target; i++) {
        var depth = 0.16 + rnd() * 0.86;
        ambient.push({
          x: (rnd() * 2 - 1) * 3.1,
          y: (rnd() * 2 - 1) * 2.4,
          d: depth,
          r: 0.5 + rnd() * (depth > 0.75 ? 1.7 : 0.9),
          a: 0.26 + rnd() * 0.68 * depth,
          ph: rnd() * TAU,
          sp: 0.25 + rnd() * 0.7,
          vx: (rnd() - 0.5) * 0.0038,
          vy: (rnd() - 0.5) * 0.0026,
          flare: rnd() > 0.955
        });
      }

      /* A handful of faint segments between nearby background stars. Not
         real constellations — just enough structure that the eye finds
         shapes and starts looking for more. */
      links = [];
      for (var k = 0; k < ambient.length && links.length < 15; k++) {
        var a = ambient[k];
        if (a.a < 0.42) continue;
        for (var j = k + 1; j < ambient.length; j++) {
          var b = ambient[j];
          if (b.a < 0.38 || Math.abs(a.d - b.d) > 0.18) continue;
          var dx = a.x - b.x, dy = a.y - b.y;
          var dist = dx * dx + dy * dy;
          if (dist > 0.06 && dist < 0.34) { links.push([a, b]); break; }
        }
      }
    }

    /* ---------------------------------------------------------- layout */
    function layout() {
      var rect = canvas.getBoundingClientRect();
      W = Math.max(1, Math.round(rect.width));
      H = Math.max(1, Math.round(rect.height));
      dpr = clamp(global.devicePixelRatio || 1, 1, 2);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      portrait = H > W;
      if (portrait) {
        /* A tall screen squeezes the composition horizontally and stretches
           it vertically rather than just scaling it down, so the same chart
           keeps its shape and its labels keep their room. */
        unit = W * 0.40;
        squeeze.x = 0.72;
        squeeze.y = 1.85;
      } else {
        unit = Math.min(W * 0.31, H * 0.46);
        squeeze.x = 1;
        squeeze.y = 1;
      }

      /* Observation stars sit on a ring whose radius is chosen in pixels at
         the category zoom, then converted back to sky units — so a cluster
         fills the same share of the screen on any device. */
      var zoom = categoryZoom();
      catRadius = (Math.min(W, H) * (portrait ? 0.29 : 0.26)) / (unit * zoom);

      buildAmbient();
      dirty = true;
    }

    function categoryZoom() { return portrait ? 2.0 : 2.3; }

    /* Sky position of a node, portrait-adjusted. */
    function skyOf(node) {
      if (node.kind === 'observation') {
        var p = node.parentNode ? skyOf(node.parentNode) : { x: 0, y: 0 };
        var ang = node.angle;
        var rr = catRadius * (0.62 + node.ringT * 0.55);
        return { x: p.x + Math.cos(ang) * rr, y: p.y + Math.sin(ang) * rr * 0.86 };
      }
      if (node.fixed) {
        return { x: node.x * squeeze.x, y: node.y * squeeze.y };
      }
      return { x: node.x * squeeze.x, y: node.y * squeeze.y };
    }

    function project(sx, sy, depth) {
      var d = depth === undefined ? 1 : depth;
      var z = cam.z;
      return {
        x: W / 2 + inset.x + (sx - cam.x * d) * unit * z + parallax.x * d,
        y: H / 2 + inset.y + (sy - cam.y * d) * unit * z + parallax.y * d
      };
    }

    /* Inverse of project for depth 1 — used for the pointer readout. */
    function unproject(px, py) {
      var z = cam.z;
      return {
        x: (px - W / 2 - inset.x - parallax.x) / (unit * z) + cam.x,
        y: (py - H / 2 - inset.y - parallax.y) / (unit * z) + cam.y
      };
    }

    /* Sky units to an instrument-style coordinate. These are the chart's own
       coordinates, not real right ascension — the point is that the readout
       under the pointer and the coordinate on a record always agree. */
    function coordsOf(sx, sy) {
      var raH = ((sx + 1.6) / 3.2) * 24;
      raH = ((raH % 24) + 24) % 24;
      var h = Math.floor(raH);
      var mF = (raH - h) * 60;
      var m = Math.floor(mF);
      var s = Math.floor((mF - m) * 60);
      var decDeg = -clamp(sy / 1.1, -1, 1) * 72;
      var sign = decDeg < 0 ? '−' : '+';
      var ad = Math.abs(decDeg);
      var dd = Math.floor(ad);
      var dm = Math.floor((ad - dd) * 60);
      return {
        ra: (h < 10 ? '0' : '') + h + 'h ' + (m < 10 ? '0' : '') + m + 'm ' + (s < 10 ? '0' : '') + s + 's',
        dec: sign + (dd < 10 ? '0' : '') + dd + '° ' + (dm < 10 ? '0' : '') + dm + '′'
      };
    }

    /* ---------------------------------------------------------- camera */
    function tweenCam(x, y, z, ms) {
      camFrom.x = cam.x; camFrom.y = cam.y; camFrom.z = cam.z;
      camTo.x = x; camTo.y = y; camTo.z = z;
      camDur = reduceMotion ? 1 : (ms === undefined ? 1150 : ms);
      camStart = now();
      camT = 0;
      dirty = true;
      wake();
    }

    function now() { return (global.performance || Date).now(); }

    function stepCam(time) {
      if (camT >= 1) return false;
      var p = camDur <= 0 ? 1 : clamp((time - camStart) / camDur, 0, 1);
      camT = p;
      var e = easeInOutCubic(p);
      cam.x = camFrom.x + (camTo.x - camFrom.x) * e;
      cam.y = camFrom.y + (camTo.y - camFrom.y) * e;
      cam.z = camFrom.z + (camTo.z - camFrom.z) * e;
      return p < 1;
    }

    /* ------------------------------------------------------ hit testing */
    function visibleNodes() {
      var out = [];
      for (var i = 0; i < nodes.length; i++) {
        var n = nodes[i];
        if (n.kind === 'category') { out.push(n); continue; }
        if (n.kind === 'observation' || n.kind === 'anomaly') {
          if (n.alpha > 0.03) out.push(n);
        }
      }
      return out;
    }

    function hitTest(px, py) {
      var best = null, bestD = Infinity;
      var list = visibleNodes();
      for (var i = 0; i < list.length; i++) {
        var n = list[i];
        if (!n.screen) continue;
        var dx = n.screen.x - px, dy = n.screen.y - py;
        var d = Math.sqrt(dx * dx + dy * dy);
        var pad = Math.max(n.screenR * 3.4, coarse ? 30 : 20);
        if (n.kind === 'anomaly') pad = Math.max(pad, coarse ? 34 : 24);
        if (d < pad && d < bestD) { bestD = d; best = n; }
      }
      return best;
    }

    /* ------------------------------------------------------------ draw */
    function drawAmbient(time, dt) {
      var i, n, p, a;
      for (i = 0; i < ambient.length; i++) {
        n = ambient[i];
        if (!reduceMotion) {
          n.x += n.vx * dt;
          n.y += n.vy * dt;
          if (n.x > 3.2) n.x = -3.2; else if (n.x < -3.2) n.x = 3.2;
          if (n.y > 2.5) n.y = -2.5; else if (n.y < -2.5) n.y = 2.5;
        }
        p = project(n.x, n.y, n.d);
        if (p.x < -20 || p.x > W + 20 || p.y < -20 || p.y > H + 20) { n.vis = false; continue; }
        n.vis = true; n.px = p.x; n.py = p.y;
        a = n.a;
        if (!reduceMotion) a *= 0.74 + 0.26 * Math.sin(time * 0.001 * n.sp + n.ph);
        var r = n.r * (0.85 + cam.z * 0.12);
        ctx.globalAlpha = a;
        ctx.fillStyle = palette.paper;
        ctx.fillRect(p.x - r / 2, p.y - r / 2, r, r);
        if (n.flare && a > 0.35) {
          ctx.globalAlpha = a * 0.34;
          ctx.fillRect(p.x - r * 3, p.y - 0.25, r * 6, 0.5);
          ctx.fillRect(p.x - 0.25, p.y - r * 3, 0.5, r * 6);
        }
      }
      ctx.globalAlpha = 1;

      /* faint background segments */
      ctx.strokeStyle = palette.paper;
      ctx.lineWidth = 0.5;
      ctx.globalAlpha = 0.055;
      ctx.beginPath();
      for (i = 0; i < links.length; i++) {
        var A = links[i][0], B = links[i][1];
        if (!A.vis || !B.vis) continue;
        ctx.moveTo(A.px, A.py);
        ctx.lineTo(B.px, B.py);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    function drawConstellation(cat) {
      if (cat.lineAlpha <= 0.01) return;
      var kids = cat.children;
      if (!kids || !kids.length) return;
      ctx.strokeStyle = palette.trace;
      ctx.globalAlpha = cat.lineAlpha * 0.3;
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      for (var i = 0; i < kids.length; i++) {
        var k = kids[i];
        if (!k.screen) continue;
        ctx.moveTo(cat.screen.x, cat.screen.y);
        ctx.lineTo(k.screen.x, k.screen.y);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    /* The annotation drawn beside an identified object: a bracket, its
       catalogue designation, and its count. This is what makes a star read
       as catalogued rather than as a button. */
    function drawAnnotation(n, alpha) {
      if (alpha <= 0.02) return;
      var x = n.screen.x, y = n.screen.y;
      var r = Math.max(n.screenR * 3.6, 14);

      ctx.globalAlpha = alpha * 0.5;
      ctx.strokeStyle = palette.trace;
      ctx.lineWidth = 1;
      var seg = r * 0.45;
      ctx.beginPath();
      // four corner brackets
      ctx.moveTo(x - r, y - r + seg); ctx.lineTo(x - r, y - r); ctx.lineTo(x - r + seg, y - r);
      ctx.moveTo(x + r - seg, y - r); ctx.lineTo(x + r, y - r); ctx.lineTo(x + r, y - r + seg);
      ctx.moveTo(x + r, y + r - seg); ctx.lineTo(x + r, y + r); ctx.lineTo(x + r - seg, y + r);
      ctx.moveTo(x - r + seg, y + r); ctx.lineTo(x - r, y + r); ctx.lineTo(x - r, y + r - seg);
      ctx.stroke();

      ctx.globalAlpha = alpha * 0.72;
      ctx.font = '9px ' + fontMono();
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = palette.trace;
      spacedText(ctx, n.designation || '', x + r + 8, y - r + 3, 1.1, 'left');
      if (n.meta) {
        ctx.globalAlpha = alpha * 0.5;
        ctx.fillStyle = palette.ash;
        spacedText(ctx, n.meta, x + r + 8, y - r + 15, 1.1, 'left');
      }
      ctx.globalAlpha = 1;
    }

    function fontMono() {
      return 'ui-monospace, "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace';
    }

    function drawCategory(n, time) {
      var p = n.screen;
      var mag = n.magnitude || 1;
      var base = (portrait ? 2.0 : 2.4) + mag * 1.5;
      var pulse = reduceMotion ? 1 : (0.94 + 0.06 * Math.sin(time * 0.0011 + n.seed));
      var r = base * pulse * (1 + (cam.z - 1) * 0.12);
      n.screenR = r;

      var em = n.emphasis;   // 0..1, hover/active
      var dim = n.dim;       // 0..1, faded because something else is focused

      var tint = em > 0.5 ? palette.trace : palette.paper;
      glow(p.x, p.y, r * 7, (0.14 + em * 0.26) * (1 - dim * 0.8));
      ctx.globalAlpha = (0.9 - dim * 0.72);
      ctx.fillStyle = tint;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, TAU);
      ctx.fill();

      /* catalogue ring — a thin circle a little way out */
      ctx.globalAlpha = (0.14 + em * 0.4) * (1 - dim * 0.85);
      ctx.strokeStyle = palette.trace;
      ctx.lineWidth = 0.75;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r * 2.9, 0, TAU);
      ctx.stroke();

      /* label */
      var labelAlpha = (0.5 + em * 0.5) * (1 - dim * 0.9);
      if (labelAlpha > 0.02) {
        ctx.globalAlpha = labelAlpha;
        ctx.fillStyle = em > 0.4 ? palette.paper : palette.ash;
        ctx.font = (portrait ? '9.5px ' : '10.5px ') + fontMono();
        ctx.textBaseline = 'alphabetic';
        spacedText(ctx, n.label, p.x, p.y + r * 2.9 + 15, portrait ? 1.4 : 2, 'center');
      }
      ctx.globalAlpha = 1;

      drawAnnotation(n, em * (1 - dim));
    }

    function drawObservation(n, time) {
      if (n.alpha <= 0.02) return;
      var p = n.screen;
      var em = n.emphasis;
      var anomaly = n.kind === 'anomaly';
      var r = (anomaly ? 2.0 : 2.4) + em * 1.2;
      n.screenR = r;

      var tone = anomaly ? palette.violet : (n.selected ? palette.signal : palette.paper);
      glow(p.x, p.y, r * 6, (anomaly ? 0.10 : 0.16) * n.alpha + em * 0.22 * n.alpha);

      ctx.globalAlpha = n.alpha * (anomaly ? 0.62 : 0.92);
      ctx.fillStyle = tone;
      if (anomaly) {
        /* The unidentified object is a glyph, not a star. It breathes on a
           slow cycle — faint enough to miss, moving enough to be found. */
        var breathe = reduceMotion ? 1 : 0.72 + 0.42 * (0.5 + 0.5 * Math.sin(time * 0.00085));
        ctx.globalAlpha = n.alpha * 0.95 * breathe;
        ctx.font = 'italic ' + (12 + em * 3).toFixed(1) + 'px ' + fontMono();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('?', p.x, p.y);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
        if (em > 0.05) {
          ctx.globalAlpha = n.alpha * em * 0.4;
          ctx.strokeStyle = palette.violet;
          ctx.lineWidth = 0.75;
          ctx.beginPath();
          ctx.arc(p.x, p.y, 13 + Math.sin(time * 0.002) * 1.5, 0, TAU);
          ctx.stroke();
        }
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, TAU);
        ctx.fill();
      }

      /* Observation names appear only once you are inside their field (or
         pointing straight at one). In the wide view they stay anonymous
         dots clustered round their parent star — which keeps the chart
         quiet, and makes zooming in an actual reveal rather than a resize. */
      var named = (n.parentNode && n.parentNode === active) || n.selected;
      var labelAlpha = named
        ? n.alpha * (coarse ? 0.95 : 0.55 + em * 0.45)
        : n.alpha * em * 0.9;
      if (labelAlpha > 0.03 && n.label) {
        ctx.globalAlpha = labelAlpha;
        ctx.fillStyle = em > 0.35 || n.selected ? palette.paper : palette.ash;
        ctx.font = '9.5px ' + fontMono();
        var below = n.labelBelow;
        spacedText(ctx, n.label, p.x, p.y + (below ? 17 : -12), 1.1, 'center');
        if (n.designation && (em > 0.2 || coarse)) {
          ctx.globalAlpha = labelAlpha * 0.5;
          ctx.fillStyle = palette.trace;
          ctx.font = '8px ' + fontMono();
          spacedText(ctx, n.designation, p.x, p.y + (below ? 28 : -23), 1, 'center');
        }
      }
      ctx.globalAlpha = 1;
    }

    /* Empty-sky reticle: a small targeting bracket under a fine pointer.
       Over an object the annotation brackets take its place, and on touch
       there is no cursor to track, so in both cases it stays out of the way. */
    function drawReticle() {
      if (hovered) return;
      if (!pointer.fine || !pointer.active) return;

      var x = pointer.x, y = pointer.y, r = 11;
      ctx.strokeStyle = palette.trace;
      ctx.lineWidth = 0.75;
      ctx.globalAlpha = 0.26;
      ctx.beginPath();
      ctx.moveTo(x - r - 6, y); ctx.lineTo(x - r, y);
      ctx.moveTo(x + r, y); ctx.lineTo(x + r + 6, y);
      ctx.moveTo(x, y - r - 6); ctx.lineTo(x, y - r);
      ctx.moveTo(x, y + r); ctx.lineTo(x, y + r + 6);
      ctx.stroke();
      ctx.globalAlpha = 0.13;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, TAU);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    function frame(time) {
      rafId = 0;
      if (!running) return;

      var dt = last ? Math.min(64, time - last) : 16;
      last = time;

      var camMoving = stepCam(time);

      /* pointer parallax, eased */
      var wantPX = pointer.fine && pointer.active ? pointer.nx * 16 : 0;
      var wantPY = pointer.fine && pointer.active ? pointer.ny * 12 : 0;
      if (reduceMotion) { wantPX = 0; wantPY = 0; }
      parallax.x += (wantPX - parallax.x) * 0.06;
      parallax.y += (wantPY - parallax.y) * 0.06;

      inset.x += (insetTo.x - inset.x) * 0.12;
      inset.y += (insetTo.y - inset.y) * 0.12;

      var busy = camMoving
        || Math.abs(insetTo.x - inset.x) > 0.4 || Math.abs(insetTo.y - inset.y) > 0.4
        || Math.abs(wantPX - parallax.x) > 0.3;

      /* Idle at ~30fps; full rate only while something is actually moving. */
      var minFrame = busy ? 0 : 32;
      if (!reduceMotion && time - lastDraw < minFrame) {
        schedule();
        return;
      }
      lastDraw = time;

      draw(time, dt);

      if (reduceMotion) {
        dirty = busy;
        if (busy) schedule();
        else running = false;
      } else {
        schedule();
      }
    }

    function draw(time, dt) {
      ctx.clearRect(0, 0, W, H);

      drawAmbient(time, dt);

      var i, n;

      /* resolve screen positions and eased emphasis first */
      for (i = 0; i < nodes.length; i++) {
        n = nodes[i];
        var s = skyOf(n);
        n.sky = s;
        n.screen = project(s.x, s.y, 1);

        var wantEm = (n === hovered ? 1 : 0);
        if (n.kind === 'category' && n === active) wantEm = Math.max(wantEm, 0.55);
        if (n.selected) wantEm = 1;
        n.emphasis += (wantEm - n.emphasis) * (reduceMotion ? 1 : 0.14);

        var wantDim = 0;
        if (n.kind === 'category' && active && n !== active) wantDim = mode === 'field' ? 0 : 0.85;
        n.dim += (wantDim - n.dim) * (reduceMotion ? 1 : 0.1);

        if (n.kind === 'observation' || n.kind === 'anomaly') {
          var wantAlpha;
          if (n.selected) wantAlpha = 1;
          else if (active && n.parentNode === active) wantAlpha = 1;
          else if (!active) wantAlpha = n.kind === 'anomaly' ? 0.42 : 0.42;
          else wantAlpha = n.kind === 'anomaly' ? 0.2 : 0.06;
          n.alpha += (wantAlpha - n.alpha) * (reduceMotion ? 1 : 0.1);
        }

        if (n.kind === 'category') {
          var wantLine = (n === active || n === hovered) ? 1 : 0;
          n.lineAlpha += (wantLine - n.lineAlpha) * (reduceMotion ? 1 : 0.1);
        }
      }

      for (i = 0; i < nodes.length; i++) {
        n = nodes[i];
        if (n.kind === 'category') drawConstellation(n);
      }
      for (i = 0; i < nodes.length; i++) {
        n = nodes[i];
        if (n.kind !== 'category') drawObservation(n, time);
      }
      for (i = 0; i < nodes.length; i++) {
        n = nodes[i];
        if (n.kind === 'category') drawCategory(n, time);
      }

      drawReticle();

      /* pointer coordinate readout, emitted rather than drawn */
      if (pointer.active || coarse) {
        var src = hovered && hovered.sky
          ? hovered.sky
          : unproject(pointer.fine && pointer.active ? pointer.x : W / 2,
                      pointer.fine && pointer.active ? pointer.y : H / 2);
        var c = coordsOf(src.x, src.y);
        var key = c.ra + c.dec;
        if (key !== lastCoordKey) {
          lastCoordKey = key;
          emit('coords', c);
        }
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

    /* --------------------------------------------------------- pointer */
    function setPointer(px, py, fine) {
      pointer.x = px; pointer.y = py;
      pointer.nx = (px / W) * 2 - 1;
      pointer.ny = (py / H) * 2 - 1;
      pointer.active = true;
      pointer.fine = fine;
      var hit = hitTest(px, py);
      if (hit !== hovered) {
        hovered = hit;
        canvas.style.cursor = hit ? 'pointer' : 'crosshair';
        emit('hover', hit ? hit.ref : null);
      }
      wake();
    }

    function clearPointer() {
      pointer.active = false;
      if (hovered) { hovered = null; emit('hover', null); }
      canvas.style.cursor = 'crosshair';
      wake();
    }

    function localPoint(e) {
      var r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    }

    canvas.addEventListener('pointermove', function (e) {
      var p = localPoint(e);
      setPointer(p.x, p.y, e.pointerType === 'mouse');
    });
    canvas.addEventListener('pointerleave', function () { clearPointer(); });

    /* Tap/click. A touch gets a slightly generous hit radius via hitTest;
       a miss inside a category view is a request to back out. */
    var downAt = null;
    canvas.addEventListener('pointerdown', function (e) {
      downAt = localPoint(e);
      downAt.t = now();
      if (e.pointerType !== 'mouse') {
        setPointer(downAt.x, downAt.y, false);
      }
    });
    canvas.addEventListener('pointerup', function (e) {
      if (!downAt) return;
      var p = localPoint(e);
      var moved = Math.abs(p.x - downAt.x) + Math.abs(p.y - downAt.y);
      var held = now() - downAt.t;
      downAt = null;
      if (moved > 14 || held > 700) return;
      var hit = hitTest(p.x, p.y);
      if (hit) emit('select', hit.ref);
      else emit('empty', coordsOf(unproject(p.x, p.y).x, unproject(p.x, p.y).y));
    });
    canvas.addEventListener('pointercancel', function () { downAt = null; });

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stop();
      else wake();
    });

    /* ------------------------------------------------------------- api */
    var api = {
      on: on,

      /* nodes: [{ id, kind, label, designation, meta, x, y, magnitude,
                   parent, ref }] — see observatory.js buildNodes(). */
      setNodes: function (list) {
        nodes = list.map(function (n, i) {
          return {
            id: n.id,
            kind: n.kind,
            label: n.label || '',
            designation: n.designation || '',
            meta: n.meta || '',
            x: n.x || 0,
            y: n.y || 0,
            angle: n.angle || 0,
            ringT: n.ringT || 0,
            labelBelow: !!n.labelBelow,
            magnitude: n.magnitude || 1,
            parent: n.parent || null,
            ref: n.ref,
            seed: i * 1.7,
            emphasis: 0,
            dim: 0,
            lineAlpha: 0,
            alpha: n.kind === 'category' ? 1 : 0,
            selected: false,
            screen: { x: 0, y: 0 },
            screenR: 3,
            children: []
          };
        });
        var byId = {};
        nodes.forEach(function (n) { byId[n.id] = n; });
        nodes.forEach(function (n) {
          if (n.parent && byId[n.parent]) {
            n.parentNode = byId[n.parent];
            byId[n.parent].children.push(n);
          }
        });
        layout();
        wake();
        return api;
      },

      /* mode: 'field' | 'category' | 'record' */
      setView: function (nextMode, categoryId, observationId) {
        mode = nextMode;
        active = null; selected = null;
        nodes.forEach(function (n) { n.selected = false; });

        var i, n;
        for (i = 0; i < nodes.length; i++) {
          n = nodes[i];
          if (n.kind === 'category' && n.id === categoryId) active = n;
          if (n.id === observationId) { n.selected = true; selected = n; }
        }

        if (mode === 'field') {
          tweenCam(0, 0, 1, 1150);
        } else if (selected) {
          var s = skyOf(selected);
          tweenCam(s.x, s.y, categoryZoom() * 1.22, 1050);
        } else if (active) {
          var a = skyOf(active);
          tweenCam(a.x, a.y, categoryZoom(), 1150);
        }
        wake();
        return api;
      },

      /* Screen-space shift, so the composition stays clear of an open
         panel instead of hiding behind it. */
      setInset: function (x, y) {
        insetTo.x = x || 0;
        insetTo.y = y || 0;
        wake();
        return api;
      },

      nodeFor: function (id) {
        for (var i = 0; i < nodes.length; i++) if (nodes[i].id === id) return nodes[i];
        return null;
      },

      coordsFor: function (id) {
        var n = api.nodeFor(id);
        if (!n) return null;
        var s = skyOf(n);
        return coordsOf(s.x, s.y);
      },

      resize: function () { layout(); wake(); return api; },
      wake: wake,
      stop: stop,
      isReduced: function () { return reduceMotion; },
      isCoarse: function () { return coarse; }
    };

    buildGlow();
    layout();
    wake();
    return api;
  }

  global.OBSERVATORY_FIELD = { create: create };
})(window);
