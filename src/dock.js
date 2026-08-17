import { createWindow } from './mac-window.js';
import { createNotesApp } from './app-notes.js';
import { createCalculatorApp } from './app-calculator.js';

/**
 * The dock. Desktop only — it is created from desktop-extras.js, so on a phone
 * none of this markup, and none of the windows it opens, ever exists.
 *
 * Magnification is pure CSS (`:hover` on the item, `:has()` for its
 * neighbours). Doing it in JS would mean measuring every icon against the
 * cursor on every mousemove, and there is already a parallax loop and a sparkle
 * loop on that event.
 */

const LAUNCH_MS = 620;

export function mountDock({ lightbox, photos, drawing }) {
  const el = document.createElement('div');
  el.className = 'dock';
  el.innerHTML = `
    <div class="dock-panel">
      <button class="dock-item" type="button" data-app="galleri">
        <span class="dock-label">Galleri</span>
        <img class="dock-icon" src="/iconer/photos.webp" alt="Galleri" draggable="false" />
        <span class="dock-dot" aria-hidden="true"></span>
      </button>
      <button class="dock-item" type="button" data-app="notater">
        <span class="dock-label">Notater</span>
        <img class="dock-icon" src="/iconer/notes.webp" alt="Notater" draggable="false" />
        <span class="dock-dot" aria-hidden="true"></span>
      </button>
      <button class="dock-item" type="button" data-app="kalkulator">
        <span class="dock-label">Kalkulator</span>
        <img class="dock-icon" src="/iconer/calculator.png" alt="Kalkulator" draggable="false" />
        <span class="dock-dot" aria-hidden="true"></span>
      </button>
      <span class="dock-sep" aria-hidden="true"></span>
      <button class="dock-item dock-trash" type="button" data-app="papirkurv">
        <span class="dock-label">Papirkurv</span>
        <img class="dock-icon" src="/iconer/trash.png" alt="Papirkurv" draggable="false" />
        <span class="dock-dot" aria-hidden="true"></span>
      </button>
    </div>
  `;
  document.body.appendChild(el);
  // Lifts the pan/zoom hint above the dock instead of behind it.
  document.body.classList.add('has-dock');

  const item = (name) => el.querySelector(`[data-app="${name}"]`);

  /** The bounce a macOS icon does while an app starts up. */
  const launch = (name) => {
    const btn = item(name);
    btn.classList.remove('is-launching');
    void btn.offsetWidth; // restart the animation even on a rapid second click
    btn.classList.add('is-launching');
    setTimeout(() => btn.classList.remove('is-launching'), LAUNCH_MS);
  };

  const running = (name, on) => item(name).classList.toggle('is-running', on);

  const setLabel = (name, text) => {
    item(name).querySelector('.dock-label').textContent = text;
  };

  // ---- Galleri ----

  item('galleri').addEventListener('click', () => {
    launch('galleri');
    lightbox.open(photos, 0);
  });

  // ---- Notater ----

  const notes = createWindow({
    title: 'Notater',
    body: createNotesApp(),
    className: 'mac-window-notes',
    width: 560,
    onToggle: (open) => running('notater', open),
  });

  item('notater').addEventListener('click', () => {
    if (!notes.isOpen) launch('notater');
    notes.toggle();
  });

  // ---- Kalkulator ----

  const calcBody = createCalculatorApp();
  const calc = createWindow({
    title: 'Kalkulator',
    body: calcBody,
    className: 'mac-window-calc',
    width: 268,
    canZoom: false,
    onToggle: (open) => {
      running('kalkulator', open);
      if (open) calcBody.focus();
    },
  });

  item('kalkulator').addEventListener('click', () => {
    if (!calc.isOpen) launch('kalkulator');
    calc.toggle();
  });

  // ---- Papirkurv: empties the marker, not the board ----

  let labelTimer = null;
  item('papirkurv').addEventListener('click', () => {
    const emptied = drawing.clear();
    const btn = item('papirkurv');
    btn.classList.remove('is-shaking');
    void btn.offsetWidth;
    btn.classList.add('is-shaking');
    setTimeout(() => btn.classList.remove('is-shaking'), 420);

    setLabel('papirkurv', emptied ? 'tømt' : 'allerede tom');
    clearTimeout(labelTimer);
    labelTimer = setTimeout(() => setLabel('papirkurv', 'Papirkurv'), 1600);
  });

  return {
    el,
    show: () => el.classList.add('is-visible'),
  };
}
