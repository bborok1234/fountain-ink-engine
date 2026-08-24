import { freezeDyeComponentRecipe } from "./dye-component-recipe.js";

// A7-3 changes one state hypothesis only: R14's palette, authored mixture,
// and six transport/reaction rates are preserved while both dyes compete for
// one cell-local adsorption capacity. There are no per-species capacities or
// optical gains in this revision.
export const EDGE_DYE_COMPONENT_RECIPE_R15 = freezeDyeComponentRecipe({
  id: "edge-dye-study",
  revision: 15,
  componentModelVersion: "dye-component-js-r14",
  componentRecipeSchemaVersion: 13,
  initialSecondaryFraction: 8 / 33,
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
  primaryDiffusivity: 0.00005,
  secondaryDiffusivity: 0.0008,
  primaryAdsorptionRate: 0.06,
  secondaryAdsorptionRate: 0.001,
  primaryDesorptionRate: 0.000005,
  secondaryDesorptionRate: 0.00002,
  sharedAdsorptionCapacity: 0.075,
});
