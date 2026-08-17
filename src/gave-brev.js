import { makeDraggable } from './board.js';

const WAX_SEAL = `<svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
  <g fill="#c97a7a" opacity="0.88">
    <path d="M11 1.5 C7 4 4 7 4 11 C4 16 7.5 19.5 11 21 C14.5 19.5 18 16 18 11 C18 7 15 4 11 1.5 Z" />
  </g>
</svg>`;

export function createGaveBrevIcon(card, board, { onOpen }) {
  const el = document.createElement('div');
  el.className = 'gave-brev';
  el.style.left = `${card.x}px`;
  el.style.top = `${card.y}px`;
  el.style.setProperty('--rot', `${card.rotation}deg`);
  el.style.zIndex = card.z;

  el.innerHTML = `
    <div class="gave-brev-inner">
      <div class="gave-brev-seal">${WAX_SEAL}</div>
    </div>
  `;

  makeDraggable(el, card, board, (moved) => {
    if (!moved) onOpen();
  });

  return el;
}

export class GaveBrevOverlay {
  constructor(onClose) {
    this.onClose = onClose;
    this.el = null;
    this.open = this.open.bind(this);
    this.close = this.close.bind(this);
    this._onBackdropClick = this._onBackdropClick.bind(this);
    this._onKeyDown = this._onKeyDown.bind(this);
    this.mount();
  }

  mount() {
    this.el = document.createElement('div');
    this.el.className = 'gave-brev-overlay';

    this.el.innerHTML = `
      <div class="gave-brev-backdrop"></div>
      <div class="gave-brev-card">
        <div class="gave-brev-kicker">ny skjerm, samme tavle</div>
        <h2 class="gave-brev-title">gratulerer med den nye</h2>
        <div class="gave-brev-body">
          <p>Hørte du fikk deg en ny PC.</p>
          <p>Tavla har sett akkurat like fin ut hele tiden — men nå får den endelig vises på en skjerm som er like god som bildene fortjener.</p>
          <p>Det ligger noen ting nederst på skjermen også. Ta en titt i notatene.</p>
          <p>Ingen stor greie. Bare en unnskyldning for å åpne denne én gang til.</p>
        </div>
        <div class="gave-brev-sign">fortsatt ikke med på turen — men nå i det minste i bedre oppløsning</div>
      </div>
    `;

    const backdrop = this.el.querySelector('.gave-brev-backdrop');
    backdrop.addEventListener('click', this._onBackdropClick);

    document.body.appendChild(this.el);
  }

  open() {
    this.el.classList.add('open');
    document.body.classList.add('no-scroll');
    document.addEventListener('keydown', this._onKeyDown);
  }

  close() {
    this.el.classList.remove('open');
    document.body.classList.remove('no-scroll');
    document.removeEventListener('keydown', this._onKeyDown);
    if (this.onClose) this.onClose();
  }

  _onBackdropClick() {
    this.close();
  }

  _onKeyDown(e) {
    if (e.key === 'Escape') {
      this.close();
    }
  }
}

export function mountGaveBrevOverlay() {
  return new GaveBrevOverlay();
}
