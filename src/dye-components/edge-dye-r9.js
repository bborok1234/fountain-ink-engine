import { freezeDyeComponentRecipe } from "./dye-component-recipe.js";

// R9 keeps the complete A3 palette, secondary-color field, and Optical mix
// unchanged. Its sole new hypothesis is concentration-dependent paper/dye
// retardation inside the Surface transport solver.
export const EDGE_DYE_COMPONENT_RECIPE_R9 = freezeDyeComponentRecipe({
  id: "edge-dye-study",
  revision: 9,
  componentModelVersion: "dye-component-js-r9",
  componentRecipeSchemaVersion: 8,
  massFraction: 0.32,
  mobilityMultiplier: 1.45,
  retentionMultiplier: 0.62,
  edgeEnrichmentThreshold: 0.02,
  edgeMassGain: 200,
  edgeRed: 15,
  edgeGreen: 145,
  edgeBlue: 104,
  edgeMixGain: 7,
  edgeMixMaximum: 0.86,
  baseLowRed: 136,
  baseLowGreen: 156,
  baseLowBlue: 202,
  baseMidRed: 101,
  baseMidGreen: 144,
  baseMidBlue: 173,
  baseHighRed: 105,
  baseHighGreen: 90,
  baseHighBlue: 158,
  baseMix: 0.86,
  paperAffinityMultiplier: 1.6,
  retardationHalfSaturation: 0.1,
  retardationMaximum: 0.82,
});
