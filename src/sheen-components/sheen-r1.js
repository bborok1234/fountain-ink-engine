import { freezeSheenComponentRecipe } from "./sheen-component-recipe.js";

// A1 treats sheen as a retained high-concentration surface film whose color is
// visible only under an explicit specular observation. It is not a color edge,
// outline, glow, particle layer, or permanent recoloring of the base ink.
export const SHEEN_COMPONENT_RECIPE_R1 = freezeSheenComponentRecipe({
  id: "sheen-study",
  revision: 1,
  componentModelVersion: "sheen-component-js-r1",
  componentRecipeSchemaVersion: 1,
  activationThreshold: 0.72,
  activationExponent: 1.4,
  filmGain: 4,
  filmMaximum: 1,
  roughnessSensitivity: 0.7,
  sheenRed: 186,
  sheenGreen: 77,
  sheenBlue: 52,
  viewThreshold: 0.45,
  viewExponent: 1.8,
  mixMaximum: 0.9,
});
