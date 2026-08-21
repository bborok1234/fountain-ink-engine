import { freezeSurfaceRecipe } from "./surface-recipe.js";

// R4 keeps the accepted DPR2 fibre result while authoring scale-aware alpha
// coverage for DPR1/3. The solver, reach, occupancy, strength and Contact floor
// are otherwise identical to R3.
export const PAPER_SURFACE_ABSORBENT_R4 = freezeSurfaceRecipe({
  id: "paper-absorbent",
  revision: 4,
  surfaceModelVersion: "paper-surface-js-r4",
  surfaceRecipeSchemaVersion: 3,
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
    fiberEdgeReachCssPixels: 1.75,
    fiberEdgeOccupancy: 0.45,
    fiberEdgeStrength: 0.62,
  },
});
