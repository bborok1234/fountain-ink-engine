#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import {
  ENGINE_ROOT,
  computeCurrentEngineSourceTreeDigest,
  stableStringify,
} from "../archive-validator.mjs";

export const R16_LOADING_ARCHIVE_MANIFEST_SCHEMA_VERSION =
  "dual-shading-loading-r16-archive-manifest-v1";
export const DEFAULT_R16_LOADING_ARCHIVE_MANIFEST_PATH = new URL(
  "../../../research/dual-shading-autoresearch/a7-loading-r16/archive-manifest.json",
  import.meta.url,
);

const ARTIFACT_PATHS = Object.freeze([
  "scripts/dual-shading-autoresearch/a7-loading-r16/fixtures.mjs",
  "scripts/dual-shading-autoresearch/a7-loading-r16/metrics.mjs",
  "scripts/dual-shading-autoresearch/a7-loading-r16/evaluator.mjs",
  "scripts/dual-shading-autoresearch/a7-loading-r16/run.mjs",
  "scripts/dual-shading-autoresearch/a7-loading-r16/archive-validator.mjs",
  "research/dual-shading-autoresearch/a7-loading-r16/PROGRAM.md",
  "research/dual-shading-autoresearch/a7-loading-r16/evaluator-lock.json",
  "research/dual-shading-autoresearch/a7-loading-r16/candidate.json",
  "research/dual-shading-autoresearch/a7-loading-r16/results.ndjson",
]);

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function assertPlainObject(value, path) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${path} must be a plain object.`);
  }
}

function assertExactKeys(value, keys, path) {
  assertPlainObject(value, path);
  const expected = new Set(keys);
  const actual = Reflect.ownKeys(value);
  const unexpected = actual.filter((key) => typeof key !== "string" || !expected.has(key));
  const missing = keys.filter((key) => !Object.hasOwn(value, key));
  if (unexpected.length > 0 || missing.length > 0) {
    throw new TypeError(`${path} keys changed.`);
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

function validateManifest(manifest) {
  assertExactKeys(manifest, [
    "schemaVersion", "algorithm", "evaluatorLockDigest", "engineVersion",
    "engineSourceTreeDigest", "baselineMatrixDigest", "baselineLoadDigest",
    "baselineVisualDigest", "resultRowCount", "caseCount", "status",
    "scientificConclusion", "automaticNinePointClaim", "scoreAfter",
    "nextMethod", "artifacts",
  ], "r16LoadingArchiveManifest");
  if (
    manifest.schemaVersion !== R16_LOADING_ARCHIVE_MANIFEST_SCHEMA_VERSION
    || manifest.algorithm !== "sha256"
    || manifest.engineVersion !== "0.45.0-experimental.1"
    || manifest.resultRowCount !== 1
    || manifest.caseCount !== 99
    || manifest.status !== "contract-pass-visual-falsified"
    || manifest.scientificConclusion !== "loading-only-falsified"
    || manifest.automaticNinePointClaim !== false
    || manifest.scoreAfter !== 6.3
    || manifest.nextMethod
      !== "ordered-deposit-time-plus-surface-lifetime-gated-pinned-redistribution"
  ) throw new TypeError("R16 loading terminal conclusion changed.");
  for (const key of [
    "evaluatorLockDigest", "engineSourceTreeDigest", "baselineMatrixDigest",
    "baselineLoadDigest", "baselineVisualDigest",
  ]) assertSha256(manifest[key], `manifest.${key}`);
  assertExactKeys(manifest.artifacts, ARTIFACT_PATHS, "manifest.artifacts");
  for (const [path, digest] of Object.entries(manifest.artifacts)) {
    if (path.startsWith("/") || path.includes("..")) {
      throw new TypeError(`archive artifact path ${path} must be repository-relative.`);
    }
    assertSha256(digest, `manifest.artifacts[${path}]`);
  }
}

function validateResultRow(row, manifest, candidate) {
  assertPlainObject(row, "resultRow");
  const candidateDigest = sha256(stableStringify(candidate));
  const expectedResultId = sha256(
    `${candidateDigest}:${manifest.evaluatorLockDigest}:${manifest.baselineMatrixDigest}`,
  ).slice(0, 20);
  if (
    row.schemaVersion !== "dual-shading-loading-r16-row-v1"
    || row.resultId !== expectedResultId
    || row.candidateId !== candidate.id
    || stableStringify(row.candidate) !== stableStringify(candidate)
    || row.candidateDigest !== candidateDigest
    || row.evaluatorLockDigest !== manifest.evaluatorLockDigest
    || row.matrixDigest !== manifest.baselineMatrixDigest
    || row.status !== manifest.status
    || row.scientificConclusion !== manifest.scientificConclusion
    || row.hardGates?.algebraPassed !== true
    || row.hardGates?.algebraFailures?.length !== 0
    || row.hardGates?.visualPassed !== false
    || !(row.hardGates?.visualFailures?.length > 0)
    || row.automaticNinePointClaim !== false
    || row.scoreAfter !== 6.3
    || row.nextMethod !== manifest.nextMethod
  ) throw new TypeError("R16 loading terminal result identity/conclusion mismatch.");
}

export async function validateR16LoadingArchive({
  manifestPath = DEFAULT_R16_LOADING_ARCHIVE_MANIFEST_PATH,
  engineRoot = ENGINE_ROOT,
} = {}) {
  const manifest = await readJson(manifestPath);
  validateManifest(manifest);
  for (const [path, expected] of Object.entries(manifest.artifacts)) {
    const actual = sha256(await readFile(new URL(path, `file://${engineRoot}/`)));
    if (actual !== expected) {
      throw new Error(`R16 loading archive artifact mismatch for ${path}.`);
    }
  }
  const lock = await readJson(new URL(
    "research/dual-shading-autoresearch/a7-loading-r16/evaluator-lock.json",
    `file://${engineRoot}/`,
  ));
  const lockDigest = sha256(stableStringify(lock));
  if (
    lockDigest !== manifest.evaluatorLockDigest
    || lock.engineVersion !== manifest.engineVersion
    || lock.engineSourceTreeDigest !== manifest.engineSourceTreeDigest
    || lock.baselineMatrixDigest !== manifest.baselineMatrixDigest
    || lock.baselineLoadDigest !== manifest.baselineLoadDigest
    || lock.baselineVisualDigest !== manifest.baselineVisualDigest
    || lock.predecessor?.currentRuntimeRejected !== true
    || lock.predecessor?.conclusion !== "shared-vacancy-r15-plateau"
  ) throw new Error("R16 loading evaluator lock provenance mismatch.");
  const candidate = await readJson(new URL(
    "research/dual-shading-autoresearch/a7-loading-r16/candidate.json",
    `file://${engineRoot}/`,
  ));
  const rows = (await readFile(new URL(
    "research/dual-shading-autoresearch/a7-loading-r16/results.ndjson",
    `file://${engineRoot}/`,
  ), "utf8")).split("\n").filter(Boolean).map(JSON.parse);
  if (rows.length !== manifest.resultRowCount) {
    throw new Error("R16 loading terminal result row count changed.");
  }
  validateResultRow(rows[0], manifest, candidate);
  const packageVersion = (await readJson(new URL(
    "package.json",
    `file://${engineRoot}/`,
  ))).version;
  const sourceTreeDigest = await computeCurrentEngineSourceTreeDigest({ engineRoot });
  return Object.freeze({
    schemaVersion: "dual-shading-loading-r16-archive-validation-v1",
    evaluatorLockDigest: lockDigest,
    resultRowCount: rows.length,
    caseCount: manifest.caseCount,
    status: manifest.status,
    scientificConclusion: manifest.scientificConclusion,
    automaticNinePointClaim: false,
    scoreAfter: 6.3,
    currentRuntimeRejected:
      packageVersion !== manifest.engineVersion
      || sourceTreeDigest !== manifest.engineSourceTreeDigest,
    currentPackageVersion: packageVersion,
    currentSourceTreeDigest: sourceTreeDigest,
    nextMethod: manifest.nextMethod,
  });
}

async function main() {
  process.stdout.write(`${stableStringify(await validateR16LoadingArchive(), 2)}\n`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  });
}
