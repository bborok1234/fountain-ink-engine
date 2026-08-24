import assert from "node:assert/strict";
import { mkdtemp, open, readFile, rm, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  BATCH_RESULT_SCHEMA_VERSION,
  DEFAULT_BATCH_PLAN_PATH,
  DEFAULT_BATCH_RESULTS_PATH,
  MAX_BATCH_CANDIDATES,
  classifyBatchRows,
  recordBatchRows,
  runBatch,
  validateBatchPlan,
} from "../scripts/dual-shading-autoresearch/a7-3/batch.mjs";
import { stableStringify } from "../scripts/dual-shading-autoresearch/a7-3/evaluator.mjs";

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

function pareto(value, overrides = {}) {
  return {
    signedFractionFidelity: value,
    connectedPatchCoherence: value,
    opticalAreaFidelity: value,
    opticalDeltaFidelity: value,
    minimumReadability: value,
    paperResponseFidelity: value,
    nibResponseFidelity: value,
    artifactIntegrity: value,
    ...overrides,
  };
}

test("first A7-3 batch is exactly eight ordered Q-only candidates", async () => {
  const plan = JSON.parse(await readFile(DEFAULT_BATCH_PLAN_PATH, "utf8"));
  assert.equal(validateBatchPlan(plan), true);
  assert.equal(plan.id, "dual-shading-a7-3-batch-q-01");
  assert.equal(plan.candidates.length, 8);
  assert.ok(plan.candidates.length <= MAX_BATCH_CANDIDATES);
  assert.deepEqual(
    plan.candidates.map(({ sharedAdsorptionCapacity }) =>
      sharedAdsorptionCapacity),
    EXPECTED_CAPACITIES,
  );
  assert.ok(plan.candidates.every((candidate) =>
    Object.keys(candidate).sort().join(",")
      === "hypothesis,id,note,schemaVersion,sharedAdsorptionCapacity"));

  const expanded = {
    ...plan,
    candidates: [
      ...plan.candidates,
      { ...plan.candidates[0], id: "dual-shading-a7-3-q-duplicate-id" },
    ],
  };
  assert.throws(() => validateBatchPlan(expanded), /capacity .* duplicated/);
});

test("A7-3 Pareto classification never crosses evaluator locks", () => {
  const lock = "a".repeat(64);
  const rows = [
    { candidate: { id: "hard" }, evaluatorLockDigest: lock, hardGatesPassed: false, pareto: pareto(100) },
    { candidate: { id: "strong" }, evaluatorLockDigest: lock, hardGatesPassed: true, pareto: pareto(2) },
    { candidate: { id: "weak" }, evaluatorLockDigest: lock, hardGatesPassed: true, pareto: pareto(1) },
  ];
  const result = classifyBatchRows(rows);
  assert.deepEqual(
    result.dispositions,
    ["reject-hard", "shortlist", "reject-dominated"],
  );
  assert.throws(
    () => classifyBatchRows([
      rows[1],
      { ...rows[2], evaluatorLockDigest: "b".repeat(64) },
    ]),
    /one A7-3 evaluator lock digest/,
  );
});

test("A7-3 batch recording is self-contained, idempotent and single-writer", async () => {
  const directory = await mkdtemp(join(tmpdir(), "fountain-a7-3-record-"));
  const resultsPath = join(directory, "results.ndjson");
  const row = {
    schemaVersion: BATCH_RESULT_SCHEMA_VERSION,
    batchPlanId: "dual-shading-a7-3-batch-test",
    resultId: "result-1",
    disposition: "reject-hard",
    candidate: {
      id: "dual-shading-a7-3-test",
      sharedAdsorptionCapacity: 0.075,
    },
    evaluatorLockDigest: "a".repeat(64),
    hardGates: { passed: false, failures: ["test"] },
    pareto: pareto(1),
    automaticNinePointClaim: false,
  };
  try {
    assert.equal(await recordBatchRows(resultsPath, [row]), 1);
    assert.equal(await recordBatchRows(resultsPath, [row]), 0);
    const line = (await readFile(resultsPath, "utf8")).trim();
    assert.equal(stableStringify(JSON.parse(line)), stableStringify(row));
    const held = await open(`${resultsPath}.lock`, "wx");
    try {
      await assert.rejects(
        recordBatchRows(resultsPath, [row]),
        /writer lock already exists/,
      );
    } finally {
      await held.close();
      await unlink(`${resultsPath}.lock`);
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("recorded A7-3 batch covers the exact plan and never claims nine points", async () => {
  const plan = JSON.parse(await readFile(DEFAULT_BATCH_PLAN_PATH, "utf8"));
  const rows = (await readFile(DEFAULT_BATCH_RESULTS_PATH, "utf8"))
    .split("\n").filter(Boolean).map(JSON.parse);
  assert.equal(rows.length, plan.candidates.length);
  assert.deepEqual(
    rows.map((row) => row.candidate),
    plan.candidates,
  );
  assert.ok(rows.every((row) =>
    row.schemaVersion === BATCH_RESULT_SCHEMA_VERSION
    && row.automaticNinePointClaim === false
    && row.predecessor.conclusion === "capacity-free-r14-plateau"));
});

test("one-candidate A7-3 child evaluation is locked and does not record", async () => {
  const resultsBefore = await readFile(DEFAULT_BATCH_RESULTS_PATH, "utf8");
  const result = await runBatch({ candidateLimit: 1, record: false });
  assert.equal(result.plan.plannedCandidateCount, 8);
  assert.equal(result.plan.evaluatedCandidateCount, 1);
  assert.equal(result.plan.complete, false);
  assert.equal(
    result.candidates[0].candidate.sharedAdsorptionCapacity,
    EXPECTED_CAPACITIES[0],
  );
  assert.equal(result.scalarScore, null);
  assert.equal(result.automaticNinePointClaim, false);
  assert.equal(await readFile(DEFAULT_BATCH_RESULTS_PATH, "utf8"), resultsBefore);
});
