/* =============================================================================
   Treasure Cave — read the word on the scroll, then open the chest holding
   that thing. (The reverse of Word Bridge: word → picture.)
   Skill: word reading; runs on letterSounds early on, with 3-letter words.
   ============================================================================= */
(function (LTR) {
  'use strict';

  var U = LTR.util, el = U.el;

  LTR.game('treasureCave', {
    name: 'Treasure Cave',
    skill: 'wordReading',

    buildRound: function (ctx) {
      var word = LTR.reading.pickWord(ctx.skill, {
        types: ctx.config.types || ['cvc'],
        maxDifficulty: ctx.config.maxDifficulty || Math.min(2, ctx.difficulty),
        exclude: ctx.used, needEmoji: true
      });
      if (!word) return null;

      var n = Math.max(2, Math.min(3, ctx.choiceCount));
      var others = LTR.reading.wordDistractors(word, n - 1, { maxDifficulty: 3 });
      var all = U.shuffle([word].concat(others));

      return {
        item: word,
        bucket: 'words',
        key: word.word,
        flyWord: word.word,
        solvedDelay: 1500,
        prompt: 'Read the clue. Which chest?',
        speak: { text: 'Read the clue, then choose the chest.', kind: 'sentence' },
        autoVoice: 'Read the word. Which chest is it in?',

        render: function (area, api) {
          /* the clue scroll — the word itself, big */
          var lit = el('div.big-word');
          word.word.toUpperCase().split('').forEach(function (ch) {
            lit.appendChild(el('span.ph', { text: ch }));
          });
          area.appendChild(el('div.enter-up', {
            style: {
              background: 'linear-gradient(#fff8e9,#ffedc9)', borderRadius: '1.2rem',
              padding: '.5rem 1.4rem', boxShadow: 'var(--shadow-pop)',
              border: '.2rem solid #e0c489'
            }
          }, lit));

          /* chests */
          var row = el('div.choices.stagger');
          all.forEach(function (w) {
            var node = el('button.choice', {
              'aria-label': 'chest',
              style: {
                background: 'transparent', boxShadow: 'none', padding: '0',
                width: 'clamp(4.6rem, min(23vw, 20vh), 9rem)', minWidth: '0', minHeight: '0'
              }
            });
            var box = el('div', { style: { position: 'relative', width: '100%' }, html: LTR.art.chest(false) });
            var peek = el('div', {
              text: w.emoji,
              style: {
                position: 'absolute', left: '50%', top: '18%', transform: 'translate(-50%,-50%) scale(0)',
                fontSize: 'clamp(1.8rem,8vw,3rem)', transition: 'transform .4s cubic-bezier(.2,1.6,.4,1)',
                pointerEvents: 'none'
              }
            });
            box.appendChild(peek);
            node.appendChild(box);

            node.addEventListener('click', function () {
              // Every chest opens — one has the treasure, the others a friendly
              // surprise. Nothing ever feels like a punishment.
              box.firstChild.outerHTML = LTR.art.chest(true);
              peek.style.transform = 'translate(-50%,-50%) scale(1)';
              LTR.audio.sfx(w.word === word.word ? 'gem' : 'pop');
            });

            api.register(node, w.word === word.word, { word: w });
            row.appendChild(node);
          });
          area.appendChild(row);
        },

        /* Hint 1: light up the first sound of the clue. */
        hintClue: function (api) {
          var spans = U.qsa('.big-word .ph', api.area);
          if (spans[0]) spans[0].classList.add('lit');
          LTR.audio.letterSound(word.word.charAt(0));
        },

        /* Hint 2: sound the whole word out, lighting each letter in turn. */
        hintSound: function (api) {
          var spans = U.qsa('.big-word .ph', api.area);
          LTR.audio.blend(word.word, word.word.split(''), function (i) {
            spans.forEach(function (s, idx) { s.classList.toggle('lit', idx === i); });
          });
        },

        hintShow: function () { LTR.audio.word(word.word); }
      };
    }
  });

})(window.LTR);
