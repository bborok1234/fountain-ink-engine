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
  "dual-shading-autoresearch-batch-plan-v1";
export const BATCH_RESULT_SCHEMA_VERSION =
  "dual-shading-autoresearch-batch-row-v1";
export const MAX_BATCH_CANDIDATES = 24;
export const MAX_BATCH_MILLISECONDS = 30 * 60 * 1000;

export const DEFAULT_BATCH_PLAN_PATH = new URL(
  "../../research/dual-shading-autoresearch/batch-plan-r14-01.json",
  import.meta.url,
);
export const DEFAULT_BATCH_RESULTS_PATH = new URL(
  "../../research/dual-shading-autoresearch/batch-results.ndjson",
  import.meta.url,
);

const RUNNER_PATH = fileURLToPath(new URL("./run.mjs", import.meta.url));
const ENGINE_ROOT = fileURLToPath(new URL("../../", import.meta.url));
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
  for (const key of expectedKeys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor?.enumerable || !("value" in descriptor)) {
      throw new TypeError(`${path}.${key} must be an enumerable data property.`);
    }
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
  assertPlainObject(plan, "batchPlan");
  assertExactKeys(plan, PLAN_KEYS, "batchPlan");
  if (plan.schemaVersion !== BATCH_PLAN_SCHEMA_VERSION) {
    throw new TypeError(
      `batchPlan.schemaVersion must be ${BATCH_PLAN_SCHEMA_VERSION}.`,
    );
  }
  assertText(plan.id, "batchPlan.id", 80);
  if (!/^dual-shading-batch-[a-z0-9][a-z0-9._-]*$/.test(plan.id)) {
    throw new TypeError(
      "batchPlan.id must start with dual-shading-batch- and use lowercase URL-safe characters.",
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
  for (let index = 0; index < plan.candidates.length; index += 1) {
    const candidate = plan.candidates[index];
    validateCandidate(candidate);
    if (ids.has(candidate.id)) {
      throw new TypeError(`batchPlan candidate id ${candidate.id} is duplicated.`);
    }
    ids.add(candidate.id);
  }
  return true;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function assertPareto(pareto, path) {
  assertPlainObject(pareto, path);
  assertExactKeys(pareto, PARETO_KEYS, path);
  for (const key of PARETO_KEYS) {
    if (!Number.isFinite(pareto[key])) {
      throw new TypeError(`${path}.${key} must be finite.`);
    }
  }
}

function dominates(left, right, epsilon = 1e-8) {
  const noWorse = PARETO_KEYS.every((key) =>
    left[key] + epsilon >= right[key]);
  const better = PARETO_KEYS.some((key) =>
    left[key] > right[key] + epsilon);
  return noWorse && better;
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
        "cross-candidate Pareto comparison requires one evaluator lock digest.",
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
    const isDominated = passing.some((other) =>
      other !== row && dominates(other.pareto, row.pareto));
    return isDominated ? "reject-dominated" : "shortlist";
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
        reject(new Error(
          `candidate child exceeded ${timeoutMilliseconds}ms and was killed.`,
        ));
        return;
      }
      if (outputExceeded) {
        reject(new Error("candidate child exceeded the output byte limit."));
        return;
      }
      if (code !== 0) {
        reject(new Error(
          `candidate child failed with code=${String(code)} signal=${String(signal)}: ${stderr.slice(0, 2000)}`,
        ));
        return;
      }
      try {
        resolve(JSON.parse(stdout));
      } catch (error) {
        reject(new Error(
          `candidate child did not return JSON: ${error.message}; stdout=${stdout.slice(0, 1000)}`,
        ));
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
    matrixDigest: summary.evaluatorMatrix.matrixDigest,
    fixedBaseline: summary.fixedBaseline,
    hardGates: summary.hardGates,
    pareto: summary.pareto.candidate,
    automaticNinePointClaim: false,
  });
}

function withDisposition(row, disposition) {
  return Object.freeze({ ...row, disposition });
}

function resultsPathString(resultsPath) {
  return resultsPath instanceof URL ? fileURLToPath(resultsPath) : resultsPath;
}

export async function withSingleWriterLock(resultsPath, operation) {
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
    await handle.writeFile(`${process.pid}\n`, "utf8");
    return await operation();
  } finally {
    await handle.close();
    await unlink(lockPath).catch((error) => {
      if (error?.code !== "ENOENT") throw error;
    });
  }
}

function batchRowIdentity(row) {
  return `${row.schemaVersion}:${row.batchPlanId}:${row.resultId}`;
}

export async function recordBatchRows(resultsPath, rows) {
  return withSingleWriterLock(resultsPath, async () => {
    const path = resultsPathString(resultsPath);
    let existing = "";
    try {
      existing = await readFile(path, "utf8");
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
    const indexed = new Map();
    for (const line of existing.split("\n").filter(Boolean)) {
      const parsed = JSON.parse(line);
      if (
        parsed.schemaVersion !== BATCH_RESULT_SCHEMA_VERSION
        || typeof parsed.batchPlanId !== "string"
      ) continue;
      indexed.set(batchRowIdentity(parsed), parsed);
    }
    const missing = [];
    for (const row of rows) {
      const identity = batchRowIdentity(row);
      const previous = indexed.get(identity);
      if (previous === undefined) {
        indexed.set(identity, row);
        missing.push(row);
        continue;
      }
      if (stableStringify(previous) !== stableStringify(row)) {
        throw new Error(`conflicting batch result row ${identity}.`);
      }
    }
    if (missing.length > 0) {
      await appendFile(
        path,
        `${missing.map((row) => stableStringify(row)).join("\n")}\n`,
        "utf8",
      );
    }
    return missing.length;
  });
}

export async function runBatch({
  planPath = DEFAULT_BATCH_PLAN_PATH,
  resultsPath = DEFAULT_BATCH_RESULTS_PATH,
  record = false,
  candidateLimit,
  maximumBatchMilliseconds = MAX_BATCH_MILLISECONDS,
} = {}) {
  if (
    !Number.isFinite(maximumBatchMilliseconds)
    || maximumBatchMilliseconds <= 0
    || maximumBatchMilliseconds > MAX_BATCH_MILLISECONDS
  ) {
    throw new TypeError(
      `maximumBatchMilliseconds must be finite in 1...${MAX_BATCH_MILLISECONDS}.`,
    );
  }
  const plan = JSON.parse(await readFile(planPath, "utf8"));
  validateBatchPlan(plan);
  const limit = candidateLimit === undefined
    ? plan.candidates.length
    : candidateLimit;
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > plan.candidates.length) {
    throw new TypeError(
      "candidateLimit must be a positive integer within the plan length.",
    );
  }
  const planDigest = sha256(stableStringify(plan));
  const deadline = Date.now() + maximumBatchMilliseconds;
  const directory = await mkdtemp(join(tmpdir(), "fountain-dual-shading-batch-"));
  const rawRows = [];
  try {
    for (let index = 0; index < limit; index += 1) {
      const remaining = deadline - Date.now();
      if (remaining <= 0) {
        throw new Error(
          `batch exceeded ${maximumBatchMilliseconds}ms before candidate ${index + 1}.`,
        );
      }
      const candidate = plan.candidates[index];
      const candidatePath = join(
        directory,
        `${String(index + 1).padStart(2, "0")}-${candidate.id}.json`,
      );
      await writeFile(candidatePath, `${stableStringify(candidate, 2)}\n`, "utf8");
      const summary = await childEvaluation(
        candidatePath,
        Math.max(1, Math.min(MAX_CANDIDATE_MILLISECONDS, remaining)),
      );
      rawRows.push(selfContainedRow(plan.id, summary));
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
  if (Date.now() > deadline) {
    throw new Error(`batch exceeded ${maximumBatchMilliseconds}ms.`);
  }
  const classificationInput = rawRows.map((row) => ({
    candidate: row.candidate,
    evaluatorLockDigest: row.evaluatorLockDigest,
    hardGatesPassed: row.hardGates.passed,
    pareto: row.pareto,
  }));
  const classified = classifyBatchRows(classificationInput);
  const rows = rawRows.map((row, index) =>
    withDisposition(row, classified.dispositions[index]));
  if (record) await recordBatchRows(resultsPath, rows);
  const dispositionCounts = {
    "reject-hard": 0,
    "reject-dominated": 0,
    shortlist: 0,
  };
  for (const disposition of classified.dispositions) {
    dispositionCounts[disposition] += 1;
  }
  return Object.freeze({
    schemaVersion: "dual-shading-autoresearch-batch-result-v1",
    plan: Object.freeze({
      id: plan.id,
      digest: planDigest,
      plannedCandidateCount: plan.candidates.length,
      evaluatedCandidateCount: rows.length,
      complete: rows.length === plan.candidates.length,
    }),
    evaluatorLockDigest: classified.evaluatorLockDigest,
    dispositions: Object.freeze(dispositionCounts),
    nondominatedFront: classified.nondominatedFront,
    plateau: classified.plateau,
    scalarScore: null,
    automaticNinePointClaim: false,
    candidates: Object.freeze(rows),
  });
}

function usage() {
  return [
    "Usage: npm run research:dual-shading:batch -- [options]",
    "",
    "Options:",
    "  --plan <path>             strict batch plan JSON",
    "  --limit <n>               evaluate only the first n candidates",
    "  --record [path]           idempotently append self-contained rows",
    "  --format <json|ndjson>    deterministic summary format",
    "  --help                    show this help",
  ].join("\n");
}

function parseArguments(arguments_) {
  const options = {
    planPath: DEFAULT_BATCH_PLAN_PATH,
    resultsPath: DEFAULT_BATCH_RESULTS_PATH,
    record: false,
    candidateLimit: undefined,
    format: "json",
  };
  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index];
    if (argument === "--help") return { help: true };
    if (argument === "--plan") {
      options.planPath = arguments_[index + 1];
      index += 1;
      if (!options.planPath) throw new TypeError("--plan requires a path.");
      continue;
    }
    if (argument === "--limit") {
      options.candidateLimit = Number(arguments_[index + 1]);
      index += 1;
      continue;
    }
    if (argument === "--record") {
      options.record = true;
      const possiblePath = arguments_[index + 1];
      if (possiblePath && !possiblePath.startsWith("--")) {
        options.resultsPath = possiblePath;
        index += 1;
      }
      continue;
    }
    if (argument === "--format") {
      options.format = arguments_[index + 1];
      index += 1;
      if (!["json", "ndjson"].includes(options.format)) {
        throw new TypeError("--format must be json or ndjson.");
      }
      continue;
    }
    throw new TypeError(`unknown argument ${argument}`);
  }
  return options;
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  if (options.help) {
    process.stdout.write(`${usage()}\n`);
    return;
  }
  const summary = await runBatch(options);
  process.stdout.write(
    options.format === "ndjson"
      ? `${stableStringify(summary)}\n`
      : `${stableStringify(summary, 2)}\n`,
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  });
}
