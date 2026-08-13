/* =============================================================================
   Letter Fireflies — the word-lights turned into fireflies. Catch the right one.
   Skill: letter recognition (and letter sounds when run under that skill).
   ============================================================================= */
(function (LTR) {
  'use strict';

  var U = LTR.util, el = U.el;

  /** Loose scatter positions (%) that never overlap, per option count.
      Kept inside 22–78% vertically so nothing hugs an edge on any screen. */
  var LAYOUTS = {
    2: [[27, 40], [72, 62]],
    3: [[24, 30], [72, 32], [48, 72]],
    4: [[24, 27], [73, 27], [27, 73], [74, 72]],
    5: [[22, 26], [72, 24], [48, 50], [26, 76], [76, 74]]
  };

  LTR.game('letterFireflies', {
    name: 'Letter Fireflies',
    skill: 'letterRecognition',

    buildRound: function (ctx) {
      var soundMode = ctx.skill === 'letterSounds';
      var target = LTR.reading.pickLetter(ctx.skill, { exclude: ctx.used });
      if (!target) return null;

      var n = Math.max(2, ctx.choiceCount);
      var others = LTR.reading.letterDistractors(target, n - 1, {
        tier: Math.max(2, LTR.progression.letterTierFor(ctx.skill))
      });

      // Case: start with capitals only, mix in lowercase as she gets stronger.
      var lower = LTR.progression.skillLevel(ctx.skill) >= 3 && Math.random() < 0.5;
      var show = function (l) { return lower ? l.char : l.char.toUpperCase(); };

      var all = U.shuffle([target].concat(others));
      var layout = LAYOUTS[Math.min(5, all.length)] || LAYOUTS[4];

      return {
        item: target,
        bucket: 'letters',
        key: target.char,
        flyWord: show(target),
        prompt: soundMode
          ? 'Catch the firefly that says "' + target.say + '"'
          : 'Catch the letter ' + show(target),
        speak: {
          text: target.char,
          kind: soundMode ? 'letterSound' : 'letterName'
        },
        autoVoice: soundMode
          ? 'Catch the firefly that says ' + target.say
          : 'Catch the letter ' + target.char.toUpperCase(),

        render: function (area, api) {
          // A frame that fills whatever room is left, with the fireflies
          // absolutely placed inside it, so the scatter is identical on a
          // phone in landscape and a desktop browser.
          var frame = el('div', {
            style: { position: 'relative', width: '100%', flex: '1 1 auto', minHeight: 'min(46vh, 20rem)' }
          });
          var field = el('div', { style: { position: 'absolute', inset: '0' } });
          frame.appendChild(field);

          all.forEach(function (letter, i) {
            var pos = layout[i] || [50, 50];
            var node = el('button.choice', {
              'aria-label': 'firefly ' + letter.char,
              style: {
                position: 'absolute',
                left: pos[0] + '%', top: pos[1] + '%',
                transform: 'translate(-50%,-50%)',
                width: 'clamp(4.2rem, min(21vw, 19vh), 8.5rem)',
                minWidth: '0', minHeight: '0',
                aspectRatio: '1 / 1',
                borderRadius: '50%',
                background: 'radial-gradient(circle at 40% 35%, #fffce8, #ffe066 62%, #ffcf3f 100%)',
                boxShadow: '0 0 2.2rem .4rem rgba(255,224,102,.55), 0 .4rem 0 #d9a91e',
                padding: '0',
                animation: 'floaty ' + (3.4 + i * .6) + 's ease-in-out infinite',
                animationDelay: (i * .3) + 's'
              }
            }, el('div', {
              text: show(letter),
              style: {
                fontSize: 'clamp(2.2rem, 9vw, 3.6rem)', fontWeight: '900',
                color: '#5b3fbd', lineHeight: '1'
              }
            }));

            // little wings
            node.appendChild(el('div', {
              style: {
                position: 'absolute', inset: '-18% -30%', pointerEvents: 'none',
                background: 'radial-gradient(closest-side, rgba(255,255,255,.55), transparent 70%)',
                borderRadius: '50%'
              }
            }));

            api.register(node, letter.char === target.char, { letter: letter });
            field.appendChild(node);
          });

          area.appendChild(frame);
        },

        /* Hint 1: a picture clue — the thing this letter starts. */
        hintClue: function (api) {
          var clue = el('div.enter-up', {
            style: {
              position: 'absolute', left: '50%', top: '4%', transform: 'translateX(-50%)',
              background: 'rgba(255,253,246,.96)', borderRadius: '1.2rem',
              padding: '.4rem 1rem', boxShadow: 'var(--shadow-pop)', textAlign: 'center', zIndex: '5'
            }
          }, [
            el('div', { text: target.emoji, style: { fontSize: 'clamp(2rem,8vw,3rem)' } }),
            el('div', { text: target.word + ' starts with ' + target.char.toUpperCase(),
                        style: { fontWeight: '800', fontSize: 'var(--fs-small)' } })
          ]);
          api.area.firstChild.appendChild(clue);
          LTR.audio.word(target.word);
        },

        /* Hint 2: hear the sound it makes. */
        hintSound: function () { LTR.audio.letterSound(target.char); }
      };
    }
  });

})(window.LTR);
