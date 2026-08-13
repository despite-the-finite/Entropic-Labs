/* =============================================================================
   Magic Spell — build a word letter by letter and it comes to life.
   Skill: phonics / blending. Tap-to-place (no dragging: small fingers).
   ============================================================================= */
(function (LTR) {
  'use strict';

  var U = LTR.util, el = U.el;

  LTR.game('magicSpell', {
    name: 'Magic Spell',
    skill: 'phonics',

    buildRound: function (ctx) {
      var word = LTR.reading.pickWord(ctx.skill, {
        types: ['cvc'],
        maxDifficulty: ctx.config.maxDifficulty || Math.min(2, ctx.difficulty),
        exclude: ctx.used,
        needEmoji: true
      });
      if (!word) return null;

      var letters = word.word.split('');
      var placed = 0;
      var slotEls = [], tileEls = [];

      /* Extra letters to choose from grow with skill: at level 1 she only sees
         the letters of the word itself, later a couple of spares join in. */
      var spares = LTR.progression.skillLevel(ctx.skill) >= 3 ? 2
                 : LTR.progression.skillLevel(ctx.skill) >= 2 ? 1 : 0;
      var extra = LTR.reading.letterDistractors(
        { char: letters[0] }, spares, { noConfusable: true }
      ).filter(function (l) { return letters.indexOf(l.char) === -1; });

      var tray = U.shuffle(letters.concat(extra.map(function (l) { return l.char; })));

      return {
        item: word,
        bucket: 'words',
        key: word.word,
        flyWord: word.word,
        solvedDelay: 1600,
        prompt: 'Build the word!',
        speak: { text: word.word, kind: 'word' },
        autoVoice: { text: 'Build the word ' + word.word, kind: 'sentence' },

        render: function (area, api) {
          /* the thing we are making */
          area.appendChild(el('div.hero-pic.enter-up.float', { text: word.emoji }));

          /* empty slots */
          var slots = el('div.spell-slots');
          letters.forEach(function (ch, i) {
            var s = el('div.spell-slot', { dataset: { i: String(i) } });
            slotEls.push(s);
            slots.appendChild(s);
          });
          area.appendChild(slots);

          /* letter tray */
          var trayRow = el('div.choices.stagger', { style: { marginTop: '.4rem' } });
          tray.forEach(function (ch) {
            var t = el('button.choice.spell-tile', {
              'aria-label': 'letter ' + ch
            }, el('div.txt', { text: ch }));

            t.addEventListener('click', function () {
              if (t.dataset.used === '1') return;
              if (ch === letters[placed]) {
                // right letter, right place
                t.dataset.used = '1';
                t.style.visibility = 'hidden';
                var slot = slotEls[placed];
                slot.textContent = ch;
                slot.style.background = 'linear-gradient(#fffdf6,#ffe9bf)';
                slot.style.border = '.22rem solid #ffd75e';
                slot.classList.add('slot-fill');
                LTR.audio.sfx('pop');
                LTR.audio.letterSound(ch);
                LTR.ui.sparkleOn(slot, 10);
                placed += 1;
                if (placed === letters.length) {
                  U.later(320, function () {
                    LTR.audio.sfx('magic');
                    slots.classList.add('fireworks-glow');
                    LTR.audio.word(word.word);
                    api.succeed(slots);
                  });
                }
              } else {
                t.classList.remove('is-wrong'); void t.offsetWidth;
                t.classList.add('is-wrong');
                api.fail(null);            // gentle nudge, tile stays available
              }
            });
            tileEls.push(t);
            trayRow.appendChild(t);
          });
          area.appendChild(trayRow);

          /* "sound it out" — the child's own tool, not an automatic reading */
          area.appendChild(el('div.tool-row', [
            el('button.btn.btn-cream.btn-sm', {
              text: '🔉 Sound it out',
              onClick: function () {
                LTR.audio.blend(word.word, word.phonemes, function (i) {
                  slotEls.forEach(function (s, idx) {
                    s.style.transform = (idx === i) ? 'translateY(-.4rem) scale(1.12)' : 'none';
                    s.style.color = (idx === i) ? 'var(--coral)' : 'var(--magic-deep)';
                  });
                });
              }
            })
          ]));
        },

        /* Hint 1: how many sounds, and what they are, in order. */
        hintClue: function (api) {
          LTR.audio.blend(word.word, word.phonemes, function (i) {
            slotEls.forEach(function (s, idx) {
              s.style.transform = (idx === i) ? 'translateY(-.4rem) scale(1.12)' : 'none';
            });
          });
        },

        /* Hint 2: glow the next letter needed. */
        hintSound: function () {
          var need = letters[placed];
          tileEls.forEach(function (t) {
            if (t.textContent === need && t.dataset.used !== '1') t.classList.add('is-hinted');
          });
          LTR.audio.letterSound(need);
        },

        /* Hint 3: show it plainly. */
        hintShow: function () {
          var need = letters[placed];
          tileEls.forEach(function (t) {
            t.classList.toggle('is-hinted', t.textContent === need && t.dataset.used !== '1');
          });
          if (slotEls[placed]) slotEls[placed].style.background = 'rgba(255,215,94,.5)';
          LTR.audio.speak('Look for ' + need, { rate: .65 });
        }
      };
    }
  });

})(window.LTR);
