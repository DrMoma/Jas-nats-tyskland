import { IS_LITE } from './device.js';

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const MAX_PX = 18;

let parallaxRegistry = [];
let pendingX = null;
let pendingY = null;
let rafId = null;

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function initParallax(board) {
  if (reduceMotion) return;

  // Register all polaroids for parallax.
  const polaroids = document.querySelectorAll('.polaroid');
  for (const el of polaroids) {
    const photo = el.dataset;
    const z = parseInt(el.style.zIndex, 10) || 50;
    const depth = clamp((z - 30) / (70 - 30), 0.35, 1);
    parallaxRegistry.push({ el, depth });
  }

  // Register doodles at a fixed, small depth.
  const doodles = document.querySelectorAll('.doodle');
  for (const el of doodles) {
    parallaxRegistry.push({ el, depth: 0.25 });
  }

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
  // Reset all parallax offsets to zero.
  for (const { el } of parallaxRegistry) {
    el.style.setProperty('--px', '0px');
    el.style.setProperty('--py', '0px');
  }
}

function tick() {
  rafId = null;

  if (pendingX === null || pendingY === null) return;

  const board = document.querySelector('#board-viewport');
  if (!board) return;

  const rect = board.getBoundingClientRect();
  const centerX = rect.width / 2 + rect.left;
  const centerY = rect.height / 2 + rect.top;

  // Normalized cursor position relative to viewport center: -1 to +1.
  const nx = clamp((pendingX - centerX) / (rect.width / 2), -1, 1);
  const ny = clamp((pendingY - centerY) / (rect.height / 2), -1, 1);

  for (const { el, depth } of parallaxRegistry) {
    // Skip off-screen and actively-dragged elements.
    if (!el.classList.contains('in-view') || el.classList.contains('lifted')) {
      el.style.setProperty('--px', '0px');
      el.style.setProperty('--py', '0px');
      continue;
    }

    const px = -nx * MAX_PX * depth;
    const py = -ny * MAX_PX * depth;

    el.style.setProperty('--px', `${px}px`);
    el.style.setProperty('--py', `${py}px`);
  }
}

export { initParallax };
