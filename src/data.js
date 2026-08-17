import manifest from './manifest.json';
import { metaFor } from './photo-meta.js';
import { makeRng, between, pick } from './rng.js';

// The whiteboard is bigger than any screen; the user pans and zooms around it.
// Sized so the polaroids cover ~33% of it — dense enough to feel decorated,
// open enough to breathe.
export const BOARD_WIDTH = 1900;
export const BOARD_HEIGHT = 2600;

// Thickness of the wooden frame that surrounds the board. It sits *outside*
// BOARD_WIDTH/HEIGHT, and the pan bounds in board.js are measured against it.
export const BOARD_FRAME = 46;

// Polaroid geometry, mirroring the CSS box in style.css.
const POLAROID_W = 210;
const PAD_X = 14;
const PAD_TOP = 14;
const PAD_BOTTOM = 40;
const IMG_W = POLAROID_W - PAD_X * 2;

const NOTE_W = 140;
const NOTE_H = 130;

const CARD_W = 156;
const CARD_H = 126;

// The title block owns the top of the board; nothing else may sit on it.
export const TITLE = { x: BOARD_WIDTH / 2, y: 150, w: 760, h: 210 };

/**
 * A z-order law rather than a z-order suggestion. Because these bands do not
 * overlap, a sticky note can peek out from *behind* a polaroid (the feeling of
 * discovery the board wants) but can never cover one — which is the bug the
 * previous random placement shipped.
 */
const Z = {
  doodle: [0, 9],
  note: [10, 29],
  photo: [30, 70],
  card: [71, 79],
};

// Written by someone who only got to look at the photos afterwards — the
// wistful half of the board's voice. Always "dere", never "vi".
const STICKY_MESSAGES = [
  'skulle vært\nder',
  'neste gang\nblir jeg med',
  'hvorfor ble\nikke jeg med?',
  'jeg er så\nmisunnelig',
  'dere ser så\nglade ut',
  'dette hadde\njeg elsket',
  'har sett på\ndisse ti ganger',
  'ser ut som\nen fin tur',
  'jeg vil dit',
  'kanskje\nneste sommer',
  'savner dere',
  'lagrer alle\nbildene',
];

const STICKY_COLORS = ['yellow', 'pink', 'blue', 'green'];
const DOODLE_TYPES = ['heart', 'star', 'smiley', 'arrow', 'circle', 'scribble'];

function polaroidSize(frame, scale) {
  const imgH = frame === 'tall' ? (IMG_W * 4) / 3 : IMG_W;
  return {
    w: POLAROID_W * scale,
    h: (PAD_TOP + imgH + PAD_BOTTOM) * scale,
  };
}

/** Axis-aligned overlap area between two centre-anchored rects. */
function overlapArea(a, b) {
  const ox = (a.w + b.w) / 2 - Math.abs(a.x - b.x);
  const oy = (a.h + b.h) / 2 - Math.abs(a.y - b.y);
  return ox > 0 && oy > 0 ? ox * oy : 0;
}

function centreInside(point, rect) {
  return (
    Math.abs(point.x - rect.x) < rect.w / 2 && Math.abs(point.y - rect.y) < rect.h / 2
  );
}

/**
 * Photos are grouped into loose clusters instead of a grid. Each placement is
 * rejection-sampled so neighbours may kiss at the corners but never occlude.
 */
function placePhotos(rng) {
  const placed = [];
  const items = manifest.map((photo) => ({ photo, meta: metaFor(photo.id) }));

  const CLUSTERS = 6;
  const perCluster = Math.ceil(items.length / CLUSTERS);
  const margin = 150;

  // Cluster anchors on a jittered 2x3 lattice.
  const anchors = [];
  for (let i = 0; i < CLUSTERS; i++) {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const cellW = (BOARD_WIDTH - margin * 2) / 2;
    const cellH = (BOARD_HEIGHT - margin * 2 - TITLE.h) / 3;
    anchors.push({
      x: margin + cellW * (col + 0.5) + between(rng, -cellW * 0.16, cellW * 0.16),
      y:
        margin +
        TITLE.h +
        cellH * (row + 0.5) +
        between(rng, -cellH * 0.14, cellH * 0.14),
    });
  }

  items.forEach((item, i) => {
    const anchor = anchors[Math.floor(i / perCluster)] || anchors[anchors.length - 1];
    const scale = between(rng, 0.94, 1.06);
    const size = polaroidSize(item.meta.frame, scale);
    // Rotation grows the footprint a little; pad so rotated corners stay clear.
    const hit = { w: size.w * 1.07, h: size.h * 1.07 };

    let best = null;
    for (let attempt = 0; attempt < 90; attempt++) {
      const spread = 190 + attempt * 4;
      const angle = rng() * Math.PI * 2;
      const radius = Math.sqrt(rng()) * spread;
      const cand = {
        x: anchor.x + Math.cos(angle) * radius,
        y: anchor.y + Math.sin(angle) * radius * 0.85,
      };

      // Stay on the board and off the title.
      const halfW = hit.w / 2;
      const halfH = hit.h / 2;
      if (cand.x - halfW < 40 || cand.x + halfW > BOARD_WIDTH - 40) continue;
      if (cand.y - halfH < 40 || cand.y + halfH > BOARD_HEIGHT - 40) continue;
      if (overlapArea({ ...cand, ...hit }, TITLE) > 0) continue;

      const rect = { ...cand, ...hit };
      const area = hit.w * hit.h;
      let worst = 0;
      for (const other of placed) {
        const frac = overlapArea(rect, other.hit) / Math.min(area, other.hit.w * other.hit.h);
        if (frac > worst) worst = frac;
      }

      if (worst <= 0.1) {
        best = { cand, worst };
        break;
      }
      if (!best || worst < best.worst) best = { cand, worst };
    }

    const { x, y } = best.cand;
    placed.push({
      ...item.photo,
      ...item.meta,
      x,
      y,
      scale,
      rotation: between(rng, -8, 8),
      z: Math.floor(between(rng, Z.photo[0], Z.photo[1])),
      hasTape: rng() > 0.3,
      tapeRotation: between(rng, -20, 20),
      tapeSide: pick(rng, ['top-left', 'top-right', 'top-center']),
      hit: { x, y, w: hit.w, h: hit.h },
    });
  });

  return placed;
}

/**
 * Notes live in the gaps. They may tuck partly behind a polaroid, but their
 * centre may never land on one — a note whose middle is swallowed reads as a
 * bug, not as depth.
 */
function placeNotes(rng, photos) {
  const notes = [];
  const noteArea = NOTE_W * NOTE_H;

  STICKY_MESSAGES.forEach((text, i) => {
    let chosen = null;

    for (let attempt = 0; attempt < 120; attempt++) {
      const cand = {
        x: between(rng, 110, BOARD_WIDTH - 110),
        y: between(rng, 110, BOARD_HEIGHT - 110),
      };
      const rect = { ...cand, w: NOTE_W, h: NOTE_H };

      if (overlapArea(rect, TITLE) > 0) continue;
      if (photos.some((p) => centreInside(cand, p.hit))) continue;
      if (notes.some((n) => overlapArea(rect, { x: n.x, y: n.y, w: NOTE_W, h: NOTE_H }) > 0))
        continue;

      // Allow a note to slip behind a photo edge, but never to vanish under one.
      const covered = photos.reduce((sum, p) => sum + overlapArea(rect, p.hit), 0) / noteArea;
      if (covered > 0.35) continue;

      chosen = cand;
      break;
    }

    if (!chosen) return; // Board is full — better to drop a note than to stack it.

    notes.push({
      id: `note-${i}`,
      text,
      x: chosen.x,
      y: chosen.y,
      rotation: between(rng, -10, 10),
      color: pick(rng, STICKY_COLORS),
      z: Math.floor(between(rng, Z.note[0], Z.note[1])),
    });
  });

  return notes;
}

/** Doodles fill leftover whitespace; one hidden under a photo is wasted paint. */
function placeDoodles(rng, photos, notes, count = 26) {
  const doodles = [];

  for (let i = 0; i < count; i++) {
    let chosen = null;

    for (let attempt = 0; attempt < 60; attempt++) {
      const cand = {
        x: between(rng, 60, BOARD_WIDTH - 60),
        y: between(rng, 60, BOARD_HEIGHT - 60),
      };
      if (photos.some((p) => centreInside(cand, p.hit))) continue;
      if (notes.some((n) => centreInside(cand, { x: n.x, y: n.y, w: NOTE_W, h: NOTE_H })))
        continue;
      if (overlapArea({ ...cand, w: 60, h: 60 }, TITLE) > 0) continue;
      chosen = cand;
      break;
    }

    if (!chosen) continue;

    doodles.push({
      id: `doodle-${i}`,
      type: pick(rng, DOODLE_TYPES),
      x: chosen.x,
      y: chosen.y,
      rotation: between(rng, -25, 25),
      scale: between(rng, 0.7, 1.35),
      z: Math.floor(between(rng, Z.doodle[0], Z.doodle[1])),
    });
  }

  return doodles;
}

function placeGaveBrev(rng, photos, notes) {
  for (let attempt = 0; attempt < 150; attempt++) {
    const cand = {
      x: between(rng, BOARD_WIDTH * 0.32, BOARD_WIDTH * 0.68),
      y: between(rng, TITLE.y + TITLE.h + 80, TITLE.y + TITLE.h + 520),
    };
    const rect = { ...cand, w: CARD_W, h: CARD_H };

    if (overlapArea(rect, TITLE) > 0) continue;
    if (photos.some((p) => centreInside(cand, p.hit))) continue;
    if (notes.some((n) => overlapArea(rect, { x: n.x, y: n.y, w: NOTE_W, h: NOTE_H }) > 0))
      continue;

    const covered = photos.reduce((sum, p) => sum + overlapArea(rect, p.hit), 0) / (CARD_W * CARD_H);
    if (covered > 0.35) continue;

    return {
      id: 'gave-brev',
      x: cand.x,
      y: cand.y,
      rotation: between(rng, -6, 6),
      z: Math.floor(between(rng, Z.card[0], Z.card[1])),
    };
  }

  return null;
}

function buildBoard(seed) {
  const rng = makeRng(seed);
  const photos = placePhotos(rng);
  const notes = placeNotes(rng, photos);
  const doodles = placeDoodles(rng, photos, notes);
  const card = placeGaveBrev(rng, photos, notes);
  return { photos, notes, doodles, card };
}

export const board = buildBoard(20260805);

// Dev-only guard: the note-covering-a-photo bug must not silently come back.
if (import.meta.env?.DEV) {
  const violations = board.notes.filter((n) =>
    board.photos.some(
      (p) =>
        n.z > p.z &&
        Math.abs(n.x - p.x) < p.hit.w * 0.35 &&
        Math.abs(n.y - p.y) < p.hit.h * 0.3
    )
  );
  if (violations.length) {
    console.warn('[board] notes covering photo centres:', violations);
  }
  if (board.card) {
    const cardViolations = board.photos.some((p) =>
      Math.abs(board.card.x - p.x) < p.hit.w * 0.35 &&
      Math.abs(board.card.y - p.y) < p.hit.h * 0.3
    );
    if (cardViolations) {
      console.warn('[board] card covering photo centre');
    }
  }
}
