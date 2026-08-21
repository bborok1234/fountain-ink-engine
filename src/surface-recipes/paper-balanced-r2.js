import { freezeSurfaceRecipe } from "./surface-recipe.js";

// R2 keeps the accepted balanced-paper solver and direct-input state exact,
// while reducing how strongly its continuous coarse candidate enters the
// keyboard coverage result. The physical candidate remains an archived r1
// calculation; only the authored keyboard resolution is revised.
export const PAPER_SURFACE_BALANCED_R2 = freezeSurfaceRecipe({
  id: "paper-balanced",
  revision: 2,
  surfaceModelVersion: "paper-surface-js-r1",
  surfaceRecipeSchemaVersion: 1,
  axes: {
    verticalUptake: 0.42,
    lateralMobility: 0.42,
    dyeAffinity: 0.42,
    surfaceRetention: 0.58,
    filmPreservation: 0.58,
    roughness: 1,
    particleCatch: 0.35,
    paperReflectance: 0.96,
  },
  keyboard: {
    stepBase: 6,
    stepUptakeGain: 12,
    stepMilliseconds: 16.667,
    normalizationScale: 0.9,
    normalizationReferenceAlpha: 107,
    coverageMixExponent: 2.15,
    contactRetentionFloor: 0.72,
  },
});
