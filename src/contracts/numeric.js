/**
 * Fail closed at public numeric boundaries. Algorithms may clamp derived
 * values internally, but callers must not smuggle NaN, Infinity, or a new unit
 * through coercion.
 *
 * @param {unknown} value
 * @param {string} path
 * @param {number} minimum
 * @param {number} maximum
 * @returns {number}
 */
export function assertFiniteRange(value, path, minimum, maximum) {
  if (
    typeof value !== "number"
    || !Number.isFinite(value)
    || value < minimum
    || value > maximum
  ) {
    throw new TypeError(
      `${path} must be a finite number in ${minimum}...${maximum}.`,
    );
  }
  return value;
}

/** @param {unknown} value @param {string} path */
export function assertPercent(value, path) {
  return assertFiniteRange(value, path, 0, 100);
}

export const UINT32_MAX = 0xffffffff;

/** @param {unknown} value @param {string} path */
export function assertUint32(value, path) {
  if (!Number.isInteger(value) || value < 0 || value > UINT32_MAX) {
    throw new TypeError(
      `${path} must be an explicit unsigned 32-bit integer.`,
    );
  }
  return value;
}
