import {
  engineModelVersion,
  recipeSchemaVersion,
} from "../contracts/versions.js";
import {
  serializeInkRecipe,
  validateInkRecipe,
} from "./ink-recipe.js";
import { ORDINARY_GREEN_RECIPE_R1 } from "./ordinary-green-r1.js";
import { ORDINARY_GREEN_RECIPE_R2 } from "./ordinary-green-r2.js";
import { ORDINARY_GREEN_RECIPE_R3 } from "./ordinary-green-r3.js";
import { ORDINARY_GREEN_RECIPE_R4 } from "./ordinary-green-r4.js";
import { REGISTERED_BUILT_IN_RECIPE_SERIALIZATIONS } from "./registered-built-ins.js";

const recipeKey = (recipe) => `${recipe.id}@${recipe.revision}`;

const AUTHORED_BUILT_IN_RECIPES = new Map([
  [recipeKey(ORDINARY_GREEN_RECIPE_R1), ORDINARY_GREEN_RECIPE_R1],
  [recipeKey(ORDINARY_GREEN_RECIPE_R2), ORDINARY_GREEN_RECIPE_R2],
  [recipeKey(ORDINARY_GREEN_RECIPE_R3), ORDINARY_GREEN_RECIPE_R3],
  [recipeKey(ORDINARY_GREEN_RECIPE_R4), ORDINARY_GREEN_RECIPE_R4],
]);

const RESERVED_RECIPE_IDS = new Set(
  Object.keys(REGISTERED_BUILT_IN_RECIPE_SERIALIZATIONS).map((key) =>
    key.slice(0, key.lastIndexOf("@"))),
);

for (const [key, recipe] of AUTHORED_BUILT_IN_RECIPES) {
  const registeredSerialization =
    REGISTERED_BUILT_IN_RECIPE_SERIALIZATIONS[key];
  if (
    registeredSerialization === undefined
    || serializeInkRecipe(recipe) !== registeredSerialization
  ) {
    throw new TypeError(
      `built-in recipe ${key} changed without a registered revision.`,
    );
  }
}

/**
 * Protect built-in identities from being reused for different calculations.
 * Structurally valid custom recipes remain possible under a distinct id.
 *
 * @param {Record<string, unknown>} recipe
 * @returns {true}
 */
export function assertRegisteredInkRecipeIdentity(recipe) {
  validateInkRecipe(recipe);
  if (!RESERVED_RECIPE_IDS.has(recipe.id)) return true;

  const key = recipeKey(recipe);
  const registeredSerialization =
    REGISTERED_BUILT_IN_RECIPE_SERIALIZATIONS[key];
  if (registeredSerialization === undefined) {
    throw new TypeError(
      `recipe identity ${key} is reserved but not registered.`,
    );
  }
  if (serializeInkRecipe(recipe) !== registeredSerialization) {
    throw new TypeError(
      `recipe identity ${key} does not match its registered definition.`,
    );
  }
  return true;
}

/**
 * Fail before calculation when a structurally valid historical recipe does not
 * belong to the active numeric implementation or impersonates a built-in.
 *
 * @param {Record<string, unknown>} recipe
 * @returns {true}
 */
export function assertInkRecipeCompatible(recipe) {
  validateInkRecipe(recipe);
  if (recipe.engineModelVersion !== engineModelVersion) {
    throw new TypeError(
      `recipe.engineModelVersion ${recipe.engineModelVersion} is incompatible with ${engineModelVersion}.`,
    );
  }
  if (recipe.recipeSchemaVersion !== recipeSchemaVersion) {
    throw new TypeError(
      `recipe.recipeSchemaVersion ${recipe.recipeSchemaVersion} is incompatible with ${recipeSchemaVersion}.`,
    );
  }
  return assertRegisteredInkRecipeIdentity(recipe);
}
