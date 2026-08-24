/**
 * Optional spoken prompts.
 *
 * A four-year-old cannot read "Drag the stethoscope onto the chest", so the
 * game can read it out. This uses the browser's built-in speech synthesis —
 * no audio files, no network, no dependency — and degrades to silence
 * wherever it is unavailable.
 *
 * It is a separate toggle from the sound effects on purpose: a parent may
 * want the bleeps without the talking, or the talking without the bleeps.
 */
import { getState, setVoice } from './state.js';

const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;
export const isSupported = !!synth;

let ready = false;

/** Voices load asynchronously in most browsers. */
function pickVoice() {
  if (!synth) return null;
  const voices = synth.getVoices();
  if (!voices.length) return null;
  const lang = (navigator.language || 'en-GB');
  // Prefer a local voice in the page language; fall back to any English one.
  return voices.find((v) => v.localService && v.lang === lang)
    || voices.find((v) => v.lang === lang)
    || voices.find((v) => v.lang?.startsWith('en'))
    || voices[0];
}

if (synth) {
  const warm = () => { ready = true; };
  synth.addEventListener?.('voiceschanged', warm);
  // Some browsers already have voices; some only after a gesture.
  if (synth.getVoices().length) ready = true;
  ['pointerdown', 'keydown'].forEach((evt) =>
    window.addEventListener(evt, warm, { once: true, passive: true }));
}

export function voiceOn() {
  return isSupported && getState().settings.voice !== false;
}

export function toggleVoice() {
  const next = !voiceOn();
  setVoice(next);
  if (!next) stop();
  else say('Hello!');
  return next;
}

/** Speak a line, replacing anything currently being said. */
export function say(text, { rate = 0.94, pitch = 1.12 } = {}) {
  if (!voiceOn() || !text) return;
  const clean = strip(text);
  if (!clean) return;
  try {
    synth.cancel();
    const utter = new SpeechSynthesisUtterance(clean);
    const voice = ready ? pickVoice() : null;
    if (voice) { utter.voice = voice; utter.lang = voice.lang; }
    utter.rate = rate;
    utter.pitch = pitch;
    utter.volume = 0.9;
    synth.speak(utter);
  } catch (err) {
    console.warn('[voice] could not speak', err);
  }
}

export function stop() {
  try { synth?.cancel(); } catch { /* ignore */ }
}

/** Emoji and asterisked stage directions read terribly out loud. */
function strip(text) {
  return String(text)
    .replace(/\*[^*]*\*/g, ' ')
    .replace(/[\p{Extended_Pictographic}️‍]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
