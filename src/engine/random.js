// Seeded randomness makes every generated exercise reproducible in tests.
export function seeded(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const integer = (rng, min, max) =>
  min + Math.floor(rng() * (max - min + 1));
export const pick = (rng, values) => values[integer(rng, 0, values.length - 1)];
export function shuffle(rng, values) {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const j = integer(rng, 0, i);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
