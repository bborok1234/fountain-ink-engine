#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import {
  ENGINE_ROOT,
  computeCurrentEngineSourceTreeDigest,
  stableStringify,
} from "../archive-validator.mjs";

export const A7_3_ARCHIVE_MANIFEST_SCHEMA_VERSION =
  "dual-shading-a7-3-archive-manifest-v1";

export const DEFAULT_A7_3_ARCHIVE_MANIFEST_PATH = new URL(
  "../../../research/dual-shading-autoresearch/a7-3/archive-manifest.json",
  import.meta.url,
);
export const DEFAULT_A7_3_LOCK_PATH = new URL(
  "../../../research/dual-shading-autoresearch/a7-3/evaluator-lock.json",
  import.meta.url,
);
export const DEFAULT_A7_3_CANDIDATE_PATH = new URL(
  "../../../research/dual-shading-autoresearch/a7-3/candidate.json",
  import.meta.url,
);
export const DEFAULT_A7_3_RESULT_PATH = new URL(
  "../../../research/dual-shading-autoresearch/a7-3/results.ndjson",
  import.meta.url,
);
export const DEFAULT_A7_3_BATCH_PLAN_PATH = new URL(
  "../../../research/dual-shading-autoresearch/a7-3/batch-plan-q-01.json",
  import.meta.url,
);
export const DEFAULT_A7_3_BATCH_RESULT_PATH = new URL(
  "../../../research/dual-shading-autoresearch/a7-3/batch-results.ndjson",
  import.meta.url,
);

const A7_3_ARCHIVE_ARTIFACT_PATHS = Object.freeze([
  "scripts/dual-shading-autoresearch/a7-3/capacity-metrics.mjs",
  "scripts/dual-shading-autoresearch/a7-3/evaluator.mjs",
  "scripts/dual-shading-autoresearch/a7-3/run.mjs",
  "scripts/dual-shading-autoresearch/a7-3/batch.mjs",
  "scripts/dual-shading-autoresearch/a7-3/archive-validator.mjs",
  "research/dual-shading-autoresearch/a7-3/PROGRAM.md",
  "research/dual-shading-autoresearch/a7-3/evaluator-lock.json",
  "research/dual-shading-autoresearch/a7-3/batch-plan-q-01.json",
  "research/dual-shading-autoresearch/a7-3/candidate.json",
  "research/dual-shading-autoresearch/a7-3/results.ndjson",
  "research/dual-shading-autoresearch/a7-3/batch-results.ndjson",
]);

const EXPECTED_CAPACITIES = Object.freeze([
  0.01875,
  0.0375,
  0.05625,
  0.075,
  0.09375,
  0.1125,
  0.15,
  0.225,
]);

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
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

function assertExactKeys(value, expectedKeys, path) {
  assertPlainObject(value, path);
  const expected = new Set(expectedKeys);
  const actual = Reflect.ownKeys(value);
  const unexpected = actual.filter((key) =>
    typeof key !== "string" || !expected.has(key));
  const missing = expectedKeys.filter((key) => !Object.hasOwn(value, key));
  if (unexpected.length > 0 || missing.length > 0) {
    throw new TypeError(
      `${path} keys mismatch; unexpected=${unexpected.map(String).join(",") || "none"}; missing=${missing.join(",") || "none"}.`,
    );
  }
}

function assertSha256(value, path) {
  if (!/^[0-9a-f]{64}$/.test(value ?? "")) {
    throw new TypeError(`${path} must be SHA-256 hex.`);
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
        throw new TypeError(`invalid A7-3 NDJSON row ${index + 1}: ${error.message}`);
      }
    });
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
    "shortlistCount",
    "plateau",
    "automaticNinePointClaim",
    "conclusion",
    "artifacts",
  ], "a7_3ArchiveManifest");
  if (manifest.schemaVersion !== A7_3_ARCHIVE_MANIFEST_SCHEMA_VERSION) {
    throw new TypeError(
      `a7_3ArchiveManifest.schemaVersion must be ${A7_3_ARCHIVE_MANIFEST_SCHEMA_VERSION}.`,
    );
  }
  if (manifest.algorithm !== "sha256") {
    throw new TypeError("a7_3ArchiveManifest.algorithm must be sha256.");
  }
  for (const key of [
    "evaluatorLockDigest",
    "engineSourceTreeDigest",
    "baselineMatrixDigest",
  ]) assertSha256(manifest[key], `a7_3ArchiveManifest.${key}`);
  if (manifest.engineVersion !== "0.44.0-experimental.1") {
    throw new TypeError("A7-3 archive must preserve the R15 runtime version.");
  }
  if (
    manifest.resultRowCount !== 1
    || manifest.batchResultRowCount !== 8
    || manifest.shortlistCount !== 0
    || manifest.plateau !== true
    || manifest.automaticNinePointClaim !== false
    || manifest.conclusion !== "shared-vacancy-r15-plateau"
  ) {
    throw new TypeError("A7-3 archive terminal conclusion changed.");
  }
  assertExactKeys(
    manifest.artifacts,
    A7_3_ARCHIVE_ARTIFACT_PATHS,
    "a7_3ArchiveManifest.artifacts",
  );
  for (const [path, digest] of Object.entries(manifest.artifacts)) {
    if (path.startsWith("/") || path.includes("..")) {
      throw new TypeError(`A7-3 archive path ${path} must stay repository-relative.`);
    }
    assertSha256(digest, `a7_3ArchiveManifest.artifacts[${path}]`);
  }
}

function digestCandidate(candidate) {
  return sha256(stableStringify(candidate));
}

function expectedResultId(row) {
  return sha256(
    `${row.candidateDigest}:${row.evaluatorLockDigest}:${row.matrixDigest}`,
  ).slice(0, 20);
}

function assertTerminalResultRow(row, manifest, candidate) {
  assertPlainObject(row, "a7_3ResultRow");
  if (
    row.schemaVersion !== "dual-shading-a7-3-autoresearch-row-v1"
    || row.candidateId !== candidate.id
    || stableStringify(row.candidate) !== stableStringify(candidate)
    || row.candidateDigest !== digestCandidate(candidate)
    || row.evaluatorLockDigest !== manifest.evaluatorLockDigest
    || row.matrixDigest !== manifest.baselineMatrixDigest
    || row.resultId !== expectedResultId(row)
  ) {
    throw new TypeError("A7-3 terminal baseline result identity mismatch.");
  }
  if (
    row.status !== "reject-hard"
    || !Array.isArray(row.hardGateFailures)
    || row.hardGateFailures.length === 0
    || row.pareto?.opticalAreaFidelity !== 0
    || row.automaticNinePointClaim !== false
  ) {
    throw new TypeError("A7-3 terminal baseline must remain a non-nine-point hard rejection.");
  }
}

function assertTerminalBatchRow(row, manifest, plan, index) {
  assertPlainObject(row, `a7_3BatchRows[${index}]`);
  const candidate = plan.candidates[index];
  if (
    row.schemaVersion !== "dual-shading-a7-3-batch-row-v1"
    || row.batchPlanId !== plan.id
    || stableStringify(row.candidate) !== stableStringify(candidate)
    || row.candidateDigest !== digestCandidate(candidate)
    || row.evaluatorLockDigest !== manifest.evaluatorLockDigest
    || row.resultId !== expectedResultId(row)
  ) {
    throw new TypeError(`A7-3 terminal batch row ${index + 1} identity mismatch.`);
  }
  if (
    row.fixedBaseline?.engineVersion !== manifest.engineVersion
    || row.fixedBaseline?.dyeRecipe !== "edge-dye-study@15"
    || row.fixedBaseline?.matrixDigest !== manifest.baselineMatrixDigest
  ) {
    throw new TypeError(`A7-3 terminal batch row ${index + 1} baseline mismatch.`);
  }
  if (
    row.disposition !== "reject-hard"
    || row.hardGates?.passed !== false
    || !Array.isArray(row.hardGates.failures)
    || row.hardGates.failures.length === 0
    || row.pareto?.opticalAreaFidelity !== 0
    || row.automaticNinePointClaim !== false
  ) {
    throw new TypeError(
      `A7-3 terminal batch row ${index + 1} must remain a non-nine-point hard rejection.`,
    );
  }
}

export async function validateA7_3Archive({
  manifestPath = DEFAULT_A7_3_ARCHIVE_MANIFEST_PATH,
  lockPath = DEFAULT_A7_3_LOCK_PATH,
  candidatePath = DEFAULT_A7_3_CANDIDATE_PATH,
  resultPath = DEFAULT_A7_3_RESULT_PATH,
  batchPlanPath = DEFAULT_A7_3_BATCH_PLAN_PATH,
  batchResultPath = DEFAULT_A7_3_BATCH_RESULT_PATH,
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
        `A7-3 archive artifact mismatch for ${relativePath}: expected ${expected}, received ${actual}.`,
      );
    }
  }

  const lock = await readJson(lockPath);
  const lockDigest = sha256(stableStringify(lock));
  if (
    lockDigest !== manifest.evaluatorLockDigest
    || lock.engineVersion !== manifest.engineVersion
    || lock.engineSourceTreeDigest !== manifest.engineSourceTreeDigest
    || lock.baselineMatrixDigest !== manifest.baselineMatrixDigest
  ) {
    throw new Error("A7-3 terminal evaluator lock provenance mismatch.");
  }

  const candidate = await readJson(candidatePath);
  const plan = await readJson(batchPlanPath);
  if (
    plan.schemaVersion !== "dual-shading-a7-3-batch-plan-v1"
    || plan.id !== "dual-shading-a7-3-batch-q-01"
    || !Array.isArray(plan.candidates)
    || plan.candidates.length !== 8
    || stableStringify(plan.candidates.map((entry) =>
      entry.sharedAdsorptionCapacity)) !== stableStringify(EXPECTED_CAPACITIES)
    || new Set(plan.candidates.map((entry) => entry.id)).size !== 8
  ) {
    throw new TypeError("A7-3 terminal plan must preserve eight ordered Q-only identities.");
  }

  const resultRows = await readNdjson(resultPath);
  const batchRows = await readNdjson(batchResultPath);
  if (
    resultRows.length !== manifest.resultRowCount
    || batchRows.length !== manifest.batchResultRowCount
  ) {
    throw new Error("A7-3 terminal archive row count changed.");
  }
  assertTerminalResultRow(resultRows[0], manifest, candidate);
  batchRows.forEach((row, index) =>
    assertTerminalBatchRow(row, manifest, plan, index));

  const distinctLocks = new Set([
    resultRows[0].evaluatorLockDigest,
    ...batchRows.map((row) => row.evaluatorLockDigest),
  ]);
  const shortlistCount = batchRows.filter((row) =>
    row.disposition === "shortlist").length;
  if (
    distinctLocks.size !== 1
    || shortlistCount !== manifest.shortlistCount
    || (shortlistCount === 0) !== manifest.plateau
  ) {
    throw new Error("A7-3 terminal batch lock/shortlist/plateau closure mismatch.");
  }

  const packageVersion = (await readJson(
    new URL("package.json", `file://${engineRoot}/`),
  )).version;
  const currentSourceTreeDigest = await computeCurrentEngineSourceTreeDigest({
    engineRoot,
  });
  return Object.freeze({
    schemaVersion: "dual-shading-a7-3-archive-validation-v1",
    evaluatorLockDigest: lockDigest,
    resultRowCount: resultRows.length,
    batchResultRowCount: batchRows.length,
    archivedCandidateCount: resultRows.length + batchRows.length,
    shortlistCount,
    plateau: shortlistCount === 0,
    automaticNinePointClaim: false,
    currentRuntimeRejected:
      packageVersion !== manifest.engineVersion
      || currentSourceTreeDigest !== manifest.engineSourceTreeDigest,
    currentPackageVersion: packageVersion,
    currentSourceTreeDigest,
    conclusion: manifest.conclusion,
  });
}

async function main() {
  const report = await validateA7_3Archive();
  process.stdout.write(`${stableStringify(report, 2)}\n`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  });
}
