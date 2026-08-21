import {
  serializeShimmerComponentRecipe,
  shimmerComponentModelVersion,
  shimmerComponentRecipeSchemaVersion,
  validateShimmerComponentRecipe,
} from "./shimmer-component-recipe.js";
import { SHIMMER_COMPONENT_RECIPE_R1 } from "./shimmer-r1.js";

const REGISTERED_RECIPES = Object.freeze({
  "shimmer-study@1": "{\"componentModelVersion\":\"shimmer-component-js-r1\",\"componentRecipeSchemaVersion\":1,\"coverageThreshold\":0.18,\"id\":\"shimmer-study\",\"lightExponent\":2.4,\"particleBlue\":72,\"particleBudget\":512,\"particleGreen\":184,\"particleLoad\":0.8,\"particleRed\":222,\"reflectivity\":1,\"revision\":1,\"sizeMaximumCssPixels\":1.2,\"sizeMinimumCssPixels\":0.5,\"staticPhase\":0.17}",
});

const RESERVED_IDS = new Set(
  Object.keys(REGISTERED_RECIPES).map((key) => key.split("@")[0]),
);
const keyFor = (recipe) => `${recipe.id}@${recipe.revision}`;

export function assertShimmerComponentRecipeCompatible(recipe) {
  validateShimmerComponentRecipe(recipe);
  if (recipe.componentModelVersion !== shimmerComponentModelVersion) {
    throw new TypeError(
      `shimmerComponentRecipe.componentModelVersion ${recipe.componentModelVersion} is incompatible with ${shimmerComponentModelVersion}.`,
    );
  }
  if (
    recipe.componentRecipeSchemaVersion
      !== shimmerComponentRecipeSchemaVersion
  ) {
    throw new TypeError(
      `shimmerComponentRecipe.componentRecipeSchemaVersion ${recipe.componentRecipeSchemaVersion} is incompatible with ${shimmerComponentRecipeSchemaVersion}.`,
    );
  }
  const key = keyFor(recipe);
  const registered = REGISTERED_RECIPES[key];
  if (registered === undefined) {
    if (RESERVED_IDS.has(recipe.id)) {
      throw new TypeError(`shimmer component identity ${key} is not registered.`);
    }
    return true;
  }
  if (serializeShimmerComponentRecipe(recipe) !== registered) {
    throw new TypeError(
      `shimmer component identity ${key} does not match its registered definition.`,
    );
  }
  return true;
}

if (
  serializeShimmerComponentRecipe(SHIMMER_COMPONENT_RECIPE_R1)
    !== REGISTERED_RECIPES["shimmer-study@1"]
) {
  throw new TypeError(
    "built-in shimmer component shimmer-study@1 changed without a revision.",
  );
}
