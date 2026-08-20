import { freezeSurfaceRecipe } from "./surface-recipe.js";

export const PAPER_SURFACE_SMOOTH_R1 = freezeSurfaceRecipe({
  id: "paper-smooth",
  revision: 1,
  surfaceModelVersion: "paper-surface-js-r1",
  surfaceRecipeSchemaVersion: 1,
  axes: {
    verticalUptake: 0,
    lateralMobility: 0.08,
    dyeAffinity: 0.18,
    surfaceRetention: 1,
    filmPreservation: 1,
    roughness: 0.08,
    particleCatch: 0.05,
    paperReflectance: 0.98,
  },
  keyboard: {
    stepBase: 6,
    stepUptakeGain: 12,
    stepMilliseconds: 16.667,
    normalizationScale: 0.9,
    normalizationReferenceAlpha: 107,
    coverageMixExponent: 0.92,
    contactRetentionFloor: 1,
  },
});
