import { BOARD_WIDTH, BOARD_HEIGHT } from './data.js';

/**
 * Marker on the pinboard.
 *
 * Vector, not canvas. The board is 1900x2600 and lives inside a scaled
 * transform — a bitmap that stayed sharp at 2.5x zoom on a retina screen would
 * be ~4750x6500 backing pixels, about 120 MB of texture that has to exist
 * whether or not anyone ever draws. An <svg> inside the same transform is
 * resolution-independent for free: one <path> per stroke, a few hundred bytes
 * each, and the browser re-rasterises them at whatever scale the board happens
 * to be at.
 *
 * Strokes are recorded in *board* coordinates, so they stay glued to the same
 * spot on the board no matter how it is panned or zoomed afterwards.
 */

const NS = 'http://www.w3.org/2000/svg';

// Minimum travel, in board units, before a point is recorded. Below this the
// path fills up with points a marker tip could never have distinguished.
const MIN_DIST = 2.5;

const CLEAR_MS = 450;

export function initDrawing(board) {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('class', 'ink-layer');
  svg.setAttribute('viewBox', `0 0 ${BOARD_WIDTH} ${BOARD_HEIGHT}`);
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.setAttribute('aria-hidden', 'true');
  board.surface.appendChild(svg);
  board.viewport.classList.add('can-draw');

  let path = null;
  let points = [];
  let pointerId = null;
  let rafId = null;
  let clearTimer = null;

  // Every pointer currently down on the board, stroke or not. A stroke is only
  // ever the first one: the second and third are a pan starting, and must not
  // each leave a dot behind them.
  const active = new Set();

  /**
   * Client space to board space. Reuses the geometry Board._measure() already
   * cached — this runs on every pointermove, and getBoundingClientRect() here
   * would flush layout for the whole surface each time.
   */
  const toBoard = (e) => ({
    x: (e.clientX - board.originX - board.x) / board.scale,
    y: (e.clientY - board.originY - board.y) / board.scale,
  });

  const paint = () => {
    rafId = null;
    if (path) path.setAttribute('d', pathData(points));
  };

  const schedule = () => {
    if (!rafId) rafId = requestAnimationFrame(paint);
  };

  /** Drop the stroke in progress without keeping it — used when a pan begins. */
  const abort = () => {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    if (path) path.remove();
    path = null;
    points = [];
    pointerId = null;
    board.viewport.classList.remove('is-drawing');
  };

  const onDown = (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    // Cards, notes and the letter handle their own drag. Text elements should
    // stay selectable — the pen must not steal the pointer from them.
    if (e.target.closest('[data-draggable], input, textarea, [contenteditable], .notes-text, .mac-window')) return;

    active.add(e.pointerId);

    // A second finger means a pan is starting, not a stroke — take back the
    // dot the first finger just laid down.
    if (active.size > 1) {
      abort();
      return;
    }

    pointerId = e.pointerId;
    points = [toBoard(e)];
    path = document.createElementNS(NS, 'path');
    path.setAttribute('d', pathData(points));
    svg.appendChild(path);
    board.viewport.classList.add('is-drawing');
  };

  const onMove = (e) => {
    if (e.pointerId !== pointerId || !path) return;
    const p = toBoard(e);
    const last = points[points.length - 1];
    if (Math.hypot(p.x - last.x, p.y - last.y) < MIN_DIST) return;
    points.push(p);
    schedule();
  };

  const onUp = (e) => {
    active.delete(e.pointerId);
    if (e.pointerId !== pointerId) return;
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    if (path) path.setAttribute('d', pathData(points));
    path = null;
    points = [];
    pointerId = null;
    board.viewport.classList.remove('is-drawing');
  };

  board.viewport.addEventListener('pointerdown', onDown, { passive: true });
  window.addEventListener('pointermove', onMove, { passive: true });
  window.addEventListener('pointerup', onUp, { passive: true });
  window.addEventListener('pointercancel', onUp, { passive: true });

  const api = {
    isEmpty: () => svg.childElementCount === 0,

    undo() {
      const last = svg.lastElementChild;
      if (last) last.remove();
      return !!last;
    },

    /** Fades the whole sheet out, then empties it — the bin, from the dock. */
    clear() {
      if (svg.childElementCount === 0) return false;
      abort();
      svg.classList.add('is-clearing');
      clearTimeout(clearTimer);
      clearTimer = setTimeout(() => {
        svg.replaceChildren();
        svg.classList.remove('is-clearing');
      }, CLEAR_MS);
      return true;
    },
  };

  window.addEventListener('keydown', (e) => {
    // Nothing to undo behind a lightbox or an open letter.
    if (document.body.classList.contains('no-scroll')) return;
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
      if (api.undo()) e.preventDefault();
    }
  });

  return api;
}

/**
 * Points to a path, smoothed. Each recorded point becomes the control point of
 * a quadratic whose endpoints are the midpoints of its neighbours, which is the
 * cheapest way to turn a polyline sampled from a pointer into something that
 * looks drawn rather than plotted.
 */
function pathData(pts) {
  if (pts.length === 0) return '';
  const r = (n) => Math.round(n * 10) / 10;

  // A tap: a zero-length subpath, which a round linecap renders as a dot.
  if (pts.length === 1) return `M ${r(pts[0].x)} ${r(pts[0].y)} l 0 0`;

  let d = `M ${r(pts[0].x)} ${r(pts[0].y)}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i].x + pts[i + 1].x) / 2;
    const my = (pts[i].y + pts[i + 1].y) / 2;
    d += ` Q ${r(pts[i].x)} ${r(pts[i].y)} ${r(mx)} ${r(my)}`;
  }
  const last = pts[pts.length - 1];
  return `${d} L ${r(last.x)} ${r(last.y)}`;
}
