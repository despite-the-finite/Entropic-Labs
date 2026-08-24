/**
 * Patient factory — turns the `patient` block of a case into a DOM element.
 *
 * A patient is just data:
 *   { kind: 'human' | <species>, name, look: {...}, voice }
 * so a new patient never needs new rendering code.
 */
import { humanSVG } from './human.js';
import { creatureSVG, SPECIES } from './creature.js';
import { raw } from '../core/dom.js';

export function patientMarkup(patient, mood = 'happy') {
  if (patient.kind === 'human') {
    return humanSVG({ ...(patient.look || {}), mood });
  }
  return creatureSVG({ species: patient.kind, mood, ...(patient.look || {}) });
}

export function patientElement(patient, mood = 'happy') {
  const el = raw(patientMarkup(patient, mood), 'patient-art');
  el.dataset.kind = patient.kind;
  return el;
}

/** Swap the artwork in-place when a mood changes, keeping the wrapper. */
export function setMood(el, patient, mood) {
  el.innerHTML = patientMarkup(patient, mood);
  el.dataset.mood = mood;
}

/** The noise this patient makes — used for reactions. */
export function patientSound(patient) {
  if (patient.kind === 'human') return 'squeak';
  return SPECIES[patient.kind]?.sound || 'squeak';
}

export function patientEmoji(patient) {
  if (patient.kind === 'human') return patient.emoji || '🧒';
  return SPECIES[patient.kind]?.emoji || '🐾';
}
