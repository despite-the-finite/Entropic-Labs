/* =============================================================================
   game.js — boot.

   Load order is defined in index.html; by the time this runs every system and
   screen has registered itself. All this file does is start the world.
   ============================================================================= */
(function (LTR) {
  'use strict';

  var U = LTR.util;

  /* Flip to true to develop with the tools panel (or add ?dev=1 to the URL). */
  LTR.DEV = false;
  LTR.DEV_LOG = false;

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
    window.addEventListener('error', function (e) {
      console.error('[LTR] runtime error', e.error || e.message);
      if (!LTR.ui || !LTR.ui.currentScreen) return;
      LTR.state.flush();
    });

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
