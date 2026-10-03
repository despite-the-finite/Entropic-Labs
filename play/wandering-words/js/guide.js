/* =============================================================================
   guide.js — the invisible grown-up sitting next to her.

   A four-year-old cannot read the instruction, cannot read the button, and
   cannot read the word "Next". So the game has to do four things, everywhere,
   without exception:

     1. SAY what this screen is and what to do, out loud, as soon as it opens.
     2. Leave a way to HEAR IT AGAIN that is always in the same place.
     3. POINT at the thing to tap, with a hand she can follow.
     4. NOTICE when she has gone quiet, and gently offer help again.

   Every screen registers its narration here instead of speaking directly, so
   all four behaviours come for free and stay consistent across the whole game.
   ============================================================================= */
(function (LTR) {
  'use strict';

  var U = LTR.util, el = U.el;

  var script = null;        // the current screen's narration, for replay
  var stack = [];           // narration suspended by a modal on top of it
  var idleTimer = null;
  var idleCfg = null;
  var pointer = null;       // the pointing-hand element
  var pointTarget = null;
  var pointRaf = null;
  var lastInteraction = Date.now();
  var narrateTimer = null;

  function overlay() { return document.getElementById('overlays'); }

  /* --------------------------------------------------- first-gesture gate -- */

  var gestureWaiters = [];
  function waitForGesture(fn) {
    gestureWaiters.push(fn);
    if (gestureWaiters.length > 1) return;
    var fire = function () {
      ['pointerdown', 'touchstart', 'keydown', 'click'].forEach(function (e) {
        window.removeEventListener(e, fire, true);
      });
      var list = gestureWaiters;
      gestureWaiters = [];
      list.forEach(function (f) { try { f(); } catch (e) {} });
    };
    ['pointerdown', 'touchstart', 'keydown', 'click'].forEach(function (e) {
      window.addEventListener(e, fire, { capture: true, passive: true });
    });
  }

  /* ------------------------------------------------------- pointing hand -- */

  function positionPointer() {
    if (!pointer || !pointTarget || !pointTarget.isConnected) { clearPoint(); return; }
    var r = pointTarget.getBoundingClientRect();
    if (!r.width && !r.height) { pointRaf = requestAnimationFrame(positionPointer); return; }
    var side = pointer.dataset.side || 'below';
    var x = r.left + r.width / 2;
    var y = side === 'above' ? r.top : r.bottom;
    pointer.style.left = x + 'px';
    pointer.style.top = y + 'px';
    pointRaf = requestAnimationFrame(positionPointer);
  }

  function clearPoint() {
    if (pointRaf) { cancelAnimationFrame(pointRaf); pointRaf = null; }
    if (pointer && pointer.parentNode) pointer.parentNode.removeChild(pointer);
    if (pointTarget && pointTarget.classList) pointTarget.classList.remove('guide-target');
    pointer = null;
    pointTarget = null;
  }

  /* --------------------------------------------------------- idle nudging -- */

  function clearIdle() {
    if (idleTimer) { clearTimeout(idleTimer); idleTimer = null; }
    idleCfg = null;
  }

  function armIdle() {
    if (!idleCfg) return;
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(function () {
      idleTimer = null;
      if (!idleCfg) return;
      // Never talk over something that is already talking.
      if (LTR.audio.isSpeaking) { armIdle(); return; }
      var cfg = idleCfg;
      var node = typeof cfg.target === 'function' ? cfg.target() : cfg.target;
      LTR.audio.sfx('point');
      if (node) G.point(node, { side: cfg.side });
      if (cfg.say) LTR.audio.script([].concat(cfg.say));
      else G.replay();
      // Keep offering, a little less often each time, but never stop entirely:
      // a stuck child with nobody nearby must always get another chance.
      cfg.every = Math.min(60000, Math.round((cfg.every || 14000) * 1.4));
      armIdle();
    }, (idleCfg.every || 14000));
  }

  /* Any tap anywhere means she is still with us. */
  function touched() {
    lastInteraction = Date.now();
    armIdle();
  }
  ['pointerdown', 'keydown'].forEach(function (e) {
    window.addEventListener(e, touched, { passive: true });
  });

  /* ================================================================ API === */

  var G = LTR.guide = {

    /**
     * Narrate the current screen.
     *   parts  — an LTR.audio.script() list: strings, {pause}, {word}, …
     *   opts   — { delay, idle, target, side, replayable }
     * The script is remembered so the ear button and idle nudges can repeat it.
     */
    narrate: function (parts, opts) {
      opts = opts || {};
      // A modal narrates over the top of the screen underneath it. Remember
      // what the screen was saying so `restore()` can put it back when the
      // modal closes, instead of leaving the ear button silent.
      if (opts.transient) stack.push({ script: script, idle: idleCfg });
      script = [].concat(parts).filter(Boolean);
      if (narrateTimer) { clearTimeout(narrateTimer); narrateTimer = null; }

      // `silent` registers the script for the ear button and idle nudges
      // without saying it now — used where the scene is already speaking it
      // in its own voice, with its own word highlighting.
      if (!opts.silent) {
        var mine = script;
        var run = function () {
          narrateTimer = null;
          if (script !== mine) return;     // a newer screen took over
          LTR.audio.script(script);
        };
        // A short beat after the screen transition so the voice does not fight
        // the whoosh of the animation.
        var delay = opts.delay === undefined ? 380 : opts.delay;

        if (!LTR.audio.ready) {
          // Nothing can be spoken before the first gesture, so wait for one
          // rather than talking into a void. This is what makes the very first
          // screen of a fresh install work: the child taps (children always
          // tap), and the game starts talking to her.
          waitForGesture(function () { setTimeout(run, delay); });
        } else {
          narrateTimer = setTimeout(run, delay);
        }
      }

      if (opts.idle !== false) {
        G.watchIdle({
          target: opts.target || null,
          side: opts.side,
          // A shorter line to repeat when she goes quiet; without one the whole
          // screen script is replayed, which is right for most screens.
          say: opts.say || null,
          every: opts.idleAfter || 14000
        });
      }
      return script;
    },

    /** Say the current screen's narration again, from the top. */
    replay: function () {
      if (!script || !script.length) return Promise.resolve();
      return LTR.audio.script(script);
    },

    hasScript: function () { return !!(script && script.length); },

    /** Put back the narration a transient layer (a modal) interrupted. */
    restore: function () {
      if (!stack.length) return;
      var prev = stack.pop();
      script = prev.script;
      clearPoint();
      G.watchIdle(prev.idle);
    },

    /** Set (or clear) what the idle watcher should do when she goes quiet. */
    watchIdle: function (cfg) {
      clearIdle();
      if (!cfg) return;
      idleCfg = cfg;
      armIdle();
    },

    /**
     * Put a big animated hand under (or over) a node so she knows where to tap.
     * The hand tracks the node, so it follows animated or reflowing targets.
     */
    point: function (node, opts) {
      opts = opts || {};
      clearPoint();
      if (!node) return;
      pointTarget = node;
      if (node.classList) node.classList.add('guide-target');
      pointer = el('div.guide-hand', { text: opts.glyph || '👆', 'aria-hidden': 'true' });
      pointer.dataset.side = opts.side || 'below';
      if (opts.side === 'above') pointer.classList.add('above');
      overlay().appendChild(pointer);
      positionPointer();
    },

    unpoint: clearPoint,

    /** Called by the screen manager before every screen swap. */
    reset: function () {
      if (narrateTimer) { clearTimeout(narrateTimer); narrateTimer = null; }
      script = null;
      stack = [];
      clearIdle();
      clearPoint();
    },

    get msSinceInteraction() { return Date.now() - lastInteraction; }
  };

})(window.LTR);
