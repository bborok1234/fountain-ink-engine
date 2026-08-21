import { freezeSurfaceRecipe } from "./surface-recipe.js";

// R2 separates into-paper uptake from page-plane mobility. It intentionally
// keeps the centre Contact stronger than R1 while a local depth sink lowers
// the surface film and a bounded lateral field leaves only a restrained edge.
export const PAPER_SURFACE_ABSORBENT_R2 = freezeSurfaceRecipe({
  id: "paper-absorbent",
  revision: 2,
  surfaceModelVersion: "paper-surface-js-r2",
  surfaceRecipeSchemaVersion: 2,
  axes: {
    depthUptake: 0.86,
    lateralMobility: 0.2,
    dyeAffinity: 0.72,
    surfaceRetention: 0.22,
    filmPreservation: 0.16,
    roughness: 0.72,
    particleCatch: 0.75,
    paperReflectance: 0.93,
  },
  keyboard: {
    stepBase: 6,
    stepMobilityGain: 12,
    stepMilliseconds: 16.667,
    normalizationScale: 0.9,
    normalizationReferenceAlpha: 107,
    coverageMixExponent: 0.92,
    contactRetentionFloor: 0.82,
  },
});
