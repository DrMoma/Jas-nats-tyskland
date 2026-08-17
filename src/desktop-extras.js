import { initParallax } from './parallax.js';
import { initCursorTrail } from './cursor-trail.js';
import { mountGaveBrevOverlay } from './gave-brev.js';

export function initDesktopExtras({ board, boardData }) {
  initParallax(board);
  initCursorTrail(board);
  const gaveBrevOverlay = mountGaveBrevOverlay();
  return { gaveBrevOverlay };
}
