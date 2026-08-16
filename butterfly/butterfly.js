/* Entropic Labs — Butterfly Trails controller.
   ==========================================================================
   Owns the archive, the state machine, the URL and every panel. The renderer
   draws and reports; this decides what any of it means.

   Views
     trail          the reading order, along one meandering path
     constellation  the whole archive at once, clustered and linked
     map            where it happened

   The URL is the state:
     butterfly.html                 the trail
     butterfly.html#whole-trail
     butterfly.html#map
     butterfly.html#the-letter      one memory
   so every memory is linkable and the back button does the obvious thing.
   Following a butterfly and jumping to an era are actions rather than
   destinations, so they deliberately leave no history behind.

   Everything a visitor reads comes from data/stories.js. This file supplies
   structure, never content — if the archive is empty, the room says so in
   the archive's own words rather than filling itself in.
   ========================================================================== */

(function (global) {
  'use strict';

  var DATA = global.BUTTERFLY_DATA;
  var ENGINE = global.BUTTERFLY_TRAILS;
  if (!DATA || !ENGINE) return;

  var doc = document;
  var body = doc.body;
  var ARCHIVE = DATA.archive;

  /* ------------------------------------------------------------ helpers */
  function $(sel) { return doc.querySelector(sel); }
  function el(tag, cls, text) {
    var n = doc.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null) n.textContent = text;
    return n;
  }
  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
  function pick(list) { return list[Math.floor(Math.random() * list.length)]; }
  function trunc(s, n) {
    s = String(s || '');
    return s.length > n ? s.slice(0, n - 1).replace(/[\s,;:.]+$/, '') + '…' : s;
  }
  function store(key, value) {
    try {
      if (value === undefined) return global.localStorage.getItem(key);
      global.localStorage.setItem(key, value);
    } catch (e) { /* private mode — the room simply forgets you */ }
    return null;
  }

  /* ========================================================== THE ARCHIVE
     One normalising pass. Everything downstream can then assume arrays are
     arrays and that a link points both ways, which is what makes adding a
     story a one-object job. */
  var categories = DATA.categories || [];
  var catById = {};
  categories.forEach(function (c) { catById[c.id] = c; });

  var placeById = {};
  (DATA.places || []).forEach(function (p) { placeById[p.id] = p; });

  function arr(v) { return Array.isArray(v) ? v.slice() : (v ? [v] : []); }

  var stories = (DATA.stories || []).map(function (s) {
    var coords = s.coordinates || null;
    if (!coords && s.place && placeById[s.place]) {
      coords = { lat: placeById[s.place].lat, lon: placeById[s.place].lon };
    }
    return {
      id: s.id,
      title: s.title || 'Untitled',
      hook: s.hook || '',
      year: typeof s.year === 'number' ? s.year : null,
      approximateDate: s.approximateDate || '',
      era: s.era || null,
      location: s.location || (s.place && placeById[s.place] ? placeById[s.place].name : ''),
      place: s.place || null,
      coordinates: coords,
      people: arr(s.people),
      category: s.category || null,
      tags: arr(s.tags),
      story: arr(s.story),
      images: arr(s.images),
      audio: s.audio || null,
      source: s.source || '',
      notes: arr(s.notes),
      relatedStories: arr(s.relatedStories),
      causedBy: arr(s.causedBy),
      consequences: arr(s.consequences),
      alternatePath: s.alternatePath || null,
      disputed: s.disputed || false,
      classified: s.classified || false,
      chaosEvent: !!s.chaosEvent,
      featured: !!s.featured,
      dateAdded: s.dateAdded || ''
    };
  });

  var byId = {};
  stories.forEach(function (s) { byId[s.id] = s; });

  /* Causality is stated once, in whichever direction reads better, and
     completed here. A missing target is dropped rather than drawn. */
  function reciprocate(fromKey, toKey) {
    stories.forEach(function (s) {
      s[fromKey] = s[fromKey].filter(function (id) { return !!byId[id]; });
      s[fromKey].forEach(function (id) {
        var other = byId[id];
        if (other[toKey].indexOf(s.id) < 0) other[toKey].push(s.id);
      });
    });
  }
  reciprocate('consequences', 'causedBy');
  reciprocate('causedBy', 'consequences');
  stories.forEach(function (s) {
    s.relatedStories = s.relatedStories.filter(function (id) {
      return byId[id] && id !== s.id;
    });
  });

  /* Reading order: by year, then by when it was added, then by title. A
     story with no year yet sits at the end rather than at the beginning,
     because an undated memory is usually one still being pinned down. */
  var ordered = stories.slice().sort(function (a, b) {
    var ay = a.year === null ? Infinity : a.year;
    var by = b.year === null ? Infinity : b.year;
    if (ay !== by) return ay - by;
    if (a.dateAdded !== b.dateAdded) return a.dateAdded < b.dateAdded ? -1 : 1;
    return a.title < b.title ? -1 : 1;
  });
  var indexOf = {};
  ordered.forEach(function (s, i) { indexOf[s.id] = i; });

  /* Eras: the archive's own, if it has stated any; otherwise decades derived
     from the years present. Either way the labels come from the data. */
  var eras = (DATA.eras || []).slice();
  if (!eras.length) {
    var decades = {};
    ordered.forEach(function (s) {
      if (s.year === null) return;
      var d = Math.floor(s.year / 10) * 10;
      if (!decades[d]) decades[d] = { id: d + 's', label: d + 's', from: d, to: d + 9 };
    });
    eras = Object.keys(decades)
      .sort(function (a, b) { return a - b; })
      .map(function (k) { return decades[k]; });
  }
  var eraById = {};
  eras.forEach(function (e) { eraById[e.id] = e; });

  function eraOf(s) {
    if (s.era && eraById[s.era]) return eraById[s.era];
    if (s.year === null) return null;
    for (var i = 0; i < eras.length; i++) {
      var e = eras[i];
      if (e.from !== undefined && e.to !== undefined && s.year >= e.from && s.year <= e.to) return e;
    }
    return null;
  }

  function toneOf(s) {
    var c = s.category && catById[s.category];
    return c ? c.tone : '#FFC46B';
  }
  function whenOf(s) {
    if (s.approximateDate) return s.approximateDate;
    if (s.year !== null) return String(s.year);
    var e = eraOf(s);
    return e ? e.label : '';
  }
  /* The line a node shows before it is opened: era or decade, then place. */
  function standfirst(s) {
    var e = eraOf(s);
    var left = e ? e.label : (s.year !== null ? String(s.year) : '');
    return [left, s.location].filter(Boolean).join(' · ');
  }

  var warnings = DATA.check ? DATA.check() : [];
  if (warnings.length && global.console) {
    global.console.warn('Butterfly Trails — archive notes:\n  ' + warnings.join('\n  '));
  }

  /* ============================================================== THE ROOM */
  var canvas = $('#trails');
  var trails = ENGINE.create(canvas, {
    palette: {
      paper: '#F1EEFB', ash: '#9C93B8', ember: '#FFC46B',
      signal: '#FF3FA0', violet: '#7C4DFF', trace: '#2FE0C7'
    }
  });

  var gate = $('#gate');
  var gateLine = $('#gate-line');
  var gateEnter = $('#gate-enter');
  var gateSkip = $('#gate-skip');
  var plate = $('#plate');
  var plateHint = $('#plate-hint');
  var countsEl = $('#counts');
  var whisperEl = $('#whisper');
  var liveEl = $('#live');
  var beginningEl = $('#beginning');
  var dockEl = $('#dock');
  var dockCats = $('#dock-cats');
  var surpriseBtn = $('#surprise');
  var viewsEl = $('#views');
  var erasEl = $('#eras');
  var storyEl = $('#story');
  var lightboxEl = $('#lightbox');
  var keynavEl = $('#keynav');

  var view = { mode: 'trail', story: null };
  var lastFocus = null;

  /* ----------------------------------------------------------- the nodes */
  var GHOSTS = stories.length ? 2 : 6;

  function buildNodes() {
    var list = ordered.map(function (s) {
      return {
        id: s.id,
        kind: 'story',
        title: trunc(s.title, 26),
        hook: trunc(s.hook, 46),
        yearLabel: s.year !== null ? String(s.year) : (eraOf(s) ? eraOf(s).label : ''),
        year: s.year,
        era: eraOf(s) ? eraOf(s).id : null,
        tone: toneOf(s),
        lat: s.coordinates ? s.coordinates.lat : null,
        lon: s.coordinates ? s.coordinates.lon : null,
        chaos: s.chaosEvent,
        classified: !!s.classified,
        featured: s.featured,
        ref: { id: s.id }
      };
    });
    for (var i = 0; i < GHOSTS; i++) {
      list.push({ id: 'ghost-' + i, kind: 'ghost', ref: { id: 'ghost-' + i } });
    }
    return list;
  }

  function buildLinks() {
    var out = [], seen = {};
    ordered.forEach(function (s) {
      s.consequences.forEach(function (id) {
        var key = s.id + '>' + id;
        if (seen[key]) return;
        seen[key] = true;
        out.push({ from: s.id, to: id, kind: 'cause' });
      });
      s.relatedStories.forEach(function (id) {
        var key = [s.id, id].sort().join('~');
        if (seen[key]) return;
        seen[key] = true;
        out.push({ from: s.id, to: id, kind: 'related' });
      });
    });
    return out;
  }

  function buildMigrations() {
    return (DATA.migrations || []).map(function (m) {
      var a = placeById[m.from], b = placeById[m.to];
      if (!a || !b) return null;
      return { from: { lat: a.lat, lon: a.lon }, to: { lat: b.lat, lon: b.lon } };
    }).filter(Boolean);
  }

  trails.setNodes(buildNodes());
  trails.setLinks(buildLinks());
  trails.setMigrations(buildMigrations());

  /* =============================================================== VOICE */
  var whisperTimer = 0;
  var spokenTo = false;      /* has the room said anything on the visitor's account yet */
  function whisper(msg, hold) {
    if (!msg) return;
    spokenTo = true;
    whisperEl.textContent = msg;
    whisperEl.classList.add('on');
    liveEl.textContent = msg;
    global.clearTimeout(whisperTimer);
    whisperTimer = global.setTimeout(function () {
      whisperEl.classList.remove('on');
    }, hold || 4200);
  }

  /* A pair of lines, said one after the other. Used wherever the archive
     has something gentle to say about being empty. */
  function whisperPair(lines, gap) {
    if (!lines || !lines.length) return;
    whisper(lines[0], (gap || 2600) + 1800);
    if (lines[1]) {
      global.setTimeout(function () { whisper(lines[1], 4200); }, gap || 2600);
    }
  }

  /* =============================================================== COUNTS */
  function updateCounts() {
    countsEl.textContent = '';
    if (!stories.length) {
      countsEl.appendChild(el('span', null, 'Archive open · '));
      var z = el('b', null, '0');
      countsEl.appendChild(z);
      countsEl.appendChild(el('span', null, ' memories'));
      return;
    }
    var years = ordered.filter(function (s) { return s.year !== null; })
      .map(function (s) { return s.year; });
    var places = {};
    ordered.forEach(function (s) { if (s.location) places[s.location] = true; });
    var linkCount = ordered.reduce(function (n, s) { return n + s.consequences.length; }, 0);

    var n = el('b', null, String(stories.length));
    countsEl.appendChild(n);
    countsEl.appendChild(el('span', null, stories.length === 1 ? ' memory' : ' memories'));
    if (years.length) {
      countsEl.appendChild(el('span', null,
        ' · ' + Math.min.apply(null, years) + '–' + Math.max.apply(null, years)));
    }
    var placeN = Object.keys(places).length;
    if (placeN) countsEl.appendChild(el('span', null, ' · ' + placeN + (placeN === 1 ? ' place' : ' places')));
    if (linkCount) countsEl.appendChild(el('span', null, ' · ' + linkCount + ' traced forward'));
  }

  function updateHint() {
    var move = trails.isCoarse() ? 'Drag to explore' : 'Drag to explore · scroll to move';
    plateHint.textContent = stories.length
      ? move + ' · Follow a butterfly, or pick a light'
      : move + ' · Stories coming soon';
  }

  /* ========================================================= THE BEGINNING
     The empty state. It is a plate rather than a hole: the archive saying
     what it is doing, in its own words. */
  var beginningDismissed = false;
  function renderBeginning() {
    if (stories.length || beginningDismissed) { beginningEl.hidden = true; return; }
    if (beginningEl.childNodes.length) { beginningEl.hidden = view.mode !== 'trail'; return; }

    var close = el('button', 'dismiss', '×');
    close.type = 'button';
    close.setAttribute('aria-label', 'Hide this note');
    close.addEventListener('click', function () {
      beginningDismissed = true;
      beginningEl.hidden = true;
      applyInset();
    });
    beginningEl.appendChild(close);

    beginningEl.appendChild(el('h2', null, ARCHIVE.empty.heading));
    ARCHIVE.empty.body.forEach(function (p) { beginningEl.appendChild(el('p', null, p)); });
    beginningEl.appendChild(el('p', 'soon', ARCHIVE.empty.note));
    beginningEl.hidden = view.mode !== 'trail';
  }

  /* ========================================================== BUTTERFLIES */
  var ambient = [];
  var escort = null;          /* the one currently carrying the visitor */

  /* Somewhere off the edge of the screen, in world coordinates — where a
     butterfly that has just arrived should come from. */
  function offstage() {
    var vp = trails.viewport();
    var side = Math.random();
    var px = side < 0.5 ? -60 : vp.w + 60;
    var py = vp.h * (0.25 + Math.random() * 0.5);
    return trails.worldPoint(px, py);
  }

  function spawnFly(opts) {
    opts = opts || {};
    var at = opts.at || offstage();
    return trails.spawn({
      x: at.x, y: at.y,
      tone: opts.tone || '#FFC46B',
      size: opts.size || 1,
      speed: opts.speed || 0.0017,
      arriveAt: 0.12,
      trailCap: opts.trailCap || 90,
      state: opts.state || 'idle',
      label: opts.label || ''
    });
  }

  function releaseEscort(ms) {
    if (!escort) return;
    trails.stopFollowing();
    trails.release(escort, ms || 1100);
    escort = null;
  }

  /* Two idle butterflies live in the room. They have nowhere to be. */
  function startAmbient() {
    if (trails.isReduced()) return;
    var want = trails.quality() > 0.7 ? 2 : 1;
    while (ambient.length < want) {
      var f = spawnFly({ tone: '#FFC46B', size: 0.85, speed: 0.0011, trailCap: 60 });
      f.alpha = 0.75;
      ambient.push(f);
      wander(f);
    }
  }

  function wander(f) {
    if (!f) return;
    var b = trails.bounds();
    f.aim({
      x: b.minX + Math.random() * Math.max(0.8, b.maxX - b.minX),
      y: b.minY + Math.random() * Math.max(0.6, b.maxY - b.minY)
    });
    f.onArrive = function (self) {
      global.setTimeout(function () { wander(self); }, 1200 + Math.random() * 3000);
    };
  }

  /* -------------------------------------------------------- easter eggs */
  /* One in a while a butterfly stops flying over the archive and lands on
     the interface instead. It sits on a chip or a title for a few seconds,
     then goes back to work. */
  function perchSomewhere() {
    if (trails.isReduced() || !ambient.length) return;
    if (view.mode !== 'trail' || !storyEl.hidden) return;
    var targets = [].slice.call(doc.querySelectorAll(
      '.cat-chip, #surprise, .plate h1, .views button, .era-btn'
    )).filter(function (n) {
      var r = n.getBoundingClientRect();
      return r.width > 8 && r.height > 8 && r.top > 0 && r.bottom < global.innerHeight;
    });
    if (!targets.length) return;
    var r = pick(targets).getBoundingClientRect();
    var f = ambient[0];
    trails.perchAt(f, { x: r.left + r.width * (0.25 + Math.random() * 0.5), y: r.top - 5 }, 3600 + Math.random() * 3200);
    global.setTimeout(function () {
      trails.toWorld(f, { speed: 0.0011 });
      wander(f);
    }, 9000);
  }

  /* A butterfly that sets off the wrong way says nothing most of the time.
     Occasionally the archive notices. */
  trails.on('correct', function () {
    if (Math.random() < 0.34) whisper('It went the wrong way. It happens.', 3000);
  });

  /* Tapping one gets a reaction, and the reactions escalate quietly. */
  var TAP_LINES = [
    null, null,
    'It loops once and carries on.',
    'It is not interested in being caught.',
    'Fine. One more, then.'
  ];
  trails.on('flytap', function (f) {
    var line = TAP_LINES[Math.min(f.taps, TAP_LINES.length) - 1];
    if (line) whisper(line, 2600);
    if (f.taps === 5) {
      var mate = spawnFly({
        at: { x: f.x, y: f.y }, tone: f.tone, size: 0.7, speed: 0.0013, trailCap: 50
      });
      ambient.push(mate);
      wander(mate);
    }
  });

  /* Once in a long while, a butterfly that does not belong to any category
     drifts through the room and leaves. It is never explained. */
  function maybeRareVisitor() {
    if (trails.isReduced() || Math.random() > 0.025) return;
    global.setTimeout(function () {
      var f = spawnFly({ tone: '#F1EEFB', size: 0.75, speed: 0.0013, trailCap: 120 });
      f.alpha = 0.55;
      var b = trails.bounds();
      f.aim({ x: b.maxX + 2.4, y: b.minY - 0.6 });
      f.onArrive = function () { trails.release(f, 1400); };
      global.setTimeout(function () { trails.release(f, 2200); }, 26000);
    }, 12000 + Math.random() * 30000);
  }

  /* ========================================================== FOLLOW / LUCK */
  function storiesIn(catId) {
    return ordered.filter(function (s) { return s.category === catId; });
  }

  function markChips(activeId) {
    [].slice.call(dockCats.children).forEach(function (chip) {
      chip.setAttribute('aria-pressed', chip.getAttribute('data-cat') === activeId ? 'true' : 'false');
    });
  }

  function follow(catId) {
    var cat = catById[catId];
    if (!cat) return;
    markChips(catId);
    releaseEscort(600);

    var pool = storiesIn(catId);
    var f = spawnFly({ tone: cat.tone, size: 1.05, trailCap: 130 });
    escort = f;

    if (!pool.length) {
      /* Nothing to fly to. The butterfly looks anyway — that is the whole
         point of it — and then lets itself out. */
      f.state = 'searching';
      var b = trails.bounds();
      var mid = { x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 };
      f.aim(mid);
      f.onArrive = function () {
        f.aim({ x: mid.x + (Math.random() - 0.5) * 1.6, y: mid.y + (Math.random() - 0.5) * 1.2 });
      };
      whisperPair(ARCHIVE.noStory, 2800);
      global.setTimeout(function () {
        markChips(null);
        releaseEscort(1400);
      }, 6400);
      return;
    }

    var featured = pool.filter(function (s) { return s.featured; });
    var target = pick(featured.length ? featured : pool);
    whisper('Following ' + cat.name.toLowerCase() + '…', 3000);
    f.state = 'seeking';
    trails.flyTo(f, target.id, {
      onArrive: function () {
        go('#' + target.id);
        markChips(null);
        releaseEscort(1600);
      }
    });
  }

  function surprise() {
    releaseEscort(600);
    markChips(null);

    if (!stories.length) {
      /* Several of them search, briefly and without success. */
      var flock = [];
      var n = trails.isReduced() ? 1 : (trails.quality() > 0.7 ? 4 : 2);
      var b = trails.bounds();
      for (var i = 0; i < n; i++) {
        var f = spawnFly({
          tone: pick(categories).tone, size: 0.9, speed: 0.0019, trailCap: 70, state: 'searching'
        });
        (function (fly) {
          function look() {
            fly.aim({
              x: b.minX + Math.random() * Math.max(1.2, b.maxX - b.minX),
              y: b.minY + Math.random() * Math.max(0.9, b.maxY - b.minY)
            });
            fly.onArrive = look;
          }
          look();
        })(f);
        flock.push(f);
      }
      whisper(ARCHIVE.searching, 4200);
      global.setTimeout(function () {
        flock.forEach(function (f) { trails.release(f, 1500); });
      }, 4200);
      return;
    }

    var pool = ordered.filter(function (s) { return s.id !== view.story; });
    if (!pool.length) pool = ordered;
    var target = pick(pool);
    var g = spawnFly({ tone: toneOf(target), size: 1.05, trailCap: 130, state: 'seeking' });
    escort = g;
    whisper('Somewhere in ' + (whenOf(target) || 'the archive') + '…', 2800);
    trails.flyTo(g, target.id, {
      onArrive: function () { go('#' + target.id); releaseEscort(1600); }
    });
  }

  /* ============================================================= THE DOCK */
  function renderDock() {
    dockCats.textContent = '';
    categories.forEach(function (cat) {
      var n = storiesIn(cat.id).length;
      var b = el('button', 'cat-chip');
      b.type = 'button';
      b.setAttribute('data-cat', cat.id);
      b.setAttribute('aria-pressed', 'false');
      b.style.setProperty('--tone', cat.tone);
      if (!n) b.setAttribute('data-empty', '1');
      b.title = cat.line;

      var wing = el('span', 'wing');
      wing.setAttribute('aria-hidden', 'true');
      b.appendChild(wing);
      b.appendChild(el('span', 'name', cat.name));
      b.appendChild(el('span', 'count', n ? String(n) : '—'));
      b.setAttribute('aria-label',
        'Follow ' + cat.name + ' — ' + (n ? n + (n === 1 ? ' memory' : ' memories') : 'no memories yet'));
      b.addEventListener('click', function () { follow(cat.id); });
      dockCats.appendChild(b);
    });
  }

  /* ============================================================== THE ERAS */
  function renderEras() {
    erasEl.textContent = '';
    var usable = eras.filter(function (e) {
      return ordered.some(function (s) { return eraOf(s) === e; });
    });
    if (!usable.length) {
      erasEl.hidden = true;
      body.removeAttribute('data-eras');
      return;
    }
    erasEl.hidden = false;
    body.setAttribute('data-eras', '1');
    usable.forEach(function (e) {
      var b = el('button', 'era-btn', e.label);
      b.type = 'button';
      b.setAttribute('aria-pressed', 'false');
      if (e.line) b.title = e.line;
      b.addEventListener('click', function () {
        [].slice.call(erasEl.children).forEach(function (x) { x.setAttribute('aria-pressed', 'false'); });
        b.setAttribute('aria-pressed', 'true');
        panToEra(e);
      });
      erasEl.appendChild(b);
    });
  }

  function panToEra(e) {
    var inEra = ordered.filter(function (s) { return eraOf(s) === e; });
    if (!inEra.length) return;
    var sx = 0, sy = 0, n = 0;
    inEra.forEach(function (s) {
      var node = trails.nodeFor(s.id);
      if (!node) return;
      sx += node.pos.x; sy += node.pos.y; n++;
    });
    if (!n) return;
    trails.panTo(sx / n, sy / n, view.mode === 'trail' ? 1.15 : undefined, 1100);
    whisper(e.label + (e.line ? ' — ' + e.line : ''), 3400);
  }

  /* ============================================================= THE VIEWS */
  function renderViews() {
    [].slice.call(viewsEl.querySelectorAll('button')).forEach(function (b) {
      b.addEventListener('click', function () {
        var next = b.getAttribute('data-view');
        go(next === 'trail' ? '#' : '#' + (next === 'constellation' ? 'whole-trail' : 'map'));
      });
    });
  }

  function markViews() {
    [].slice.call(viewsEl.querySelectorAll('button')).forEach(function (b) {
      b.setAttribute('aria-pressed', b.getAttribute('data-view') === view.mode ? 'true' : 'false');
    });
  }

  /* ============================================================ THE MEMORY */
  function section(title) {
    var s = el('section', 'st-section');
    s.appendChild(el('h3', null, title));
    return s;
  }
  function metaRow(dl, key, value) {
    if (!value) return;
    var row = el('div', 'row');
    row.appendChild(el('dt', null, key));
    row.appendChild(el('dd', null, value));
    dl.appendChild(row);
  }

  function flagBox(kind, glyph, label, line) {
    var box = el('div', 'flag');
    box.setAttribute('data-kind', kind);
    var g = el('span', 'glyph', glyph);
    g.setAttribute('aria-hidden', 'true');
    box.appendChild(g);
    var text = el('div');
    text.appendChild(el('span', 'flag-label', label));
    text.appendChild(doc.createTextNode(line));
    box.appendChild(text);
    return box;
  }

  /* ---- photographs ---- */
  function renderPhotos(s, into) {
    if (!s.images.length) return;
    var sec = section(s.images.length === 1 ? 'Photograph' : 'Photographs');
    var wrap = el('div', 'photos');
    s.images.forEach(function (img, i) {
      if (!img || !img.src) return;
      var fig = el('figure', 'photo');
      /* A found photograph is never square to the page. The tilt is the
         mount's, not the picture's — the image itself is untouched. */
      fig.style.setProperty('--tilt', ((i % 2 ? 1 : -1) * (0.5 + (i % 3) * 0.35)).toFixed(2) + 'deg');

      var btn = el('button', 'photo-btn');
      btn.type = 'button';
      var image = el('img');
      image.src = img.src;
      image.alt = img.alt || '';
      image.loading = 'lazy';
      image.decoding = 'async';
      btn.appendChild(image);
      btn.addEventListener('click', function () { openLightbox(img); });
      btn.setAttribute('aria-label', 'Look closer' + (img.caption ? ': ' + img.caption : ''));
      fig.appendChild(btn);

      if (img.caption || img.year || img.location) {
        var cap = el('figcaption');
        if (img.caption) cap.appendChild(doc.createTextNode(img.caption));
        var stampBits = [img.year, img.location].filter(Boolean).join(' · ');
        if (stampBits) cap.appendChild(el('span', 'stamp', stampBits));
        fig.appendChild(cap);
      }
      wrap.appendChild(fig);
    });
    sec.appendChild(wrap);
    into.appendChild(sec);
  }

  function openLightbox(img) {
    lightboxEl.textContent = '';
    var close = el('button', 'close', 'Close');
    close.type = 'button';
    close.addEventListener('click', closeLightbox);
    lightboxEl.appendChild(close);

    var fig = el('figure');
    fig.style.margin = '0';
    var full = el('img');
    full.src = img.src;
    full.alt = img.alt || '';
    fig.appendChild(full);
    var bits = [img.caption, img.year, img.location].filter(Boolean).join(' · ');
    if (bits) fig.appendChild(el('figcaption', null, bits));
    lightboxEl.appendChild(fig);

    lightboxEl.hidden = false;
    close.focus();
  }
  function closeLightbox() {
    lightboxEl.hidden = true;
    lightboxEl.textContent = '';
  }
  lightboxEl.addEventListener('click', function (e) {
    if (e.target === lightboxEl) closeLightbox();
  });

  /* ---- the voice ---- */
  function renderAudio(s, into) {
    if (!s.audio || !s.audio.src) return;
    var sec = section('In their own voice');
    var box = el('div', 'audio');

    var lead = el('button', 'audio-lead');
    lead.type = 'button';
    var mic = el('span', 'mic', '🎙');
    mic.setAttribute('aria-hidden', 'true');
    lead.appendChild(mic);
    lead.appendChild(doc.createTextNode('Hear them tell it'));
    box.appendChild(lead);

    if (s.audio.label) box.appendChild(el('p', 'audio-note', s.audio.label));

    /* The recording is only fetched once somebody asks for it — an archive
       should not spend a phone's data on a voice nobody has opened yet. */
    lead.addEventListener('click', function () {
      if (box.querySelector('audio')) return;
      var a = doc.createElement('audio');
      a.controls = true;
      a.preload = 'none';
      a.src = s.audio.src;
      box.insertBefore(a, lead.nextSibling);
      lead.disabled = true;
      lead.style.opacity = '0.6';
      a.play().catch(function () { /* the visitor can press play themselves */ });
    });

    if (s.audio.transcript && s.audio.transcript.length) {
      var det = el('details');
      det.appendChild(el('summary', null, 'Read the transcript'));
      var tr = el('div', 'transcript');
      s.audio.transcript.forEach(function (p) { tr.appendChild(el('p', null, p)); });
      det.appendChild(tr);
      box.appendChild(det);
    }

    sec.appendChild(box);
    into.appendChild(sec);
  }

  /* ---- because of this ---- */
  var walkTimer = 0;
  function renderBecause(s, into) {
    if (!s.consequences.length) return;
    var sec = section('The trail forward');
    var box = el('div', 'because');
    box.appendChild(el('span', 'lead', ARCHIVE.because));

    var chain = chainFrom(s.id);
    var ul = el('ul', 'chain');
    chain.slice(1).forEach(function (id) {
      var other = byId[id];
      var li = el('li');
      li.setAttribute('data-id', id);
      var b = el('button');
      b.type = 'button';
      b.appendChild(doc.createTextNode(other.title));
      var when = whenOf(other);
      if (when || other.location) {
        b.appendChild(el('span', 'when', [when, other.location].filter(Boolean).join(' · ')));
      }
      b.addEventListener('click', function () { go('#' + id); });
      li.appendChild(b);
      ul.appendChild(li);
    });
    box.appendChild(ul);

    var walk = el('button', 'bt-btn ghost');
    walk.type = 'button';
    walk.style.marginTop = '1rem';
    var m = el('span', 'mark');
    m.setAttribute('aria-hidden', 'true');
    walk.appendChild(m);
    walk.appendChild(doc.createTextNode('Follow it forward'));
    walk.addEventListener('click', function () { walkChain(chain, ul); });
    box.appendChild(walk);

    sec.appendChild(box);
    into.appendChild(sec);
  }

  /* The forward chain: first consequence at each step, guarded against
     loops and kept short enough to stay a story rather than a graph. */
  function chainFrom(id) {
    var out = [id], guard = 0, cur = byId[id];
    while (cur && cur.consequences.length && guard++ < 7) {
      var nextId = null;
      for (var i = 0; i < cur.consequences.length; i++) {
        if (out.indexOf(cur.consequences[i]) < 0) { nextId = cur.consequences[i]; break; }
      }
      if (!nextId) break;
      out.push(nextId);
      cur = byId[nextId];
    }
    return out;
  }

  function walkChain(chain, ul) {
    if (chain.length < 2) { whisper(ARCHIVE.becauseEmpty, 3600); return; }
    global.clearTimeout(walkTimer);
    releaseEscort(400);
    trails.spotlight(chain);

    var start = trails.nodeFor(chain[0]);
    var f = spawnFly({
      at: start ? { x: start.pos.x, y: start.pos.y } : undefined,
      tone: '#FFC46B', size: 1.1, speed: 0.0019, trailCap: 170, state: 'seeking'
    });
    escort = f;

    var i = 0;
    function markStep(id) {
      if (!ul) return;
      [].slice.call(ul.children).forEach(function (li) {
        li.className = li.getAttribute('data-id') === id ? 'active' : 'pending';
      });
    }

    function hop() {
      if (i >= chain.length - 1) {
        whisper('…and that is how it reaches here.', 4200);
        walkTimer = global.setTimeout(function () {
          trails.spotlight(null);
          releaseEscort(1600);
          if (ul) [].slice.call(ul.children).forEach(function (li) { li.className = ''; });
        }, 2600);
        return;
      }
      trails.litLink(chain[i], chain[i + 1]);
      markStep(chain[i + 1]);
      var next = byId[chain[i + 1]];
      whisper(ARCHIVE.because + ' ' + next.title, 2600);
      trails.flyTo(f, chain[i + 1], {
        onArrive: function () {
          i++;
          walkTimer = global.setTimeout(hop, trails.isReduced() ? 900 : 1400);
        }
      });
    }
    hop();
  }

  /* ---- the decision that could have gone another way ---- */
  function renderFork(s, into) {
    var alt = s.alternatePath;
    if (!alt || !alt.choices || alt.choices.length < 2) return;

    var sec = section('A moment with two sides');
    var box = el('div', 'fork');
    box.appendChild(el('p', 'prompt', ARCHIVE.alternate.prompt));
    box.appendChild(el('p', 'question', alt.question || ARCHIVE.alternate.guess));

    var choices = el('div', 'fork-choices');
    var answered = false;

    alt.choices.forEach(function (choice, ci) {
      var b = el('button', 'fork-choice');
      b.type = 'button';
      b.appendChild(el('span', 'label', choice.label || ('Choice ' + (ci + 1))));
      b.appendChild(el('span', 'pick', 'Guess'));
      b.addEventListener('click', function () {
        if (answered) return;
        answered = true;
        choices.remove();
        reveal(choice);
      });
      choices.appendChild(b);
    });
    box.appendChild(choices);

    function reveal(choice) {
      var taken = alt.choices.filter(function (c) { return c.taken; })[0] || null;

      if (choice.taken) {
        /* Right first time. Nothing hypothetical needs drawing. */
        var real = el('div', 'fork-outcome real');
        real.appendChild(el('p', 'verdict', 'That is what happened'));
        real.appendChild(el('p', null, choice.outcome || ''));
        box.appendChild(real);
        whisper('That is the way it went.', 3200);
        return;
      }

      /* The branch that did not happen: drawn on the canvas as a dashed
         limb in violet, and labelled here in as many words as it takes to
         be sure nobody mistakes it for history. */
      var never = el('div', 'fork-outcome never');
      never.appendChild(el('p', 'verdict', ARCHIVE.alternate.hypothetical));
      never.appendChild(el('p', null, choice.outcome ||
        'Nobody has said what that life would have looked like. The branch is here; the story is not.'));
      box.appendChild(never);
      trails.showGhostBranch(s.id);
      whisper(ARCHIVE.alternate.hypothetical, 4000);

      var back = el('button', 'bt-btn ghost');
      back.type = 'button';
      back.style.marginTop = '1rem';
      back.appendChild(doc.createTextNode(ARCHIVE.alternate.correction));
      back.addEventListener('click', function () {
        back.remove();
        trails.hideGhostBranch();
        never.style.opacity = '0.5';
        box.appendChild(el('p', 'fork-correction', ARCHIVE.alternate.correction));
        if (taken) {
          var real2 = el('div', 'fork-outcome real');
          real2.appendChild(el('p', 'verdict', 'What happened instead'));
          real2.appendChild(el('p', null, taken.outcome || taken.label || ''));
          box.appendChild(real2);
        }
        trails.focus(s.id, { move: true });
        whisper(ARCHIVE.alternate.correction, 3600);
      });
      box.appendChild(back);
    }

    sec.appendChild(box);
    into.appendChild(sec);
  }

  /* ---- the whole record ---- */
  function renderStory(s) {
    storyEl.textContent = '';

    var head = el('div', 'panel-head');
    var n = indexOf[s.id] + 1;
    head.appendChild(el('span', 'st-index',
      'Memory ' + (n < 10 ? '0' : '') + n + ' of ' + ordered.length));
    var close = el('button', 'panel-close', 'Close');
    close.type = 'button';
    close.setAttribute('aria-label', 'Back to the trail');
    close.addEventListener('click', function () { go('#'); });
    head.appendChild(close);
    storyEl.appendChild(head);

    var scroll = el('div', 'panel-scroll');
    var inner = el('div', 'story-inner');

    /* era · place */
    var standing = standfirst(s);
    if (standing) {
      var era = el('p', 'st-era');
      var e = eraOf(s);
      if (e) {
        era.appendChild(el('b', null, e.label));
        if (s.location) era.appendChild(doc.createTextNode(' · ' + s.location));
      } else {
        era.appendChild(doc.createTextNode(standing));
      }
      inner.appendChild(era);
    }

    var title = el('h2', 'st-title', s.title);
    title.tabIndex = -1;
    inner.appendChild(title);
    if (s.hook) inner.appendChild(el('p', 'st-hook', s.hook));

    /* flags */
    var flags = el('div', 'flags');
    if (s.classified) {
      flags.appendChild(flagBox('classified', '🔒', ARCHIVE.flags.classified.label,
        typeof s.classified === 'string' ? s.classified : ARCHIVE.flags.classified.line));
    }
    if (s.disputed) {
      flags.appendChild(flagBox('disputed', '⚠', ARCHIVE.flags.disputed.label,
        typeof s.disputed === 'string' ? s.disputed : ARCHIVE.flags.disputed.line));
    }
    if (s.chaosEvent) {
      flags.appendChild(flagBox('chaos', '🦋', ARCHIVE.flags.chaos.label, ARCHIVE.flags.chaos.line));
    }
    if (flags.childNodes.length) inner.appendChild(flags);

    /* meta */
    var dl = el('dl', 'st-meta');
    metaRow(dl, 'When', whenOf(s));
    metaRow(dl, 'Where', s.location);
    if (s.category && catById[s.category]) metaRow(dl, 'Carried by', catById[s.category].name);
    if (s.people.length) {
      metaRow(dl, s.people.length === 1 ? 'Person' : 'People',
        s.people.map(function (p) {
          return typeof p === 'string' ? p : (p.name + (p.relation ? ' (' + p.relation + ')' : ''));
        }).join(', '));
    }
    if (dl.childNodes.length) inner.appendChild(dl);

    /* the story, or the seal where there isn't one to show */
    if (s.classified) {
      var sealed = el('div', 'sealed');
      sealed.appendChild(el('span', 'seal', ARCHIVE.flags.classified.label));
      var bars = el('div', 'bars');
      bars.appendChild(el('span'));
      bars.appendChild(el('span'));
      bars.appendChild(el('span'));
      sealed.appendChild(bars);
      sealed.appendChild(doc.createTextNode(
        typeof s.classified === 'string' ? s.classified : ARCHIVE.flags.classified.line));
      inner.appendChild(sealed);
    } else if (s.story.length) {
      var bodyWrap = el('div', 'st-body');
      s.story.forEach(function (p) { bodyWrap.appendChild(el('p', null, p)); });
      inner.appendChild(bodyWrap);
    } else {
      var pending = el('div', 'st-body');
      pending.appendChild(el('p', null,
        'This one has a title and not yet a telling. It is on the list.'));
      inner.appendChild(pending);
    }

    if (!s.classified) {
      renderPhotos(s, inner);
      renderAudio(s, inner);
      renderFork(s, inner);
    }
    renderBecause(s, inner);

    /* what led here */
    if (s.causedBy.length) {
      var cb = section('What led here');
      var cbWrap = el('div', 'related');
      s.causedBy.forEach(function (id) {
        cbWrap.appendChild(relItem(byId[id]));
      });
      cb.appendChild(cbWrap);
      inner.appendChild(cb);
    }

    /* where accounts differ */
    if (s.notes.length) {
      var ns = section('Told differently');
      var ul = el('ul', 'notes');
      s.notes.forEach(function (note) {
        var li = el('li');
        if (note.by) li.appendChild(el('span', 'who', note.by));
        li.appendChild(doc.createTextNode(note.text || ''));
        ul.appendChild(li);
      });
      ns.appendChild(ul);
      inner.appendChild(ns);
    }

    /* tags */
    if (s.tags.length) {
      var ts = section('Tags');
      var tw = el('div', 'chips');
      s.tags.forEach(function (t) { tw.appendChild(el('span', 'chip tag', t)); });
      ts.appendChild(tw);
      inner.appendChild(ts);
    }

    /* related */
    if (s.relatedStories.length) {
      var rs = section('Nearby memories');
      var rw = el('div', 'related');
      s.relatedStories.forEach(function (id) { rw.appendChild(relItem(byId[id])); });
      rs.appendChild(rw);
      inner.appendChild(rs);
    }

    /* who told it */
    if (s.source) {
      var ss = section('Told by');
      var tb = el('p', 'told-by');
      tb.appendChild(el('b', null, s.source));
      ss.appendChild(tb);
      inner.appendChild(ss);
    }

    /* foot */
    var foot = el('div', 'st-foot');
    var back = el('button', 'bt-btn ghost', 'Back to the trail');
    back.type = 'button';
    back.addEventListener('click', function () { go('#'); });
    foot.appendChild(back);

    var another = el('button', 'bt-btn');
    another.type = 'button';
    var mk = el('span', 'mark');
    mk.setAttribute('aria-hidden', 'true');
    another.appendChild(mk);
    another.appendChild(doc.createTextNode('Surprise me'));
    another.addEventListener('click', surprise);
    foot.appendChild(another);
    inner.appendChild(foot);

    scroll.appendChild(inner);
    storyEl.appendChild(scroll);
    scroll.scrollTop = 0;
    return title;
  }

  function relItem(other) {
    var b = el('button', 'rel-item');
    b.type = 'button';
    b.appendChild(el('span', 'rl-title', other.title));
    var when = whenOf(other);
    if (when) b.appendChild(el('span', 'rl-when', when));
    b.addEventListener('click', function () { go('#' + other.id); });
    return b;
  }

  /* =============================================================== KEYNAV
     A real, focusable route through the archive for anyone not using a
     pointer. Hidden until it takes focus, then it becomes a visible list. */
  function renderKeynav() {
    keynavEl.textContent = '';
    keynavEl.appendChild(el('h2', null, 'Butterfly Trails index'));
    var ul = el('ul');

    function add(label, fn) {
      var li = el('li');
      var b = el('button', null, label);
      b.type = 'button';
      b.addEventListener('click', fn);
      li.appendChild(b);
      ul.appendChild(li);
    }

    if (view.story) add('← Back to the trail', function () { go('#'); });
    add('The trail', function () { go('#'); });
    add('The whole trail', function () { go('#whole-trail'); });
    add('Places', function () { go('#map'); });
    add('Surprise me', surprise);

    ordered.forEach(function (s) {
      var when = whenOf(s);
      add((when ? when + ' — ' : '') + s.title, function () { go('#' + s.id); });
    });

    keynavEl.appendChild(ul);
    if (!ordered.length) {
      keynavEl.appendChild(el('p', 'keynav-note',
        ARCHIVE.empty.heading + ' ' + ARCHIVE.empty.note));
    } else {
      keynavEl.appendChild(el('p', 'keynav-note',
        'Arrow keys pan the trail. + and − zoom. Escape closes a memory.'));
    }
  }

  /* ================================================================ INSET
     Shift the world into whatever space the open panel leaves, measured
     rather than assumed — so it works for the desktop side panel, the phone
     bottom sheet and the landscape side sheet without three special cases. */
  function applyInset() {
    var W = global.innerWidth, H = global.innerHeight;
    var open = storyEl.hidden ? null : storyEl;

    if (!open) {
      var top = plate.getBoundingClientRect().bottom;
      var dockTop = dockEl.getBoundingClientRect().top;
      var lower = dockTop > top ? dockTop : H;
      if (!beginningEl.hidden) {
        var br = beginningEl.getBoundingClientRect();
        if (br.top < lower) lower = br.top;
      }
      trails.setInset(0, (top + lower) / 2 - H / 2);
      return;
    }

    var r = open.getBoundingClientRect();
    if (r.width > W * 0.85) {
      var above = r.top, below = H - r.bottom;
      var band = above >= below ? [0, r.top] : [r.bottom, H];
      trails.setInset(0, (band[0] + band[1]) / 2 - H / 2);
    } else {
      var left = r.left, right = W - r.right;
      var lane = right >= left ? [r.right, W] : [0, r.left];
      trails.setInset((lane[0] + lane[1]) / 2 - W / 2, 0);
    }
  }

  /* =============================================================== ROUTER */
  var VIEW_HASH = { 'whole-trail': 'constellation', 'map': 'map', 'trail': 'trail' };
  var FOCUS_ZOOM = { trail: 1.4, constellation: 1.0, map: 1.25 };

  function resolve(hash) {
    hash = (hash || '').replace(/^#/, '');
    if (!hash) return { mode: 'trail', story: null };
    /* A memory always wins the name, so no route can shadow one. */
    if (byId[hash]) return { mode: view.mode, story: hash };
    var lower = hash.toLowerCase();
    for (var id in byId) {
      if (id.toLowerCase() === lower) return { mode: view.mode, story: id };
    }
    if (VIEW_HASH[lower]) return { mode: VIEW_HASH[lower], story: null };
    return { mode: 'trail', story: null };
  }

  function go(hash) {
    if (hash === '#' || hash === '') {
      if (global.location.hash) global.location.hash = '';
      else apply(resolve(''));
      return;
    }
    if (global.location.hash === hash) apply(resolve(hash));
    else global.location.hash = hash;
  }

  /* What each view says for itself when you arrive in it. The map is the
     one that has to be honest about what it cannot show. */
  function noteMode(m) {
    if (m === 'map') {
      var placed = ordered.filter(function (s) { return !!s.coordinates; }).length;
      if (!stories.length) whisper('No places yet. The map is waiting too.', 4200);
      else if (!placed) whisper('None of these memories has been given a place yet.', 4600);
      else if (placed < stories.length) {
        whisper(placed + ' of ' + stories.length + ' memories know where they happened.', 4600);
      }
    } else if (m === 'constellation' && stories.length) {
      whisper('The whole trail. Clustered by when, joined by cause.', 4200);
    }
  }

  function apply(next) {
    var hadStory = view.story;
    var hadMode = view.mode;
    view = next;
    body.setAttribute('data-view', next.mode);

    trails.setMode(next.mode, { fit: !next.story });
    markViews();
    if (next.mode !== hadMode) noteMode(next.mode);

    if (next.story && byId[next.story]) {
      var s = byId[next.story];
      var heading = renderStory(s);
      storyEl.hidden = false;
      body.setAttribute('data-panel', '1');
      doc.title = s.title + ' — Butterfly Trails — Entropic Labs';
      /* How close to go depends on what the view is for: the trail is a
         reading position, the constellation is a shape you would lose by
         zooming into it, the map is a place. */
      trails.focus(s.id, { zoom: FOCUS_ZOOM[next.mode] || 1.35 });
      trails.hideGhostBranch();
      beginningEl.hidden = true;
      if (hadStory !== next.story) {
        global.requestAnimationFrame(function () { heading.focus(); });
      }
      liveEl.textContent = s.title + '. ' + (s.hook || '');
    } else {
      storyEl.hidden = true;
      storyEl.textContent = '';
      body.removeAttribute('data-panel');
      trails.clearFocus();
      trails.spotlight(null);
      trails.hideGhostBranch();
      doc.title = 'Butterfly Trails — Entropic Labs';
      renderBeginning();
      if (lastFocus && doc.contains(lastFocus)) { lastFocus.focus(); lastFocus = null; }
    }

    renderKeynav();
    global.requestAnimationFrame(applyInset);
  }

  /* ============================================================== THE GATE */
  var SEEN_KEY = 'el-bt-seen';
  var gateFly = null;

  function runGate(full) {
    body.setAttribute('data-gate', '1');
    gate.hidden = false;

    if (trails.isReduced()) {
      /* Nothing moves. Everything is said at once, and the visitor decides
         when to go in. */
      gateLine.textContent = ARCHIVE.openingLines[0] || '';
      gateLine.classList.add('on');
      gate.querySelector('.gate-actions').classList.add('on');
      return;
    }

    /* One butterfly crosses the gate, leaving the trail that the room is
       named after. It flies in screen space, so it does not care where the
       camera happens to be. */
    var vp = trails.viewport();
    gateFly = trails.spawn({
      space: 'screen',
      x: -50, y: vp.h * 0.72,
      tone: '#FFC46B', size: 1.25,
      speed: full ? 0.19 : 0.3,
      arriveAt: 22,
      trailCap: 260
    });
    gateFly.aim({ x: vp.w + 70, y: vp.h * 0.28 });

    if (!full) {
      /* A returning visitor gets the title, one butterfly, and the door
         already open: no lines to sit through and no click to make. It
         lands, and the room is there. Anything they do gets them in
         sooner. */
      gateLine.textContent = '';
      gate.querySelector('.gate-actions').classList.add('on');
      global.setTimeout(enterRoom, 1500);
      return;
    }

    global.setTimeout(function () {
      gateLine.textContent = ARCHIVE.openingLines[0] || '';
      gateLine.classList.add('on');
    }, 2400);
    global.setTimeout(function () {
      gate.querySelector('.gate-actions').classList.add('on');
    }, 4200);
  }

  var entered = false;
  function enterRoom() {
    if (entered || gate.hidden) return;
    entered = true;
    gate.classList.add('leaving');
    store(SEEN_KEY, '1');
    if (gateFly) { trails.release(gateFly, 900); gateFly = null; }
    global.setTimeout(function () {
      gate.hidden = true;
      body.removeAttribute('data-gate');
      applyInset();
    }, trails.isReduced() ? 0 : 900);

    trails.fit(trails.isReduced() ? 1 : 1600);
    startAmbient();
    maybeRareVisitor();

    /* A word on arrival — unless the visitor has already gone and done
       something, in which case they do not need to be welcomed over the top
       of their own answer. */
    spokenTo = false;
    global.setTimeout(function () {
      if (spokenTo) return;
      if (!stories.length) whisper(ARCHIVE.empty.note, 5200);
      else whisper('Pick a light, or follow a butterfly.', 4600);
    }, 1400);
  }

  gateEnter.addEventListener('click', enterRoom);
  gateSkip.addEventListener('click', enterRoom);
  gate.addEventListener('click', function (e) {
    if (e.target === gate) enterRoom();
  });

  /* ============================================================== EVENTS */
  trails.on('select', function (ref) { go('#' + ref.id); });

  trails.on('hover', function (ref) {
    if (!ref) return;
    var s = byId[ref.id];
    if (!s) return;
    var line = [standfirst(s), s.hook].filter(Boolean).join(' — ');
    liveEl.textContent = s.title + '. ' + line;
  });

  trails.on('empty', function () {
    if (view.story) { go('#'); return; }
    if (!stories.length) {
      whisper(pick([
        ARCHIVE.empty.note,
        'Nothing there yet. Something will be.',
        'The dim ones are placeholders, not memories.'
      ]), 3600);
    }
  });

  surpriseBtn.addEventListener('click', function () {
    lastFocus = surpriseBtn;
    surprise();
  });

  doc.addEventListener('keydown', function (e) {
    if (e.defaultPrevented) return;
    var tag = (e.target && e.target.tagName) || '';
    if (e.key === 'Escape') {
      if (!lightboxEl.hidden) { closeLightbox(); return; }
      if (!gate.hidden) { enterRoom(); return; }
      if (view.story) go('#');
      return;
    }
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (!gate.hidden) return;

    switch (e.key) {
      case 'ArrowLeft':  trails.nudge(-90, 0); e.preventDefault(); break;
      case 'ArrowRight': trails.nudge(90, 0); e.preventDefault(); break;
      case 'ArrowUp':    trails.nudge(0, -90); e.preventDefault(); break;
      case 'ArrowDown':  trails.nudge(0, 90); e.preventDefault(); break;
      case '+': case '=': trails.zoomBy(1.18); break;
      case '-': case '_': trails.zoomBy(1 / 1.18); break;
      case 's': case 'S': surprise(); break;
      case 'w': case 'W': go('#whole-trail'); break;
      case 'm': case 'M': go('#map'); break;
      case 't': case 'T': go('#'); break;
    }
  });

  global.addEventListener('hashchange', function () {
    apply(resolve(global.location.hash));
  });

  var resizeTimer = 0;
  global.addEventListener('resize', function () {
    global.clearTimeout(resizeTimer);
    resizeTimer = global.setTimeout(function () {
      trails.resize();
      applyInset();
    }, 140);
  });
  global.addEventListener('orientationchange', function () {
    global.setTimeout(function () { trails.resize(); applyInset(); }, 280);
  });

  /* ================================================================= BOOT */
  renderDock();
  renderViews();
  renderEras();
  updateCounts();
  updateHint();
  renderKeynav();

  var initial = resolve(global.location.hash);
  apply(initial);

  /* Arriving at a memory means skipping the way in — you came for the
     story, not the doorway. */
  if (initial.story) {
    body.removeAttribute('data-gate');
    gate.hidden = true;
    startAmbient();
    maybeRareVisitor();
  } else {
    runGate(store(SEEN_KEY) !== '1');
  }

  /* The perching easter egg, on a long and irregular clock. */
  (function schedulePerch() {
    global.setTimeout(function () {
      perchSomewhere();
      schedulePerch();
    }, 45000 + Math.random() * 60000);
  })();

  global.setTimeout(applyInset, 300);
})(window);
