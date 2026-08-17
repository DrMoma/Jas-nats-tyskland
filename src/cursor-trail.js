import { IS_LITE } from './device.js';

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const POOL_SIZE = 16;
const MIN_SPAWN_DIST = 14;

// Inline SVG: two tiny icons (star and heart) as data URIs.
const STAR = `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M7 1 L8.54 5.5 L13 6 L9.5 9.5 L10.5 14 L7 11.5 L3.5 14 L4.5 9.5 L1 6 L5.46 5.5 Z" fill="#d4a574" />
</svg>`;

const HEART = `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M7 12.5 C2.5 9.5 0 7 0 5 C0 3 1.5 1.5 3 1.5 C4 1.5 5 2 6 3 C6.5 2 7.5 1.5 8.5 1.5 C10.5 1.5 12 3 12 5 C12 7 10 9.5 7 12.5 Z" fill="#c97a7a" />
</svg>`;

let pool = [];
let spawnIndex = 0;
let pendingX = null;
let pendingY = null;
let lastSpawnX = -Infinity;
let lastSpawnY = -Infinity;
let rafId = null;

function initCursorTrail(board) {
  if (reduceMotion) return;

  const container = document.createElement('div');
  container.className = 'sparkle-field';

  // Pre-create the pool of sparkle elements.
  for (let i = 0; i < POOL_SIZE; i++) {
    const el = document.createElement('span');
    el.className = 'sparkle';
    el.innerHTML = i % 2 === 0 ? STAR : HEART;
    container.appendChild(el);
    pool.push(el);
  }

  document.getElementById('app').appendChild(container);

  board.viewport.addEventListener('mousemove', onMouseMove, { passive: true });
  board.viewport.addEventListener('mouseleave', onMouseLeave);
}

function onMouseMove(e) {
  pendingX = e.clientX;
  pendingY = e.clientY;
  if (!rafId) {
    rafId = requestAnimationFrame(tick);
  }
}

function onMouseLeave() {
  pendingX = null;
  pendingY = null;
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
  // Clean up active sparkles on leave.
  for (const el of pool) {
    el.classList.remove('sparkle-active');
  }
}

function tick() {
  rafId = null;

  if (pendingX === null || pendingY === null) return;

  const dist = Math.hypot(
    pendingX - lastSpawnX,
    pendingY - lastSpawnY
  );

  if (dist >= MIN_SPAWN_DIST) {
    spawnIndex = (spawnIndex + 1) % POOL_SIZE;
    const el = pool[spawnIndex];

    el.style.left = `${pendingX}px`;
    el.style.top = `${pendingY}px`;
    el.classList.remove('sparkle-active');

    // Forced reflow to retrigger the animation.
    void el.offsetWidth;
    el.classList.add('sparkle-active');

    lastSpawnX = pendingX;
    lastSpawnY = pendingY;
  }

  // Schedule next frame only if we still have pending mouse data.
  if (pendingX !== null && pendingY !== null) {
    rafId = requestAnimationFrame(tick);
  }
}

export { initCursorTrail };
