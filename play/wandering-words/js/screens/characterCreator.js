/* =============================================================================
   screens/creator.js — "Who are you going to be?"

   Nothing on this screen is a word she has to read. Each row is labelled with
   a picture, the row says its own name out loud when she touches it, and the
   only text field (the name) is clearly the grown-up's job and can be skipped
   entirely — tapping the big purple button with no help at all works fine.
   ============================================================================= */
(function (LTR) {
  'use strict';

  var U = LTR.util, el = U.el, art = LTR.art;

  var HAIR_ICON = { short: '🧒', long: '👧', curly: '🌀', buns: '🎀' };
  var HAT_ICON  = { none: '🚫', wizard: '🧙', cap: '🧢', flowers: '🌸', crown: '👑' };

  /* Row pictures stand in for the words "Skin", "Hair", "Clothes"… */
  var ROW_ICON = {
    skin: '🤚', hair: '💇', colour: '🎨', clothes: '👕', hat: '🎩', bag: '🎒', name: '✏️'
  };

  var PIP_LINES = [
    'Ooh, nice hat.', 'That colour is my favourite.', 'You look ready for a forest.',
    'Very brave hair.', 'I would wear that.', 'Excellent. Extremely excellent.'
  ];

  LTR.ui.screen('creator', function () {
    var cfgSource = LTR.state.data.player.avatar;
    var cfg = Object.assign({}, cfgSource);

    var screen = el('div.screen');
    screen.appendChild(LTR.ui.env('glade'));

    var body = el('div.screen-body');
    var wrap = el('div.cc-wrap');

    wrap.appendChild(el('div.cc-title', { text: 'Who will you be?' }));

    var preview = el('div.cc-avatar.breathe', { html: art.avatar(cfg) });
    var pipHint = el('div.cc-pip-hint', { text: 'Pip says: "Ooh, nice hat."' });

    var stage = el('div', { style: { display: 'flex', alignItems: 'flex-end', gap: '.5rem' } }, [
      preview,
      el('div', { style: { width: 'clamp(4rem,15vw,6.5rem)' }, class: 'hop', html: art.pip('', 'silly') })
    ]);
    wrap.appendChild(stage);
    wrap.appendChild(pipHint);

    function repaint(spoken) {
      preview.innerHTML = art.avatar(cfg);
      preview.classList.remove('nudge'); void preview.offsetWidth; preview.classList.add('nudge');
      LTR.audio.sfx('pop');
      if (spoken) {
        LTR.audio.stop();
        LTR.audio.speak(spoken, { rate: .85 });
      }
      // Pip reacts, so every tap produces a friendly consequence.
      if (Math.random() < 0.34) {
        var line = U.pick(PIP_LINES);
        pipHint.textContent = 'Pip says: "' + line + '"';
      }
    }

    var rows = el('div.cc-rows');

    /**
     * One row of round option buttons.
     *   iconKey — the picture that stands in for the row's name
     *   sayRow  — what the row is called, said aloud on first touch
     *   sayOpt  — what an option is called, said aloud when chosen
     */
    function row(iconKey, sayRow, options, isSelected, onPick, sayOpt) {
      var opts = el('div.cc-opts');
      options.forEach(function (o, i) {
        var b = el('button.cc-opt', {
          'aria-label': sayRow + ' ' + (o.name || (i + 1)),
          style: o.style || null
        }, o.content ? el('span', { text: o.content }) : null);
        if (isSelected(o)) b.classList.add('sel');
        b.addEventListener('click', function () {
          onPick(o);
          U.qsa('.cc-opt', opts).forEach(function (x) { x.classList.remove('sel'); });
          b.classList.add('sel');
          repaint(sayOpt ? sayOpt(o, i) : sayRow);
        });
        opts.appendChild(b);
      });
      var lbl = el('button.lbl', {
        text: ROW_ICON[iconKey], 'aria-label': sayRow,
        onClick: function () { LTR.audio.speak(sayRow, { interrupt: true }); }
      });
      rows.appendChild(el('div.cc-row', [lbl, opts]));
    }

    var COLOUR_NAMES = ['black', 'brown', 'ginger', 'golden', 'pink', 'purple'];
    var OUTFIT_NAMES = ['blue', 'green', 'pink', 'yellow', 'purple', 'orange'];
    var HAIR_NAMES   = { short: 'short hair', long: 'long hair', curly: 'curly hair', buns: 'hair buns' };
    var HAT_NAMES    = { none: 'no hat', wizard: 'a wizard hat', cap: 'a cap', flowers: 'flowers', crown: 'a crown' };

    row('skin', 'Skin', art.SKINS.map(function (c, i) {
      return { i: i, style: { background: c } };
    }), function (o) { return o.i === cfg.skin; }, function (o) { cfg.skin = o.i; },
      function () { return 'Skin'; });

    row('hair', 'Hair', art.HAIRSTYLES.map(function (h) {
      return { h: h, content: HAIR_ICON[h], name: HAIR_NAMES[h] };
    }), function (o) { return o.h === cfg.hair; }, function (o) { cfg.hair = o.h; },
      function (o) { return HAIR_NAMES[o.h]; });

    row('colour', 'Hair colour', art.HAIRCOLORS.map(function (c, i) {
      return { i: i, style: { background: c }, name: COLOUR_NAMES[i] };
    }), function (o) { return o.i === cfg.hairColor; }, function (o) { cfg.hairColor = o.i; },
      function (o) { return COLOUR_NAMES[o.i] + ' hair'; });

    row('clothes', 'Clothes', art.OUTFITS.map(function (c, i) {
      return { i: i, style: { background: c }, name: OUTFIT_NAMES[i] };
    }), function (o) { return o.i === cfg.outfit; }, function (o) { cfg.outfit = o.i; },
      function (o) { return OUTFIT_NAMES[o.i] + ' clothes'; });

    row('hat', 'Hat', art.HATS.map(function (h) {
      return { h: h, content: HAT_ICON[h], name: HAT_NAMES[h] };
    }), function (o) { return o.h === cfg.hat; }, function (o) { cfg.hat = o.h; },
      function (o) { return HAT_NAMES[o.h]; });

    row('bag', 'Backpack', [
      { v: true, content: '🎒', name: 'a backpack' }, { v: false, content: '🚫', name: 'no backpack' }
    ], function (o) { return o.v === !!cfg.backpack; }, function (o) { cfg.backpack = o.v; },
      function (o) { return o.v ? 'a backpack' : 'no backpack'; });

    wrap.appendChild(rows);

    /* Optional name — a grown-up types it once; the child never has to. */
    var nameInput = el('input.cc-name', {
      type: 'text', maxlength: '14',
      value: LTR.state.data.player.name === 'Explorer' ? 'Indra' : LTR.state.data.player.name,
      'aria-label': 'Name (for a grown-up)'
    });
    rows.appendChild(el('div.cc-row', [
      el('div.lbl', { text: ROW_ICON.name, title: 'Name — for a grown-up' }),
      el('div.cc-opts', nameInput)
    ]));

    var doneBtn = LTR.ui.bigButton({
      glyph: '✨',
      label: 'This is me!',
      voice: 'This is me',
      style: 'btn-magic',
      className: 'tap-me',
      sfx: 'fanfare',
      onTap: function () {
        var p = LTR.state.data.player;
        p.avatar = cfg;
        p.name = (nameInput.value || 'Indra').trim().slice(0, 14) || 'Indra';
        p.created = true;
        LTR.state.save();
        LTR.ui.confetti(50);
        LTR.ui.modal({
          title: 'Hello, ' + p.name + '!',
          artHTML: art.avatar(cfg),
          body: 'Pip is waiting at the edge of the Letter Forest.',
          voice: ['Hello, ' + p.name + '!', { pause: 250 },
                  'Pip is waiting at the edge of the Letter Forest.', { pause: 250 },
                  'Tap the green button. Let us go!'],
          actions: [{ label: 'Let\'s go!', glyph: '🌳', value: 1, style: 'btn-leaf', big: true }]
        }).then(function () { LTR.ui.go('map'); });
      }
    });
    doneBtn.style.marginTop = '.4rem';
    wrap.appendChild(doneBtn);

    body.appendChild(wrap);
    screen.appendChild(body);

    LTR.guide.narrate([
      'Who will you be?', { pause: 250 },
      'Tap the round buttons to change how you look.', { pause: 300 },
      'When you like it, tap the big purple star button.'
    ], { target: doneBtn, idleAfter: 16000 });

    return screen;
  });

})(window.LTR);
