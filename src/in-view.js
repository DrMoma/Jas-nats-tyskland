/**
 * One shared IntersectionObserver for every object on the board.
 *
 * It toggles an `in-view` class so idle animations only run for what is
 * actually on screen — with 40+ objects, leaving those infinite animations
 * running off-screen is a measurable battery cost on phones — and fires
 * `onFirstEnter` once, which is where lazy loading hangs off.
 */
let observer;
const callbacks = new WeakMap();

function ensureObserver() {
  if (observer) return observer;
  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const el = entry.target;
        if (!entry.isIntersecting) {
          el.classList.remove('in-view');
          continue;
        }
        el.classList.add('in-view');
        const cb = callbacks.get(el);
        if (cb) {
          callbacks.delete(el);
          cb(el);
        }
      }
    },
    { root: null, rootMargin: '300px' }
  );
  return observer;
}

export function observeInView(el, onFirstEnter) {
  if (onFirstEnter) callbacks.set(el, onFirstEnter);
  ensureObserver().observe(el);
}
