/* =============================================================================
   Mushroom Match — every big mushroom (uppercase) has a baby (lowercase).
   Skill: letter recognition, uppercase ↔ lowercase pairing.
   ============================================================================= */
(function (LTR) {
  'use strict';

  var U = LTR.util, el = U.el;

  var CAPS = ['#ff7a7a', '#ffb14e', '#7fd694', '#6bb6f0', '#c58cff'];

  LTR.game('mushroomMatch', {
    name: 'Mushroom Match',
    skill: 'letterRecognition',

    buildRound: function (ctx) {
      var target = LTR.reading.pickLetter(ctx.skill, { exclude: ctx.used });
      if (!target) return null;

      var n = Math.max(2, ctx.choiceCount);
      var others = LTR.reading.letterDistractors(target, n - 1, { tier: 3 });
      var all = U.shuffle([target].concat(others));

      return {
        item: target,
        bucket: 'letters',
        key: target.char,
        prompt: 'Find the baby mushroom for ' + target.char.toUpperCase(),
        speak: { text: target.char, kind: 'letterName' },
        autoVoice: 'Find the little ' + target.char.toUpperCase(),

        render: function (area, api) {
          /* the parent mushroom */
          var big = el('div.enter-up', {
            style: { width: 'clamp(5rem, min(24vw, 21vh), 10rem)', filter: 'drop-shadow(0 .6rem .6rem rgba(0,0,0,.2))' },
            html: LTR.art.mushroom(target.char.toUpperCase(), '#ff7a7a', 'sway')
          });
          area.appendChild(big);

          area.appendChild(el('div', {
            text: 'Which little one is mine?',
            style: {
              fontWeight: '800', color: 'var(--ink)', background: 'rgba(255,253,246,.9)',
              padding: '.25rem .9rem', borderRadius: '999px', fontSize: 'var(--fs-small)'
            }
          }));

          /* the babies */
          var row = el('div.choices.stagger');
          all.forEach(function (letter, i) {
            var node = el('button.choice', {
              'aria-label': 'mushroom ' + letter.char,
              style: {
                background: 'transparent', boxShadow: 'none',
                width: 'clamp(4rem, min(18vw, 15vh), 6.5rem)', minWidth: '0', minHeight: '0', padding: '0'
              }
            }, el('div', {
              html: LTR.art.mushroom(letter.char, CAPS[i % CAPS.length]),
              style: { width: '100%', filter: 'drop-shadow(0 .35rem .35rem rgba(0,0,0,.2))' }
            }));
            api.register(node, letter.char === target.char, { letter: letter });
            row.appendChild(node);
          });
          area.appendChild(row);
        },

        hintClue: function (api) {
          // Visual clue: name the family out loud and show the pair together.
          LTR.ui.cheer(target.char.toUpperCase() + ' and ' + target.char + ' are a family', 'soft', api.area);
          api.area.appendChild(el('div.enter-up', {
            style: {
              fontSize: 'var(--fs-big)', fontWeight: '900', color: 'var(--magic-deep)',
              background: 'rgba(255,253,246,.95)', borderRadius: '1rem', padding: '.2rem 1rem'
            },
            text: target.char.toUpperCase() + '  →  ' + target.char
          }));
        },

        hintSound: function () { LTR.audio.speak('Big ' + target.char.toUpperCase() + '. Little ' + target.char + '.', { rate: .65 }); }
      };
    }
  });

})(window.LTR);
