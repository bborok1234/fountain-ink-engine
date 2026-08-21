export const dyeComponentModelVersion = "dye-component-js-r1";
export const dyeComponentRecipeSchemaVersion = 1;
export const SUPPORTED_DYE_COMPONENT_RECIPE_SCHEMA_VERSIONS = Object.freeze([1]);

const RECIPE_KEYS = Object.freeze([
  "id",
  "revision",
  "componentModelVersion",
  "componentRecipeSchemaVersion",
  "massFraction",
  "mobilityMultiplier",
  "retentionMultiplier",
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

function assertString(value, path) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError(`${path} must be a non-empty string.`);
  }
}

export function validateDyeComponentRecipe(recipe) {
  assertPlainRecord(recipe, "dyeComponentRecipe");
  assertExactDataProperties(recipe, RECIPE_KEYS, "dyeComponentRecipe");
  assertString(recipe.id, "dyeComponentRecipe.id");
  if (!Number.isSafeInteger(recipe.revision) || recipe.revision < 1) {
    throw new TypeError(
      "dyeComponentRecipe.revision must be a positive safe integer.",
    );
  }
  assertString(
    recipe.componentModelVersion,
    "dyeComponentRecipe.componentModelVersion",
  );
  if (recipe.componentRecipeSchemaVersion !== 1) {
    throw new TypeError(
      "dyeComponentRecipe.componentRecipeSchemaVersion must be 1.",
    );
  }
  assertNumber(recipe.massFraction, "dyeComponentRecipe.massFraction", 0, 1);
  assertNumber(
    recipe.mobilityMultiplier,
    "dyeComponentRecipe.mobilityMultiplier",
    0,
    2,
  );
  assertNumber(
    recipe.retentionMultiplier,
    "dyeComponentRecipe.retentionMultiplier",
    0,
    2,
  );
  return true;
}

export function serializeDyeComponentRecipe(recipe) {
  validateDyeComponentRecipe(recipe);
  return JSON.stringify(Object.fromEntries(
    [...RECIPE_KEYS].sort().map((key) => [key, recipe[key]]),
  ));
}

export function freezeDyeComponentRecipe(recipe) {
  validateDyeComponentRecipe(recipe);
  return Object.freeze({ ...recipe });
}

export function parseDyeComponentRecipe(serialized) {
  if (typeof serialized !== "string") {
    throw new TypeError("serialized dye component recipe must be a string.");
  }
  return freezeDyeComponentRecipe(JSON.parse(serialized));
}
