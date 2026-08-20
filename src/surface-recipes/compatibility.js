import {
  surfaceModelVersion,
  surfaceRecipeSchemaVersion,
} from "./versions.js";
import {
  serializeSurfaceRecipe,
  validateSurfaceRecipe,
} from "./surface-recipe.js";
import { PAPER_SURFACE_SMOOTH_R1 } from "./paper-smooth-r1.js";
import { PAPER_SURFACE_BALANCED_R1 } from "./paper-balanced-r1.js";
import { PAPER_SURFACE_ABSORBENT_R1 } from "./paper-absorbent-r1.js";
import { REGISTERED_SURFACE_RECIPE_SERIALIZATIONS } from "./registered-built-ins.js";

const keyFor = (recipe) => `${recipe.id}@${recipe.revision}`;
const BUILT_INS = [
  PAPER_SURFACE_SMOOTH_R1,
  PAPER_SURFACE_BALANCED_R1,
  PAPER_SURFACE_ABSORBENT_R1,
];
const RESERVED_IDS = new Set(
  Object.keys(REGISTERED_SURFACE_RECIPE_SERIALIZATIONS).map((key) =>
    key.slice(0, key.lastIndexOf("@"))),
);

for (const recipe of BUILT_INS) {
  if (
    serializeSurfaceRecipe(recipe)
      !== REGISTERED_SURFACE_RECIPE_SERIALIZATIONS[keyFor(recipe)]
  ) {
    throw new TypeError(
      `built-in surface recipe ${keyFor(recipe)} changed without a registered revision.`,
    );
  }
}

export function assertRegisteredSurfaceRecipeIdentity(recipe) {
  validateSurfaceRecipe(recipe);
  if (!RESERVED_IDS.has(recipe.id)) return true;
  const key = keyFor(recipe);
  const registered = REGISTERED_SURFACE_RECIPE_SERIALIZATIONS[key];
  if (registered === undefined) {
    throw new TypeError(`surface recipe identity ${key} is reserved but not registered.`);
  }
  if (serializeSurfaceRecipe(recipe) !== registered) {
    throw new TypeError(`surface recipe identity ${key} does not match its registered definition.`);
  }
  return true;
}

export function assertSurfaceRecipeCompatible(recipe) {
  validateSurfaceRecipe(recipe);
  if (recipe.surfaceModelVersion !== surfaceModelVersion) {
    throw new TypeError(
      `surfaceRecipe.surfaceModelVersion ${recipe.surfaceModelVersion} is incompatible with ${surfaceModelVersion}.`,
    );
  }
  if (recipe.surfaceRecipeSchemaVersion !== surfaceRecipeSchemaVersion) {
    throw new TypeError(
      `surfaceRecipe.surfaceRecipeSchemaVersion ${recipe.surfaceRecipeSchemaVersion} is incompatible with ${surfaceRecipeSchemaVersion}.`,
    );
  }
  return assertRegisteredSurfaceRecipeIdentity(recipe);
}
