import { freezeDyeComponentRecipe } from "./dye-component-recipe.js";

// R6 keeps the R5 transported dye and discontinuous zone unchanged, then
// authors a readable multi-shader base curve before the secondary green-teal
// zone is mixed. The ordinary ink remains a contributing under-color rather
// than being silently replaced by another registered ordinary recipe.
export const EDGE_DYE_COMPONENT_RECIPE_R6 = freezeDyeComponentRecipe({
  id: "edge-dye-study",
  revision: 6,
  componentModelVersion: "dye-component-js-r6",
  componentRecipeSchemaVersion: 5,
  massFraction: 0.32,
  mobilityMultiplier: 1.45,
  retentionMultiplier: 0.62,
  edgeEnrichmentThreshold: 0.02,
  edgeMassGain: 200,
  edgeRed: 44,
  edgeGreen: 136,
  edgeBlue: 115,
  edgeMixGain: 2,
  edgeMixMaximum: 0.86,
  edgeZoneRadius: 1,
  edgeZoneMinimumStrength: 0.38,
  edgeZonePeakThreshold: 0.003,
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
