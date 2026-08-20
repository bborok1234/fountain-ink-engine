import { freezeSurfaceRecipe } from "./surface-recipe.js";

// High vertical uptake is intentionally paired with bounded lateral mobility:
// the result should read as absorbed ink, not a Gaussian-blurred glyph.
export const PAPER_SURFACE_ABSORBENT_R1 = freezeSurfaceRecipe({
  id: "paper-absorbent",
  revision: 1,
  surfaceModelVersion: "paper-surface-js-r1",
  surfaceRecipeSchemaVersion: 1,
  axes: {
    verticalUptake: 0.86,
    lateralMobility: 0.52,
    dyeAffinity: 0.72,
    surfaceRetention: 0.14,
    filmPreservation: 0.12,
    roughness: 0.72,
    particleCatch: 0.75,
    paperReflectance: 0.93,
  },
  keyboard: {
    stepBase: 6,
    stepUptakeGain: 12,
    stepMilliseconds: 16.667,
    normalizationScale: 0.9,
    normalizationReferenceAlpha: 107,
    coverageMixExponent: 0.92,
    contactRetentionFloor: 0.6,
  },
});
