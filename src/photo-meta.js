/**
 * Hand-authored, per-photo presentation data. Keyed by manifest id.
 *
 *   frame    'square' (default) | 'tall'  — the polaroid's image-window shape.
 *   focus    [x%, y%] passed to object-position. Chosen by eye so the crop
 *            window lands on the subject. Phone photos put faces in the upper
 *            third, so most of these sit well above 50%.
 *   rotate   degrees applied at BUILD time (see scripts/process-images.mjs).
 *            Only needed where EXIF orientation was stripped and the stored
 *            pixels are sideways.
 *   caption  Norwegian, lowercase, written in the voice of someone who only
 *            *saw* these photos and wishes they had come along — so it is
 *            always "dere"/"du", never "vi". Describes only what is visibly in
 *            the frame: no names, no places, no dates.
 *
 * The crop window maths, if you want to re-tune a focus value:
 *   window_top = focus_y × (H_source − H_visible)
 *
 * Adding a photo? Drop it in the source folder, run `npm run images`, then add
 * an entry here. Anything missing just falls back to square / centre / no caption.
 */
export const PHOTO_META = {
  // ── The five that must not be square: their vertical composition IS the photo.
  img8915: { frame: 'tall', focus: [50, 46], caption: 'alle sammen. uten meg.' },
  img8913: { frame: 'tall', focus: [50, 46], caption: 'dere to' },
  img8925: { frame: 'tall', focus: [50, 8], caption: 'dere ser altfor glade ut' },
  '4c97d66e0a1c4acf954b857702b15c93': {
    frame: 'tall',
    focus: [50, 30],
    caption: 'så mange discokuler',
  },
  af2bda07aa4249729291f3c6caf077f0: {
    frame: 'tall',
    focus: [50, 26],
    caption: 'og jeg fikk ingen',
  },

  // ── Square, with the focal point pulled up so nobody loses their head.
  img8840: { focus: [50, 14], caption: 'rødt lys, sen middag', secret: 'dette bildet så jeg lengst på' },
  img8841: { focus: [50, 50], caption: 'byen om natten' },
  img8842: { focus: [50, 20], caption: 'et helt tak av discokuler' },
  img8847: { focus: [50, 40], caption: 'helt ute av fokus' },
  img8848: { rotate: 270, focus: [58, 42], caption: 'venter ute, sent' },
  img8891: { focus: [42, 40], caption: 'gress og skygge' },
  img8892: { focus: [50, 42], caption: 'den lange stien i skyggen' },
  img8895: { focus: [50, 10], caption: 'solbrillevær, selvfølgelig' },
  img8896: { focus: [50, 40], caption: 'innsjøen, helt åpen' },
  img8897: { focus: [50, 45], caption: 'ringer i vannet', secret: 'skulle ønske jeg hørte hva som ble sagt her' },
  img8899: { focus: [50, 46], caption: '«springen verboten»' },
  img8900: { focus: [50, 42], caption: 'himmelen gjennom løvet' },
  img8901: { focus: [50, 46], caption: 'pizza underveis' },
  img8903: { focus: [50, 18], caption: 'all osten!' },
  img8905: { focus: [50, 38], caption: 'stearinlys i skumringen' },
  img8907: { focus: [50, 40], caption: 'lyslenken ble tent' },
  img8911: { focus: [50, 28], caption: 'ut av vinduet, over broen' },
  img8916: { focus: [50, 26], caption: 'hele gjengen', secret: 'nesten som å være der' },
  img8921: { focus: [50, 44], caption: 'solnedgang ved gaten' },
  img8923: { focus: [50, 42], caption: 'våt rullebane' },
  img8924: { focus: [50, 36], caption: 'regn på vinduet' },
  img8928: { focus: [50, 34], caption: 'byens lys under vingen' },
  img8931: { focus: [50, 36], caption: 'over skyene' },
  img8933: { focus: [50, 42], caption: 'hele kysten opplyst' },
  img8935: { focus: [50, 44], caption: 'og så var dere hjemme' },
};

/** Image-window aspect ratio for each frame kind, as a CSS aspect-ratio value. */
export const FRAME_ASPECT = {
  square: '1 / 1',
  tall: '3 / 4',
};

export function metaFor(id) {
  const meta = PHOTO_META[id] || {};
  return {
    frame: meta.frame || 'square',
    focus: meta.focus || [50, 35],
    caption: meta.caption || '',
    rotate: meta.rotate || 0,
    secret: meta.secret || '',
  };
}
