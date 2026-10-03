/* =============================================================================
   screens/title.js — the front door.

   One giant green button with a picture on it. The screen introduces itself
   out loud and then points at the button, because the child arriving here
   cannot read "Start the adventure" — and should not have to.
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

    var playBtn = LTR.ui.bigButton({
      glyph: returning ? '▶️' : '✨',
      label: returning ? 'Keep going!' : 'Start!',
      voice: returning ? 'Keep going' : 'Start the adventure',
      style: 'btn-leaf',
      className: 'tap-me',
      sfx: 'unlock',
      onTap: function () {
        LTR.audio.unlock();
        if (returning) LTR.ui.go('map');
        else LTR.ui.go('creator');
      }
    });
    actions.appendChild(playBtn);

    if (returning) {
      actions.appendChild(LTR.ui.bigButton({
        glyph: '📔',
        label: 'My book',
        voice: 'My adventure book',
        style: 'btn-cream',
        big: false,
        onTap: function () { LTR.ui.go('book'); }
      }));
    }
    wrap.appendChild(actions);

    body.appendChild(wrap);
    screen.appendChild(body);

    screen.appendChild(LTR.ui.parentGate());

    /* a few word-lights drifting past the title */
    U.later(200, function () {
      var fx = document.getElementById('fx');
      if (!fx) return;
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

    /* ------------------------------------------------------- first tap --- */
    /* A browser will not let a page make a sound until someone has touched it.
       Since every instruction in this game is spoken, the very first screen
       would otherwise be silent for a child who cannot read it. So the book
       asks to be woken: one tap anywhere, and the game starts talking. */
    if (!LTR.audio.ready && LTR.audio.available) {
      var waker = el('div.waker', [
        el('div.waker-glyph', { text: '👆' }),
        el('div.waker-text', { text: 'Tap anywhere to wake the book' })
      ]);
      waker.addEventListener('pointerdown', function () {
        LTR.audio.unlock();
        LTR.audio.sfx('sparkle');
        waker.classList.add('gone');
        U.later(400, function () { if (waker.parentNode) waker.parentNode.removeChild(waker); });
      });
      screen.appendChild(waker);
    }

    LTR.guide.narrate(
      returning
        ? ['Welcome back, ' + s.player.name + '!', { pause: 250 },
           'Tap the big green arrow to keep going.']
        : ['Hello!', { pause: 200 },
           'This is Indra and the Wandering Words.', { pause: 300 },
           'Tap the big green button to start.'],
      { target: playBtn, idleAfter: 10000 }
    );

    return screen;
  });

})(window.LTR);
