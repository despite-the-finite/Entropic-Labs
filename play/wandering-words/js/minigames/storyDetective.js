/* =============================================================================
   Story Detective — read a tiny story, then answer one question with pictures.
   Skill: comprehension. Used from Sentence Sea / Story Mountain onward.
   ============================================================================= */
(function (LTR) {
  'use strict';

  var U = LTR.util, el = U.el;

  LTR.game('storyDetective', {
    name: 'Story Detective',
    skill: 'comprehension',

    buildRound: function (ctx) {
      var story = LTR.reading.pickStory({
        maxDifficulty: ctx.config.maxDifficulty || ctx.difficulty
      });
      if (!story) return null;

      var opts = U.shuffle(story.options.slice(0, Math.max(2, ctx.choiceCount)));
      if (!opts.some(function (o) { return o.correct; })) {
        opts[0] = story.options.filter(function (o) { return o.correct; })[0];
        opts = U.shuffle(opts);
      }

      return {
        item: story,
        bucket: 'words',
        key: story.id,
        prompt: story.question,
        speak: { text: story.lines.join(' ') + ' ' + story.question, kind: 'sentence' },
        autoVoice: 'Read the story. Then answer the question.',

        render: function (area, api) {
          var page = el('div.panel.enter-up', { style: { maxWidth: 'min(34rem, 94vw)' } });
          story.lines.forEach(function (line, i) {
            page.appendChild(el('div', {
              text: line,
              style: {
                fontSize: 'var(--fs-mid)', fontWeight: '800', margin: '.25rem 0',
                color: 'var(--ink)', lineHeight: '1.35'
              },
              class: 'enter-up',
              'data-i': i
            }));
          });
          page.appendChild(el('div', {
            text: story.question,
            style: {
              marginTop: '.6rem', paddingTop: '.5rem', borderTop: '.14rem dashed #e0c489',
              fontSize: 'var(--fs-mid)', fontWeight: '900', color: 'var(--magic-deep)'
            }
          }));
          area.appendChild(page);

          var row = el('div.choices.stagger');
          opts.forEach(function (o) {
            row.appendChild(api.choice({
              pic: o.emoji, cap: o.label, correct: !!o.correct, label: o.label
            }));
          });
          area.appendChild(row);
        },

        hintClue: function (api) {
          if (story.hintText) LTR.ui.cheer(story.hintText, 'soft', api.area);
        },
        hintSound: function () { LTR.audio.sentence(story.lines.join(' ')); }
      };
    }
  });

})(window.LTR);
