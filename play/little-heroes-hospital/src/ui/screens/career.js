/**
 * "Who do you want to help?"
 *
 * This is a preference, never a lock — the same screen is reachable from the
 * hospital at any time and switching keeps every bit of progress on both
 * tracks.
 */
import { h } from '../../core/dom.js';
import { sfx } from '../../core/audio.js';
import { goHome } from '../../core/router.js';
import { setCareer, careerCompletion, getState } from '../../core/state.js';
import { TRACKS } from '../../data/cases/index.js';
import { hud } from '../components.js';
import { confetti } from '../../core/fx.js';

export function careerScreen({ fromHub = false } = {}) {
  const el = h('div', { class: 'screen screen--career' });
  const bar = hud({
    title: 'Who do you want to help?',
    back: fromHub ? () => goHome('hub') : null,
    dark: true, chips: [],
  });
  el.appendChild(bar);

  const grid = h('div', { class: 'career-grid' });

  for (const track of [TRACKS.doctor, TRACKS.vet]) {
    const { done, total } = careerCompletion(track.id);
    const isCurrent = getState().career === track.id;

    const card = h('button', {
      class: `career-card career-card--${track.id}`,
      onClick: () => choose(track.id),
    },
      done > 0 || isCurrent ? h('span', { class: 'career-card__badge' },
        isCurrent ? '⭐ Current' : `${done}/${total}`) : null,
      h('span', { class: 'career-card__icon' }, track.icon),
      h('span', { class: 'career-card__title' },
        track.id === 'doctor' ? 'PEOPLE!' : 'ANIMALS!'),
      h('span', { class: 'career-card__sub' },
        track.id === 'doctor' ? 'Become a Doctor' : 'Become a Veterinarian'),
      h('span', { class: 'career-card__peek' },
        ...track.previewPatients.map((p, i) =>
          h('span', { style: { animationDelay: `${i * 0.14}s` } }, p))));

    grid.appendChild(card);
  }

  el.appendChild(grid);
  el.appendChild(h('p', { class: 'career-note' },
    '🔁 You can swap between doctor and vet whenever you like — you never lose anything.'));

  function choose(career) {
    setCareer(career);
    sfx.fanfare();
    confetti({ intensity: 0.6, duration: 1800 });
    setTimeout(() => goHome('hub', { highlight: career }), 300);
  }

  return { el, destroy: () => bar.dispose?.() };
}
