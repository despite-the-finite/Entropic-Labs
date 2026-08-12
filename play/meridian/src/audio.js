// A tiny original boom-bap style beat (kick/snare/hihat/bass), synthesized
// live with the Web Audio API — no audio file, in keeping with everything
// else in this game being generated at runtime. Browsers block audio
// before a user gesture, so MUSIC.start() is called from the same
// keydown/pointerdown that advances the title screen, and MUSIC.stop() is
// called when leaving the intro for the game proper.

const MUSIC = {
  ctx: null,
  playing: false,
  timerId: null,
  step: 0,

  ensureContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === "suspended") this.ctx.resume();
  },

  kick(time) {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(45, time + 0.12);
    gain.gain.setValueAtTime(0.9, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.16);
    osc.connect(gain).connect(ctx.destination);
    osc.start(time);
    osc.stop(time + 0.18);
  },

  noiseBurst(time, duration, filterFreq, gainLevel) {
    const ctx = this.ctx;
    const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = filterFreq;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(gainLevel, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
    noise.connect(filter).connect(gain).connect(ctx.destination);
    noise.start(time);
    noise.stop(time + duration);
  },

  snare(time) {
    this.noiseBurst(time, 0.13, 1000, 0.5);
  },

  hihat(time) {
    this.noiseBurst(time, 0.045, 7000, 0.15);
  },

  bass(time, freq) {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(freq, time);
    filter.type = "lowpass";
    filter.frequency.value = 400;
    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(0.22, time + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.22);
    osc.connect(filter).connect(gain).connect(ctx.destination);
    osc.start(time);
    osc.stop(time + 0.25);
  },

  start() {
    if (this.playing) return;
    this.ensureContext();
    this.playing = true;
    this.step = 0;
    const stepSeconds = 0.19;
    const pattern = {
      kick: [1, 0, 0, 0, 0, 0, 1, 0],
      snare: [0, 0, 1, 0, 0, 0, 0, 1],
      hihat: [1, 1, 1, 1, 1, 1, 1, 1],
      bass: [98, 0, 0, 73, 0, 0, 98, 0],
    };
    const scheduleStep = () => {
      if (!this.playing) return;
      const time = this.ctx.currentTime + 0.02;
      const i = this.step % pattern.kick.length;
      if (pattern.kick[i]) this.kick(time);
      if (pattern.snare[i]) this.snare(time);
      if (pattern.hihat[i]) this.hihat(time);
      if (pattern.bass[i]) this.bass(time, pattern.bass[i]);
      this.step++;
      this.timerId = setTimeout(scheduleStep, stepSeconds * 1000);
    };
    scheduleStep();
  },

  stop() {
    this.playing = false;
    if (this.timerId) clearTimeout(this.timerId);
    this.timerId = null;
  },
};

// Ambient background sound per game mode — shares MUSIC's AudioContext
// (browsers cap how many you can open, and there's no reason for two).
// Each mode is a mix of one-shot sounds on a randomized schedule (office,
// PTO's gulls) and/or a continuous drone (site visit's excavator, PTO's
// surf) so it reads as background noise rather than a music loop. Only
// one mode plays at a time — start() tears down whatever was running.
const AMBIENT = {
  mode: null,
  timers: [],
  droneNodes: [],

  ctx() {
    MUSIC.ensureContext();
    return MUSIC.ctx;
  },

  schedule(fn, delayMs) {
    const id = setTimeout(fn, delayMs);
    this.timers.push(id);
    return id;
  },

  // A short percussive click/tick — office mouse clicks and keyboard
  // clatter are both just this at different filter frequencies.
  tick(time, freq, duration, gainLevel) {
    const ctx = this.ctx();
    const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = freq;
    filter.Q.value = 1.2;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(gainLevel, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
    noise.connect(filter).connect(gain).connect(ctx.destination);
    noise.start(time);
    noise.stop(time + duration);
  },

  // A short tone, optionally sliding — phone-ring blips, email dings,
  // elevator chimes, and gull chirps are all this with different envelopes.
  blip(time, freq, duration, gainLevel, glideTo) {
    const ctx = this.ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, time);
    if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, time + duration);
    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(gainLevel, time + Math.min(0.02, duration / 4));
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(time);
    osc.stop(time + duration + 0.02);
  },

  officeMouseClick(time) {
    this.tick(time, 3200, 0.02, 0.12);
  },

  officeKeyClatter(time) {
    const n = Phaser.Math.Between(3, 7);
    for (let i = 0; i < n; i++) {
      this.tick(time + i * 0.06, Phaser.Math.Between(2200, 3800), 0.03, 0.08);
    }
  },

  officePhoneRing(time) {
    for (let i = 0; i < 2; i++) {
      this.blip(time + i * 0.42, 900, 0.32, 0.09);
      this.blip(time + i * 0.42, 1140, 0.32, 0.07);
    }
  },

  officeEmailDing(time) {
    this.blip(time, 1500, 0.18, 0.1);
    this.blip(time + 0.1, 2000, 0.22, 0.08);
  },

  startOffice() {
    const next = () => {
      const time = this.ctx().currentTime + 0.05;
      const roll = Phaser.Math.Between(1, 100);
      if (roll <= 35) this.officeMouseClick(time);
      else if (roll <= 65) this.officeKeyClatter(time);
      else if (roll <= 85) this.officeEmailDing(time);
      else this.officePhoneRing(time);
      this.schedule(next, Phaser.Math.Between(1400, 3200));
    };
    this.schedule(next, 800);
  },

  // Low, slightly wobbling engine drone (excavator) that runs the whole
  // scene, plus randomly scheduled truck-backup beep bursts on top.
  startSiteVisit() {
    const ctx = this.ctx();
    const osc = ctx.createOscillator();
    const wobble = ctx.createOscillator();
    const wobbleGain = ctx.createGain();
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    osc.type = "sawtooth";
    osc.frequency.value = 55;
    filter.type = "lowpass";
    filter.frequency.value = 220;
    wobble.frequency.value = 6.5;
    wobbleGain.gain.value = 4;
    wobble.connect(wobbleGain).connect(osc.frequency);
    gain.gain.setValueAtTime(0.001, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.05, ctx.currentTime + 1.5);
    osc.connect(filter).connect(gain).connect(ctx.destination);
    osc.start();
    wobble.start();
    this.droneNodes.push(osc, wobble, gain);

    const truckBeeps = () => {
      const time = this.ctx().currentTime + 0.05;
      const beepCount = Phaser.Math.Between(3, 5);
      for (let i = 0; i < beepCount; i++) {
        this.blip(time + i * 0.5, 1600, 0.18, 0.08);
      }
      this.schedule(truckBeeps, Phaser.Math.Between(6000, 11000));
    };
    this.schedule(truckBeeps, Phaser.Math.Between(2000, 5000));
  },

  // A slow, soft arpeggio (elevator muzak) plus an occasional pleasant
  // two-note arrival chime.
  startVisitorDay() {
    const notes = [523.25, 659.25, 783.99, 659.25]; // C5 E5 G5 E5
    let i = 0;
    const arpeggio = () => {
      const time = this.ctx().currentTime + 0.05;
      this.blip(time, notes[i % notes.length], 0.9, 0.045);
      i++;
      this.schedule(arpeggio, 950);
    };
    this.schedule(arpeggio, 500);

    const chime = () => {
      const time = this.ctx().currentTime + 0.05;
      this.blip(time, 1046.5, 0.7, 0.08);
      this.blip(time + 0.35, 783.99, 0.9, 0.07);
      this.schedule(chime, Phaser.Math.Between(9000, 15000));
    };
    this.schedule(chime, 4000);
  },

  // Looping wave-wash swells (filtered noise with a slow gain envelope)
  // plus occasional gull chirps.
  startPto() {
    const ctx = this.ctx();
    const wave = () => {
      const time = this.ctx().currentTime + 0.05;
      const duration = Phaser.Math.FloatBetween(2.2, 3.2);
      const bufferSize = Math.floor(ctx.sampleRate * duration);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let j = 0; j < bufferSize; j++) data[j] = Math.random() * 2 - 1;
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 900;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.001, time);
      gain.gain.linearRampToValueAtTime(0.1, time + duration * 0.5);
      gain.gain.linearRampToValueAtTime(0.001, time + duration);
      noise.connect(filter).connect(gain).connect(ctx.destination);
      noise.start(time);
      noise.stop(time + duration);
      this.schedule(wave, duration * 1000 * 0.75);
    };
    this.schedule(wave, 200);

    const gull = () => {
      const time = this.ctx().currentTime + 0.05;
      this.blip(time, 1800, 0.28, 0.05, 2400);
      this.schedule(gull, Phaser.Math.Between(4000, 9000));
    };
    this.schedule(gull, Phaser.Math.Between(2000, 5000));
  },

  start(mode) {
    if (this.mode === mode) return;
    this.stop();
    this.mode = mode;
    MUSIC.ensureContext();
    if (mode === "office") this.startOffice();
    else if (mode === "site") this.startSiteVisit();
    else if (mode === "visitor") this.startVisitorDay();
    else if (mode === "pto") this.startPto();
  },

  stop() {
    this.mode = null;
    this.timers.forEach((id) => clearTimeout(id));
    this.timers = [];
    this.droneNodes.forEach((node) => {
      try {
        if (node.stop) node.stop();
        node.disconnect();
      } catch (e) {
        // already stopped/disconnected — fine to ignore
      }
    });
    this.droneNodes = [];
  },
};
