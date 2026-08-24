import { freezeDyeComponentRecipe } from "./dye-component-recipe.js";

// A7-2 dimensionless pilot mapping. Relative ordering follows the published
// porous-paper timescale observation (flow fastest, adsorption next,
// dispersion weaker, desorption slowest) without claiming SI calibration.
// The green secondary is more diffusive and less adsorbing than the violet/
// blue primary so it can reach wet fronts while primary remains fibre-bound.
export const EDGE_DYE_COMPONENT_RECIPE_R13 = freezeDyeComponentRecipe({
  id: "edge-dye-study",
  revision: 13,
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
  primaryDiffusivity: 0.001,
  secondaryDiffusivity: 0.003,
  primaryAdsorptionRate: 0.02,
  secondaryAdsorptionRate: 0.006,
  primaryDesorptionRate: 0.0002,
  secondaryDesorptionRate: 0.0003,
});
