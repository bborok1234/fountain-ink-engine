import { assertFiniteRange, assertUint32 } from "../contracts/numeric.js";
import { hashString } from "../deterministic/hash.js";
import { randomFrom } from "../deterministic/random.js";
import { NIB_PROFILES, getNibGeometry } from "./nib-profiles.js";
import { scaleNibGeometry } from "./morphology.js";

// This is the exact legacy width-variation gain at flow 58:
// 0.72 + (58 / 100) * 0.28 === 0.8824.
export const GLYPH_CONTACT_VARIATION_CALIBRATION = 0.8824;

/**
 * Resolve one deterministic glyph contact independently of ink flow or layout.
 *
 * The seed salt and PRNG intentionally match the accepted keyboard path. The
 * fixed calibration keeps its flow-58 geometry bit-exact while preventing a
 * density control from changing the contact footprint.
 *
 * @param {string} nibId
 * @param {number} fontSize
 * @param {number} glyphSeed unsigned 32-bit glyph seed
 * @returns {Readonly<Record<string, number | string>>}
 */
export function getGlyphContactGeometry(nibId, fontSize, glyphSeed) {
  if (typeof nibId !== "string" || !Object.hasOwn(NIB_PROFILES, nibId)) {
    throw new TypeError(`Unknown nibId: ${String(nibId)}.`);
  }
  const size = assertFiniteRange(
    fontSize,
    "fontSize",
    Number.MIN_VALUE,
    Number.MAX_VALUE,
  );
  const seed = assertUint32(glyphSeed, "glyphSeed");
  const profile = NIB_PROFILES[nibId];
  const widthRandom = randomFrom(
    (seed ^ hashString(`${nibId}:width`)) >>> 0,
  )();
  const widthScale = 1 + (widthRandom - 0.5) * 2
    * profile.widthVariation * GLYPH_CONTACT_VARIATION_CALIBRATION;
  return Object.freeze(
    scaleNibGeometry(getNibGeometry(nibId, size), widthScale),
  );
}
