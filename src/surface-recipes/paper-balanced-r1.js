import { freezeSurfaceRecipe } from "./surface-recipe.js";

// This recipe is calibrated to reproduce the accepted absorption-42 baseline.
export const PAPER_SURFACE_BALANCED_R1 = freezeSurfaceRecipe({
  id: "paper-balanced",
  revision: 1,
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
    coverageMixExponent: 0.92,
    contactRetentionFloor: 0.54,
  },
});
