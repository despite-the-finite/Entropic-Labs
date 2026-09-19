/* =============================================================================
   audio.js — voice + sound effects.

   Two independent engines, both asset-free:
     * VOICE  — browser SpeechSynthesis, wrapped in a proper QUEUE. Everything
                the game says goes through it, one utterance at a time, in
                order, and a single stop() clears the whole queue. This matters:
                a four-year-old cannot read, so speech is not a garnish here —
                it is the interface. If two lines talk over each other the game
                becomes unusable.
     * SFX    — short tones synthesised with WebAudio, so there are no audio
                files to ship and no loading delay.

   Swapping in recorded audio later means implementing speakOne() against an
   <audio> sprite; every caller already goes through this one entry point.
   ============================================================================= */
(function (LTR) {
  'use strict';

  var ctx = null;
  var unlocked = false;
  var voice = null;
  var voicesReady = false;

  var HAS_TTS = typeof window !== 'undefined' && 'speechSynthesis' in window;

  function enabledSpeech() {
    return !LTR.state.data || LTR.state.data.settings.speech !== false;
  }
  function enabledSfx() {
    return !LTR.state.data || LTR.state.data.settings.sfx !== false;
  }

  /* ------------------------------------------------------------- WebAudio -- */
  function ac() {
    if (!ctx) {
      var C = window.AudioContext || window.webkitAudioContext;
      if (!C) return null;
      try { ctx = new C(); } catch (e) { return null; }
    }
    if (ctx.state === 'suspended') { try { ctx.resume(); } catch (e) {} }
    return ctx;
  }

  /** One shaped sine/triangle blip. */
  function tone(freq, start, dur, gain, type) {
    var a = ac(); if (!a) return;
    var t0 = a.currentTime + start;
    var osc = a.createOscillator();
    var g = a.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g); g.connect(a.destination);
    osc.start(t0); osc.stop(t0 + dur + 0.05);
  }

  /** Gentle filtered noise — used for sparkle tails and whooshes. */
  function noise(start, dur, gain, freq) {
    var a = ac(); if (!a) return;
    var t0 = a.currentTime + start;
    var len = Math.max(1, Math.floor(a.sampleRate * dur));
    var buf = a.createBuffer(1, len, a.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    var src = a.createBufferSource(); src.buffer = buf;
    var flt = a.createBiquadFilter(); flt.type = 'bandpass';
    flt.frequency.value = freq || 2400; flt.Q.value = 1.2;
    var g = a.createGain(); g.gain.value = gain;
    src.connect(flt); flt.connect(g); g.connect(a.destination);
    src.start(t0);
  }

  var SFX = {
    tap:      function () { tone(520, 0, .09, .10, 'triangle'); },
    pop:      function () { tone(680, 0, .10, .12, 'triangle'); tone(1020, .05, .10, .07); },
    correct:  function () {
      [0, .09, .18].forEach(function (t, i) { tone([660, 880, 1320][i], t, .28, .13, 'triangle'); });
      noise(.12, .35, .05, 3200);
    },
    sparkle:  function () {
      [1568, 2093, 2637].forEach(function (f, i) { tone(f, i * .06, .22, .07); });
      noise(0, .4, .04, 4200);
    },
    tryagain: function () { tone(392, 0, .16, .09, 'triangle'); tone(330, .13, .22, .08, 'triangle'); },
    reward:   function () {
      [523, 659, 784, 1047].forEach(function (f, i) { tone(f, i * .1, .35, .13, 'triangle'); });
      noise(.3, .5, .05, 3000);
    },
    fanfare:  function () {
      [523, 523, 659, 784, 1047, 1319].forEach(function (f, i) {
        tone(f, i * .13, .42, .14, 'triangle');
        tone(f / 2, i * .13, .42, .06);
      });
      noise(.7, .8, .05, 2600);
    },
    whoosh:   function () { noise(0, .35, .06, 900); },
    magic:    function () {
      for (var i = 0; i < 7; i++) tone(523 * Math.pow(2, i / 7), i * .045, .3, .06);
    },
    gem:      function () { tone(1318, 0, .3, .1); tone(1976, .07, .35, .08); },
    unlock:   function () { tone(392, 0, .18, .12, 'triangle'); tone(587, .14, .3, .12, 'triangle'); tone(784, .3, .45, .12, 'triangle'); },
    /* A soft "look here" chime that accompanies the pointing hand. */
    point:    function () { tone(880, 0, .12, .07, 'triangle'); tone(1174, .1, .16, .06, 'triangle'); }
  };

  /* ---------------------------------------------------------------- Voice -- */

  function pickVoice() {
    if (!HAS_TTS) return;
    var all = window.speechSynthesis.getVoices() || [];
    if (!all.length) return;
    voicesReady = true;

    var en = all.filter(function (v) { return /^en(-|_|$)/i.test(v.lang || ''); });
    var pool = en.length ? en : all;

    // Prefer warm, clear, natural-sounding voices when the platform has them.
    var preferred = [
      /google uk english female/i, /google us english/i,
      /samantha/i, /karen/i, /moira/i, /serena/i, /fiona/i,
      /zira/i, /hazel/i, /natural/i, /female/i
    ];
    for (var i = 0; i < preferred.length; i++) {
      var hit = pool.filter(function (v) { return preferred[i].test(v.name || ''); })[0];
      if (hit) { voice = hit; return; }
    }
    voice = pool[0];
  }

  if (HAS_TTS) {
    pickVoice();
    window.speechSynthesis.onvoiceschanged = pickVoice;
  }

  /* ------------------------------------------------------------- the queue --
     Only ONE utterance is ever in flight. Callers enqueue and get a promise
     back that settles when their turn has finished (or when the queue is
     cleared out from under them, which is a normal event — a child tapping
     onward should never be blocked waiting for a sentence to finish).        */

  var queue = [];          // [{ text, opts, resolve, token }]
  var active = null;       // the job currently speaking
  var token = 0;           // bumped by stop(); stale jobs resolve immediately
  var watchdog = null;

  function settle(job) {
    if (!job || job.settled) return;
    job.settled = true;
    try { job.resolve(); } catch (e) {}
  }

  /** Chrome silently pauses synthesis after ~15s; nudging it keeps it alive. */
  function startWatchdog() {
    stopWatchdog();
    watchdog = setInterval(function () {
      if (!active) { stopWatchdog(); return; }
      try {
        if (window.speechSynthesis.paused) window.speechSynthesis.resume();
      } catch (e) {}
    }, 4000);
  }
  function stopWatchdog() {
    if (watchdog) { clearInterval(watchdog); watchdog = null; }
  }

  var BASE_RATE = 0.85;                    // slow enough for a 4-year-old

  /** The grown-up's chosen speed, as a multiplier on every utterance. */
  function rateScale() {
    var r = LTR.state.data && LTR.state.data.settings.voiceRate;
    if (!r) return 1;
    return r / BASE_RATE;
  }

  function buildUtterance(text, opts) {
    var u = new SpeechSynthesisUtterance(text);
    if (!voicesReady) pickVoice();
    if (voice) { u.voice = voice; u.lang = voice.lang; }
    var rate = ((opts && opts.rate) || BASE_RATE) * rateScale();
    u.rate = Math.max(0.1, Math.min(2, rate));
    u.pitch = (opts && opts.pitch) || 1.1;
    u.volume = (opts && opts.volume !== undefined) ? opts.volume : 1;
    return u;
  }

  /** Generous upper bound on how long a line can take, for the safety net. */
  function maxDuration(text, opts) {
    var rate = ((opts && opts.rate) || BASE_RATE) * rateScale();
    return 1200 + (String(text).length * 170) / Math.max(0.4, rate);
  }

  function pump() {
    if (active || !queue.length) return;

    var job = queue.shift();
    if (job.token !== token) { settle(job); return pump(); }

    // A pure pause in the script: no speech, just breathing room.
    if (job.pause) {
      active = job;
      job.timer = setTimeout(function () {
        active = null; settle(job); pump();
      }, job.pause);
      return;
    }

    if (!enabledSpeech() || !HAS_TTS) { settle(job); return pump(); }

    active = job;
    startWatchdog();

    var finish = function () {
      if (job.timer) { clearTimeout(job.timer); job.timer = null; }
      if (job.fallback) { clearInterval(job.fallback); job.fallback = null; }
      if (active === job) active = null;
      stopWatchdog();
      settle(job);
      // A beat between lines: run-on speech is very hard for a small child.
      setTimeout(pump, job.opts && job.opts.gap !== undefined ? job.opts.gap : 90);
    };

    try {
      var u = buildUtterance(job.text, job.opts);
      u.onend = finish;
      u.onerror = finish;
      if (job.opts.onWord) attachWordTracking(u, job);
      // Safety net: several engines never fire onend for short strings.
      job.timer = setTimeout(finish, maxDuration(job.text, job.opts));
      window.speechSynthesis.speak(u);
    } catch (e) {
      finish();
    }
  }

  /**
   * Call back with the index of the word currently being spoken.
   *
   * This is what lets a story light up its words one at a time as they are
   * read — the single clearest way a game can show a pre-reader that those
   * black marks are the sounds she is hearing. Chrome and Safari fire real
   * boundary events; everywhere else we pace it evenly, which is close
   * enough to follow with a finger.
   */
  function attachWordTracking(u, job) {
    var text = job.text;
    var starts = [];
    var re = /\S+/g, m;
    while ((m = re.exec(text)) !== null) starts.push(m.index);
    if (!starts.length) return;

    var fired = -1;
    var emit = function (i) {
      if (i === fired) return;
      fired = i;
      try { job.opts.onWord(i, starts.length); } catch (e) {}
    };

    var boundarySeen = false;
    u.onboundary = function (ev) {
      if (ev.name && ev.name !== 'word') return;
      boundarySeen = true;
      if (job.fallback) { clearInterval(job.fallback); job.fallback = null; }
      var idx = 0;
      for (var i = 0; i < starts.length; i++) {
        if (starts[i] <= ev.charIndex) idx = i; else break;
      }
      emit(idx);
    };

    // Even pacing, cancelled the moment a real boundary event arrives.
    var per = maxDuration(text, job.opts) * 0.62 / starts.length;
    var n = 0;
    job.fallback = setInterval(function () {
      if (boundarySeen || !active || active !== job) { clearInterval(job.fallback); job.fallback = null; return; }
      if (n >= starts.length) { clearInterval(job.fallback); job.fallback = null; return; }
      emit(n++);
    }, Math.max(140, per));

    var end = u.onend;
    u.onend = function () {
      if (job.fallback) { clearInterval(job.fallback); job.fallback = null; }
      emit(-1);
      end();
    };
  }

  function enqueue(text, opts) {
    var job = {
      text: text, opts: opts || {}, token: token,
      pause: (opts && opts.pause) || 0, settled: false
    };
    var p = new Promise(function (res) { job.resolve = res; });
    queue.push(job);
    pump();
    return p;
  }

  var A = LTR.audio = {

    get available() { return HAS_TTS; },

    /* Browsers refuse to speak until the page has seen a real gesture. Until
       then anything we "say" is silently dropped — which, in a game whose
       instructions are entirely spoken, means a child who has not tapped yet
       is handed a screen with no way to find out what to do. Callers check
       this and defer instead. */
    get ready() { return unlocked; },

    /** Browsers need a user gesture before any sound. Called on first tap. */
    unlock: function () {
      if (unlocked) return;
      unlocked = true;
      ac();
      if (HAS_TTS) {
        try {
          // A silent priming utterance makes the first real one instant on iOS.
          var u = new SpeechSynthesisUtterance(' ');
          u.volume = 0;
          window.speechSynthesis.speak(u);
        } catch (e) {}
      }
      LTR.emit('audio-unlocked');
    },

    get isSpeaking() { return !!active || queue.length > 0; },

    sfx: function (name) {
      if (!enabledSfx()) return;
      var f = SFX[name];
      if (f) { try { f(); } catch (e) {} }
    },

    /**
     * Queue a line. Resolves when this line has finished (or was cancelled).
     * opts: { rate, pitch, volume, gap, interrupt }
     */
    speak: function (text, opts) {
      if (!text) return Promise.resolve();
      if (!enabledSpeech() || !HAS_TTS) return Promise.resolve();
      A.unlock();
      if (opts && opts.interrupt) A.stop();
      return enqueue(String(text), opts);
    },

    /** Queue a silent gap, so a script can breathe between lines. */
    pause: function (ms) { return enqueue('', { pause: ms || 300 }); },

    /**
     * Say a whole script in order: strings, or { text, rate, pitch } objects,
     * or { pause: ms }. One call, one promise, correct order, cancellable.
     * This is what screens use to narrate themselves.
     */
    script: function (parts, opts) {
      opts = opts || {};
      if (opts.interrupt !== false) A.stop();
      if (!parts || !parts.length) return Promise.resolve();
      var last = Promise.resolve();
      parts.forEach(function (p) {
        if (p === null || p === undefined || p === '') return;
        if (typeof p === 'number') { last = A.pause(p); return; }
        if (typeof p === 'string') { last = A.speak(p, opts.voice); return; }
        if (p.pause) { last = A.pause(p.pause); return; }
        if (p.letterName) { last = A.letterName(p.letterName); return; }
        if (p.letterSound) { last = A.letterSound(p.letterSound); return; }
        if (p.word) { last = A.word(p.word); return; }
        if (p.text) {
          last = A.speak(p.text, Object.assign({}, opts.voice, p));
        }
      });
      return last;
    },

    /** Drop everything queued and silence what is speaking right now. */
    stop: function () {
      token += 1;
      var dropped = queue;
      queue = [];
      dropped.forEach(settle);
      if (active) {
        if (active.timer) clearTimeout(active.timer);
        if (active.fallback) clearInterval(active.fallback);
        var was = active;
        active = null;
        settle(was);
      }
      stopWatchdog();
      try { window.speechSynthesis.cancel(); } catch (e) {}
    },

    /** "B" — the letter's *name*. */
    letterName: function (ch) {
      var c = String(ch).toUpperCase();
      // Several engines read a lone "A" as the article "uh"; spelling it out
      // with a trailing period reliably produces the letter name instead.
      return A.speak(c + '.', { rate: .65, pitch: 1.15 });
    },

    /** The letter's *sound*: data supplies a spoken spelling like "buh". */
    letterSound: function (ch) {
      var rec = LTR.data.letterByChar(ch);
      var say = rec ? rec.say : String(ch);
      return A.speak(say, { rate: .55, pitch: 1.05 });
    },

    word: function (w) { return A.speak(String(w), { rate: .68, pitch: 1.1 }); },

    sentence: function (s) { return A.speak(String(s), { rate: .8, pitch: 1.05 }); },

    /** A character's line, in that character's own voice. */
    character: function (charId, text, opts) {
      var c = LTR.data.character ? LTR.data.character(charId) : null;
      var base = (c && c.voice) || { rate: .8, pitch: 1.05 };
      return A.speak(String(text), Object.assign({}, base, opts || {}));
    },

    /**
     * Sound out a word: /c/ ... /a/ ... /t/ ... "cat".
     * onEach(index) lets the UI light up each grapheme in time with the voice.
     * Runs entirely inside the queue, so nothing can interleave with it.
     */
    blend: function (word, phonemes, onEach) {
      var parts = phonemes && phonemes.length ? phonemes : String(word).split('');
      A.stop();
      var chain = Promise.resolve();
      parts.forEach(function (p, i) {
        chain = chain.then(function () {
          if (onEach) { try { onEach(i); } catch (e) {} }
          var say = LTR.data.soundSay ? LTR.data.soundSay(p) : p;
          return A.speak(say, { rate: .5, pitch: 1.05, gap: 180 });
        });
      });
      return chain.then(function () {
        if (onEach) { try { onEach(-1); } catch (e) {} }
        return A.speak(word, { rate: .62, pitch: 1.12 });
      });
    }
  };

  // First gesture anywhere unlocks audio.
  ['pointerdown', 'touchstart', 'keydown'].forEach(function (evt) {
    window.addEventListener(evt, function once() {
      A.unlock();
      window.removeEventListener(evt, once);
    }, { passive: true });
  });

  // Leaving the tab mid-sentence and coming back should not resume it.
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') A.stop();
  });

})(window.LTR);
