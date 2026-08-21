import { freezeDyeComponentRecipe } from "./dye-component-recipe.js";

// R4 gives the discontinuous R3 candidate an authored secondary dye color.
// Optical changes RGB inside existing ordinary alpha only; it cannot add ink
// coverage, change glyph geometry, or create a halo outside the base result.
export const EDGE_DYE_COMPONENT_RECIPE_R4 = freezeDyeComponentRecipe({
  id: "edge-dye-study",
  revision: 4,
  componentModelVersion: "dye-component-js-r4",
  componentRecipeSchemaVersion: 3,
  massFraction: 0.32,
  mobilityMultiplier: 1.45,
  retentionMultiplier: 0.62,
  edgeEnrichmentThreshold: 0.02,
  edgeMassGain: 200,
  edgeRed: 138,
  edgeGreen: 46,
  edgeBlue: 78,
  edgeMixGain: 12,
  edgeMixMaximum: 0.72,
});
