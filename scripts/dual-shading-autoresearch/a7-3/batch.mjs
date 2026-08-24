#!/usr/bin/env node

import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import {
  appendFile,
  mkdtemp,
  open,
  readFile,
  rm,
  unlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  MAX_CANDIDATE_MILLISECONDS,
  stableStringify,
  validateCandidate,
} from "./evaluator.mjs";

export const BATCH_PLAN_SCHEMA_VERSION =
  "dual-shading-a7-3-batch-plan-v1";
export const BATCH_RESULT_SCHEMA_VERSION =
  "dual-shading-a7-3-batch-row-v1";
export const MAX_BATCH_CANDIDATES = 12;
export const MAX_BATCH_MILLISECONDS = 30 * 60 * 1000;

export const DEFAULT_BATCH_PLAN_PATH = new URL(
  "../../../research/dual-shading-autoresearch/a7-3/batch-plan-q-01.json",
  import.meta.url,
);
export const DEFAULT_BATCH_RESULTS_PATH = new URL(
  "../../../research/dual-shading-autoresearch/a7-3/batch-results.ndjson",
  import.meta.url,
);

const RUNNER_PATH = fileURLToPath(new URL("./run.mjs", import.meta.url));
const ENGINE_ROOT = fileURLToPath(new URL("../../../", import.meta.url));
const MAX_CHILD_OUTPUT_BYTES = 16 * 1024 * 1024;
const PLAN_KEYS = Object.freeze(["schemaVersion", "id", "note", "candidates"]);
const PARETO_KEYS = Object.freeze([
  "signedFractionFidelity",
  "connectedPatchCoherence",
  "opticalAreaFidelity",
  "opticalDeltaFidelity",
  "minimumReadability",
  "paperResponseFidelity",
  "nibResponseFidelity",
  "artifactIntegrity",
]);

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

function assertText(value, path, maximumLength) {
  if (
    typeof value !== "string"
    || value.trim() === ""
    || value.length > maximumLength
  ) {
    throw new TypeError(
      `${path} must be a non-empty string of at most ${maximumLength} characters.`,
    );
  }
}

export function validateBatchPlan(plan) {
  assertExactKeys(plan, PLAN_KEYS, "batchPlan");
  if (plan.schemaVersion !== BATCH_PLAN_SCHEMA_VERSION) {
    throw new TypeError(
      `batchPlan.schemaVersion must be ${BATCH_PLAN_SCHEMA_VERSION}.`,
    );
  }
  assertText(plan.id, "batchPlan.id", 80);
  if (!/^dual-shading-a7-3-batch-[a-z0-9][a-z0-9._-]*$/.test(plan.id)) {
    throw new TypeError(
      "batchPlan.id must start with dual-shading-a7-3-batch- and use lowercase URL-safe characters.",
    );
  }
  assertText(plan.note, "batchPlan.note", 1000);
  if (
    !Array.isArray(plan.candidates)
    || plan.candidates.length < 1
    || plan.candidates.length > MAX_BATCH_CANDIDATES
  ) {
    throw new TypeError(
      `batchPlan.candidates must contain 1...${MAX_BATCH_CANDIDATES} candidates.`,
    );
  }
  const ids = new Set();
  const capacities = new Set();
  for (const candidate of plan.candidates) {
    validateCandidate(candidate);
    if (ids.has(candidate.id)) {
      throw new TypeError(`batchPlan candidate id ${candidate.id} is duplicated.`);
    }
    if (capacities.has(candidate.sharedAdsorptionCapacity)) {
      throw new TypeError(
        `batchPlan capacity ${candidate.sharedAdsorptionCapacity} is duplicated.`,
      );
    }
    ids.add(candidate.id);
    capacities.add(candidate.sharedAdsorptionCapacity);
  }
  return true;
}

function assertPareto(pareto, path) {
  assertExactKeys(pareto, PARETO_KEYS, path);
  for (const key of PARETO_KEYS) {
    if (!Number.isFinite(pareto[key])) {
      throw new TypeError(`${path}.${key} must be finite.`);
    }
  }
}

function dominates(left, right, epsilon = 1e-8) {
  return PARETO_KEYS.every((key) => left[key] + epsilon >= right[key])
    && PARETO_KEYS.some((key) => left[key] > right[key] + epsilon);
}

export function classifyBatchRows(rows) {
  if (!Array.isArray(rows) || rows.length < 1) {
    throw new TypeError("rows must be a non-empty array.");
  }
  const evaluatorLockDigest = rows[0]?.evaluatorLockDigest;
  if (!/^[0-9a-f]{64}$/.test(evaluatorLockDigest ?? "")) {
    throw new TypeError("rows[0].evaluatorLockDigest must be SHA-256 hex.");
  }
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    assertPlainObject(row, `rows[${index}]`);
    if (row.evaluatorLockDigest !== evaluatorLockDigest) {
      throw new TypeError(
        "cross-candidate Pareto comparison requires one A7-3 evaluator lock digest.",
      );
    }
    if (typeof row.hardGatesPassed !== "boolean") {
      throw new TypeError(`rows[${index}].hardGatesPassed must be boolean.`);
    }
    assertPareto(row.pareto, `rows[${index}].pareto`);
  }
  const passing = rows.filter((row) => row.hardGatesPassed);
  const dispositions = rows.map((row) => {
    if (!row.hardGatesPassed) return "reject-hard";
    return passing.some((other) =>
      other !== row && dominates(other.pareto, row.pareto))
      ? "reject-dominated"
      : "shortlist";
  });
  const nondominatedFront = rows
    .filter((_row, index) => dispositions[index] === "shortlist")
    .map((row) => row.candidate.id);
  return Object.freeze({
    evaluatorLockDigest,
    dispositions: Object.freeze(dispositions),
    nondominatedFront: Object.freeze(nondominatedFront),
    plateau: nondominatedFront.length === 0,
  });
}

function childEvaluation(candidatePath, timeoutMilliseconds) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [
      RUNNER_PATH,
      "--candidate",
      candidatePath,
      "--format",
      "json",
      "--max-milliseconds",
      String(MAX_CANDIDATE_MILLISECONDS),
    ], {
      cwd: ENGINE_ROOT,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let outputExceeded = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, timeoutMilliseconds);
    const capture = (current, chunk) => {
      const next = current + chunk.toString("utf8");
      if (Buffer.byteLength(next) > MAX_CHILD_OUTPUT_BYTES) {
        outputExceeded = true;
        child.kill("SIGKILL");
      }
      return next;
    };
    child.stdout.on("data", (chunk) => {
      stdout = capture(stdout, chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr = capture(stderr, chunk);
    });
    child.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.once("close", (code, signal) => {
      clearTimeout(timer);
      if (timedOut) {
        reject(new Error(`candidate child exceeded ${timeoutMilliseconds}ms and was killed.`));
      } else if (outputExceeded) {
        reject(new Error("candidate child exceeded the output byte limit."));
      } else if (code !== 0) {
        reject(new Error(
          `candidate child failed with code=${String(code)} signal=${String(signal)}: ${stderr.slice(0, 2000)}`,
        ));
      } else {
        try {
          resolve(JSON.parse(stdout));
        } catch (error) {
          reject(new Error(
            `candidate child did not return JSON: ${error.message}; stdout=${stdout.slice(0, 1000)}`,
          ));
        }
      }
    });
  });
}

function selfContainedRow(planId, summary) {
  return Object.freeze({
    schemaVersion: BATCH_RESULT_SCHEMA_VERSION,
    batchPlanId: planId,
    resultId: summary.resultId,
    disposition: null,
    candidate: summary.candidate,
    candidateDigest: summary.candidateDigest,
    evaluatorLockDigest: summary.evaluatorLockDigest,
    predecessor: summary.predecessor,
    matrixDigest: summary.evaluatorMatrix.matrixDigest,
    fixedBaseline: summary.fixedBaseline,
    hardGates: summary.hardGates,
    capacity: summary.capacity,
    pareto: summary.pareto.candidate,
    automaticNinePointClaim: false,
  });
}

function resultsPathString(resultsPath) {
  return resultsPath instanceof URL ? fileURLToPath(resultsPath) : resultsPath;
}

function rowIdentity(row) {
  return `${row.schemaVersion}:${row.batchPlanId}:${row.resultId}`;
}

export async function recordBatchRows(resultsPath, rows) {
  const path = resultsPathString(resultsPath);
  const lockPath = `${path}.lock`;
  let handle;
  try {
    handle = await open(lockPath, "wx");
  } catch (error) {
    if (error?.code === "EEXIST") {
      throw new Error(`results writer lock already exists: ${lockPath}`);
    }
    throw error;
  }
  try {
    let existing = "";
    try {
      existing = await readFile(path, "utf8");
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
    const indexed = new Map();
    for (const line of existing.split("\n").filter(Boolean)) {
      const parsed = JSON.parse(line);
      indexed.set(rowIdentity(parsed), parsed);
    }
    let recorded = 0;
    for (const row of rows) {
      const identity = rowIdentity(row);
      const prior = indexed.get(identity);
      if (prior) {
        if (stableStringify(prior) !== stableStringify(row)) {
          throw new Error(`conflicting batch result row ${identity}.`);
        }
        continue;
      }
      await appendFile(path, `${stableStringify(row)}\n`, "utf8");
      indexed.set(identity, row);
      recorded += 1;
    }
    return recorded;
  } finally {
    await handle.close();
    await unlink(lockPath);
  }
}

export async function runBatch({
  planPath = DEFAULT_BATCH_PLAN_PATH,
  resultsPath = DEFAULT_BATCH_RESULTS_PATH,
  candidateLimit,
  record = false,
  maximumBatchMilliseconds = MAX_BATCH_MILLISECONDS,
} = {}) {
  const plan = JSON.parse(await readFile(planPath, "utf8"));
  validateBatchPlan(plan);
  const limit = candidateLimit === undefined
    ? plan.candidates.length
    : candidateLimit;
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > plan.candidates.length) {
    throw new TypeError("candidateLimit must be within the plan length.");
  }
  const directory = await mkdtemp(join(tmpdir(), "fountain-a7-3-batch-"));
  const startedAt = Date.now();
  const rawRows = [];
  try {
    for (let index = 0; index < limit; index += 1) {
      const elapsed = Date.now() - startedAt;
      if (elapsed >= maximumBatchMilliseconds) {
        throw new Error(`batch exceeded ${maximumBatchMilliseconds}ms.`);
      }
      const candidate = plan.candidates[index];
      const candidatePath = join(
        directory,
        `${String(index + 1).padStart(2, "0")}-${candidate.id}.json`,
      );
      await writeFile(candidatePath, `${stableStringify(candidate, 2)}\n`, "utf8");
      const summary = await childEvaluation(
        candidatePath,
        Math.min(
          MAX_CANDIDATE_MILLISECONDS + 5_000,
          maximumBatchMilliseconds - elapsed,
        ),
      );
      rawRows.push(selfContainedRow(plan.id, summary));
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
  const classified = classifyBatchRows(rawRows.map((row) => ({
    candidate: row.candidate,
    evaluatorLockDigest: row.evaluatorLockDigest,
    hardGatesPassed: row.hardGates.passed,
    pareto: row.pareto,
  })));
  const rows = rawRows.map((row, index) => Object.freeze({
    ...row,
    disposition: classified.dispositions[index],
  }));
  if (record) await recordBatchRows(resultsPath, rows);
  const counts = {
    "reject-hard": 0,
    "reject-dominated": 0,
    shortlist: 0,
  };
  for (const row of rows) counts[row.disposition] += 1;
  return Object.freeze({
    schemaVersion: "dual-shading-a7-3-batch-result-v1",
    plan: Object.freeze({
      id: plan.id,
      plannedCandidateCount: plan.candidates.length,
      evaluatedCandidateCount: rows.length,
      complete: rows.length === plan.candidates.length,
    }),
    evaluatorLockDigest: classified.evaluatorLockDigest,
    counts: Object.freeze(counts),
    nondominatedFront: classified.nondominatedFront,
    plateau: classified.plateau,
    scalarScore: null,
    automaticNinePointClaim: false,
    candidates: Object.freeze(rows),
  });
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function main() {
  const arguments_ = process.argv.slice(2);
  if (arguments_.includes("--help")) {
    process.stdout.write(
      "Usage: node scripts/dual-shading-autoresearch/a7-3/batch.mjs [--plan path] [--limit n] [--record [path]]\n",
    );
    return;
  }
  let planPath = DEFAULT_BATCH_PLAN_PATH;
  let resultsPath = DEFAULT_BATCH_RESULTS_PATH;
  let candidateLimit;
  let record = false;
  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index];
    if (argument === "--plan") {
      planPath = arguments_[++index];
    } else if (argument === "--limit") {
      candidateLimit = Number(arguments_[++index]);
    } else if (argument === "--record") {
      record = true;
      const possiblePath = arguments_[index + 1];
      if (possiblePath && !possiblePath.startsWith("--")) {
        resultsPath = possiblePath;
        index += 1;
      }
    } else {
      throw new TypeError(`unknown argument ${argument}`);
    }
  }
  const result = await runBatch({ planPath, resultsPath, candidateLimit, record });
  process.stdout.write(`${stableStringify({ ...result, digest: sha256(stableStringify(result)) }, 2)}\n`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  });
}
