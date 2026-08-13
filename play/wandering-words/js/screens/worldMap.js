/* =============================================================================
   screens/worldMap.js — the kingdom, with a dotted trail joining the regions.
   Locked regions are visible but sleepy, so there is always something to
   look forward to.
   ============================================================================= */
(function (LTR) {
  'use strict';

  var U = LTR.util, el = U.el;

  LTR.ui.screen('map', function () {
    var screen = el('div.screen');
    screen.appendChild(LTR.ui.env('map'));

    screen.appendChild(LTR.ui.hud({
      back: function () { LTR.ui.go('title'); },
      book: true
    }));

    var scroll = el('div.map-scroll');
    var inner = el('div.map-inner');

    /* dotted trail between the regions */
    var chapters = LTR.data.chapters;
    var d = chapters.map(function (c, i) {
      return (i ? 'L' : 'M') + c.mapPos.x + ' ' + c.mapPos.y;
    }).join(' ');
    inner.appendChild(el('div', {
      html: '<svg class="map-path" viewBox="0 0 100 100" preserveAspectRatio="none">' +
            '<path d="' + d + '"/></svg>',
      style: { position: 'absolute', inset: '0' }
    }));

    inner.appendChild(el('div', {
      text: 'The Kingdom of Stories',
      style: {
        position: 'absolute', left: '50%', top: '3%', transform: 'translateX(-50%)',
        fontWeight: '900', fontSize: 'var(--fs-mid)', color: '#6b4a20',
        background: 'rgba(255,248,233,.85)', padding: '.2rem 1rem', borderRadius: '999px',
        whiteSpace: 'nowrap'
      }
    }));

    var currentId = LTR.state.data.progress.currentChapter;

    chapters.forEach(function (ch) {
      var unlocked = LTR.state.isChapterUnlocked(ch.id);
      var done = LTR.state.isChapterComplete(ch.id);
      var isCurrent = unlocked && !done && ch.id === currentId;

      var btn = el('button.region', {
        style: { left: ch.mapPos.x + '%', top: ch.mapPos.y + '%' },
        'aria-label': ch.name + (unlocked ? '' : ' (locked)')
      });
      if (!unlocked) btn.classList.add('locked');
      if (isCurrent) btn.classList.add('current');

      var bubble = el('div.bubble', { text: ch.emoji });
      if (!unlocked) bubble.appendChild(el('div.lock', { text: '🔒' }));
      if (done) bubble.appendChild(el('div.done-tick', { text: '✓' }));
      btn.appendChild(bubble);
      btn.appendChild(el('div.name', { text: ch.name }));

      /* the player stands on the region she is currently exploring */
      if (isCurrent) {
        btn.appendChild(el('div', {
          class: 'breathe',
          style: {
            position: 'absolute', right: '-18%', bottom: '18%',
            width: 'clamp(2.6rem,9vw,4.4rem)', pointerEvents: 'none'
          },
          html: LTR.art.avatar(LTR.state.data.player.avatar)
        }));
      }

      btn.addEventListener('click', function () {
        if (!unlocked) {
          LTR.audio.sfx('tryagain');
          var need = ch.requiredPower;
          LTR.ui.modal({
            glyph: '🔒',
            title: ch.name + ' is still asleep',
            body: 'Reading Power ' + need + ' opens this path. You are at ' +
                  LTR.progression.level + '. Keep reading — it is very close!',
            actions: [{ label: 'OK!', value: 1, style: 'btn-cream' }]
          });
          return;
        }
        LTR.audio.sfx('whoosh');
        LTR.state.data.progress.currentChapter = ch.id;
        LTR.state.save();
        if (ch.preview) LTR.ui.go('preview', { chapter: ch.id });
        else LTR.ui.go('chapter', { chapter: ch.id });
      });

      inner.appendChild(btn);
    });

    scroll.appendChild(inner);
    screen.appendChild(scroll);
    screen.appendChild(LTR.ui.parentGate());
    return screen;
  });

  /* ------------------------------------------------------------ preview --- */
  /* A postcard from a region that is unlocked but not built yet. */
  LTR.ui.screen('preview', function (params) {
    var ch = LTR.data.chapter(params.chapter);
    var screen = el('div.screen');
    screen.appendChild(LTR.ui.env(ch.env || 'valley'));
    screen.appendChild(LTR.ui.hud({ back: function () { LTR.ui.go('map'); } }));

    var body = el('div.screen-body');
    var who = ch.preview && ch.preview.who;

    var stack = el('div.stack', { style: { zIndex: '10' } });
    stack.appendChild(el('div', {
      text: ch.emoji, class: 'float',
      style: { fontSize: 'clamp(3.5rem,16vw,7rem)', filter: 'drop-shadow(0 .6rem 1rem rgba(0,0,0,.3))' }
    }));

    var panel = el('div.panel.enter-up', { style: { maxWidth: 'min(36rem,94vw)', textAlign: 'center' } });
    panel.appendChild(el('h2', { text: ch.name }));
    (ch.preview ? ch.preview.lines : ['Coming soon!']).forEach(function (line, i) {
      panel.appendChild(el('p', {
        text: line,
        style: { fontSize: i === 0 ? 'var(--fs-big)' : 'var(--fs-mid)', margin: '.3rem 0' }
      }));
    });
    panel.appendChild(el('div', {
      text: 'Skills here: ' + (ch.skills || []).map(function (s) {
        return LTR.state.SKILL_LABELS[s];
      }).join(' · '),
      style: { fontSize: 'var(--fs-small)', color: 'var(--ink-soft)', fontWeight: '700', marginTop: '.4rem' }
    }));

    var cast = el('div.cast');
    if (who) cast.appendChild(LTR.ui.actor(who, { enter: 'enter-left' }));
    stack.appendChild(cast);
    stack.appendChild(panel);
    stack.appendChild(el('button.btn.btn-huge.btn-cream', {
      text: '⬅  Back to the map',
      onClick: function () { LTR.audio.sfx('tap'); LTR.ui.go('map'); }
    }));

    body.appendChild(stack);
    screen.appendChild(body);
    return screen;
  });

})(window.LTR);
