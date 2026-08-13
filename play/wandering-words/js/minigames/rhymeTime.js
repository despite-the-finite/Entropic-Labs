/* =============================================================================
   Rhyme Time — two words that end the same way make a rhyme, and rhymes make
   the flowers bloom. Skill: phonics (word families).
   Available to any chapter; introduced properly in Sound Valley.
   ============================================================================= */
(function (LTR) {
  'use strict';

  var U = LTR.util, el = U.el;

  LTR.game('rhymeTime', {
    name: 'Rhyme Time',
    skill: 'phonics',

    buildRound: function (ctx) {
      // Only words that actually have a partner in the corpus can be targets.
      var candidates = LTR.data.query({
        types: ['cvc'], needEmoji: true,
        maxDifficulty: ctx.config.maxDifficulty || ctx.difficulty,
        exclude: ctx.used
      }).filter(function (w) { return LTR.data.rhymesWith(w.word).length > 0; });

      if (!candidates.length) return null;
      var target = U.pick(candidates);
      var partner = U.pick(LTR.data.rhymesWith(target.word));
      var n = Math.max(2, ctx.choiceCount);
      var wrong = U.sample(LTR.data.notRhymesWith(target.word, {
        maxDifficulty: (ctx.config.maxDifficulty || ctx.difficulty) + 1
      }).filter(function (w) { return w.word !== target.word; }), n - 1);

      var all = U.shuffle([partner].concat(wrong));

      return {
        item: target,
        bucket: 'words',
        key: target.word,
        prompt: 'Which one rhymes with ' + target.word.toUpperCase() + '?',
        speak: { text: target.word, kind: 'word' },
        autoVoice: { text: 'Which one rhymes with ' + target.word + '?', kind: 'sentence' },

        render: function (area, api) {
          area.appendChild(el('div.enter-up', {
            style: {
              display: 'flex', alignItems: 'center', gap: '.7rem',
              background: 'rgba(255,253,246,.95)', borderRadius: '1.4rem',
              padding: '.4rem 1.2rem', boxShadow: 'var(--shadow-pop)'
            }
          }, [
            el('div', { text: target.emoji, style: { fontSize: 'clamp(2.2rem,10vw,3.6rem)' } }),
            el('div.big-word', { text: target.word.toUpperCase(),
                                 style: { fontSize: 'clamp(1.8rem,7vw,3rem)' } })
          ]));

          var row = el('div.choices.stagger');
          all.forEach(function (w) {
            row.appendChild(api.choice({
              pic: w.emoji, txt: w.word.toUpperCase(),
              correct: w.word === partner.word, label: w.word
            }));
          });
          area.appendChild(row);
        },

        hintClue: function (api) {
          LTR.ui.cheer('Listen to the END of the word', 'soft', api.area);
          LTR.audio.speak(target.word + '... ' + target.family, { rate: .55 });
        },
        hintSound: function () {
          LTR.audio.speak(target.word + ' ... ' + partner.word + '. They rhyme!', { rate: .62 });
        }
      };
    }
  });

})(window.LTR);
