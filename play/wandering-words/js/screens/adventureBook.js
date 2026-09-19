/* =============================================================================
   screens/adventureBook.js — "My Adventure Book".

   The reason to come back: everything she has found, in one warm place.
   Empty slots are shown as dotted outlines so there is always a next thing.
   ============================================================================= */
(function (LTR) {
  'use strict';

  var U = LTR.util, el = U.el;

  var TABS = [
    { id: 'characters', label: 'Friends',   glyph: '🧑‍🤝‍🧑' },
    { id: 'animals',    label: 'Animals',   glyph: '🐾' },
    { id: 'treasures',  label: 'Treasures', glyph: '💎' },
    { id: 'stickers',   label: 'Stickers',  glyph: '⭐' },
    { id: 'letters',    label: 'Letters',   glyph: '🔤' },
    { id: 'words',      label: 'Words',     glyph: '📚' },
    { id: 'places',     label: 'Places',    glyph: '🗺️' }
  ];

  /* What each page is called out loud, so a child can find the page she wants
     by tapping the pictures and listening. */
  var TAB_VOICE = {
    characters: 'Your friends',
    animals:    'Animals you met',
    treasures:  'Your treasures',
    stickers:   'Your stickers',
    letters:    'Letters you know',
    words:      'Words you can read',
    places:     'Places you have been'
  };

  LTR.ui.screen('book', function (params) {
    var active = params.tab || 'characters';
    var screen = el('div.screen');
    screen.appendChild(LTR.ui.env('glade'));

    screen.appendChild(LTR.ui.hud({
      back: function () { LTR.ui.go(LTR.state.data.player.created ? 'map' : 'title'); },
      backLabel: 'Back',
      book: false
    }));

    var body = el('div.screen-body', { style: { justifyContent: 'flex-start', paddingTop: '.2rem' } });

    body.appendChild(el('div', {
      text: '📔  My Adventure Book',
      style: {
        fontWeight: '900', fontSize: 'var(--fs-big)', color: '#fff',
        textShadow: '0 .14rem 0 #6b46d6, 0 .4rem 1rem rgba(0,0,0,.3)', zIndex: '10'
      }
    }));

    var tabs = el('div.book-tabs', { style: { zIndex: '10' } });
    var scroll = el('div.book-scroll', { style: { zIndex: '10' } });

    function renderTab(id) {
      active = id;
      U.qsa('.book-tab', tabs).forEach(function (t) {
        t.classList.toggle('active', t.dataset.tab === id);
      });
      U.clear(scroll);

      var grid = el('div.book-grid');
      var cells = [];

      if (id === 'letters') {
        var mastered = LTR.state.masteredList('letters');
        var learning = LTR.state.learningList('letters');
        LTR.data.letters.forEach(function (l) {
          var isM = mastered.indexOf(l.char) !== -1;
          var isL = learning.indexOf(l.char) !== -1;
          cells.push({
            glyph: isM || isL ? l.emoji : '·',
            nm: l.char.toUpperCase() + l.char,
            dsc: isM ? 'mastered ⭐' : (isL ? 'learning' : ''),
            empty: !isM && !isL
          });
        });
      } else if (id === 'words') {
        var mw = LTR.state.masteredList('words');
        var lw = LTR.state.learningList('words');
        var seen = mw.concat(lw);
        if (!seen.length) {
          cells.push({ glyph: '📖', nm: 'No words yet', dsc: 'Read some words to fill this page!', empty: true });
          LTR.audio.speak('No words on this page yet. Play some games to fill it up!');
        }
        seen.forEach(function (word) {
          var rec = LTR.data.wordByText(word);
          cells.push({
            glyph: rec && rec.emoji ? rec.emoji : '🔤',
            nm: word.toUpperCase(),
            dsc: mw.indexOf(word) !== -1 ? 'mastered ⭐' : 'learning',
            empty: false
          });
        });
      } else {
        var list = LTR.state.data.collection[id] || [];
        list.forEach(function (x) {
          cells.push({ glyph: x.glyph, nm: x.name, dsc: x.note || '', art: x.art, empty: false });
        });
        // A few empty slots hint that there is more out there.
        var pad = Math.max(0, (id === 'characters' ? 7 : 6) - list.length);
        for (var i = 0; i < pad; i++) cells.push({ glyph: '❓', nm: '???', dsc: '', empty: true });
      }

      cells.forEach(function (c) {
        var cell = el('div.book-cell' + (c.empty ? '.empty' : ''));
        if (c.art && !c.empty) {
          cell.appendChild(el('div', { html: LTR.art.byId(c.art, '', 'happy') }));
        } else {
          cell.appendChild(el('div.glyph', { text: c.glyph }));
        }
        cell.appendChild(el('div.nm', { text: c.nm }));
        if (c.dsc) cell.appendChild(el('div.dsc', { text: c.dsc }));
        if (!c.empty) {
          cell.style.cursor = 'pointer';
          cell.addEventListener('click', function () {
            LTR.audio.sfx('pop');
            LTR.audio.stop();
            LTR.ui.sparkleOn(cell, 10);
            if (id === 'letters') {
              // The cell shows "Aa": say the letter's name, then its sound and
              // the picture word, which is the whole point of the page.
              var ch = c.nm.charAt(0).toLowerCase();
              LTR.audio.letterName(ch);
              LTR.audio.letterSound(ch);
              var rec = LTR.data.letterByChar(ch);
              if (rec) LTR.audio.word(rec.word);
            } else if (id === 'words') {
              LTR.audio.word(c.nm.toLowerCase());
            } else {
              LTR.audio.speak(c.nm + '. ' + (c.dsc || ''));
            }
          });
        }
        grid.appendChild(cell);
      });

      scroll.appendChild(grid);

      /* a small summary line at the bottom of every page */
      scroll.appendChild(el('div', {
        text: '⭐ ' + LTR.state.data.wallet.stars + '  ·  💎 ' + LTR.state.data.wallet.gems +
              '  ·  ' + LTR.progression.rank().glyph + ' ' + LTR.progression.rank().name,
        style: {
          textAlign: 'center', fontWeight: '800', color: 'var(--ink-soft)',
          background: 'rgba(255,255,255,.7)', borderRadius: '999px',
          padding: '.35rem 1rem', margin: '.6rem auto 0', width: 'fit-content'
        }
      }));
    }

    TABS.forEach(function (t) {
      var b = el('button.book-tab', {
        dataset: { tab: t.id },
        'aria-label': TAB_VOICE[t.id],
        onClick: function () {
          LTR.audio.sfx('tap');
          LTR.audio.speak(TAB_VOICE[t.id], { interrupt: true });
          renderTab(t.id);
        }
      }, [
        el('span.tg', { text: t.glyph }),
        el('span.tl', { text: t.label })
      ]);
      tabs.appendChild(b);
    });

    body.appendChild(tabs);
    body.appendChild(scroll);
    screen.appendChild(body);
    renderTab(active);

    LTR.guide.narrate([
      'This is your adventure book.', { pause: 250 },
      'Everything you have found is in here.', { pause: 250 },
      'Tap a picture at the top to turn the page. Tap a thing to hear its name.'
    ], { idleAfter: 18000 });

    return screen;
  });

})(window.LTR);
