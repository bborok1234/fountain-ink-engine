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
  MAX_CANDIDATE_MILLISECONDS,
  assertPinnedEngineSourceDigest,
  assertPinnedDigests,
  evaluateCandidateFromFile,
  formatResultNdjson,
  formatResultTsv,
  resultRow,
  stableStringify,
  validateCandidate,
  verifyEvaluatorLock,
} from "../scripts/dual-shading-autoresearch/evaluator.mjs";
import { analyzePhysicalState } from "../scripts/dual-shading-autoresearch/metrics.mjs";

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

test("dual-shading autoresearch runs the locked 45-case R14 baseline honestly", async () => {
  const summary = await firstEvaluation;
  assert.equal(summary.candidate.schemaVersion, CANDIDATE_SCHEMA_VERSION);
  assert.equal(summary.candidate.id, "dual-shading-r14-baseline");
  assert.equal(summary.evaluatorMatrix.caseCount, 45);
  assert.equal(summary.evaluatorMatrix.repeatExact, true);
  assert.equal(summary.automaticNinePointClaim, false);
  assert.equal(summary.humanReview.requiredForAccepted, true);
  assert.equal(summary.humanReview.completed, false);
  assert.equal(summary.pareto.weightedScore, null);
  assert.equal(summary.status, "reject-hard");
  assert.ok(summary.hardGates.failures.some((failure) =>
    failure.endsWith("/optical-ab-too-weak")));
  assert.match(summary.evaluatorMatrix.matrixDigest, /^[0-9a-f]{64}$/);
  assert.equal(summary.fixedBaseline.matrixDigest, summary.evaluatorMatrix.matrixDigest);

  const ndjson = formatResultNdjson(summary);
  assert.equal(ndjson.split("\n").length, 2);
  assert.equal(JSON.parse(ndjson).resultId, summary.resultId);
  assert.deepEqual(resultRow(summary).candidate, summary.candidate);
  const tsv = formatResultTsv(summary, { includeHeader: true });
  assert.equal(tsv.trimEnd().split("\n").length, 2);
  assert.match(tsv, /candidateId/);
  assert.match(tsv, /dual-shading-r14-baseline/);
});

test("candidate.json is the strict sole six-rate hypothesis surface", async () => {
  const baseline = JSON.parse(await readFile(DEFAULT_CANDIDATE_PATH, "utf8"));
  assert.equal(validateCandidate(baseline), true);
  assert.throws(
    () => validateCandidate({ ...baseline, paletteGain: 2 }),
    /keys mismatch/,
  );
  const missing = { ...baseline };
  delete missing.secondaryDesorptionRate;
  assert.throws(() => validateCandidate(missing), /missing=secondaryDesorptionRate/);
  assert.throws(
    () => validateCandidate({ ...baseline, primaryDiffusivity: Number.NaN }),
    /primaryDiffusivity must be finite/,
  );

  const directory = await mkdtemp(join(tmpdir(), "fountain-autoresearch-candidate-"));
  const malformedPath = join(directory, "candidate.json");
  try {
    await writeFile(
      malformedPath,
      `${JSON.stringify({ ...baseline, paletteGain: 2 })}\n`,
      "utf8",
    );
    await assert.rejects(
      evaluateCandidateFromFile({ candidatePath: malformedPath }),
      /keys mismatch/,
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("evaluator lock integrity succeeds and a mismatch stops evaluation", async () => {
  const lockInfo = await verifyEvaluatorLock();
  const actual = { ...lockInfo.lock.files };
  actual["scripts/dual-shading-autoresearch/metrics.mjs"] =
    "0".repeat(64);
  assert.throws(
    () => assertPinnedDigests(lockInfo.lock.files, actual),
    /evaluator lock mismatch/,
  );
  assert.throws(
    () => assertPinnedEngineSourceDigest("a".repeat(64), "b".repeat(64)),
    /engine source tree lock mismatch/,
  );

  const directory = await mkdtemp(join(tmpdir(), "fountain-autoresearch-lock-"));
  const mismatchedLockPath = join(directory, "evaluator-lock.json");
  try {
    const mismatched = JSON.parse(await readFile(DEFAULT_LOCK_PATH, "utf8"));
    mismatched.files[
      "research/dual-shading-autoresearch/photo-topology-v1.json"
    ] = "0".repeat(64);
    await writeFile(mismatchedLockPath, `${JSON.stringify(mismatched)}\n`, "utf8");
    await assert.rejects(
      evaluateCandidateFromFile({ lockPath: mismatchedLockPath }),
      /evaluator lock mismatch/,
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("locked evaluation is deterministic and stays inside one candidate budget", async () => {
  const [first, second] = await Promise.all([firstEvaluation, secondEvaluation]);
  assert.equal(stableStringify(first), stableStringify(second));
  assert.ok(
    firstDuration < MAX_CANDIDATE_MILLISECONDS,
    `first evaluation took ${firstDuration}ms`,
  );
  assert.ok(
    secondDuration < MAX_CANDIDATE_MILLISECONDS,
    `second evaluation took ${secondDuration}ms`,
  );
});

test("near-zero visible-mass tails cannot inflate fraction topology", () => {
  const length = 60;
  const makePlane = () => new Float32Array(length);
  const state = {
    width: 20,
    height: 3,
    initialSecondaryFraction: 0.25,
    mobileTotalMass: makePlane(),
    mobileSecondaryResidualMass: makePlane(),
    adsorbedTotalMass: makePlane(),
    adsorbedSecondaryResidualMass: makePlane(),
    depthTotalMass: makePlane(),
    depthSecondaryResidualMass: makePlane(),
  };
  const contactMask = new Uint8Array(length);
  const body = [24, 25, 26, 27];
  const deltas = [-0.02, -0.01, 0.01, 0.02];
  for (let index = 0; index < body.length; index += 1) {
    state.mobileTotalMass[body[index]] = 1;
    state.mobileSecondaryResidualMass[body[index]] = deltas[index];
    contactMask[body[index]] = 1;
  }
  for (let index = 0; index < length; index += 1) {
    if (body.includes(index)) continue;
    state.mobileTotalMass[index] = 1e-9;
    state.mobileSecondaryResidualMass[index] = index % 2 === 0 ? 2e-10 : -2e-10;
  }
  const initialState = {
    ...state,
    mobileTotalMass: new Float32Array(state.mobileTotalMass),
    mobileSecondaryResidualMass: new Float32Array(
      state.mobileSecondaryResidualMass,
    ),
  };
  const physical = analyzePhysicalState({
    initialState,
    state,
    contactMask,
    fractionDeltaMinimum: 0.005,
    visibleMassAbsoluteMinimum: 1e-8,
    visibleMassRelativeMinimum: 0.001,
  });
  assert.equal(physical.visibleCells, 4);
  assert.equal(physical.q05, -0.02);
  assert.equal(physical.q95, 0.02);
  assert.equal(physical.fractionSpan, 0.04);
});
