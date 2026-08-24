import { freezeDyeComponentRecipe } from "./dye-component-recipe.js";

// R11 preserves R10 transport and its low/middle/high endpoint palette exactly.
// Optical now mixes the two transported visible masses directly through a
// three-band, semi-infinite single-constant Kubelka-Munk approximation.
export const EDGE_DYE_COMPONENT_RECIPE_R11 = freezeDyeComponentRecipe({
  id: "edge-dye-study",
  revision: 11,
  componentModelVersion: "dye-component-js-r11",
  componentRecipeSchemaVersion: 10,
  massFraction: 0.32,
  mobilityMultiplier: 1.45,
  retentionMultiplier: 0.62,
  paperAffinityMultiplier: 1.6,
  retardationHalfSaturation: 0.1,
  retardationMaximum: 0.82,
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
  secondaryRed: 15,
  secondaryGreen: 145,
  secondaryBlue: 104,
});
