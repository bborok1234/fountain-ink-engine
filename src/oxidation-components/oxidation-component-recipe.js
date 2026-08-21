export const oxidationComponentModelVersion = "oxidation-component-js-r1";
export const oxidationComponentRecipeSchemaVersion = 1;
export const SUPPORTED_OXIDATION_COMPONENT_RECIPE_SCHEMA_VERSIONS = Object.freeze([1]);

const RECIPE_KEYS = Object.freeze([
  "id",
  "revision",
  "componentModelVersion",
  "componentRecipeSchemaVersion",
  "freshRed",
  "freshGreen",
  "freshBlue",
  "settledRed",
  "settledGreen",
  "settledBlue",
  "reactionHalfLifeMilliseconds",
  "progressExponent",
  "mixMaximum",
  "concentrationInfluence",
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
      throw new TypeError(`${path}.${key} must be an enumerable own data property.`);
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

function assertColorChannel(value, path) {
  if (!Number.isInteger(value) || value < 0 || value > 255) {
    throw new TypeError(`${path} must be an integer in 0...255.`);
  }
}

function assertTimestamp(value, path) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new TypeError(`${path} must be a non-negative safe integer.`);
  }
  return value;
}

export function validateOxidationComponentRecipe(recipe) {
  assertPlainRecord(recipe, "oxidationComponentRecipe");
  assertExactDataProperties(
    recipe,
    RECIPE_KEYS,
    "oxidationComponentRecipe",
  );
  if (typeof recipe.id !== "string" || recipe.id.trim() === "") {
    throw new TypeError("oxidationComponentRecipe.id must be a non-empty string.");
  }
  if (!Number.isSafeInteger(recipe.revision) || recipe.revision < 1) {
    throw new TypeError(
      "oxidationComponentRecipe.revision must be a positive safe integer.",
    );
  }
  if (
    typeof recipe.componentModelVersion !== "string"
    || recipe.componentModelVersion.trim() === ""
  ) {
    throw new TypeError(
      "oxidationComponentRecipe.componentModelVersion must be a non-empty string.",
    );
  }
  if (
    !SUPPORTED_OXIDATION_COMPONENT_RECIPE_SCHEMA_VERSIONS.includes(
      recipe.componentRecipeSchemaVersion,
    )
  ) {
    throw new TypeError(
      `oxidationComponentRecipe.componentRecipeSchemaVersion ${String(recipe.componentRecipeSchemaVersion)} is not supported.`,
    );
  }
  for (const channel of [
    "freshRed",
    "freshGreen",
    "freshBlue",
    "settledRed",
    "settledGreen",
    "settledBlue",
  ]) {
    assertColorChannel(recipe[channel], `oxidationComponentRecipe.${channel}`);
  }
  if (
    !Number.isSafeInteger(recipe.reactionHalfLifeMilliseconds)
    || recipe.reactionHalfLifeMilliseconds < 1
  ) {
    throw new TypeError(
      "oxidationComponentRecipe.reactionHalfLifeMilliseconds must be a positive safe integer.",
    );
  }
  assertNumber(
    recipe.progressExponent,
    "oxidationComponentRecipe.progressExponent",
    0.1,
    8,
  );
  assertNumber(recipe.mixMaximum, "oxidationComponentRecipe.mixMaximum", 0, 1);
  assertNumber(
    recipe.concentrationInfluence,
    "oxidationComponentRecipe.concentrationInfluence",
    0,
    1,
  );
  return true;
}

export function serializeOxidationComponentRecipe(recipe) {
  validateOxidationComponentRecipe(recipe);
  return JSON.stringify(Object.fromEntries(
    [...RECIPE_KEYS].sort().map((key) => [key, recipe[key]]),
  ));
}

export function freezeOxidationComponentRecipe(recipe) {
  validateOxidationComponentRecipe(recipe);
  return Object.freeze({ ...recipe });
}

export function parseOxidationComponentRecipe(serialized) {
  if (typeof serialized !== "string") {
    throw new TypeError("serialized oxidation component recipe must be a string.");
  }
  return freezeOxidationComponentRecipe(JSON.parse(serialized));
}

export function readOxidationObservation(observation) {
  assertPlainRecord(observation, "oxidationObservation");
  assertExactDataProperties(
    observation,
    ["committedAtMilliseconds", "observedAtMilliseconds"],
    "oxidationObservation",
  );
  const committedAtMilliseconds = assertTimestamp(
    observation.committedAtMilliseconds,
    "oxidationObservation.committedAtMilliseconds",
  );
  const observedAtMilliseconds = assertTimestamp(
    observation.observedAtMilliseconds,
    "oxidationObservation.observedAtMilliseconds",
  );
  if (observedAtMilliseconds < committedAtMilliseconds) {
    throw new TypeError(
      "oxidationObservation.observedAtMilliseconds must be at or after committedAtMilliseconds.",
    );
  }
  return Object.freeze({
    committedAtMilliseconds,
    observedAtMilliseconds,
    elapsedMilliseconds: observedAtMilliseconds - committedAtMilliseconds,
  });
}
