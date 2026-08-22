/* Entropic Labs — the tour.
 * ===========================================================================
 * Five chapters: the foyer, then the four rooms, each one a real screenshot of
 * the real page. Every chapter carries two shots — one taken at a desktop
 * viewport, one on a phone — and the visitor can switch between them at any
 * point without losing their place in the chapter.
 *
 * It behaves like a player and is built like a slideshow. The clock is the CSS
 * animation filling the active chapter's bar (tour.css, @keyframes tour-run):
 * pausing is one class on the root, resuming is removing it, and the chapter
 * advances off that animation's own animationend rather than a setTimeout that
 * would drift out of step with the bar the visitor is watching.
 *
 * Under prefers-reduced-motion the clock never runs. The chapters are still all
 * there — the tour just waits to be walked by hand.
 * ===========================================================================
 */
(function () {
  'use strict';

  /* Open the tour once, unprompted, the first time somebody arrives. It is the
     intro to the place; if they have seen it, or asked for less motion, or came
     in on a deep link that means they already know where they are going, the
     cue in the foyer is the only invitation they get. Set this to false to make
     the tour opt-in always. */
  var AUTO_OPEN_FIRST_VISIT = true;
  var SEEN_KEY = 'el.tour.seen';

  var CHAPTER_MS = 6000;                 /* five of these is exactly half a minute */

  var reduceMQ = window.matchMedia('(prefers-reduced-motion: reduce)');

  /* ------------------------------------------------------- the chapters --- */

  /* Everything a chapter says lives here. The numbers in the blurbs are the
     ones the pages themselves report — ten fields, 22 objects, 17 memories,
     29 places, three games — so this stays true if you only ever read it. */
  var CHAPTERS = [
    {
      key: 'foyer',
      index: '00',
      name: 'The Foyer',
      line: 'Curiosity has no filing system.',
      blurb: 'Not a homepage — a door. Four rooms hang in the dark around the ' +
             'wordmark, and none of them is the main one.',
      beats: ['Four rooms', 'No feed', 'One page, any screen'],
      href: 'index.html',
      cta: 'You are here',
      glow: '#F1EEFB',
      paths: { desktop: '/index.html', mobile: '/index.html' }
    },
    {
      key: 'observatory',
      index: '01',
      name: 'The Observatory',
      line: 'Questions are more interesting than answers.',
      blurb: 'A map of things worth wondering about: ten fields, from deep time to ' +
             'the unknown. Moon phase, the ISS, Voyager 1\'s distance — all of it ' +
             'computed in your own browser. No telescope.',
      beats: ['Ten fields', '22 objects', 'Live readout'],
      href: 'observatory.html',
      cta: 'Enter the Observatory',
      glow: '#2FE0C7',
      paths: { desktop: '/observatory.html', mobile: '/observatory.html' }
    },
    {
      key: 'studio',
      index: '02',
      name: 'The Studio',
      line: 'Where noise becomes something else.',
      blurb: 'The oldest part of the building: real amps, a pedalboard built over ' +
             'years, and a room tuned for patience and for accidents.',
      beats: ['Book a session', 'The gear', 'Projects & manifesto'],
      href: 'studio.html',
      cta: 'Enter the Studio',
      glow: '#FF3FA0',
      paths: { desktop: '/studio.html', mobile: '/m/' }
    },
    {
      key: 'games',
      index: '03',
      name: 'The Game Room',
      line: 'Experiments disguised as games.',
      blurb: 'Three browser projects — an RPG, a reading adventure for four- and ' +
             'five-year-olds, and a live trivia platform. Two of the three are ' +
             'playable right here.',
      beats: ['Donnell & McBurns', 'Wandering Words', 'Live Trivia'],
      href: 'games.html',
      cta: 'Enter the Game Room',
      glow: '#7C4DFF',
      paths: { desktop: '/games.html', mobile: '/m/games.html' }
    },
    {
      key: 'butterfly',
      index: '04',
      name: 'Butterfly Trails',
      line: 'Small moments. Long echoes.',
      blurb: 'Seventeen memories between 1973 and 2026, pinned across 29 places ' +
             'and drawn as trails you can follow. Every family is the result of ' +
             'thousands of improbable moments.',
      beats: ['17 memories', '29 places', 'Follow a butterfly'],
      href: 'butterfly.html',
      cta: 'Enter Butterfly Trails',
      glow: '#FFC46B',
      paths: { desktop: '/butterfly.html', mobile: '/butterfly.html' }
    }
  ];

  var DEVICES = {
    desktop: { label: 'Desktop', note: 'Desktop · 1440×900' },
    mobile:  { label: 'Phone',   note: 'iPhone · 390×664' }
  };

  function shotSrc(chapter, device) {
    return 'img/tour/' + chapter.key + '-' + device + '.webp';
  }

  /* ------------------------------------------------------------ the DOM --- */

  var root      = document.getElementById('tour');
  var cue       = document.getElementById('tour-open');
  if (!root || !cue) return;

  var barsEl    = document.getElementById('tour-bars');
  var stageEl   = document.getElementById('tour-stage');
  var copyEl    = document.getElementById('tour-copy');
  var liveEl    = document.getElementById('tour-live');
  var playBtn   = document.getElementById('tour-play');
  var prevBtn   = document.getElementById('tour-prev');
  var nextBtn   = document.getElementById('tour-next');
  var closeBtn  = document.getElementById('tour-close');
  var deviceEls = root.querySelectorAll('[data-device]');

  var current = 0;
  var device  = window.matchMedia('(max-width: 820px)').matches ? 'mobile' : 'desktop';
  var paused  = false;
  var open    = false;
  var ended   = false;
  var lastFocus = null;

  /* --------------------------------------------------------------- bars --- */

  var bars = [];
  (function buildBars() {
    for (var i = 0; i < CHAPTERS.length; i++) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'tour-bar';
      btn.setAttribute('aria-label', 'Chapter ' + (i + 1) + ' of ' + CHAPTERS.length +
                                     ': ' + CHAPTERS[i].name);
      var track = document.createElement('span');
      track.className = 'tour-bar-track';
      var fill = document.createElement('span');
      fill.className = 'tour-bar-fill';
      track.appendChild(fill);
      btn.appendChild(track);
      btn._fill = fill;
      (function (n) {
        btn.addEventListener('click', function () { go(n, true); });
      })(i);
      barsEl.appendChild(btn);
      bars.push(btn);
    }
  })();

  /* The chapter advances when its own bar finishes filling, so the picture and
     the scrubber can never disagree about where the tour is. */
  barsEl.addEventListener('animationend', function (e) {
    if (e.animationName !== 'tour-run') return;
    if (!open) return;
    if (current >= CHAPTERS.length - 1) { finish(); return; }
    go(current + 1, false);
  });

  function armBar() {
    for (var i = 0; i < bars.length; i++) {
      bars[i].classList.remove('is-live', 'is-done');
      bars[i]._fill.style.animationDuration = '';
      bars[i].removeAttribute('aria-current');
      if (i < current) bars[i].classList.add('is-done');
    }
    var live = bars[current];
    live.setAttribute('aria-current', 'true');
    if (reduceMQ.matches) { live.classList.add('is-done'); return; }
    live._fill.style.animationDuration = CHAPTER_MS + 'ms';
    void live._fill.offsetWidth;              /* restart the clock from zero */
    live.classList.add('is-live');
  }

  /* -------------------------------------------------------------- stage --- */

  /* Rebuilt rather than mutated: a fresh <img> is the simplest way to be sure
     the cross-fade and the drift both start from the top on every swap. */
  function renderStage() {
    var ch = CHAPTERS[current];
    var src = shotSrc(ch, device);
    var d = DEVICES[device];

    stageEl.innerHTML = '';

    var wrap = document.createElement('div');
    wrap.className = 'tour-frame';

    var dev = document.createElement('div');
    dev.className = 'tour-device tour-device--' + device;

    if (device === 'desktop') {
      var chrome = document.createElement('div');
      chrome.className = 'tour-chrome';
      chrome.innerHTML = '<span class="tour-dots" aria-hidden="true"><i></i><i></i><i></i></span>';
      var url = document.createElement('span');
      url.className = 'tour-url';
      url.textContent = ch.paths.desktop;
      chrome.appendChild(url);
      dev.appendChild(chrome);
    }

    var screen = document.createElement('div');
    screen.className = 'tour-screen is-fresh';
    var img = document.createElement('img');
    img.className = 'tour-shot';
    img.src = src;
    img.alt = ch.name + ' on ' + d.label.toLowerCase() + ' — a screenshot of the real page.';
    img.decoding = 'async';
    screen.appendChild(img);
    dev.appendChild(screen);
    wrap.appendChild(dev);

    var note = document.createElement('figcaption');
    note.className = 'tour-note';
    note.textContent = d.note + '  ·  ' + ch.paths[device];
    wrap.appendChild(note);

    stageEl.appendChild(wrap);
  }

  /* --------------------------------------------------------------- copy --- */

  function renderCopy() {
    var ch = CHAPTERS[current];
    copyEl.innerHTML = '';
    copyEl.classList.remove('is-fresh');
    void copyEl.offsetWidth;

    function el(tag, cls, text) {
      var n = document.createElement(tag);
      n.className = cls;
      if (text != null) n.textContent = text;
      return n;
    }

    copyEl.appendChild(el('p', 'tour-index', ch.index + ' / 0' + (CHAPTERS.length - 1)));
    var h = el('h2', 'tour-title', ch.name);
    h.id = 'tour-title';
    copyEl.appendChild(h);
    copyEl.appendChild(el('p', 'tour-line', ch.line));
    copyEl.appendChild(el('p', 'tour-blurb', ch.blurb));

    var ul = el('ul', 'tour-beats');
    for (var i = 0; i < ch.beats.length; i++) ul.appendChild(el('li', '', ch.beats[i]));
    copyEl.appendChild(ul);

    /* The foyer is where the visitor already is; sending them "back" to it
       would be a link to nowhere, so that chapter states the fact instead. */
    if (ch.key === 'foyer') {
      copyEl.appendChild(el('p', 'tour-here', ch.cta + '.'));
    } else {
      var a = el('a', 'tour-enter', ch.cta);
      a.href = ch.href;
      a.appendChild(document.createTextNode(' →'));
      copyEl.appendChild(a);
    }

    copyEl.classList.add('is-fresh');
  }

  /* ------------------------------------------------------------ chapters --- */

  function go(i, byHand) {
    current = Math.max(0, Math.min(CHAPTERS.length - 1, i));
    ended = false;
    var ch = CHAPTERS[current];

    root.style.setProperty('--glow', ch.glow);
    root.style.setProperty('--glow-soft', softGlow(ch.glow));

    renderStage();
    renderCopy();
    armBar();
    syncTransport();
    preload(current + 1);

    if (liveEl) {
      liveEl.textContent = 'Chapter ' + (current + 1) + ' of ' + CHAPTERS.length +
                           ': ' + ch.name + '. ' + ch.line;
    }
    /* Jumping by hand is a decision to watch, so it un-pauses. */
    if (byHand && paused && !reduceMQ.matches) setPaused(false);
  }

  function softGlow(hex) {
    var n = parseInt(hex.slice(1), 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',0.16)';
  }

  function finish() {
    ended = true;
    setPaused(true);
    bars[current].classList.add('is-done');
    syncTransport();
    try { localStorage.setItem(SEEN_KEY, '1'); } catch (e) {}
  }

  var preloaded = {};
  function preload(i) {
    if (i < 0 || i >= CHAPTERS.length) return;
    ['desktop', 'mobile'].forEach(function (d) {
      var src = shotSrc(CHAPTERS[i], d);
      if (preloaded[src]) return;
      preloaded[src] = true;
      var im = new Image();
      im.src = src;
    });
  }

  /* ------------------------------------------------------------ controls --- */

  function setPaused(next) {
    paused = next;
    root.classList.toggle('is-paused', paused);
    syncTransport();
  }

  function syncTransport() {
    if (!playBtn) return;
    if (ended) {
      playBtn.textContent = '↺';
      playBtn.setAttribute('aria-label', 'Watch again');
    } else if (paused) {
      playBtn.textContent = '▶';
      playBtn.setAttribute('aria-label', 'Play');
    } else {
      playBtn.textContent = '‖';
      playBtn.setAttribute('aria-label', 'Pause');
    }
    prevBtn.disabled = current === 0;
    nextBtn.disabled = current === CHAPTERS.length - 1;
  }

  function syncDeviceButtons() {
    for (var i = 0; i < deviceEls.length; i++) {
      deviceEls[i].setAttribute('aria-pressed',
        deviceEls[i].getAttribute('data-device') === device ? 'true' : 'false');
    }
  }

  function setDevice(next) {
    if (next === device) return;
    device = next;
    syncDeviceButtons();
    renderStage();                    /* the chapter clock keeps running */
  }

  playBtn.addEventListener('click', function () {
    if (ended) { go(0, true); setPaused(false); return; }
    setPaused(!paused);
  });
  prevBtn.addEventListener('click', function () { go(current - 1, true); });
  nextBtn.addEventListener('click', function () { go(current + 1, true); });
  closeBtn.addEventListener('click', function () { closeTour(); });

  for (var d = 0; d < deviceEls.length; d++) {
    (function (btn) {
      btn.addEventListener('click', function () { setDevice(btn.getAttribute('data-device')); });
    })(deviceEls[d]);
  }

  var scrim = root.querySelector('.tour-scrim');
  if (scrim) scrim.addEventListener('click', function () { closeTour(); });

  /* ------------------------------------------------------------ keyboard --- */

  function focusables() {
    return root.querySelectorAll(
      'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
    );
  }

  document.addEventListener('keydown', function (e) {
    if (!open) return;
    if (e.key === 'Escape') { e.preventDefault(); closeTour(); return; }
    if (e.key === 'ArrowRight') { e.preventDefault(); go(current + 1, true); return; }
    if (e.key === 'ArrowLeft')  { e.preventDefault(); go(current - 1, true); return; }
    if (e.key === ' ' || e.key === 'Spacebar') {
      var t = e.target;
      if (t && (t.tagName === 'BUTTON' || t.tagName === 'A')) return;   /* let it click */
      e.preventDefault();
      playBtn.click();
      return;
    }
    if (e.key === 'Tab') {
      var f = focusables();
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  /* ------------------------------------------------------- open and shut --- */

  function openTour() {
    if (open) return;
    open = true;
    ended = false;
    lastFocus = document.activeElement;
    root.hidden = false;
    document.documentElement.classList.add('tour-is-open');
    /* The field behind is a full-time canvas animation. Nothing can see it
       through the scrim, so tell foyer.js to stop drawing it. */
    window.dispatchEvent(new CustomEvent('tour:open'));
    setPaused(reduceMQ.matches);
    go(0, false);
    preload(0);
    closeBtn.focus();
    try { localStorage.setItem(SEEN_KEY, '1'); } catch (e) {}
  }

  function closeTour() {
    if (!open) return;
    open = false;
    root.hidden = true;
    document.documentElement.classList.remove('tour-is-open');
    window.dispatchEvent(new CustomEvent('tour:close'));
    for (var i = 0; i < bars.length; i++) bars[i].classList.remove('is-live');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  cue.addEventListener('click', openTour);

  /* --------------------------------------------------------------- boot --- */

  document.documentElement.classList.add('has-tour');
  syncDeviceButtons();
  cue.querySelector('.tour-open-len').textContent =
    Math.round(CHAPTER_MS * CHAPTERS.length / 1000) + 's';

  if (AUTO_OPEN_FIRST_VISIT && !reduceMQ.matches && !location.hash) {
    var seen = true;
    try { seen = localStorage.getItem(SEEN_KEY) === '1'; }
    catch (e) { seen = true; }        /* no storage, no unasked-for pop-up */
    if (!seen) setTimeout(function () { if (!open) openTour(); }, 1800);
  }
})();
