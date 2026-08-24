import { freezeDyeComponentRecipe } from "./dye-component-recipe.js";

// A7-2 R14 calibrates only the dimensionless species rates of R13's shared
// conservative transport operator. The two-dye state model, recipe schema,
// initial mixture, and optical endpoints remain unchanged so this revision can
// isolate the effect of stronger primary fibre binding and wider secondary
// aqueous dispersion without silently retuning the R13 checkpoint.
export const EDGE_DYE_COMPONENT_RECIPE_R14 = freezeDyeComponentRecipe({
  id: "edge-dye-study",
  revision: 14,
  componentModelVersion: "dye-component-js-r13",
  componentRecipeSchemaVersion: 12,
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
});
