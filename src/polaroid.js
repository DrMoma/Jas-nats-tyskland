import { makeDraggable } from './board.js';
import { FRAME_ASPECT } from './photo-meta.js';
import { observeInView } from './in-view.js';

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const INTRO_STAGGER_MS = 45;
const INTRO_MAX_STAGGERED = 14; // beyond this the tail would just feel slow

// Every polaroid created, so the reveal can pick out the ones on screen.
const registry = new Set();

/**
 * Drops the on-screen polaroids onto the board, staggered.
 *
 * Called when the board is actually revealed rather than at load time — during
 * the intro the board sits behind the postcard, so an animation then would be
 * played to nobody. Cards panned to later simply develop in place.
 */
export function playIntroDrop() {
  if (reduceMotion) return;

  let i = 0;
  for (const el of registry) {
    if (!el.classList.contains('in-view')) continue;
    el.style.setProperty(
      '--intro-delay',
      `${Math.min(i++, INTRO_MAX_STAGGERED) * INTRO_STAGGER_MS}ms`
    );
    el.classList.add('intro-drop');
    el.addEventListener('animationend', () => el.classList.remove('intro-drop'), {
      once: true,
    });
  }
}

/**
 * Outer element owns position/rotation/scale (and is what drag moves).
 * Inner element owns the float and drop animations. Keeping them on separate
 * nodes stops the two transforms from fighting each other.
 */
export function createPolaroid(photo, board, { onOpen }) {
  const el = document.createElement('div');
  el.className = 'polaroid';
  el.style.left = `${photo.x}px`;
  el.style.top = `${photo.y}px`;
  el.style.setProperty('--rot', `${photo.rotation}deg`);
  el.style.setProperty('--scale', photo.scale);
  el.style.zIndex = photo.z;

  const [fx, fy] = photo.focus;
  const tape = photo.hasTape
    ? `<div class="tape tape-${photo.tapeSide}" style="--tape-rot:${photo.tapeRotation}deg"></div>`
    : '';

  el.innerHTML = `
    <div class="polaroid-inner">
      ${tape}
      <div class="polaroid-photo" style="--frame:${FRAME_ASPECT[photo.frame]};--focus-x:${fx}%;--focus-y:${fy}%">
        <img data-src="${photo.thumb}" alt="${photo.caption || 'Bilde fra turen'}" decoding="async" draggable="false" />
        <div class="polaroid-develop"></div>
      </div>
      ${photo.caption ? `<div class="polaroid-caption">${photo.caption}</div>` : ''}
    </div>
  `;

  registry.add(el);
  observeInView(el, load);
  makeDraggable(el, photo, board, (moved) => {
    if (!moved) onOpen(photo, el);
  });

  return el;
}

function load(el) {
  const img = el.querySelector('img');
  if (!img) return;

  const frame = el.querySelector('.polaroid-photo');

  img.addEventListener(
    'load',
    () => {
      // will-change is added only for the duration of the develop transition —
      // leaving it on all 30 cards would pin a layer for each one.
      frame.style.willChange = 'filter';
      frame.classList.add('developed');
      frame.addEventListener(
        'transitionend',
        () => {
          frame.style.willChange = '';
        },
        { once: true }
      );
    },
    { once: true }
  );

  img.src = img.dataset.src;
}
