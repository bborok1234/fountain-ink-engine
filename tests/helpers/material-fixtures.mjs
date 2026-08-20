import {
  freezeSurfaceRecipe,
  surfaceModelVersion,
  surfaceRecipeSchemaVersion,
} from "../../src/surface-recipes/index.js";

const cache = new Map();

/** Historical scalar Surface expressed through the new independent contract. */
export function legacySurfaceAt(normalizedAbsorption) {
  if (!Number.isFinite(normalizedAbsorption)
    || normalizedAbsorption < 0
    || normalizedAbsorption > 1) {
    throw new TypeError("normalizedAbsorption must be finite in 0...1.");
  }
  const key = String(normalizedAbsorption);
  if (cache.has(key)) return cache.get(key);
  const recipe = freezeSurfaceRecipe({
    id: `test-legacy-surface-${key.replace(".", "-")}`,
    revision: 1,
    surfaceModelVersion,
    surfaceRecipeSchemaVersion,
    axes: {
      verticalUptake: normalizedAbsorption,
      lateralMobility: normalizedAbsorption,
      dyeAffinity: normalizedAbsorption,
      surfaceRetention: 1 - normalizedAbsorption,
      filmPreservation: 1 - normalizedAbsorption,
      roughness: 1,
      particleCatch: normalizedAbsorption,
      paperReflectance: 0.96,
    },
    keyboard: {
      stepBase: 6,
      stepUptakeGain: 12,
      stepMilliseconds: 16.667,
      normalizationScale: 0.9,
      normalizationReferenceAlpha: 107,
      coverageMixExponent: 0.92,
      contactRetentionFloor: 0.54,
    },
  });
  cache.set(key, recipe);
  return recipe;
}
