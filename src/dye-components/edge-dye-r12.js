import { freezeDyeComponentRecipe } from "./dye-component-recipe.js";

// A7-1 replaces the A6 "ordinary mass plus extra component" model with one
// conserved total dye mass split into two species. 8/33 is the same nominal
// secondary share that A6's 0.32 secondary-to-primary loading implied, while
// the transport/retention/retardation knobs are intentionally retired.
export const EDGE_DYE_COMPONENT_RECIPE_R12 = freezeDyeComponentRecipe({
  id: "edge-dye-study",
  revision: 12,
  componentModelVersion: "dye-component-js-r12",
  componentRecipeSchemaVersion: 11,
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
});
