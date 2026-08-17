import { initParallax } from './parallax.js';
import { initCursorTrail } from './cursor-trail.js';
import { mountGaveBrevOverlay } from './gave-brev.js';
import { initDrawing } from './draw.js';
import { mountDock } from './dock.js';

export function initDesktopExtras({ board, boardData, lightbox }) {
  initParallax(board);
  initCursorTrail(board);
  const gaveBrevOverlay = mountGaveBrevOverlay();
  const drawing = initDrawing(board);
  const dock = mountDock({ lightbox, photos: boardData.photos, drawing });
  return { gaveBrevOverlay, drawing, dock };
}
