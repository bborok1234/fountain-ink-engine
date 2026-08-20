/**
 * Return the reference engine's deterministic Mulberry32-like PRNG closure.
 *
 * @param {number} seed
 * @returns {() => number}
 */
export function randomFrom(seed) {
  let value = seed ?? 1;
  return () => {
    value += 0x6d2b79f5;
    let next = value;
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Deterministic page-coordinate noise used by the paper fibre simulation.
 *
 * @param {number} x
 * @param {number} y
 * @param {number} seed
 * @returns {number}
 */
export function coordinateNoise(x, y, seed) {
  let value = Math.imul(x + 1, 374761393)
    ^ Math.imul(y + 1, 668265263)
    ^ seed;
  value = Math.imul(value ^ (value >>> 13), 1274126177);
  return ((value ^ (value >>> 16)) >>> 0) / 4294967295;
}
