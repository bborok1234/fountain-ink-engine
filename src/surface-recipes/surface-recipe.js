const AXIS_KEYS = Object.freeze([
  "verticalUptake",
  "lateralMobility",
  "dyeAffinity",
  "surfaceRetention",
  "filmPreservation",
  "roughness",
  "particleCatch",
  "paperReflectance",
]);

const KEYBOARD_KEYS = Object.freeze([
  "stepBase",
  "stepUptakeGain",
  "stepMilliseconds",
  "normalizationScale",
  "normalizationReferenceAlpha",
  "coverageMixExponent",
  "contactRetentionFloor",
]);

export const MAX_PAPER_SURFACE_STEPS = 64;

function isRecord(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function assertRecord(value, path) {
  if (!isRecord(value)) throw new TypeError(`${path} must be a plain object.`);
}

function assertExactKeys(value, keys, path) {
  const expected = new Set(keys);
  const actual = Reflect.ownKeys(value);
  const invalid = actual.filter((key) => typeof key !== "string" || !expected.has(key));
  const missing = keys.filter((key) => !Object.hasOwn(value, key));
  if (invalid.length > 0 || missing.length > 0) {
    throw new TypeError(
      `${path} has invalid keys; unexpected=${invalid.map(String).join(",") || "none"}; missing=${missing.join(",") || "none"}.`,
    );
  }
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor?.enumerable || !("value" in descriptor)) {
      throw new TypeError(`${path}.${key} must be an enumerable own data property.`);
    }
  }
}

function assertNumber(value, path, minimum = 0, maximum = 1) {
  if (!Number.isFinite(value) || value < minimum || value > maximum) {
    throw new TypeError(`${path} must be a finite number in ${minimum}...${maximum}.`);
  }
}

function assertInteger(value, path, minimum, maximum) {
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new TypeError(`${path} must be an integer in ${minimum}...${maximum}.`);
  }
}

function assertString(value, path) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError(`${path} must be a non-empty string.`);
  }
}

function deepFreeze(value) {
  if (!value || typeof value !== "object") return value;
  Object.values(value).forEach(deepFreeze);
  return Object.isFrozen(value) ? value : Object.freeze(value);
}

function canonicalValue(value) {
  if (!isRecord(value)) return value;
  return Object.fromEntries(
    Object.keys(value).sort().map((key) => [key, canonicalValue(value[key])]),
  );
}

export function validateSurfaceRecipe(recipe) {
  assertRecord(recipe, "surfaceRecipe");
  assertExactKeys(recipe, [
    "id",
    "revision",
    "surfaceModelVersion",
    "surfaceRecipeSchemaVersion",
    "axes",
    "keyboard",
  ], "surfaceRecipe");
  assertString(recipe.id, "surfaceRecipe.id");
  assertInteger(recipe.revision, "surfaceRecipe.revision", 1, Number.MAX_SAFE_INTEGER);
  assertString(recipe.surfaceModelVersion, "surfaceRecipe.surfaceModelVersion");
  assertInteger(recipe.surfaceRecipeSchemaVersion, "surfaceRecipe.surfaceRecipeSchemaVersion", 1, 1);

  assertRecord(recipe.axes, "surfaceRecipe.axes");
  assertExactKeys(recipe.axes, AXIS_KEYS, "surfaceRecipe.axes");
  for (const key of AXIS_KEYS) assertNumber(recipe.axes[key], `surfaceRecipe.axes.${key}`);

  assertRecord(recipe.keyboard, "surfaceRecipe.keyboard");
  assertExactKeys(recipe.keyboard, KEYBOARD_KEYS, "surfaceRecipe.keyboard");
  assertInteger(recipe.keyboard.stepBase, "surfaceRecipe.keyboard.stepBase", 0, MAX_PAPER_SURFACE_STEPS);
  assertNumber(recipe.keyboard.stepUptakeGain, "surfaceRecipe.keyboard.stepUptakeGain", 0, MAX_PAPER_SURFACE_STEPS);
  assertNumber(recipe.keyboard.stepMilliseconds, "surfaceRecipe.keyboard.stepMilliseconds", 0.001, 1000);
  assertNumber(recipe.keyboard.normalizationScale, "surfaceRecipe.keyboard.normalizationScale", 0.001, 10);
  assertInteger(
    recipe.keyboard.normalizationReferenceAlpha,
    "surfaceRecipe.keyboard.normalizationReferenceAlpha",
    1,
    255,
  );
  assertNumber(recipe.keyboard.coverageMixExponent, "surfaceRecipe.keyboard.coverageMixExponent", 0.001, 10);
  assertNumber(recipe.keyboard.contactRetentionFloor, "surfaceRecipe.keyboard.contactRetentionFloor");
  if (recipe.keyboard.stepBase + recipe.keyboard.stepUptakeGain > MAX_PAPER_SURFACE_STEPS) {
    throw new TypeError(`surfaceRecipe keyboard step budget exceeds ${MAX_PAPER_SURFACE_STEPS}.`);
  }
  return true;
}

export function freezeSurfaceRecipe(recipe) {
  validateSurfaceRecipe(recipe);
  return deepFreeze(recipe);
}

export function serializeSurfaceRecipe(recipe) {
  validateSurfaceRecipe(recipe);
  return JSON.stringify(canonicalValue(recipe));
}

export function parseSurfaceRecipe(serialized) {
  if (typeof serialized !== "string") {
    throw new TypeError("serialized surface recipe must be a string.");
  }
  return freezeSurfaceRecipe(JSON.parse(serialized));
}
