// A lightweight, dependency-free pan/zoom engine for the board surface.
// Everything is GPU-accelerated via translate3d + scale on a single element.

const MAX_SCALE = 2.5;

// How far past the wooden frame the board may be nudged before it is held.
// A little give makes dragging feel physical; more than this and you get lost.
const SLACK = 48;

export class Board {
  constructor(viewport, surface, { width, height, frame = 0 }) {
    this.viewport = viewport;
    this.surface = surface;
    this.width = width;
    this.height = height;
    this.frame = frame;

    this.x = 0;
    this.y = 0;
    this.scale = 1;

    this.velX = 0;
    this.velY = 0;

    this.pointers = new Map();
    this.pinchStartDist = 0;
    this.pinchStartScale = 1;

    this.dragging = false;
    this.lastPan = null;
    this.rafId = null;
    this.inertiaId = null;

    this._bind();
    this._measure();
    this._centerInitial();
    this._apply();
  }

  _bind() {
    const vp = this.viewport;
    vp.addEventListener('pointerdown', this._onPointerDown, { passive: true });
    window.addEventListener('pointermove', this._onPointerMove, { passive: true });
    window.addEventListener('pointerup', this._onPointerUp, { passive: true });
    window.addEventListener('pointercancel', this._onPointerUp, { passive: true });
    vp.addEventListener('wheel', this._onWheel, { passive: false });
    vp.addEventListener('dblclick', this._onDblClick);
    window.addEventListener('resize', this._onResize);
  }

  /**
   * The zoom floor is "the whole framed board fits on screen" — you can never
   * zoom out into empty space beyond the frame.
   */
  _measure() {
    const vw = this.viewport.clientWidth;
    const vh = this.viewport.clientHeight;
    const outerW = this.width + this.frame * 2;
    const outerH = this.height + this.frame * 2;
    this.minScale = Math.min(vw / outerW, vh / outerH) * 0.94;
  }

  _onResize = () => {
    this._measure();
    this.scale = this._clampScale(this.scale);
    this._clampPosition();
    this._apply();
  };

  _centerInitial() {
    const vw = this.viewport.clientWidth;
    // Open near the top so the title is the first thing read, at a scale where
    // the photographs are actually legible.
    this.scale = this._clampScale(Math.max(0.62, this.minScale));
    this.x = (vw - this.width * this.scale) / 2;
    this.y = this.frame * this.scale + 16;
    this._clampPosition();
  }

  _apply() {
    this.surface.style.transform = `translate3d(${this.x}px, ${this.y}px, 0) scale(${this.scale})`;
  }

  /**
   * Keeps the framed board glued to the viewport.
   *
   * An axis that already fits on screen is pinned dead centre — a board small
   * enough to see whole should never drift off to one side. Only an axis larger
   * than the viewport is pannable, and then only until its frame edge reaches
   * the far side (plus a little SLACK, which is what makes dragging feel
   * physical rather than walled-in).
   */
  _clampPosition() {
    const vw = this.viewport.clientWidth;
    const vh = this.viewport.clientHeight;
    const f = this.frame * this.scale;

    // this.x positions the content box; the frame sits f outside it.
    const spanW = this.width * this.scale + f * 2;
    const spanH = this.height * this.scale + f * 2;

    if (spanW <= vw) {
      this.x = (vw - spanW) / 2 + f;
    } else {
      this.x = Math.min(SLACK + f, Math.max(vw - spanW - SLACK + f, this.x));
    }

    if (spanH <= vh) {
      this.y = (vh - spanH) / 2 + f;
    } else {
      this.y = Math.min(SLACK + f, Math.max(vh - spanH - SLACK + f, this.y));
    }
  }

  _clampScale(s) {
    return Math.min(MAX_SCALE, Math.max(this.minScale, s));
  }

  _onPointerDown = (e) => {
    // Ignore if the gesture started on a draggable item — those handle their own drag.
    if (e.target.closest('[data-draggable]')) return;
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    cancelAnimationFrame(this.inertiaId);

    if (this.pointers.size === 1) {
      this.dragging = true;
      this.lastPan = { x: e.clientX, y: e.clientY, t: performance.now() };
      this.velX = 0;
      this.velY = 0;
    } else if (this.pointers.size === 2) {
      this.dragging = false;
      const pts = [...this.pointers.values()];
      this.pinchStartDist = dist(pts[0], pts[1]);
      this.pinchStartScale = this.scale;
      this.pinchMid = mid(pts[0], pts[1]);
    }
  };

  _onPointerMove = (e) => {
    if (!this.pointers.has(e.pointerId)) return;
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (this.pointers.size === 2) {
      const pts = [...this.pointers.values()];
      const d = dist(pts[0], pts[1]);
      const nextScale = this._clampScale(this.pinchStartScale * (d / this.pinchStartDist));
      const m = mid(pts[0], pts[1]);
      this._zoomAround(m.x, m.y, nextScale);
      return;
    }

    if (this.dragging && this.lastPan) {
      const dx = e.clientX - this.lastPan.x;
      const dy = e.clientY - this.lastPan.y;
      const now = performance.now();
      const dt = Math.max(now - this.lastPan.t, 1);
      this.velX = dx / dt;
      this.velY = dy / dt;
      this.x += dx;
      this.y += dy;
      this.lastPan = { x: e.clientX, y: e.clientY, t: now };
      this._scheduleApply();
    }
  };

  _onPointerUp = (e) => {
    this.pointers.delete(e.pointerId);
    if (this.pointers.size < 2) this.pinchStartDist = 0;
    if (this.pointers.size === 0 && this.dragging) {
      this.dragging = false;
      this._inertia();
    }
  };

  _onWheel = (e) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      const nextScale = this._clampScale(this.scale * (1 - e.deltaY * 0.01));
      this._zoomAround(e.clientX, e.clientY, nextScale);
    } else {
      this.x -= e.deltaX;
      this.y -= e.deltaY;
      this._scheduleApply();
    }
  };

  _onDblClick = (e) => {
    if (e.target.closest('[data-draggable]')) return;
    const target = this.scale < 1.1 ? 1.4 : 0.75;
    this._zoomAround(e.clientX, e.clientY, this._clampScale(target));
  };

  _zoomAround(clientX, clientY, nextScale) {
    const rect = this.viewport.getBoundingClientRect();
    const px = clientX - rect.left;
    const py = clientY - rect.top;
    const boardX = (px - this.x) / this.scale;
    const boardY = (py - this.y) / this.scale;
    this.scale = nextScale;
    this.x = px - boardX * this.scale;
    this.y = py - boardY * this.scale;
    this._scheduleApply();
  }

  _scheduleApply() {
    if (this.rafId) return;
    this.rafId = requestAnimationFrame(() => {
      this._clampPosition();
      this._apply();
      this.rafId = null;
    });
  }

  _inertia() {
    const friction = 0.93;
    const step = () => {
      this.velX *= friction;
      this.velY *= friction;
      if (Math.abs(this.velX) < 0.02 && Math.abs(this.velY) < 0.02) return;

      const beforeX = this.x;
      const beforeY = this.y;
      this.x += this.velX * 16;
      this.y += this.velY * 16;
      this._clampPosition();

      // Hitting the frame kills the glide on that axis instead of grinding
      // against the bound for the rest of the animation.
      if (this.x === beforeX) this.velX = 0;
      if (this.y === beforeY) this.velY = 0;

      this._apply();
      this.inertiaId = requestAnimationFrame(step);
    };
    this.inertiaId = requestAnimationFrame(step);
  }
}

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
function mid(a, b) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

// Makes an element draggable within board space (its x/y are board coordinates,
// independent of the board's current pan/zoom).
export function makeDraggable(el, item, board, onSettle) {
  el.dataset.draggable = 'true';
  let dragging = false;
  let start = null;
  let moved = false;

  el.addEventListener('pointerdown', (e) => {
    e.stopPropagation();
    dragging = true;
    moved = false;
    el.setPointerCapture(e.pointerId);
    start = { x: e.clientX, y: e.clientY, itemX: item.x, itemY: item.y };
    el.classList.add('lifted');
  });

  el.addEventListener('pointermove', (e) => {
    if (!dragging || !start) return;
    const dx = (e.clientX - start.x) / board.scale;
    const dy = (e.clientY - start.y) / board.scale;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) moved = true;
    item.x = start.itemX + dx;
    item.y = start.itemY + dy;
    el.style.left = `${item.x}px`;
    el.style.top = `${item.y}px`;
  });

  const end = (e) => {
    if (!dragging) return;
    dragging = false;
    el.classList.remove('lifted');
    if (onSettle) onSettle(moved);
  };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);

  return {
    wasMoved: () => moved,
  };
}
