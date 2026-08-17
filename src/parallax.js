import { observeInView } from './in-view.js';

/**
 * Mouse parallax: everything on the board slides a little against the cursor,
 * by an amount tied to how near the front it sits. Depth comes from the z-order
 * bands data.js already assigns, so nothing new has to be measured.
 *
 * Must be called *after* the board is in the DOM — it registers what it finds.
 */

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Peak travel in board pixels, for an element at full depth with the cursor in
// a corner. Much more than this and the board stops feeling pinned to a wall.
const MAX_PX = 10;

const registry = [];
let boardRef = null;
let pendingX = null;
let pendingY = null;
let rafId = null;

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

export function initParallax(board) {
  if (reduceMotion) return;
  boardRef = board;

  // Photos: z 30-70, mapped to the near half of the depth range.
  for (const el of document.querySelectorAll('.polaroid')) {
    const z = parseInt(el.style.zIndex, 10) || 50;
    registry.push({ el, depth: clamp((z - 30) / 40, 0.35, 1) });
  }

  // Doodles sit furthest back, and move least. They carry no idle animation of
  // their own, so nothing was watching them until now — parallax has to ask for
  // the in-view class itself, or every one of them would be written to on every
  // frame whether or not it is on screen.
  for (const el of document.querySelectorAll('.doodle')) {
    observeInView(el);
    registry.push({ el, depth: 0.22 });
  }

  board.viewport.addEventListener('mousemove', onMouseMove, { passive: true });
  board.viewport.addEventListener('mouseleave', onMouseLeave, { passive: true });
}

function onMouseMove(e) {
  pendingX = e.clientX;
  pendingY = e.clientY;
  if (!rafId) rafId = requestAnimationFrame(tick);
}

function onMouseLeave() {
  pendingX = null;
  pendingY = null;
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
  for (const { el } of registry) {
    el.style.removeProperty('--px');
    el.style.removeProperty('--py');
  }
}

function tick() {
  rafId = null;
  if (pendingX === null) return;

  // Viewport geometry comes from Board._measure()'s cache. Reading it back with
  // getBoundingClientRect() here would flush layout for the whole surface, once
  // per frame, for the entire time the mouse is moving.
  const { originX, originY, vw, vh } = boardRef;
  const nx = clamp((pendingX - originX - vw / 2) / (vw / 2), -1, 1);
  const ny = clamp((pendingY - originY - vh / 2) / (vh / 2), -1, 1);

  for (const { el, depth } of registry) {
    // Off screen, or under a finger — either way, not ours to move.
    if (!el.classList.contains('in-view') || el.classList.contains('lifted')) continue;
    el.style.setProperty('--px', `${(-nx * MAX_PX * depth).toFixed(2)}px`);
    el.style.setProperty('--py', `${(-ny * MAX_PX * depth).toFixed(2)}px`);
  }
}
