import {
  engineModelVersion,
  fixtureManifestVersion,
  recipeSchemaVersion,
} from "./versions.js";

export const EXPERIMENT_STATUSES = Object.freeze([
  "backlog",
  "running",
  "passed",
  "learned",
  "abandoned",
]);

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
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
    value.forEach((entry, index) => assertJsonValue(entry, `${path}[${index}]`));
    return;
  }
  if (isRecord(value)) {
    Object.entries(value).forEach(([key, entry]) => {
      if (entry === undefined) {
        throw new TypeError(`${path}.${key} must not be undefined.`);
      }
      assertJsonValue(entry, `${path}.${key}`);
    });
    return;
  }
  throw new TypeError(`${path} must contain only finite JSON values.`);
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

/**
 * Validate a serializable experiment record without inventing time or seed.
 *
 * @param {Record<string, unknown>} record
 * @returns {true}
 */
export function validateExperimentRecord(record) {
  if (!isRecord(record)) throw new TypeError("Experiment record must be an object.");
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
  if (!Number.isInteger(record.seed) || Number(record.seed) < 0) {
    throw new TypeError("Experiment seed must be a non-negative integer.");
  }
  if (!isRecord(record.recipe)) {
    throw new TypeError("Experiment recipe must be an object.");
  }
  if (typeof record.engineModelVersion !== "string") {
    throw new TypeError("Experiment record requires engineModelVersion.");
  }
  if (!Number.isInteger(record.recipeSchemaVersion)) {
    throw new TypeError("Experiment record requires recipeSchemaVersion.");
  }
  if (!Number.isInteger(record.fixtureManifestVersion)) {
    throw new TypeError("Experiment record requires fixtureManifestVersion.");
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
  const record = {
    id: input.id,
    attempt: input.attempt ?? "A1",
    parentExperimentId: input.parentExperimentId ?? null,
    engineModelVersion: input.engineModelVersion ?? engineModelVersion,
    recipeSchemaVersion: input.recipeSchemaVersion ?? recipeSchemaVersion,
    fixtureManifestVersion:
      input.fixtureManifestVersion ?? fixtureManifestVersion,
    status: input.status ?? "running",
    hypothesis: input.hypothesis,
    seed: input.seed,
    recipe: input.recipe,
    expected: input.expected ?? null,
    observed: input.observed ?? null,
    lesson: input.lesson ?? null,
    nextMethod: input.nextMethod ?? null,
    recordedAt: input.recordedAt ?? null,
  };
  validateExperimentRecord(record);
  return deepFreeze(record);
}
