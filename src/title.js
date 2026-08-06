import { observeInView } from './in-view.js';

/**
 * The board's identity, written in marker at the top.
 *
 * The subtitle sets the voice for everything else on the board: these are
 * someone else's photos, looked at by someone who stayed home. Deliberately no
 * year — the source files have no EXIF dates left, so one would be invented.
 */
export const TITLE_TEXT = 'Tyskland';
export const SUBTITLE_TEXT = 'bildene jeg ikke er på';

export function createTitle({ x, y }) {
  const el = document.createElement('div');
  el.className = 'board-title';
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;

  el.innerHTML = `
    <h1>${TITLE_TEXT}</h1>
    <svg class="title-underline" viewBox="0 0 420 24" preserveAspectRatio="none" aria-hidden="true">
      <path d="M6 15 C 90 4, 200 22, 300 10 S 400 6, 414 13" />
    </svg>
    ${SUBTITLE_TEXT ? `<p class="title-sub">${SUBTITLE_TEXT}</p>` : ''}
  `;

  observeInView(el, (node) => node.classList.add('drawn'));
  return el;
}
