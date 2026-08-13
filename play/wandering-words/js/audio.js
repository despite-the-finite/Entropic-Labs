/* =============================================================================
   audio.js — voice + sound effects.

   Two independent engines, both asset-free:
     * VOICE  — browser SpeechSynthesis, used only when the child asks for help
                (speaker buttons) or when a character greets her. We never
                read a challenge word aloud automatically: the point is to read.
     * SFX    — short tones synthesised with WebAudio, so there are no audio
                files to ship and no loading delay.

   Swapping in recorded audio later means implementing LTR.audio.speak() against
   an <audio> sprite; every caller already goes through this one entry point.
   ============================================================================= */
(function (LTR) {
  'use strict';

  var ctx = null;
  var unlocked = false;
  var voice = null;
  var voicesReady = false;
  var speaking = false;

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
    if (ctx.state === 'suspended') ctx.resume();
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
    unlock:   function () { tone(392, 0, .18, .12, 'triangle'); tone(587, .14, .3, .12, 'triangle'); tone(784, .3, .45, .12, 'triangle'); }
  };

  /* ---------------------------------------------------------------- Voice -- */
  function pickVoice() {
    if (!('speechSynthesis' in window)) return;
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

  if ('speechSynthesis' in window) {
    pickVoice();
    window.speechSynthesis.onvoiceschanged = pickVoice;
  }

  function utter(text, opts) {
    if (!('speechSynthesis' in window)) return null;
    var u = new SpeechSynthesisUtterance(text);
    if (!voicesReady) pickVoice();
    if (voice) { u.voice = voice; u.lang = voice.lang; }
    u.rate = (opts && opts.rate) || 0.85;   // slow enough for a 4-year-old
    u.pitch = (opts && opts.pitch) || 1.1;
    u.volume = (opts && opts.volume) || 1;
    return u;
  }

  var A = LTR.audio = {

    /** Browsers need a user gesture before any sound. Called on first tap. */
    unlock: function () {
      if (unlocked) return;
      unlocked = true;
      ac();
      if ('speechSynthesis' in window) {
        try {
          // A silent priming utterance makes the first real one instant on iOS.
          var u = new SpeechSynthesisUtterance(' ');
          u.volume = 0;
          window.speechSynthesis.speak(u);
        } catch (e) {}
      }
    },

    get isSpeaking() { return speaking; },

    sfx: function (name) {
      if (!enabledSfx()) return;
      var f = SFX[name];
      if (f) { try { f(); } catch (e) {} }
    },

    /**
     * Speak arbitrary text. Returns a Promise that resolves when finished
     * (or immediately when speech is unavailable/disabled).
     */
    speak: function (text, opts) {
      if (!text || !enabledSpeech() || !('speechSynthesis' in window)) return Promise.resolve();
      A.unlock();
      return new Promise(function (resolve) {
        try {
          window.speechSynthesis.cancel();
          var u = utter(text, opts);
          if (!u) return resolve();
          speaking = true;
          var done = function () { speaking = false; resolve(); };
          u.onend = done;
          u.onerror = done;
          window.speechSynthesis.speak(u);
          // Safety net: some engines never fire onend.
          setTimeout(done, 400 + text.length * 130);
        } catch (e) { speaking = false; resolve(); }
      });
    },

    stop: function () {
      try { window.speechSynthesis.cancel(); } catch (e) {}
      speaking = false;
    },

    /** "The letter B" — the letter's *name*. */
    letterName: function (ch) {
      return A.speak(String(ch).toUpperCase(), { rate: .7, pitch: 1.15 });
    },

    /** The letter's *sound*: data supplies a spoken spelling like "buh". */
    letterSound: function (ch) {
      var rec = LTR.data.letterByChar(ch);
      var say = rec ? rec.say : String(ch);
      return A.speak(say, { rate: .6, pitch: 1.05 });
    },

    word: function (w) { return A.speak(String(w), { rate: .72, pitch: 1.1 }); },

    sentence: function (s) { return A.speak(String(s), { rate: .8, pitch: 1.05 }); },

    /** A character's line, in that character's own voice. */
    character: function (charId, text) {
      var c = LTR.data.character ? LTR.data.character(charId) : null;
      return A.speak(String(text), (c && c.voice) || { rate: .8, pitch: 1.05 });
    },

    /**
     * Sound out a word: /c/ ... /a/ ... /t/ ... "cat".
     * onEach(index) lets the UI light up each grapheme in time with the voice.
     */
    blend: function (word, phonemes, onEach) {
      var parts = phonemes && phonemes.length ? phonemes : String(word).split('');
      var chain = Promise.resolve();
      parts.forEach(function (p, i) {
        chain = chain.then(function () {
          if (onEach) onEach(i);
          var rec = LTR.data.soundSay ? LTR.data.soundSay(p) : p;
          return A.speak(rec, { rate: .55, pitch: 1.05 });
        }).then(function () { return LTR.util.wait(120); });
      });
      return chain.then(function () {
        if (onEach) onEach(-1);
        return A.speak(word, { rate: .7, pitch: 1.12 });
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

})(window.LTR);
