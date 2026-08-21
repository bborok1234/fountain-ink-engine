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
import { PAPER_SURFACE_BALANCED_R2 } from "./paper-balanced-r2.js";
import { PAPER_SURFACE_ABSORBENT_R1 } from "./paper-absorbent-r1.js";
import { PAPER_SURFACE_ABSORBENT_R2 } from "./paper-absorbent-r2.js";
import { PAPER_SURFACE_ABSORBENT_R3 } from "./paper-absorbent-r3.js";
import { PAPER_SURFACE_ABSORBENT_R4 } from "./paper-absorbent-r4.js";
import { SUPPORTED_SURFACE_RUNTIME_VERSIONS } from "./versions.js";
import { REGISTERED_SURFACE_RECIPE_SERIALIZATIONS } from "./registered-built-ins.js";

const keyFor = (recipe) => `${recipe.id}@${recipe.revision}`;
const BUILT_INS = [
  PAPER_SURFACE_SMOOTH_R1,
  PAPER_SURFACE_BALANCED_R1,
  PAPER_SURFACE_BALANCED_R2,
  PAPER_SURFACE_ABSORBENT_R1,
  PAPER_SURFACE_ABSORBENT_R2,
  PAPER_SURFACE_ABSORBENT_R3,
  PAPER_SURFACE_ABSORBENT_R4,
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
  const supportedRuntime = SUPPORTED_SURFACE_RUNTIME_VERSIONS.some(
    (version) => (
      version.surfaceModelVersion === recipe.surfaceModelVersion
      && version.surfaceRecipeSchemaVersion === recipe.surfaceRecipeSchemaVersion
    ),
  );
  if (!supportedRuntime) {
    throw new TypeError(
      `Surface runtime ${recipe.surfaceModelVersion}/schema-${recipe.surfaceRecipeSchemaVersion} is incompatible with ${surfaceModelVersion}/schema-${surfaceRecipeSchemaVersion}.`,
    );
  }
  return assertRegisteredSurfaceRecipeIdentity(recipe);
}
