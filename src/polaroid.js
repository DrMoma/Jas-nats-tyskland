import { makeDraggable } from './board.js';
import { FRAME_ASPECT } from './photo-meta.js';
import { observeInView } from './in-view.js';
import { IS_LITE } from './device.js';

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const INTRO_STAGGER_MS = 45;
const INTRO_MAX_STAGGERED = 14; // beyond this the tail would just feel slow

/**
 * Which image tier a phone starts on, and when it stops being enough.
 *
 * The board opens at 0.62x, where a polaroid's photo window is ~113 CSS px —
 * the 384px tier covers that on a 3x screen at a third of the bytes, and 30 of
 * those is the difference between ~1.5 MB and ~390 KB of decoded bitmaps sitting
 * in memory. Past this scale the small one starts to show, so cards on screen
 * quietly swap up to 640. Desktop has the headroom and just starts at 640.
 */
const UPGRADE_SCALE = 1.3;
let tier = IS_LITE ? 'small' : 'thumb';

// Every polaroid created, so the reveal can pick out the ones on screen and the
// zoom handler can find the ones worth re-sourcing.
const registry = new Set();
const photos = new WeakMap();

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
 * Watches the zoom level and moves the whole board up a tier once the small
 * images would start to show. Only cards currently on screen are re-fetched;
 * the rest pick the new tier up when they next scroll into view, so zooming in
 * costs a screenful of requests rather than all thirty at once.
 */
export function trackZoom(board) {
  if (!IS_LITE) return;

  board.onScale((scale) => {
    const next = scale >= UPGRADE_SCALE ? 'thumb' : 'small';
    if (next === tier) return;
    tier = next;

    // Downgrading is pointless: the larger file is already decoded and cached,
    // and swapping back would only cost another round trip to look worse.
    if (next !== 'thumb') return;

    for (const el of registry) {
      if (!el.dataset.loaded || !el.classList.contains('in-view')) continue;
      el.dataset.tier = tier;
      applySource(el);
    }
  });
}

function sourcesFor(photo) {
  return {
    jpeg: photo[tier] || photo.thumb,
    webp: photo[`${tier}Webp`] || photo.thumbWebp,
  };
}

function applySource(el) {
  const photo = photos.get(el);
  if (!photo) return;

  const { jpeg, webp } = sourcesFor(photo);
  const source = el.querySelector('source');
  const img = el.querySelector('img');

  // srcset before src: the browser resolves <picture> in document order, so the
  // WebP candidate has to be in place before the fallback triggers a fetch.
  if (source && webp) source.srcset = webp;
  if (img) img.src = jpeg;
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

  const secret = !IS_LITE && photo.secret
    ? `<div class="polaroid-secret" tabindex="0" role="button" aria-label="hemmelig notis">
         <span class="polaroid-secret-note">${photo.secret}</span>
       </div>`
    : '';

  // The <source> is left empty until the card is near the screen — a populated
  // srcset would fetch immediately and defeat the lazy loading below.
  const webpSource = photo.thumbWebp ? '<source type="image/webp" />' : '';

  el.innerHTML = `
    <div class="polaroid-inner">
      ${tape}
      <div class="polaroid-photo" style="--frame:${FRAME_ASPECT[photo.frame]};--focus-x:${fx}%;--focus-y:${fy}%">
        <picture>
          ${webpSource}
          <img alt="${photo.caption || 'Bilde fra turen'}" decoding="async" draggable="false" />
        </picture>
        <div class="polaroid-develop"></div>
      </div>
      ${photo.caption ? `<div class="polaroid-caption">${photo.caption}</div>` : ''}
      ${secret}
    </div>
  `;

  photos.set(el, photo);
  registry.add(el);
  observeInView(el, load, upgradeIfStale);
  makeDraggable(el, photo, board, (moved) => {
    if (!moved) onOpen(photo, el);
  });

  return el;
}

/** A card scrolling back in after the board was zoomed past UPGRADE_SCALE. */
function upgradeIfStale(el) {
  if (el.dataset.loaded && el.dataset.tier !== tier) {
    el.dataset.tier = tier;
    applySource(el);
  }
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

  el.dataset.loaded = 'true';
  el.dataset.tier = tier;
  applySource(el);
}
