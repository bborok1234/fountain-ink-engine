const AXIS_KEYS_R1 = Object.freeze([
  "verticalUptake",
  "lateralMobility",
  "dyeAffinity",
  "surfaceRetention",
  "filmPreservation",
  "roughness",
  "particleCatch",
  "paperReflectance",
]);

const AXIS_KEYS_R2 = Object.freeze([
  "depthUptake",
  "lateralMobility",
  "dyeAffinity",
  "surfaceRetention",
  "filmPreservation",
  "roughness",
  "particleCatch",
  "paperReflectance",
]);

const KEYBOARD_KEYS_R1 = Object.freeze([
  "stepBase",
  "stepUptakeGain",
  "stepMilliseconds",
  "normalizationScale",
  "normalizationReferenceAlpha",
  "coverageMixExponent",
  "contactRetentionFloor",
]);

const KEYBOARD_KEYS_R2 = Object.freeze([
  "stepBase",
  "stepMobilityGain",
  "stepMilliseconds",
  "normalizationScale",
  "normalizationReferenceAlpha",
  "coverageMixExponent",
  "contactRetentionFloor",
]);

const KEYBOARD_KEYS_R3 = Object.freeze([
  ...KEYBOARD_KEYS_R2,
  "fiberEdgeReachCssPixels",
  "fiberEdgeOccupancy",
  "fiberEdgeStrength",
]);

export const SUPPORTED_SURFACE_RECIPE_SCHEMA_VERSIONS = Object.freeze([1, 2, 3]);

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
  assertInteger(
    recipe.surfaceRecipeSchemaVersion,
    "surfaceRecipe.surfaceRecipeSchemaVersion",
    1,
    3,
  );

  if (!SUPPORTED_SURFACE_RECIPE_SCHEMA_VERSIONS.includes(
    recipe.surfaceRecipeSchemaVersion,
  )) {
    throw new TypeError(
      `Unsupported surfaceRecipeSchemaVersion: ${recipe.surfaceRecipeSchemaVersion}.`,
    );
  }

  const axisKeys = recipe.surfaceRecipeSchemaVersion === 1
    ? AXIS_KEYS_R1
    : AXIS_KEYS_R2;
  const keyboardKeys = recipe.surfaceRecipeSchemaVersion === 1
    ? KEYBOARD_KEYS_R1
    : recipe.surfaceRecipeSchemaVersion === 2
      ? KEYBOARD_KEYS_R2
      : KEYBOARD_KEYS_R3;

  assertRecord(recipe.axes, "surfaceRecipe.axes");
  assertExactKeys(recipe.axes, axisKeys, "surfaceRecipe.axes");
  for (const key of axisKeys) {
    assertNumber(recipe.axes[key], `surfaceRecipe.axes.${key}`);
  }

  assertRecord(recipe.keyboard, "surfaceRecipe.keyboard");
  assertExactKeys(recipe.keyboard, keyboardKeys, "surfaceRecipe.keyboard");
  assertInteger(recipe.keyboard.stepBase, "surfaceRecipe.keyboard.stepBase", 0, MAX_PAPER_SURFACE_STEPS);
  const stepGainKey = recipe.surfaceRecipeSchemaVersion === 1
    ? "stepUptakeGain"
    : "stepMobilityGain";
  assertNumber(
    recipe.keyboard[stepGainKey],
    `surfaceRecipe.keyboard.${stepGainKey}`,
    0,
    MAX_PAPER_SURFACE_STEPS,
  );
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
  if (recipe.surfaceRecipeSchemaVersion >= 3) {
    assertNumber(
      recipe.keyboard.fiberEdgeReachCssPixels,
      "surfaceRecipe.keyboard.fiberEdgeReachCssPixels",
      0.25,
      4,
    );
    assertNumber(
      recipe.keyboard.fiberEdgeOccupancy,
      "surfaceRecipe.keyboard.fiberEdgeOccupancy",
    );
    assertNumber(
      recipe.keyboard.fiberEdgeStrength,
      "surfaceRecipe.keyboard.fiberEdgeStrength",
    );
  }
  if (
    recipe.keyboard.stepBase + recipe.keyboard[stepGainKey]
    > MAX_PAPER_SURFACE_STEPS
  ) {
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
