import {
  serializeSheenComponentRecipe,
  sheenComponentModelVersion,
  sheenComponentRecipeSchemaVersion,
  validateSheenComponentRecipe,
} from "./sheen-component-recipe.js";
import { SHEEN_COMPONENT_RECIPE_R1 } from "./sheen-r1.js";

const REGISTERED_RECIPES = Object.freeze({
  "sheen-study@1": "{\"activationExponent\":1.4,\"activationThreshold\":0.72,\"componentModelVersion\":\"sheen-component-js-r1\",\"componentRecipeSchemaVersion\":1,\"filmGain\":4,\"filmMaximum\":1,\"id\":\"sheen-study\",\"mixMaximum\":0.9,\"revision\":1,\"roughnessSensitivity\":0.7,\"sheenBlue\":52,\"sheenGreen\":77,\"sheenRed\":186,\"viewExponent\":1.8,\"viewThreshold\":0.45}",
});

const RESERVED_IDS = new Set(
  Object.keys(REGISTERED_RECIPES).map((key) => key.split("@")[0]),
);
const keyFor = (recipe) => `${recipe.id}@${recipe.revision}`;

if (
  serializeSheenComponentRecipe(SHEEN_COMPONENT_RECIPE_R1)
    !== REGISTERED_RECIPES["sheen-study@1"]
) {
  throw new TypeError(
    "built-in sheen component sheen-study@1 changed without a revision.",
  );
}

export function assertSheenComponentRecipeCompatible(recipe) {
  validateSheenComponentRecipe(recipe);
  if (recipe.componentModelVersion !== sheenComponentModelVersion) {
    throw new TypeError(
      `sheenComponentRecipe.componentModelVersion ${recipe.componentModelVersion} is incompatible with ${sheenComponentModelVersion}.`,
    );
  }
  if (
    recipe.componentRecipeSchemaVersion
      !== sheenComponentRecipeSchemaVersion
  ) {
    throw new TypeError(
      `sheenComponentRecipe.componentRecipeSchemaVersion ${recipe.componentRecipeSchemaVersion} is incompatible with ${sheenComponentRecipeSchemaVersion}.`,
    );
  }
  const key = keyFor(recipe);
  const registered = REGISTERED_RECIPES[key];
  if (registered === undefined) {
    if (RESERVED_IDS.has(recipe.id)) {
      throw new TypeError(`sheen component identity ${key} is not registered.`);
    }
    return true;
  }
  if (serializeSheenComponentRecipe(recipe) !== registered) {
    throw new TypeError(
      `sheen component identity ${key} does not match its registered definition.`,
    );
  }
  return true;
}
