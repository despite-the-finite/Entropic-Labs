/* =============================================================================
   screens/worldMap.js — the kingdom, with a dotted trail joining the regions.

   The map is the one screen a child returns to over and over, so it has to
   answer "where do I go now?" without a single readable word:
     * the region she should play next glows and has the pointing hand on it
     * every region says its own name aloud when tapped
     * a locked region explains itself out loud, and shows how close she is
     * a ring of little stars under each region shows how far through it she is
   ============================================================================= */
(function (LTR) {
  'use strict';

  var U = LTR.util, el = U.el;

  /** How many of a chapter's nodes are finished, 0…1 (previews count as 0). */
  function chapterProgress(ch) {
    if (!ch.nodes || !ch.nodes.length) return 0;
    var done = ch.nodes.filter(function (n) {
      return LTR.state.isNodeComplete(ch.id, n.id);
    }).length;
    return done / ch.nodes.length;
  }

  /** The region the child should play next: first unlocked, unfinished one. */
  function nextChapter() {
    var chapters = LTR.data.chapters;
    var cur = LTR.state.data.progress.currentChapter;
    var currentCh = LTR.data.chapter(cur);
    if (currentCh && LTR.state.isChapterUnlocked(cur) && !LTR.state.isChapterComplete(cur)) {
      return currentCh;
    }
    var open = chapters.filter(function (c) {
      return LTR.state.isChapterUnlocked(c.id) && !LTR.state.isChapterComplete(c.id);
    });
    if (open.length) return open[0];
    // Everything finished: send her back to the last region to play again.
    var done = chapters.filter(function (c) { return LTR.state.isChapterUnlocked(c.id); });
    return done[done.length - 1] || chapters[0];
  }

  LTR.ui.screen('map', function () {
    var screen = el('div.screen');
    screen.appendChild(LTR.ui.env('map'));

    screen.appendChild(LTR.ui.hud({
      back: function () { LTR.ui.go('title'); },
      backLabel: 'Home',
      book: true
    }));

    var scroll = el('div.map-scroll');
    var inner = el('div.map-inner');

    /* dotted trail between the regions */
    var chapters = LTR.data.chapters;
    var d = chapters.map(function (c, i) {
      return (i ? 'L' : 'M') + c.mapPos.x + ' ' + c.mapPos.y;
    }).join(' ');
    inner.appendChild(el('div', {
      html: '<svg class="map-path" viewBox="0 0 100 100" preserveAspectRatio="none">' +
            '<path d="' + d + '"/></svg>',
      style: { position: 'absolute', inset: '0' }
    }));

    inner.appendChild(el('div.map-title', { text: '🗺️ The Kingdom of Stories' }));

    var goal = nextChapter();
    var goalBtn = null;

    chapters.forEach(function (ch, idx) {
      var unlocked = LTR.state.isChapterUnlocked(ch.id);
      var done = LTR.state.isChapterComplete(ch.id);
      var isGoal = goal && ch.id === goal.id;

      var btn = el('button.region', {
        style: { left: ch.mapPos.x + '%', top: ch.mapPos.y + '%' },
        'aria-label': ch.name + (unlocked ? '' : ' (locked)')
      });
      if (!unlocked) btn.classList.add('locked');
      if (isGoal) { btn.classList.add('current'); goalBtn = btn; }

      var bubble = el('div.bubble', { text: ch.emoji });
      bubble.appendChild(el('div.num', { text: String(idx + 1) }));
      if (!unlocked) bubble.appendChild(el('div.lock', { text: '🔒' }));
      if (done) bubble.appendChild(el('div.done-tick', { text: '✓' }));
      btn.appendChild(bubble);
      btn.appendChild(el('div.name', { text: ch.name }));

      /* Five little stars: how far through this region she is. Readable at a
         glance and completely language-free. */
      if (unlocked && ch.nodes && ch.nodes.length) {
        var p = chapterProgress(ch);
        var prog = el('div.prog');
        for (var i = 0; i < 5; i++) {
          prog.appendChild(el('span', { text: (i / 5) < p ? '⭐' : '☆' }));
        }
        btn.appendChild(prog);
      }

      /* the player stands on the region she is currently exploring */
      if (isGoal) {
        btn.appendChild(el('div', {
          class: 'breathe',
          style: {
            position: 'absolute', right: '-18%', bottom: '18%',
            width: 'clamp(2.6rem,9vw,4.4rem)', pointerEvents: 'none'
          },
          html: LTR.art.avatar(LTR.state.data.player.avatar)
        }));
      }

      btn.addEventListener('click', function () {
        LTR.guide.unpoint();
        if (!unlocked) {
          LTR.audio.sfx('tryagain');
          var need = ch.requiredPower;
          var have = LTR.progression.level;
          LTR.ui.modal({
            glyph: '🔒',
            title: ch.name + ' is still asleep',
            body: 'Finish the region before it, and this path wakes up!',
            voice: [ch.name + ' is still asleep.', { pause: 250 },
                    'Play the glowing place first, and this one will wake up.',
                    { pause: 250 },
                    have >= need ? 'You already have enough reading power!'
                                 : 'Reading power ' + need + ' opens it. You are at ' + have + '. Very close!'],
            actions: [{ label: 'OK!', glyph: '👍', value: 1, style: 'btn-cream' }]
          });
          return;
        }
        LTR.audio.sfx('whoosh');
        LTR.audio.speak(ch.name + '!', { interrupt: true });
        LTR.state.data.progress.currentChapter = ch.id;
        LTR.state.save();
        if (!ch.nodes || !ch.nodes.length) LTR.ui.go('preview', { chapter: ch.id });
        else LTR.ui.go('chapter', { chapter: ch.id });
      });

      inner.appendChild(btn);
    });

    scroll.appendChild(inner);
    screen.appendChild(scroll);
    screen.appendChild(LTR.ui.parentGate());

    var lines = ['This is the map of the kingdom.', { pause: 250 }];
    if (goal) {
      var pr = chapterProgress(goal);
      lines.push(pr > 0 && pr < 1
        ? 'Tap the glowing place to carry on. ' + goal.name + '.'
        : 'Tap the glowing place to play. ' + goal.name + '.');
    } else {
      lines.push('Tap a place to play.');
    }
    LTR.guide.narrate(lines, { target: goalBtn, idleAfter: 11000 });

    return screen;
  });

  /* ------------------------------------------------------------ preview --- */
  /* A postcard from a region that is unlocked but not built yet. Every region
     in the game is real now, so this only shows up for content added later —
     but it still reads itself out and offers one obvious way onward. */
  LTR.ui.screen('preview', function (params) {
    var ch = LTR.data.chapter(params.chapter);
    var screen = el('div.screen');
    screen.appendChild(LTR.ui.env((ch && ch.env) || 'valley'));
    screen.appendChild(LTR.ui.hud({ back: function () { LTR.ui.go('map'); }, backLabel: 'Map' }));

    var body = el('div.screen-body');
    var who = ch && ch.preview && ch.preview.who;
    var lines = (ch && ch.preview ? ch.preview.lines : ['Coming soon!']);

    var stack = el('div.stack', { style: { zIndex: '10' } });
    stack.appendChild(el('div', {
      text: (ch && ch.emoji) || '✨', class: 'float',
      style: { fontSize: 'clamp(3.5rem,16vw,7rem)', filter: 'drop-shadow(0 .6rem 1rem rgba(0,0,0,.3))' }
    }));

    var panel = el('div.panel.enter-up', { style: { maxWidth: 'min(36rem,94vw)', textAlign: 'center' } });
    panel.appendChild(el('h2', { text: (ch && ch.name) || 'Coming soon' }));
    lines.forEach(function (line, i) {
      panel.appendChild(el('p', {
        text: line,
        style: { fontSize: i === 0 ? 'var(--fs-big)' : 'var(--fs-mid)', margin: '.3rem 0' }
      }));
    });

    var cast = el('div.cast');
    if (who) cast.appendChild(LTR.ui.actor(who, { enter: 'enter-left' }));
    stack.appendChild(cast);
    stack.appendChild(panel);

    var backBtn = LTR.ui.bigButton({
      glyph: '🗺️', label: 'Back to the map', voice: 'Back to the map',
      style: 'btn-cream', className: 'tap-me',
      onTap: function () { LTR.ui.go('map'); }
    });
    stack.appendChild(backBtn);

    body.appendChild(stack);
    screen.appendChild(body);

    LTR.guide.narrate(
      [(ch && ch.name) || 'Coming soon'].concat(lines).concat([
        { pause: 300 }, 'Tap the map button to go back.'
      ]),
      { target: backBtn, idleAfter: 12000 }
    );

    return screen;
  });

})(window.LTR);
