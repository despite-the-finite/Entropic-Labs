/* =============================================================================
   minigames/base.js — the shared engine every reading activity runs on.

   A minigame only describes ONE round:

       LTR.game('letterFireflies', {
         name: 'Letter Fireflies',
         skill: 'letterRecognition',
         buildRound: function (ctx) {
           return { prompt: …, render: function (area, api) { … } };
         }
       });

   Everything else — the prompt bar, the speaker, the three-step hint ladder,
   the "almost!" reactions, progress pips, scoring, adaptive feedback and the
   reward beat — is handled here, identically, for every game in the world.
   ============================================================================= */
(function (LTR) {
  'use strict';

  var U = LTR.util, el = U.el;

  /* ------------------------------------------------------------ registry -- */
  var registry = Object.create(null);
  LTR.game = function (id, def) { registry[id] = Object.assign({ id: id }, def); };
  LTR.games = registry;

  /* --------------------------------------------------------- reactions ---- */
  /* Praise varies so it never sounds like a machine, and stays about the
     action ("you read it!") rather than the child ("you're so clever"). */
  var PRAISE = [
    'Yes!', 'You read it!', 'That\'s it!', 'Perfect!', 'Woohoo!',
    'You did it!', 'Brilliant!', 'Got it!', 'Nice reading!', 'Hooray!'
  ];
  var PRAISE_BIG = ['Amazing!', 'Wonderful reading!', 'You are on fire!', 'Superb!'];

  /* Never a buzzer, never an X. Just a friendly nudge onward. */
  var NUDGE = [
    'Almost!', 'Ooh, close!', 'Hmm… try another!', 'Not that one — keep looking!',
    'Nearly! Have another go.', 'Let\'s try a different one!', 'Good try!'
  ];

  /* ============================================================ runner ==== */

  /**
   * Run one activity to completion.
   *
   *   LTR.activity.run({
   *     host,            element to build into
   *     game:  'soundStones',
   *     skill: 'letterSounds',   (defaults to the game's own skill)
   *     rounds: 4,
   *     config: {},              passed through to buildRound
   *     title: 'Sound River',
   *     pipsOffset / pipsTotal   for multi-step gauntlets
   *   }) → Promise<{ correct, total, hintsUsed, misses }>
   */
  var Activity = LTR.activity = {

    run: function (cfg) {
      var def = registry[cfg.game];
      if (!def) {
        console.error('[LTR] unknown minigame: ' + cfg.game);
        return Promise.resolve({ correct: 0, total: 0, hintsUsed: 0, misses: 0 });
      }

      var skill = cfg.skill || def.skill;
      var totalRounds = cfg.rounds || 3;
      var host = cfg.host;

      var tally = { correct: 0, total: 0, hintsUsed: 0, misses: 0 };
      var roundIndex = 0;
      var usedItems = [];

      /* ---------------------------------------------------- chrome ------- */
      U.clear(host);
      var wrap = el('div.activity');
      var promptText = el('div.txt');
      var speakerSlot = el('div');
      var hintBtn = el('button.icon-btn.hint', { text: '💡', 'aria-label': 'Give me a hint' });
      var pips = el('div.pips');
      var area = el('div.play-area');

      var promptBar = el('div.prompt-bar', [promptText, speakerSlot, hintBtn]);
      wrap.appendChild(promptBar);
      wrap.appendChild(pips);
      wrap.appendChild(area);
      host.appendChild(wrap);

      var pipTotal = cfg.pipsTotal || totalRounds;
      var pipOffset = cfg.pipsOffset || 0;
      for (var i = 0; i < pipTotal; i++) pips.appendChild(el('i'));
      function paintPips(done) {
        U.qsa('i', pips).forEach(function (p, idx) {
          p.classList.toggle('done', idx < pipOffset + done);
        });
      }
      paintPips(0);

      /* ---------------------------------------------------- one round ---- */
      return new Promise(function (resolveAll) {

        function nextRound() {
          if (roundIndex >= totalRounds) {
            LTR.state.logActivity({
              game: cfg.game, name: def.name, skill: skill,
              correct: tally.correct, total: tally.total, hints: tally.hintsUsed
            });
            return resolveAll(tally);
          }
          playRound();
        }

        function playRound() {
          var ctx = {
            skill: skill,
            index: roundIndex,
            total: totalRounds,
            config: cfg.config || {},
            used: usedItems,
            difficulty: LTR.progression.difficultyFor(skill),
            choiceCount: LTR.progression.choiceCountFor(skill, (cfg.config && cfg.config.maxChoices) || 4)
          };

          var round;
          try {
            round = def.buildRound(ctx);
          } catch (err) {
            console.error('[LTR] buildRound failed for ' + cfg.game, err);
            roundIndex++; return nextRound();
          }
          if (!round) { roundIndex++; return nextRound(); }
          if (round.item) usedItems.push(round.item);

          var state = {
            hintLevel: 0,
            misses: 0,
            resolved: false,
            choices: []      // { el, correct }
          };

          U.clear(area);
          U.clear(speakerSlot);
          promptText.textContent = round.prompt || '';
          promptBar.classList.remove('enter-up'); void promptBar.offsetWidth; promptBar.classList.add('enter-up');

          hintBtn.disabled = false;
          hintBtn.textContent = '💡';

          if (round.speak) {
            speakerSlot.appendChild(LTR.ui.speakerButton(
              function () { return typeof round.speak.text === 'function' ? round.speak.text() : round.speak.text; },
              round.speak.kind
            ));
          }

          /* ------------------------------------------------- the API ---- */
          var api = {
            round: round,
            area: area,
            ctx: ctx,
            get hintLevel() { return state.hintLevel; },

            /** Standard tappable tile. cfg: {pic, txt, cap, html, correct, data} */
            choice: function (c) {
              var inner = [];
              if (c.html) inner.push(el('div', { html: c.html, style: { width: '100%' } }));
              if (c.pic) inner.push(el('div.pic', { text: c.pic }));
              if (c.txt) inner.push(el('div.txt', { text: c.txt }));
              if (c.cap) inner.push(el('div.cap', { text: c.cap }));
              var b = el('button.choice', {
                'aria-label': c.label || c.txt || c.cap || 'choice',
                style: c.style || null
              }, inner);
              if (c.className) b.className += ' ' + c.className;
              api.register(b, !!c.correct, c);
              return b;
            },

            /** Register any element as an answerable option. */
            register: function (node, isCorrect, meta) {
              var rec = { el: node, correct: !!isCorrect, meta: meta || {} };
              state.choices.push(rec);
              node.addEventListener('click', function () {
                if (state.resolved || node.classList.contains('is-gone') || node.disabled) return;
                api.answer(isCorrect, node);
              });
              return node;
            },

            /** Report an answer from a custom interaction (drag, sequence…). */
            answer: function (isCorrect, node) {
              if (state.resolved) return;
              if (isCorrect) resolveRound(node);
              else missed(node);
            },

            /** For games that decide success themselves (e.g. spelling). */
            succeed: function (node) { if (!state.resolved) resolveRound(node); },
            fail: function (node) { if (!state.resolved) missed(node); },

            speak: function (text, kind) {
              if (kind === 'letterSound') return LTR.audio.letterSound(text);
              if (kind === 'word') return LTR.audio.word(text);
              return LTR.audio.sentence(text);
            },

            sparkle: function (node) { LTR.ui.sparkleOn(node, 16); },

            /** Give the round somewhere to stash per-round handles. */
            store: {}
          };

          /* ------------------------------------------------- outcomes --- */
          function resolveRound(node) {
            state.resolved = true;
            tally.total += 1;
            hintBtn.disabled = true;

            var clean = state.misses === 0 && state.hintLevel === 0;
            if (state.misses === 0) tally.correct += 1;
            tally.hintsUsed += state.hintLevel;
            tally.misses += state.misses;

            if (node) {
              node.classList.add('is-right');
              LTR.ui.sparkleOn(node, 20);
              if (round.flyWord) LTR.ui.flyWord(round.flyWord, node);
            }
            state.choices.forEach(function (c) {
              if (c.el !== node) c.el.style.opacity = '.45';
              c.el.disabled = true;
            });

            LTR.audio.sfx(clean ? 'correct' : 'sparkle');
            var msg = clean
              ? (LTR.progression.skill(skill).streak >= 3 ? U.pick(PRAISE_BIG) : U.pick(PRAISE))
              : U.pick(['You got it!', 'There it is!', 'Yes — that\'s the one!']);
            LTR.ui.cheer(msg, 'good', wrap);

            var result = LTR.progression.recordAnswer({
              skill: skill,
              correct: state.misses === 0,
              hintLevel: state.hintLevel,
              bucket: round.bucket,
              key: round.key
            });
            // Getting there after a wobble still moves the meter — the child
            // must always see progress for finishing something.
            if (state.misses > 0) LTR.progression.addPower(1);

            if (round.onSolved) { try { round.onSolved(api); } catch (e) {} }

            paintPips(roundIndex + 1);
            roundIndex += 1;

            var wait = round.solvedDelay || 1150;
            U.later(wait, function () {
              if (result.newRank) {
                LTR.ui.celebrateRank(result.newRank).then(nextRound);
              } else {
                nextRound();
              }
            });
          }

          function missed(node) {
            state.misses += 1;
            LTR.audio.sfx('tryagain');
            if (node) {
              node.classList.remove('is-wrong'); void node.offsetWidth;
              node.classList.add('is-wrong');
              // Fade a wrong option out of the way so the field narrows and
              // she cannot get stuck. Nothing is ever marked "wrong".
              U.later(420, function () {
                node.classList.add('is-gone');
                node.disabled = true;
              });
            }
            LTR.ui.cheer(U.pick(NUDGE), 'soft', wrap);
            if (round.onMiss) { try { round.onMiss(api, node); } catch (e) {} }

            // After two wobbles, quietly light the answer so she always wins.
            if (state.misses >= 2 && state.hintLevel < 3) {
              U.later(700, function () { applyHint(3, true); });
            }
          }

          /* ---------------------------------------------------- hints --- */
          function defaultHint(level) {
            var right = state.choices.filter(function (c) { return c.correct; })[0];
            var wrongs = state.choices.filter(function (c) {
              return !c.correct && !c.el.classList.contains('is-gone');
            });

            if (level === 1) {
              // Visual clue: the round's own clue if it has one, else thin the field.
              if (round.hintClue) { round.hintClue(api); return; }
              if (wrongs.length > 1) {
                var v = U.pick(wrongs);
                v.el.classList.add('is-gone');
                v.el.disabled = true;
                LTR.ui.cheer('That one is not it!', 'soft', wrap);
                return;
              }
            }
            if (level === 2) {
              // Highlight the relevant letter or sound — and say it.
              if (round.hintSound) { round.hintSound(api); return; }
              if (round.key) LTR.audio.word(round.key);
              if (wrongs.length > 1) {
                var v2 = U.pick(wrongs);
                v2.el.classList.add('is-gone'); v2.el.disabled = true;
              }
              return;
            }
            // Level 3: show it, then let her do it herself.
            if (round.hintShow) { round.hintShow(api); }
            if (right) {
              right.el.classList.add('is-hinted');
              wrongs.forEach(function (c) { c.el.style.opacity = '.4'; });
              LTR.ui.cheer('It\'s this one — tap it!', 'soft', wrap);
            }
          }

          function applyHint(forceLevel, silent) {
            if (state.resolved) return;
            var level = forceLevel || Math.min(3, state.hintLevel + 1);
            if (level <= state.hintLevel && !forceLevel) return;
            state.hintLevel = level;
            if (!silent) LTR.audio.sfx('magic');

            if (round.hints && round.hints[level - 1]) {
              try { round.hints[level - 1](api); } catch (e) { defaultHint(level); }
            } else {
              defaultHint(level);
            }

            hintBtn.textContent = ['💡', '💡', '✨', '👀'][level] || '👀';
            if (level >= 3) hintBtn.disabled = true;
          }

          hintBtn.onclick = function () { applyHint(); };

          /* ------------------------------------------------- go! -------- */
          try {
            round.render(area, api);
          } catch (err) {
            console.error('[LTR] render failed for ' + cfg.game, err);
            roundIndex++; return nextRound();
          }

          if (round.onReady) { try { round.onReady(api); } catch (e) {} }

          /* Spoken cue. A four-year-old cannot read the instruction bar, so
             each round says its CUE out loud once — "catch the letter M",
             "which one starts with sss". Never the answer: games where the
             written word IS the answer (Treasure Cave, Story Detective) only
             ever speak a generic instruction. Turn it off in the Parent Zone
             and the speaker buttons still work on demand. */
          var st = LTR.state.data.settings;
          if (round.autoVoice && st.speech !== false && st.autoVoice !== false) {
            U.later(520, function () {
              if (state.resolved) return;
              var v = round.autoVoice;
              if (typeof v === 'string') LTR.audio.sentence(v);
              else if (v.kind === 'letterName') LTR.audio.letterName(v.text);
              else if (v.kind === 'letterSound') LTR.audio.letterSound(v.text);
              else if (v.kind === 'word') LTR.audio.word(v.text);
              else LTR.audio.sentence(v.text);
            });
          }
        }

        nextRound();
      });
    },

    /** Praise/nudge banks, exposed so special scenes can match the tone. */
    PRAISE: PRAISE,
    NUDGE: NUDGE
  };

})(window.LTR);
