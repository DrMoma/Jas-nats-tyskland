/**
 * The wooden frame around the board.
 *
 * Four separate rails rather than one bordered box, so the grain can run along
 * each length the way real timber does, and so the corners can be mitred.
 * It lives inside the board surface but is inset negatively, sitting just
 * outside the pinboard area — and it scales with the board, so it reads as a
 * physical object rather than a UI chrome overlay.
 */
export function createFrame(thickness) {
  const el = document.createElement('div');
  el.className = 'board-frame';
  el.style.setProperty('--frame-w', `${thickness}px`);
  el.setAttribute('aria-hidden', 'true');

  el.innerHTML = ['top', 'right', 'bottom', 'left']
    .map((side) => `<div class="frame-rail frame-${side}"></div>`)
    .join('');

  return el;
}
