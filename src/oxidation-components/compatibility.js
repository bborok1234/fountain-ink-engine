import {
  oxidationComponentModelVersion,
  oxidationComponentRecipeSchemaVersion,
  serializeOxidationComponentRecipe,
  validateOxidationComponentRecipe,
} from "./oxidation-component-recipe.js";
import { OXIDATION_COMPONENT_RECIPE_R1 } from "./oxidation-r1.js";

const REGISTERED_OXIDATION_RECIPES = new Map([
  [
    "classic-forest-oxidation-study@1",
    "{\"componentModelVersion\":\"oxidation-component-js-r1\",\"componentRecipeSchemaVersion\":1,\"concentrationInfluence\":0.55,\"freshBlue\":62,\"freshGreen\":111,\"freshRed\":86,\"id\":\"classic-forest-oxidation-study\",\"mixMaximum\":0.88,\"progressExponent\":1,\"reactionHalfLifeMilliseconds\":90000,\"revision\":1,\"settledBlue\":31,\"settledGreen\":36,\"settledRed\":28}",
  ],
]);

if (
  serializeOxidationComponentRecipe(OXIDATION_COMPONENT_RECIPE_R1)
  !== REGISTERED_OXIDATION_RECIPES.get("classic-forest-oxidation-study@1")
) {
  throw new Error(
    "classic-forest-oxidation-study@1 changed without a registered component revision.",
  );
}

export function assertOxidationComponentRecipeCompatible(recipe) {
  validateOxidationComponentRecipe(recipe);
  if (recipe.componentModelVersion !== oxidationComponentModelVersion) {
    throw new TypeError(
      `oxidation component model ${recipe.componentModelVersion} is incompatible with ${oxidationComponentModelVersion}.`,
    );
  }
  if (
    recipe.componentRecipeSchemaVersion
    !== oxidationComponentRecipeSchemaVersion
  ) {
    throw new TypeError(
      `oxidation component schema ${recipe.componentRecipeSchemaVersion} is incompatible with ${oxidationComponentRecipeSchemaVersion}.`,
    );
  }
  const key = `${recipe.id}@${recipe.revision}`;
  const registered = REGISTERED_OXIDATION_RECIPES.get(key);
  if (
    registered !== undefined
    && serializeOxidationComponentRecipe(recipe) !== registered
  ) {
    throw new TypeError(
      `registered oxidation component ${key} does not match its canonical recipe.`,
    );
  }
  return true;
}
