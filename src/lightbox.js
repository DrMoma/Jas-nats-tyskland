import { IS_LITE, SUPPORTS_WEBP } from './device.js';

// Full-resolution images are fetched only when a photo is actually opened.
// We cache URL strings, never Image objects — the browser's HTTP cache does the
// real retaining, so nothing here holds decoded bitmaps alive.
const loaded = new Set();

/**
 * The lightbox assigns `img.src` from script, so unlike the polaroids it has no
 * <picture> element to negotiate formats for it — hence the explicit check.
 * WebP roughly halves these files (a 750 kB JPEG lands at ~350 kB), which is the
 * difference between a swipe that feels instant on mobile data and one that does
 * not.
 */
function fullSrc(photo) {
  return (SUPPORTS_WEBP && photo.fullWebp) || photo.full;
}

/** The placeholder shown while the full file decodes — whatever is already cached. */
function previewSrc(photo) {
  const tier = IS_LITE ? 'small' : 'thumb';
  return (SUPPORTS_WEBP && photo[`${tier}Webp`]) || photo[tier] || photo.thumb;
}

const SWIPE_CLOSE_PX = 120;
const SWIPE_NEXT_PX = 60;
const AXIS_LOCK_PX = 10;

export class Lightbox {
  constructor(root) {
    this.root = root;
    this.backdrop = root.querySelector('.lightbox-backdrop');
    this.closeBtn = root.querySelector('.lightbox-close');
    this.stage = root.querySelector('.lightbox-stage');
    this.img = root.querySelector('.lightbox-img');
    this.spinner = root.querySelector('.lightbox-spinner');
    this.captionEl = root.querySelector('.lightbox-title');
    this.metaEl = root.querySelector('.lightbox-meta');
    this.counterEl = root.querySelector('.lightbox-counter');

    this.photos = [];
    this.index = -1;

    this.closeBtn.addEventListener('click', () => this.close());
    this.backdrop.addEventListener('click', () => this.close());
    this._bindGestures();
  }

  open(photos, index) {
    this.photos = photos;
    this.root.classList.add('open');
    this.root.setAttribute('aria-hidden', 'false');
    document.body.classList.add('no-scroll');
    this.show(index);
  }

  show(index, originEl) {
    if (index < 0 || index >= this.photos.length) return;
    this.index = index;
    const photo = this.photos[index];
    this.current = photo;

    this.captionEl.textContent = photo.caption || '';
    this.metaEl.textContent = [photo.location, photo.date].filter(Boolean).join(' · ');
    this.counterEl.textContent = `${index + 1} / ${this.photos.length}`;

    // Show the thumbnail instantly so the transition never blanks, then swap in
    // the full-resolution file once it has decoded.
    const full = fullSrc(photo);
    this.img.classList.remove('is-full');
    this.img.src = previewSrc(photo);
    this.spinner.classList.add('visible');

    this._loadFull(full).then(() => {
      if (this.current !== photo) return; // user moved on while it loaded
      this.img.src = full;
      this.img.classList.add('is-full');
      this.spinner.classList.remove('visible');
    });

    this._preloadNeighbours(index);
  }

  next() {
    this.show(Math.min(this.index + 1, this.photos.length - 1));
  }

  prev() {
    this.show(Math.max(this.index - 1, 0));
  }

  close() {
    this.root.classList.remove('open');
    this.root.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('no-scroll');
    this.current = null;
  }

  get isOpen() {
    return this.root.classList.contains('open');
  }

  _loadFull(src) {
    if (loaded.has(src)) return Promise.resolve();
    return new Promise((resolve) => {
      const img = new Image();
      const done = () => {
        loaded.add(src);
        resolve();
      };
      img.onload = done;
      img.onerror = done;
      img.src = src;
    });
  }

  /** Only the immediate neighbours — enough to make swiping feel instant. */
  _preloadNeighbours(index) {
    [index - 1, index + 1].forEach((i) => {
      const photo = this.photos[i];
      if (!photo) return;
      const src = fullSrc(photo);
      if (!loaded.has(src)) this._loadFull(src);
    });
  }

  /**
   * One pointer stream serves both gestures. After AXIS_LOCK_PX of travel the
   * dominant axis wins and the other is ignored, so a horizontal swipe never
   * half-triggers the dismiss and vice versa.
   */
  _bindGestures() {
    let start = null;
    let axis = null;
    let pointerId = null;

    const onDown = (e) => {
      if (start !== null) return; // ignore a second finger mid-swipe
      start = { x: e.clientX, y: e.clientY };
      axis = null;
      pointerId = e.pointerId;
      // Capture, or the gesture dies the moment the finger leaves the image.
      this.stage.setPointerCapture(e.pointerId);
      this.stage.style.transition = 'none';
    };

    const onMove = (e) => {
      if (!start || e.pointerId !== pointerId) return;
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;

      if (!axis && Math.hypot(dx, dy) > AXIS_LOCK_PX) {
        axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      }
      if (!axis) return;

      if (axis === 'x') {
        this.stage.style.transform = `translateX(${dx}px)`;
      } else if (dy > 0) {
        this.stage.style.transform = `translateY(${dy}px) scale(${Math.max(1 - dy / 900, 0.86)})`;
        this.root.style.setProperty('--backdrop-opacity', Math.max(1 - dy / 450, 0));
      }
    };

    const onUp = (e) => {
      if (!start || e.pointerId !== pointerId) return;
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      const settledAxis = axis;
      start = null;
      axis = null;
      if (this.stage.hasPointerCapture(pointerId)) {
        this.stage.releasePointerCapture(pointerId);
      }
      pointerId = null;

      this.stage.style.transition = '';
      this.stage.style.transform = '';
      this.root.style.removeProperty('--backdrop-opacity');

      if (settledAxis === 'y' && dy > SWIPE_CLOSE_PX) this.close();
      else if (settledAxis === 'x' && dx < -SWIPE_NEXT_PX) this.next();
      else if (settledAxis === 'x' && dx > SWIPE_NEXT_PX) this.prev();
    };

    this.stage.addEventListener('pointerdown', onDown);
    this.stage.addEventListener('pointermove', onMove);
    this.stage.addEventListener('pointerup', onUp);
    this.stage.addEventListener('pointercancel', onUp);

    window.addEventListener('keydown', (e) => {
      if (!this.isOpen) return;
      if (e.key === 'Escape') this.close();
      if (e.key === 'ArrowRight') this.next();
      if (e.key === 'ArrowLeft') this.prev();
    });
  }
}
