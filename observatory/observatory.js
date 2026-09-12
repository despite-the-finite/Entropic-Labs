/* Entropic Labs — Observatory controller.
   ==========================================================================
   Owns the state machine, the URL, the panels and the telemetry tick. The
   star field draws and reports; this decides what any of it means.

   Views
     field     the whole chart. Categories lit, observations faint.
     category  one area of curiosity. Camera in, catalogue panel open.
     record    one observation. Camera on the object, record panel open.

   The URL is the state:
     observatory.html                 field
     observatory.html#lost-civilizations
     observatory.html#obs-0047
     observatory.html#unidentified
   so every record is linkable and the browser's back button does the
   obvious thing.
   ========================================================================== */

(function (global) {
  'use strict';

  var DATA = global.OBSERVATORY_DATA;
  var TELEM = global.OBSERVATORY_TELEMETRY;
  var FIELD = global.OBSERVATORY_FIELD;
  if (!DATA || !TELEM || !FIELD) return;

  var TAU = Math.PI * 2;
  var ANOMALY_HASH = 'unidentified';

  var doc = document;
  var body = doc.body;

  /* ------------------------------------------------------------ helpers */
  function $(sel) { return doc.querySelector(sel); }
  function el(tag, cls, text) {
    var n = doc.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null) n.textContent = text;
    return n;
  }
  function hashString(s) {
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return ((h >>> 0) % 100000) / 100000;
  }
  function isAnomaly(obs) { return obs && obs.special === 'anomaly'; }
  function hashFor(obs) {
    return isAnomaly(obs) ? ANOMALY_HASH : obs.id.toLowerCase();
  }
  function designationOf(obs) {
    if (obs.designation) return obs.designation;
    return obs.id.replace(/^OBS-/, '');
  }

  /* ------------------------------------------------------------- indexes */
  var categories = DATA.categories;
  var observations = DATA.observations;
  var byId = {};
  var byCategory = {};
  var realObservations = [];

  categories.forEach(function (c) { byCategory[c.id] = []; });
  observations.forEach(function (o) {
    byId[o.id] = o;
    if (isAnomaly(o)) return;
    realObservations.push(o);
    (byCategory[o.category] || (byCategory[o.category] = [])).push(o);
  });
  var anomaly = observations.filter(isAnomaly)[0] || null;

  /* --------------------------------------------------------------- nodes */
  function buildNodes() {
    var list = [];

    categories.forEach(function (cat, ci) {
      list.push({
        id: cat.id,
        kind: 'category',
        label: cat.name.toUpperCase(),
        designation: 'FIELD ' + (ci + 1 < 10 ? '0' : '') + (ci + 1),
        meta: (byCategory[cat.id] || []).length + ' CATALOGUED',
        x: cat.pos.x,
        y: cat.pos.y,
        magnitude: cat.magnitude || 1,
        ref: { type: 'category', id: cat.id }
      });

      var kids = byCategory[cat.id] || [];
      var phase = hashString(cat.id) * TAU;
      kids.forEach(function (obs, i) {
        /* Even spacing round the parent with a deterministic wobble, so a
           constellation looks drawn rather than generated — and so adding an
           observation rebalances the ring instead of piling up on one side. */
        var jitter = (hashString(obs.id) - 0.5) * 0.55;
        var angle = phase + (i / Math.max(1, kids.length)) * TAU + jitter;
        list.push({
          id: obs.id,
          kind: 'observation',
          label: obs.title.toUpperCase(),
          designation: designationOf(obs),
          angle: angle,
          ringT: (i % 2) * 0.55 + hashString(obs.id + 'r') * 0.4,
          labelBelow: Math.sin(angle) > 0,
          parent: cat.id,
          ref: { type: 'observation', id: obs.id }
        });
      });
    });

    if (anomaly) {
      list.push({
        id: anomaly.id,
        kind: 'anomaly',
        label: '',
        designation: anomaly.designation || '',
        x: anomaly.pos ? anomaly.pos.x : 1,
        y: anomaly.pos ? anomaly.pos.y : 0.3,
        ref: { type: 'observation', id: anomaly.id }
      });
    }

    return list;
  }

  /* ------------------------------------------------------------- the room */
  var canvas = $('#sky');
  var field = FIELD.create(canvas);
  field.setNodes(buildNodes());

  var plate = $('.plate');
  var catalogEl = $('#catalog');
  var recordEl = $('#record');
  var syslogEl = $('#syslog');
  var coordsEl = $('#coords');
  var statusEl = $('#status');
  var statusBody = $('#status-body');
  var statusClock = $('#status-clock');
  var keynavEl = $('#keynav');
  var observeBtn = $('#observe');
  var backBtn = $('#back-field');

  var view = { mode: 'field', category: null, observation: null };

  /* ---------------------------------------------------------- system log */
  var logTimer = 0;
  var lastLog = 0;
  function say(msg, hold) {
    var t = Date.now();
    if (msg === syslogEl.textContent && t - lastLog < 1200) return;
    lastLog = t;
    syslogEl.textContent = msg;
    syslogEl.classList.add('on');
    global.clearTimeout(logTimer);
    logTimer = global.setTimeout(function () {
      syslogEl.classList.remove('on');
    }, hold || 2400);
  }

  /* An occasional note while nothing is happening. Restrained on purpose —
     one line every half minute or so, never while a panel is open. */
  var IDLE_NOTES = [
    'FIELD STABLE', 'INTEGRATING', 'PARALLAX NOMINAL',
    'NO NEW SOURCES', 'DRIFT CORRECTED', 'LISTENING'
  ];
  var idleAt = Date.now();
  function idleTick() {
    if (doc.hidden) return;
    if (view.mode !== 'field') return;
    if (Date.now() - idleAt < 30000) return;
    idleAt = Date.now();
    say(IDLE_NOTES[Math.floor(Math.random() * IDLE_NOTES.length)], 3000);
  }

  /* ------------------------------------------------------------ telemetry */
  var statusRows = [];
  function buildStatus() {
    var rows = TELEM.read(new Date(), realObservations.length);
    statusBody.textContent = '';
    statusRows = rows.map(function (r) {
      var row = el('div', 'status-row');
      if (r.meter) row.setAttribute('data-meter', '');
      row.appendChild(el('span', 'status-key', r.key));
      var val = el('span', 'status-val');
      var main = el('span', null, r.value);
      val.appendChild(main);
      var sub = null;
      if (r.sub) { sub = el('span', 'status-sub', r.sub); val.appendChild(sub); }
      row.appendChild(val);
      statusBody.appendChild(row);
      return { main: main, sub: sub };
    });

    var note = el('p', 'status-note');
    note.appendChild(el('b', null, 'Live'));
    note.appendChild(doc.createTextNode(' from this device’s clock. '));
    note.appendChild(el('b', null, 'Computed'));
    note.appendChild(doc.createTextNode(
      ' here in the browser — lunar phase by standard astronomical solution, Voyager’s range extrapolated from a published reference position. '));
    note.appendChild(el('b', null, 'Nominal'));
    note.appendChild(doc.createTextNode(
      ' values are published constants. No network calls, no telescope.'));
    statusBody.appendChild(note);
  }

  function tickStatus() {
    if (doc.hidden) return;
    /* The clock in the summary runs whether the panel is open or shut — on a
       phone the panel starts collapsed and the time is the reason to look. */
    var clock = TELEM.clock(new Date());
    if (statusClock.textContent !== clock.local) statusClock.textContent = clock.local;
    if (!statusEl.open) return;

    var rows = TELEM.read(new Date(), realObservations.length);
    for (var i = 0; i < rows.length && i < statusRows.length; i++) {
      if (statusRows[i].main.textContent !== rows[i].value) {
        statusRows[i].main.textContent = rows[i].value;
      }
      if (statusRows[i].sub && rows[i].sub && statusRows[i].sub.textContent !== rows[i].sub) {
        statusRows[i].sub.textContent = rows[i].sub;
      }
    }
  }

  /* ------------------------------------------------------------- readout */
  field.on('coords', function (c) {
    coordsEl.textContent = '';
    coordsEl.appendChild(el('b', null, 'RA '));
    coordsEl.appendChild(doc.createTextNode(c.ra + '  '));
    coordsEl.appendChild(el('b', null, 'DEC '));
    coordsEl.appendChild(doc.createTextNode(c.dec));
  });

  var hoverSaid = null;
  field.on('hover', function (ref) {
    if (!ref) { hoverSaid = null; return; }
    if (hoverSaid === ref.id) return;
    hoverSaid = ref.id;
    idleAt = Date.now();
    if (ref.type === 'observation' && isAnomaly(byId[ref.id])) say('NO MATCH FOUND');
    else say('TRACKING');
  });

  field.on('select', function (ref) {
    if (ref.type === 'category') go('#' + ref.id);
    else go('#' + hashFor(byId[ref.id]));
  });

  field.on('empty', function () {
    idleAt = Date.now();
    if (view.mode === 'field') say('NO MATCH FOUND');
    else go('#');
  });

  /* ============================================================== PANELS */

  function statusTone(status) {
    return DATA.statusTone[status] || 'ash';
  }

  /* ---------- catalogue ---------- */
  function renderCatalog(catId) {
    var cat = null;
    for (var i = 0; i < categories.length; i++) if (categories[i].id === catId) cat = categories[i];
    if (!cat) return;

    catalogEl.textContent = '';

    var head = el('div', 'panel-head');
    var main = el('div');
    var idx = el('span', 'cat-index',
      'FIELD ' + (categories.indexOf(cat) + 1 < 10 ? '0' : '') + (categories.indexOf(cat) + 1) +
      ' · ' + (byCategory[cat.id] || []).length + ' CATALOGUED');
    main.appendChild(idx);
    var h = el('h2', null, cat.name);
    main.appendChild(h);
    main.appendChild(el('p', 'cat-line', cat.line));
    head.appendChild(main);

    var close = el('button', 'panel-close', 'Close');
    close.type = 'button';
    close.setAttribute('aria-label', 'Return to the Observatory');
    close.addEventListener('click', function () { go('#'); });
    head.appendChild(close);
    catalogEl.appendChild(head);

    var scroll = el('div', 'panel-scroll');
    var ul = el('ul', 'cat-list');
    (byCategory[cat.id] || []).forEach(function (obs) {
      var li = el('li');
      var btn = el('button', 'cat-item');
      btn.type = 'button';
      var pip = el('span', 'pip');
      pip.setAttribute('data-tone', statusTone(obs.status));
      btn.appendChild(pip);
      var mid = el('div', 'ci-main');
      mid.appendChild(el('span', 'ci-title', obs.title));
      mid.appendChild(el('span', 'ci-sub', designationOf(obs) + ' · ' + obs.status));
      btn.appendChild(mid);
      btn.appendChild(el('span', 'ci-go', '→'));
      btn.addEventListener('click', function () { go('#' + hashFor(obs)); });
      li.appendChild(btn);
      ul.appendChild(li);
    });
    scroll.appendChild(ul);
    catalogEl.appendChild(scroll);
  }

  /* ---------- record ---------- */
  function metaRow(dl, key, value) {
    if (!value) return;
    var row = el('div', 'row');
    row.appendChild(el('dt', null, key));
    row.appendChild(el('dd', null, value));
    dl.appendChild(row);
  }

  function section(title) {
    var s = el('section', 'rec-section');
    s.appendChild(el('h3', null, title));
    return s;
  }

  function renderRecord(obs) {
    recordEl.textContent = '';
    recordEl.className = 'panel record' + (isAnomaly(obs) ? ' anomaly' : '');

    var cat = null;
    for (var i = 0; i < categories.length; i++) if (categories[i].id === obs.category) cat = categories[i];

    /* head */
    var head = el('div', 'panel-head');
    head.appendChild(el('span', 'rec-desig',
      isAnomaly(obs) ? 'OBSERVATION ——' : 'OBSERVATION ' + designationOf(obs)));
    var close = el('button', 'panel-close', 'Close');
    close.type = 'button';
    close.setAttribute('aria-label', 'Return to the Observatory');
    close.addEventListener('click', function () { go(cat && !isAnomaly(obs) ? '#' + cat.id : '#'); });
    head.appendChild(close);
    recordEl.appendChild(head);

    var scroll = el('div', 'panel-scroll');
    var inner = el('div', 'record-inner');

    inner.appendChild(el('h2', 'rec-title', obs.title));

    var st = el('p', 'rec-status');
    var pip = el('span', 'pip');
    pip.setAttribute('data-tone', statusTone(obs.status));
    st.appendChild(pip);
    st.appendChild(doc.createTextNode(obs.status));
    inner.appendChild(st);

    /* meta */
    var dl = el('dl', 'rec-meta');
    metaRow(dl, 'Detected', obs.detected);
    metaRow(dl, 'Location', obs.location);
    metaRow(dl, 'Age', obs.age);
    var coords = field.coordsFor(obs.id);
    if (coords) metaRow(dl, 'Coordinates', coords.ra + '  ' + coords.dec);
    if (cat && !isAnomaly(obs)) metaRow(dl, 'Field', cat.name);
    inner.appendChild(dl);

    /* body */
    var bodyWrap = el('div', 'rec-body');
    (obs.summary || []).forEach(function (p) { bodyWrap.appendChild(el('p', null, p)); });
    inner.appendChild(bodyWrap);

    if (isAnomaly(obs)) {
      inner.appendChild(anomalyPlate());
    } else {
      var why = section('Why it matters');
      var whyBox = el('div', 'rec-why');
      whyBox.appendChild(el('p', null, obs.whyItMatters));
      why.appendChild(whyBox);
      inner.appendChild(why);
    }

    /* certainty */
    if (obs.certainty && obs.certainty.length) {
      var cs = section(isAnomaly(obs) ? 'Confidence' : 'What is known, and how well');
      var ul = el('ul', 'certainty');
      obs.certainty.forEach(function (c) {
        var li = el('li');
        var tag = el('span', 'tag', c.label);
        tag.setAttribute('data-k', c.label);
        li.appendChild(tag);
        li.appendChild(el('p', null, c.text));
        ul.appendChild(li);
      });
      cs.appendChild(ul);
      inner.appendChild(cs);
    }

    /* related */
    var rel = (obs.related || []).map(function (id) { return byId[id]; }).filter(Boolean);
    if (rel.length) {
      var rs = section('Related observations');
      var wrap = el('div', 'related');
      rel.forEach(function (r) {
        var b = el('button', 'rel-item');
        b.type = 'button';
        b.appendChild(el('span', 'rl-title', r.title));
        b.appendChild(el('span', 'rl-id', designationOf(r)));
        b.addEventListener('click', function () { go('#' + hashFor(r)); });
        wrap.appendChild(b);
      });
      rs.appendChild(wrap);
      inner.appendChild(rs);
    }

    /* sources */
    if (obs.sources && obs.sources.length) {
      var ss = section('Sources');
      var sl = el('ul', 'sources');
      obs.sources.forEach(function (s) {
        var li = el('li');
        if (s.url) {
          var a = el('a', null, s.label);
          a.href = s.url;
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
          li.appendChild(a);
        } else {
          li.textContent = s.label;
        }
        sl.appendChild(li);
      });
      ss.appendChild(sl);
      ss.appendChild(el('p', 'sources-note',
        'Citations name the specific work. Links point at the publishing journal or institution rather than a deep link, because those keep working.'));
      inner.appendChild(ss);
    }

    /* foot */
    var foot = el('div', 'rec-foot');
    var back = el('button', 'obs-btn ghost', 'Return to Observatory');
    back.type = 'button';
    back.addEventListener('click', function () { go('#'); });
    foot.appendChild(back);

    var next = el('button', 'obs-btn');
    next.type = 'button';
    var dot = el('span', 'dot');
    next.appendChild(dot);
    next.appendChild(doc.createTextNode('Observe something'));
    next.addEventListener('click', observeRandom);
    foot.appendChild(next);
    inner.appendChild(foot);

    scroll.appendChild(inner);
    recordEl.appendChild(scroll);
    scroll.scrollTop = 0;
  }

  /* The doorway. Deliberately a dead end for now — it records that something
     is there and declines to say what. Anything further belongs to Sublevel
     −1, which is not built. */
  function anomalyPlate() {
    var seen = 0;
    try {
      seen = parseInt(global.localStorage.getItem('el-obs-anomaly') || '0', 10) || 0;
      global.localStorage.setItem('el-obs-anomaly', String(seen + 1));
    } catch (e) { /* private mode — the doorway just forgets you */ }

    var box = el('div', 'anomaly-plate');
    box.appendChild(el('span', 'lead', 'Instrument log — partial'));

    function line(k, v, redacted) {
      var d = el('div');
      d.appendChild(doc.createTextNode(k + '  '));
      if (redacted) {
        var r = el('span', 'redacted', v);
        d.appendChild(r);
      } else {
        d.appendChild(doc.createTextNode(v));
      }
      box.appendChild(d);
    }

    line('DESIGNATION     ', anomaly && anomaly.designation ? anomaly.designation : 'EL−1');
    line('BEARING         ', '317.4 / −90.0', true);
    line('FIRST LOG       ', '—— —— ————', true);
    line('INTERVAL        ', 'IRREGULAR');
    line('CLASSIFICATION  ', '—');
    line('ACCESS          ', 'SUBLEVEL −1 · NOT OPEN');

    var p = el('p', null,
      'The Observatory has no instrument pointed in that direction. One is being built.');
    p.style.margin = '1rem 0 0';
    box.appendChild(p);

    if (seen >= 1) {
      var again = el('p', null,
        'Logged again. Visit ' + (seen + 1) + '. Nothing has changed except the count.');
      again.style.margin = '0.5rem 0 0';
      again.style.color = 'var(--violet)';
      box.appendChild(again);
    }
    return box;
  }

  /* ============================================================= KEYNAV
     A real, focusable route through the chart for anyone not using a
     pointer. Hidden until it takes focus, then it becomes a visible list. */
  function renderKeynav() {
    keynavEl.textContent = '';
    var h = el('h2', null, view.mode === 'field' ? 'Observatory index' : 'Catalogue');
    keynavEl.appendChild(h);
    var ul = el('ul');

    function add(label, hash) {
      var li = el('li');
      var b = el('button', null, label);
      b.type = 'button';
      b.addEventListener('click', function () { go('#' + hash); });
      li.appendChild(b);
      ul.appendChild(li);
    }

    if (view.mode === 'field') {
      categories.forEach(function (c) {
        add(c.name + ' — ' + (byCategory[c.id] || []).length, c.id);
      });
      if (anomaly) add('Unidentified object', ANOMALY_HASH);
    } else {
      add('← All fields', '');
      var catId = view.category;
      (byCategory[catId] || []).forEach(function (o) {
        add(designationOf(o) + ' — ' + o.title, hashFor(o));
      });
    }
    keynavEl.appendChild(ul);
  }

  /* ============================================================== INSET
     Shift the chart into whatever space the open panel leaves, measured
     rather than assumed — so it works for the desktop side panel, the phone
     bottom sheet and the landscape side sheet without three special cases. */
  function applyInset() {
    var open = null;
    if (!recordEl.hidden) open = recordEl;
    else if (!catalogEl.hidden) open = catalogEl;

    var W = global.innerWidth, H = global.innerHeight;

    if (!open) {
      /* No panel: centre the chart in the clear band between the title plate
         and the floating controls, so the wordmark sits above the field
         rather than on top of it and the lowest stars still fit. */
      var top = Math.max(0, plate.getBoundingClientRect().bottom);
      var ctrl = $('.actions').getBoundingClientRect().top;
      var bottom = ctrl > top ? ctrl : H;

      /* On a wide screen the telemetry floats over the right of the field,
         so treat its edge as the boundary — otherwise a star ends up behind
         it. On a phone it is a full-width strip and the controls row above
         it has already set the bottom edge. */
      var right = W;
      var sr = statusEl.getBoundingClientRect();
      if (sr.width && sr.width < W * 0.85 && sr.right > W * 0.6) right = sr.left;

      field.setInset(right / 2 - W / 2, (top + bottom) / 2 - H / 2);
      return;
    }

    /* Centre the chart in whichever strip the panel leaves free — measured,
       not assumed, so one rule covers the desktop side panel, the phone
       bottom sheet and the landscape side sheet. Pick the side with more
       room: a sheet anchored to the bottom can still start above the middle
       of the screen, and testing its top edge alone gets that backwards. */
    var r = open.getBoundingClientRect();

    if (r.width > W * 0.85) {
      var above = r.top, below = H - r.bottom;
      var band = above >= below ? [0, r.top] : [r.bottom, H];
      field.setInset(0, (band[0] + band[1]) / 2 - H / 2);
    } else {
      var left = r.left, right = W - r.right;
      var lane = right >= left ? [r.right, W] : [0, r.left];
      field.setInset((lane[0] + lane[1]) / 2 - W / 2, 0);
    }
  }

  /* =============================================================== ROUTER */
  function resolve(hash) {
    hash = (hash || '').replace(/^#/, '').toLowerCase();
    if (!hash) return { mode: 'field', category: null, observation: null };

    if (anomaly && hash === ANOMALY_HASH) {
      return { mode: 'record', category: null, observation: anomaly.id };
    }
    for (var i = 0; i < categories.length; i++) {
      if (categories[i].id === hash) {
        return { mode: 'category', category: categories[i].id, observation: null };
      }
    }
    for (var k = 0; k < observations.length; k++) {
      if (observations[k].id.toLowerCase() === hash) {
        var o = observations[k];
        return {
          mode: 'record',
          category: isAnomaly(o) ? null : o.category,
          observation: o.id
        };
      }
    }
    return { mode: 'field', category: null, observation: null };
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

  function apply(next) {
    var wasMode = view.mode;
    view = next;
    body.setAttribute('data-view', next.mode);

    if (next.mode === 'record') {
      var obs = byId[next.observation];
      renderRecord(obs);
      recordEl.hidden = false;
      catalogEl.hidden = true;
      body.setAttribute('data-panel', '1');
      doc.title = obs.title + ' — Observatory — Entropic Labs';
      say(isAnomaly(obs) ? 'OBSERVATION INCOMPLETE' : 'OBJECT CATALOGUED', 3200);
    } else if (next.mode === 'category') {
      renderCatalog(next.category);
      catalogEl.hidden = false;
      recordEl.hidden = true;
      body.setAttribute('data-panel', '1');
      var cat = null;
      for (var i = 0; i < categories.length; i++) if (categories[i].id === next.category) cat = categories[i];
      doc.title = (cat ? cat.name : 'Field') + ' — Observatory — Entropic Labs';
      say('SIGNAL ACQUIRED', 2600);
    } else {
      catalogEl.hidden = true;
      recordEl.hidden = true;
      body.removeAttribute('data-panel');
      doc.title = 'Observatory — Entropic Labs';
      if (wasMode !== 'field') say('RETURNING TO FIELD', 2200);
    }

    backBtn.hidden = next.mode === 'field';
    field.setView(next.mode, next.category, next.observation);
    renderKeynav();
    /* let the panel lay out before measuring it */
    global.requestAnimationFrame(applyInset);
    idleAt = Date.now();
  }

  /* ------------------------------------------------------------- observe */
  function observeRandom() {
    var pool = realObservations.filter(function (o) { return o.id !== view.observation; });
    if (!pool.length) pool = realObservations;
    var pick = pool[Math.floor(Math.random() * pool.length)];
    say('SLEWING TO TARGET', 2600);
    go('#' + hashFor(pick));
  }
  observeBtn.addEventListener('click', observeRandom);
  backBtn.addEventListener('click', function () { go('#'); });

  /* ---------------------------------------------------------- keyboard */
  doc.addEventListener('keydown', function (e) {
    if (e.defaultPrevented) return;
    var tag = (e.target && e.target.tagName) || '';
    if (e.key === 'Escape') {
      if (view.mode === 'record' && view.category) go('#' + view.category);
      else if (view.mode !== 'field') go('#');
      return;
    }
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    if (e.key === 'o' || e.key === 'O') { observeRandom(); }
  });

  /* ------------------------------------------------------------- events */
  global.addEventListener('hashchange', function () {
    apply(resolve(global.location.hash));
  });

  var resizeTimer = 0;
  global.addEventListener('resize', function () {
    global.clearTimeout(resizeTimer);
    resizeTimer = global.setTimeout(function () {
      field.resize();
      applyInset();
    }, 120);
  });
  global.addEventListener('orientationchange', function () {
    global.setTimeout(function () { field.resize(); applyInset(); }, 260);
  });

  statusEl.addEventListener('toggle', function () {
    if (statusEl.open) tickStatus();
    applyInset();
  });

  /* ---------------------------------------------------------------- boot */
  buildStatus();
  statusEl.open = !(global.matchMedia && global.matchMedia('(max-width: 860px)').matches);
  global.setInterval(function () { tickStatus(); idleTick(); }, 1000);
  doc.addEventListener('visibilitychange', function () {
    if (!doc.hidden) { tickStatus(); idleAt = Date.now(); }
  });

  apply(resolve(global.location.hash));
  body.classList.add('ready');
  global.setTimeout(function () {
    if (view.mode === 'field') say('FIELD ACQUIRED', 3000);
  }, 900);

})(window);
