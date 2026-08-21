export const pigmentComponentModelVersion = "pigment-component-js-r1";
export const pigmentComponentRecipeSchemaVersion = 1;
export const SUPPORTED_PIGMENT_COMPONENT_RECIPE_SCHEMA_VERSIONS = Object.freeze([1]);

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

export function validatePigmentComponentRecipe(recipe) {
  assertPlainRecord(recipe, "pigmentComponentRecipe");
  assertExactDataProperties(recipe, RECIPE_KEYS, "pigmentComponentRecipe");
  if (typeof recipe.id !== "string" || recipe.id.trim() === "") {
    throw new TypeError("pigmentComponentRecipe.id must be a non-empty string.");
  }
  if (!Number.isSafeInteger(recipe.revision) || recipe.revision < 1) {
    throw new TypeError(
      "pigmentComponentRecipe.revision must be a positive safe integer.",
    );
  }
  if (
    typeof recipe.componentModelVersion !== "string"
    || recipe.componentModelVersion.trim() === ""
  ) {
    throw new TypeError(
      "pigmentComponentRecipe.componentModelVersion must be a non-empty string.",
    );
  }
  if (
    !SUPPORTED_PIGMENT_COMPONENT_RECIPE_SCHEMA_VERSIONS.includes(
      recipe.componentRecipeSchemaVersion,
    )
  ) {
    throw new TypeError(
      `pigmentComponentRecipe.componentRecipeSchemaVersion ${String(recipe.componentRecipeSchemaVersion)} is not supported.`,
    );
  }
  assertNumber(recipe.massFraction, "pigmentComponentRecipe.massFraction", 0, 2);
  assertNumber(
    recipe.mobilityMultiplier,
    "pigmentComponentRecipe.mobilityMultiplier",
    0,
    2,
  );
  assertNumber(
    recipe.retentionMultiplier,
    "pigmentComponentRecipe.retentionMultiplier",
    0,
    4,
  );
  return true;
}

export function serializePigmentComponentRecipe(recipe) {
  validatePigmentComponentRecipe(recipe);
  return JSON.stringify(Object.fromEntries(
    [...RECIPE_KEYS].sort().map((key) => [key, recipe[key]]),
  ));
}

export function freezePigmentComponentRecipe(recipe) {
  validatePigmentComponentRecipe(recipe);
  return Object.freeze({ ...recipe });
}

export function parsePigmentComponentRecipe(serialized) {
  if (typeof serialized !== "string") {
    throw new TypeError("serialized pigment component recipe must be a string.");
  }
  return freezePigmentComponentRecipe(JSON.parse(serialized));
}
