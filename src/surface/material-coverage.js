import { WetInkSimulation } from "./wet-ink-simulation.js";
import { assertInkRecipeCompatible } from "../recipes/compatibility.js";
import { assertFiniteRange, assertUint32 } from "../contracts/numeric.js";
import { MAX_KEYBOARD_SURFACE_STEPS } from "../recipes/ink-recipe.js";

export const DEFAULT_SURFACE_SEED = 0x13579bdf;

/**
 * Run the exact accepted deposit/step/alpha-normalization material calculation
 * on an already-resampled mask. Canvas allocation and resizing stay with the
 * caller; the returned object is ImageData-compatible structural RGBA.
 *
 * @param {{width:number,height:number,data:Uint8ClampedArray}} deposit
 * @param {number} absorption normalized 0...1
 * @param {number} surfaceSeed
 * @param {Record<string, unknown>} recipe
 */
export function createMaterialCoverage(
  deposit,
  absorption,
  surfaceSeed,
  recipe,
) {
  assertInkRecipeCompatible(recipe);
  assertFiniteRange(absorption, "absorption", 0, 1);
  assertUint32(surfaceSeed, "surfaceSeed");
  const simulation = new WetInkSimulation(
    deposit.width,
    deposit.height,
    surfaceSeed,
  );
  simulation.depositMask(deposit, {
    waterLoad: recipe.surface.keyboard.waterLoad,
    pigmentLoad: recipe.surface.keyboard.pigmentLoad,
    seed: (surfaceSeed ^ 0x85ebca6b) >>> 0,
  });
  const steps = Math.round(
    recipe.surface.keyboard.stepBase
      + absorption * recipe.surface.keyboard.stepAbsorptionGain,
  );
  if (steps < 0 || steps > MAX_KEYBOARD_SURFACE_STEPS) {
    throw new RangeError(
      `calculated keyboard Surface steps must be in 0...${MAX_KEYBOARD_SURFACE_STEPS}.`,
    );
  }
  for (let index = 0; index < steps; index += 1) {
    simulation.step(recipe.surface.keyboard.stepMilliseconds, absorption);
  }

  const material = {
    width: deposit.width,
    height: deposit.height,
    data: new Uint8ClampedArray(deposit.width * deposit.height * 4),
  };
  simulation.render(material, recipe);
  let strongest = 1;
  for (let index = 3; index < material.data.length; index += 4) {
    strongest = Math.max(strongest, material.data[index]);
  }
  for (let index = 0; index < material.data.length; index += 4) {
    const normalized = Math.min(
      1,
      material.data[index + 3]
        / (strongest * recipe.surface.keyboard.normalizationScale),
    );
    material.data[index] = 255;
    material.data[index + 1] = 255;
    material.data[index + 2] = 255;
    material.data[index + 3] = Math.round(normalized * 255);
  }
  return material;
}
