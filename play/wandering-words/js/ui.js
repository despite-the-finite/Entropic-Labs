/* =============================================================================
   ui.js — screen manager, world backdrops, HUD, particles, dialogue, rewards.

   Screens register a builder function and are swapped with a transition:
       LTR.ui.screen('title', function (params) { ... return el; });
       LTR.ui.go('title');
   ============================================================================= */
(function (LTR) {
  'use strict';

  var U = LTR.util, el = U.el;

  var screens = Object.create(null);
  var host, fxLayer, overlayLayer;
  var current = null, currentName = null;

  function layers() {
    host = host || document.getElementById('screens');
    fxLayer = fxLayer || document.getElementById('fx');
    overlayLayer = overlayLayer || document.getElementById('overlays');
  }

  var UI = LTR.ui = {

    get currentScreen() { return currentName; },

    screen: function (name, builder) { screens[name] = builder; },

    /** Swap to another screen. Params are handed to that screen's builder. */
    go: function (name, params) {
      layers();
      if (!screens[name]) { console.error('[LTR] no screen named ' + name); return; }

      U.cancelTimers();
      LTR.audio.stop();
      UI.clearFx();

      var next = screens[name](params || {});
      next.classList.add('screen', 'is-entering');

      var old = current;
      if (old) {
        old.classList.remove('is-entering');
        old.classList.add('is-leaving');
        setTimeout(function () { if (old.parentNode) old.parentNode.removeChild(old); }, 320);
      }
      host.appendChild(next);
      current = next;
      currentName = name;
      LTR.emit('screen-changed', name);
      return next;
    },

    /** Rebuild the screen currently displayed (after a dev-mode change etc). */
    refresh: function () { if (currentName) UI.go(currentName, UI._lastParams || {}); },

    /* ================================================== world backdrops === */

    /**
     * A CSS-painted environment. Every scene gets one so no screen is ever a
     * flat colour. kind: forest | glade | night | river | gate | cave | valley
     *                   | title | map
     */
    env: function (kind) {
      var e = el('div.env.env-' + kind);
      var add = function (spec, attrs) { e.appendChild(el(spec, attrs)); };

      if (kind !== 'map' && kind !== 'cave') {
        add('div.orb' + (kind === 'night' || kind === 'title' ? '.float' : ''));
      }

      if (kind === 'forest' || kind === 'glade' || kind === 'gate' || kind === 'valley') {
        add('div.cloud.drift-slow', { style: { top: '9%', left: '-20vw' } });
        add('div.cloud.drift-mid',  { style: { top: '20%', left: '-40vw', transform: 'scale(.75)' } });
        add('div.hill.h2');
        add('div.hill.h3');
        add('div.hill');
        [[6, 1], [22, .8], [78, .9], [92, 1.05]].forEach(function (t) {
          add('div.tree.sway', { style: { left: t[0] + '%', transform: 'scale(' + t[1] + ')' } });
        });
        add('div.tree.t-far', { style: { left: '40%' } });
        add('div.tree.t-far', { style: { left: '58%' } });
      }

      if (kind === 'glade') {
        for (var f = 0; f < 7; f++) {
          add('div', {
            text: U.pick(['🌸', '🌼', '🌷', '🍄']),
            style: {
              left: (6 + f * 13) + '%', bottom: (4 + (f % 3) * 7) + '%',
              fontSize: 'clamp(1.2rem,4vw,2rem)', animation: 'bob ' + (2 + f * .3) + 's ease-in-out infinite'
            }
          });
        }
      }

      if (kind === 'night' || kind === 'title') {
        for (var i = 0; i < 26; i++) {
          add('div.twinkle', {
            text: '·',
            style: {
              left: Math.random() * 100 + '%', top: Math.random() * 62 + '%',
              color: '#fff', fontSize: (8 + Math.random() * 22) + 'px',
              animationDelay: (Math.random() * 3) + 's',
              textShadow: '0 0 8px #fff'
            }
          });
        }
        if (kind === 'night') {
          add('div.hill', { style: { background: '#274a3c' } });
          add('div.hill.h2', { style: { background: '#1d3b2a' } });
          [[8, .9], [80, 1]].forEach(function (t) {
            add('div.tree.sway', { style: { left: t[0] + '%', transform: 'scale(' + t[1] + ')', filter: 'brightness(.55) saturate(.7)' } });
          });
          for (var ff = 0; ff < 8; ff++) {
            add('div.p.p-firefly', {
              style: {
                left: (10 + Math.random() * 80) + '%', top: (40 + Math.random() * 45) + '%',
                animationDelay: (Math.random() * 3) + 's'
              }
            });
          }
        }
      }

      if (kind === 'river') {
        add('div', { style: {
          left: 0, right: 0, bottom: 0, height: '46%',
          background: 'linear-gradient(#7fc7e8, #3f9ec9)'
        } });
        for (var r = 0; r < 4; r++) {
          add('div', { style: {
            left: '-10%', right: '-10%', bottom: (6 + r * 9) + '%', height: '.5rem',
            background: 'rgba(255,255,255,.35)', borderRadius: '999px',
            animation: 'sway ' + (3 + r) + 's ease-in-out infinite'
          } });
        }
        add('div.hill.h2', { style: { background: '#8fd0a0', bottom: '40%' } });
      }

      if (kind === 'cave') {
        add('div', { style: {
          left: 0, right: 0, top: 0, height: '30%',
          background: 'linear-gradient(#2a1d3d, transparent)'
        } });
        for (var c = 0; c < 6; c++) {
          add('div', { style: {
            left: (5 + c * 17) + '%', top: 0, width: '6%', height: (8 + Math.random() * 14) + '%',
            background: '#4a3566', clipPath: 'polygon(0 0, 100% 0, 50% 100%)'
          } });
        }
      }

      if (kind === 'gate') {
        add('div', { style: {
          left: '50%', bottom: '12%', transform: 'translateX(-50%)',
          width: 'min(34vmin, 18rem)', opacity: .35
        }, html: LTR.art.door('') });
      }

      if (kind === 'map') {
        for (var m = 0; m < 12; m++) {
          add('div', {
            text: U.pick(['🌲', '⛰️', '🌊', '🏕️', '🌾']),
            style: {
              left: Math.random() * 92 + '%', top: Math.random() * 88 + '%',
              fontSize: 'clamp(1rem,3vw,1.8rem)', opacity: .35
            }
          });
        }
      }

      // Drifting leaves add life to every outdoor scene.
      if (['forest', 'glade', 'gate', 'valley'].indexOf(kind) !== -1) {
        for (var lf = 0; lf < 5; lf++) {
          add('div.p.p-leaf', {
            text: U.pick(['🍃', '🍂', '🌿']),
            style: {
              left: (Math.random() * 90) + '%', top: '-8vh',
              '--dur': (7 + Math.random() * 8) + 's',
              '--dx': (Math.random() * 20 - 10) + 'vw',
              animationDelay: (Math.random() * 8) + 's'
            }
          });
        }
      }

      add('div.vignette');
      return e;
    },

    /* ============================================================== HUD === */

    /**
     * The in-world HUD: a way back, the treasure counters, and Reading Power.
     * opts: { back: fn|null, power: bool, wallet: bool, book: bool }
     */
    hud: function (opts) {
      opts = opts || {};
      var bar = el('div.hud');

      if (opts.back) {
        bar.appendChild(el('button.icon-btn', {
          text: '⬅️', 'aria-label': 'Back to the map',
          onClick: function () { LTR.audio.sfx('tap'); opts.back(); }
        }));
      }
      bar.appendChild(el('div.spacer'));

      if (opts.wallet !== false) {
        var w = LTR.state.data.wallet;
        var starChip = el('div.hud-chip', [el('span.emo', { text: '⭐' }), el('span.n', { text: String(w.stars) })]);
        var gemChip  = el('div.hud-chip', [el('span.emo', { text: '💎' }), el('span.n', { text: String(w.gems) })]);
        bar.appendChild(starChip); bar.appendChild(gemChip);
        LTR.on('wallet-changed', function (wal) {
          var a = starChip.querySelector('.n'), b = gemChip.querySelector('.n');
          if (a) { a.textContent = String(wal.stars); starChip.classList.remove('nudge'); void starChip.offsetWidth; starChip.classList.add('nudge'); }
          if (b) b.textContent = String(wal.gems);
        });
      }

      if (opts.power !== false) bar.appendChild(UI.powerMeter());

      if (opts.book) {
        bar.appendChild(el('button.icon-btn', {
          text: '📔', 'aria-label': 'My Adventure Book',
          onClick: function () { LTR.audio.sfx('tap'); LTR.ui.go('book'); }
        }));
      }
      return bar;
    },

    powerMeter: function () {
      var P = LTR.progression;
      var fill = el('span');
      var badge = el('div.badge', { text: String(P.level) });
      var node = el('div.power', { title: 'Reading Power' }, [
        badge,
        el('div.bar', fill),
        el('div.label', { text: P.rank().name })
      ]);
      var paint = function () {
        fill.style.width = (P.levelProgress() * 100) + '%';
        badge.textContent = String(P.level);
        node.querySelector('.label').textContent = P.rank().name;
      };
      setTimeout(paint, 60);
      LTR.on('power-changed', paint);
      return node;
    },

    /* ========================================================== helpers === */

    /** A tappable speaker that says something on demand (never automatic). */
    speakerButton: function (getText, kind) {
      var b = el('button.icon-btn.speaker', { text: '🔊', 'aria-label': 'Hear it' });
      b.addEventListener('click', function () {
        LTR.audio.sfx('tap');
        var t = typeof getText === 'function' ? getText() : getText;
        if (!t) return;
        b.classList.add('nudge');
        setTimeout(function () { b.classList.remove('nudge'); }, 450);
        if (kind === 'letterSound') LTR.audio.letterSound(t);
        else if (kind === 'letterName') LTR.audio.letterName(t);
        else if (kind === 'word') LTR.audio.word(t);
        else LTR.audio.sentence(t);
      });
      return b;
    },

    /** Character portrait element. */
    actor: function (id, opts) {
      opts = opts || {};
      var cls = 'actor ' + (opts.anim || (id === 'poppy' ? 'hop' : 'breathe'));
      var node = el('div', { class: cls, html: LTR.art.byId(id, '', opts.mood) });
      if (opts.enter) node.classList.add(opts.enter);
      return node;
    },

    /* ========================================================== effects === */

    clearFx: function () { layers(); U.clear(fxLayer); },

    /** Golden sparkle burst at a page coordinate. */
    sparkleAt: function (x, y, count) {
      layers();
      var n = count || 14;
      for (var i = 0; i < n; i++) {
        var a = Math.random() * Math.PI * 2;
        var d = 30 + Math.random() * 90;
        var p = el('div.p.p-spark', {
          style: {
            left: x + 'px', top: y + 'px',
            '--dx': Math.cos(a) * d + 'px',
            '--dy': Math.sin(a) * d + 'px',
            '--dur': (.6 + Math.random() * .6) + 's'
          }
        });
        fxLayer.appendChild(p);
        (function (node) { setTimeout(function () { if (node.parentNode) node.parentNode.removeChild(node); }, 1400); })(p);
      }
    },

    sparkleOn: function (node, count) {
      if (!node) return;
      var r = node.getBoundingClientRect();
      UI.sparkleAt(r.left + r.width / 2, r.top + r.height / 2, count);
    },

    confetti: function (n) {
      layers();
      var colors = ['#ffd75e', '#ff9db8', '#a58cff', '#7fd694', '#6bb6f0', '#ff8a5b'];
      for (var i = 0; i < (n || 60); i++) {
        var p = el('div.p.p-confetti', {
          style: {
            left: Math.random() * 100 + '%', top: '0',
            background: U.pick(colors),
            '--dur': (2 + Math.random() * 2.4) + 's',
            '--spin': (360 + Math.random() * 900) + 'deg',
            animationDelay: (Math.random() * .8) + 's'
          }
        });
        fxLayer.appendChild(p);
        (function (node) { setTimeout(function () { if (node.parentNode) node.parentNode.removeChild(node); }, 5200); })(p);
      }
    },

    /** A rescued word flies off to the Great Book — the core reward beat. */
    flyWord: function (text, fromNode) {
      layers();
      if (!fromNode) return;
      var r = fromNode.getBoundingClientRect();
      var p = el('div.p.p-word', {
        text: String(text).toUpperCase(),
        style: {
          left: (r.left + r.width / 2) + 'px', top: (r.top + r.height / 2) + 'px',
          transform: 'translate(-50%,-50%)',
          '--dx': (window.innerWidth * 0.42 - r.left) + 'px',
          '--dy': (-r.top - 40) + 'px',
          '--dur': '1.2s'
        }
      });
      fxLayer.appendChild(p);
      setTimeout(function () { if (p.parentNode) p.parentNode.removeChild(p); }, 1500);
    },

    /** Big friendly praise bubble. type: 'good' | 'soft' */
    cheer: function (text, type, parent) {
      var host2 = parent || current || document.body;
      var c = el('div.cheer' + (type === 'soft' ? '.soft' : ''), { text: text });
      host2.appendChild(c);
      setTimeout(function () { if (c.parentNode) c.parentNode.removeChild(c); }, 900);
      return c;
    },

    /* =========================================================== modals === */

    /**
     * A modal. actions: [{ label, style, value, primary }]
     * Resolves with the chosen action's value.
     */
    modal: function (cfg) {
      layers();
      return new Promise(function (resolve) {
        var veil = el('div.veil');
        var box = el('div.modal');

        if (cfg.glyph) box.appendChild(el('div', { style: { fontSize: 'clamp(3rem,14vw,5.5rem)' }, class: 'fireworks-glow', text: cfg.glyph }));
        if (cfg.artHTML) box.appendChild(el('div', { style: { width: 'min(9rem,34vw)', margin: '0 auto' }, html: cfg.artHTML }));
        if (cfg.title) box.appendChild(el('h2', { text: cfg.title }));
        if (cfg.body) box.appendChild(typeof cfg.body === 'string' ? el('p', { text: cfg.body }) : cfg.body);
        if (cfg.extra) box.appendChild(cfg.extra);

        var actions = el('div.modal-actions');
        (cfg.actions || [{ label: 'OK', value: true }]).forEach(function (a) {
          actions.appendChild(el('button', {
            class: 'btn ' + (a.style || 'btn-leaf') + (a.big ? ' btn-huge' : ''),
            text: a.label,
            onClick: function () {
              LTR.audio.sfx('tap');
              if (veil.parentNode) veil.parentNode.removeChild(veil);
              resolve(a.value);
            }
          }));
        });
        box.appendChild(actions);
        veil.appendChild(box);
        overlayLayer.appendChild(veil);
      });
    },

    /**
     * Grant rewards and show them being earned. `rewards` is the data-driven
     * list from chapters.js. Returns a promise that resolves when dismissed.
     * Only shows a modal when something notable was earned.
     */
    grantRewards: function (rewards, opts) {
      opts = opts || {};
      if (!rewards || !rewards.length) return Promise.resolve();

      var shown = [];
      rewards.forEach(function (r) {
        if (r.kind === 'stars') {
          LTR.state.addStars(r.n);
          shown.push({ glyph: '⭐', label: '+' + r.n });
        } else if (r.kind === 'gems') {
          LTR.state.addGems(r.n);
          shown.push({ glyph: '💎', label: '+' + r.n });
        } else if (r.item) {
          var isNew = LTR.state.collect(r.kind, r.item);
          if (isNew) {
            shown.push({
              glyph: r.item.glyph, label: r.item.name,
              note: r.item.note, art: r.item.art
            });
          }
        }
      });

      if (!shown.length) return Promise.resolve();

      LTR.audio.sfx('reward');
      UI.confetti(36);

      var grid = el('div.row');
      shown.forEach(function (s) {
        grid.appendChild(el('div.reward-item', [
          el('div.glyph', { text: s.glyph }),
          el('div.label', { text: s.label })
        ]));
      });

      var notes = shown.filter(function (s) { return s.note; });
      if (notes.length) {
        grid.appendChild(el('div', {
          style: { width: '100%', marginTop: '.4rem', fontWeight: '700', color: 'var(--ink-soft)' },
          text: notes.map(function (s) { return s.name || s.label; }).join(' · ')
        }));
      }

      return UI.modal({
        title: opts.title || 'You found treasure!',
        body: opts.body || null,
        extra: grid,
        actions: [{ label: 'Yay!', value: true, style: 'btn-leaf', big: true }]
      });
    },

    /** Reading Power rank-up celebration. */
    celebrateRank: function (rank) {
      LTR.audio.sfx('fanfare');
      UI.confetti(80);
      var badge = el('div', { class: 'rank-up', style: { fontSize: 'clamp(3.5rem,16vw,6rem)' }, text: rank.glyph });
      return UI.modal({
        title: 'Reading Power up!',
        extra: el('div.stack', [
          badge,
          el('div', { style: { fontSize: 'var(--fs-big)', fontWeight: '900', color: 'var(--magic-deep)' }, text: 'You are now a ' + rank.name + '!' })
        ]),
        actions: [{ label: 'Wow!', value: true, style: 'btn-magic', big: true }]
      });
    },

    /** Small non-blocking note (used sparingly). */
    toast: function (text, glyph) {
      layers();
      var t = el('div', {
        style: {
          position: 'absolute', left: '50%', top: '12%', transform: 'translateX(-50%)',
          background: 'rgba(255,253,246,.97)', borderRadius: '999px',
          padding: '.5rem 1.1rem', fontWeight: '800', boxShadow: 'var(--shadow-pop)',
          zIndex: 85, maxWidth: '90vw', textAlign: 'center'
        },
        class: 'enter-up',
        text: (glyph ? glyph + '  ' : '') + text
      });
      overlayLayer.appendChild(t);
      setTimeout(function () {
        t.style.transition = 'opacity .4s, transform .4s';
        t.style.opacity = '0'; t.style.transform = 'translateX(-50%) translateY(-1rem)';
        setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 450);
      }, 2200);
    },

    /* ====================================================== parent gate === */

    /**
     * The grown-up door: press and hold for 2.5s, then answer a question no
     * 4-year-old will answer by accident.
     */
    parentGate: function () {
      var btn = el('button.parent-gate', { text: '⚙️', 'aria-label': 'For grown-ups (press and hold)' });
      var timer = null, ring = null;

      function start(e) {
        e.preventDefault();
        btn.classList.add('charging');
        timer = setTimeout(function () {
          btn.classList.remove('charging');
          LTR.audio.sfx('unlock');
          LTR.screens.parentChallenge();
        }, 2500);
      }
      function cancel() {
        btn.classList.remove('charging');
        if (timer) { clearTimeout(timer); timer = null; }
      }

      btn.addEventListener('pointerdown', start);
      ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (ev) {
        btn.addEventListener(ev, cancel);
      });
      if (ring) { /* reserved for a future radial progress ring */ }
      return btn;
    }
  };

})(window.LTR);
