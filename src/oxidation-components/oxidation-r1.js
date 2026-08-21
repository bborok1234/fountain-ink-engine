import { freezeOxidationComponentRecipe } from "./oxidation-component-recipe.js";

// Forest-black-inspired authored study values. The color direction follows
// official classic-ink descriptions; the 90-second half-life is a digital
// experiment value, not a measured claim about one commercial formula.
export const OXIDATION_COMPONENT_RECIPE_R1 = freezeOxidationComponentRecipe({
  id: "classic-forest-oxidation-study",
  revision: 1,
  componentModelVersion: "oxidation-component-js-r1",
  componentRecipeSchemaVersion: 1,
  freshRed: 86,
  freshGreen: 111,
  freshBlue: 62,
  settledRed: 28,
  settledGreen: 36,
  settledBlue: 31,
  reactionHalfLifeMilliseconds: 90_000,
  progressExponent: 1,
  mixMaximum: 0.88,
  concentrationInfluence: 0.55,
});
