/* =============================================================================
   screens/parentMode.js — the grown-up door.

   Reached by holding the ⚙ button for 2.5s and answering an arithmetic
   question. Everything measurable lives here and nowhere else: the child's
   side of the game never shows a score, a percentage or a level of "ability".
   ============================================================================= */
(function (LTR) {
  'use strict';

  var U = LTR.util, el = U.el;
  LTR.screens = LTR.screens || {};

  /* ------------------------------------------------------------- gate ----- */

  LTR.screens.parentChallenge = function () {
    var a = 3 + U.rand(7), b = 4 + U.rand(8);
    var answer = a * b;
    var options = U.shuffle([answer, answer + 3 + U.rand(5), Math.max(2, answer - (3 + U.rand(5))), answer + 10]);

    var row = el('div.row');
    var body = el('div.stack', [
      el('div', { text: 'For grown-ups', style: { fontWeight: '900', color: 'var(--ink-soft)' } }),
      el('div', {
        text: 'What is ' + a + ' × ' + b + '?',
        style: { fontSize: 'var(--fs-big)', fontWeight: '900' }
      }),
      row
    ]);

    LTR.ui.modal({
      title: 'Parent Zone',
      extra: body,
      actions: [{ label: 'Cancel', value: 'cancel', style: 'btn-cream' }]
    }).then(function (v) { /* cancelled — nothing to do */ });

    // Wire the answer buttons into the modal that was just created.
    options.forEach(function (opt) {
      row.appendChild(el('button.btn.btn-magic', {
        text: String(opt),
        onClick: function (e) {
          if (opt === answer) {
            var veil = e.target.closest('.veil');
            if (veil && veil.parentNode) veil.parentNode.removeChild(veil);
            LTR.audio.sfx('unlock');
            LTR.ui.go('parent');
          } else {
            e.target.classList.add('nudge');
            setTimeout(function () { e.target.classList.remove('nudge'); }, 500);
          }
        }
      }));
    });
  };

  /* -------------------------------------------------------- dashboard ---- */

  function pct(x) { return Math.round(x * 100) + '%'; }

  function fmtTime(ms) {
    var m = Math.round(ms / 60000);
    if (m < 60) return m + ' min';
    return Math.floor(m / 60) + ' h ' + (m % 60) + ' min';
  }

  function fmtDate(t) {
    var d = new Date(t);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' ' +
           d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  }

  function chips(list, cls) {
    var box = el('div.chiplist');
    if (!list.length) {
      box.appendChild(el('div.muted', { text: '—' }));
      return box;
    }
    list.forEach(function (x) { box.appendChild(el('div', { class: 'c ' + (cls || ''), text: x })); });
    return box;
  }

  LTR.ui.screen('parent', function () {
    var S = LTR.state.data, P = LTR.progression;
    var screen = el('div.screen');
    screen.appendChild(LTR.ui.env('map'));

    var body = el('div.screen-body', { style: { justifyContent: 'flex-start' } });
    var scroll = el('div.book-scroll', { style: { zIndex: '10', width: 'min(48rem, 96vw)' } });
    var panel = el('div.panel.parent');

    /* header */
    panel.appendChild(el('div.row', { style: { justifyContent: 'space-between' } }, [
      el('h2', { text: '👪  Parent Zone', style: { margin: '0' } }),
      el('button.btn.btn-cream', {
        text: 'Back to the game',
        onClick: function () { LTR.ui.go(S.player.created ? 'map' : 'title'); }
      })
    ]));

    panel.appendChild(el('p', {
      style: { fontSize: '.95rem', color: 'var(--ink-soft)', fontWeight: '600' },
      text: S.player.name + ' has played ' + S.stats.sessions + ' session' +
            (S.stats.sessions === 1 ? '' : 's') + ' (' + fmtTime(S.stats.playMs) + ' total). ' +
            'Difficulty adapts automatically — no settings needed.'
    }));

    /* headline numbers */
    panel.appendChild(el('h3', { text: 'Where she is' }));
    var stats = el('div.stat-row');
    [
      ['Reading Power', P.level + ' — ' + P.rank().name],
      ['Overall accuracy', S.stats.totalAttempts ? pct(P.overallAccuracy()) : '—'],
      ['Answers given', String(S.stats.totalAttempts)],
      ['Hints used', String(S.stats.hintsUsed)],
      ['Letters mastered', String(LTR.state.masteredList('letters').length) + ' / 26'],
      ['Words mastered', String(LTR.state.masteredList('words').length)]
    ].forEach(function (p) {
      stats.appendChild(el('div.stat-card', [
        el('div.k', { text: p[0] }), el('div.v', { text: p[1] })
      ]));
    });
    panel.appendChild(stats);

    /* skills */
    panel.appendChild(el('h3', { text: 'Reading skills' }));
    LTR.state.SKILL_IDS.forEach(function (id) {
      var s = P.skill(id);
      var acc = s.attempts ? s.correct / s.attempts : 0;
      panel.appendChild(el('div.skill-bar', [
        el('div.top', [
          el('span', { text: LTR.state.SKILL_LABELS[id] }),
          el('span', {
            text: s.attempts ? (pct(acc) + ' · level ' + s.level + ' · ' + s.attempts + ' tries') : 'not started'
          })
        ]),
        el('div.track', el('span', { style: { width: (s.attempts ? Math.max(4, acc * 100) : 0) + '%' } }))
      ]));
    });

    /* letters + sounds detail */
    panel.appendChild(el('h3', { text: 'Letters mastered' }));
    panel.appendChild(chips(LTR.state.masteredList('letters').map(function (c) { return c.toUpperCase(); })));

    panel.appendChild(el('h3', { text: 'Letter sounds mastered' }));
    panel.appendChild(chips(LTR.state.masteredList('sounds').map(function (c) { return c.toUpperCase(); })));

    panel.appendChild(el('h3', { text: 'Letters still settling in' }));
    panel.appendChild(chips(LTR.state.learningList('letters').map(function (c) { return c.toUpperCase(); }), 'warm'));

    panel.appendChild(el('h3', { text: 'Words mastered' }));
    panel.appendChild(chips(LTR.state.masteredList('words')));

    panel.appendChild(el('h3', { text: 'Words she is working on' }));
    panel.appendChild(chips(LTR.state.learningList('words'), 'warm'));

    panel.appendChild(el('h3', { text: 'Sight words mastered' }));
    panel.appendChild(chips(LTR.state.masteredList('sight')));

    /* suggestions */
    panel.appendChild(el('h3', { text: 'Where a little extra practice may help' }));
    var sug = P.suggestions();
    if (!sug.length) {
      panel.appendChild(el('div.muted', {
        text: 'Nothing standing out. Everything she has met is tracking well.'
      }));
    } else {
      sug.forEach(function (s) {
        panel.appendChild(el('div.muted', {
          text: '• ' + s.label + ' (' + pct(s.accuracy) + ') — ' + s.note
        }));
      });
    }
    panel.appendChild(el('div.muted', {
      style: { marginTop: '.4rem' },
      text: 'Reading together for ten minutes a day beats any app, including this one. ' +
            'Use the 🔊 buttons with her — hearing a word after trying it is how it sticks.'
    }));

    /* recent activity */
    panel.appendChild(el('h3', { text: 'Recent activities' }));
    if (!S.activityLog.length) {
      panel.appendChild(el('div.muted', { text: 'Nothing yet.' }));
    } else {
      var table = el('table');
      S.activityLog.slice(0, 12).forEach(function (a) {
        table.appendChild(el('tr', [
          el('td', { text: fmtDate(a.t) }),
          el('td', { text: a.name || a.game }),
          el('td', { text: LTR.state.SKILL_LABELS[a.skill] || a.skill }),
          el('td', { text: a.correct + '/' + a.total + (a.hints ? ' · ' + a.hints + ' hints' : '') })
        ]));
      });
      panel.appendChild(table);
    }

    /* settings + data */
    panel.appendChild(el('h3', { text: 'Settings' }));
    var settingsRow = el('div.row', { style: { justifyContent: 'flex-start' } });
    [['speech', 'Voice help'], ['autoVoice', 'Spoken instructions'], ['sfx', 'Sound effects']].forEach(function (p) {
      var on = S.settings[p[0]] !== false;
      var b = el('button.btn', {
        class: 'btn ' + (on ? 'btn-leaf' : 'btn-cream'),
        text: p[1] + ': ' + (on ? 'on' : 'off')
      });
      b.addEventListener('click', function () {
        var now = !(LTR.state.data.settings[p[0]] !== false);
        LTR.state.setSetting(p[0], now);
        b.textContent = p[1] + ': ' + (now ? 'on' : 'off');
        b.className = 'btn ' + (now ? 'btn-leaf' : 'btn-cream');
      });
      settingsRow.appendChild(b);
    });
    panel.appendChild(settingsRow);

    panel.appendChild(el('h3', { text: 'Progress data' }));
    panel.appendChild(el('div.muted', {
      text: 'Saved in this browser only (' + LTR.storage.adapterName + '). Nothing leaves this device — ' +
            'no accounts, no adverts, no tracking.'
    }));
    var dataRow = el('div.row', { style: { justifyContent: 'flex-start', marginTop: '.4rem' } });
    dataRow.appendChild(el('button.btn.btn-cream', {
      text: 'Show save data',
      onClick: function () {
        LTR.ui.modal({
          title: 'Save data',
          extra: el('textarea', {
            readonly: true,
            style: { width: '100%', height: '40vh', font: '11px ui-monospace, monospace' },
            text: LTR.storage.exportJSON(LTR.state.data)
          }),
          actions: [{ label: 'Close', value: 1, style: 'btn-cream' }]
        });
      }
    }));
    dataRow.appendChild(el('button.btn.btn-berry', {
      text: 'Start over',
      onClick: function () {
        LTR.ui.modal({
          glyph: '⚠️',
          title: 'Erase all progress?',
          body: 'Every star, friend and word will be forgotten. This cannot be undone.',
          actions: [
            { label: 'Keep it', value: 'no', style: 'btn-leaf' },
            { label: 'Erase everything', value: 'yes', style: 'btn-berry' }
          ]
        }).then(function (v) {
          if (v !== 'yes') return;
          LTR.state.reset();
          LTR.ui.go('title');
        });
      }
    }));
    panel.appendChild(dataRow);

    scroll.appendChild(panel);
    body.appendChild(scroll);
    screen.appendChild(body);
    return screen;
  });

})(window.LTR);
