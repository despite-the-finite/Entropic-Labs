/* =============================================================================
   screens/creator.js — "Who are you going to be?"
   Six taps at most. Everything is a big coloured circle; nothing is typed
   (the name field is optional and meant for a grown-up).
   ============================================================================= */
(function (LTR) {
  'use strict';

  var U = LTR.util, el = U.el, art = LTR.art;

  var HAIR_ICON = { short: '🧒', long: '👧', curly: '🌀', buns: '🎀' };
  var HAT_ICON  = { none: '🚫', wizard: '🧙', cap: '🧢', flowers: '🌸', crown: '👑' };

  LTR.ui.screen('creator', function () {
    var cfgSource = LTR.state.data.player.avatar;
    var cfg = Object.assign({}, cfgSource);

    var screen = el('div.screen');
    screen.appendChild(LTR.ui.env('glade'));

    var body = el('div.screen-body');
    var wrap = el('div.cc-wrap');

    wrap.appendChild(el('div', {
      text: 'Who will you be?',
      style: {
        fontSize: 'var(--fs-big)', fontWeight: '900', color: '#fff',
        textShadow: '0 .16rem 0 #6b46d6, 0 .4rem 1rem rgba(0,0,0,.3)'
      }
    }));

    var preview = el('div.cc-avatar.breathe', { html: art.avatar(cfg) });
    var pipHint = el('div', {
      style: {
        background: 'rgba(255,253,246,.95)', borderRadius: '999px', padding: '.3rem 1rem',
        fontWeight: '800', fontSize: 'var(--fs-small)', boxShadow: 'var(--shadow-soft)'
      },
      text: 'Pip says: "Ooh, nice hat."'
    });

    var stage = el('div', { style: { display: 'flex', alignItems: 'flex-end', gap: '.5rem' } }, [
      preview,
      el('div', { style: { width: 'clamp(4rem,15vw,6.5rem)' }, class: 'hop', html: art.pip('', 'silly') })
    ]);
    wrap.appendChild(stage);
    wrap.appendChild(pipHint);

    function repaint() {
      preview.innerHTML = art.avatar(cfg);
      preview.classList.remove('nudge'); void preview.offsetWidth; preview.classList.add('nudge');
      LTR.audio.sfx('pop');
    }

    var rows = el('div.cc-rows');

    /** One row of round option buttons. */
    function row(label, options, isSelected, onPick) {
      var opts = el('div.cc-opts');
      options.forEach(function (o) {
        var b = el('button.cc-opt', {
          'aria-label': label + ' ' + (o.name || ''),
          style: o.style || null
        }, o.content ? el('span', { text: o.content }) : null);
        if (isSelected(o)) b.classList.add('sel');
        b.addEventListener('click', function () {
          onPick(o);
          U.qsa('.cc-opt', opts).forEach(function (x) { x.classList.remove('sel'); });
          b.classList.add('sel');
          repaint();
        });
        opts.appendChild(b);
      });
      rows.appendChild(el('div.cc-row', [el('div.lbl', { text: label }), opts]));
    }

    row('Skin', art.SKINS.map(function (c, i) {
      return { i: i, style: { background: c } };
    }), function (o) { return o.i === cfg.skin; }, function (o) { cfg.skin = o.i; });

    row('Hair', art.HAIRSTYLES.map(function (h) {
      return { h: h, content: HAIR_ICON[h] };
    }), function (o) { return o.h === cfg.hair; }, function (o) { cfg.hair = o.h; });

    row('Colour', art.HAIRCOLORS.map(function (c, i) {
      return { i: i, style: { background: c } };
    }), function (o) { return o.i === cfg.hairColor; }, function (o) { cfg.hairColor = o.i; });

    row('Clothes', art.OUTFITS.map(function (c, i) {
      return { i: i, style: { background: c } };
    }), function (o) { return o.i === cfg.outfit; }, function (o) { cfg.outfit = o.i; });

    row('Hat', art.HATS.map(function (h) {
      return { h: h, content: HAT_ICON[h] };
    }), function (o) { return o.h === cfg.hat; }, function (o) { cfg.hat = o.h; });

    row('Bag', [
      { v: true, content: '🎒' }, { v: false, content: '🚫' }
    ], function (o) { return o.v === !!cfg.backpack; }, function (o) { cfg.backpack = o.v; });

    wrap.appendChild(rows);

    /* Optional name — a grown-up types it once; the child never has to. */
    var nameInput = el('input', {
      type: 'text', maxlength: '14', value: LTR.state.data.player.name === 'Explorer' ? 'Indra' : LTR.state.data.player.name,
      'aria-label': 'Name',
      style: {
        font: 'inherit', fontWeight: '900', fontSize: 'var(--fs-mid)', textAlign: 'center',
        border: '0', borderRadius: '999px', padding: '.35rem .9rem', width: '9rem',
        boxShadow: 'var(--shadow-soft)', background: '#fff'
      }
    });
    rows.appendChild(el('div.cc-row', [
      el('div.lbl', { text: 'Name' }),
      el('div.cc-opts', nameInput)
    ]));

    wrap.appendChild(el('button.btn.btn-huge.btn-magic', {
      text: '✨  This is me!',
      style: { marginTop: '.4rem' },
      onClick: function () {
        var p = LTR.state.data.player;
        p.avatar = cfg;
        p.name = (nameInput.value || 'Indra').trim().slice(0, 14) || 'Indra';
        p.created = true;
        LTR.state.save();
        LTR.audio.sfx('fanfare');
        LTR.ui.confetti(50);
        LTR.ui.modal({
          title: 'Hello, ' + p.name + '!',
          artHTML: art.avatar(cfg),
          body: 'Pip is waiting at the edge of the Letter Forest.',
          actions: [{ label: 'Let\'s go!', value: 1, style: 'btn-leaf', big: true }]
        }).then(function () { LTR.ui.go('map'); });
      }
    }));

    body.appendChild(wrap);
    screen.appendChild(body);
    return screen;
  });

})(window.LTR);
