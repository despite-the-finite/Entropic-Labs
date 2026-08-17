/* Entropic Labs — canvas motion.
 *
 * Two things on the site are drawn live rather than baked into an image:
 *
 *   1. The hero banner. Its artwork ships as a flat JPEG with the subtitle, the
 *      spectrum bars and the five figures painted out of it (see img/hero.jpg);
 *      this file draws the falling code and the bars back over it, and cycles
 *      the figure animations on touch, where there is no hover to trigger them.
 *   2. The producer photo, which has matrix code in its background — the same
 *      falling code runs over it in the photo's own green.
 *
 * Everything is deliberately low-key: the point is that the page looks alive,
 * not that it demands attention. Nothing runs under prefers-reduced-motion, and
 * each loop stops whenever its canvas is off screen or the tab is hidden.
 */
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var noHover = window.matchMedia('(hover: none)');
  var GLYPHS = '01234567890ABCDEFΨΩΣΦΔ□◇┐└┤';

  // 30fps is plenty for drifting glyphs and bouncing bars, and halves the work
  // on a phone. CSS animations are unaffected and stay at the display's rate.
  var FRAME = 1000 / 30;

  function onChange(mq, fn) {
    if (mq.addEventListener) mq.addEventListener('change', fn);
    else mq.addListener(fn);
  }

  // --- a field of falling glyphs -----------------------------------------
  // Used twice: teal over the banner, green over the photo. Both sit on top of
  // artwork that already has static columns in it, so these read as the field
  // moving rather than as a second layer of code.
  function makeField(cfg) {
    var columns = [];
    return {
      build: function (W, H) {
        columns = [];
        var step = Math.max(cfg.gapMin, W / cfg.gapDiv);
        for (var x = step / 2; x < W; x += step) {
          columns.push({
            x: x + (Math.random() - 0.5) * step * 0.4,
            y: Math.random() * H,
            speed: cfg.speed[0] + Math.random() * cfg.speed[1],
            len: cfg.len[0] + (Math.random() * cfg.len[1]) | 0,
            size: Math.max(cfg.sizeMin, W / cfg.sizeDiv),
            alpha: cfg.alpha[0] + Math.random() * cfg.alpha[1],
            glyphs: [],
            tick: 0
          });
        }
        columns.forEach(function (c) {
          for (var i = 0; i < c.len; i++) c.glyphs.push(GLYPHS[(Math.random() * GLYPHS.length) | 0]);
        });
      },
      draw: function (ctx, dt, W, H) {
        var limit = H * cfg.limit;
        ctx.textAlign = 'center';
        for (var i = 0; i < columns.length; i++) {
          var c = columns[i];
          c.y += c.speed * dt;
          c.tick += dt;
          if (c.tick > 0.28) {                // occasionally reshuffle a glyph
            c.tick = 0;
            c.glyphs[(Math.random() * c.len) | 0] = GLYPHS[(Math.random() * GLYPHS.length) | 0];
          }
          if (c.y - c.len * c.size > limit) {
            c.y = -c.size * c.len;
            c.x = Math.random() * W;
            c.speed = cfg.speed[0] + Math.random() * cfg.speed[1];
          }
          ctx.font = c.size + 'px ui-monospace, Menlo, Consolas, monospace';
          for (var g = 0; g < c.len; g++) {
            var y = c.y - g * c.size * 1.15;
            if (y < -c.size || y > limit) continue;
            var fade = 1 - g / c.len;
            ctx.fillStyle = g === 0
              ? 'rgba(' + cfg.head + ',' + (c.alpha * 1.7).toFixed(3) + ')'
              : 'rgba(' + cfg.trail + ',' + (c.alpha * fade).toFixed(3) + ')';
            ctx.fillText(c.glyphs[g], c.x, y);
          }
        }
      }
    };
  }

  // --- shared loop --------------------------------------------------------
  // Handles sizing, the frame cap, and pausing when hidden or scrolled away.
  function makeLoop(host, canvas, hooks) {
    var ctx = canvas.getContext('2d', { alpha: true });
    var W = 0, H = 0, running = false, last = 0, visible = true, onScreen = true;

    function resize() {
      var r = host.getBoundingClientRect();
      if (!r.width) return;
      var dpr = Math.min(2, window.devicePixelRatio || 1);
      W = r.width; H = r.height;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      canvas.style.width = W + 'px';
      canvas.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      hooks.resize(W, H);
    }

    function frame(now) {
      if (!running) return;
      requestAnimationFrame(frame);
      var elapsed = now - last;
      if (elapsed < FRAME) return;
      last = now;
      hooks.draw(ctx, Math.min(0.05, elapsed / 1000), now, W, H);
    }

    function start() {
      if (running || reduce.matches || !visible || !onScreen || !W) return;
      running = true;
      last = performance.now();
      requestAnimationFrame(frame);
    }

    function stop() { running = false; }

    function still() {                        // one frozen frame, for reduced motion
      if (W) hooks.draw(ctx, 0, 0, W, H);
    }

    resize();
    window.addEventListener('resize', function () { resize(); if (!running) still(); });
    document.addEventListener('visibilitychange', function () {
      visible = !document.hidden;
      visible ? start() : stop();
      if (hooks.toggled) hooks.toggled(visible && onScreen);
    });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        onScreen = entries[0].isIntersecting;
        onScreen ? start() : stop();
        if (hooks.toggled) hooks.toggled(visible && onScreen);
      }, { threshold: 0 }).observe(host);
    }

    return {
      start: start,
      stop: stop,
      still: still,
      apply: function () { reduce.matches ? (stop(), still()) : start(); },
      isOn: function () { return visible && onScreen; }
    };
  }

  // --- 1. the hero banner -------------------------------------------------
  (function hero() {
    var scene = document.querySelector('.hero-scene');
    var canvas = document.querySelector('.hero-fx');
    if (!scene || !canvas) return;

    var BARS_TOP = 0.852;        // matches the strip painted out of the JPEG
    var field = makeField({
      gapMin: 26, gapDiv: 64, sizeMin: 9, sizeDiv: 150,
      speed: [14, 26], len: [6, 7], alpha: [0.10, 0.16],
      trail: '47,224,199', head: '180,255,238', limit: BARS_TOP
    });

    // Spectrum bars, colour ramp sampled from the original artwork.
    var PALETTE = [[6,109,87],[12,106,91],[25,98,92],[35,110,111],[54,103,114],[65,108,134],
                   [75,96,128],[87,90,136],[91,76,128],[93,63,119],[95,51,113],[100,45,110],[108,36,112]];
    var bars = [];
    var BAR_COUNT = 96;
    var BAR_SPEED = 0.38;        // how fast the bars dance; lower is calmer
    var BAR_EASE = 0.09;         // how hard each bar chases its target height

    function buildBars() {
      bars = [];
      for (var i = 0; i < BAR_COUNT; i++) {
        bars.push({
          // three detuned oscillators per bar reads as music rather than a wave
          p1: Math.random() * Math.PI * 2, s1: 0.5 + Math.random() * 0.7,
          p2: Math.random() * Math.PI * 2, s2: 1.3 + Math.random() * 1.1,
          p3: Math.random() * Math.PI * 2, s3: 2.6 + Math.random() * 1.8,
          h: 0
        });
      }
    }

    function paletteAt(t) {
      var f = t * (PALETTE.length - 1);
      var i = Math.min(PALETTE.length - 2, f | 0), k = f - i;
      var a = PALETTE[i], b = PALETTE[i + 1];
      return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
    }

    function drawBars(ctx, time, W, H) {
      var top = H * BARS_TOP;
      var strip = H - top;
      var gap = Math.max(1, W / 900);
      var bw = (W - gap * (BAR_COUNT - 1)) / BAR_COUNT;
      var clock = time * BAR_SPEED;
      for (var i = 0; i < BAR_COUNT; i++) {
        var b = bars[i];
        var t = i / (BAR_COUNT - 1);
        // a slow envelope across the width keeps the silhouette of the original
        var shape = 0.55 + 0.45 * Math.sin(t * Math.PI * 2.1 + clock * 0.18);
        var v = (Math.sin(clock * b.s1 + b.p1) + Math.sin(clock * b.s2 + b.p2) * 0.6
                 + Math.sin(clock * b.s3 + b.p3) * 0.3) / 1.9;
        var target = strip * (0.22 + 0.52 * Math.max(0, shape * 0.7 + v * 0.42));
        b.h += (target - b.h) * BAR_EASE;     // glide toward it, do not snap
        var c = paletteAt(t);
        var x = i * (bw + gap);
        ctx.fillStyle = 'rgb(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ')';
        ctx.fillRect(x, H - b.h, bw, b.h);
        ctx.fillStyle = 'rgba(' + ((c[0] + 60) | 0) + ',' + ((c[1] + 70) | 0) + ',' + ((c[2] + 70) | 0) + ',0.85)';
        ctx.fillRect(x, H - b.h, bw, Math.max(1, strip * 0.02));
      }
    }

    var loop = makeLoop(scene, canvas, {
      resize: function (W, H) { field.build(W, H); if (!bars.length) buildBars(); },
      draw: function (ctx, dt, now, W, H) {
        ctx.clearRect(0, 0, W, H);
        field.draw(ctx, dt, W, H);
        drawBars(ctx, now / 1000, W, H);
      },
      toggled: function () { syncCycle(); }
    });

    // --- figures ----------------------------------------------------------
    // Desktop triggers each on hover (CSS). Touch has no hover, so they take
    // turns, each playing a whole number of loops so a turn never stops
    // part-way through a jump.
    var figures = [].slice.call(document.querySelectorAll('.hero-fig'));
    var cycleTimer = null, cycleIndex = -1, current = null;

    function clearFigure(f) {
      if (!f) return;
      f.classList.remove('is-playing');
      f.style.animationIterationCount = '';
    }

    function playNext() {
      clearFigure(current);
      cycleIndex = (cycleIndex + 1) % figures.length;
      var f = figures[cycleIndex];
      current = f;
      f.classList.add('is-playing');
      var dur = parseFloat(getComputedStyle(f).animationDuration) || 2;
      f.style.animationIterationCount = String(Math.max(1, Math.round(2.4 / dur)));
      var done = function (e) {
        if (e.target !== f || e.pseudoElement) return;  // ignore the speed lines
        f.removeEventListener('animationend', done);
        if (current !== f) return;
        clearFigure(f);
        cycleTimer = setTimeout(playNext, 700);         // a beat between figures
      };
      f.addEventListener('animationend', done);
    }

    function startCycle() {
      if (cycleTimer || current || reduce.matches || !figures.length) return;
      cycleTimer = setTimeout(function () { cycleTimer = null; playNext(); }, 900);
    }

    function stopCycle() {
      clearTimeout(cycleTimer);
      cycleTimer = null;
      figures.forEach(clearFigure);
      current = null;
    }

    function syncCycle() {
      if (noHover.matches && loop.isOn() && !reduce.matches) startCycle();
      else stopCycle();
    }

    function apply() {
      loop.apply();
      reduce.matches ? stopCycle() : syncCycle();
    }
    onChange(reduce, apply);
    onChange(noHover, syncCycle);
    apply();
  })();

  // --- 2. the producer photo ---------------------------------------------
  // Its background is a matrix-code scene, so the same field runs over it in
  // the photo's own green. A soft mask keeps the code off the subject: it
  // falls through the background at the top and down the sides, as in the shot.
  [].forEach.call(document.querySelectorAll('.photo-rain'), function (canvas) {
    var host = canvas.parentNode;
    // sized and spaced to sit with the code already in the shot rather than on
    // top of it — the baked glyphs are small and densely columned
    var field = makeField({
      gapMin: 9, gapDiv: 22, sizeMin: 6, sizeDiv: 34,
      speed: [18, 34], len: [7, 8], alpha: [0.13, 0.20],
      trail: '70,200,110', head: '175,255,205', limit: 1
    });
    var loop = makeLoop(host, canvas, {
      resize: function (W, H) { field.build(W, H); },
      draw: function (ctx, dt, now, W, H) {
        ctx.clearRect(0, 0, W, H);
        field.draw(ctx, dt, W, H);
        // clear an ellipse over the subject — measured off the photo, which has
        // him between 36-65% across and 34-72% down
        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';
        ctx.translate(W * 0.5, H * 0.68);
        ctx.scale(1, (H * 0.44) / (W * 0.66));
        var grad = ctx.createRadialGradient(0, 0, W * 0.26, 0, 0, W * 0.66);
        grad.addColorStop(0, 'rgba(0,0,0,1)');
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.fillRect(-W, -H, W * 2, H * 2);
        ctx.restore();
      }
    });
    onChange(reduce, loop.apply);
    loop.apply();
  });
})();
