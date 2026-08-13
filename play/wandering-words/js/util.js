/* =============================================================================
   util.js — namespace + tiny helpers
   Classic scripts (not ES modules) on purpose: the game must also run when the
   file is opened straight from disk (file://), where module loading is blocked.
   ============================================================================= */
(function (global) {
  'use strict';

  var LTR = global.LTR = global.LTR || {};

  /* ---------------------------------------------------------------- DOM ---- */
  var U = LTR.util = {};

  /**
   * el('div.foo.bar#id', {attrs}, [children|string])
   * Terse element builder used everywhere instead of innerHTML soup.
   */
  U.el = function (spec, attrs, children) {
    var tag = 'div', id = null, classes = [];
    var m = String(spec).match(/^([a-zA-Z0-9-]+)?((?:[.#][\w-]+)*)$/);
    if (m) {
      if (m[1]) tag = m[1];
      (m[2] || '').split(/(?=[.#])/).forEach(function (t) {
        if (!t) return;
        if (t[0] === '.') classes.push(t.slice(1));
        else if (t[0] === '#') id = t.slice(1);
      });
    }
    var node = document.createElement(tag);
    if (id) node.id = id;
    if (classes.length) node.className = classes.join(' ');

    if (attrs && typeof attrs === 'object' && !Array.isArray(attrs) && !(attrs instanceof Node)) {
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (v === null || v === undefined || v === false) return;
        if (k === 'text') node.textContent = v;
        else if (k === 'html') node.innerHTML = v;
        else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
        else if (k === 'dataset') Object.assign(node.dataset, v);
        else if (k.slice(0, 2) === 'on' && typeof v === 'function') {
          node.addEventListener(k.slice(2).toLowerCase(), v);
        } else if (k === 'class') node.className += (node.className ? ' ' : '') + v;
        else node.setAttribute(k, v === true ? '' : v);
      });
    } else if (attrs !== undefined && attrs !== null) {
      children = attrs;
    }

    U.append(node, children);
    return node;
  };

  U.append = function (parent, children) {
    if (children === null || children === undefined) return parent;
    if (Array.isArray(children)) {
      children.forEach(function (c) { U.append(parent, c); });
    } else if (children instanceof Node) {
      parent.appendChild(children);
    } else {
      parent.appendChild(document.createTextNode(String(children)));
    }
    return parent;
  };

  U.clear = function (node) { while (node && node.firstChild) node.removeChild(node.firstChild); return node; };
  U.qs  = function (sel, root) { return (root || document).querySelector(sel); };
  U.qsa = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  /** Pointer/tap handler that fires once per gesture on mouse *and* touch. */
  U.tap = function (node, fn) {
    node.addEventListener('click', function (e) { fn(e); });
    return node;
  };

  /* --------------------------------------------------------------- Math ---- */
  U.rand = function (n) { return Math.floor(Math.random() * n); };
  U.pick = function (arr) { return arr[U.rand(arr.length)]; };
  U.range = function (n) { var a = []; for (var i = 0; i < n; i++) a.push(i); return a; };
  U.clamp = function (v, lo, hi) { return Math.max(lo, Math.min(hi, v)); };

  U.shuffle = function (arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = U.rand(i + 1); var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  };

  /** Pick n distinct items from arr (returns fewer if arr is short). */
  U.sample = function (arr, n) { return U.shuffle(arr).slice(0, n); };

  U.uniqueBy = function (arr, keyFn) {
    var seen = Object.create(null), out = [];
    arr.forEach(function (x) {
      var k = keyFn(x);
      if (!seen[k]) { seen[k] = 1; out.push(x); }
    });
    return out;
  };

  /* --------------------------------------------------------------- Time ---- */
  U.wait = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };

  /** setTimeout that is automatically cancelled when the screen changes. */
  var timers = [];
  U.later = function (ms, fn) {
    var id = setTimeout(function () {
      timers = timers.filter(function (t) { return t !== id; });
      fn();
    }, ms);
    timers.push(id);
    return id;
  };
  U.cancelTimers = function () { timers.forEach(clearTimeout); timers = []; };

  /* --------------------------------------------------------------- Text ---- */
  U.caps = function (s) { return String(s).toUpperCase(); };
  U.titleCase = function (s) { return String(s).charAt(0).toUpperCase() + String(s).slice(1); };

  /* -------------------------------------------------------------- Events --- */
  /** Minimal pub/sub so systems stay decoupled (state → ui, progression → hud). */
  var bus = Object.create(null);
  LTR.on = function (evt, fn) {
    (bus[evt] = bus[evt] || []).push(fn);
    return function off() { bus[evt] = bus[evt].filter(function (f) { return f !== fn; }); };
  };
  LTR.emit = function (evt, payload) {
    (bus[evt] || []).forEach(function (fn) {
      try { fn(payload); } catch (err) { console.error('[LTR] listener error on "' + evt + '"', err); }
    });
  };

  /* --------------------------------------------------------------- Misc ---- */
  U.log = function () {
    if (!LTR.DEV_LOG) return;
    console.log.apply(console, ['%c[LTR]', 'color:#8b6cf0;font-weight:bold'].concat([].slice.call(arguments)));
  };

  /** Deep-ish merge used to upgrade old save files with new default fields. */
  U.defaults = function (target, defs) {
    Object.keys(defs).forEach(function (k) {
      var d = defs[k];
      if (target[k] === undefined) {
        target[k] = (d && typeof d === 'object' && !Array.isArray(d)) ? U.defaults({}, d)
                  : (Array.isArray(d) ? d.slice() : d);
      } else if (d && typeof d === 'object' && !Array.isArray(d) && typeof target[k] === 'object' && target[k]) {
        U.defaults(target[k], d);
      }
    });
    return target;
  };

  U.query = function (key) {
    var m = new RegExp('[?&]' + key + '=([^&]*)').exec(global.location.search);
    return m ? decodeURIComponent(m[1]) : null;
  };

})(window);
