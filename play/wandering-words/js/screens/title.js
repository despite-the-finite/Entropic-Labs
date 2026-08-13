/* =============================================================================
   screens/title.js — the front door.
   One giant button. A returning player sees her own character waving.
   ============================================================================= */
(function (LTR) {
  'use strict';

  var U = LTR.util, el = U.el;
  LTR.screens = LTR.screens || {};

  LTR.ui.screen('title', function () {
    var s = LTR.state.data;
    var returning = s.player.created;

    var screen = el('div.screen');
    screen.appendChild(LTR.ui.env('title'));

    var body = el('div.screen-body');
    var wrap = el('div.title-wrap');

    /* floating book with orbiting sparks */
    var book = el('div.title-book.float.fireworks-glow', { text: '📖' });
    wrap.appendChild(book);

    wrap.appendChild(el('h1.game-title', {
      html: 'Indra<span class="sub">and the Wandering Words</span>'
    }));

    if (returning) {
      wrap.appendChild(el('div', {
        style: { width: 'clamp(6rem,22vw,9rem)', margin: '.4rem auto 0' },
        class: 'breathe',
        html: LTR.art.avatar(s.player.avatar)
      }));
      wrap.appendChild(el('div.title-hello', {
        text: 'Welcome back, ' + s.player.name + '!  ' + LTR.progression.rank().glyph + ' ' + LTR.progression.rank().name
      }));
    }

    var actions = el('div.title-actions');
    actions.appendChild(el('button.btn.btn-huge.btn-leaf', {
      text: returning ? '▶  Keep going!' : '✨  Start the adventure',
      onClick: function () {
        LTR.audio.unlock();
        LTR.audio.sfx('unlock');
        if (returning) LTR.ui.go('map');
        else LTR.ui.go('creator');
      }
    }));

    if (returning) {
      actions.appendChild(el('button.btn.btn-cream', {
        text: '📔  My Adventure Book',
        onClick: function () { LTR.audio.sfx('tap'); LTR.ui.go('book'); }
      }));
    }
    wrap.appendChild(actions);

    body.appendChild(wrap);
    screen.appendChild(body);
    screen.appendChild(LTR.ui.parentGate());

    /* a few word-lights drifting past the title */
    U.later(200, function () {
      var fx = document.getElementById('fx');
      // Kept to the margins so they never sit on top of the button.
      var spots = [[6, 26], [12, 58], [8, 76], [90, 30], [93, 62], [86, 80]];
      ['A', 'm', 'S', 'o', 'T', 'e'].forEach(function (ch, i) {
        var p = el('div', {
          text: ch,
          style: {
            position: 'absolute', left: spots[i][0] + '%', top: spots[i][1] + '%',
            color: '#ffe9b8', fontWeight: '900', fontSize: 'clamp(1rem,3vw,1.6rem)',
            textShadow: '0 0 1rem #ffd75e', opacity: '.8',
            animation: 'floaty ' + (4 + i) + 's ease-in-out infinite'
          }
        });
        fx.appendChild(p);
      });
    });

    return screen;
  });

})(window.LTR);
