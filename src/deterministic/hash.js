/**
 * Hash a JavaScript string by Unicode code point using the reference engine's
 * FNV-style 32-bit recurrence.
 *
 * @param {string} value
 * @returns {number}
 */
export function hashString(value) {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
