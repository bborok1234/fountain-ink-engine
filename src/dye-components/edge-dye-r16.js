import { freezeDyeComponentRecipe } from "./dye-component-recipe.js";
import { KEYBOARD_DYE_AREAL_LOAD_CONTRACT_VERSION } from "../contracts/keyboard-dye-areal-load.js";

// R16 changes only the keyboard deposit measure. It branches from R14's
// capacity-free operator so the rejected R15 shared-capacity hypothesis cannot
// confound the nib/flow areal-load prerequisite.
export const EDGE_DYE_COMPONENT_RECIPE_R16 = freezeDyeComponentRecipe({
  id: "edge-dye-study",
  revision: 16,
  componentModelVersion: "dye-component-js-r15",
  componentRecipeSchemaVersion: 14,
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
  arealLoadContractVersion: KEYBOARD_DYE_AREAL_LOAD_CONTRACT_VERSION,
});
