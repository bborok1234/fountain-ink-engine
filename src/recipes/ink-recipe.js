export const SUPPORTED_RECIPE_SCHEMA_VERSIONS = Object.freeze([2, 3, 4, 5, 6]);
export const MAX_KEYBOARD_SURFACE_STEPS = 64;

const KEYBOARD_SURFACE_KEYS_BY_SCHEMA = Object.freeze({
  2: Object.freeze([
    "waterLoad",
    "pigmentLoad",
    "stepBase",
    "stepAbsorptionGain",
    "stepMilliseconds",
    "normalizationScale",
    "coverageMixExponent",
  ]),
  3: Object.freeze([
    "waterLoad",
    "pigmentLoad",
    "stepBase",
    "stepAbsorptionGain",
    "stepMilliseconds",
    "normalizationScale",
    "normalizationReferenceAlpha",
    "coverageMixExponent",
  ]),
  4: Object.freeze([
    "waterLoad",
    "pigmentLoad",
    "stepBase",
    "stepAbsorptionGain",
    "stepMilliseconds",
    "normalizationScale",
    "normalizationReferenceAlpha",
    "coverageMixExponent",
    "minimumContactRetention",
  ]),
  5: Object.freeze([
    "waterLoad",
    "pigmentLoad",
    "stepBase",
    "stepAbsorptionGain",
    "stepMilliseconds",
    "normalizationScale",
    "normalizationReferenceAlpha",
    "coverageMixExponent",
    "minimumContactRetention",
  ]),
});

const isRecord = (value) => {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

function assertRecord(value, path) {
  if (!isRecord(value)) throw new TypeError(`${path} must be an object.`);
}

function assertExactKeys(value, expectedKeys, path) {
  const expected = new Set(expectedKeys);
  const actual = Reflect.ownKeys(value);
  const invalid = actual.filter((key) =>
    typeof key !== "string" || !expected.has(key));
  const missing = expectedKeys.filter((key) => !Object.hasOwn(value, key));
  if (invalid.length > 0 || missing.length > 0) {
    throw new TypeError(
      `${path} has invalid keys; unexpected=${invalid.map(String).join(",") || "none"}; missing=${missing.join(",") || "none"}.`,
    );
  }
  for (const key of expectedKeys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor?.enumerable || !("value" in descriptor)) {
      throw new TypeError(
        `${path}.${key} must be an enumerable own data property.`,
      );
    }
  }
}

function assertNumber(value, path, minimum = -Infinity, maximum = Infinity) {
  if (!Number.isFinite(value) || value < minimum || value > maximum) {
    throw new TypeError(`${path} must be a finite number in ${minimum}...${maximum}.`);
  }
}

function assertInteger(value, path, minimum, maximum) {
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new TypeError(`${path} must be an integer in ${minimum}...${maximum}.`);
  }
}

function assertNonEmptyString(value, path) {
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
  if (Array.isArray(value)) return value.map(canonicalValue);
  if (!isRecord(value)) return value;
  return Object.fromEntries(
    Object.keys(value).sort().map((key) => [key, canonicalValue(value[key])]),
  );
}

/**
 * Validate the recipe shapes used by ink recipe schemas v2 through v6.
 * Runtime nib, flow, Surface recipe, layout, and seeds intentionally live outside.
 *
 * @param {Record<string, unknown>} recipe
 * @returns {true}
 */
export function validateInkRecipe(recipe) {
  assertRecord(recipe, "recipe");
  const schemaDescriptor = Object.getOwnPropertyDescriptor(
    recipe,
    "recipeSchemaVersion",
  );
  if (!schemaDescriptor?.enumerable || !("value" in schemaDescriptor)) {
    throw new TypeError(
      "recipe.recipeSchemaVersion must be an enumerable own data property.",
    );
  }
  const schema = schemaDescriptor.value;
  const rootKeys = schema >= 6
    ? [
      "id", "revision", "engineModelVersion", "recipeSchemaVersion",
      "contact", "density", "keyboardDeposit", "direct", "optical",
    ]
    : [
      "id", "revision", "engineModelVersion", "recipeSchemaVersion",
      "contact", "density", "surface", "optical",
    ];
  assertExactKeys(recipe, rootKeys, "recipe");
  assertNonEmptyString(recipe.id, "recipe.id");
  assertInteger(recipe.revision, "recipe.revision", 1, Number.MAX_SAFE_INTEGER);
  assertNonEmptyString(
    recipe.engineModelVersion,
    "recipe.engineModelVersion",
  );
  if (!SUPPORTED_RECIPE_SCHEMA_VERSIONS.includes(recipe.recipeSchemaVersion)) {
    throw new TypeError(
      `recipe.recipeSchemaVersion ${String(recipe.recipeSchemaVersion)} is not structurally supported.`,
    );
  }

  assertRecord(recipe.contact, "recipe.contact");
  assertExactKeys(recipe.contact, ["catalogId"], "recipe.contact");
  assertNonEmptyString(recipe.contact.catalogId, "recipe.contact.catalogId");
  if (recipe.contact.catalogId !== "standard-nib-ladder-r1") {
    throw new TypeError(
      "recipe.contact.catalogId must be standard-nib-ladder-r1.",
    );
  }

  assertRecord(recipe.density, "recipe.density");
  assertExactKeys(
    recipe.density,
    recipe.recipeSchemaVersion >= 6
      ? ["meanMinimum", "meanMaximum", "meanBase", "flowGain", "rangeMaximum"]
      : [
        "meanMinimum", "meanMaximum", "meanBase", "flowGain",
        "absorptionLoss", "rangeMinimum", "rangeSmoothGain", "rangeMaximum",
      ],
    "recipe.density",
  );
  assertNumber(recipe.density.meanMinimum, "recipe.density.meanMinimum", 0, 1);
  assertNumber(recipe.density.meanMaximum, "recipe.density.meanMaximum", 0, 1);
  if (recipe.density.meanMinimum > recipe.density.meanMaximum) {
    throw new TypeError("recipe.density mean bounds are reversed.");
  }
  assertNumber(recipe.density.meanBase, "recipe.density.meanBase", 0, 1);
  assertNumber(recipe.density.flowGain, "recipe.density.flowGain", 0, 2);
  if (recipe.recipeSchemaVersion < 6) {
    assertNumber(recipe.density.absorptionLoss, "recipe.density.absorptionLoss", 0, 1);
    assertNumber(recipe.density.rangeMinimum, "recipe.density.rangeMinimum", 0, 2);
    assertNumber(recipe.density.rangeSmoothGain, "recipe.density.rangeSmoothGain", 0, 2);
  }
  assertNumber(recipe.density.rangeMaximum, "recipe.density.rangeMaximum", 0, 2);
  if (
    recipe.recipeSchemaVersion < 6
    && recipe.density.rangeMinimum > recipe.density.rangeMaximum
  ) {
    throw new TypeError("recipe.density range bounds are reversed.");
  }

  let direct;
  if (recipe.recipeSchemaVersion < 6) {
    assertRecord(recipe.surface, "recipe.surface");
    assertExactKeys(recipe.surface, ["keyboard", "direct"], "recipe.surface");
    assertRecord(recipe.surface.keyboard, "recipe.surface.keyboard");
    assertExactKeys(
      recipe.surface.keyboard,
      KEYBOARD_SURFACE_KEYS_BY_SCHEMA[recipe.recipeSchemaVersion],
      "recipe.surface.keyboard",
    );
    assertNumber(recipe.surface.keyboard.waterLoad, "recipe.surface.keyboard.waterLoad", 0, 2);
    assertNumber(recipe.surface.keyboard.pigmentLoad, "recipe.surface.keyboard.pigmentLoad", 0, 2);
    assertInteger(recipe.surface.keyboard.stepBase, "recipe.surface.keyboard.stepBase", 0, 1000);
    assertNumber(recipe.surface.keyboard.stepAbsorptionGain, "recipe.surface.keyboard.stepAbsorptionGain", 0, 1000);
    assertNumber(recipe.surface.keyboard.stepMilliseconds, "recipe.surface.keyboard.stepMilliseconds", 0.001, 1000);
    assertNumber(recipe.surface.keyboard.normalizationScale, "recipe.surface.keyboard.normalizationScale", 0.001, 10);
    if (recipe.recipeSchemaVersion >= 3) {
      assertInteger(
        recipe.surface.keyboard.normalizationReferenceAlpha,
        "recipe.surface.keyboard.normalizationReferenceAlpha",
        1,
        255,
      );
    }
    assertNumber(recipe.surface.keyboard.coverageMixExponent, "recipe.surface.keyboard.coverageMixExponent", 0.001, 10);
    if (recipe.recipeSchemaVersion >= 4) {
      assertNumber(
        recipe.surface.keyboard.minimumContactRetention,
        "recipe.surface.keyboard.minimumContactRetention",
        0,
        1,
      );
    }
    if (
      recipe.surface.keyboard.stepBase
        + recipe.surface.keyboard.stepAbsorptionGain
      > MAX_KEYBOARD_SURFACE_STEPS
    ) {
      throw new TypeError(
        `recipe.surface.keyboard step budget exceeds ${MAX_KEYBOARD_SURFACE_STEPS}.`,
      );
    }
    direct = recipe.surface.direct;
  } else {
    assertRecord(recipe.keyboardDeposit, "recipe.keyboardDeposit");
    assertExactKeys(
      recipe.keyboardDeposit,
      ["waterLoad", "pigmentLoad"],
      "recipe.keyboardDeposit",
    );
    assertNumber(recipe.keyboardDeposit.waterLoad, "recipe.keyboardDeposit.waterLoad", 0, 2);
    assertNumber(recipe.keyboardDeposit.pigmentLoad, "recipe.keyboardDeposit.pigmentLoad", 0, 2);
    direct = recipe.direct;
  }

  assertRecord(direct, "recipe.direct");
  assertExactKeys(direct, [
    "waterBase",
    "waterFlowGain",
    "pigmentBase",
    "pigmentFlowGain",
    "optical",
  ], "recipe.direct");
  for (const name of ["waterBase", "waterFlowGain", "pigmentBase", "pigmentFlowGain"]) {
    assertNumber(direct[name], `recipe.direct.${name}`, 0, 2);
  }
  assertRecord(direct.optical, "recipe.direct.optical");
  const directOptical = direct.optical;
  const directOpticalKeys = [
    "fixedWeight", "mobileWeight", "pigmentMaximum", "densityExponent",
    "wetLift", "redBase", "redWetGain", "greenBase", "greenWetGain",
    "greenDensityLoss", "blueBase", "blueWetGain", "blueDensityLoss",
    "alphaGain", "maximumAlpha",
  ];
  assertExactKeys(
    directOptical,
    directOpticalKeys,
    "recipe.direct.optical",
  );
  for (const name of directOpticalKeys) {
    assertNumber(directOptical[name], `recipe.direct.optical.${name}`, 0, 255);
  }
  assertNumber(directOptical.maximumAlpha, "recipe.direct.optical.maximumAlpha", 0, 1);

  assertRecord(recipe.optical, "recipe.optical");
  if (recipe.recipeSchemaVersion < 5) {
    assertExactKeys(
      recipe.optical,
      ["rgb", "minimumAlpha", "maximumAlpha"],
      "recipe.optical",
    );
    assertRgb(recipe.optical.rgb, "recipe.optical.rgb");
  } else {
    assertExactKeys(
      recipe.optical,
      ["densityColorCurve", "minimumAlpha", "maximumAlpha"],
      "recipe.optical",
    );
    assertDensityColorCurve(recipe.optical.densityColorCurve);
  }
  assertNumber(recipe.optical.minimumAlpha, "recipe.optical.minimumAlpha", 0, 1);
  assertNumber(recipe.optical.maximumAlpha, "recipe.optical.maximumAlpha", 0, 1);
  if (recipe.optical.minimumAlpha > recipe.optical.maximumAlpha) {
    throw new TypeError("recipe.optical alpha bounds are reversed.");
  }
  return true;
}

function assertRgb(value, path) {
  assertRecord(value, path);
  assertExactKeys(value, ["red", "green", "blue"], path);
  for (const channel of ["red", "green", "blue"]) {
    assertInteger(value[channel], `${path}.${channel}`, 0, 255);
  }
}

function assertDensityColorCurve(value) {
  const path = "recipe.optical.densityColorCurve";
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) {
    throw new TypeError(`${path} must be a plain array.`);
  }
  if (value.length < 3 || value.length > 5) {
    throw new TypeError(`${path} must contain 3...5 points.`);
  }
  const expectedKeys = new Set([
    ...Array.from({ length: value.length }, (_, index) => String(index)),
    "length",
  ]);
  const actualKeys = Reflect.ownKeys(value);
  if (
    actualKeys.length !== expectedKeys.size
    || actualKeys.some((key) => typeof key !== "string" || !expectedKeys.has(key))
  ) {
    throw new TypeError(`${path} must be a dense array without extra keys.`);
  }
  let previousDensity = -Infinity;
  value.forEach((point, index) => {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (!descriptor?.enumerable || !("value" in descriptor)) {
      throw new TypeError(`${path}[${index}] must be an enumerable data property.`);
    }
    assertRecord(point, `${path}[${index}]`);
    assertExactKeys(point, ["density", "rgb"], `${path}[${index}]`);
    assertNumber(point.density, `${path}[${index}].density`, 0, 1);
    if (point.density <= previousDensity) {
      throw new TypeError(`${path} density points must be strictly increasing.`);
    }
    previousDensity = point.density;
    assertRgb(point.rgb, `${path}[${index}].rgb`);
  });
  if (value[0].density !== 0 || value[value.length - 1].density !== 1) {
    throw new TypeError(`${path} must begin at 0 and end at 1.`);
  }
}

/** @param {Record<string, unknown>} recipe */
export function freezeInkRecipe(recipe) {
  validateInkRecipe(recipe);
  return deepFreeze(recipe);
}

/** @param {Record<string, unknown>} recipe */
export function serializeInkRecipe(recipe) {
  validateInkRecipe(recipe);
  return JSON.stringify(canonicalValue(recipe));
}

/** @param {string} serialized */
export function parseInkRecipe(serialized) {
  if (typeof serialized !== "string") {
    throw new TypeError("serialized recipe must be a string.");
  }
  return freezeInkRecipe(JSON.parse(serialized));
}
