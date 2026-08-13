/* =============================================================================
   Word Bridge — a plank is missing from the bridge. Choose the word that names
   the picture and the bridge repairs itself.
   Skill: whole-word reading.
   ============================================================================= */
(function (LTR) {
  'use strict';

  var U = LTR.util, el = U.el;

  LTR.game('wordBridge', {
    name: 'Word Bridge',
    skill: 'wordReading',

    buildRound: function (ctx) {
      var word = LTR.reading.pickWord(ctx.skill, {
        types: ctx.config.types || ['cvc'],
        maxDifficulty: ctx.config.maxDifficulty || ctx.difficulty,
        exclude: ctx.used, needEmoji: true
      });
      if (!word) return null;

      var n = Math.max(2, ctx.choiceCount);
      var others = LTR.reading.wordDistractors(word, n - 1, {
        maxDifficulty: ctx.config.maxDifficulty || ctx.difficulty
      });
      var all = U.shuffle([word].concat(others));
      var gapSlot = null;   // the missing plank, filled in on success

      return {
        item: word,
        bucket: 'words',
        key: word.word,
        flyWord: word.word,
        prompt: 'Which word says this?',
        speak: { text: 'Which word says this? Look at the picture.', kind: 'sentence' },
        autoVoice: 'Which word says this?',

        render: function (area, api) {
          /* what needs to cross */
          area.appendChild(el('div.hero-pic.enter-up.float', { text: word.emoji }));

          /* the broken bridge */
          var bridge = el('div', {
            style: { display: 'flex', alignItems: 'center', gap: '.2rem', width: 'min(30rem, 92vw)' }
          });
          [1, 1, 0, 1].forEach(function (solid) {
            var slot = el('div', {
              style: { flex: '1 1 0', opacity: solid ? 1 : .8 },
              html: solid ? LTR.art.plank('') : LTR.art.plank(null)
            });
            if (!solid) gapSlot = slot;
            bridge.appendChild(slot);
          });
          area.appendChild(bridge);

          /* word planks to choose from */
          var row = el('div.choices.stagger');
          all.forEach(function (w) {
            var node = el('button.choice', {
              'aria-label': w.word,
              style: {
                minWidth: 'clamp(5.5rem, min(26vw, 22vh), 10rem)', minHeight: 'clamp(3.2rem, min(14vw, 11vh), 5rem)',
                background: 'linear-gradient(#c98f5c, #a8703f)', boxShadow: '0 .4rem 0 #7d5030, var(--shadow-soft)'
              }
            }, el('div.txt', {
              text: w.word.toUpperCase(),
              style: { color: '#fff8e9', textShadow: '0 .1rem 0 rgba(0,0,0,.3)' }
            }));
            api.register(node, w.word === word.word, { word: w });
            row.appendChild(node);
          });
          area.appendChild(row);
        },

        onSolved: function () {
          // The missing plank snaps into place — the bridge is whole again.
          if (!gapSlot) return;
          gapSlot.innerHTML = LTR.art.plank(word.word);
          gapSlot.style.opacity = '1';
          gapSlot.classList.add('slot-fill');
          LTR.ui.sparkleOn(gapSlot, 18);
        },

        /* Hint 1: sound out the first letter of the right word with a picture. */
        hintClue: function (api) {
          var first = word.word.charAt(0);
          LTR.ui.cheer('It starts with ' + first.toUpperCase(), 'soft', api.area);
          LTR.audio.letterSound(first);
        },

        /* Hint 2: blend the whole word slowly. */
        hintSound: function () {
          LTR.audio.blend(word.word, word.phonemes);
        }
      };
    }
  });

})(window.LTR);
