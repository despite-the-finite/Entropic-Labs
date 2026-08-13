/* =============================================================================
   screens/chapter.js — walks a chapter's nodes and turns them into scenes.

   This is the only place that knows how to *stage* a chapter; the chapter
   itself is pure data. Node types handled: story, activity, gauntlet, discover.
   ============================================================================= */
(function (LTR) {
  'use strict';

  var U = LTR.util, el = U.el;

  /* -------------------------------------------------------- surprises ----- */
  /* Kept rare on purpose: a surprise that happens every time is a routine. */
  var SURPRISES = [
    {
      id: 'sp-chest', glyph: '🎁', title: 'A chest just appeared!',
      body: 'It was not there a second ago. Pip swears it was not there.',
      reward: [{ kind: 'gems', n: 2 }]
    },
    {
      id: 'sp-star', glyph: '🌠', title: 'A shooting star!',
      body: 'It left a trail of sparkles right over the trees.',
      reward: [{ kind: 'stickers', item: { id: 'st-star', glyph: '🌠', name: 'Star Watcher' } }]
    },
    {
      id: 'sp-joke', glyph: '🦊', title: 'Pip has a joke',
      body: 'Why did the letter B go to bed? Because it was BEE-tired! …Pip laughs alone.',
      reward: [{ kind: 'stars', n: 2 }]
    },
    {
      id: 'sp-mouse', glyph: '🐭', title: 'A tiny mouse!',
      body: 'She hands you an acorn, squeaks something polite, and vanishes.',
      reward: [{ kind: 'animals', item: { id: 'momo', glyph: '🐭', name: 'Momo', note: 'A mouse of very few squeaks.' } }]
    },
    {
      id: 'sp-map', glyph: '🗺️', title: 'A mysterious map',
      body: 'Someone left it on a stump. There is a lantern drawn in the corner…',
      reward: [{ kind: 'treasures', item: { id: 't-map', glyph: '🗺️', name: 'Old Map', note: 'Left by the Lantern Wanderer.' } }]
    }
  ];

  function maybeSurprise(chapterId) {
    var seen = LTR.state.data.progress.surprisesSeen;
    var pool = SURPRISES.filter(function (s) { return seen.indexOf(s.id) === -1; });
    if (!pool.length) return Promise.resolve();
    if (Math.random() > 0.28) return Promise.resolve();

    var sp = U.pick(pool);
    seen.push(sp.id);
    LTR.state.save();
    LTR.audio.sfx('sparkle');
    LTR.ui.confetti(30);

    return LTR.ui.modal({
      glyph: sp.glyph,
      title: sp.title,
      body: sp.body,
      actions: [{ label: 'Ooh!', value: 1, style: 'btn-magic', big: true }]
    }).then(function () {
      return LTR.ui.grantRewards(sp.reward, { title: 'A surprise for you!' });
    });
  }

  /* ============================================================== screen == */

  LTR.ui.screen('chapter', function (params) {
    var ch = LTR.data.chapter(params.chapter);
    var screen = el('div.screen');

    if (!ch || !ch.nodes.length) {
      screen.appendChild(LTR.ui.env('forest'));
      screen.appendChild(el('div.screen-body', el('div.panel', [
        el('h2', { text: 'Coming soon!' }),
        el('button.btn', { text: 'Back to the map', onClick: function () { LTR.ui.go('map'); } })
      ])));
      return screen;
    }

    /* where are we along the trail? */
    var startIdx = 0;
    for (var i = 0; i < ch.nodes.length; i++) {
      if (!LTR.state.isNodeComplete(ch.id, ch.nodes[i].id)) { startIdx = i; break; }
      startIdx = i + 1;
    }
    var replaying = startIdx >= ch.nodes.length;
    if (replaying) startIdx = 0;

    /* ---- chrome that persists across nodes ---- */
    var envHost = el('div', { style: { position: 'absolute', inset: '0', zIndex: '0' } });
    screen.appendChild(envHost);

    var hud = LTR.ui.hud({ back: function () { leave(); }, book: true });
    screen.appendChild(hud);

    var trail = el('div.trail');
    screen.appendChild(trail);

    var body = el('div.screen-body', { style: { paddingTop: '.2rem' } });
    var content = el('div.stage');
    body.appendChild(content);
    screen.appendChild(body);
    screen.appendChild(LTR.ui.parentGate());

    function leave() {
      LTR.state.flush();
      LTR.ui.go('map');
    }

    function paintTrail(idx) {
      U.clear(trail);
      ch.nodes.forEach(function (n, i) {
        var dot = el('i');
        if (i < idx) dot.classList.add('done');
        if (i === idx) dot.classList.add('here');
        trail.appendChild(dot);
      });
    }

    function setEnv(kind) {
      U.clear(envHost);
      envHost.appendChild(LTR.ui.env(kind || ch.env || 'forest'));
    }

    /* ------------------------------------------------------- node runner -- */

    function runNode(idx) {
      if (idx >= ch.nodes.length) return finishChapter();

      var node = ch.nodes[idx];
      paintTrail(idx);
      setEnv(node.env);
      U.clear(content);
      LTR.ui.clearFx();          // leftover confetti must not rain on a puzzle
      LTR.reading.resetSession();

      var done = function () {
        LTR.state.completeNode(ch.id, node.id);
        LTR.state.data.progress.currentChapter = ch.id;
        LTR.state.save();

        var after = function () {
          // A surprise sometimes waits between scenes — never during one.
          var isLast = idx + 1 >= ch.nodes.length;
          var maybe = (!isLast && node.type !== 'story') ? maybeSurprise(ch.id) : Promise.resolve();
          maybe.then(function () { runNode(idx + 1); });
        };

        LTR.ui.grantRewards(node.rewards, { title: rewardTitle(node) }).then(after);
      };

      if (node.type === 'story')     return runStory(node, done);
      if (node.type === 'activity')  return runActivity(node, done);
      if (node.type === 'gauntlet')  return runGauntlet(node, done);
      if (node.type === 'discover')  return runDiscover(node, done);
      console.warn('[LTR] unknown node type', node.type);
      return done();
    }

    function rewardTitle(node) {
      if (node.secret) return 'You found a secret!';
      if (node.type === 'gauntlet') return 'The gate is open!';
      return 'Treasure!';
    }

    /* --------------------------------------------------------- 1. story --- */

    function runStory(node, done) {
      var beat = 0;
      var cast = el('div.cast');
      var speech = el('div.speech.enter-up');
      var actors = {};

      (node.cast || []).forEach(function (id, i) {
        var a = LTR.ui.actor(id, { enter: i % 2 ? 'enter-right' : 'enter-left' });
        actors[id] = a;
        cast.appendChild(a);
      });

      content.appendChild(cast);
      content.appendChild(speech);

      var tapHint = el('div.tap-on', { text: 'tap to keep going  👉' });

      function paint() {
        var b = node.beats[beat];
        if (!b) return;

        // Bring the speaker forward; everyone else steps back a little.
        if (!actors[b.who] && b.who) {
          var a = LTR.ui.actor(b.who, { enter: 'enter-right', mood: b.mood });
          actors[b.who] = a;
          cast.appendChild(a);
        }
        Object.keys(actors).forEach(function (id) {
          var isSpeaker = id === b.who;
          actors[id].style.transform = isSpeaker ? 'scale(1.06)' : 'scale(.86)';
          actors[id].style.opacity = isSpeaker ? '1' : '.72';
          actors[id].style.transition = 'transform .3s ease, opacity .3s ease';
        });
        if (b.mood && actors[b.who]) {
          actors[b.who].innerHTML = LTR.art.byId(b.who, '', b.mood);
        }

        var who = LTR.data.character(b.who);
        U.clear(speech);
        speech.appendChild(el('div.who', { text: who ? who.name : (b.who === 'player' ? LTR.state.data.player.name : '') }));
        speech.appendChild(el('div', { text: b.text, style: { minHeight: '2.6em' } }));

        var tools = el('div.row', { style: { marginTop: '.5rem' } });
        tools.appendChild(el('button.icon-btn.speaker', {
          text: '🔊', 'aria-label': 'Hear it again',
          onClick: function () { LTR.audio.character(b.who, b.text); }
        }));
        tools.appendChild(el('button.btn.btn-leaf', {
          text: beat + 1 >= node.beats.length ? 'Go!  ▶' : 'Next  ▶',
          onClick: advance
        }));
        speech.appendChild(tools);
        speech.appendChild(tapHint);

        speech.classList.remove('enter-up'); void speech.offsetWidth; speech.classList.add('enter-up');
        LTR.audio.sfx('tap');

        /* Story lines are read aloud in each character's own voice: this is
           the part of the game a pre-reader is meant to *listen* to, so she
           can follow the adventure with nobody sitting beside her. */
        var st = LTR.state.data.settings;
        if (st.speech !== false && st.autoVoice !== false) {
          U.later(260, function () { LTR.audio.character(b.who, b.text); });
        }
      }

      function advance() {
        beat += 1;
        if (beat >= node.beats.length) {
          content.removeEventListener('click', bgAdvance);
          return done();
        }
        paint();
      }

      /* Tapping anywhere in the scene advances too — fewer targets to hunt. */
      function bgAdvance(e) {
        if (e.target.closest && e.target.closest('button')) return;
        advance();
      }
      content.addEventListener('click', bgAdvance);

      paint();
    }

    /* ------------------------------------------------------ 2. activity --- */

    function runActivity(node, done) {
      var showIntro = node.intro
        ? sceneCard(node.intro, node.title)
        : Promise.resolve();

      showIntro.then(function () {
        U.clear(content);
        var host = el('div', { style: { display: 'flex', flexDirection: 'column', flex: '1 1 auto', width: '100%', minHeight: '0' } });
        content.appendChild(host);
        return LTR.activity.run({
          host: host,
          game: node.game,
          skill: node.skill,
          rounds: node.rounds || 3,
          config: node.config || {},
          title: node.title
        });
      }).then(function (tally) {
        return node.outro ? sceneCard(node.outro, null, tally) : Promise.resolve();
      }).then(done);
    }

    /* ------------------------------------------------------ 3. gauntlet --- */

    function runGauntlet(node, done) {
      var host = null;
      var total = node.steps.reduce(function (a, s) { return a + (s.rounds || 1); }, 0);
      var offset = 0;
      var grand = { correct: 0, total: 0, hintsUsed: 0, misses: 0 };

      function step(i) {
        if (i >= node.steps.length) {
          return (node.outro ? sceneCard(node.outro, null, grand) : Promise.resolve()).then(done);
        }
        var s = node.steps[i];
        return LTR.activity.run({
          host: host,
          game: s.game,
          skill: s.skill,
          rounds: s.rounds || 1,
          config: s.config || {},
          pipsTotal: total,
          pipsOffset: offset
        }).then(function (t) {
          offset += (s.rounds || 1);
          grand.correct += t.correct; grand.total += t.total;
          grand.hintsUsed += t.hintsUsed; grand.misses += t.misses;
          // A lock clunks open between each challenge.
          LTR.audio.sfx('unlock');
          LTR.ui.toast('Lock ' + (i + 1) + ' of ' + node.steps.length + ' opened!', '🔓');
          return U.wait(650).then(function () { return step(i + 1); });
        });
      }

      (node.intro ? sceneCard(node.intro, node.title) : Promise.resolve()).then(function () {
        U.clear(content);
        host = el('div', { style: { display: 'flex', flexDirection: 'column', flex: '1 1 auto', width: '100%', minHeight: '0' } });
        content.appendChild(host);
        step(0);
      });
    }

    /* ------------------------------------------------------ 4. discover --- */
    /* A hidden-letter hunt in the scenery: reading as *searching*. */

    function runDiscover(node, done) {
      var letter = LTR.reading.pickLetter('letterRecognition', {});
      var decoyCount = (node.find && node.find.decoys) || 5;
      var decoys = LTR.reading.letterDistractors(letter, decoyCount, { tier: 3 });
      var all = U.shuffle([letter].concat(decoys));
      var solved = false;

      var intro = node.intro ? sceneCard(node.intro, node.title) : Promise.resolve();

      intro.then(function () {
        U.clear(content);

        content.appendChild(el('div.prompt-bar.enter-up', [
          el('div.txt', { text: (node.find.prompt || 'Find the letter') + ' ' + letter.char.toUpperCase() }),
          LTR.ui.speakerButton(letter.char, 'letterName')
        ]));

        var frame = el('div', {
          style: { position: 'relative', width: '100%', flex: '1 1 auto', minHeight: 'min(46vh, 20rem)' }
        });
        var field = el('div', { style: { position: 'absolute', inset: '0' } });
        frame.appendChild(field);

        all.forEach(function (l, i) {
          var col = i % 3, rowN = Math.floor(i / 3);
          var x = 20 + col * 30 + (Math.random() * 8 - 4);
          var y = 26 + rowN * 38 + (Math.random() * 8 - 4);
          var leaf = el('button', {
            'aria-label': 'leaf ' + l.char,
            style: {
              position: 'absolute', left: x + '%', top: y + '%',
              transform: 'translate(-50%,-50%) rotate(' + (Math.random() * 40 - 20) + 'deg)',
              border: '0', cursor: 'pointer', background: 'transparent',
              width: 'clamp(3.8rem, min(19vw, 16vh), 7rem)', height: 'clamp(3.8rem, min(19vw, 16vh), 7rem)',
              padding: '0', animation: 'bob ' + (2 + i * .3) + 's ease-in-out infinite'
            }
          });
          leaf.appendChild(el('div', {
            style: {
              position: 'absolute', inset: '0',
              background: 'radial-gradient(circle at 38% 32%, #8fd88f, #4f9b6d 70%)',
              borderRadius: '60% 10% 60% 10%',
              boxShadow: '0 .3rem .5rem rgba(0,0,0,.22)'
            }
          }));
          leaf.appendChild(el('div', {
            text: l.char.toUpperCase(),
            style: {
              position: 'relative', fontWeight: '900', color: '#fff8e9',
              fontSize: 'clamp(1.6rem,7vw,2.6rem)', textShadow: '0 .1rem 0 rgba(0,0,0,.25)'
            }
          }));

          leaf.addEventListener('click', function () {
            if (solved) return;
            if (l.char === letter.char) {
              solved = true;
              LTR.audio.sfx('sparkle');
              LTR.ui.sparkleOn(leaf, 26);
              LTR.progression.recordAnswer({
                skill: 'letterRecognition', correct: true, hintLevel: 0,
                bucket: 'letters', key: letter.char
              });
              // the butterfly bursts out
              var fly = el('div', {
                text: '🦋',
                style: {
                  position: 'absolute', left: leaf.style.left, top: leaf.style.top,
                  fontSize: 'clamp(2.5rem,10vw,4rem)', transform: 'translate(-50%,-50%)',
                  transition: 'transform 1.4s cubic-bezier(.3,.1,.2,1), opacity 1.4s',
                  zIndex: '5'
                }
              });
              field.appendChild(fly);
              U.later(60, function () {
                fly.style.transform = 'translate(-50%,-380%) scale(1.5) rotate(12deg)';
              });
              leaf.style.opacity = '.3';
              LTR.ui.cheer('You found it!', 'good', content);
              if (node.secret && LTR.state.findSecret(node.secret)) {
                U.later(900, function () { LTR.ui.toast('A secret path opened!', '🌟'); });
              }
              U.later(1700, function () {
                (node.outro ? sceneCard(node.outro) : Promise.resolve()).then(done);
              });
            } else {
              LTR.audio.sfx('tryagain');
              leaf.classList.remove('is-wrong'); void leaf.offsetWidth;
              leaf.classList.add('is-wrong');
              LTR.ui.cheer(U.pick(LTR.activity.NUDGE), 'soft', content);
            }
          });

          field.appendChild(leaf);
        });

        content.appendChild(frame);
      });
    }

    /* --------------------------------------------------- character card --- */
    /* A single line of dialogue framed as a scene beat, used for intros and
       outros around activities so a challenge always has a reason to exist. */

    function sceneCard(beat, title, tally) {
      return new Promise(function (resolve) {
        U.clear(content);
        var cast = el('div.cast');
        cast.appendChild(LTR.ui.actor(beat.who, { enter: 'enter-left', mood: beat.mood }));
        content.appendChild(cast);

        var box = el('div.speech.enter-up');
        var who = LTR.data.character(beat.who);
        box.appendChild(el('div.who', { text: who ? who.name : '' }));
        if (title) box.appendChild(el('div', {
          text: title,
          style: { fontSize: 'var(--fs-small)', color: 'var(--magic-deep)', fontWeight: '900', letterSpacing: '.05em' }
        }));
        box.appendChild(el('div', { text: beat.text }));

        if (tally && tally.total) {
          box.appendChild(el('div', {
            text: '⭐'.repeat(Math.max(1, Math.round(tally.correct / tally.total * 3))),
            style: { fontSize: 'var(--fs-big)', marginTop: '.2rem' }
          }));
        }

        var tools = el('div.row', { style: { marginTop: '.5rem' } });
        tools.appendChild(el('button.icon-btn.speaker', {
          text: '🔊', 'aria-label': 'Hear it again',
          onClick: function () { LTR.audio.character(beat.who, beat.text); }
        }));
        tools.appendChild(el('button.btn.btn-leaf', {
          text: 'Ready!  ▶',
          onClick: function () { LTR.audio.sfx('tap'); resolve(); }
        }));
        box.appendChild(tools);
        content.appendChild(box);

        var st2 = LTR.state.data.settings;
        if (st2.speech !== false && st2.autoVoice !== false) {
          U.later(260, function () { LTR.audio.character(beat.who, beat.text); });
        }
      });
    }

    /* ----------------------------------------------- chapter completion --- */

    function finishChapter() {
      var c = ch.completion || {};
      LTR.state.completeChapter(ch.id);
      LTR.audio.sfx('fanfare');
      LTR.ui.confetti(140);
      setEnv('glade');
      U.clear(content);

      var cast = el('div.cast');
      ['pip', 'player', 'grumblewink'].forEach(function (id, i) {
        cast.appendChild(LTR.ui.actor(id, { enter: i % 2 ? 'enter-right' : 'enter-left', mood: 'happy' }));
      });
      content.appendChild(cast);

      LTR.ui.grantRewards(c.rewards, { title: c.title || 'Chapter complete!' })
        .then(function () {
          var opened = LTR.progression.checkUnlocks();
          // Finishing a chapter always opens the next door, even if the child
          // took the gentle route through it.
          if (c.unlocks && !LTR.state.isChapterUnlocked(c.unlocks)) {
            LTR.state.unlockChapter(c.unlocks);
            opened.push(LTR.data.chapter(c.unlocks));
          }
          return LTR.ui.modal({
            glyph: '🏆',
            title: c.title || 'Chapter complete!',
            body: c.text || '',
            extra: el('div', {
              style: { fontWeight: '900', color: 'var(--magic-deep)', fontSize: 'var(--fs-mid)' },
              text: 'Reading Power ' + LTR.progression.level + ' · ' + LTR.progression.rank().name
            }),
            actions: [{ label: 'What happens next?', value: 1, style: 'btn-magic', big: true }]
          }).then(function () { return opened; });
        })
        .then(function (opened) {
          var next = opened.filter(Boolean)[0];
          if (!next) return;
          LTR.audio.sfx('unlock');
          LTR.ui.confetti(60);
          return LTR.ui.modal({
            glyph: next.emoji,
            title: next.name + ' is open!',
            body: next.tagline,
            actions: [{ label: 'To the map!', value: 1, style: 'btn-leaf', big: true }]
          });
        })
        .then(function () {
          LTR.state.flush();
          LTR.ui.go('map');
        });
    }

    /* kick off */
    U.later(30, function () { runNode(startIdx); });
    if (replaying) U.later(400, function () { LTR.ui.toast('Exploring again — everything still counts!', '🔁'); });

    return screen;
  });

})(window.LTR);
