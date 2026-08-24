import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  CANDIDATE_SCHEMA_VERSION,
  DEFAULT_CANDIDATE_PATH,
  evaluateCandidateFromFile,
  stableStringify,
  validateCandidate,
  verifyEvaluatorLock,
} from "../scripts/dual-shading-autoresearch/a7-3/evaluator.mjs";
import {
  DEFAULT_A7_3_RESULT_PATH,
  validateA7_3Archive,
} from "../scripts/dual-shading-autoresearch/a7-3/archive-validator.mjs";
import {
  analyzeSharedVacancyCapacity,
} from "../scripts/dual-shading-autoresearch/a7-3/capacity-metrics.mjs";

test("archived A7-3 baseline remains sealed and rejects the R16 runtime", async () => {
  const report = await validateA7_3Archive();
  const rows = (await readFile(DEFAULT_A7_3_RESULT_PATH, "utf8"))
    .split("\n").filter(Boolean).map(JSON.parse);
  assert.equal(report.currentRuntimeRejected, true);
  assert.equal(report.resultRowCount, 1);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].candidate.schemaVersion, CANDIDATE_SCHEMA_VERSION);
  assert.equal(rows[0].candidate.id, "dual-shading-a7-3-q-075-baseline");
  assert.equal(rows[0].candidate.sharedAdsorptionCapacity, 0.075);
  assert.equal(rows[0].status, "reject-hard");
  assert.equal(rows[0].automaticNinePointClaim, false);
  assert.equal(rows[0].predecessor.conclusion, "capacity-free-r14-plateau");
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

test("archived A7-3 live lock cannot run or refresh against R16", async () => {
  const rejectedRuntime = /evaluator lock mismatch|source tree lock mismatch/;
  await assert.rejects(verifyEvaluatorLock(), rejectedRuntime);
  await assert.rejects(evaluateCandidateFromFile(), rejectedRuntime);
});

test("terminal A7-3 archive validation is deterministic", async () => {
  const [first, second] = await Promise.all([
    validateA7_3Archive(),
    validateA7_3Archive(),
  ]);
  assert.equal(stableStringify(first), stableStringify(second));
  assert.equal(first.currentRuntimeRejected, true);
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
