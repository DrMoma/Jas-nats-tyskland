/**
 * One shared IntersectionObserver for every object on the board.
 *
 * It toggles an `in-view` class so idle animations only run for what is
 * actually on screen — with 40+ objects, leaving those infinite animations
 * running off-screen is a measurable battery cost on phones — and fires
 * `onFirstEnter` once, which is where lazy loading hangs off.
 *
 * `onEnter` fires on every entry instead of just the first, for work that has to
 * be redone as conditions change — the polaroids use it to pick up a sharper
 * image source when they scroll back into a board that has since been zoomed in.
 */
let observer;
const firstEnter = new WeakMap();
const everyEnter = new WeakMap();

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

        const once = firstEnter.get(el);
        if (once) {
          firstEnter.delete(el);
          once(el);
        }
        everyEnter.get(el)?.(el);
      }
    },
    { root: null, rootMargin: '300px' }
  );
  return observer;
}

export function observeInView(el, onFirstEnter, onEnter) {
  if (onFirstEnter) firstEnter.set(el, onFirstEnter);
  if (onEnter) everyEnter.set(el, onEnter);
  ensureObserver().observe(el);
}
