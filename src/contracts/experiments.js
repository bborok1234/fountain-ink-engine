import {
  engineModelVersion,
  fixtureManifestVersion,
  recipeSchemaVersion,
} from "./versions.js";
import {
  freezeInkRecipe,
  validateInkRecipe,
} from "../recipes/ink-recipe.js";
import { assertRegisteredInkRecipeIdentity } from "../recipes/compatibility.js";
import { assertUint32 } from "./numeric.js";

export const EXPERIMENT_STATUSES = Object.freeze([
  "backlog",
  "running",
  "passed",
  "learned",
  "abandoned",
]);

const EXPERIMENT_RECORD_KEYS = Object.freeze([
  "id",
  "attempt",
  "parentExperimentId",
  "engineModelVersion",
  "recipeSchemaVersion",
  "fixtureManifestVersion",
  "status",
  "hypothesis",
  "seed",
  "recipe",
  "expected",
  "observed",
  "lesson",
  "nextMethod",
  "recordedAt",
]);

const SUPPORTED_EXPERIMENT_RECIPE_SCHEMA_VERSIONS = Object.freeze([1, 2, 3, 4]);
const SUPPORTED_FIXTURE_MANIFEST_VERSIONS = Object.freeze([1]);

function isRecord(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function assertExperimentRecordShape(record) {
  const expected = new Set(EXPERIMENT_RECORD_KEYS);
  const actual = Reflect.ownKeys(record);
  const invalid = actual.filter((key) =>
    typeof key !== "string" || !expected.has(key));
  const missing = EXPERIMENT_RECORD_KEYS.filter((key) =>
    !Object.hasOwn(record, key));
  if (invalid.length > 0 || missing.length > 0) {
    throw new TypeError(
      `Experiment record has invalid keys; unexpected=${invalid.map(String).join(",") || "none"}; missing=${missing.join(",") || "none"}.`,
    );
  }
  for (const key of EXPERIMENT_RECORD_KEYS) {
    const descriptor = Object.getOwnPropertyDescriptor(record, key);
    if (!descriptor?.enumerable || !("value" in descriptor)) {
      throw new TypeError(
        `Experiment record.${key} must be an enumerable own data property.`,
      );
    }
  }
}

function assertJsonValue(value, path = "record") {
  if (
    value === null
    || typeof value === "string"
    || typeof value === "boolean"
    || (typeof value === "number" && Number.isFinite(value))
  ) {
    return;
  }
  if (Array.isArray(value)) {
    if (Object.getPrototypeOf(value) !== Array.prototype) {
      throw new TypeError(`${path} must be a plain array.`);
    }
    const ownKeys = Reflect.ownKeys(value);
    const expectedKeys = new Set([
      ...Array.from({ length: value.length }, (_, index) => String(index)),
      "length",
    ]);
    if (
      ownKeys.some((key) => typeof key !== "string" || !expectedKeys.has(key))
      || ownKeys.length !== expectedKeys.size
    ) {
      throw new TypeError(`${path} must be a dense JSON array without extra keys.`);
    }
    for (let index = 0; index < value.length; index += 1) {
      const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
      if (!descriptor?.enumerable || !("value" in descriptor)) {
        throw new TypeError(`${path}[${index}] must be an enumerable data property.`);
      }
      assertJsonValue(descriptor.value, `${path}[${index}]`);
    }
    return;
  }
  if (isRecord(value)) {
    for (const key of Reflect.ownKeys(value)) {
      if (typeof key !== "string") {
        throw new TypeError(`${path} must not contain symbol keys.`);
      }
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor?.enumerable || !("value" in descriptor)) {
        throw new TypeError(`${path}.${key} must be an enumerable data property.`);
      }
      if (descriptor.value === undefined) {
        throw new TypeError(`${path}.${key} must not be undefined.`);
      }
      assertJsonValue(descriptor.value, `${path}.${key}`);
    }
    return;
  }
  throw new TypeError(`${path} must contain only finite JSON values.`);
}

function deepFreeze(value) {
  if (!value || typeof value !== "object") return value;
  Object.values(value).forEach(deepFreeze);
  return Object.isFrozen(value) ? value : Object.freeze(value);
}

/**
 * Validate a serializable experiment record without inventing time or seed.
 *
 * @param {Record<string, unknown>} record
 * @returns {true}
 */
export function validateExperimentRecord(record) {
  if (!isRecord(record)) throw new TypeError("Experiment record must be an object.");
  assertExperimentRecordShape(record);
  if (typeof record.id !== "string" || record.id.trim() === "") {
    throw new TypeError("Experiment record requires a non-empty id.");
  }
  if (typeof record.attempt !== "string" || record.attempt.trim() === "") {
    throw new TypeError("Experiment record requires a non-empty attempt.");
  }
  if (!EXPERIMENT_STATUSES.includes(String(record.status))) {
    throw new TypeError(`Unknown experiment status: ${String(record.status)}`);
  }
  if (typeof record.hypothesis !== "string" || record.hypothesis.trim() === "") {
    throw new TypeError("Experiment record requires a hypothesis.");
  }
  if (
    typeof record.engineModelVersion !== "string"
    || record.engineModelVersion.trim() === ""
  ) {
    throw new TypeError("Experiment record requires engineModelVersion.");
  }
  if (!Number.isInteger(record.recipeSchemaVersion)) {
    throw new TypeError("Experiment record requires recipeSchemaVersion.");
  }
  if (!SUPPORTED_EXPERIMENT_RECIPE_SCHEMA_VERSIONS.includes(
    record.recipeSchemaVersion,
  )) {
    throw new TypeError(
      `Unsupported experiment recipeSchemaVersion: ${record.recipeSchemaVersion}.`,
    );
  }
  if (!Number.isInteger(record.fixtureManifestVersion)) {
    throw new TypeError("Experiment record requires fixtureManifestVersion.");
  }
  if (!SUPPORTED_FIXTURE_MANIFEST_VERSIONS.includes(
    record.fixtureManifestVersion,
  )) {
    throw new TypeError(
      `Unsupported fixtureManifestVersion: ${record.fixtureManifestVersion}.`,
    );
  }
  if (record.recipeSchemaVersion === 1) {
    if (!Number.isInteger(record.seed) || record.seed < 0) {
      throw new TypeError(
        "Legacy experiment seed must be a non-negative integer.",
      );
    }
    if (!isRecord(record.recipe)) {
      throw new TypeError("Legacy experiment recipe must be a plain object.");
    }
    assertJsonValue(record.recipe, "record.recipe");
  } else {
    assertUint32(record.seed, "Experiment seed");
    validateInkRecipe(record.recipe);
    assertRegisteredInkRecipeIdentity(record.recipe);
    if (record.engineModelVersion !== record.recipe.engineModelVersion) {
      throw new TypeError("Experiment engineModelVersion must match its recipe.");
    }
    if (record.recipeSchemaVersion !== record.recipe.recipeSchemaVersion) {
      throw new TypeError("Experiment recipeSchemaVersion must match its recipe.");
    }
  }
  assertJsonValue(record);
  return true;
}

/**
 * Create an immutable, JSON-safe experiment record. The caller supplies any
 * human time label explicitly so replay never depends on the wall clock.
 *
 * @param {Record<string, unknown>} input
 * @returns {Readonly<Record<string, unknown>>}
 */
export function createExperimentRecord(input) {
  const requestedRecipeSchemaVersion = input.recipeSchemaVersion
    ?? input.recipe?.recipeSchemaVersion
    ?? recipeSchemaVersion;
  let recipe;
  if (requestedRecipeSchemaVersion === 1) {
    if (!isRecord(input.recipe)) {
      throw new TypeError("Legacy experiment recipe must be a plain object.");
    }
    assertJsonValue(input.recipe, "record.recipe");
    recipe = deepFreeze(input.recipe);
  } else if (SUPPORTED_EXPERIMENT_RECIPE_SCHEMA_VERSIONS.includes(
    requestedRecipeSchemaVersion,
  )) {
    recipe = freezeInkRecipe(input.recipe);
  } else {
    throw new TypeError(
      `Unsupported experiment recipeSchemaVersion: ${requestedRecipeSchemaVersion}.`,
    );
  }
  const record = {
    id: input.id,
    attempt: input.attempt ?? "A1",
    parentExperimentId: input.parentExperimentId ?? null,
    engineModelVersion:
      input.engineModelVersion ?? recipe.engineModelVersion ?? engineModelVersion,
    recipeSchemaVersion:
      requestedRecipeSchemaVersion,
    fixtureManifestVersion:
      input.fixtureManifestVersion ?? fixtureManifestVersion,
    status: input.status ?? "running",
    hypothesis: input.hypothesis,
    seed: input.seed,
    recipe,
    expected: input.expected ?? null,
    observed: input.observed ?? null,
    lesson: input.lesson ?? null,
    nextMethod: input.nextMethod ?? null,
    recordedAt: input.recordedAt ?? null,
  };
  validateExperimentRecord(record);
  return deepFreeze(record);
}
