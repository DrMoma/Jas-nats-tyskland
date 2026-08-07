import { execSync } from 'node:child_process';
import { mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { extname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { metaFor } from '../src/photo-meta.js';

const SRC_DIR = '/Users/momcilo/Downloads/bilder';
const OUT_ROOT = fileURLToPath(new URL('../public/photos/', import.meta.url));
const SMALL_DIR = join(OUT_ROOT, 'small');
const THUMB_DIR = join(OUT_ROOT, 'thumb');
const FULL_DIR = join(OUT_ROOT, 'full');

// The board zooms to 2.5x, so 480px thumbs went soft. 640 at a lower quality
// costs roughly the same bytes and holds up when zoomed in.
const THUMB_MAX_EDGE = 640;
const THUMB_QUALITY = 55;
const FULL_MAX_EDGE = 1600;
const FULL_QUALITY = 82;

// A phone opens the board at 0.62x, where a polaroid's photo window is ~113 CSS
// px — about 340 device px on a 3x screen. 384 covers that with room to spare,
// at roughly a third of the bytes. Zoom past ~1.3x and the board swaps up to the
// 640 tier (see polaroid.js), so nothing is lost by starting small.
const SMALL_MAX_EDGE = 384;
const SMALL_WEBP_QUALITY = 68;
const THUMB_WEBP_QUALITY = 72;
const FULL_WEBP_QUALITY = 78;

mkdirSync(SMALL_DIR, { recursive: true });
mkdirSync(THUMB_DIR, { recursive: true });
mkdirSync(FULL_DIR, { recursive: true });

/**
 * WebP roughly halves these files, but cwebp is a Homebrew extra rather than
 * something macOS ships (sips cannot write WebP). If it is missing we still
 * produce a complete, working set of JPEGs — the site just carries more bytes.
 */
const HAS_CWEBP = (() => {
  try {
    execSync('command -v cwebp', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
})();

if (!HAS_CWEBP) {
  console.warn('cwebp not found — writing JPEG only. `brew install webp` for ~50% smaller images.');
}

function toWebp(jpegPath, outPath, quality) {
  if (!HAS_CWEBP) return false;
  execSync(`cwebp -q ${quality} -quiet "${jpegPath}" -o "${outPath}"`, { stdio: 'ignore' });
  return true;
}

/** Source pixel dimensions — needed to reason about focal-point crop windows. */
function readDimensions(path) {
  const out = execSync(`sips -g pixelWidth -g pixelHeight "${path}"`, {
    encoding: 'utf8',
  });
  const w = Number(out.match(/pixelWidth:\s*(\d+)/)?.[1]);
  const h = Number(out.match(/pixelHeight:\s*(\d+)/)?.[1]);
  return { w, h };
}

function toId(file) {
  return basename(file, extname(file)).toLowerCase().replace(/[^a-z0-9]/g, '');
}

const files = readdirSync(SRC_DIR)
  .filter((f) => ['.jpg', '.jpeg', '.png'].includes(extname(f).toLowerCase()))
  .sort();

const manifest = files.map((file) => {
  const srcPath = join(SRC_DIR, file);
  const id = toId(file);
  const name = `${id}.jpg`;
  const webpName = `${id}.webp`;

  // Some sources had their EXIF orientation stripped, so the stored pixels are
  // sideways. Bake the rotation in here rather than at runtime — the lightbox
  // then gets a correctly oriented file for free.
  const { rotate } = metaFor(id);
  const rotateFlag = rotate ? `-r ${rotate}` : '';

  const smallJpeg = join(SMALL_DIR, name);
  const thumbJpeg = join(THUMB_DIR, name);
  const fullJpeg = join(FULL_DIR, name);

  execSync(
    `sips -s format jpeg -s formatOptions ${THUMB_QUALITY} --resampleHeightWidthMax ${SMALL_MAX_EDGE} ${rotateFlag} "${srcPath}" --out "${smallJpeg}"`,
    { stdio: 'ignore' }
  );

  execSync(
    `sips -s format jpeg -s formatOptions ${THUMB_QUALITY} --resampleHeightWidthMax ${THUMB_MAX_EDGE} ${rotateFlag} "${srcPath}" --out "${thumbJpeg}"`,
    { stdio: 'ignore' }
  );

  execSync(
    `sips -s format jpeg -s formatOptions ${FULL_QUALITY} --resampleHeightWidthMax ${FULL_MAX_EDGE} ${rotateFlag} "${srcPath}" --out "${fullJpeg}"`,
    { stdio: 'ignore' }
  );

  // WebP is transcoded from the JPEG we just wrote rather than from the source,
  // so both formats are the same crop, rotation and resample — the fallback can
  // never disagree with what it is falling back from.
  const hasWebp =
    toWebp(smallJpeg, join(SMALL_DIR, webpName), SMALL_WEBP_QUALITY) &&
    toWebp(thumbJpeg, join(THUMB_DIR, webpName), THUMB_WEBP_QUALITY) &&
    toWebp(fullJpeg, join(FULL_DIR, webpName), FULL_WEBP_QUALITY);

  // Report post-rotation dimensions so downstream crop maths matches reality.
  const raw = readDimensions(srcPath);
  const swap = rotate === 90 || rotate === 270;
  const w = swap ? raw.h : raw.w;
  const h = swap ? raw.w : raw.h;

  return {
    id,
    small: `/photos/small/${name}`,
    thumb: `/photos/thumb/${name}`,
    full: `/photos/full/${name}`,
    ...(hasWebp && {
      smallWebp: `/photos/small/${webpName}`,
      thumbWebp: `/photos/thumb/${webpName}`,
      fullWebp: `/photos/full/${webpName}`,
    }),
    w,
    h,
  };
});

writeFileSync(
  fileURLToPath(new URL('../src/manifest.json', import.meta.url)),
  JSON.stringify(manifest, null, 2)
);

console.log(`Processed ${manifest.length} images.`);
