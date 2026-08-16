/* Entropic Labs — hero motion.
 *
 * The banner artwork ships as a flat JPEG with the subtitle, the spectrum bars
 * and the five figures painted out of it (see img/hero.jpg). Those elements are
 * layered back on top as live ones: this file draws the falling code and the
 * spectrum bars into a canvas, and cycles the figure animations on touch
 * devices, where there is no hover to trigger them.
 *
 * Everything is deliberately low-key: the point is that the banner looks alive,
 * not that it demands attention. Nothing runs under prefers-reduced-motion, and
 * the loop stops whenever the hero is off screen or the tab is hidden.
 */
(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var scene = document.querySelector('.hero-scene');
  var canvas = document.querySelector('.hero-fx');
  if (!scene || !canvas) return;

  var ctx = canvas.getContext('2d', { alpha: true });
  var W = 0, H = 0, dpr = 1;

  // --- falling code ------------------------------------------------------
  // The artwork already has static glyph columns; these are extra ones that
  // fall through it, so the whole field reads as moving without doubling up.
  var GLYPHS = '01234567890ABCDEFΨΩΣΦΔ□◇┐└┤';
  var columns = [];
  var BARS_TOP = 0.852;          // matches the strip painted out of the JPEG

  function buildColumns() {
    columns = [];
    var step = Math.max(26, W / 64);
    for (var x = step / 2; x < W; x += step) {
      columns.push({
        x: x + (Math.random() - 0.5) * step * 0.4,
        y: Math.random() * H,
        speed: 14 + Math.random() * 26,     // px per second
        len: 6 + (Math.random() * 7) | 0,
        size: Math.max(9, W / 150),
        alpha: 0.10 + Math.random() * 0.16,
        glyphs: [],
        tick: 0
      });
    }
    columns.forEach(function (c) {
      for (var i = 0; i < c.len; i++) c.glyphs.push(GLYPHS[(Math.random() * GLYPHS.length) | 0]);
    });
  }

  function drawColumns(dt) {
    var limit = H * BARS_TOP;
    ctx.textAlign = 'center';
    for (var i = 0; i < columns.length; i++) {
      var c = columns[i];
      c.y += c.speed * dt;
      c.tick += dt;
      if (c.tick > 0.28) {                  // occasionally reshuffle a glyph
        c.tick = 0;
        c.glyphs[(Math.random() * c.len) | 0] = GLYPHS[(Math.random() * GLYPHS.length) | 0];
      }
      if (c.y - c.len * c.size > limit) {
        c.y = -c.size * c.len;
        c.x = Math.random() * W;
        c.speed = 14 + Math.random() * 26;
      }
      ctx.font = c.size + 'px ui-monospace, Menlo, Consolas, monospace';
      for (var g = 0; g < c.len; g++) {
        var y = c.y - g * c.size * 1.15;
        if (y < -c.size || y > limit) continue;
        var fade = 1 - g / c.len;
        ctx.fillStyle = g === 0
          ? 'rgba(180,255,238,' + (c.alpha * 1.7).toFixed(3) + ')'
          : 'rgba(47,224,199,' + (c.alpha * fade).toFixed(3) + ')';
        ctx.fillText(c.glyphs[g], c.x, y);
      }
    }
  }

  // --- spectrum bars -----------------------------------------------------
  // Sampled from the original artwork so the live bars keep its colour ramp.
  var PALETTE = [[6,109,87],[12,106,91],[25,98,92],[35,110,111],[54,103,114],[65,108,134],
                 [75,96,128],[87,90,136],[91,76,128],[93,63,119],[95,51,113],[100,45,110],[108,36,112]];
  var bars = [];
  var BAR_COUNT = 96;
  var BAR_SPEED = 0.38;   // how fast the bars dance; lower is calmer
  var BAR_EASE = 0.09;    // how hard each bar chases its target height

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

  function drawBars(time) {
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
      // glide toward the target instead of snapping to it
      b.h += (target - b.h) * BAR_EASE;
      var h = b.h;
      var c = paletteAt(t);
      var x = i * (bw + gap);
      ctx.fillStyle = 'rgb(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ')';
      ctx.fillRect(x, H - h, bw, h);
      // lighter cap, as in the artwork
      ctx.fillStyle = 'rgba(' + ((c[0] + 60) | 0) + ',' + ((c[1] + 70) | 0) + ',' + ((c[2] + 70) | 0) + ',0.85)';
      ctx.fillRect(x, H - h, bw, Math.max(1, strip * 0.02));
    }
  }

  // --- loop --------------------------------------------------------------
  var running = false, last = 0, visible = true, onScreen = true;

  function resize() {
    var r = scene.getBoundingClientRect();
    if (!r.width) return;
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = r.width; H = r.height;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    buildColumns();
    if (!bars.length) buildBars();
  }

  // 30fps is plenty for drifting glyphs and bouncing bars, and halves the work
  // on a phone. The figure and subtitle animations are CSS, so they stay smooth
  // at the display's own rate regardless.
  var FRAME = 1000 / 30;

  function frame(now) {
    if (!running) return;
    requestAnimationFrame(frame);
    var elapsed = now - last;
    if (elapsed < FRAME) return;
    var dt = Math.min(0.05, elapsed / 1000);
    last = now;
    ctx.clearRect(0, 0, W, H);
    drawColumns(dt);
    drawBars(now / 1000);
  }

  function start() {
    if (running || reduce.matches || !visible || !onScreen) return;
    running = true;
    last = performance.now();
    requestAnimationFrame(frame);
  }

  function stop() {
    running = false;
  }

  function still() {
    // one static frame, so the bars and code are present but frozen
    if (!W) return;
    ctx.clearRect(0, 0, W, H);
    drawColumns(0);
    drawBars(0);
  }

  // --- figures -----------------------------------------------------------
  // Desktop triggers each figure on hover (CSS). Touch has no hover, so the
  // figures take turns instead, one at a time.
  var figures = [].slice.call(document.querySelectorAll('.hero-fig'));
  var cycleTimer = null;

  function startCycle() {
    if (cycleTimer || reduce.matches || !figures.length) return;
    var i = -1;
    var step = function () {
      figures.forEach(function (f) { f.classList.remove('is-playing'); });
      i = (i + 1) % figures.length;
      figures[i].classList.add('is-playing');
      cycleTimer = setTimeout(step, 2600);
    };
    cycleTimer = setTimeout(step, 900);
  }

  function stopCycle() {
    clearTimeout(cycleTimer);
    cycleTimer = null;
    figures.forEach(function (f) { f.classList.remove('is-playing'); });
  }

  var noHover = window.matchMedia('(hover: none)');

  function syncCycle() {
    if (noHover.matches && visible && onScreen && !reduce.matches) startCycle();
    else stopCycle();
  }

  // --- wiring ------------------------------------------------------------
  resize();
  window.addEventListener('resize', function () { resize(); if (!running) still(); });

  document.addEventListener('visibilitychange', function () {
    visible = !document.hidden;
    visible ? start() : stop();
    syncCycle();
  });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      onScreen = entries[0].isIntersecting;
      onScreen ? start() : stop();
      syncCycle();
    }, { threshold: 0 }).observe(scene);
  }

  function apply() {
    if (reduce.matches) { stop(); stopCycle(); still(); }
    else { start(); syncCycle(); }
  }
  (reduce.addEventListener ? reduce.addEventListener.bind(reduce, 'change') : reduce.addListener.bind(reduce))(apply);
  (noHover.addEventListener ? noHover.addEventListener.bind(noHover, 'change') : noHover.addListener.bind(noHover))(syncCycle);

  apply();
})();
