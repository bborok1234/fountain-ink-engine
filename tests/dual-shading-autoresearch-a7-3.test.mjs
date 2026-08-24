import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import test from "node:test";
import {
  CANDIDATE_SCHEMA_VERSION,
  DEFAULT_CANDIDATE_PATH,
  DEFAULT_LOCK_PATH,
  ENGINE_BASELINE_VERSION,
  MAX_CANDIDATE_MILLISECONDS,
  evaluateCandidateFromFile,
  formatResultNdjson,
  formatResultTsv,
  resultRow,
  stableStringify,
  validateCandidate,
  verifyEvaluatorLock,
} from "../scripts/dual-shading-autoresearch/a7-3/evaluator.mjs";
import {
  analyzeSharedVacancyCapacity,
} from "../scripts/dual-shading-autoresearch/a7-3/capacity-metrics.mjs";

let firstDuration = 0;
let secondDuration = 0;
const firstEvaluation = (async () => {
  const started = performance.now();
  const summary = await evaluateCandidateFromFile();
  firstDuration = performance.now() - started;
  return summary;
})();
const secondEvaluation = firstEvaluation.then(async () => {
  const started = performance.now();
  const summary = await evaluateCandidateFromFile();
  secondDuration = performance.now() - started;
  return summary;
});

test("A7-3 evaluator runs the locked 45-case Q-only baseline without a nine-point claim", async () => {
  const summary = await firstEvaluation;
  assert.equal(summary.candidate.schemaVersion, CANDIDATE_SCHEMA_VERSION);
  assert.equal(summary.candidate.id, "dual-shading-a7-3-q-075-baseline");
  assert.equal(summary.candidate.sharedAdsorptionCapacity, 0.075);
  assert.equal(summary.fixedBaseline.engineVersion, ENGINE_BASELINE_VERSION);
  assert.equal(summary.fixedBaseline.dyeRecipe, "edge-dye-study@15");
  assert.equal(summary.fixedBaseline.sharedAdsorptionCapacity, 0.075);
  assert.equal(summary.evaluatorMatrix.caseCount, 45);
  assert.equal(summary.evaluatorMatrix.repeatExact, true);
  assert.equal(summary.automaticNinePointClaim, false);
  assert.equal(summary.humanReview.requiredForAccepted, true);
  assert.equal(summary.humanReview.completed, false);
  assert.equal(summary.pareto.weightedScore, null);
  assert.equal(summary.predecessor.conclusion, "capacity-free-r14-plateau");
  assert.equal(summary.capacity.maximumOverflowPeak <= 2e-6, true);
  assert.match(summary.evaluatorMatrix.matrixDigest, /^[0-9a-f]{64}$/);
  assert.equal(
    summary.fixedBaseline.matrixDigest,
    summary.evaluatorMatrix.matrixDigest,
  );
  const ndjson = formatResultNdjson(summary);
  assert.equal(ndjson.split("\n").length, 2);
  assert.deepEqual(JSON.parse(ndjson).candidate, summary.candidate);
  assert.deepEqual(resultRow(summary).capacity, summary.capacity);
  assert.equal(formatResultTsv(summary, { includeHeader: true })
    .trimEnd().split("\n").length, 2);
});

test("A7-3 candidate schema exposes Q and rejects every retired control", async () => {
  const baseline = JSON.parse(await readFile(DEFAULT_CANDIDATE_PATH, "utf8"));
  assert.equal(validateCandidate(baseline), true);
  for (const [key, value] of [
    ["primaryDiffusivity", 0.1],
    ["primaryAdsorptionCapacity", 0.1],
    ["secondaryAdsorptionCapacity", 0.1],
    ["paletteGain", 2],
    ["edgeMixGain", 2],
  ]) {
    assert.throws(
      () => validateCandidate({ ...baseline, [key]: value }),
      /keys mismatch/,
    );
  }
  assert.throws(
    () => validateCandidate({ ...baseline, sharedAdsorptionCapacity: 0 }),
    /must be finite in/,
  );
  assert.throws(
    () => validateCandidate({ ...baseline, sharedAdsorptionCapacity: 0.3 }),
    /must be finite in/,
  );
});

test("A7-3 evaluator lock pins R15 and the immutable R14 predecessor", async () => {
  const lockInfo = await verifyEvaluatorLock();
  assert.equal(lockInfo.lock.engineVersion, ENGINE_BASELINE_VERSION);
  assert.equal(lockInfo.lock.fixedBaseline.dyeRecipe, "edge-dye-study@15");
  assert.equal(lockInfo.lock.fixedBaseline.sharedAdsorptionCapacity, 0.075);
  assert.equal(
    lockInfo.lock.predecessor.evaluatorLockDigest,
    "2cee2e1511347df5627dda778518ebcc67b82b3d13020c1334dea62187adf2e2",
  );

  const directory = await mkdtemp(join(tmpdir(), "fountain-a7-3-lock-"));
  const lockPath = join(directory, "lock.json");
  try {
    const lock = JSON.parse(await readFile(DEFAULT_LOCK_PATH, "utf8"));
    lock.predecessor.evaluatorLockDigest = "0".repeat(64);
    await writeFile(lockPath, `${JSON.stringify(lock)}\n`, "utf8");
    await assert.rejects(
      evaluateCandidateFromFile({ lockPath }),
      /predecessor archive provenance mismatch/,
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("locked A7-3 evaluation is deterministic and remains inside one budget", async () => {
  const [first, second] = await Promise.all([firstEvaluation, secondEvaluation]);
  assert.equal(stableStringify(first), stableStringify(second));
  assert.ok(firstDuration < MAX_CANDIDATE_MILLISECONDS);
  assert.ok(secondDuration < MAX_CANDIDATE_MILLISECONDS);
});

test("shared-vacancy diagnostics reject overflow and independent negative species", () => {
  const state = {
    width: 2,
    height: 1,
    initialSecondaryFraction: 0.25,
    adsorbedTotalMass: new Float32Array([0.075, 0.09]),
    adsorbedSecondaryResidualMass: new Float32Array([0, 0.03]),
  };
  const summary = analyzeSharedVacancyCapacity({ state, capacity: 0.075 });
  assert.equal(summary.overflowCells, 1);
  assert.equal(summary.negativeSpeciesCells, 0);
  assert.equal(summary.passed, false);

  state.adsorbedTotalMass[1] = 0.05;
  state.adsorbedSecondaryResidualMass[1] = 0.04;
  const negative = analyzeSharedVacancyCapacity({ state, capacity: 0.075 });
  assert.equal(negative.negativeSpeciesCells, 1);
  assert.equal(negative.passed, false);
});
