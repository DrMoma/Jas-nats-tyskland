/**
 * The postcard you meet before the board.
 *
 * Its markup lives in index.html so it paints on the very first frame, and it
 * shares the wall behind the board rather than drawing its own background. The
 * handover is therefore not a page change at all: the veil clears, the postcard
 * is lifted off the wall, and the board fades up in the same space.
 */
const LEAVE_MS = 900;

export function mountIntro({ onReveal }) {
  const intro = document.getElementById('intro');
  const openBtn = document.getElementById('intro-open');
  if (!intro || !openBtn) {
    onReveal();
    return;
  }

  let opened = false;

  const open = () => {
    if (opened) return;
    opened = true;

    intro.classList.add('leaving');
    onReveal();

    // Take it out of the layout and the a11y tree once it has faded.
    window.setTimeout(() => {
      intro.classList.add('gone');
      intro.setAttribute('aria-hidden', 'true');
    }, LEAVE_MS);
  };

  openBtn.addEventListener('click', open);

  // The whole postcard is a target, not just the button.
  intro.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.postcard')) open();
  });

  window.addEventListener('keydown', (e) => {
    if (!opened && (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape')) open();
  });

  openBtn.focus({ preventScroll: true });
}
