export const dyeComponentModelVersion = "dye-component-js-r13";
export const dyeComponentRecipeSchemaVersion = 12;
export const dyeComponentStateModelVersion =
  "two-dye-total-residual-v2";
export const SUPPORTED_DYE_COMPONENT_RECIPE_SCHEMA_VERSIONS = Object.freeze([
  1,
  2,
  3,
  4,
  5,
  6,
  7,
  8,
  9,
  10,
  11,
  12,
]);

const RECIPE_KEYS_V1 = Object.freeze([
  "id",
  "revision",
  "componentModelVersion",
  "componentRecipeSchemaVersion",
  "massFraction",
  "mobilityMultiplier",
  "retentionMultiplier",
]);
const RECIPE_KEYS_V2 = Object.freeze([
  ...RECIPE_KEYS_V1,
  "edgeEnrichmentThreshold",
  "edgeMassGain",
]);
const RECIPE_KEYS_V3 = Object.freeze([
  ...RECIPE_KEYS_V2,
  "edgeRed",
  "edgeGreen",
  "edgeBlue",
  "edgeMixGain",
  "edgeMixMaximum",
]);
const RECIPE_KEYS_V4 = Object.freeze([
  ...RECIPE_KEYS_V3,
  "edgeZoneRadius",
  "edgeZoneMinimumStrength",
  "edgeZonePeakThreshold",
]);
const RECIPE_KEYS_V5 = Object.freeze([
  ...RECIPE_KEYS_V4,
  "baseLowRed",
  "baseLowGreen",
  "baseLowBlue",
  "baseMidRed",
  "baseMidGreen",
  "baseMidBlue",
  "baseHighRed",
  "baseHighGreen",
  "baseHighBlue",
  "baseMix",
]);
const RECIPE_KEYS_V6 = Object.freeze([
  ...RECIPE_KEYS_V5,
  "edgeBandCssPixels",
]);
// Schema 7 deliberately retires the r5 seed/radius zone and the r7 fixed
// Contact band. It keeps transport, secondary-color mixing, and the component
// base curve while Surface authors one continuous secondary-color field.
const RECIPE_KEYS_V7 = Object.freeze([
  ...RECIPE_KEYS_V3,
  "baseLowRed",
  "baseLowGreen",
  "baseLowBlue",
  "baseMidRed",
  "baseMidGreen",
  "baseMidBlue",
  "baseHighRed",
  "baseHighGreen",
  "baseHighBlue",
  "baseMix",
]);
// Schema 8 keeps the A3 Surface field and Optical palette byte-for-byte while
// adding a concentration-dependent paper/dye retardation hypothesis to the
// transported component only.
const RECIPE_KEYS_V8 = Object.freeze([
  ...RECIPE_KEYS_V7,
  "paperAffinityMultiplier",
  "retardationHalfSaturation",
  "retardationMaximum",
]);
// Schema 9 preserves the A4 transport and base palette but replaces the
// threshold/gain/cap recolor with a mass-ratio optical mixture.
const RECIPE_KEYS_V9 = Object.freeze([
  ...RECIPE_KEYS_V1,
  "paperAffinityMultiplier",
  "retardationHalfSaturation",
  "retardationMaximum",
  "baseLowRed",
  "baseLowGreen",
  "baseLowBlue",
  "baseMidRed",
  "baseMidGreen",
  "baseMidBlue",
  "baseHighRed",
  "baseHighGreen",
  "baseHighBlue",
  "baseMix",
  "secondaryRed",
  "secondaryGreen",
  "secondaryBlue",
  "componentMassVisibilityScale",
  "secondaryRelativeAbsorptivity",
]);
// Schema 10 preserves R10 transport and RGB endpoints while removing the A5
// visibility and absorptivity controls. Optical uses the transported visible
// mass ratio directly as the endpoint mixture weight.
const RECIPE_KEYS_V10 = Object.freeze([
  ...RECIPE_KEYS_V1,
  "paperAffinityMultiplier",
  "retardationHalfSaturation",
  "retardationMaximum",
  "baseLowRed",
  "baseLowGreen",
  "baseLowBlue",
  "baseMidRed",
  "baseMidGreen",
  "baseMidBlue",
  "baseHighRed",
  "baseHighGreen",
  "baseHighBlue",
  "baseMix",
  "secondaryRed",
  "secondaryGreen",
  "secondaryBlue",
]);
// Schema 11 starts the A7 neutral two-dye mass family. It deliberately removes
// every A6 transport coefficient: the only component composition input is the
// initial secondary fraction. A7-1 transports no species laterally and cannot
// create separation by tuning mobility, retention, or retardation.
const RECIPE_KEYS_V11 = Object.freeze([
  "id",
  "revision",
  "componentModelVersion",
  "componentRecipeSchemaVersion",
  "initialSecondaryFraction",
  "baseLowRed",
  "baseLowGreen",
  "baseLowBlue",
  "baseMidRed",
  "baseMidGreen",
  "baseMidBlue",
  "baseHighRed",
  "baseHighGreen",
  "baseHighBlue",
  "baseMix",
  "secondaryRed",
  "secondaryGreen",
  "secondaryBlue",
]);
// Schema 12 adds only A7-2 transport coefficients. They are dimensionless
// fixed-step pilot mappings, not SI-calibrated constants. In particular there
// is no finite adsorption capacity, concentration threshold, RGB gain, edge
// mask, coffee-ring term, or paper-owned water control in this schema.
const RECIPE_KEYS_V12 = Object.freeze([
  ...RECIPE_KEYS_V11,
  "primaryDiffusivity",
  "secondaryDiffusivity",
  "primaryAdsorptionRate",
  "secondaryAdsorptionRate",
  "primaryDesorptionRate",
  "secondaryDesorptionRate",
]);

function keysForSchema(schema) {
  return schema === 1
    ? RECIPE_KEYS_V1
    : schema === 2
      ? RECIPE_KEYS_V2
      : schema === 3
        ? RECIPE_KEYS_V3
        : schema === 4
          ? RECIPE_KEYS_V4
          : schema === 5
            ? RECIPE_KEYS_V5
            : schema === 6
              ? RECIPE_KEYS_V6
              : schema === 7
                ? RECIPE_KEYS_V7
                : schema === 8
                  ? RECIPE_KEYS_V8
                  : schema === 9
                    ? RECIPE_KEYS_V9
                    : schema === 10
                      ? RECIPE_KEYS_V10
                      : schema === 11
                        ? RECIPE_KEYS_V11
                        : RECIPE_KEYS_V12;
}

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
  const schemaDescriptor = Object.getOwnPropertyDescriptor(
    recipe,
    "componentRecipeSchemaVersion",
  );
  if (!schemaDescriptor?.enumerable || !("value" in schemaDescriptor)) {
    throw new TypeError(
      "dyeComponentRecipe.componentRecipeSchemaVersion must be an enumerable own data property.",
    );
  }
  const schema = schemaDescriptor.value;
  if (!SUPPORTED_DYE_COMPONENT_RECIPE_SCHEMA_VERSIONS.includes(schema)) {
    throw new TypeError(
      `dyeComponentRecipe.componentRecipeSchemaVersion ${String(schema)} is not supported.`,
    );
  }
  const recipeKeys = keysForSchema(schema);
  assertExactDataProperties(recipe, recipeKeys, "dyeComponentRecipe");
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
  if (schema <= 10) {
    assertNumber(recipe.massFraction, "dyeComponentRecipe.massFraction", 0, 1);
    assertNumber(
      recipe.mobilityMultiplier,
      "dyeComponentRecipe.mobilityMultiplier",
      0,
      2,
    );
  } else {
    assertNumber(
      recipe.initialSecondaryFraction,
      "dyeComponentRecipe.initialSecondaryFraction",
      0,
      1,
    );
  }
  if (schema === 12) {
    for (const key of [
      "primaryDiffusivity",
      "secondaryDiffusivity",
      "primaryAdsorptionRate",
      "secondaryAdsorptionRate",
      "primaryDesorptionRate",
      "secondaryDesorptionRate",
    ]) {
      assertNumber(recipe[key], `dyeComponentRecipe.${key}`, 0, 1);
    }
  }
  if (schema >= 2 && schema <= 8) {
    assertNumber(
      recipe.edgeEnrichmentThreshold,
      "dyeComponentRecipe.edgeEnrichmentThreshold",
      0,
      1,
    );
    assertNumber(
      recipe.edgeMassGain,
      "dyeComponentRecipe.edgeMassGain",
      0.001,
      200,
    );
  }
  if (schema >= 3 && schema <= 8) {
    for (const channel of ["edgeRed", "edgeGreen", "edgeBlue"]) {
      if (
        !Number.isInteger(recipe[channel])
        || recipe[channel] < 0
        || recipe[channel] > 255
      ) {
        throw new TypeError(
          `dyeComponentRecipe.${channel} must be an integer in 0...255.`,
        );
      }
    }
    assertNumber(
      recipe.edgeMixGain,
      "dyeComponentRecipe.edgeMixGain",
      0.001,
      20,
    );
    assertNumber(
      recipe.edgeMixMaximum,
      "dyeComponentRecipe.edgeMixMaximum",
      0,
      1,
    );
  }
  if (schema >= 4 && schema <= 6) {
    if (
      !Number.isSafeInteger(recipe.edgeZoneRadius)
      || recipe.edgeZoneRadius < 1
      || recipe.edgeZoneRadius > 4
    ) {
      throw new TypeError(
        "dyeComponentRecipe.edgeZoneRadius must be an integer in 1...4.",
      );
    }
    assertNumber(
      recipe.edgeZoneMinimumStrength,
      "dyeComponentRecipe.edgeZoneMinimumStrength",
      0,
      1,
    );
    assertNumber(
      recipe.edgeZonePeakThreshold,
      "dyeComponentRecipe.edgeZonePeakThreshold",
      0,
      1,
    );
  }
  if (schema >= 5) {
    for (const channel of [
      "baseLowRed",
      "baseLowGreen",
      "baseLowBlue",
      "baseMidRed",
      "baseMidGreen",
      "baseMidBlue",
      "baseHighRed",
      "baseHighGreen",
      "baseHighBlue",
    ]) {
      if (
        !Number.isInteger(recipe[channel])
        || recipe[channel] < 0
        || recipe[channel] > 255
      ) {
        throw new TypeError(
          `dyeComponentRecipe.${channel} must be an integer in 0...255.`,
        );
      }
    }
    assertNumber(recipe.baseMix, "dyeComponentRecipe.baseMix", 0, 1);
  }
  if (schema === 6) {
    assertNumber(
      recipe.edgeBandCssPixels,
      "dyeComponentRecipe.edgeBandCssPixels",
      0.25,
      3,
    );
  }
  if (schema >= 8 && schema <= 10) {
    assertNumber(
      recipe.paperAffinityMultiplier,
      "dyeComponentRecipe.paperAffinityMultiplier",
      0,
      4,
    );
    assertNumber(
      recipe.retardationHalfSaturation,
      "dyeComponentRecipe.retardationHalfSaturation",
      0.001,
      1,
    );
    assertNumber(
      recipe.retardationMaximum,
      "dyeComponentRecipe.retardationMaximum",
      0,
      0.95,
    );
  }
  if (schema >= 9) {
    for (const channel of ["secondaryRed", "secondaryGreen", "secondaryBlue"]) {
      if (
        !Number.isInteger(recipe[channel])
        || recipe[channel] < 0
        || recipe[channel] > 255
      ) {
        throw new TypeError(
          `dyeComponentRecipe.${channel} must be an integer in 0...255.`,
        );
      }
    }
    if (schema === 9) {
      assertNumber(
        recipe.componentMassVisibilityScale,
        "dyeComponentRecipe.componentMassVisibilityScale",
        0.001,
        200,
      );
      assertNumber(
        recipe.secondaryRelativeAbsorptivity,
        "dyeComponentRecipe.secondaryRelativeAbsorptivity",
        0,
        8,
      );
    }
  }
  if (schema <= 10) {
    assertNumber(
      recipe.retentionMultiplier,
      "dyeComponentRecipe.retentionMultiplier",
      0,
      2,
    );
  }
  return true;
}

export function serializeDyeComponentRecipe(recipe) {
  validateDyeComponentRecipe(recipe);
  const recipeKeys = keysForSchema(recipe.componentRecipeSchemaVersion);
  return JSON.stringify(Object.fromEntries(
    [...recipeKeys].sort().map((key) => [key, recipe[key]]),
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
