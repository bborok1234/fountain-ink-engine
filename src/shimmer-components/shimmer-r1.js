import { freezeShimmerComponentRecipe } from "./shimmer-component-recipe.js";

// A1 models a finite, seeded particle population caught inside the wet ink
// footprint. It is not the P5-B surface film and never invents page-wide noise.
export const SHIMMER_COMPONENT_RECIPE_R1 = freezeShimmerComponentRecipe({
  id: "shimmer-study",
  revision: 1,
  componentModelVersion: "shimmer-component-js-r1",
  componentRecipeSchemaVersion: 1,
  particleRed: 222,
  particleGreen: 184,
  particleBlue: 72,
  particleBudget: 512,
  particleLoad: 0.8,
  coverageThreshold: 0.18,
  sizeMinimumCssPixels: 0.5,
  sizeMaximumCssPixels: 1.2,
  reflectivity: 1,
  staticPhase: 0.17,
  lightExponent: 2.4,
});
