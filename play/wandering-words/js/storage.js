/* =============================================================================
   storage.js — the persistence layer.

   Everything the game saves goes through LTR.storage. The rest of the codebase
   never touches localStorage directly, so swapping in a cloud backend later is
   a matter of registering a different adapter:

       LTR.storage.useAdapter({ load(key), save(key, value), remove(key) });

   Adapters may be synchronous or return Promises — the game only ever reads the
   in-memory snapshot, and writes are fire-and-forget + debounced.
   ============================================================================= */
(function (LTR) {
  'use strict';

  var SAVE_KEY = 'indra.wanderingWords.save.v1';
  var SAVE_DEBOUNCE = 400;

  /* ------------------------------------------------------------ adapters --- */

  /** Default: browser localStorage, with an in-memory fallback (file:// / private mode). */
  function localAdapter() {
    var mem = Object.create(null);
    var ok = (function () {
      try {
        var k = '__ltr_probe__';
        window.localStorage.setItem(k, '1');
        window.localStorage.removeItem(k);
        return true;
      } catch (e) { return false; }
    })();

    return {
      name: ok ? 'localStorage' : 'memory',
      load: function (key) {
        try { return ok ? window.localStorage.getItem(key) : (mem[key] || null); }
        catch (e) { return mem[key] || null; }
      },
      save: function (key, value) {
        try { if (ok) window.localStorage.setItem(key, value); else mem[key] = value; }
        catch (e) { mem[key] = value; }
      },
      remove: function (key) {
        try { if (ok) window.localStorage.removeItem(key); } catch (e) {}
        delete mem[key];
      }
    };
  }

  var adapter = localAdapter();
  var pending = null;
  var lastSavedAt = 0;

  var storage = LTR.storage = {

    get adapterName() { return adapter.name; },

    useAdapter: function (a) {
      adapter = a;
      LTR.util.log('storage adapter →', a.name || 'custom');
    },

    /** Returns the parsed save object, or null when there is no save yet. */
    load: function () {
      var raw;
      try { raw = adapter.load(SAVE_KEY); } catch (e) { raw = null; }
      if (!raw) return null;
      try {
        var data = JSON.parse(raw);
        return (data && typeof data === 'object') ? data : null;
      } catch (e) {
        console.warn('[LTR] save file was unreadable; starting fresh.', e);
        return null;
      }
    },

    /** Debounced write — safe to call after every single interaction. */
    save: function (data) {
      if (pending) clearTimeout(pending);
      pending = setTimeout(function () {
        pending = null;
        storage.saveNow(data);
      }, SAVE_DEBOUNCE);
    },

    saveNow: function (data) {
      if (pending) { clearTimeout(pending); pending = null; }
      try {
        adapter.save(SAVE_KEY, JSON.stringify(data));
        lastSavedAt = Date.now();
        LTR.emit('saved', data);
      } catch (e) {
        console.warn('[LTR] could not save progress', e);
      }
    },

    clear: function () {
      if (pending) { clearTimeout(pending); pending = null; }
      adapter.remove(SAVE_KEY);
    },

    get lastSavedAt() { return lastSavedAt; },

    /** Parent mode: hand a parent their child's data as a file. */
    exportJSON: function (data) {
      return JSON.stringify(data, null, 2);
    }
  };

  /* Flush any debounced write when the tab is hidden or closed so a child
     closing the lid mid-session never loses the last few stars. */
  window.addEventListener('pagehide', function () { LTR.emit('flush-save'); });
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') LTR.emit('flush-save');
  });

})(window.LTR);
