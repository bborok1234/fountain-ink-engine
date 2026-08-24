#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";

export const R14_ARCHIVE_MANIFEST_SCHEMA_VERSION =
  "dual-shading-r14-archive-manifest-v1";

export const ENGINE_ROOT = fileURLToPath(new URL("../../", import.meta.url));
export const DEFAULT_ARCHIVE_MANIFEST_PATH = new URL(
  "../../research/dual-shading-autoresearch/r14-archive-manifest.json",
  import.meta.url,
);
export const DEFAULT_R14_LOCK_PATH = new URL(
  "../../research/dual-shading-autoresearch/evaluator-lock.json",
  import.meta.url,
);
export const DEFAULT_R14_RESULTS_PATH = new URL(
  "../../research/dual-shading-autoresearch/results.ndjson",
  import.meta.url,
);
export const DEFAULT_R14_BATCH_RESULTS_PATH = new URL(
  "../../research/dual-shading-autoresearch/batch-results.ndjson",
  import.meta.url,
);
export const DEFAULT_R14_BATCH_PLAN_PATHS = Object.freeze([
  new URL(
    "../../research/dual-shading-autoresearch/batch-plan-r14-01.json",
    import.meta.url,
  ),
  new URL(
    "../../research/dual-shading-autoresearch/batch-plan-r14-02.json",
    import.meta.url,
  ),
]);

const R14_ARCHIVE_ARTIFACT_PATHS = Object.freeze([
  "scripts/dual-shading-autoresearch/evaluator.mjs",
  "scripts/dual-shading-autoresearch/fixtures.mjs",
  "scripts/dual-shading-autoresearch/metrics.mjs",
  "scripts/dual-shading-autoresearch/run.mjs",
  "scripts/dual-shading-autoresearch/batch.mjs",
  "research/dual-shading-autoresearch/PROGRAM.md",
  "research/dual-shading-autoresearch/evaluator-lock.json",
  "research/dual-shading-autoresearch/results.ndjson",
  "research/dual-shading-autoresearch/batch-results.ndjson",
  "research/dual-shading-autoresearch/batch-plan-r14-01.json",
  "research/dual-shading-autoresearch/batch-plan-r14-02.json",
  "research/dual-shading-autoresearch/candidate.json",
  "research/dual-shading-autoresearch/photo-topology-v1.json",
]);

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function sortedValue(value) {
  if (Array.isArray(value)) return value.map(sortedValue);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value).sort().map((key) => [key, sortedValue(value[key])]),
    );
  }
  return value;
}

export function stableStringify(value, space = 0) {
  return JSON.stringify(sortedValue(value), null, space);
}

function assertPlainObject(value, path) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${path} must be a plain object.`);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError(`${path} must have a plain prototype.`);
  }
}

function assertSha256(value, path) {
  if (!/^[0-9a-f]{64}$/.test(value ?? "")) {
    throw new TypeError(`${path} must be SHA-256 hex.`);
  }
}

function assertExactKeys(value, expectedKeys, path) {
  assertPlainObject(value, path);
  const actual = Reflect.ownKeys(value);
  const expected = new Set(expectedKeys);
  const unexpected = actual.filter((key) =>
    typeof key !== "string" || !expected.has(key));
  const missing = expectedKeys.filter((key) => !Object.hasOwn(value, key));
  if (unexpected.length > 0 || missing.length > 0) {
    throw new TypeError(
      `${path} keys mismatch; unexpected=${unexpected.map(String).join(",") || "none"}; missing=${missing.join(",") || "none"}.`,
    );
  }
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function readNdjson(path) {
  return (await readFile(path, "utf8"))
    .split("\n")
    .filter(Boolean)
    .map((line, index) => {
      try {
        return JSON.parse(line);
      } catch (error) {
        throw new TypeError(`invalid NDJSON row ${index + 1}: ${error.message}`);
      }
    });
}

async function collectTreeFiles(directoryUrl, relativeDirectory = "") {
  const entries = await readdir(directoryUrl, { withFileTypes: true });
  entries.sort((left, right) => left.name.localeCompare(right.name));
  const files = [];
  for (const entry of entries) {
    const relativePath = relativeDirectory === ""
      ? entry.name
      : `${relativeDirectory}/${entry.name}`;
    const entryUrl = new URL(
      `${entry.name}${entry.isDirectory() ? "/" : ""}`,
      directoryUrl,
    );
    if (entry.isSymbolicLink()) {
      throw new Error(`source tree rejects symbolic link ${relativePath}.`);
    }
    if (entry.isDirectory()) {
      files.push(...await collectTreeFiles(entryUrl, relativePath));
    } else if (entry.isFile()) {
      files.push({ relativePath, bytes: await readFile(entryUrl) });
    } else {
      throw new Error(`source tree rejects non-file ${relativePath}.`);
    }
  }
  return files;
}

export async function computeCurrentEngineSourceTreeDigest({
  engineRoot = ENGINE_ROOT,
} = {}) {
  const hash = createHash("sha256");
  const files = await collectTreeFiles(
    new URL("src/", `file://${engineRoot}/`),
  );
  for (const { relativePath, bytes } of files) {
    hash.update(relativePath);
    hash.update("\0");
    hash.update(String(bytes.byteLength));
    hash.update("\0");
    hash.update(bytes);
    hash.update("\0");
  }
  return hash.digest("hex");
}

function validateManifest(manifest) {
  assertExactKeys(manifest, [
    "schemaVersion",
    "algorithm",
    "evaluatorLockDigest",
    "engineVersion",
    "engineSourceTreeDigest",
    "baselineMatrixDigest",
    "resultRowCount",
    "batchResultRowCount",
    "conclusion",
    "artifacts",
  ], "archiveManifest");
  if (manifest.schemaVersion !== R14_ARCHIVE_MANIFEST_SCHEMA_VERSION) {
    throw new TypeError(
      `archiveManifest.schemaVersion must be ${R14_ARCHIVE_MANIFEST_SCHEMA_VERSION}.`,
    );
  }
  if (manifest.algorithm !== "sha256") {
    throw new TypeError("archiveManifest.algorithm must be sha256.");
  }
  for (const key of [
    "evaluatorLockDigest",
    "engineSourceTreeDigest",
    "baselineMatrixDigest",
  ]) assertSha256(manifest[key], `archiveManifest.${key}`);
  if (manifest.engineVersion !== "0.43.0-experimental.1") {
    throw new TypeError("archiveManifest.engineVersion must preserve the R14 runtime.");
  }
  if (manifest.conclusion !== "capacity-free-r14-plateau") {
    throw new TypeError("archiveManifest.conclusion must preserve the R14 result.");
  }
  if (manifest.resultRowCount !== 1 || manifest.batchResultRowCount !== 48) {
    throw new TypeError("archiveManifest must preserve 1 result row and 48 batch rows.");
  }
  assertExactKeys(
    manifest.artifacts,
    R14_ARCHIVE_ARTIFACT_PATHS,
    "archiveManifest.artifacts",
  );
  for (const [path, digest] of Object.entries(manifest.artifacts)) {
    if (path.startsWith("/") || path.includes("..")) {
      throw new TypeError(`archive artifact path ${path} must stay repository-relative.`);
    }
    assertSha256(digest, `archiveManifest.artifacts[${path}]`);
  }
}

function candidateDigest(candidate) {
  return sha256(stableStringify(candidate));
}

function expectedResultId(row) {
  return sha256(
    `${row.candidateDigest}:${row.evaluatorLockDigest}:${row.matrixDigest}`,
  ).slice(0, 20);
}

function validateArchivedResultRow(row, manifest) {
  assertPlainObject(row, "resultRow");
  if (row.schemaVersion !== "dual-shading-autoresearch-row-v2") {
    throw new TypeError("archived result row schema mismatch.");
  }
  if (row.candidateId !== row.candidate?.id) {
    throw new TypeError("archived result candidate identity mismatch.");
  }
  if (row.candidateDigest !== candidateDigest(row.candidate)) {
    throw new TypeError(`archived result ${row.resultId} candidate digest mismatch.`);
  }
  if (row.evaluatorLockDigest !== manifest.evaluatorLockDigest) {
    throw new TypeError(`archived result ${row.resultId} evaluator lock mismatch.`);
  }
  if (row.resultId !== expectedResultId(row)) {
    throw new TypeError(`archived result ${row.resultId} identity mismatch.`);
  }
  if (row.automaticNinePointClaim !== false || row.status !== "reject-hard") {
    throw new TypeError("archived R14 result must remain a non-nine-point hard rejection.");
  }
}

function validateArchivedBatchRow(row, manifest, planById) {
  assertPlainObject(row, "batchResultRow");
  if (row.schemaVersion !== "dual-shading-autoresearch-batch-row-v1") {
    throw new TypeError("archived batch row schema mismatch.");
  }
  const plan = planById.get(row.batchPlanId);
  if (!plan) throw new TypeError(`unknown archived batch plan ${row.batchPlanId}.`);
  const candidate = plan.candidates.find(({ id }) => id === row.candidate?.id);
  if (!candidate || stableStringify(candidate) !== stableStringify(row.candidate)) {
    throw new TypeError(`archived batch candidate ${row.candidate?.id} is not plan-exact.`);
  }
  if (row.candidateDigest !== candidateDigest(row.candidate)) {
    throw new TypeError(`archived batch ${row.resultId} candidate digest mismatch.`);
  }
  if (row.evaluatorLockDigest !== manifest.evaluatorLockDigest) {
    throw new TypeError(`archived batch ${row.resultId} evaluator lock mismatch.`);
  }
  if (row.resultId !== expectedResultId(row)) {
    throw new TypeError(`archived batch ${row.resultId} identity mismatch.`);
  }
  if (
    row.fixedBaseline?.engineVersion !== manifest.engineVersion
    || row.fixedBaseline?.dyeRecipe !== "edge-dye-study@14"
    || row.fixedBaseline?.matrixDigest !== manifest.baselineMatrixDigest
  ) {
    throw new TypeError(`archived batch ${row.resultId} baseline provenance mismatch.`);
  }
  if (
    row.automaticNinePointClaim !== false
    || row.disposition !== "reject-hard"
    || row.hardGates?.passed !== false
  ) {
    throw new TypeError("archived R14 batch row must remain a hard rejection.");
  }
}

export async function validateR14Archive({
  manifestPath = DEFAULT_ARCHIVE_MANIFEST_PATH,
  lockPath = DEFAULT_R14_LOCK_PATH,
  resultPath = DEFAULT_R14_RESULTS_PATH,
  batchResultPath = DEFAULT_R14_BATCH_RESULTS_PATH,
  batchPlanPaths = DEFAULT_R14_BATCH_PLAN_PATHS,
  engineRoot = ENGINE_ROOT,
} = {}) {
  const manifest = await readJson(manifestPath);
  validateManifest(manifest);

  for (const [relativePath, expected] of Object.entries(manifest.artifacts)) {
    const actual = sha256(await readFile(
      new URL(relativePath, `file://${engineRoot}/`),
    ));
    if (actual !== expected) {
      throw new Error(
        `R14 archive artifact mismatch for ${relativePath}: expected ${expected}, received ${actual}.`,
      );
    }
  }

  const lock = await readJson(lockPath);
  const lockDigest = sha256(stableStringify(lock));
  if (lockDigest !== manifest.evaluatorLockDigest) {
    throw new Error(
      `R14 logical evaluator lock mismatch: expected ${manifest.evaluatorLockDigest}, received ${lockDigest}.`,
    );
  }
  if (
    lock.engineSourceTreeDigest !== manifest.engineSourceTreeDigest
    || lock.baselineMatrixDigest !== manifest.baselineMatrixDigest
  ) {
    throw new Error("R14 evaluator lock no longer matches archive provenance.");
  }

  const plans = await Promise.all(batchPlanPaths.map(readJson));
  const planById = new Map(plans.map((plan) => [plan.id, plan]));
  if (planById.size !== plans.length) {
    throw new TypeError("archived batch plan ids must be unique.");
  }
  for (const plan of plans) {
    if (
      plan.schemaVersion !== "dual-shading-autoresearch-batch-plan-v1"
      || !Array.isArray(plan.candidates)
      || plan.candidates.length !== 24
    ) {
      throw new TypeError(`archived batch plan ${plan.id} must preserve 24 candidates.`);
    }
    const ids = new Set(plan.candidates.map(({ id }) => id));
    if (ids.size !== plan.candidates.length) {
      throw new TypeError(`archived batch plan ${plan.id} has duplicate candidates.`);
    }
  }

  const results = await readNdjson(resultPath);
  const batchResults = await readNdjson(batchResultPath);
  if (
    results.length !== manifest.resultRowCount
    || batchResults.length !== manifest.batchResultRowCount
  ) {
    throw new Error("R14 archive row count changed.");
  }
  results.forEach((row) => validateArchivedResultRow(row, manifest));
  batchResults.forEach((row) =>
    validateArchivedBatchRow(row, manifest, planById));

  const expectedBatchIdentities = new Set(plans.flatMap((plan) =>
    plan.candidates.map((candidate) => `${plan.id}:${candidate.id}`)));
  const actualBatchIdentities = new Set(batchResults.map((row) =>
    `${row.batchPlanId}:${row.candidate.id}`));
  if (
    actualBatchIdentities.size !== batchResults.length
    || stableStringify([...actualBatchIdentities].sort())
      !== stableStringify([...expectedBatchIdentities].sort())
  ) {
    throw new Error("R14 batch rows must map one-to-one to both frozen plans.");
  }

  const packageVersion = (await readJson(
    new URL("package.json", `file://${engineRoot}/`),
  )).version;
  const currentSourceTreeDigest = await computeCurrentEngineSourceTreeDigest({
    engineRoot,
  });
  return Object.freeze({
    schemaVersion: "dual-shading-r14-archive-validation-v1",
    evaluatorLockDigest: lockDigest,
    resultRowCount: results.length,
    batchResultRowCount: batchResults.length,
    archivedCandidateCount: actualBatchIdentities.size + results.length,
    currentRuntimeRejected:
      packageVersion !== manifest.engineVersion
      || currentSourceTreeDigest !== manifest.engineSourceTreeDigest,
    currentPackageVersion: packageVersion,
    currentSourceTreeDigest,
    conclusion: manifest.conclusion,
  });
}

async function main() {
  const report = await validateR14Archive();
  process.stdout.write(`${stableStringify(report, 2)}\n`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  });
}
