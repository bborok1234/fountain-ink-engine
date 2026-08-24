import { freezeDyeComponentRecipe } from "./dye-component-recipe.js";

// R8 replaces the r5 seeded-radius zone and r7 fixed Contact band with one
// Surface-owned continuous secondary-color field. All transport, palette, and
// mix values remain identical to R7 so A3 isolates only that spatial operator.
export const EDGE_DYE_COMPONENT_RECIPE_R8 = freezeDyeComponentRecipe({
  id: "edge-dye-study",
  revision: 8,
  componentModelVersion: "dye-component-js-r8",
  componentRecipeSchemaVersion: 7,
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
});
