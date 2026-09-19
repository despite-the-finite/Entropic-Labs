/* =============================================================================
   game.js — boot.

   Load order is defined in index.html; by the time this runs every system and
   screen has registered itself. All this file does is start the world — and
   make sure that nothing, including a bug, can leave a four-year-old sitting
   in front of a screen that has stopped responding with nobody to ask.
   ============================================================================= */
(function (LTR) {
  'use strict';

  var U = LTR.util;

  /* Flip to true to develop with the tools panel (or add ?dev=1 to the URL). */
  LTR.DEV = false;
  LTR.DEV_LOG = false;

  var crashes = 0;

  /**
   * Put the child somewhere safe after an unexpected error.
   *
   * The old behaviour was to save and leave whatever half-built screen was on
   * display, which for a pre-reader is indistinguishable from the game being
   * over. Instead we say what happened out loud and go back to the map, which
   * she knows how to use. Repeated crashes fall back to the title screen.
   */
  function recover(err) {
    console.error('[LTR] runtime error', err);
    crashes += 1;
    try { LTR.state.flush(); } catch (e) {}
    if (crashes > 4) return;                 // stop trying; do not loop forever
    if (!LTR.ui || !LTR.ui.currentScreen) return;
    if (LTR.ui.currentScreen === 'map' || LTR.ui.currentScreen === 'title') return;
    try {
      LTR.audio.stop();
      LTR.audio.speak('Oops! Let us go back to the map.', { rate: .85 });
      LTR.ui.go(LTR.state.data && LTR.state.data.player.created ? 'map' : 'title');
    } catch (e) { /* nothing more we can do */ }
  }

  function boot() {
    /* --- keep the page still: this is a game, not a document -------------- */
    document.addEventListener('gesturestart', function (e) { e.preventDefault(); });
    document.addEventListener('dblclick', function (e) { e.preventDefault(); }, { passive: false });
    document.addEventListener('touchmove', function (e) {
      // Allow scrolling only inside deliberately scrollable panes.
      if (!e.target.closest || !e.target.closest('.book-scroll, .cc-wrap, .veil, textarea')) e.preventDefault();
    }, { passive: false });
    document.addEventListener('contextmenu', function (e) {
      if (!e.target.closest || !e.target.closest('textarea, input')) e.preventDefault();
    });

    /* --- never lose progress --------------------------------------------- */
    window.addEventListener('beforeunload', function () { LTR.state.flush(); });

    /* --- a crash should never leave a child staring at a frozen screen ---- */
    window.addEventListener('error', function (e) { recover(e.error || e.message); });
    window.addEventListener('unhandledrejection', function (e) { recover(e.reason); });

    /* --- go! -------------------------------------------------------------- */
    LTR.state.init();
    LTR.dev.init();
    LTR.reading.resetSession();
    LTR.progression.checkUnlocks();

    LTR.ui.go('title');

    U.log('booted · save via ' + LTR.storage.adapterName +
          ' · Reading Power ' + LTR.progression.level);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})(window.LTR);
