import './style.css';
import {
  board as boardData,
  BOARD_WIDTH,
  BOARD_HEIGHT,
  BOARD_FRAME,
  TITLE,
} from './data.js';
import { Board } from './board.js';
import { createPolaroid, playIntroDrop, trackZoom } from './polaroid.js';
import { createSticky } from './sticky.js';
import { createTitle } from './title.js';
import { createFrame } from './frame.js';
import { mountIntro } from './intro.js';
import { doodleSvg } from './doodles.js';
import { Lightbox } from './lightbox.js';
import { IS_LITE } from './device.js';
import { initDesktopExtras } from './desktop-extras.js';
import { createGaveBrevIcon } from './gave-brev.js';

const viewport = document.getElementById('board-viewport');
const surface = document.getElementById('board-surface');

surface.style.width = `${BOARD_WIDTH}px`;
surface.style.height = `${BOARD_HEIGHT}px`;

const board = new Board(viewport, surface, {
  width: BOARD_WIDTH,
  height: BOARD_HEIGHT,
  frame: BOARD_FRAME,
});
const lightbox = new Lightbox(document.getElementById('lightbox'));

const fragment = document.createDocumentFragment();

// Painted in z-order bands: doodles, then notes, then polaroids on top.
for (const doodle of boardData.doodles) {
  const el = document.createElement('div');
  el.className = 'doodle';
  el.style.left = `${doodle.x}px`;
  el.style.top = `${doodle.y}px`;
  el.style.zIndex = doodle.z;
  el.style.setProperty('--rot', `${doodle.rotation}deg`);
  el.style.setProperty('--scale', doodle.scale);
  el.innerHTML = doodleSvg(doodle.type);
  fragment.appendChild(el);
}

for (const note of boardData.notes) {
  fragment.appendChild(createSticky(note, board));
}

boardData.photos.forEach((photo, i) => {
  fragment.appendChild(
    createPolaroid(photo, board, {
      onOpen: () => lightbox.open(boardData.photos, i),
    })
  );
});

// Desktop-only: gave-brev card
const desktopExtras = !IS_LITE ? initDesktopExtras({ board, boardData }) : null;
if (!IS_LITE && boardData.card) {
  fragment.appendChild(
    createGaveBrevIcon(boardData.card, board, {
      onOpen: () => desktopExtras.gaveBrevOverlay.open(),
    })
  );
}

fragment.appendChild(createTitle(TITLE));
fragment.appendChild(createFrame(BOARD_FRAME));
surface.appendChild(fragment);

// Phones start on a smaller image tier; this is what lets them climb back up
// when someone zooms in far enough to notice.
trackZoom(board);

// The hint retires as soon as the user does anything, or after a few seconds.
// Its clock starts at the reveal, not at load — during the intro there is
// nothing yet to pinch or drag.
const hint = document.getElementById('hint');
let hintHidden = false;
function hideHint() {
  if (hintHidden) return;
  hintHidden = true;
  hint.classList.add('hidden');
}

mountIntro({
  onReveal: () => {
    viewport.classList.add('revealed');
    playIntroDrop();

    hint.classList.remove('is-waiting');
    viewport.addEventListener('pointerdown', hideHint, { once: true });
    setTimeout(hideHint, 6500);
  },
});
