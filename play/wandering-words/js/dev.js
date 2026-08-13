/* =============================================================================
   dev.js — development tools. OFF by default; never reachable during play.

   Turn on with any of:
     • set LTR.DEV = true in js/game.js
     • add ?dev=1 to the URL
     • run  LTR.dev.enable()  in the console

   Nothing here is rendered unless dev mode is explicitly on.
   ============================================================================= */
(function (LTR) {
  'use strict';

  var U = LTR.util, el = U.el;

  var enabled = false;
  var panel = null, toggle = null, open = false;

  var Dev = LTR.dev = {

    get enabled() { return enabled; },

    enable: function () {
      enabled = true;
      LTR.DEV_LOG = true;
      mountToggle();
      console.log('%c[LTR] dev mode ON', 'color:#8b6cf0;font-weight:bold');
    },

    disable: function () {
      enabled = false;
      if (panel && panel.parentNode) panel.parentNode.removeChild(panel);
      if (toggle && toggle.parentNode) toggle.parentNode.removeChild(toggle);
      panel = toggle = null;
    },

    init: function () {
      if (LTR.DEV === true || U.query('dev') === '1') Dev.enable();
    },

    /* ------------------------------------------------------- operations -- */

    resetSave: function () {
      LTR.state.reset();
      LTR.ui.go('title');
    },

    unlockAll: function () {
      LTR.data.chapters.forEach(function (c) { LTR.state.unlockChapter(c.id); });
      LTR.ui.toast('All chapters unlocked', '🔓');
      refresh();
    },

    addPower: function (n) {
      var r = LTR.progression.addPower(n);
      if (n < 0) {
        // negative: walk the level down directly
        var pw = LTR.state.data.power;
        pw.level = Math.max(1, pw.level + n);
        pw.points = 0;
        LTR.state.save();
        LTR.emit('power-changed', { level: pw.level, progress: 0 });
      }
      LTR.ui.toast('Reading Power ' + LTR.progression.level, '⚡');
      if (r && r.newRank) LTR.ui.toast('Rank: ' + r.newRank.name, r.newRank.glyph);
      refresh();
    },

    completeChapter: function (id) {
      var ch = LTR.data.chapter(id);
      if (!ch) return;
      ch.nodes.forEach(function (n) { LTR.state.completeNode(id, n.id); });
      LTR.state.completeChapter(id);
      LTR.progression.checkUnlocks();
      if (ch.completion && ch.completion.unlocks) LTR.state.unlockChapter(ch.completion.unlocks);
      LTR.ui.toast('Chapter ' + id + ' marked complete', '✅');
      refresh();
    },

    /** Jump straight into any minigame, 5 rounds, no story around it. */
    playGame: function (id, skill) {
      LTR.ui.go('devplay', { game: id, skill: skill });
    },

    /** Simulate answers to exercise the adaptive engine. */
    simulate: function (skill, correct, times) {
      for (var i = 0; i < (times || 1); i++) {
        LTR.progression.recordAnswer({ skill: skill, correct: correct, hintLevel: 0 });
      }
      LTR.ui.toast(times + '× ' + (correct ? 'correct' : 'incorrect') + ' on ' + skill +
                   ' → level ' + LTR.progression.skillLevel(skill), '🧪');
      renderStats();
    },

    stats: function () {
      var out = {};
      LTR.state.SKILL_IDS.forEach(function (id) {
        var s = LTR.progression.skill(id);
        out[id] = {
          level: s.level, attempts: s.attempts, correct: s.correct,
          accuracy: s.attempts ? Math.round(s.correct / s.attempts * 100) + '%' : '—',
          streak: s.streak, missStreak: s.missStreak
        };
      });
      console.table(out);
      return out;
    }
  };

  function refresh() {
    if (LTR.ui.currentScreen) LTR.ui.go(LTR.ui.currentScreen, {});
  }

  /* ----------------------------------------------------------- the panel -- */

  function mountToggle() {
    if (toggle) return;
    toggle = el('button', {
      id: 'devToggle', text: '🛠', title: 'Dev tools',
      onClick: function () { open ? closePanel() : openPanel(); }
    });
    document.getElementById('overlays').appendChild(toggle);
  }

  function closePanel() {
    open = false;
    if (panel && panel.parentNode) panel.parentNode.removeChild(panel);
    panel = null;
    if (toggle) toggle.style.display = '';
  }

  function btn(label, fn) {
    return el('button', { text: label, onClick: fn });
  }

  var statsBox;

  function renderStats() {
    if (!statsBox) return;
    U.clear(statsBox);
    LTR.state.SKILL_IDS.forEach(function (id) {
      var s = LTR.progression.skill(id);
      statsBox.appendChild(el('div', {
        text: id + ': L' + s.level + '  ' + s.correct + '/' + s.attempts +
              (s.attempts ? ' (' + Math.round(s.correct / s.attempts * 100) + '%)' : '')
      }));
    });
  }

  function openPanel() {
    open = true;
    if (toggle) toggle.style.display = 'none';
    panel = el('div', { id: 'devPanel' });

    panel.appendChild(el('div.row', [
      el('h4', { text: 'Dev tools', style: { flex: '1 1 auto' } }),
      btn('✕', closePanel)
    ]));

    panel.appendChild(el('h4', { text: 'Save' }));
    panel.appendChild(el('div.row', [
      btn('Reset save', Dev.resetSave),
      btn('Unlock all', Dev.unlockAll),
      btn('Dump state', function () { console.log(JSON.parse(JSON.stringify(LTR.state.data))); })
    ]));

    panel.appendChild(el('h4', { text: 'Reading Power' }));
    panel.appendChild(el('div.row', [
      btn('+1 lvl', function () { Dev.addPower(60); }),
      btn('+10 pts', function () { Dev.addPower(10); }),
      btn('−1 lvl', function () { Dev.addPower(-1); })
    ]));

    panel.appendChild(el('h4', { text: 'Chapters' }));
    var chRow = el('div.row');
    LTR.data.chapters.forEach(function (c) {
      chRow.appendChild(btn('go ' + c.id, function () {
        LTR.state.unlockChapter(c.id);
        LTR.state.data.progress.currentChapter = c.id;
        LTR.ui.go(c.preview ? 'preview' : 'chapter', { chapter: c.id });
      }));
    });
    LTR.data.chapters.forEach(function (c) {
      if (!c.nodes.length) return;
      chRow.appendChild(btn('done ' + c.id, function () { Dev.completeChapter(c.id); }));
    });
    panel.appendChild(chRow);

    panel.appendChild(el('h4', { text: 'Jump to activity' }));
    var gRow = el('div.row');
    Object.keys(LTR.games).forEach(function (id) {
      gRow.appendChild(btn(id, function () { Dev.playGame(id); }));
    });
    panel.appendChild(gRow);

    panel.appendChild(el('h4', { text: 'Simulate answers' }));
    var sRow = el('div.row');
    var skillSel = el('select', { style: { font: 'inherit', background: '#2c2740', color: '#fff', border: '1px solid #555', borderRadius: '.4rem' } });
    LTR.state.SKILL_IDS.forEach(function (id) { skillSel.appendChild(el('option', { value: id, text: id })); });
    sRow.appendChild(skillSel);
    sRow.appendChild(btn('3× ✓', function () { Dev.simulate(skillSel.value, true, 3); }));
    sRow.appendChild(btn('2× ✗', function () { Dev.simulate(skillSel.value, false, 2); }));
    panel.appendChild(sRow);

    panel.appendChild(el('h4', { text: 'Skill stats' }));
    statsBox = el('div');
    panel.appendChild(statsBox);
    renderStats();

    panel.appendChild(el('div.row', { style: { marginTop: '.4rem' } }, [
      btn('console.table', Dev.stats),
      btn('Parent zone', function () { LTR.ui.go('parent'); }),
      btn('Turn off', function () { closePanel(); Dev.disable(); })
    ]));

    document.getElementById('overlays').appendChild(panel);
  }

  /* --------------------------------------------- standalone game screen -- */

  LTR.ui.screen('devplay', function (params) {
    var screen = el('div.screen');
    screen.appendChild(LTR.ui.env('forest'));
    screen.appendChild(LTR.ui.hud({ back: function () { LTR.ui.go('map'); } }));

    var body = el('div.screen-body', { style: { paddingTop: '.2rem' } });
    var host = el('div', { style: { display: 'flex', flexDirection: 'column', flex: '1 1 auto', width: '100%', minHeight: '0' } });
    body.appendChild(host);
    screen.appendChild(body);

    U.later(30, function () {
      LTR.activity.run({
        host: host, game: params.game, skill: params.skill,
        rounds: params.rounds || 5, config: params.config || {}
      }).then(function (t) {
        LTR.ui.modal({
          title: 'Dev run finished',
          body: t.correct + ' / ' + t.total + ' clean · ' + t.hintsUsed + ' hints · ' + t.misses + ' misses',
          actions: [
            { label: 'Again', value: 'again', style: 'btn-leaf' },
            { label: 'Map', value: 'map', style: 'btn-cream' }
          ]
        }).then(function (v) {
          if (v === 'again') LTR.ui.go('devplay', params);
          else LTR.ui.go('map');
        });
      });
    });

    return screen;
  });

})(window.LTR);
