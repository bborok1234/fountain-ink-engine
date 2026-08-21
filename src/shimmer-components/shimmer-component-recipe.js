export const shimmerComponentModelVersion = "shimmer-component-js-r1";
export const shimmerComponentRecipeSchemaVersion = 1;
export const SUPPORTED_SHIMMER_COMPONENT_RECIPE_SCHEMA_VERSIONS = Object.freeze([1]);

const RECIPE_KEYS = Object.freeze([
  "id",
  "revision",
  "componentModelVersion",
  "componentRecipeSchemaVersion",
  "particleRed",
  "particleGreen",
  "particleBlue",
  "particleBudget",
  "particleLoad",
  "coverageThreshold",
  "sizeMinimumCssPixels",
  "sizeMaximumCssPixels",
  "reflectivity",
  "staticPhase",
  "lightExponent",
]);

function assertPlainRecord(value, path) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${path} must be an object.`);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError(`${path} must have a plain prototype.`);
  }
}

function assertExactDataProperties(value, keys, path) {
  const expected = new Set(keys);
  const actual = Reflect.ownKeys(value);
  const unexpected = actual.filter((key) =>
    typeof key !== "string" || !expected.has(key));
  const missing = keys.filter((key) => !Object.hasOwn(value, key));
  if (unexpected.length > 0 || missing.length > 0) {
    throw new TypeError(
      `${path} has invalid keys; unexpected=${unexpected.map(String).join(",") || "none"}; missing=${missing.join(",") || "none"}.`,
    );
  }
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor?.enumerable || !("value" in descriptor)) {
      throw new TypeError(
        `${path}.${key} must be an enumerable own data property.`,
      );
    }
  }
}

function assertNumber(value, path, minimum, maximum) {
  if (!Number.isFinite(value) || value < minimum || value > maximum) {
    throw new TypeError(
      `${path} must be a finite number in ${minimum}...${maximum}.`,
    );
  }
}

export function validateShimmerComponentRecipe(recipe) {
  assertPlainRecord(recipe, "shimmerComponentRecipe");
  assertExactDataProperties(recipe, RECIPE_KEYS, "shimmerComponentRecipe");
  if (typeof recipe.id !== "string" || recipe.id.trim() === "") {
    throw new TypeError("shimmerComponentRecipe.id must be a non-empty string.");
  }
  if (!Number.isSafeInteger(recipe.revision) || recipe.revision < 1) {
    throw new TypeError(
      "shimmerComponentRecipe.revision must be a positive safe integer.",
    );
  }
  if (
    typeof recipe.componentModelVersion !== "string"
    || recipe.componentModelVersion.trim() === ""
  ) {
    throw new TypeError(
      "shimmerComponentRecipe.componentModelVersion must be a non-empty string.",
    );
  }
  if (
    !SUPPORTED_SHIMMER_COMPONENT_RECIPE_SCHEMA_VERSIONS.includes(
      recipe.componentRecipeSchemaVersion,
    )
  ) {
    throw new TypeError(
      `shimmerComponentRecipe.componentRecipeSchemaVersion ${String(recipe.componentRecipeSchemaVersion)} is not supported.`,
    );
  }
  for (const channel of ["particleRed", "particleGreen", "particleBlue"]) {
    if (
      !Number.isInteger(recipe[channel])
      || recipe[channel] < 0
      || recipe[channel] > 255
    ) {
      throw new TypeError(
        `shimmerComponentRecipe.${channel} must be an integer in 0...255.`,
      );
    }
  }
  if (
    !Number.isInteger(recipe.particleBudget)
    || recipe.particleBudget < 0
    || recipe.particleBudget > 4096
  ) {
    throw new TypeError(
      "shimmerComponentRecipe.particleBudget must be an integer in 0...4096.",
    );
  }
  assertNumber(recipe.particleLoad, "shimmerComponentRecipe.particleLoad", 0, 1);
  assertNumber(
    recipe.coverageThreshold,
    "shimmerComponentRecipe.coverageThreshold",
    0,
    1,
  );
  assertNumber(
    recipe.sizeMinimumCssPixels,
    "shimmerComponentRecipe.sizeMinimumCssPixels",
    0.1,
    4,
  );
  assertNumber(
    recipe.sizeMaximumCssPixels,
    "shimmerComponentRecipe.sizeMaximumCssPixels",
    recipe.sizeMinimumCssPixels,
    6,
  );
  assertNumber(
    recipe.reflectivity,
    "shimmerComponentRecipe.reflectivity",
    0,
    1,
  );
  assertNumber(recipe.staticPhase, "shimmerComponentRecipe.staticPhase", 0, 1);
  assertNumber(
    recipe.lightExponent,
    "shimmerComponentRecipe.lightExponent",
    0.1,
    8,
  );
  return true;
}

export function serializeShimmerComponentRecipe(recipe) {
  validateShimmerComponentRecipe(recipe);
  return JSON.stringify(Object.fromEntries(
    [...RECIPE_KEYS].sort().map((key) => [key, recipe[key]]),
  ));
}

export function freezeShimmerComponentRecipe(recipe) {
  validateShimmerComponentRecipe(recipe);
  return Object.freeze({ ...recipe });
}

export function parseShimmerComponentRecipe(serialized) {
  if (typeof serialized !== "string") {
    throw new TypeError("serialized shimmer component recipe must be a string.");
  }
  return freezeShimmerComponentRecipe(JSON.parse(serialized));
}

export function readShimmerObservation(observation) {
  assertPlainRecord(observation, "shimmerObservation");
  assertExactDataProperties(
    observation,
    ["lightPhase", "reduceMotion"],
    "shimmerObservation",
  );
  assertNumber(observation.lightPhase, "shimmerObservation.lightPhase", 0, 1);
  if (typeof observation.reduceMotion !== "boolean") {
    throw new TypeError("shimmerObservation.reduceMotion must be a boolean.");
  }
  return Object.freeze({
    lightPhase: observation.lightPhase,
    reduceMotion: observation.reduceMotion,
  });
}
