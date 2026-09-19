/* =============================================================================
   Sight Signs — the signposts in Word Village lost their words. You hear a
   word and tap the signpost that says it.

   Skill: sight words — the small, wildly common words English refuses to spell
   sensibly ("the", "you", "come"). These are learned by SHAPE, not by sounding
   out, so this game always says the word first and asks her to recognise it.
   That also makes it the one game where speaking the answer aloud is correct
   rather than cheating.
   ============================================================================= */
(function (LTR) {
  'use strict';

  var U = LTR.util, el = U.el;

  var POST_COLORS = ['#7fd694', '#ffcf5c', '#a58cff', '#6bb6f0', '#ff9db8'];

  LTR.game('sightSigns', {
    name: 'Sight Signs',
    skill: 'sightWords',

    buildRound: function (ctx) {
      var word = LTR.reading.pickSight({
        maxDifficulty: ctx.config.maxDifficulty || ctx.difficulty,
        exclude: ctx.used
      });
      if (!word) return null;

      var n = Math.max(2, ctx.choiceCount);
      var others = LTR.reading.sightDistractors(word, n - 1, { exclude: ctx.used });
      if (!others.length) return null;
      var all = U.shuffle([word].concat(others));

      return {
        item: word,
        bucket: 'sight',
        key: word.word,
        flyWord: word.word,
        prompt: 'Which sign says "' + word.word + '"?',
        speak: { text: word.word, kind: 'word' },
        autoVoice: [
          { text: 'Find the sign that says', rate: .82 },
          { word: word.word },
          { pause: 200 },
          { word: word.word }
        ],

        render: function (area, api) {
          area.appendChild(el('div.enter-up', {
            style: {
              display: 'flex', alignItems: 'center', gap: '.6rem',
              background: 'rgba(255,253,246,.95)', borderRadius: '1.2rem',
              padding: '.35rem 1rem', boxShadow: 'var(--shadow-soft)'
            }
          }, [
            el('div', { text: '🏘️', style: { fontSize: 'clamp(1.6rem,6vw,2.4rem)' } }),
            el('div', {
              text: 'Which one says it?',
              style: { fontWeight: '800', color: 'var(--ink-soft)' }
            })
          ]));

          var row = el('div.choices.stagger');
          all.forEach(function (w, i) {
            var node = el('button.choice.word-card', {
              'aria-label': w.word,
              style: {
                background: 'linear-gradient(#fffdf6, #ffeecd)',
                boxShadow: '0 .4rem 0 #d9b97e, var(--shadow-soft)'
              }
            }, [
              el('div.txt', { text: w.word }),
              el('div', {
                class: 'post',
                style: {
                  height: 'clamp(.7rem,2.5vw,1.2rem)', width: '.7rem',
                  background: POST_COLORS[i % POST_COLORS.length],
                  borderRadius: '.2rem', marginTop: '.2rem'
                }
              })
            ]);
            api.register(node, w.word === word.word, { word: w });
            row.appendChild(node);
          });
          area.appendChild(row);

          // Grumblewink carries the signs around, because of course he does.
          area.appendChild(el('div.companion.breathe', {
            style: { width: 'clamp(3.4rem,12vw,5.5rem)', alignSelf: 'flex-end', marginRight: '5%' },
            html: LTR.art.grumblewink('', 'happy')
          }));
        },

        /* Hint 1: say it again, slowly, and thin the field. */
        hintClue: function (api) {
          LTR.audio.speak('Listen again.', { rate: .85 });
          LTR.audio.word(word.word);
          var wrongs = U.qsa('.choice', api.area).filter(function (nd) {
            return nd.querySelector('.txt') &&
                   nd.querySelector('.txt').textContent !== word.word &&
                   !nd.classList.contains('is-gone');
          });
          if (wrongs.length > 1) {
            var v = U.pick(wrongs);
            v.classList.add('is-gone');
            v.disabled = true;
          }
        },

        /* Hint 2: the first letter, which is usually enough to tell them apart. */
        hintSound: function () {
          var first = word.word.charAt(0);
          LTR.audio.speak(word.word + ' starts with', { rate: .8 });
          LTR.audio.letterName(first);
        },

        hintShow: function () { LTR.audio.word(word.word); }
      };
    }
  });

})(window.LTR);
