import { createFieldSignature, FIELD_SIGNATURE_ALGORITHM } from "./field-signature.js";
import { validateExperimentRecord } from "./experiments.js";

export const STABLE_OUTPUT_CONTRACT_VERSION = 1;
export const STABLE_OUTPUT_CONTRACT_SCOPE =
  "recorded-environment-exact-stage-bytes-v1";

export const ORDINARY_STAGE_SIGNATURE_KEYS = Object.freeze([
  "contactRgba",
  "densityAccumulatedVariation",
  "densitySampleCount",
  "surfaceResolvedCoverage",
  "densityNormalizedConcentration",
  "opticalCompositeRgba",
]);

const SIGNATURE_KEYS = Object.freeze([
  "algorithm",
  "domain",
  "dataType",
  "width",
  "height",
  "channels",
  "length",
  "hash",
]);

const CONTRACT_KEYS = Object.freeze([
  "contractVersion",
  "scope",
  "engineModelVersion",
  "recipeSchemaVersion",
  "fixtureManifestVersion",
  "fieldSignatureAlgorithm",
  "replayInputSignature",
  "fields",
]);

const EXPECTED_DOMAINS = Object.freeze({
  contactRgba: "contact.rgba-mask",
  densityAccumulatedVariation: "density.accumulated-variation",
  densitySampleCount: "density.sample-count",
  surfaceResolvedCoverage: "surface.resolved-coverage",
  densityNormalizedConcentration: "density.normalized-concentration",
  opticalCompositeRgba: "optical.composite-rgba",
});

const EXPECTED_FIELD_LAYOUTS = Object.freeze({
  contactRgba: Object.freeze({ dataType: "Uint8ClampedArray", channels: 4 }),
  densityAccumulatedVariation: Object.freeze({ dataType: "Float32Array", channels: 1 }),
  densitySampleCount: Object.freeze({ dataType: "Uint16Array", channels: 1 }),
  surfaceResolvedCoverage: Object.freeze({ dataType: "Float32Array", channels: 1 }),
  densityNormalizedConcentration: Object.freeze({ dataType: "Float32Array", channels: 1 }),
  opticalCompositeRgba: Object.freeze({ dataType: "Uint8ClampedArray", channels: 4 }),
});

function assertPlainRecord(value, path, expectedKeys) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${path} must be a plain object.`);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError(`${path} must be a plain object.`);
  }
  const expected = new Set(expectedKeys);
  const actual = Reflect.ownKeys(value);
  if (
    actual.length !== expected.size
    || actual.some((key) => typeof key !== "string" || !expected.has(key))
  ) {
    throw new TypeError(`${path} has an invalid key set.`);
  }
  const snapshot = {};
  for (const key of expectedKeys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor?.enumerable || !("value" in descriptor)) {
      throw new TypeError(`${path}.${key} must be an enumerable own data property.`);
    }
    snapshot[key] = descriptor.value;
  }
  return snapshot;
}

function assertPositiveSafeInteger(value, path) {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new TypeError(`${path} must be a positive safe integer.`);
  }
  return value;
}

function snapshotSignature(value, path, expectedDomain = null) {
  const signature = assertPlainRecord(value, path, SIGNATURE_KEYS);
  if (signature.algorithm !== FIELD_SIGNATURE_ALGORITHM) {
    throw new TypeError(`${path}.algorithm is not supported.`);
  }
  if (
    typeof signature.domain !== "string"
    || signature.domain.trim() === ""
    || (expectedDomain !== null && signature.domain !== expectedDomain)
  ) {
    throw new TypeError(`${path}.domain is invalid.`);
  }
  if (!["Uint8Array", "Uint8ClampedArray", "Uint16Array", "Float32Array"].includes(
    signature.dataType,
  )) {
    throw new TypeError(`${path}.dataType is not supported.`);
  }
  const width = assertPositiveSafeInteger(signature.width, `${path}.width`);
  const height = assertPositiveSafeInteger(signature.height, `${path}.height`);
  const channels = assertPositiveSafeInteger(signature.channels, `${path}.channels`);
  const length = assertPositiveSafeInteger(signature.length, `${path}.length`);
  if (width * height * channels !== length) {
    throw new TypeError(`${path}.length does not match its dimensions.`);
  }
  if (typeof signature.hash !== "string" || !/^[0-9a-f]{16}$/.test(signature.hash)) {
    throw new TypeError(`${path}.hash must be a 16-character lowercase hexadecimal string.`);
  }
  return Object.freeze({
    algorithm: signature.algorithm,
    domain: signature.domain,
    dataType: signature.dataType,
    width,
    height,
    channels,
    length,
    hash: signature.hash,
  });
}

function snapshotStageSignatures(value, path = "stageSignatures") {
  const fields = assertPlainRecord(value, path, ORDINARY_STAGE_SIGNATURE_KEYS);
  const snapshot = Object.freeze(Object.fromEntries(
    ORDINARY_STAGE_SIGNATURE_KEYS.map((key) => [
      key,
      snapshotSignature(fields[key], `${path}.${key}`, EXPECTED_DOMAINS[key]),
    ]),
  ));
  const reference = snapshot.contactRgba;
  for (const key of ORDINARY_STAGE_SIGNATURE_KEYS) {
    const signature = snapshot[key];
    const layout = EXPECTED_FIELD_LAYOUTS[key];
    if (signature.dataType !== layout.dataType || signature.channels !== layout.channels) {
      throw new TypeError(`${path}.${key} has an invalid type or channel count.`);
    }
    if (signature.width !== reference.width || signature.height !== reference.height) {
      throw new TypeError(`${path}.${key} dimensions must match Contact.`);
    }
  }
  return snapshot;
}

function canonicalJson(value, path = "replayInputs") {
  if (value === null || typeof value === "boolean" || typeof value === "string") {
    return JSON.stringify(value);
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    const items = [];
    for (let index = 0; index < value.length; index += 1) {
      const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
      if (!descriptor?.enumerable || !("value" in descriptor)) {
        throw new TypeError(`${path}[${index}] must be an enumerable data property.`);
      }
      items.push(canonicalJson(descriptor.value, `${path}[${index}]`));
    }
    return `[${items.join(",")}]`;
  }
  if (value !== null && typeof value === "object") {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new TypeError(`${path} must contain only plain JSON records.`);
    }
    const keys = Reflect.ownKeys(value);
    if (keys.some((key) => typeof key !== "string")) {
      throw new TypeError(`${path} must not contain symbol keys.`);
    }
    return `{${keys.sort().map((key) => {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor?.enumerable || !("value" in descriptor)) {
        throw new TypeError(`${path}.${key} must be an enumerable data property.`);
      }
      return `${JSON.stringify(key)}:${canonicalJson(descriptor.value, `${path}.${key}`)}`;
    }).join(",")}}`;
  }
  throw new TypeError(`${path} must contain only finite JSON values.`);
}

function replayInputsFromCheckpoint(checkpoint) {
  if (checkpoint.fixtureManifestVersion !== 3) {
    throw new TypeError("Stable output contracts require fixtureManifestVersion 3.");
  }
  return {
    engineModelVersion: checkpoint.engineModelVersion,
    recipeSchemaVersion: checkpoint.recipeSchemaVersion,
    fixtureManifestVersion: checkpoint.fixtureManifestVersion,
    seed: checkpoint.seed,
    recipe: checkpoint.recipe,
    surfaceModelVersion: checkpoint.surfaceModelVersion,
    surfaceRecipeSchemaVersion: checkpoint.surfaceRecipeSchemaVersion,
    surfaceRecipe: checkpoint.surfaceRecipe,
    componentInputs: checkpoint.componentInputs,
    renderContext: checkpoint.renderContext,
  };
}

function createReplayInputSignature(checkpoint) {
  const bytes = new TextEncoder().encode(canonicalJson(
    replayInputsFromCheckpoint(checkpoint),
  ));
  return createFieldSignature({
    domain: "checkpoint.replay-inputs-v1",
    width: bytes.length,
    height: 1,
    channels: 1,
    data: bytes,
  });
}

function snapshotContract(value, path = "stableOutputContract") {
  const contract = assertPlainRecord(value, path, CONTRACT_KEYS);
  if (contract.contractVersion !== STABLE_OUTPUT_CONTRACT_VERSION) {
    throw new TypeError(`${path}.contractVersion is not supported.`);
  }
  if (contract.scope !== STABLE_OUTPUT_CONTRACT_SCOPE) {
    throw new TypeError(`${path}.scope is not supported.`);
  }
  if (contract.fieldSignatureAlgorithm !== FIELD_SIGNATURE_ALGORITHM) {
    throw new TypeError(`${path}.fieldSignatureAlgorithm is not supported.`);
  }
  if (typeof contract.engineModelVersion !== "string" || contract.engineModelVersion === "") {
    throw new TypeError(`${path}.engineModelVersion must be a non-empty string.`);
  }
  if (!Number.isSafeInteger(contract.recipeSchemaVersion) || contract.recipeSchemaVersion <= 0) {
    throw new TypeError(`${path}.recipeSchemaVersion must be a positive safe integer.`);
  }
  if (contract.fixtureManifestVersion !== 3) {
    throw new TypeError(`${path}.fixtureManifestVersion must be 3.`);
  }
  const replayInputSignature = snapshotSignature(
    contract.replayInputSignature,
    `${path}.replayInputSignature`,
    "checkpoint.replay-inputs-v1",
  );
  if (
    replayInputSignature.dataType !== "Uint8Array"
    || replayInputSignature.height !== 1
    || replayInputSignature.channels !== 1
  ) {
    throw new TypeError(`${path}.replayInputSignature has an invalid layout.`);
  }
  const fields = snapshotStageSignatures(contract.fields, `${path}.fields`);
  return Object.freeze({
    contractVersion: contract.contractVersion,
    scope: contract.scope,
    engineModelVersion: contract.engineModelVersion,
    recipeSchemaVersion: contract.recipeSchemaVersion,
    fixtureManifestVersion: contract.fixtureManifestVersion,
    fieldSignatureAlgorithm: contract.fieldSignatureAlgorithm,
    replayInputSignature,
    fields,
  });
}

/** Bind one fixture-v3 replay input manifest to exact named stage signatures. */
export function createStableOutputContract({ checkpoint, stageSignatures }) {
  validateExperimentRecord(checkpoint);
  const fields = snapshotStageSignatures(stageSignatures);
  return Object.freeze({
    contractVersion: STABLE_OUTPUT_CONTRACT_VERSION,
    scope: STABLE_OUTPUT_CONTRACT_SCOPE,
    engineModelVersion: checkpoint.engineModelVersion,
    recipeSchemaVersion: checkpoint.recipeSchemaVersion,
    fixtureManifestVersion: checkpoint.fixtureManifestVersion,
    fieldSignatureAlgorithm: FIELD_SIGNATURE_ALGORITHM,
    replayInputSignature: createReplayInputSignature(checkpoint),
    fields,
  });
}

export function validateStableOutputContract(contract) {
  snapshotContract(contract);
  return true;
}

/** Compare two contracts without claiming equality outside their recorded environment. */
export function compareStableOutputContracts(expected, actual) {
  const left = snapshotContract(expected, "expected");
  const right = snapshotContract(actual, "actual");
  const sameReplayInputs = left.engineModelVersion === right.engineModelVersion
    && left.recipeSchemaVersion === right.recipeSchemaVersion
    && left.fixtureManifestVersion === right.fixtureManifestVersion
    && left.replayInputSignature.hash === right.replayInputSignature.hash;
  const mismatchedFields = ORDINARY_STAGE_SIGNATURE_KEYS.filter((key) => (
    JSON.stringify(left.fields[key]) !== JSON.stringify(right.fields[key])
  ));
  return Object.freeze({
    matches: sameReplayInputs && mismatchedFields.length === 0,
    sameReplayInputs,
    mismatchedFields: Object.freeze(mismatchedFields),
  });
}
