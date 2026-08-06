import { execSync } from 'node:child_process';
import { mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { extname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { metaFor } from '../src/photo-meta.js';

const SRC_DIR = '/Users/momcilo/Downloads/bilder';
const OUT_ROOT = fileURLToPath(new URL('../public/photos/', import.meta.url));
const THUMB_DIR = join(OUT_ROOT, 'thumb');
const FULL_DIR = join(OUT_ROOT, 'full');

// The board zooms to 2.5x, so 480px thumbs went soft. 640 at a lower quality
// costs roughly the same bytes and holds up when zoomed in.
const THUMB_MAX_EDGE = 640;
const THUMB_QUALITY = 55;
const FULL_MAX_EDGE = 1600;
const FULL_QUALITY = 82;

mkdirSync(THUMB_DIR, { recursive: true });
mkdirSync(FULL_DIR, { recursive: true });

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

  // Some sources had their EXIF orientation stripped, so the stored pixels are
  // sideways. Bake the rotation in here rather than at runtime — the lightbox
  // then gets a correctly oriented file for free.
  const { rotate } = metaFor(id);
  const rotateFlag = rotate ? `-r ${rotate}` : '';

  execSync(
    `sips -s format jpeg -s formatOptions ${THUMB_QUALITY} --resampleHeightWidthMax ${THUMB_MAX_EDGE} ${rotateFlag} "${srcPath}" --out "${join(THUMB_DIR, name)}"`,
    { stdio: 'ignore' }
  );

  execSync(
    `sips -s format jpeg -s formatOptions ${FULL_QUALITY} --resampleHeightWidthMax ${FULL_MAX_EDGE} ${rotateFlag} "${srcPath}" --out "${join(FULL_DIR, name)}"`,
    { stdio: 'ignore' }
  );

  // Report post-rotation dimensions so downstream crop maths matches reality.
  const raw = readDimensions(srcPath);
  const swap = rotate === 90 || rotate === 270;
  const w = swap ? raw.h : raw.w;
  const h = swap ? raw.w : raw.h;

  return { id, thumb: `/photos/thumb/${name}`, full: `/photos/full/${name}`, w, h };
});

writeFileSync(
  fileURLToPath(new URL('../src/manifest.json', import.meta.url)),
  JSON.stringify(manifest, null, 2)
);

console.log(`Processed ${manifest.length} images.`);
