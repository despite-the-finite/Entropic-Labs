/* Entropic Labs — the foyer field.
 * ==========================================================================
 * Everything drawn behind the four rooms: the drifting field, the traces
 * running out from the wordmark, the light each room throws, the occasional
 * butterfly that crosses the whole thing, and the short film that plays on
 * the way out.
 *
 * The one rule that keeps this file small: it never decides where anything
 * is. CSS lays the foyer out — hung around the wordmark on a desktop,
 * unrolled into a trail on a phone — and this file measures the result and
 * draws to it. So the same code draws both compositions, and the trail
 * follows the scroll for free.
 *
 * Restraint is deliberate. This is a room you walk into, not a title
 * sequence: 30fps, transforms and alpha, one pre-rendered glow sprite per
 * colour instead of a gradient per particle per frame, nothing running while
 * the tab is hidden, and nothing at all running under prefers-reduced-motion
 * beyond a single static frame.
 * ========================================================================== */

(function () {
  'use strict';

  var TAU = Math.PI * 2;
  var FRAME = 1000 / 30;

  var reduceMQ = window.matchMedia('(prefers-reduced-motion: reduce)');
  var trailMQ = window.matchMedia('(max-width: 820px)');
  var hoverMQ = window.matchMedia('(hover: hover)');

  var field = document.getElementById('field');
  var whisperEl = document.getElementById('whisper');
  var readoutEl = document.getElementById('readout');
  var coreEl = document.getElementById('core');
  if (!field || !field.getContext) return;

  var ctx = field.getContext('2d');

  function onChange(mq, fn) {
    if (mq.addEventListener) mq.addEventListener('change', fn);
    else if (mq.addListener) mq.addListener(fn);
  }
  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
  function lerp(a, b, t) { return a + (b - a) * t; }

  /* Deterministic field. The stars are in the same places every visit, which
     is what makes it a place rather than a screensaver. */
  function mulberry32(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* --- the palette, read from the stylesheet so there is one copy of it --- */

  var rootStyle = getComputedStyle(document.documentElement);
  function token(name, fallback) {
    var v = rootStyle.getPropertyValue(name).trim();
    return v || fallback;
  }
  var COLOR = {
    paper: token('--paper', '#F1EEFB'),
    ash: token('--ash', '#9C93B8'),
    trace: token('--trace', '#2FE0C7'),
    signal: token('--signal', '#FF3FA0'),
    violet: token('--violet', '#7C4DFF'),
    ember: token('--ember', '#FFC46B')
  };
  var ROOM_COLOR = {
    observatory: COLOR.trace,
    studio: COLOR.signal,
    game: COLOR.violet,
    butterfly: COLOR.ember
  };

  function rgb(hex) {
    var h = hex.replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function rgba(hex, a) {
    var c = rgb(hex);
    return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')';
  }

  /* --- one glow sprite per colour, scaled at draw time ------------------- */

  var SPRITE_R = 24;
  var sprites = {};
  function sprite(hex) {
    if (sprites[hex]) return sprites[hex];
    var c = document.createElement('canvas');
    c.width = c.height = SPRITE_R * 2;
    var g = c.getContext('2d');
    var grad = g.createRadialGradient(SPRITE_R, SPRITE_R, 0, SPRITE_R, SPRITE_R, SPRITE_R);
    var t = rgb(hex);
    grad.addColorStop(0, 'rgba(' + t[0] + ',' + t[1] + ',' + t[2] + ',1)');
    grad.addColorStop(0.28, 'rgba(' + t[0] + ',' + t[1] + ',' + t[2] + ',0.42)');
    grad.addColorStop(1, 'rgba(' + t[0] + ',' + t[1] + ',' + t[2] + ',0)');
    g.fillStyle = grad;
    g.beginPath();
    g.arc(SPRITE_R, SPRITE_R, SPRITE_R, 0, TAU);
    g.fill();
    sprites[hex] = c;
    return c;
  }
  /* Both surfaces draw the same glows: the field behind the rooms, and the
     exit canvas on the way out. One helper, told where to put it. */
  function glowOn(target, hex, x, y, r, alpha) {
    var s = sprite(hex);
    target.globalAlpha = alpha;
    target.drawImage(s, x - r, y - r, r * 2, r * 2);
    target.globalAlpha = 1;
  }
  function glow(hex, x, y, r, alpha) { glowOn(ctx, hex, x, y, r, alpha); }

  /* ====================================================== THE ROOMS ===== */

  var rooms = [];
  var links = document.querySelectorAll('.realm');
  for (var i = 0; i < links.length; i++) {
    rooms.push({
      el: links[i],
      key: links[i].getAttribute('data-realm'),
      color: ROOM_COLOR[links[i].getAttribute('data-realm')] || COLOR.paper,
      x: 0, y: 0,
      /* how awake this room is: 0 asleep, 1 being looked at. Smoothed, so
         approaching one warms it rather than switching it on. */
      heat: 0,
      target: 0,
      aura: null,
      phase: i * 1.7
    });
  }

  var core = { x: 0, y: 0, rx: 40, ry: 40 };
  var W = 0, H = 0, dpr = 1;

  /* Measures where CSS actually put everything. Called on resize, on scroll
     (the phone trail moves under the fixed canvas) and on a slow tick, since
     the rooms drift a few pixels on their own. */
  function measure() {
    var vw = window.innerWidth;
    var vh = window.innerHeight;
    if (vw !== W || vh !== H) sizeCanvas(vw, vh);

    for (var i = 0; i < rooms.length; i++) {
      var mark = rooms[i].el.querySelector('.realm-mark') || rooms[i].el;
      var r = mark.getBoundingClientRect();
      rooms[i].x = r.left + r.width / 2;
      rooms[i].y = r.top + r.height / 2;
      rooms[i].aura = null;   // gradients are position-bound; rebuild lazily
    }
    if (coreEl) {
      var c = coreEl.getBoundingClientRect();
      core.x = c.left + c.width / 2;
      /* on a phone the trail starts under the wordmark, not through it */
      core.y = trailMQ.matches ? c.bottom - 6 : c.top + c.height * 0.42;
      /* the wordmark is a block, not a point — traces leave from its edge so
         nothing is drawn underneath the type */
      core.rx = trailMQ.matches ? 10 : c.width / 2 + 26;
      core.ry = trailMQ.matches ? 6 : c.height / 2 + 18;
    } else {
      core.x = W / 2; core.y = H * 0.45;
      core.rx = core.ry = 40;
    }
  }

  function sizeCanvas(vw, vh) {
    /* A phone showing and hiding its URL bar changes the viewport height by
       a few dozen pixels on every scroll. Resize the canvas for it, but do
       not throw the field away and lay out a new one — only a real change of
       shape earns that. */
    var reshape = !stars.length || vw !== W || Math.abs(vh - H) > 90;
    W = vw; H = vh;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    field.width = Math.round(W * dpr);
    field.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (reshape) seedField();
  }

  /* ====================================================== THE FIELD ===== */

  var stars = [];
  var anomaly = null;   // the one point in the field that is not a star

  function seedField() {
    var rand = mulberry32(0x5C0FFEE);
    var count = Math.round(clamp((W * H) / 9500, 46, 170));
    stars.length = 0;
    for (var i = 0; i < count; i++) {
      /* a fifth of the field takes a room's colour, so the dark is tinted
         rather than grey — which room, is decided later, by proximity */
      var tinted = rand() < 0.20;
      stars.push({
        x: rand() * W,
        y: rand() * H,
        r: 0.5 + rand() * 1.5,
        a: 0.16 + rand() * 0.42,
        vx: (rand() - 0.5) * 0.055,
        vy: (rand() - 0.5) * 0.055 - 0.012,
        ph: rand() * TAU,
        sp: 0.4 + rand() * 0.9,
        tint: tinted ? null : COLOR.paper   // null = pick up the nearest room
      });
    }
    /* One point that behaves like nothing else in the field. Most people will
       never find it; it is placed away from the rooms so nobody trips on it. */
    anomaly = {
      x: W * (trailMQ.matches ? 0.88 : 0.925),
      y: H * (trailMQ.matches ? 0.12 : 0.135),
      hot: 0,
      said: 0
    };
  }

  /* ====================================================== THE TRACES ===== */

  /* Desktop: the wordmark is the centre and every room hangs off it.
     Phone: the rooms are a trail, so the line walks from one to the next.
     Both are the same list of curves, built fresh whenever layout moves. */
  function buildTraces() {
    var out = [];
    var i;
    if (trailMQ.matches) {
      var prev = core;
      for (i = 0; i < rooms.length; i++) {
        out.push(curve(prev, rooms[i], i, rooms[i]));
        prev = rooms[i];
      }
    } else {
      for (i = 0; i < rooms.length; i++) out.push(curve(core, rooms[i], i, rooms[i]));
    }
    return out;
  }

  function curve(a, b, i, room) {
    var dx = b.x - a.x, dy = b.y - a.y;
    var len = Math.sqrt(dx * dx + dy * dy) || 1;
    var ux = dx / len, uy = dy / len;

    /* leave the wordmark at its edge rather than from its middle, and stop
       short of the room's mark rather than running into it */
    var arx = a.rx || 0, ary = a.ry || 0;
    var inset = (arx && ary)
      ? 1 / Math.sqrt((ux * ux) / (arx * arx) + (uy * uy) / (ary * ary))
      : 26;
    var ax = a.x + ux * Math.min(inset, len * 0.8);
    var ay = a.y + uy * Math.min(inset, len * 0.8);
    var stop = Math.min(30, len * 0.15);
    var bx = b.x - ux * stop;
    var by = b.y - uy * stop;

    var mx = (ax + bx) / 2, my = (ay + by) / 2;
    /* bow each line out to one side or the other, by a fraction of its own
       length, so no two traces read as the same gesture */
    var bow = (i % 2 ? 0.13 : -0.11) * len;
    return {
      ax: ax, ay: ay, bx: bx, by: by,
      cx: mx + (-uy) * bow,
      cy: my + (ux) * bow,
      room: room,
      len: len
    };
  }

  function pointOn(t, u) {
    var iu = 1 - u;
    return {
      x: iu * iu * t.ax + 2 * iu * u * t.cx + u * u * t.bx,
      y: iu * iu * t.ay + 2 * iu * u * t.cy + u * u * t.by
    };
  }

  /* Distance from the pointer to a curve, sampled coarsely — eight points on
     four curves is nothing, and the eye cannot tell the difference. */
  function nearCurve(t, px, py) {
    var best = 1e9;
    for (var i = 0; i <= 8; i++) {
      var p = pointOn(t, i / 8);
      var d = Math.hypot(p.x - px, p.y - py);
      if (d < best) best = d;
    }
    return best;
  }

  /* ===================================================== THE POINTER ===== */

  var ptr = { x: -9999, y: -9999, live: false };

  window.addEventListener('pointermove', function (e) {
    if (e.pointerType === 'touch') return;
    ptr.x = e.clientX; ptr.y = e.clientY; ptr.live = true;
  }, { passive: true });

  window.addEventListener('pointerdown', function (e) {
    if (e.pointerType === 'touch') { ptr.x = e.clientX; ptr.y = e.clientY; ptr.live = true; }
  }, { passive: true });

  window.addEventListener('blur', function () { ptr.live = false; });
  document.addEventListener('pointerleave', function () { ptr.live = false; });

  /* The anomaly answers a click, and only a click on itself. Everything else
     on this page is a link or a button and handles its own. */
  window.addEventListener('click', function (e) {
    if (!anomaly || reduceMQ.matches) return;
    if (document.documentElement.classList.contains('tour-is-open')) return;
    if (e.target.closest && e.target.closest('a, button')) return;
    if (Math.hypot(e.clientX - anomaly.x, e.clientY - anomaly.y) > 18) return;
    say(ANOMALY[anomaly.said % ANOMALY.length]);
    anomaly.said++;
  });

  var ANOMALY = [
    'Object 04 — unresolved. Catalogued anyway.',
    'Signal repeats every 11 minutes. Nobody has claimed it.',
    'Not a star. Whatever it is, it was here first.',
    'You found the thing that is not in the index.'
  ];

  var whisperTimer = 0;
  function say(text) {
    if (!whisperEl) return;
    whisperEl.textContent = text;
    whisperEl.classList.add('on');
    clearTimeout(whisperTimer);
    whisperTimer = setTimeout(function () {
      whisperEl.classList.remove('on');
    }, 5200);
  }

  /* ==================================================== THE VISITORS ===== */

  /* Every so often something crosses the whole field. It belongs to Butterfly
     Trails and it does not stay — that is the entire point of it. */
  var flyer = null;
  var nextFlyer = 26000 + Math.random() * 40000;

  function launchFlyer() {
    var fromLeft = Math.random() < 0.5;
    flyer = {
      x: fromLeft ? -40 : W + 40,
      y: H * (0.18 + Math.random() * 0.6),
      dir: fromLeft ? 1 : -1,
      sp: 0.5 + Math.random() * 0.35,
      wob: Math.random() * TAU,
      scale: 0.75 + Math.random() * 0.5,
      life: 0
    };
  }

  function drawFlyer(dt, now) {
    if (!flyer) return;
    flyer.life += dt;
    flyer.x += flyer.dir * flyer.sp * (dt / 16.7) * 1.6;
    flyer.y += Math.sin(now / 700 + flyer.wob) * 0.5;
    if ((flyer.dir > 0 && flyer.x > W + 60) || (flyer.dir < 0 && flyer.x < -60)) {
      flyer = null;
      return;
    }
    var flap = Math.abs(Math.cos(now / 165 + flyer.wob));
    butterflyOn(ctx, flyer.x, flyer.y, 7 * flyer.scale, flap, 0.34, COLOR.ember);
  }

  /* A butterfly, in as few strokes as it takes to read as one: two arcs a
     side, squeezed toward the body to beat. Used by the visitor crossing the
     field and again by the Butterfly Trails exit. */
  function butterflyOn(target, x, y, s, flap, alpha, color) {
    var w = s * (0.34 + 0.66 * flap);
    target.save();
    target.translate(x, y);
    target.fillStyle = rgba(color, alpha);
    target.beginPath();
    target.ellipse(-w * 0.62, -s * 0.28, w * 0.66, s * 0.62, -0.5, 0, TAU);
    target.ellipse(w * 0.62, -s * 0.28, w * 0.66, s * 0.62, 0.5, 0, TAU);
    target.fill();
    target.globalAlpha = 0.72;
    target.beginPath();
    target.ellipse(-w * 0.5, s * 0.42, w * 0.46, s * 0.44, -0.35, 0, TAU);
    target.ellipse(w * 0.5, s * 0.42, w * 0.46, s * 0.44, 0.35, 0, TAU);
    target.fill();
    target.restore();
  }

  /* ======================================================= THE DRAW ===== */

  var traces = [];
  var start = 0;
  var lastMeasure = 0;

  function draw(now) {
    ctx.clearRect(0, 0, W, H);
    var t = (now - start) / 1000;
    var i, j;

    /* --- how awake each room is ---------------------------------------- */
    for (i = 0; i < rooms.length; i++) {
      var room = rooms[i];
      var hovered = room.el.matches(':hover') || room.el === document.activeElement;
      var prox = 0;
      if (trailMQ.matches) {
        /* no pointer to approach with — a room warms as the scroll brings it
           into the middle of the screen instead */
        prox = clamp(1 - Math.abs(room.y - H * 0.45) / (H * 0.42), 0, 1);
      } else if (ptr.live) {
        var d = Math.hypot(ptr.x - room.x, ptr.y - room.y);
        prox = clamp(1 - (d - 60) / 220, 0, 1);
      }
      room.target = Math.max(hovered ? 1 : 0, prox);
      room.heat = lerp(room.heat, room.target, 0.09);
      /* the text reveal follows the same warmth the canvas does — on the
         trail the lines are already out, so there is nothing to reveal */
      if (!trailMQ.matches) room.el.classList.toggle('is-near', room.heat > 0.45);
    }

    /* --- what each room throws off ------------------------------------- */
    for (i = 0; i < rooms.length; i++) {
      var r = rooms[i];
      var breathe = 0.5 + 0.5 * Math.sin(t * 0.28 + r.phase);
      var radius = (trailMQ.matches ? 120 : 190) * (0.9 + 0.1 * breathe);
      if (!r.aura) {
        r.aura = ctx.createRadialGradient(r.x, r.y, 0, r.x, r.y, radius);
        var c = rgb(r.color);
        r.aura.addColorStop(0, 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',0.30)');
        r.aura.addColorStop(0.45, 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',0.07)');
        r.aura.addColorStop(1, 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',0)');
      }
      ctx.globalAlpha = (0.13 + 0.30 * r.heat) * (0.72 + 0.28 * breathe);
      ctx.fillStyle = r.aura;
      ctx.fillRect(r.x - radius, r.y - radius, radius * 2, radius * 2);
      ctx.globalAlpha = 1;
    }

    /* --- the traces, and the signal running along them ------------------ */
    for (i = 0; i < traces.length; i++) {
      var tr = traces[i];
      var heat = tr.room.heat;
      if (ptr.live && !trailMQ.matches) {
        heat = Math.max(heat, clamp(1 - nearCurve(tr, ptr.x, ptr.y) / 130, 0, 1) * 0.8);
      }
      ctx.save();
      /* nothing brightens a trace on a phone, so the trail is drawn at the
         level it needs to be read at from the start */
      var base = trailMQ.matches ? 0.30 : 0.15;
      ctx.strokeStyle = rgba(tr.room.color, base + 0.42 * heat);
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 7]);
      ctx.lineDashOffset = -t * 9;
      ctx.beginPath();
      ctx.moveTo(tr.ax, tr.ay);
      ctx.quadraticCurveTo(tr.cx, tr.cy, tr.bx, tr.by);
      ctx.stroke();
      ctx.restore();

      /* one carrier travelling out to the room, once every eleven seconds */
      var u = ((t * 0.09) + i * 0.25) % 1;
      var p = pointOn(tr, u);
      var fade = Math.sin(u * Math.PI);
      glow(tr.room.color, p.x, p.y, 9 + 5 * heat, (0.16 + 0.34 * heat) * fade);
    }

    /* --- the field ------------------------------------------------------ */
    for (i = 0; i < stars.length; i++) {
      var s = stars[i];
      s.x += s.vx; s.y += s.vy;
      if (s.x < -12) s.x = W + 12; else if (s.x > W + 12) s.x = -12;
      if (s.y < -12) s.y = H + 12; else if (s.y > H + 12) s.y = -12;

      var x = s.x, y = s.y;
      /* the field gives way a little where the pointer is — a disturbance,
         not a repulsion field; it settles the moment you stop */
      if (ptr.live) {
        var dx = x - ptr.x, dy = y - ptr.y;
        var dist = Math.hypot(dx, dy);
        if (dist < 130 && dist > 0.01) {
          var push = (1 - dist / 130);
          push = push * push * 26;
          x += (dx / dist) * push;
          y += (dy / dist) * push;
        }
      }

      var tint = s.tint;
      if (!tint) {
        /* an untinted star belongs to whichever room is nearest, and only
           shows that allegiance when the room is awake */
        var best = null, bd = 1e9;
        for (j = 0; j < rooms.length; j++) {
          var rd = Math.hypot(x - rooms[j].x, y - rooms[j].y);
          if (rd < bd) { bd = rd; best = rooms[j]; }
        }
        tint = (best && bd < 260) ? best.color : COLOR.paper;
      }

      var tw = 0.62 + 0.38 * Math.sin(t * s.sp + s.ph);
      glow(tint, x, y, s.r * 5.2, s.a * tw * 0.55);
      ctx.fillStyle = rgba(tint, s.a * tw);
      ctx.fillRect(x - s.r / 2, y - s.r / 2, s.r, s.r);
    }

    /* --- the one that is not a star ------------------------------------- */
    if (anomaly) {
      var near = ptr.live && Math.hypot(ptr.x - anomaly.x, ptr.y - anomaly.y) < 18;
      anomaly.hot = lerp(anomaly.hot, near ? 1 : 0, 0.12);
      var a = (0.20 + 0.55 * anomaly.hot) * (0.7 + 0.3 * Math.sin(t * 1.7));
      var k = 4 + 3 * anomaly.hot;
      ctx.save();
      ctx.strokeStyle = rgba(COLOR.paper, a);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(anomaly.x - k, anomaly.y); ctx.lineTo(anomaly.x + k, anomaly.y);
      ctx.moveTo(anomaly.x, anomaly.y - k); ctx.lineTo(anomaly.x, anomaly.y + k);
      ctx.stroke();
      ctx.restore();
      if (anomaly.hot > 0.02) glow(COLOR.trace, anomaly.x, anomaly.y, 16, anomaly.hot * 0.5);
    }
  }

  /* ==================================================== THE READOUT ===== */

  /* Bottom right, at twelve percent opacity: where the pointer is, in the
     units this building happens to use. */
  var lastReadout = 0;
  function updateReadout(now) {
    if (!readoutEl || now - lastReadout < 180) return;
    lastReadout = now;
    if (!ptr.live) { readoutEl.textContent = 'field · idle'; return; }
    var rx = ptr.x / Math.max(W, 1);
    var ry = ptr.y / Math.max(H, 1);
    var ra = (rx * 24);
    var dec = (90 - ry * 180);
    var s = 3 + (1 - Math.abs(rx - 0.5) * 2) * 1.4 + (1 - ry) * 0.6;
    readoutEl.textContent =
      'ra ' + Math.floor(ra) + 'h ' + ('0' + Math.floor((ra % 1) * 60)).slice(-2) + 'm' +
      ' · dec ' + (dec < 0 ? '−' : '+') + ('0' + Math.abs(Math.round(dec))).slice(-2) + '°' +
      ' · s ' + s.toFixed(2);
  }

  /* ======================================================== THE LOOP ===== */

  var running = false;
  var rafId = 0;
  var lastFrame = 0;

  function loop(now) {
    rafId = requestAnimationFrame(loop);
    if (now - lastFrame < FRAME) return;
    var dt = Math.min(now - lastFrame, 100);
    lastFrame = now;

    if (now - lastMeasure > 400) { lastMeasure = now; measure(); traces = buildTraces(); }

    draw(now);
    drawFlyer(dt, now);
    updateReadout(now);

    nextFlyer -= dt;
    if (nextFlyer <= 0 && !flyer) {
      launchFlyer();
      nextFlyer = 45000 + Math.random() * 65000;
    }
  }

  function play() {
    if (running || reduceMQ.matches) return;
    running = true;
    start = performance.now();
    lastFrame = 0;
    rafId = requestAnimationFrame(loop);
  }
  function pause() {
    running = false;
    cancelAnimationFrame(rafId);
  }

  /* Under prefers-reduced-motion the field is still a field — it is just not
     going anywhere. One frame, redrawn only when the layout changes. */
  function still() {
    measure();
    traces = buildTraces();
    ptr.live = false;
    draw(performance.now());
  }

  function boot() {
    measure();
    traces = buildTraces();
    if (reduceMQ.matches) still(); else play();
  }

  var resizeTimer = 0;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      measure();
      traces = buildTraces();
      if (reduceMQ.matches) still();
    }, 140);
  }, { passive: true });

  window.addEventListener('scroll', function () {
    lastMeasure = 0;                     // the trail moved; re-read it now
    if (reduceMQ.matches) still();
  }, { passive: true });

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) pause();
    else if (!reduceMQ.matches) play();
  });

  /* The tour covers the field with an opaque scrim. Nothing can be seen of it
     while that is up, so stop drawing it — same treatment as a hidden tab. */
  window.addEventListener('tour:open', pause);
  window.addEventListener('tour:close', function () {
    if (!document.hidden && !reduceMQ.matches) play();
  });

  onChange(reduceMQ, function () {
    if (reduceMQ.matches) { pause(); still(); } else play();
  });
  onChange(trailMQ, function () {
    seedField();
    measure();
    traces = buildTraces();
    if (reduceMQ.matches) still();
  });

  /* =================================================== THE WAY OUT ====== */

  /* Between here and there, a few hundred milliseconds of the room you chose.
     Long enough to register, short enough that nobody waits for it. */

  var curtain = document.getElementById('curtain');
  var cfx = document.getElementById('curtain-fx');
  var cctx = cfx && cfx.getContext ? cfx.getContext('2d') : null;
  var EXIT_MS = 540;
  var NAV_AT = 430;

  function exitScene(key, ox, oy, done) {
    var w = window.innerWidth, h = window.innerHeight;
    var d = Math.min(window.devicePixelRatio || 1, 2);
    cfx.width = Math.round(w * d);
    cfx.height = Math.round(h * d);
    cctx.setTransform(d, 0, 0, d, 0, 0);

    var color = ROOM_COLOR[key] || COLOR.paper;
    var bits = [];
    var rand = Math.random;
    var i, ang;

    if (key === 'observatory') {
      /* the field stretches — every star pulled out along its own bearing,
         starting near the middle so most of it is still on screen when the
         page underneath changes */
      for (i = 0; i < 110; i++) {
        ang = rand() * TAU;
        bits.push({ a: ang, r0: 12 + rand() * Math.max(w, h) * 0.34, sp: 0.5 + rand() * 0.8, wid: 0.6 + rand() * 0.9 });
      }
    } else if (key === 'game') {
      /* the picture comes apart into the pixels it was made of */
      for (i = 0; i < 110; i++) {
        ang = rand() * TAU;
        var sz = 3 + Math.floor(rand() * 4) * 2;
        bits.push({ a: ang, v: 260 + rand() * 900, sz: sz, rot: rand() * TAU, sp: (rand() - 0.5) * 6 });
      }
    } else if (key === 'butterfly') {
      for (i = 0; i < 80; i++) {
        ang = rand() * TAU;
        bits.push({ a: ang, v: 130 + rand() * 520, sw: rand() * TAU, wing: rand() < 0.09, s: 3 + rand() * 5 });
      }
    }

    var t0 = performance.now();
    (function frame(now) {
      var p = clamp((now - t0) / EXIT_MS, 0, 1);
      var ease = 1 - Math.pow(1 - p, 2.2);
      cctx.clearRect(0, 0, w, h);

      /* the room's own light coming up under all of it */
      glowOn(cctx, color, ox, oy, Math.max(w, h) * (0.25 + ease * 1.15), 0.22 * (1 - p * 0.35));

      if (key === 'observatory') {
        cctx.save();
        cctx.lineCap = 'round';
        for (i = 0; i < bits.length; i++) {
          var b = bits[i];
          /* where the star is now, and the short tail it is dragging. Not a
             jump to lightspeed — a field very slightly pulled out of shape. */
          var r1 = b.r0 + ease * ease * b.sp * Math.max(w, h) * 0.30;
          var tail = 8 + ease * 78 * b.sp;
          cctx.strokeStyle = rgba(i % 7 === 0 ? COLOR.trace : COLOR.paper, 0.42 * (1 - p * 0.5) * (0.2 + 0.8 * ease));
          cctx.lineWidth = b.wid;
          cctx.beginPath();
          cctx.moveTo(ox + Math.cos(b.a) * Math.max(b.r0, r1 - tail), oy + Math.sin(b.a) * Math.max(b.r0, r1 - tail));
          cctx.lineTo(ox + Math.cos(b.a) * r1, oy + Math.sin(b.a) * r1);
          cctx.stroke();
        }
        cctx.restore();

      } else if (key === 'studio') {
        /* one trace, opening out of the middle until it runs off both edges.
           Kept low and thin — an oscilloscope, not a sine wave poster. */
        cctx.save();
        var reach = ease * w * 0.8;
        var amp = Math.sin(p * Math.PI) * Math.min(h * 0.17, 96);
        cctx.strokeStyle = rgba(color, 0.16 * (1 - p));
        cctx.lineWidth = 1;
        cctx.beginPath();
        cctx.moveTo(ox - reach, oy); cctx.lineTo(ox + reach, oy);
        cctx.stroke();
        for (var pass = 0; pass < 2; pass++) {
          cctx.strokeStyle = rgba(pass ? COLOR.paper : color, (pass ? 0.45 : 0.85) * (1 - p * 0.45));
          cctx.lineWidth = pass ? 0.9 : 1.6;
          cctx.beginPath();
          for (var x = ox - reach; x <= ox + reach; x += 3) {
            var u = (x - ox) / (w * 0.5);
            var env = Math.exp(-u * u * 1.4);
            var yy = oy + Math.sin(u * 15 + pass * 0.55 + p * 9) * amp * env
                        + Math.sin(u * 38 - p * 14) * amp * 0.18 * env;
            if (x <= ox - reach) cctx.moveTo(x, yy); else cctx.lineTo(x, yy);
          }
          cctx.stroke();
        }
        /* the two edges of the sweep, still travelling */
        glowOn(cctx, color, ox - reach, oy, 26, 0.5 * (1 - p));
        glowOn(cctx, color, ox + reach, oy, 26, 0.5 * (1 - p));
        cctx.restore();

      } else if (key === 'game') {
        cctx.save();
        for (i = 0; i < bits.length; i++) {
          var g = bits[i];
          var dist = ease * g.v;
          cctx.save();
          cctx.globalAlpha = (1 - p) * 0.9;
          cctx.fillStyle = i % 4 === 0 ? COLOR.paper : color;
          cctx.translate(ox + Math.cos(g.a) * dist, oy + Math.sin(g.a) * dist);
          cctx.rotate(g.rot + g.sp * ease);
          cctx.fillRect(-g.sz / 2, -g.sz / 2, g.sz, g.sz);
          cctx.restore();
        }
        /* two scanlines crossing, and then it is a different page */
        cctx.fillStyle = rgba(COLOR.paper, 0.10 * (1 - p));
        cctx.fillRect(0, (p * h * 1.4) % h, w, 2);
        cctx.fillRect(0, ((p * h * 1.4) + h * 0.5) % h, w, 2);
        cctx.restore();

      } else {
        /* butterfly trails: everything lifts and goes, some of it flapping */
        for (i = 0; i < bits.length; i++) {
          var f = bits[i];
          var dd = ease * f.v;
          var fx = ox + Math.cos(f.a) * dd + Math.sin(p * 6 + f.sw) * 26;
          var fy = oy + Math.sin(f.a) * dd - ease * 90;
          if (f.wing) {
            var flap = Math.abs(Math.cos(p * 20 + f.sw));
            butterflyOn(cctx, fx, fy, f.s * 1.9, flap, 0.55 * (1 - p), color);
          } else {
            cctx.fillStyle = rgba(i % 5 === 0 ? COLOR.paper : color, 0.5 * (1 - p));
            cctx.beginPath();
            cctx.arc(fx, fy, f.s * (1 - p * 0.4), 0, TAU);
            cctx.fill();
          }
        }
      }

      if (p < 1) requestAnimationFrame(frame);
    })(t0);

    setTimeout(done, NAV_AT);
  }

  var leaving = false;
  for (var k = 0; k < links.length; k++) {
    links[k].addEventListener('click', function (e) {
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      if (reduceMQ.matches || !cctx || leaving) return;

      var link = e.currentTarget;
      var key = link.getAttribute('data-realm');
      var box = link.getBoundingClientRect();
      /* keyboard activation has no coordinates — start it at the room */
      var ox = e.clientX || (box.left + box.width / 2);
      var oy = e.clientY || (box.top + box.height / 2);

      e.preventDefault();
      leaving = true;
      pause();
      document.body.classList.add('leaving');
      curtain.classList.add('on');
      exitScene(key, ox, oy, function () { location.href = link.href; });
      /* if anything at all goes wrong above, still go */
      setTimeout(function () { location.href = link.href; }, 1400);
    });
  }

  /* ======================================================== ARRIVAL ====== */

  boot();

  /* For whoever opens the console. Most people never will. */
  try {
    var brand = 'color:#2FE0C7;font:600 12px ui-monospace,monospace';
    var quiet = 'color:#9C93B8;font:12px ui-monospace,monospace';
    console.log('%cENTROPIC LABS %c— four rooms, one building.', brand, quiet);
    console.log('%c01 observatory · 02 studio · 03 game room · 04 butterfly trails', quiet);
    console.log('%cS = k · log W. The mess is the evidence, not the problem.', quiet);
    console.log('%cThere is one thing in the field that is not a star.', quiet);
  } catch (e) {}
})();
