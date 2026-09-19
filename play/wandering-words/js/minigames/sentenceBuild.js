/* =============================================================================
   Sentence Sea — two games about whole sentences, the skill the game used to
   have a name for and no way to practise.

   sentenceBuild  the words of a sentence are scattered on the waves; tap them
                  in order and the boat sails. Tap-to-place, never dragging.
   sentenceMatch  read a sentence, then choose the picture it describes.

   Both are deliberately forgiving: a wrong word simply wobbles and stays put,
   so a child can never wedge herself into a half-built sentence she cannot fix.
   ============================================================================= */
(function (LTR) {
  'use strict';

  var U = LTR.util, el = U.el;

  /* ===================================================== sentence build === */

  LTR.game('sentenceBuild', {
    name: 'Sentence Boat',
    skill: 'sentenceReading',

    buildRound: function (ctx) {
      var sentence = LTR.reading.pickSentence({
        maxDifficulty: ctx.config.maxDifficulty || ctx.difficulty,
        maxWords: ctx.config.maxWords || (LTR.progression.skillLevel(ctx.skill) >= 3 ? 7 : 5),
        exclude: ctx.used
      });
      if (!sentence) return null;

      var words = sentence.words.slice();
      var placed = 0;
      var slotEls = [], tileEls = [];
      var tray = U.shuffle(words.map(function (w, i) { return { w: w, i: i }; }));

      return {
        item: sentence,
        bucket: 'words',
        key: sentence.text,
        sayOnSolve: false,          // the whole sentence is read on success
        solvedDelay: 1900,
        prompt: 'Put the words in order!',
        speak: { text: sentence.text, kind: 'sentence' },
        autoVoice: [
          { text: 'Build this sentence.', rate: .82 },
          { pause: 200 },
          { text: sentence.text, rate: .72 }
        ],

        render: function (area, api) {
          /* what the sentence is about */
          area.appendChild(el('div.hero-pic.enter-up.float', { text: sentence.emoji }));

          /* the empty line the sentence will sit on */
          var slots = el('div.sent-slots');
          words.forEach(function (w, i) {
            var s = el('div.sent-slot', { dataset: { i: String(i) } });
            slotEls.push(s);
            slots.appendChild(s);
          });
          area.appendChild(slots);

          /* the word cards, bobbing on the water */
          var trayRow = el('div.sent-tray.stagger', { style: { marginTop: '.4rem' } });
          tray.forEach(function (rec, n) {
            var t = el('button.choice.word-card', {
              'aria-label': rec.w,
              style: { animation: 'bob ' + (2.2 + n * .25) + 's ease-in-out infinite' }
            }, el('div.txt', { text: rec.w }));

            t.addEventListener('click', function () {
              if (t.dataset.used === '1') return;
              LTR.audio.stop();
              if (rec.w === words[placed]) {
                t.dataset.used = '1';
                t.style.visibility = 'hidden';
                var slot = slotEls[placed];
                slot.textContent = rec.w;
                slot.classList.add('filled', 'slot-fill');
                LTR.audio.sfx('pop');
                LTR.audio.word(rec.w);
                LTR.ui.sparkleOn(slot, 10);
                placed += 1;
                if (placed === words.length) {
                  U.later(420, function () {
                    LTR.audio.sfx('magic');
                    slots.classList.add('fireworks-glow');
                    LTR.audio.sentence(sentence.text);
                    api.succeed(slots);
                  });
                }
              } else {
                t.classList.remove('is-wrong'); void t.offsetWidth;
                t.classList.add('is-wrong');
                api.fail(null);          // gentle nudge; the card stays available
              }
            });
            tileEls.push(t);
            trayRow.appendChild(t);
          });
          area.appendChild(trayRow);

          /* Tock ferries the finished sentence across. Decorative only, so a
             landscape phone drops him rather than pushing the puzzle off the
             bottom of the screen. The prompt bar's 🔊 already re-reads the
             sentence, so there is no second button competing for the space. */
          area.appendChild(el('div.companion.breathe', {
            style: { width: 'clamp(3.6rem,13vw,6rem)', alignSelf: 'flex-end', marginRight: '4%' },
            html: LTR.art.tock('')
          }));
        },

        /* Hint 1: say the sentence again, one word at a time. */
        hintClue: function () {
          LTR.audio.stop();
          words.forEach(function (w) { LTR.audio.word(w); });
        },

        /* Hint 2: name the word that comes next. */
        hintSound: function () {
          var need = words[placed];
          if (!need) return;
          LTR.audio.stop();
          LTR.audio.speak('The next word is', { rate: .82 });
          LTR.audio.word(need);
          tileEls.forEach(function (t) {
            var txt = t.querySelector('.txt');
            if (txt && txt.textContent === need && t.dataset.used !== '1') t.classList.add('is-hinted');
          });
        },

        /* Hint 3: glow it and point. */
        hintShow: function () {
          var need = words[placed];
          if (!need) return;
          tileEls.forEach(function (t) {
            var txt = t.querySelector('.txt');
            var match = txt && txt.textContent === need && t.dataset.used !== '1';
            t.classList.toggle('is-hinted', !!match);
            if (match) LTR.guide.point(t);
          });
          if (slotEls[placed]) slotEls[placed].style.background = 'rgba(255,215,94,.5)';
        }
      };
    }
  });

  /* ===================================================== sentence match === */

  LTR.game('sentenceMatch', {
    name: 'Reading the Waves',
    skill: 'sentenceReading',

    buildRound: function (ctx) {
      var sentence = LTR.reading.pickSentence({
        maxDifficulty: ctx.config.maxDifficulty || ctx.difficulty,
        exclude: ctx.used
      });
      if (!sentence) return null;

      var n = Math.max(2, Math.min(3, ctx.choiceCount));
      var others = LTR.data.sentenceDistractors(sentence, n - 1);
      if (!others.length) return null;
      var all = U.shuffle([sentence].concat(others));

      return {
        item: sentence,
        bucket: 'words',
        key: sentence.text,
        sayOnSolve: false,
        prompt: 'Which picture is this sentence about?',
        speak: { text: sentence.text, kind: 'sentence' },
        /* The sentence itself is the thing to read, so the cue never reads it:
           it only explains the job. The 🔊 button reads it on request. */
        autoVoice: 'Read the sentence. Which picture is it about?',

        render: function (area, api) {
          var card = el('div.panel.enter-up', {
            style: { maxWidth: 'min(34rem, 94vw)', textAlign: 'center' }
          });
          var line = el('div.sentence-line');
          sentence.words.forEach(function (w, i) {
            var sp = el('span.w', { text: w });
            sp.addEventListener('click', function () {
              LTR.audio.stop();
              LTR.audio.word(w);
              sp.classList.add('lit');
              U.later(600, function () { sp.classList.remove('lit'); });
            });
            line.appendChild(sp);
            if (i < sentence.words.length - 1) line.appendChild(document.createTextNode(' '));
          });
          card.appendChild(line);
          area.appendChild(card);

          var row = el('div.choices.stagger');
          all.forEach(function (s) {
            row.appendChild(api.choice({
              pic: s.emoji, correct: s.emoji === sentence.emoji, label: s.text
            }));
          });
          area.appendChild(row);
        },

        /* Hint 1: read it aloud, lighting each word. */
        hintClue: function (api) {
          var spans = U.qsa('.sentence-line .w', api.area);
          LTR.audio.stop();
          LTR.audio.speak(sentence.text, {
            rate: .68,
            onWord: function (i) {
              spans.forEach(function (sp, idx) { sp.classList.toggle('lit', idx === i); });
            }
          });
        },

        /* Hint 2: the one word that decides it — the last noun. */
        hintSound: function () {
          var key = sentence.words[sentence.words.length - 1];
          LTR.audio.stop();
          LTR.audio.speak('Listen for this word.', { rate: .82 });
          LTR.audio.word(key);
        }
      };
    }
  });

})(window.LTR);
