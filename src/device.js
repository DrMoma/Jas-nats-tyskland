/**
 * What this device can afford.
 *
 * The board is a 1900x2600 surface carrying ~70 objects, and the effects that
 * make it look like a real pinboard — filters, blend modes, backdrop blur — are
 * all things a desktop GPU absorbs and a phone does not. Rather than water the
 * board down everywhere, we detect the cheap-rendering case once and let both
 * the CSS and the JS branch on it.
 *
 * The matching CSS lives in one block at the bottom of style.css. Keep the two
 * queries identical, or the board will disagree with itself about which
 * rendering path it is on.
 */
export const LITE_QUERY = '(hover: none) and (pointer: coarse)';

export const IS_LITE = window.matchMedia(LITE_QUERY).matches;

/**
 * WebP support, decided synchronously so image URLs can be picked during the
 * very first render pass. `<picture>` handles this natively for the polaroids;
 * this flag exists for the lightbox, which assigns `img.src` from script and so
 * has no markup-level fallback to lean on.
 */
export const SUPPORTS_WEBP = (() => {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL('image/webp').startsWith('data:image/webp');
  } catch {
    return false;
  }
})();
