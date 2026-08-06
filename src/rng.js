// Small deterministic PRNG (mulberry32) so the board layout is stable across reloads.
export function makeRng(seed) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function between(rng, min, max) {
  return min + rng() * (max - min);
}

export function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}
