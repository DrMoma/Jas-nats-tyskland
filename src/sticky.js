import { makeDraggable } from './board.js';
import { observeInView } from './in-view.js';

export function createSticky(note, board) {
  const el = document.createElement('div');
  el.className = `sticky sticky-${note.color}`;
  el.style.left = `${note.x}px`;
  el.style.top = `${note.y}px`;
  el.style.setProperty('--rot', `${note.rotation}deg`);
  el.style.zIndex = note.z;

  el.innerHTML = `<span>${note.text.replace(/\n/g, '<br />')}</span>`;

  observeInView(el);
  makeDraggable(el, note, board);
  return el;
}
