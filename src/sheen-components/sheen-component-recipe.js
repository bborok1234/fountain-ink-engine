export const sheenComponentModelVersion = "sheen-component-js-r1";
export const sheenComponentRecipeSchemaVersion = 1;
export const SUPPORTED_SHEEN_COMPONENT_RECIPE_SCHEMA_VERSIONS = Object.freeze([1]);

const RECIPE_KEYS = Object.freeze([
  "id",
  "revision",
  "componentModelVersion",
  "componentRecipeSchemaVersion",
  "activationThreshold",
  "activationExponent",
  "filmGain",
  "filmMaximum",
  "roughnessSensitivity",
  "sheenRed",
  "sheenGreen",
  "sheenBlue",
  "viewThreshold",
  "viewExponent",
  "mixMaximum",
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

export function validateSheenComponentRecipe(recipe) {
  assertPlainRecord(recipe, "sheenComponentRecipe");
  assertExactDataProperties(
    recipe,
    RECIPE_KEYS,
    "sheenComponentRecipe",
  );
  if (typeof recipe.id !== "string" || recipe.id.trim() === "") {
    throw new TypeError("sheenComponentRecipe.id must be a non-empty string.");
  }
  if (!Number.isSafeInteger(recipe.revision) || recipe.revision < 1) {
    throw new TypeError(
      "sheenComponentRecipe.revision must be a positive safe integer.",
    );
  }
  if (
    typeof recipe.componentModelVersion !== "string"
    || recipe.componentModelVersion.trim() === ""
  ) {
    throw new TypeError(
      "sheenComponentRecipe.componentModelVersion must be a non-empty string.",
    );
  }
  if (
    !SUPPORTED_SHEEN_COMPONENT_RECIPE_SCHEMA_VERSIONS.includes(
      recipe.componentRecipeSchemaVersion,
    )
  ) {
    throw new TypeError(
      `sheenComponentRecipe.componentRecipeSchemaVersion ${String(recipe.componentRecipeSchemaVersion)} is not supported.`,
    );
  }
  assertNumber(
    recipe.activationThreshold,
    "sheenComponentRecipe.activationThreshold",
    0,
    0.999,
  );
  assertNumber(
    recipe.activationExponent,
    "sheenComponentRecipe.activationExponent",
    0.1,
    8,
  );
  assertNumber(recipe.filmGain, "sheenComponentRecipe.filmGain", 0, 8);
  assertNumber(
    recipe.filmMaximum,
    "sheenComponentRecipe.filmMaximum",
    0,
    1,
  );
  assertNumber(
    recipe.roughnessSensitivity,
    "sheenComponentRecipe.roughnessSensitivity",
    0,
    4,
  );
  for (const channel of ["sheenRed", "sheenGreen", "sheenBlue"]) {
    if (
      !Number.isInteger(recipe[channel])
      || recipe[channel] < 0
      || recipe[channel] > 255
    ) {
      throw new TypeError(
        `sheenComponentRecipe.${channel} must be an integer in 0...255.`,
      );
    }
  }
  assertNumber(
    recipe.viewThreshold,
    "sheenComponentRecipe.viewThreshold",
    0,
    0.999,
  );
  assertNumber(
    recipe.viewExponent,
    "sheenComponentRecipe.viewExponent",
    0.1,
    8,
  );
  assertNumber(
    recipe.mixMaximum,
    "sheenComponentRecipe.mixMaximum",
    0,
    1,
  );
  return true;
}

export function serializeSheenComponentRecipe(recipe) {
  validateSheenComponentRecipe(recipe);
  return JSON.stringify(Object.fromEntries(
    [...RECIPE_KEYS].sort().map((key) => [key, recipe[key]]),
  ));
}

export function freezeSheenComponentRecipe(recipe) {
  validateSheenComponentRecipe(recipe);
  return Object.freeze({ ...recipe });
}

export function parseSheenComponentRecipe(serialized) {
  if (typeof serialized !== "string") {
    throw new TypeError("serialized sheen component recipe must be a string.");
  }
  return freezeSheenComponentRecipe(JSON.parse(serialized));
}

export function readSheenObservation(observation) {
  assertPlainRecord(observation, "sheenObservation");
  assertExactDataProperties(
    observation,
    ["specularAlignment"],
    "sheenObservation",
  );
  assertNumber(
    observation.specularAlignment,
    "sheenObservation.specularAlignment",
    0,
    1,
  );
  return Object.freeze({
    specularAlignment: observation.specularAlignment,
  });
}
