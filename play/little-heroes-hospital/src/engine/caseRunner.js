/**
 * The case runner.
 *
 * Walks the `steps` array of a case, handing each step to the matching module
 * in ./steps. The runner owns the stage (backdrop, patient, speech bubbles,
 * the reward tally) and gives step modules a small, stable context object —
 * so a new step type is a new file plus one line in ./steps/index.js.
 */
import { h, clear, wait, pick } from '../core/dom.js';
import { sfx, play } from '../core/audio.js';
import { confetti, sparkle, floatText, hearts, toast, flash } from '../core/fx.js';
import { backdrop } from '../ui/backdrop.js';
import { patientElement, setMood, patientSound } from '../ui/patients.js';
import { SPECIES } from '../ui/creature.js';
import { isLittle } from '../core/state.js';
import { fill } from './text.js';
import { say as speak, stop as stopSpeaking } from '../core/voice.js';
import { STEP_RUNNERS } from './steps/index.js';

export function createCaseRunner(caseDef, { onFinish, onQuit }) {
  /* --- resolve the patient (some cases pick from a pool at random) ------ */
  const chosen = caseDef.patientPool ? pick(caseDef.patientPool) : caseDef.patient;
  const patient = {
    ...chosen,
    speciesLabel: chosen.kind === 'human' ? 'child' : chosen.kind,
    emoji: chosen.emoji || SPECIES[chosen.kind]?.emoji || '🧒',
  };

  /* --- running tally ---------------------------------------------------- */
  const tally = { stars: 0, kindness: 0, coins: 0, mistakes: 0, badges: [] };

  /* --- DOM -------------------------------------------------------------- */
  const stage = h('div', { class: 'case-stage' });
  stage.appendChild(backdrop(caseDef.room));

  const patientWrap = h('div', { class: 'case-patient' });
  const patientEl = patientElement(patient, caseDef.steps[0]?.mood || 'happy');
  patientWrap.appendChild(patientEl);

  const overlay = h('div', { class: 'case-overlay' });
  const bubbleLane = h('div', { class: 'bubble-lane' });
  const scene = h('div', { class: 'case-scene' }, patientWrap, overlay, bubbleLane);
  stage.appendChild(scene);

  const nameTag = h('div', { class: 'case-nametag' },
    h('span', { class: 'case-nametag__emoji' }, patient.emoji),
    h('span', {}, patient.name));
  stage.appendChild(nameTag);

  const promptEl = h('div', { class: 'panel__prompt' });
  const bodyEl = h('div', { class: 'panel__body' });
  const teachEl = h('div', { class: 'panel__teach hidden' });
  const panel = h('div', { class: 'case-panel' }, promptEl, bodyEl, teachEl);

  const dots = h('div', { class: 'case-dots' });
  caseDef.steps.forEach(() => dots.appendChild(h('i')));

  const el = h('div', { class: 'case-root' }, stage, dots, panel);

  /* --- helpers handed to step modules ---------------------------------- */
  let index = 0;
  let cleanupStep = null;
  let destroyed = false;

  function say(who, text, { translate = null, mood = null, sfxName = null, hold = false } = {}) {
    const spoken = fill(text, patient);
    const bubble = h('div', { class: `bubble bubble--${who}` }, spoken);
    speak(translate ? `${spoken}. ${fill(translate, patient)}` : spoken);
    if (who === 'narrator' || who === 'nurse') bubble.classList.add('bubble--thought');
    bubbleLane.appendChild(bubble);
    if (translate) {
      bubbleLane.appendChild(h('div', { class: 'bubble bubble--translate' },
        h('span', { class: 'bubble__tkey' }, '🗣️ '), fill(translate, patient)));
    }
    if (mood) setPatientMood(mood);
    if (sfxName) play(sfxName);
    // Keep the lane readable — only the current line and the one before it.
    while (bubbleLane.children.length > 2) bubbleLane.firstChild.remove();
    if (!hold) setTimeout(() => bubble.classList.add('bubble--settled'), 40);
    return bubble;
  }

  function clearBubbles() { clear(bubbleLane); }

  function setPatientMood(mood) { setMood(patientEl, patient, mood); }

  function react(kind = 'happy') {
    patientEl.classList.remove('react-happy', 'react-wiggle', 'react-shy');
    void patientEl.offsetWidth; // restart the animation
    patientEl.classList.add(`react-${kind}`);
  }

  function hotspot(name) {
    return patientEl.querySelector(`[data-spot="${name}"]`);
  }

  function award({ stars = 0, kindness = 0, coins = 0 }, from = null) {
    if (stars) {
      tally.stars += stars;
      floatText(from || patientWrap, `+${stars} ⭐`, '#ffd75e');
      sparkle(from || patientWrap, { count: 8 + stars * 2 });
      sfx.star();
    }
    if (kindness) {
      tally.kindness += kindness;
      floatText(from || patientWrap, `+${kindness} ❤️`, '#ff8fa6');
      hearts(from || patientWrap, 7);
    }
    if (coins) {
      tally.coins += coins;
      floatText(from || patientWrap, `+${coins} 🪙`, '#ffd75e');
      sfx.coin();
    }
    renderTally();
  }

  function teach(text) {
    if (!text) { teachEl.classList.add('hidden'); return; }
    // Younger players get the fun fact; explorers get it too, with vocabulary.
    teachEl.innerHTML = `<span class="panel__teach-icon">💡</span><span>${fill(text, patient)}</span>`;
    teachEl.classList.remove('hidden');
  }

  function noteMistake() { tally.mistakes++; }

  function setPrompt(text, sub = null, { spoken = true } = {}) {
    clear(promptEl);
    if (!text) return;
    if (spoken) speak(fill(text, patient));
    promptEl.appendChild(h('div', { class: 'panel__prompt-main' }, fill(text, patient)));
    if (sub) promptEl.appendChild(h('div', { class: 'panel__prompt-sub' }, fill(sub, patient)));
  }

  /**
   * The "Next" button every step ends with. Centralised so it always looks
   * the same and always scrolls itself into view — on a phone the panel is
   * short and a freshly appended button can otherwise sit below the fold.
   */
  function continueButton(label = 'Next 👉', host = bodyEl) {
    const btn = h('button', { class: 'btn btn--mint btn--wide', onClick: () => advance() }, label);
    host.appendChild(btn);
    requestAnimationFrame(() => btn.scrollIntoView({ behavior: 'smooth', block: 'nearest' }));
    return btn;
  }

  const ctx = {
    caseDef, patient,
    stage, scene, overlay, panel, bodyEl, promptEl, patientWrap, patientEl,
    say, clearBubbles, setMood: setPatientMood, react, hotspot, award, teach,
    setPrompt, noteMistake, continueButton, fill: (t) => fill(t, patient),
    little: isLittle(),
    patientSound: patientSound(patient),
    next: () => advance(),
  };

  /* --- tally chips ------------------------------------------------------ */
  const tallyEl = h('div', { class: 'case-tally' });
  function renderTally() {
    tallyEl.innerHTML =
      `<span class="chip chip--tiny"><span class="chip__icon">⭐</span>${tally.stars}</span>` +
      `<span class="chip chip--tiny"><span class="chip__icon">❤️</span>${tally.kindness}</span>`;
    tallyEl.querySelectorAll('.chip').forEach((c) => {
      c.classList.remove('chip--bump'); void c.offsetWidth; c.classList.add('chip--bump');
    });
  }
  renderTally();
  stage.appendChild(tallyEl);

  /* --- step machine ----------------------------------------------------- */
  function markDots() {
    [...dots.children].forEach((d, i) => {
      d.classList.toggle('done', i < index);
      d.classList.toggle('now', i === index);
    });
  }

  async function runStep() {
    if (destroyed) return;
    markDots();
    clear(bodyEl);
    teach(null);
    const step = caseDef.steps[index];
    if (!step) return finish();

    const runner = STEP_RUNNERS[step.type];
    if (!runner) {
      console.warn(`[caseRunner] unknown step type "${step.type}" — skipping`);
      return advance();
    }
    cleanupStep = await runner(step, ctx);
  }

  function advance() {
    try { cleanupStep?.(); } catch (e) { console.error(e); }
    cleanupStep = null;
    index++;
    runStep();
  }

  async function finish() {
    markDots();
    clear(bodyEl);
    clearBubbles();
    setPrompt(null);

    // The outro moment: the patient's happy reaction.
    const outro = caseDef.outro || {};
    if (outro.mood) setPatientMood(outro.mood);
    react(outro.react || 'happy');
    play(ctx.patientSound);
    if (outro.text) say('patient', outro.text, { translate: outro.translate });

    confetti({ intensity: 1.4 });
    sparkle(patientWrap, { count: 22 });
    sfx.fanfare();
    flash('rgba(255,255,255,.5)', 500);

    await wait(1500);
    if (destroyed) return;

    onFinish?.({
      caseDef, patient,
      stars: tally.stars + caseDef.reward.stars,
      stepStars: tally.stars,
      bonusStars: caseDef.reward.stars,
      kindness: tally.kindness,
      coins: caseDef.reward.coins + tally.coins,
      mistakes: tally.mistakes,
      badges: tally.badges,
      perfect: tally.mistakes === 0,
    });
  }

  /* Collect badges awarded by individual steps. */
  ctx.badge = (id) => { if (id && !tally.badges.includes(id)) tally.badges.push(id); };

  /* Little Helper mode gets a gentle voice-over style hint if a step stalls. */
  ctx.toast = toast;

  runStep();

  return {
    el,
    destroy() {
      destroyed = true;
      stopSpeaking();
      try { cleanupStep?.(); } catch { /* ignore */ }
    },
    quit: () => onQuit?.(),
  };
}
