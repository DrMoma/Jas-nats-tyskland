/**
 * The window chrome the dock apps live in: title bar, three lights, drag by the
 * bar, and a front-to-back stack.
 *
 * Position rides `transform` on the outer node while the open/close animation
 * rides a scale on the inner one — the same split the polaroids use, so a drag
 * never fights a transition.
 */

const BASE_Z = 965;

// Front-to-back order. Rewriting the whole stack on focus keeps the z-indexes
// bounded, instead of a counter that climbs past the dock after enough clicks.
const stack = [];

let opened = 0;

function raise(win) {
  const i = stack.indexOf(win);
  if (i !== -1) stack.splice(i, 1);
  stack.push(win);
  stack.forEach((w, idx) => {
    w.el.style.zIndex = BASE_Z + idx;
  });
}

export function createWindow({ title, body, className = '', width = 420, canZoom = true, onToggle }) {
  const el = document.createElement('div');
  el.className = `mac-window ${className}`.trim();
  el.style.width = `${width}px`;
  el.innerHTML = `
    <div class="mac-window-inner">
      <header class="mac-titlebar">
        <div class="mac-lights">
          <button class="mac-light mac-close" type="button" aria-label="Lukk"></button>
          <button class="mac-light mac-min" type="button" aria-label="Minimer"></button>
          <button class="mac-light mac-zoom${canZoom ? '' : ' is-disabled'}" type="button" aria-label="Endre størrelse"></button>
        </div>
        <span class="mac-title"></span>
      </header>
      <div class="mac-body"></div>
    </div>
  `;
  el.querySelector('.mac-title').textContent = title;
  el.querySelector('.mac-body').appendChild(body);
  document.body.appendChild(el);

  const win = { el };
  let x = 0;
  let y = 0;
  let placed = false;

  const move = () => {
    el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  };

  const clamp = () => {
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    x = Math.min(Math.max(x, 12 - w + 90), window.innerWidth - 90);
    // The title bar must stay reachable: never let it slide above the top edge
    // or below the dock.
    y = Math.min(Math.max(y, 12), window.innerHeight - 140);
    move();
  };

  /** First open lands near centre; each further app steps down-right of it. */
  const place = () => {
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const step = (opened % 4) * 28;
    x = Math.round((window.innerWidth - w) / 2 + step);
    y = Math.round((window.innerHeight - h) / 2 - 70 + step);
    opened += 1;
    clamp();
  };

  // ---- drag by the title bar ----

  const bar = el.querySelector('.mac-titlebar');
  let dragging = false;
  let start = null;
  let rafId = null;

  const paint = () => {
    rafId = null;
    move();
  };

  bar.addEventListener('pointerdown', (e) => {
    if (e.target.closest('.mac-light')) return;
    dragging = true;
    start = { px: e.clientX, py: e.clientY, x, y };
    bar.setPointerCapture(e.pointerId);
    el.classList.add('is-dragging');
  });

  bar.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    x = start.x + (e.clientX - start.px);
    y = start.y + (e.clientY - start.py);
    if (!rafId) rafId = requestAnimationFrame(paint);
  });

  const endDrag = () => {
    if (!dragging) return;
    dragging = false;
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    clamp();
    el.classList.remove('is-dragging');
  };
  bar.addEventListener('pointerup', endDrag);
  bar.addEventListener('pointercancel', endDrag);

  // ---- lights ----

  el.querySelector('.mac-close').addEventListener('click', () => win.close());
  el.querySelector('.mac-min').addEventListener('click', () => win.close());

  const zoomBtn = el.querySelector('.mac-zoom');
  if (canZoom) {
    zoomBtn.addEventListener('click', () => {
      el.classList.toggle('is-expanded');
      clamp();
    });
  }

  el.addEventListener('pointerdown', () => raise(win));
  window.addEventListener('resize', () => {
    if (win.isOpen) clamp();
  });

  win.isOpen = false;

  win.open = () => {
    if (win.isOpen) {
      raise(win);
      return;
    }
    win.isOpen = true;
    // Placed before it is shown, or the first frame paints it at the top-left
    // corner and it visibly jumps into position.
    if (!placed) {
      place();
      placed = true;
    }
    el.classList.add('open');
    raise(win);
    onToggle?.(true);
    return win;
  };

  win.close = () => {
    if (!win.isOpen) return;
    win.isOpen = false;
    el.classList.remove('open');
    const i = stack.indexOf(win);
    if (i !== -1) stack.splice(i, 1);
    onToggle?.(false);
  };

  win.toggle = () => (win.isOpen ? win.close() : win.open());

  return win;
}

/**
 * Escape closes the front-most window — but only when nothing modal is up.
 * The lightbox and the letter both claim Escape for themselves, and both mark
 * that claim with body.no-scroll.
 */
window.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (document.body.classList.contains('no-scroll')) return;
  const top = stack[stack.length - 1];
  if (top) top.close();
});
