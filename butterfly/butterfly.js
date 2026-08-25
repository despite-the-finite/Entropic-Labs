/* Entropic Labs — Butterfly Trails controller.
   ==========================================================================
   Owns the archive, the state machine, the URL and every panel. The renderer
   draws and reports; this decides what any of it means.

   Lenses — two ways of experiencing the same archive, chosen by the visitor
   and remembered between visits:
     trails         the canvas world. The braid, drawn on one dark plane
     atlas          a trail map of an invented country whose regions are the
                    archive's own eras, with every memory a lit waypoint

   Views — layouts inside the trails lens:
     trail          the reading order, along one meandering path
     constellation  the whole archive at once, clustered and linked
     map            where it happened

   Adding a third lens means one entry in LENSES and one object answering
   the same handful of calls. Nothing about the archive, the filters or the
   story panel knows how many there are.

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
  var ATLAS = global.BUTTERFLY_ATLAS;
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
      strand: s.strand || null,
      location: s.location || (s.place && placeById[s.place] ? placeById[s.place].name : ''),
      place: s.place || null,
      landmark: s.landmark || null,
      artifact: arr(s.artifact),
      journey: arr(s.journey),
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
      warning: arr(s.warning),
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

  /* A sideways link goes both ways by definition — if this memory sits near
     that one, that one sits near this one. State it once, on whichever of
     the two you happen to be writing. */
  stories.forEach(function (s) {
    s.relatedStories = s.relatedStories.filter(function (id) {
      return byId[id] && id !== s.id;
    });
  });
  reciprocate('relatedStories', 'relatedStories');

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

  /* ================================================================ BRAID
     The trail is not one line: two lives run alongside each other, converge
     when they marry, and divide again each time somebody is born. Laying
     that out needs a time axis, because a branch year has to land in the
     right place relative to the memories around it.

     The axis is compressed: a year is worth a fixed distance, but no gap
     between two anchors is allowed to collapse to nothing or to run away.
     Three years between two births reads as a real gap; forty years of
     nothing does not push everything else off the screen. */
  var strands = DATA.strands || [];
  var braidCfg = DATA.braid || {};
  var strandById = {};
  strands.forEach(function (s) { strandById[s.id] = s; });

  var PER_YEAR = 0.14, MIN_GAP = 0.78, MAX_GAP = 2.3;
  var UNDATED_BACKOFF = 1.7;   /* where an undated confluence sits before the first branch */
  var ORIGIN_LEAD = 2.8;       /* how far a line runs in from before the record */
  var RUN_ON = 1.7;            /* how far the open ends run past the last anchor */

  function startYear(s) { return s.start && typeof s.start.year === 'number' ? s.start.year : null; }
  function endYear(s) { return s.end && typeof s.end.year === 'number' ? s.end.year : null; }

  var axis = (function buildAxis() {
    var years = {};
    strands.forEach(function (s) {
      var a = startYear(s), b = endYear(s);
      if (a !== null) years[a] = true;
      if (b !== null) years[b] = true;
    });
    ordered.forEach(function (s) { if (s.year !== null) years[s.year] = true; });

    var list = Object.keys(years).map(Number).sort(function (a, b) { return a - b; });
    var out = [];
    var t = 0;
    list.forEach(function (y, i) {
      if (i > 0) t += clamp((y - list[i - 1]) * PER_YEAR, MIN_GAP, MAX_GAP);
      out.push({ year: y, t: t });
    });
    return out;
  })();

  function axisT(year) {
    if (!axis.length || typeof year !== 'number') return 0;
    var first = axis[0], last = axis[axis.length - 1];
    if (year <= first.year) return first.t - Math.min(3.2, (first.year - year) * PER_YEAR);
    if (year >= last.year) return last.t + Math.min(3.2, (year - last.year) * PER_YEAR);
    for (var i = 1; i < axis.length; i++) {
      var a = axis[i - 1], b = axis[i];
      if (year <= b.year) {
        var span = b.year - a.year;
        return span ? a.t + (b.t - a.t) * ((year - a.year) / span) : a.t;
      }
    }
    return last.t;
  }

  var axisStart = axis.length ? axis[0].t : 0;
  var axisEnd = (axis.length ? axis[axis.length - 1].t : 0) + RUN_ON;

  /* The earliest branch anybody takes — where an undated confluence has to
     sit before, since a marriage precedes the children that come out of it.

     A branch, specifically, and not the earliest dated anything: a memory
     can be older than every birth on the braid — somebody's parents had a
     life before the children — and anchoring to the axis start would slide
     the marriage back behind that memory, silently claiming a wedding that
     nobody recorded happened earlier than it did. */
  var branchYears = [];
  strands.forEach(function (s) {
    var y = startYear(s);
    if (y !== null) branchYears.push(y);
  });
  var firstBranchT = branchYears.length
    ? axisT(Math.min.apply(null, branchYears))
    : (axis.length ? axis[0].t : 0);

  /* It also sits AFTER the last dated memory that precedes that branch. A
     memory on somebody's own line happened while they still had one, so an
     unrecorded wedding cannot be placed on top of it — and a fixed backoff
     will do exactly that as soon as the archive gains memories older than
     its first birth. Halfway between the two is the only placement the data
     supports; the year itself stays unwritten, and the index still says so. */
  var lastBefore = null;
  ordered.forEach(function (st) {
    if (st.year === null) return;
    var t = axisT(st.year);
    if (t < firstBranchT && (lastBefore === null || t > lastBefore)) lastBefore = t;
  });
  var undatedT = lastBefore === null
    ? firstBranchT - UNDATED_BACKOFF
    : Math.max(firstBranchT - UNDATED_BACKOFF, (lastBefore + firstBranchT) / 2);

  /* A year on the axis, where null means "nobody wrote it down". */
  function momentT(year) { return year === null ? undatedT : axisT(year); }

  var trunk = strands.filter(function (s) { return !s.base; })[0] || null;

  /* One resolved description of every strand, in axis units. The braid, the
     markers and the placeholder points all read from this, so they cannot
     disagree about where a line runs. */
  var lanes = strands.map(function (s) {
    var kind = (s.start && s.start.kind) || 'union';
    var ends = (s.end && s.end.kind) || 'open';
    var to = ends === 'joins' ? momentT(endYear(s)) : axisEnd;
    /* A line that runs in from before the record starts off-stage, a set
       distance before whatever it is running towards. */
    var from = kind === 'origin' ? to - ORIGIN_LEAD : momentT(startYear(s));

    /* Where the name goes: at whichever end stays open. A line that both
       starts and ends inside the braid is named by its markers instead, so
       no name is ever drawn twice. */
    var labelAt = null;
    if (kind === 'origin') labelAt = 'start';
    else if (ends === 'open') labelAt = 'end';

    return {
      id: s.id,
      label: s.label,
      labelAt: labelAt,
      tone: s.tone,
      side: s.side || 0,
      base: s.base || null,
      startKind: kind,
      endKind: ends,
      joinTarget: ends === 'joins' ? s.end.into : null,
      fadeIn: kind === 'begins',
      from: from,
      to: to,
      startsAt: startYear(s),
      endsAt: endYear(s),
      /* The day itself, where somebody has written it down. `year` places
         the marker on the axis; this is what the reader is told. */
      startsOn: (s.start && s.start.on) || null,
      endsOn: (s.end && s.end.on) || null
    };
  });

  function braidSpec() {
    return strands.length < 2 ? null : { laneW: 0.55, lanes: lanes };
  }

  /* How a strand is described in a list: when it starts, and where it goes. */
  function strandWhen(s) {
    var a = startYear(s), b = endYear(s);
    var kind = (s.start && s.start.kind) || 'union';
    if (kind === 'origin') return ' — runs in from before the record';
    if (kind === 'union') {
      if (s.start && s.start.on) return ' — from ' + s.start.on;
      return a === null ? ' — from an unrecorded year' : ' — from ' + a;
    }
    var line = a === null ? '' : ' — from ' + a;
    if (b !== null && s.end && s.end.into && strandById[s.end.into]) {
      line += ', joining ' + strandById[s.end.into].label +
        ' in ' + ((s.end && s.end.on) || b);
    }
    return line;
  }

  /* Where a memory sits along the axis. Undated ones gather past the end,
     which is where an unpinned memory honestly belongs. */
  function storyT(s) {
    return s.year === null ? axisEnd - 0.6 : axisT(s.year);
  }
  function storyStrand(s) {
    if (s.strand && strandById[s.strand]) return s.strand;
    return trunk ? trunk.id : null;
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
  var gateChoose = $('#gate-choose');
  var gateDoors = $('#gate-doors');
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
  var indexBtn = $('#index-btn');
  var viewsEl = $('#views');
  var erasEl = $('#eras');
  var storyEl = $('#story');
  var essayEl = $('#essay');
  var gateEssay = $('#gate-essay');
  var gateMark = $('#gate-mark');
  var lightboxEl = $('#lightbox');
  var keynavEl = $('#keynav');
  var atlasEl = $('#atlas');
  var lensesEl = $('#lenses');
  var folkEl = $('#folk');

  var ESSAY = ARCHIVE.essay || null;
  var view = { mode: 'trail', story: null, essay: false };
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
        strand: storyStrand(s),
        t: storyT(s),
        tone: toneOf(s),
        lat: s.coordinates ? s.coordinates.lat : null,
        lon: s.coordinates ? s.coordinates.lon : null,
        chaos: s.chaosEvent,
        classified: !!s.classified,
        featured: s.featured,
        ref: { id: s.id }
      };
    });

    /* The braid's own joints: where a life started, and where two lines
       became one. They are structure, not stories — they carry a year and a
       name, and say plainly that nothing has been written down there yet. */
    var married = (braidCfg.marriedLabel || 'Married').toUpperCase();
    var undatedNote = braidCfg.undatedNote ||
      'Two trails become one. The year has not been written down yet.';

    lanes.forEach(function (lane) {
      if (lane.startKind !== 'born' && lane.startKind !== 'begins') return;
      var year = lane.startsAt;
      list.push({
        id: 'marker-' + lane.id,
        kind: 'marker',
        markerKind: 'birth',
        title: lane.label.toUpperCase(),
        yearLabel: year === null ? '' : String(year),
        strand: lane.id,
        t: lane.from,
        tone: lane.tone,
        lean: lane.side === 0 ? 0 : (lane.side < 0 ? -1 : 1) * (lane.startKind === 'born' ? 0.7 : 1.2),
        ref: {
          id: 'marker-' + lane.id,
          marker: true,
          note: lane.startKind === 'born'
            ? lane.label + (year === null ? '' : ' — born ' + year) + '. The trail divides here.'
            : lane.label + (year === null ? '' : ' — born ' + year) + '. This trail joins the family later.'
        }
      });
    });

    /* One marker per wedding, however many lines arrive at it. */
    var weddings = {};
    lanes.forEach(function (lane) {
      if (lane.endKind !== 'joins' || !lane.joinTarget) return;
      var key = lane.joinTarget + '@' + lane.to.toFixed(3);
      if (weddings[key]) { weddings[key].who.push(lane.label); return; }
      weddings[key] = { lane: lane, who: [lane.label] };
    });
    Object.keys(weddings).forEach(function (key) {
      var w = weddings[key];
      var year = w.lane.endsAt;
      var said = w.lane.endsOn || (year === null ? null : String(year));
      var target = w.lane.joinTarget;
      list.push({
        id: 'marker-wed-' + target,
        kind: 'marker',
        markerKind: 'union',
        title: married,
        yearLabel: year === null ? '' : String(year),
        strand: target,
        t: w.lane.to,
        tone: (strandById[target] && strandById[target].tone) || '#FFC46B',
        lean: (function () {
          var side = strandById[target] ? (strandById[target].side || 0) : 0;
          return side === 0 ? 0 : (side < 0 ? -1 : 1) * 1.1;
        })(),
        ref: {
          id: 'marker-wed-' + target,
          marker: true,
          note: year === null
            ? undatedNote
            : w.who.join(' and ') + ' — married ' + said + '. Two trails become one.'
        }
      });
    });

    /* Unidentified points, spread across the whole family rather than piled
       at one end, so an empty archive still shows its shape. */
    for (var i = 0; i < GHOSTS; i++) {
      var node = { id: 'ghost-' + i, kind: 'ghost', ref: { id: 'ghost-' + i } };
      if (lanes.length) {
        var lane = lanes[i % lanes.length];
        var step = Math.floor(i / lanes.length);
        var lo = lane.from + 0.6, hi = lane.to - 0.4;
        if (hi > lo) {
          var f = ((step + 1) * 0.37 + hash01Local('g' + i) * 0.5) % 1;
          node.strand = lane.id;
          node.t = lo + (hi - lo) * f;
        }
      }
      list.push(node);
    }
    return list;
  }

  /* Stable 0..1 from a string — the same ghost surfaces in the same place
     every visit, which is what stops the empty trail from twitching. */
  function hash01Local(s) {
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return ((h >>> 0) % 100000) / 100000;
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
    var out = (DATA.migrations || []).map(function (m) {
      var a = placeById[m.from], b = placeById[m.to];
      if (!a || !b) return null;
      return { from: { lat: a.lat, lon: a.lon }, to: { lat: b.lat, lon: b.lon } };
    }).filter(Boolean);

    /* Every leg a memory travelled is a crossing too. A stop that is not a
       place — a person, a habit, a skill — simply has no coordinates, so the
       last leg of such a journey is not drawn: the trail leaves the map,
       which is the honest picture of what happened. */
    ordered.forEach(function (s) {
      var prev = null;
      s.journey.forEach(function (stop) {
        var pl = stop.place && placeById[stop.place];
        if (pl && prev && (prev.lat !== pl.lat || prev.lon !== pl.lon)) {
          out.push({ from: { lat: prev.lat, lon: prev.lon }, to: { lat: pl.lat, lon: pl.lon } });
        }
        if (pl) prev = pl;
      });
    });
    return out;
  }

  trails.setBraid(braidSpec());
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

  /* =============================================================== COUNTS
     The readout says what the visitor has narrowed the archive to, and
     nothing else. It used to open with the archive's measurements — how many
     memories, which years, how many places — and that is a fact about the
     collection rather than about anything on the screen: it sat over the
     trail on every page and said the same thing every time. What is left
     only appears once somebody has asked for it. */
  function updateCounts() {
    countsEl.textContent = '';
    if (!stories.length) return;

    var narrowed = !!(filters.category || filters.era);
    var who = filters.person && strandById[filters.person];
    if (!narrowed && !who) return;

    countsEl.appendChild(el('b', null, String(narrowed ? filtered().length : stories.length)));
    countsEl.appendChild(el('span', null,
      (narrowed ? ' of ' + stories.length : '') +
      (stories.length === 1 && !narrowed ? ' memory' : ' memories')));
    var words = [];
    if (filters.category && catById[filters.category]) words.push(catById[filters.category].name);
    if (filters.era && eraById[filters.era]) words.push(eraById[filters.era].label);
    if (who) words.push('following ' + who.label);
    countsEl.appendChild(el('span', null, ' · ' + words.join(' · ')));
  }

  function updateHint() {
    var move = lens === 'atlas'
      ? (trails.isCoarse() ? 'Drag the map · pinch to zoom' : 'Drag the map · scroll to zoom')
      : (trails.isCoarse() ? 'Drag to explore' : 'Drag to explore · scroll to move');
    var pick = ' · Follow a butterfly, or pick a light';
    plateHint.textContent = stories.length
      ? move + pick
      : move + ' · Stories coming soon';
  }

  /* ========================================================= THE BEGINNING
     The empty state. It is a plate rather than a hole: the archive saying
     what it is doing, in its own words. */
  var beginningDismissed = false;
  function renderBeginning() {
    if (stories.length || beginningDismissed) { beginningEl.hidden = true; return; }
    if (beginningEl.childNodes.length) { beginningEl.hidden = view.mode !== 'trail'; return; }

    var sum = el('summary');
    sum.appendChild(el('h2', null, ARCHIVE.empty.heading));
    sum.appendChild(el('span', 'soon', ARCHIVE.empty.note));
    beginningEl.appendChild(sum);

    var bodyWrap = el('div', 'b-body');
    ARCHIVE.empty.body.forEach(function (p) { bodyWrap.appendChild(el('p', null, p)); });

    var close = el('button', 'dismiss', 'Hide this note');
    close.type = 'button';
    close.addEventListener('click', function () {
      beginningDismissed = true;
      beginningEl.hidden = true;
      applyInset();
    });
    bodyWrap.appendChild(close);
    beginningEl.appendChild(bodyWrap);

    /* Open where there is room for it, shut where the trail needs the screen
       more than the note does. */
    beginningEl.open = !(global.matchMedia && global.matchMedia('(max-width: 900px)').matches);
    beginningEl.addEventListener('toggle', function () {
      global.requestAnimationFrame(applyInset);
    });
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

  /* How fast a butterfly on an errand should fly. A trail that spans four
     world units and one that spans forty should both take a few seconds to
     cross, so the speed comes from the size of the world rather than being a
     constant that quietly becomes a crawl as the archive grows. */
  function travelSpeed() {
    var b = trails.bounds();
    var span = Math.max(b.maxX - b.minX, b.maxY - b.minY, 1);
    return clamp(span / 3200, 0.0016, 0.009);
  }

  function spawnFly(opts) {
    opts = opts || {};
    var at = opts.at || offstage();
    return trails.spawn({
      x: at.x, y: at.y,
      tone: opts.tone || '#FFC46B',
      size: opts.size || 1,
      speed: opts.speed || travelSpeed(),
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
    if (trails.isReduced() || lens !== 'trails') return;
    var want = trails.quality() > 0.7 ? 2 : 1;
    while (ambient.length < want) {
      var f = spawnFly({ tone: '#FFC46B', size: 0.85, speed: travelSpeed() * 0.6, trailCap: 60 });
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
    if (trails.isReduced() || !ambient.length || lens !== 'trails') return;
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
      trails.toWorld(f, { speed: travelSpeed() * 0.6 });
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
        at: { x: f.x, y: f.y }, tone: f.tone, size: 0.7, speed: travelSpeed() * 0.7, trailCap: 50
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
      if (lens !== 'trails') return;
      var f = spawnFly({ tone: '#F1EEFB', size: 0.75, speed: travelSpeed() * 0.7, trailCap: 120 });
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
      global.setTimeout(function () { releaseEscort(1400); }, 6400);
      return;
    }

    var featured = pool.filter(function (s) { return s.featured; });
    var target = pick(featured.length ? featured : pool);
    whisper('Following ' + cat.name.toLowerCase() + '…', 3000);
    f.state = 'seeking';
    trails.flyTo(f, target.id, {
      onArrive: function () {
        go('#' + target.id);
        releaseEscort(1600);
      }
    });
  }

  /* A category chip sets the filter both lenses read. What happens next is
     the lens's own business: the canvas world sends a butterfly to fetch one
     of them, and the map flies you to the earliest of them, because opening
     a memory over a country you have just been shown is not an invitation to
     look at it. */
  function toggleCategory(catId) {
    if (filters.category === catId) { setFilters({ category: null }); return; }
    var pool = storiesIn(catId);
    if (pool.length) setFilters({ category: catId });

    if (lens === 'trails') { follow(catId); return; }

    var cat = catById[catId];
    if (!pool.length) { whisperPair(ARCHIVE.noStory, 2800); return; }
    whisper('Following ' + cat.name.toLowerCase() + '…', 3000);
    /* The same choice the canvas trail makes: a memory the archive wants
       read first if there is one, otherwise any of them. */
    var featured = pool.filter(function (s) { return s.featured; });
    var target = pick(featured.length ? featured : pool);
    if (atlas) atlas.follow({ tone: cat.tone, id: target.id });
  }

  function surprise() {
    releaseEscort(600);

    if (!stories.length) {
      /* Several of them search, briefly and without success. */
      var flock = [];
      var n = trails.isReduced() ? 1 : (trails.quality() > 0.7 ? 4 : 2);
      var b = trails.bounds();
      for (var i = 0; i < n; i++) {
        var f = spawnFly({
          tone: pick(categories).tone, size: 0.9, speed: travelSpeed(), trailCap: 70, state: 'searching'
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

    /* Surprise inside whatever the visitor has narrowed things to: a random
       memory that ignores their own filter is not a surprise, it is a bug. */
    var within = anyFilter() ? filtered() : ordered;
    var pool = within.filter(function (s) { return s.id !== view.story; });
    if (!pool.length) pool = within.length ? within : ordered;
    var target = pick(pool);
    whisper('Somewhere in ' + (whenOf(target) || 'the archive') + '…', 2800);
    if (lens !== 'trails') { go('#' + target.id); return; }
    var g = spawnFly({ tone: toneOf(target), size: 1.05, trailCap: 130, state: 'seeking' });
    escort = g;
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
      b.addEventListener('click', function () { toggleCategory(cat.id); });
      dockCats.appendChild(b);
    });
  }

  /* ============================================================== THE ERAS */
  function renderEras() {
    erasEl.textContent = '';
    var usable = eras.filter(function (e) {
      return ordered.some(function (s) { return eraOf(s) === e; });
    });
    erasEl.hidden = !usable.length;
    /* The rail's slot on a phone is shared with the people, so it is held
       open by either of them having something to say. */
    if (usable.length || !folkEl.hidden) body.setAttribute('data-eras', '1');
    else body.removeAttribute('data-eras');

    usable.forEach(function (e) {
      var b = el('button', 'era-btn', e.label);
      b.type = 'button';
      b.setAttribute('data-era', e.id);
      b.setAttribute('aria-pressed', 'false');
      b.setAttribute('aria-label', e.label + (e.line ? ' — ' + e.line : ''));
      if (e.line) b.title = e.line;
      b.addEventListener('click', function () { toggleEra(e); });
      erasEl.appendChild(b);
    });
  }

  function markEras() {
    [].slice.call(erasEl.querySelectorAll('.era-btn')).forEach(function (b) {
      b.setAttribute('aria-pressed',
        b.getAttribute('data-era') === filters.era ? 'true' : 'false');
    });
  }

  /* A decade is a filter now, not only a place to fly to — which is what
     lets it survive a change of lens. Pressing the one already chosen puts
     the whole archive back. */
  function toggleEra(e) {
    var next = filters.era === e.id ? null : e.id;
    setFilters({ era: next });
    if (!next) return;
    if (lens === 'trails') panToEra(e);
    else if (atlas) {
      atlas.showEra(e);
      whisper(e.label + (e.line ? ' — ' + e.line : ''), 3400);
    }
  }

  function panToStrand(id, opts) {
    opts = opts || {};
    var st = strandById[id];
    if (!st) return;
    if (lens !== 'trails') { setLens('trails', { silent: true, remember: false }); }
    if (view.mode !== 'trail') { go('#'); }
    var kind = (st.start && st.start.kind) || 'union';
    var p = trails.strandPoint(id, kind === 'origin' ? 0.25 : 0.6);
    if (!p) return;
    trails.panTo(p.x, p.y, 1.05, 1100);
    if (!opts.quiet) whisper(st.label + strandWhen(st), 3600);
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

  /* ==========================================================  THE LENSES
     Two readings of one archive, and the machinery that keeps them agreeing.

     A lens owns pixels and nothing else. Every question about what a memory
     is, which ones are showing, who is being followed and what happens when
     one is opened is answered here, once, and handed to whichever lens is
     currently up — which is what lets the visitor change their mind without
     losing their place.

     To add a third: one entry in LENSES, one object with the same six
     methods, and a renderer that can draw the same node list.
     ------------------------------------------------------------------- */
  var LENSES = [
    {
      id: 'trails',
      label: 'Trails',
      glyph: '✦',
      line: 'The braid, drawn on one dark plane.',
      /* What the door says. Shorter than `line` and written to sit beside
         the others, because at the gate the two are read against each
         other rather than one at a time. */
      door: 'The braid, on one dark plane.'
    },
    {
      id: 'atlas',
      label: 'Map',
      glyph: '✤',
      line: 'A trail map of one life. Every waypoint is a memory.',
      door: 'The same braid, on painted ground.'
    }
  ];
  var LENS_KEY = 'el-bt-lens';
  var lens = 'trails';

  /* The atlas is built once and left asleep. It costs nothing until it is
     activated: the country is not painted and no element is placed until
     somebody actually asks to look at it. */
  var atlas = ATLAS ? ATLAS.create(atlasEl) : null;
  if (!atlas) LENSES.length = 1;

  function lensOk(id) {
    for (var i = 0; i < LENSES.length; i++) if (LENSES[i].id === id) return true;
    return false;
  }
  function lensDef(id) {
    for (var i = 0; i < LENSES.length; i++) if (LENSES[i].id === id) return LENSES[i];
    return LENSES[0];
  }

  /* -------------------------------------------------- the shared filters
     Category, person and decade are the archive's state, not any lens's.
     Both lenses read them, and neither owns them, so switching lens is a
     change of drawing and never a change of what is being looked at. */
  var filters = { category: null, person: null, era: null };

  function anyFilter() {
    return !!(filters.category || filters.person || filters.era);
  }

  /* Category and decade genuinely narrow the archive. A person does not:
     following somebody turns their line up and the others down, and their
     family stays visible behind them, which is the point of a family. */
  function inFilters(s) {
    if (filters.category && s.category !== filters.category) return false;
    if (filters.era) {
      var e = eraOf(s);
      if (!e || e.id !== filters.era) return false;
    }
    return true;
  }
  function filtered() { return ordered.filter(inFilters); }

  /* What is currently narrowing or colouring the archive, in words. Used by
     the readout, the spoken announcement and the index's way out. */
  function filterWords() {
    var out = [];
    if (filters.category && catById[filters.category]) out.push(catById[filters.category].name);
    if (filters.era && eraById[filters.era]) out.push(eraById[filters.era].label);
    if (filters.person && strandById[filters.person]) {
      out.push('following ' + strandById[filters.person].label);
    }
    return out;
  }

  function setFilters(next, opts) {
    opts = opts || {};
    if ('category' in next) filters.category = next.category;
    if ('person' in next) filters.person = next.person;
    if ('era' in next) filters.era = next.era;
    applyFilters(opts);
  }

  function clearFilters() {
    if (!anyFilter()) return;
    setFilters({ category: null, person: null, era: null });
    whisper('Every memory, back on the trail.', 2800);
  }

  /* One pass that puts the filter state on every control and on whichever
     lens is drawing. Called after any change, and again after a lens change,
     so the two can never drift apart. */
  function applyFilters(opts) {
    opts = opts || {};
    markChips(filters.category);
    markFolk();
    markEras();
    updateCounts();

    var shown = filtered();
    var ids = null;
    if (anyFilter()) {
      ids = {};
      shown.forEach(function (s) { ids[s.id] = true; });
    }

    if (lens === 'trails') {
      /* The engine's spotlight already knows how to hold a subset up and let
         the rest fall back; a filter is the same gesture as a causal walk. */
      trails.spotlight(anyFilter() ? shown.map(function (s) { return s.id; }) : null);
    } else if (atlas) {
      atlas.setEmphasis({
        category: filters.category,
        person: filters.person,
        era: filters.era,
        ids: ids
      });
    }

    /* The index names what is currently narrowing the archive and offers the
       way out of it, so it has to be rebuilt when that changes — a list that
       still describes the last filter is worse than no list. */
    renderKeynav();

    if (!opts.quiet) {
      var words = filterWords();
      liveEl.textContent = words.length
        ? (filters.category || filters.era
            ? shown.length + ' of ' + stories.length + ' memories showing — ' + words.join(', ')
            : stories.length + ' memories showing — ' + words.join(', '))
        : 'All ' + stories.length + ' memories showing.';
    }
  }

  /* ---------------------------------------------------------- the switch */
  var lensFade = 0;

  function renderLenses() {
    lensesEl.textContent = '';
    if (LENSES.length < 2) { lensesEl.hidden = true; return; }
    LENSES.forEach(function (L) {
      var b = el('button', 'lens-btn');
      b.type = 'button';
      b.setAttribute('data-lens', L.id);
      b.setAttribute('aria-pressed', 'false');
      b.title = L.line;
      var g = el('span', 'lens-glyph', L.glyph);
      g.setAttribute('aria-hidden', 'true');
      b.appendChild(g);
      b.appendChild(el('span', 'lens-name', L.label));
      b.addEventListener('click', function () { setLens(L.id); });
      /* A segmented control is one thing with parts, so the arrow keys walk
         it the way they walk a tab strip. */
      b.addEventListener('keydown', function (e) {
        var d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1
              : (e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0);
        if (!d) return;
        e.preventDefault();
        var all = [].slice.call(lensesEl.querySelectorAll('.lens-btn'));
        var i = all.indexOf(b);
        var to = all[(i + d + all.length) % all.length];
        if (to) { to.focus(); to.click(); }
      });
      lensesEl.appendChild(b);
    });
  }

  function markLenses() {
    [].slice.call(lensesEl.querySelectorAll('.lens-btn')).forEach(function (b) {
      b.setAttribute('aria-pressed', b.getAttribute('data-lens') === lens ? 'true' : 'false');
    });
  }

  /* Where the map should open. Whatever the visitor was last looking at: the
     memory they have open, or failing that the whole country, which is what
     anybody wants from a map they have not seen before. */
  function atlasEntry() {
    if (view.story && byId[view.story]) return { at: view.story };
    return {};
  }

  function setLens(next, opts) {
    opts = opts || {};
    if (!lensOk(next)) next = LENSES[0].id;
    if (next === lens && !opts.force) return;
    lens = next;
    /* A link that names a layout borrows the trails lens for the length of
       that visit; it does not get to rewrite what the visitor prefers. */
    if (opts.remember !== false) store(LENS_KEY, lens);
    body.setAttribute('data-lens', lens);
    markLenses();
    global.clearTimeout(lensFade);

    if (lens === 'atlas' && atlas) {
      /* Nothing draws twice. The canvas world is put down before the paper
         is picked up. */
      releaseEscort(300);
      trails.stop();
      atlasEl.classList.add('entering');
      atlas.setWorld(lensWorld());
      atlas.setLights(lensLights());
      atlas.activate(atlasEntry());
      if (trails.isReduced()) atlasEl.classList.remove('entering');
      else {
        global.requestAnimationFrame(function () {
          global.requestAnimationFrame(function () {
            atlasEl.classList.remove('entering');
          });
        });
      }
      if (!opts.silent) whisper(lensDef('atlas').line, 4200);
    } else {
      if (atlas && atlas.isActive()) {
        atlasEl.classList.add('entering');
        var settle = trails.isReduced() ? 0 : 260;
        lensFade = global.setTimeout(function () {
          if (lens !== 'trails') return;
          atlas.deactivate();
          atlasEl.classList.remove('entering');
        }, settle);
      }
      trails.wake();
      trails.setMode(view.mode, { force: true, fit: !view.story });
      if (view.story && byId[view.story]) {
        trails.focus(view.story, { zoom: FOCUS_ZOOM[view.mode] || 1.35 });
      } else if (filters.era && eraById[filters.era]) {
        panToEra(eraById[filters.era]);
      } else if (filters.person) {
        panToStrand(filters.person, { quiet: true });
      }
      if (entered) startAmbient();
      if (!opts.silent) whisper(lensDef('trails').line, 3600);
    }

    applyFilters({ quiet: true });
    updateHint();
    global.requestAnimationFrame(applyInset);
  }

  /* ------------------------------------------- what a lens is handed
     The braid the canvas trail is drawn from, the archive's own places, and
     its own eras. A lens decides what to make of them; nothing here knows
     whether it is drawing a dark plane or a painted country, and no lens
     gets a second copy of anybody's dates. */
  function lensWorld() {
    var usable = eras.filter(function (e) {
      return ordered.some(function (s) { return eraOf(s) === e; });
    });
    var lowest = axisStart;
    lanes.forEach(function (l) { if (l.from < lowest) lowest = l.from; });

    /* How much of the archive each life carries. A lens may draw a line the
       record has more to say about a little more strongly. */
    var counts = {}, most = 1;
    ordered.forEach(function (s) {
      var k = storyStrand(s);
      counts[k] = (counts[k] || 0) + 1;
      if (counts[k] > most) most = counts[k];
    });

    return {
      places: DATA.places || [],
      laneW: 0.55,
      axis: { start: lowest, end: axisEnd },
      lanes: lanes.map(function (l) {
        return {
          id: l.id, label: l.label, tone: l.tone, side: l.side, base: l.base,
          startKind: l.startKind, endKind: l.endKind, joinTarget: l.joinTarget,
          fadeIn: l.startKind === 'begins',
          from: l.from, to: l.to, startsAt: l.startsAt, endsAt: l.endsAt,
          weight: (counts[l.id] || 0) / most
        };
      }),
      trunk: trunk ? trunk.id : null,
      married: braidCfg.marriedLabel || 'Married',
      decades: usable.map(function (e) {
        return { id: e.id, label: e.label, from: e.from, to: e.to,
                 t0: axisT(e.from === undefined ? axisStart : e.from),
                 t1: axisT(e.to === undefined ? axisEnd : e.to) };
      })
    };
  }

  /* How brightly a memory burns. Only signals the archive already carries —
     nothing here invents an importance nobody wrote down. */
  function weightOf(s) {
    var w = 0.16;
    if (s.featured) w += 0.46;
    if (s.chaosEvent) w += 0.2;
    if (s.images.length) w += 0.12;
    if (s.audio) w += 0.1;
    if (s.consequences.length) w += Math.min(0.16, s.consequences.length * 0.08);
    return clamp(w, 0, 1);
  }

  function lensLights() {
    return ordered.map(function (s) {
      var where = [whenOf(s), s.location].filter(Boolean).join(' · ');
      return {
        id: s.id,
        place: s.place || null,
        year: s.year,
        t: storyT(s),
        era: eraOf(s) ? eraOf(s).id : null,
        strand: storyStrand(s),
        tone: toneOf(s),
        title: s.title,
        when: whenOf(s),
        location: s.location || '',
        label: s.title + (where ? '. ' + where : '') + (s.hook ? '. ' + s.hook : ''),
        weight: weightOf(s),
        chaos: s.chaosEvent,
        classified: !!s.classified,
        ref: { id: s.id }
      };
    });
  }

  /* ------------------------------------------------------- the two events
     Both lenses report the same two things, and the room answers them the
     same way, so a memory opens identically however it was found. */
  if (atlas) {
    atlas.on('select', function (ref) { go('#' + ref.id); });
    atlas.on('hover', function (ref) {
      var s = byId[ref.id];
      if (!s) return;
      liveEl.textContent = s.title + '. ' + [standfirst(s), s.hook].filter(Boolean).join(' — ');
    });
    atlas.on('empty', function () {
      if (view.story) { go('#'); return; }
      if (anyFilter()) clearFilters();
    });
  }

  /* ============================================================= THE FOLK
     The family, as a rail. Only the people: the lines two of them become
     are relationships, and the archive draws those by putting two trails
     side by side rather than by giving them a button. */
  function folkStrands() {
    return strands.filter(function (st) {
      return ((st.start && st.start.kind) || 'union') !== 'union';
    });
  }

  function renderFolk() {
    folkEl.textContent = '';
    var who = folkStrands();
    if (who.length < 2) { folkEl.hidden = true; return; }
    folkEl.hidden = false;
    who.forEach(function (st) {
      var b = el('button', 'folk-btn', st.label);
      b.type = 'button';
      b.setAttribute('data-strand', st.id);
      b.setAttribute('aria-pressed', 'false');
      b.style.setProperty('--tone', st.tone);
      var n = ordered.filter(function (s) { return storyStrand(s) === st.id; }).length;
      b.setAttribute('aria-label',
        'Follow ' + st.label + ' — ' + (n ? n + (n === 1 ? ' memory' : ' memories') : 'no memories yet'));
      b.title = st.label + strandWhen(st);
      b.addEventListener('click', function () { togglePerson(st.id); });
      folkEl.appendChild(b);
    });
  }

  function markFolk() {
    [].slice.call(folkEl.querySelectorAll('.folk-btn')).forEach(function (b) {
      b.setAttribute('aria-pressed',
        b.getAttribute('data-strand') === filters.person ? 'true' : 'false');
    });
  }

  function togglePerson(id) {
    var next = filters.person === id ? null : id;
    setFilters({ person: next });
    if (!next) return;
    var st = strandById[id];
    if (lens === 'trails') panToStrand(id);
    else {
      if (atlas) atlas.showPerson(id);
      if (st) whisper(st.label + strandWhen(st), 3600);
    }
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

  /* ================================================================ PROSE
     A story is a list of paragraphs. Almost every one is a plain string and
     is set as a plain paragraph; a few are objects, for the places where the
     telling needs a beat the prose cannot carry on its own. Every kind here
     is general — none of them knows which story it is in. */
  /* A word the story turns on, marked *like this* in the data. Split on the
     asterisks and set every other piece warm — no parser, no dependency, and
     the data file still reads as plain sentences. */
  /* Inline marks, in one pass:

       *asterisks*        the room's warm emphasis
       [[story-id]]       a link to another memory, titled from the archive
       [[story-id|words]] the same, said in your own words

     A memory that refers to another one in the middle of a sentence should
     be able to go there, rather than making the reader find it in a list at
     the bottom. Emphasis is split per chunk, so a link between two emphasised
     words never inverts the ones after it. An id that is not in the archive
     is printed as plain text rather than as a dead control. */
  function setText(node, text) {
    String(text).split(/(\[\[[^\]]+\]\])/).forEach(function (chunk) {
      if (!chunk) return;
      var m = /^\[\[([^\]|]+)(?:\|([^\]]+))?\]\]$/.exec(chunk);
      if (m) {
        var id = m[1].trim();
        var said = (m[2] || '').trim();
        var target = byId[id];
        if (!target) {
          node.appendChild(doc.createTextNode(said || id));
          return;
        }
        var link = el('button', 'st-jump', said || target.title);
        link.type = 'button';
        link.setAttribute('aria-label', 'Read ' + target.title);
        link.addEventListener('click', function () { go('#' + id); });
        node.appendChild(link);
        return;
      }
      chunk.split('*').forEach(function (piece, i) {
        if (!piece) return;
        if (i % 2) node.appendChild(el('em', 'warm', piece));
        else node.appendChild(doc.createTextNode(piece));
      });
    });
    return node;
  }

  function renderProse(paragraphs, into) {
    paragraphs.forEach(function (p) {
      if (typeof p === 'string') { into.appendChild(setText(el('p'), p)); return; }
      if (!p) return;

      /* Any paragraph can say which stop of the journey it happens at. */
      function place(node) {
        if (p.at) node.setAttribute('data-at', p.at);
        into.appendChild(node);
        return node;
      }

      if (!p.kind) { place(setText(el('p'), p.text || '')); return; }

      if (p.kind === 'found') {
        /* Words read off a page. Set as they were seen, not as they are
           described — which is why they are a list and not a sentence. */
        var box = el('div', 'found');
        (p.items || []).forEach(function (item) {
          box.appendChild(el('p', null, item));
        });
        place(box);
        return;
      }

      if (p.kind === 'plan') {
        /* The idea, laid out with more confidence than it deserves. */
        if (p.lead) into.appendChild(el('p', 'plan-lead', p.lead));
        var ol = el('ol', 'plan');
        (p.items || []).forEach(function (item) { ol.appendChild(el('li', null, item)); });
        place(ol);
        return;
      }
      if (p.kind === 'heading') {
        /* A chapter break inside a long story. A real heading, so the
           outline of a long memory is navigable and not just visual. */
        place(el('h3', 'st-heading', p.text || ''));
        return;
      }
      if (p.kind === 'sound') {
        /* A noise, written down. Set in the mono face because it is being
           transcribed rather than said, and split on the spaces so each
           syllable can land after the one before it — which is the only way
           to write a rhythm in a paragraph. */
        var snd = el('p', 'sound');
        String(p.text || '').split(/\s+/).forEach(function (syl, i) {
          if (!syl) return;
          var s = el('span', 'syll', syl);
          s.style.transitionDelay = (0.12 * i) + 's';
          snd.appendChild(s);
        });
        place(snd);
        return;
      }
      if (p.kind === 'image') {
        /* A picture set in the telling rather than gathered at the end.
           It opens to full size like every other photograph in the room —
           a picture the reader cannot look at properly is half a picture.

           `mount: 'photo'` gives it the archive's found-photograph frame,
           tilted on its mount rather than in itself; anything else is a
           document or a diagram and gets the plain frame. Loaded lazily
           and given its real dimensions so the prose does not jump. */
        var asPhoto = p.mount === 'photo';
        var pic = el('figure', asPhoto ? 'photo inline' : 'st-figure');
        if (asPhoto) pic.style.setProperty('--tilt', (p.tilt || -0.9) + 'deg');

        var im = el('img');
        im.src = p.src || '';
        im.alt = p.alt || '';
        im.loading = 'lazy';
        im.decoding = 'async';
        if (p.width) im.setAttribute('width', p.width);
        if (p.height) im.setAttribute('height', p.height);

        var open = el('button', asPhoto ? 'photo-btn' : 'fig-art fig-open');
        open.type = 'button';
        open.appendChild(im);
        open.setAttribute('aria-label',
          'Look closer' + (p.caption ? ': ' + p.caption : ''));
        open.addEventListener('click', function () { openLightbox(p); });
        pic.appendChild(open);

        if (p.caption) {
          var fc = setText(el('figcaption'), p.caption);
          if (p.stamp) fc.appendChild(el('span', 'stamp', p.stamp));
          pic.appendChild(fc);
        }
        place(pic);
        return;
      }

      if (p.kind === 'poem') {
        /* Verse, kept as verse. Line breaks are the point, so they are not
           reflowed into a paragraph, and stanzas keep the air between them
           that the writer put there. */
        var poem = el('div', 'poem');
        if (p.title) poem.appendChild(el('p', 'poem-title', p.title));
        (p.stanzas || []).forEach(function (stanza) {
          var st = el('p', 'stanza');
          arr(stanza).forEach(function (line, i) {
            if (i) st.appendChild(el('br'));
            setText(st, line);
          });
          poem.appendChild(st);
        });
        if (p.by) poem.appendChild(el('p', 'poem-by', p.by));
        place(poem);
        return;
      }
      if (p.kind === 'figure') {
        /* A drawing the story needs and the room cannot compute — a chart,
           a diagram, a joke with axes. The SVG lives in the data file with
           the words, because it is content and not machinery. It is given
           role="img" and the `alt` text so it says the same thing to a
           reader who cannot see it. */
        var fig = el('figure', 'st-figure');
        var art = el('div', 'fig-art');
        art.innerHTML = p.svg || '';
        art.setAttribute('role', 'img');
        art.setAttribute('aria-label', p.alt || '');
        fig.appendChild(art);
        if (p.caption) fig.appendChild(setText(el('figcaption'), p.caption));
        place(fig);
        return;
      }
      if (p.kind === 'verse') {
        /* A line in another language, with what it means underneath rather
           than instead of it. The original is the bigger of the two on
           purpose: a translation is a gloss, not a replacement, and in this
           family the line and its meaning are not the same object. `lang`
           is set on the line itself so a screen reader stops reading Hindi
           as though it were English. */
        var v = el('div', 'verse');
        var vline = setText(el('p', 'verse-line'), p.text || '');
        if (p.lang) vline.setAttribute('lang', p.lang);
        v.appendChild(vline);
        if (p.meaning) v.appendChild(setText(el('p', 'verse-meaning'), p.meaning));
        place(v);
        return;
      }
      if (p.kind === 'dedication') {
        /* Who the telling was for. Set apart under a rule and given the
           end of the page to itself, because a memory written down for
           somebody who is gone is doing something the rest of the story
           is not. No movement beyond a fade: this is the one block in the
           room that should never perform. */
        var ded = el('div', 'dedication');
        ded.appendChild(setText(el('p', 'ded-for'), p.text || ''));
        if (p.line) ded.appendChild(setText(el('p', 'ded-line'), p.line));
        place(ded);
        return;
      }
      if (p.kind === 'reveal') {
        /* The line a story turns on. It arrives out of focus and resolves
           as it is reached, because that is what the moment felt like from
           the inside: the thing was already true, and then you could see
           it. The words are in the document from the start — only the
           focus is withheld — so nothing is hidden from a screen reader. */
        place(setText(el('p', 'reveal'), p.text || ''));
        return;
      }
      if (p.kind === 'shout') { place(el('p', 'shout', p.text || '')); return; }
      if (p.kind === 'beat') { place(el('p', 'beat', p.text || '')); return; }
      if (p.kind === 'landing') { place(el('p', 'landing', p.text || '')); return; }
      /* an unknown kind still has words in it */
      if (p.text) place(setText(el('p'), p.text));
    });
  }

  /* The shout and the jolt happen when they are read, not when the panel
     opens — and once each. Under reduced motion the classes still land and
     the stylesheet simply declines to move anything. */
  function armProse(scroll, story) {
    var marks = [].slice.call(
      scroll.querySelectorAll(
        '.shout, .beat, .landing, .sound, .reveal, .dedication'));
    var located = [].slice.call(scroll.querySelectorAll('[data-at]'));
    var strip = scroll.querySelector('.at-strip');

    if (!global.IntersectionObserver) {
      marks.forEach(function (m) { m.classList.add('seen'); });
      return;
    }

    if (marks.length) {
      var io = new global.IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('seen');
          io.unobserve(entry.target);
        });
      }, { root: scroll, threshold: 0.85 });
      marks.forEach(function (m) { io.observe(m); });
    }

    /* Where the telling currently is.

       This is a scrollspy, not a set of one-shot triggers: a memory can go
       back somewhere it has already been — which in this room is rather the
       point — so the stop is recomputed from the reading position rather
       than latched the first time a paragraph appears. Whichever located
       paragraph most recently passed the reading line is where we are; an
       observer would instead report whatever crossed its threshold last,
       which on a fast scroll runs ahead of the words being read. */
    if (strip && located.length && story) {
      var stopById = {};
      story.journey.forEach(function (st) { stopById[st.id] = st; });
      var current = null;
      var queued = false;

      function settle() {
        queued = false;
        var line = scroll.getBoundingClientRect().top + scroll.clientHeight * 0.6;
        var at = located[0];
        for (var i = 0; i < located.length; i++) {
          if (located[i].getBoundingClientRect().top <= line) at = located[i];
        }
        var id = at && at.getAttribute('data-at');
        if (!id || !stopById[id] || id === current) return;
        current = id;
        strip.update(stopById[id]);
        [].slice.call(scroll.querySelectorAll('.journey li')).forEach(function (li) {
          li.classList.toggle('here', li.getAttribute('data-stop') === id);
        });
      }

      scroll.addEventListener('scroll', function () {
        if (queued) return;
        queued = true;
        global.requestAnimationFrame(settle);
      }, { passive: true });

      /* The panel is still hidden while it is being built, so every
         rectangle in it measures zero. Wait for it to be on screen before
         asking where anything is. */
      global.requestAnimationFrame(settle);
    }
  }

  /* ---- where it happened ---- */
  /* A link out, never an embed: the map is somewhere else, and the memory
     stays here. A link the archive has already found and checked is used as
     given; without one a search is built, which is a guess and says so by
     being a search. Google takes `+` for spaces in that query. */
  function mapUrl(s) {
    if (!s.landmark) return null;
    if (s.landmark.url) return s.landmark.url;
    var q = s.landmark.query ||
      [s.landmark.name, s.location].filter(Boolean).join(' ');
    if (!q) return null;
    return 'https://www.google.com/maps/search/?api=1&query=' +
      encodeURIComponent(q).replace(/%20/g, '+');
  }

  function renderWhere(s, into) {
    if (!s.landmark && !s.location) return;
    var url = mapUrl(s);
    var bits = [];

    var line = el('p', 'st-where');
    var pin = el('span', 'pin', '📍');
    pin.setAttribute('aria-hidden', 'true');
    line.appendChild(pin);

    if (s.landmark && s.landmark.name) {
      if (url) {
        var a = el('a', 'where-link', s.landmark.name);
        a.href = url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.setAttribute('aria-label',
          'Find ' + s.landmark.name + (s.location ? ', ' + s.location : '') + ' on Google Maps, opens in a new tab');
        line.appendChild(a);
      } else {
        line.appendChild(el('span', null, s.landmark.name));
      }
      bits.push(true);
    }
    if (s.location) bits.push(s.location);
    var when = s.approximateDate || (s.year !== null ? String(s.year) : '');
    if (when) bits.push(when);

    /* whatever is left after the landmark, joined with the room's separator */
    var tail = bits.filter(function (b) { return b !== true; });
    if (tail.length) {
      line.appendChild(doc.createTextNode(
        (s.landmark && s.landmark.name ? ' · ' : '') + tail.join(' · ')));
    }
    into.appendChild(line);

    if (url) {
      var go = el('a', 'where-out');
      go.href = url;
      go.target = '_blank';
      go.rel = 'noopener noreferrer';
      go.textContent = 'See where this happened ↗';
      go.setAttribute('aria-label',
        'See where this happened on Google Maps, opens in a new tab');
      into.appendChild(go);
    }
  }

  /* ---- what it left behind ---- */
  function renderArtifact(s, into) {
    s.artifact.forEach(function (a) {
      if (!a || (!a.title && !a.line && !a.lines)) return;
      var sec = section(a.label || 'Memory artifact');
      var box = el('div', 'artifact');
      if (a.title) box.appendChild(el('p', 'art-title', a.title));
      (a.lines || []).forEach(function (l) {
        var row = el('p', 'art-reading');
        if (l.label) row.appendChild(el('span', 'art-key', l.label));
        row.appendChild(doc.createTextNode(l.text || ''));
        box.appendChild(row);
      });
      if (a.line) box.appendChild(el('p', 'art-line', a.line));
      sec.appendChild(box);
      into.appendChild(sec);
    });
  }

  /* ================================================================ JOURNEY
     Some memories do not sit in one place. They start somewhere, travel, and
     arrive — occasionally somewhere that is not a location at all: a person,
     a habit, a noise you can still make twenty years later.

     Two pieces render it. A strip that sticks to the top of the reading and
     says where the telling currently is, and a list at the end that lays the
     whole route out: the trail becomes visible when you look back at it,
     which is the point of the room. */
  function stopUrl(stop, s) {
    if (stop.url) return stop.url;
    var pl = stop.place && placeById[stop.place];
    if (!pl) return null;
    /* Region as well as country: 'Denver United States' is a worse search
       than 'Denver Colorado United States', and a place that carries a
       region carries it precisely because the name alone is ambiguous. */
    var q = [pl.name, pl.region, pl.country].filter(function (part, i, all) {
      return part && all.indexOf(part) === i;   /* China, China */
    }).join(' ');
    return 'https://www.google.com/maps/search/?api=1&query=' +
      encodeURIComponent(q).replace(/%20/g, '+');
  }

  function stopFlag(stop) {
    if (!stop.flag) return null;
    var f = el('span', 'stop-flag', stop.flag);
    f.setAttribute('aria-hidden', 'true');
    return f;
  }

  /* The strip. One line, and it follows the reading rather than the scroll
     position, so a paragraph that drags the story back across the world
     drags this with it. */
  function renderJourneyStrip(s) {
    var strip = el('div', 'at-strip');
    strip.setAttribute('aria-hidden', 'true');
    var inner = el('div', 'at-now');
    strip.appendChild(inner);
    strip.update = function (stop) {
      inner.textContent = '';
      if (!stop) return;
      var flag = stopFlag(stop);
      if (flag) inner.appendChild(flag);
      inner.appendChild(el('span', 'stop-label', stop.label || ''));
      if (stop.note) inner.appendChild(el('span', 'stop-note', stop.note));
      strip.setAttribute('data-arrival', stop.arrival ? '1' : '0');
      /* retrigger the fade without stacking animations */
      inner.classList.remove('moved');
      void inner.offsetWidth;
      inner.classList.add('moved');
    };
    strip.update(s.journey[0]);
    return strip;
  }

  function renderJourney(s, into) {
    if (!s.journey.length) return;
    var sec = section('The trail, looking back');
    var ul = el('ol', 'journey');

    s.journey.forEach(function (stop) {
      var li = el('li');
      if (stop.arrival) li.className = 'arrival';
      li.setAttribute('data-stop', stop.id || '');

      var head = el('div', 'stop-head');
      var flag = stopFlag(stop);
      if (flag) head.appendChild(flag);

      var url = stopUrl(stop, s);
      if (url) {
        var a = el('a', 'where-link', stop.label || '');
        a.href = url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.setAttribute('aria-label',
          'Find ' + (stop.label || 'this place') + ' on Google Maps, opens in a new tab');
        head.appendChild(a);
      } else {
        head.appendChild(el('span', 'stop-label', stop.label || ''));
      }
      li.appendChild(head);
      if (stop.note) li.appendChild(el('p', 'stop-note', stop.note));
      ul.appendChild(li);
    });

    sec.appendChild(ul);
    into.appendChild(sec);
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
      tone: '#FFC46B', size: 1.1, speed: travelSpeed() * 0.9, trailCap: 170, state: 'seeking'
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
    renderWhere(s, inner);

    /* What the reader is walking into. Above the telling rather than
       buried in it, because a warning that arrives late is not one. */
    if (s.warning && s.warning.length) {
      var warn = el('aside', 'st-warning');
      warn.setAttribute('role', 'note');
      var wmark = el('span', 'warn-mark', '⚠');
      wmark.setAttribute('aria-hidden', 'true');
      warn.appendChild(wmark);
      var wbody = el('div', 'warn-body');
      s.warning.forEach(function (line) {
        wbody.appendChild(setText(el('p'), line));
      });
      warn.appendChild(wbody);
      inner.appendChild(warn);
    }

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
      renderProse(s.story, bodyWrap);
      if (s.journey.length) {
        /* The strip and the body travel together, so the indicator stays put
           for exactly as long as there is story to read. */
        var travelling = el('div', 'travelling');
        travelling.appendChild(renderJourneyStrip(s));
        travelling.appendChild(bodyWrap);
        inner.appendChild(travelling);
      } else {
        inner.appendChild(bodyWrap);
      }
    } else {
      var pending = el('div', 'st-body');
      pending.appendChild(el('p', null,
        'This one has a title and not yet a telling. It is on the list.'));
      inner.appendChild(pending);
    }

    if (!s.classified) {
      renderJourney(s, inner);
      renderArtifact(s, inner);
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
    armProse(scroll, s);
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

  /* ================================================================ ESSAY
     The room explaining its own premise: where the idea comes from, what it
     actually says, and the film everybody actually knows it from. Content
     lives in the data module with the rest of the writing. */
  function renderEssay() {
    if (!ESSAY || essayEl.childNodes.length) return;

    var head = el('div', 'panel-head');
    head.appendChild(el('span', 'st-index', 'The idea'));
    var close = el('button', 'panel-close', 'Close');
    close.type = 'button';
    close.setAttribute('aria-label', 'Back to the trail');
    close.addEventListener('click', function () { go('#'); });
    head.appendChild(close);
    essayEl.appendChild(head);

    var scroll = el('div', 'panel-scroll');
    var inner = el('div', 'story-inner');

    var title = el('h2', 'st-title', ESSAY.title);
    title.tabIndex = -1;
    inner.appendChild(title);
    if (ESSAY.standfirst) inner.appendChild(el('p', 'st-hook', ESSAY.standfirst));

    (ESSAY.sections || []).forEach(function (sec, i) {
      var s = section(sec.heading);
      var body = el('div', 'st-body' + (i === 0 ? '' : ' plain'));
      /* The essay gets the same renderer the memories do, so it can carry a
         picture, a drawing or a link to a story like anything else in here. */
      renderProse(sec.paragraphs || [], body);
      s.appendChild(body);
      inner.appendChild(s);
    });

    if (ESSAY.sources && ESSAY.sources.length) {
      var ss = section('Sources');
      var ul = el('ul', 'sources');
      ESSAY.sources.forEach(function (src) {
        var li = el('li');
        if (src.url) {
          var a = el('a', null, src.label);
          a.href = src.url;
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
          li.appendChild(a);
        } else {
          li.textContent = src.label;
        }
        ul.appendChild(li);
      });
      ss.appendChild(ul);
      if (ESSAY.footnote) ss.appendChild(el('p', 'sources-note', ESSAY.footnote));
      inner.appendChild(ss);
    }

    var foot = el('div', 'st-foot');
    var back = el('button', 'bt-btn ghost', 'Back to the trail');
    back.type = 'button';
    back.addEventListener('click', function () { go('#'); });
    foot.appendChild(back);
    inner.appendChild(foot);

    scroll.appendChild(inner);
    essayEl.appendChild(scroll);
  }

  /* The premise is offered at the door. Pressing it is also a way in — it
     takes the lens the visitor last chose and opens the essay on arrival,
     so nobody has to answer the door question twice to read one page. */
  if (gateEssay) {
    gateEssay.textContent = (ESSAY && ESSAY.trigger) || 'What is the butterfly effect?';
    gateEssay.hidden = !ESSAY;
    gateEssay.addEventListener('click', function () {
      if (!ESSAY) return;
      lastFocus = null;
      enterRoom();
      go('#' + ESSAY.id);
    });
  }

  /* =============================================================== KEYNAV
     A real, focusable route through the archive for anyone not using a
     pointer. Hidden until it takes focus, then it becomes a visible list. */
  function renderKeynav() {
    keynavEl.textContent = '';
    keynavEl.appendChild(el('h2', null, 'Butterfly Trails index'));

    var ul = el('ul');
    function into(list, label, fn) {
      var li = el('li');
      var b = el('button', null, label);
      b.type = 'button';
      b.addEventListener('click', fn);
      li.appendChild(b);
      list.appendChild(li);
    }
    function add(label, fn) { into(ul, label, fn); }
    function group(title) {
      keynavEl.appendChild(el('h3', 'keynav-group', title));
      var list = el('ul');
      keynavEl.appendChild(list);
      return list;
    }

    if (view.story) add('← Back to the trail', function () { go('#'); });
    keynavEl.appendChild(ul);

    /* The memories come first. Somebody who opened this list opened it to
       find one of them, and the rest of the room is one tap away anyway. */
    if (ordered.length) {
      var mem = group('Memories');
      ordered.forEach(function (s) {
        var when = whenOf(s);
        into(mem, (when ? when + ' — ' : '') + s.title, function () { go('#' + s.id); });
      });
    }

    /* The lens comes before the layouts, because it decides whether the
       layouts mean anything. */
    if (LENSES.length > 1) {
      var lensList = group('Experience');
      LENSES.forEach(function (L) {
        into(lensList, L.label + (L.id === lens ? ' — showing' : '') + ' · ' + L.line,
          function () { setLens(L.id); });
      });
    }

    var room = group('The room');
    into(room, 'The trail', function () { go('#'); });
    into(room, 'The whole trail', function () { go('#whole-trail'); });
    into(room, 'Places', function () { go('#map'); });
    into(room, 'What is the butterfly effect?', function () { go('#' + ESSAY.id); });
    into(room, 'Surprise me', surprise);
    if (lens === 'atlas' && atlas) {
      into(room, 'See the whole country', function () { atlas.fit(700); });
    }
    if (anyFilter()) {
      into(room, 'Show every memory — clearing ' + filterWords().join(', '), clearFilters);
    }

    /* The braid is most of what there is to navigate while the archive is
       small, so it belongs in the route as much as the memories. */
    var braidList = group('The braid');
    strands.forEach(function (st) {
      var followable = ((st.start && st.start.kind) || 'union') !== 'union';
      var mine = filters.person === st.id;
      into(braidList,
        st.label + strandWhen(st) + (mine ? ' — following' : ''),
        followable ? function () { togglePerson(st.id); }
                   : function () { panToStrand(st.id); });
    });
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
    var open = !storyEl.hidden ? storyEl : (!essayEl.hidden ? essayEl : null);

    /* All the map needs to know is how much of the screen an open panel has
       taken off the top and bottom, so a waypoint is never framed underneath
       the sheet that is covering it. */
    if (atlas) {
      if (!open) atlas.setInset(0, 0);
      else {
        var mr = open.getBoundingClientRect();
        if (mr.width > W * 0.85) {
          atlas.setInset(mr.top > H - mr.bottom ? 0 : mr.bottom,
                         mr.top > H - mr.bottom ? H - mr.top : 0);
        } else atlas.setInset(0, 0);
      }
      /* The panel's size is only known after it is laid out, so a memory
         framed before that lands under the sheet. Re-frame it now that the
         free strip has actually been measured. */
      if (atlas.isActive() && view.story && byId[view.story]) atlas.focus(view.story);
    }
    if (lens !== 'trails') return;

    if (!open) {
      var top = plate.getBoundingClientRect().bottom;
      var dockTop = dockEl.getBoundingClientRect().top;
      var lower = dockTop > top ? dockTop : H;
      if (!beginningEl.hidden) {
        var br = beginningEl.getBoundingClientRect();
        if (br.top < lower) lower = br.top;
      }

      /* On a wide screen the era rail floats over the right edge, which is
         also where the strands write their names. Treat its edge as the
         boundary so the two never land on each other. */
      var right = W;
      if (!erasEl.hidden) {
        var er = erasEl.getBoundingClientRect();
        if (er.width && er.width < W * 0.5 && er.right > W * 0.6) right = er.left - 8;
      }

      trails.setInset(right / 2 - W / 2, (top + lower) / 2 - H / 2);
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
    if (!hash) return { mode: 'trail', story: null, essay: false };
    /* A memory always wins the name, so no route can shadow one. */
    if (byId[hash]) return { mode: view.mode, story: hash, essay: false };
    var lower = hash.toLowerCase();
    for (var id in byId) {
      if (id.toLowerCase() === lower) return { mode: view.mode, story: id, essay: false };
    }
    if (ESSAY && lower === ESSAY.id) return { mode: view.mode, story: null, essay: true };
    /* A link that names a layout is a link into the trails lens: `viaView`
       says so, and apply() honours it over whatever lens was remembered. */
    if (VIEW_HASH[lower]) {
      return { mode: VIEW_HASH[lower], story: null, essay: false, viaView: true };
    }
    return { mode: 'trail', story: null, essay: false };
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
    var hadEssay = view.essay;
    view = next;
    body.setAttribute('data-view', next.mode);

    /* Asking for a layout by name asks for the lens that has layouts. */
    if (next.viaView && lens !== 'trails') setLens('trails', { silent: true, remember: false });

    if (lens === 'trails') trails.setMode(next.mode, { fit: !next.story });
    markViews();
    if (next.mode !== hadMode) noteMode(next.mode);

    if (next.essay && ESSAY) {
      renderEssay();
      essayEl.hidden = false;
      storyEl.hidden = true;
      body.setAttribute('data-panel', '1');
      doc.title = ESSAY.title + ' — Butterfly Trails — Entropic Labs';
      trails.clearFocus();
      if (atlas) atlas.clearFocus();
      beginningEl.hidden = true;
      var eh = essayEl.querySelector('.st-title');
      if (eh && !hadEssay) global.requestAnimationFrame(function () { eh.focus(); });
      renderKeynav();
      global.requestAnimationFrame(applyInset);
      return;
    }
    essayEl.hidden = true;

    if (next.story && byId[next.story]) {
      var s = byId[next.story];
      var heading = renderStory(s);
      storyEl.hidden = false;
      body.setAttribute('data-panel', '1');
      doc.title = s.title + ' — Butterfly Trails — Entropic Labs';
      /* How close to go depends on what the view is for: the trail is a
         reading position, the constellation is a shape you would lose by
         zooming into it, the map is a place. */
      if (lens === 'trails') trails.focus(s.id, { zoom: FOCUS_ZOOM[next.mode] || 1.35 });
      else if (atlas) atlas.focus(s.id);
      trails.hideGhostBranch();
      beginningEl.hidden = true;
      if (hadStory !== next.story) {
        global.requestAnimationFrame(function () { heading.focus(); });
      }
      liveEl.textContent = s.title + '. ' + (s.hook || '');

      /* Arriving somewhere. The camera has already flown to the memory; this
         is the room quietly naming the place it has landed in. */
      if (hadStory !== next.story) {
        var arriving = [s.location, s.approximateDate || (s.year !== null ? s.year : '')]
          .filter(Boolean).join(' · ');
        if (arriving) whisper(arriving, 4200);
      }
    } else {
      storyEl.hidden = true;
      storyEl.textContent = '';
      body.removeAttribute('data-panel');
      trails.clearFocus();
      if (atlas) atlas.clearFocus();
      /* Closing a memory returns to whatever the visitor had narrowed the
         archive to, not to the whole of it. */
      applyFilters({ quiet: true });
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

  /* The doors. Which lens you arrive in is the first thing the room asks,
     because it is a real choice and not a setting: the same archive, drawn
     two ways, and either can be swapped for the other from inside. Built
     from LENSES so the question stays true if a third one is ever added,
     and skipped entirely when there is only one way in — a choice of one
     is not a choice. */
  function renderDoors() {
    gateDoors.textContent = '';
    var many = LENSES.length > 1;
    gateChoose.hidden = !many;
    if (many) gateChoose.textContent = 'Two ways in. The same archive either way.';

    var last = store(LENS_KEY);
    var marked = many && lensOk(last);
    if (marked) gateDoors.setAttribute('data-marked', '1');
    else gateDoors.removeAttribute('data-marked');

    LENSES.forEach(function (L) {
      var b = el('button', 'gate-door');
      b.type = 'button';
      b.setAttribute('data-lens', L.id);

      var g = el('span', 'gate-door-glyph', L.glyph);
      g.setAttribute('aria-hidden', 'true');
      b.appendChild(g);

      var t = el('span', 'gate-door-text');
      t.appendChild(el('span', 'gate-door-name', many ? L.label : 'Follow the trail'));
      t.appendChild(el('span', 'gate-door-line', L.door || L.line));
      b.appendChild(t);

      /* Marked, not chosen for them: the door they came out of last time
         still has to be pushed. It says what it means — a one-word chip
         reading LAST is a label only the person who wrote it understands. */
      if (marked && last === L.id) {
        b.setAttribute('data-last', '1');
        t.appendChild(el('span', 'gate-door-last', 'Recently selected'));
      }

      b.addEventListener('click', function () { enterRoom(L.id); });
      b.addEventListener('keydown', function (e) {
        var d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1
              : (e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0);
        if (!d) return;
        e.preventDefault();
        var all = [].slice.call(gateDoors.querySelectorAll('.gate-door'));
        var i = all.indexOf(b);
        var to = all[(i + d + all.length) % all.length];
        if (to) to.focus();
      });
      gateDoors.appendChild(b);
    });
  }

  /* Opening the doors is the end of the intro, so the way past the intro
     goes away with it. */
  function openDoors(settleLine) {
    /* Skipping ahead settles the line as well, so nothing arrives from
       behind once the doors are up. A returning visitor gets no line at
       all, and does not want one produced for them here. */
    if (settleLine && !gateLine.textContent && ARCHIVE.openingLines[0]) {
      gateLine.textContent = ARCHIVE.openingLines[0];
      gateLine.classList.add('on');
    }
    gate.querySelector('.gate-actions').classList.add('on');
    /* Hiding the button the keyboard is standing on would drop focus to the
       document, so where SKIP INTRO was the thing being used, the doors it
       opened take the focus it had. Nothing is stolen otherwise: on the
       timer, the doors simply appear. */
    var hadFocus = doc.activeElement === gateSkip;
    gateSkip.hidden = true;
    if (!hadFocus) return;
    var first = gateDoors.querySelector('.gate-door[data-last]')
             || gateDoors.querySelector('.gate-door');
    if (first) first.focus();
  }

  function runGate(full) {
    body.setAttribute('data-gate', '1');
    gate.hidden = false;
    renderDoors();

    if (trails.isReduced()) {
      /* Nothing moves. Everything is said at once, and the visitor decides
         when to go in. */
      gateLine.textContent = ARCHIVE.openingLines[0] || '';
      gateLine.classList.add('on');
      openDoors();
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
      /* A returning visitor gets the title, one butterfly, and the doors
         already open: no lines to sit through. With one lens there is
         nothing to answer and the room simply arrives; with two, the
         question is worth the tap, and their last door is marked. */
      gateLine.textContent = '';
      openDoors();
      if (LENSES.length < 2) global.setTimeout(enterRoom, 1500);
      return;
    }

    global.setTimeout(function () {
      gateLine.textContent = ARCHIVE.openingLines[0] || '';
      gateLine.classList.add('on');
    }, 2400);
    global.setTimeout(openDoors, 4200);
  }

  var entered = false;
  /* `pick` is the door that was pushed. The lens is set while the gate is
     still up, so whichever world was chosen is already drawn behind it and
     the room is there the moment the gate clears. Set before `entered`, so
     setLens leaves the arrival — the fit, the ambient butterflies, the
     word of welcome — to the branch below rather than doing half of it
     early. */
  function enterRoom(pick) {
    if (entered || gate.hidden) return;
    /* The gate's butterfly is let go first: choosing the map puts the canvas
       world down, and a butterfly still holding a flight path when that
       happens would freeze in place on a fading gate. */
    if (gateFly) { trails.release(gateFly, 900); gateFly = null; }
    if (typeof pick === 'string' && lensOk(pick)) setLens(pick, { silent: true });
    entered = true;
    gate.classList.add('leaving');
    store(SEEN_KEY, '1');
    global.setTimeout(function () {
      gate.hidden = true;
      body.removeAttribute('data-gate');
      applyInset();
    }, trails.isReduced() ? 0 : 900);

    if (lens === 'trails') {
      trails.fit(trails.isReduced() ? 1 : 1600);
      startAmbient();
      maybeRareVisitor();
    } else {
      /* The gate's own butterfly was drawn on the canvas world. Now that the
         room is open and the landscape is the one being looked at, that
         world stops entirely. */
      trails.stop();
    }

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

  /* Skipping the intro is skipping the lines, not the question: it brings
     the doors forward rather than picking one. */
  gateSkip.addEventListener('click', function () { openDoors(true); });
  gate.addEventListener('click', function (e) {
    if (e.target !== gate) return;
    if (gateSkip.hidden) enterRoom();
    else openDoors(true);
  });

  /* ============================================================== EVENTS */
  trails.on('select', function (ref) {
    /* A joint in the braid is not a memory and has no record to open. It
       says what it is and leaves it at that. */
    if (ref.marker) { whisper(ref.note, 4600); return; }
    go('#' + ref.id);
  });

  trails.on('hover', function (ref) {
    if (!ref) return;
    if (ref.marker) { liveEl.textContent = ref.note; return; }
    var s = byId[ref.id];
    if (!s) return;
    var line = [standfirst(s), s.hook].filter(Boolean).join(' — ');
    liveEl.textContent = s.title + '. ' + line;
  });

  trails.on('empty', function () {
    if (view.story) { go('#'); return; }
    if (anyFilter()) { clearFilters(); return; }
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

  /* ---- the index, opened on purpose -------------------------------------
     Every memory on the trail is an anonymous dot until it is hovered or
     opened, which is right for wandering and wrong for looking something
     up — and on a touch screen there is no hover at all. The keyboard list
     was already the answer; it just had no visible way in. */
  function setIndex(open) {
    keynavEl.classList.toggle('open', open);
    indexBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) {
      var first = keynavEl.querySelector('button');
      if (first) first.focus();
    }
  }
  function indexOpen() { return keynavEl.classList.contains('open'); }

  indexBtn.addEventListener('click', function () {
    lastFocus = indexBtn;
    setIndex(!indexOpen());
  });

  /* Choosing a memory from the list has done the list's job. */
  keynavEl.addEventListener('click', function (e) {
    if (e.target && e.target.tagName === 'BUTTON') setIndex(false);
  });

  /* Anywhere else, and it gets out of the way. */
  doc.addEventListener('pointerdown', function (e) {
    if (!indexOpen()) return;
    if (keynavEl.contains(e.target) || indexBtn.contains(e.target)) return;
    setIndex(false);
  }, true);

  doc.addEventListener('keydown', function (e) {
    if (e.defaultPrevented) return;
    var tag = (e.target && e.target.tagName) || '';
    if (e.key === 'Escape') {
      if (indexOpen()) { setIndex(false); indexBtn.focus(); return; }
      if (!lightboxEl.hidden) { closeLightbox(); return; }
      if (!gate.hidden) { enterRoom(); return; }
      if (view.story || view.essay) go('#');
      return;
    }
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (!gate.hidden) return;

    /* V walks the lenses. The map has a camera of its own and binds its own
       arrows, zoom and 0-to-fit on the element that has focus, so nothing
       below should reach across and move the other lens's camera instead. */
    if (e.key === 'v' || e.key === 'V') {
      var ids = LENSES.map(function (L) { return L.id; });
      setLens(ids[(ids.indexOf(lens) + 1) % ids.length]);
      return;
    }
    if (lens !== 'trails') {
      if (e.key === 's' || e.key === 'S') surprise();
      return;
    }

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
    resizeTimer = global.setTimeout(relayout, 140);
  });
  global.addEventListener('orientationchange', function () {
    global.setTimeout(relayout, 280);
  });

  function relayout() {
    trails.resize();
    if (lens !== 'trails') trails.stop();
    if (atlas) atlas.resize();
    applyInset();
  }

  /* trails.js wakes its own loop when the tab comes back. This listener is
     registered later, so it runs after that one and puts the sleeping lens
     back to sleep. */
  doc.addEventListener('visibilitychange', function () {
    if (!doc.hidden && lens !== 'trails') trails.stop();
  });

  /* ================================================================= BOOT */
  renderDock();
  renderViews();
  renderLenses();
  renderFolk();
  renderEras();
  updateCounts();
  updateHint();
  renderKeynav();

  var initial = resolve(global.location.hash);
  body.setAttribute('data-lens', lens);
  apply(initial);

  /* The lens the visitor last chose, unless the link they followed asks for
     one of the trails layouts by name. A remembered preference is a
     preference, not an override. */
  (function restoreLens() {
    var want = initial.viaView ? 'trails' : store(LENS_KEY);
    if (want && lensOk(want) && want !== lens) {
      setLens(want, { silent: true, remember: !initial.viaView });
    }
    else { markLenses(); applyFilters({ quiet: true }); }
  })();

  if (gateMark) gateMark.textContent = ARCHIVE.beforeTheFinite || '';

  /* Arriving at a memory means skipping the way in — you came for the
     story, not the doorway. */
  if (initial.story || initial.essay) {
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
