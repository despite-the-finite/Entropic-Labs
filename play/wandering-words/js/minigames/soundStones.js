/* =============================================================================
   Sound River — hop across the river by choosing the picture that begins with
   the sound you can hear. Skill: letter sounds / beginning sounds.
   ============================================================================= */
(function (LTR) {
  'use strict';

  var U = LTR.util, el = U.el;

  LTR.game('soundStones', {
    name: 'Sound River',
    skill: 'letterSounds',

    buildRound: function (ctx) {
      var letter = LTR.reading.pickLetter(ctx.skill, {
        exclude: ctx.used, needPictureWord: true
      });
      if (!letter) return null;

      var right = LTR.reading.pictureFor(letter.char);
      if (!right) return null;

      var n = Math.max(2, ctx.choiceCount);
      var wrong = LTR.reading.pictureNotStartingWith(letter.char, n - 1, [right]);
      var all = U.shuffle([right].concat(wrong));

      return {
        item: letter,
        bucket: 'sounds',
        key: letter.char,
        flyWord: letter.char.toUpperCase(),
        prompt: 'Which one starts with ' + letter.char.toUpperCase() + '?',
        speak: { text: letter.char, kind: 'letterSound' },
        autoVoice: 'Which one starts with ' + letter.say + '?',

        render: function (area, api) {
          // The letter we are listening for, sitting on the bank.
          area.appendChild(el('div.enter-up', {
            style: {
              display: 'flex', alignItems: 'center', gap: '.6rem',
              background: 'rgba(255,253,246,.95)', borderRadius: '1.2rem',
              padding: '.3rem 1rem', boxShadow: 'var(--shadow-soft)'
            }
          }, [
            el('div', {
              text: letter.char.toUpperCase() + letter.char,
              style: { fontSize: 'clamp(1.8rem,7vw,3rem)', fontWeight: '900', color: 'var(--magic-deep)' }
            }),
            el('div', {
              text: 'says "' + letter.say + '"',
              style: { fontWeight: '800', color: 'var(--ink-soft)' }
            })
          ]));

          var row = el('div.choices.stagger');
          all.forEach(function (wordRec) {
            var node = el('button.choice', {
              'aria-label': wordRec.word,
              style: {
                background: 'transparent', boxShadow: 'none', padding: '0',
                width: 'clamp(4.4rem, min(22vw, 18vh), 8.5rem)', minWidth: '0', minHeight: '0'
              }
            });
            var stone = el('div', {
              style: { position: 'relative', width: '100%' },
              html: LTR.art.stone('')
            });
            stone.appendChild(el('div', {
              text: wordRec.emoji,
              style: {
                position: 'absolute', left: '50%', top: '48%', transform: 'translate(-50%,-50%)',
                fontSize: 'clamp(2rem, 9vw, 3.4rem)', pointerEvents: 'none'
              }
            }));
            node.appendChild(stone);
            node.style.filter = 'drop-shadow(0 .35rem .3rem rgba(0,0,0,.25))';
            api.register(node, wordRec.word === right.word, { word: wordRec });
            row.appendChild(node);
          });
          area.appendChild(row);

          // Poppy waits on the far bank so the goal is visible.
          area.appendChild(el('div', {
            style: { width: 'clamp(3.5rem,12vw,5.5rem)', alignSelf: 'flex-end', marginRight: '4%' },
            html: LTR.art.poppy('hop')
          }));
        },

        /* Hint 1: say each picture's name so she can hear the beginnings. */
        hintClue: function (api) {
          var chain = Promise.resolve();
          U.qsa('.choice', api.area).forEach(function (node, i) {
            var w = all[i];
            chain = chain.then(function () {
              node.classList.add('nudge');
              U.later(500, function () { node.classList.remove('nudge'); });
              return LTR.audio.word(w.word);
            }).then(function () { return U.wait(180); });
          });
        },

        hintSound: function () {
          LTR.audio.speak(letter.say + '... ' + letter.say + '... ' + right.word, { rate: .55 });
        }
      };
    }
  });

})(window.LTR);
