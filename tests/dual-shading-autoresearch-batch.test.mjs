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
} from "../scripts/dual-shading-autoresearch/batch.mjs";
import { stableStringify } from "../scripts/dual-shading-autoresearch/evaluator.mjs";

const RATE_KEYS = [
  "primaryDiffusivity",
  "secondaryDiffusivity",
  "primaryAdsorptionRate",
  "secondaryAdsorptionRate",
  "primaryDesorptionRate",
  "secondaryDesorptionRate",
];
const BATCH_PLAN_R14_02_PATH = new URL(
  "../research/dual-shading-autoresearch/batch-plan-r14-02.json",
  import.meta.url,
);
const EXPECTED_R14_01_VECTORS = [
  [0.000025, 0.0008, 0.06, 0.001, 0.000005, 0.00002],
  [0.0001, 0.0008, 0.06, 0.001, 0.000005, 0.00002],
  [0.00005, 0.0004, 0.06, 0.001, 0.000005, 0.00002],
  [0.00005, 0.0016, 0.06, 0.001, 0.000005, 0.00002],
  [0.00005, 0.0008, 0.075, 0.001, 0.000005, 0.00002],
  [0.00005, 0.0008, 0.09, 0.001, 0.000005, 0.00002],
  [0.00005, 0.0008, 0.06, 0.0005, 0.000005, 0.00002],
  [0.00005, 0.0008, 0.06, 0.002, 0.000005, 0.00002],
  [0.00005, 0.0008, 0.06, 0.001, 0.0000025, 0.00002],
  [0.00005, 0.0008, 0.06, 0.001, 0.00002, 0.00002],
  [0.00005, 0.0008, 0.06, 0.001, 0.000005, 0.00001],
  [0.00005, 0.0008, 0.06, 0.001, 0.000005, 0.00008],
  [0.000025, 0.0016, 0.06, 0.001, 0.000005, 0.00002],
  [0.00005, 0.0008, 0.09, 0.0005, 0.000005, 0.00002],
  [0.00005, 0.0008, 0.09, 0.001, 0.0000025, 0.00008],
  [0.000025, 0.0016, 0.09, 0.0005, 0.0000025, 0.00008],
  [0.00005, 0.0008, 0.12, 0.001, 0.000005, 0.00002],
  [0.00005, 0.0008, 0.15, 0.001, 0.000005, 0.00002],
  [0.00005, 0.0008, 0.15, 0.005, 0.000005, 0.0001],
  [0.00005, 0.0008, 0.24, 0.001, 0.000005, 0.00002],
  [0.00005, 0.0008, 0.24, 0.04, 0.000005, 0.0004],
  [0.0008, 0.00005, 0.001, 0.06, 0.00002, 0.000005],
  [0.00005, 0.0008, 1, 0.001, 0.000005, 0.00002],
  [0.00005, 0.1, 0.06, 0.001, 0.000005, 0.00002],
];
const EXPECTED_R14_02_VECTORS = [
  [0.00005, 0.0008, 0.0625, 0.001, 0.000005, 0.00002],
  [0.00005, 0.0008, 0.065, 0.001, 0.000005, 0.00002],
  [0.00005, 0.0008, 0.07, 0.001, 0.000005, 0.00002],
  [0.00005, 0.0008, 0.08, 0.001, 0.000005, 0.00002],
  [0.00005, 0.0008, 0.1, 0.001, 0.000005, 0.00002],
  [0.00005, 0.0008, 0.11, 0.001, 0.000005, 0.00002],
  [0.00005, 0.0008, 0.13, 0.001, 0.000005, 0.00002],
  [0.00005, 0.0008, 0.14, 0.001, 0.000005, 0.00002],
  [0.00005, 0.0008, 0.07, 0.00025, 0.000005, 0.00002],
  [0.00005, 0.0008, 0.08, 0.00025, 0.000005, 0.00002],
  [0.00005, 0.0008, 0.1, 0.00025, 0.000005, 0.00002],
  [0.00005, 0.0008, 0.12, 0.00025, 0.000005, 0.00002],
  [0.00005, 0.0008, 0.07, 0.0015, 0.000005, 0.00002],
  [0.00005, 0.0008, 0.1, 0.0015, 0.000005, 0.00002],
  [0.00005, 0.0008, 0.12, 0.003, 0.000005, 0.00002],
  [0.00005, 0.0008, 0.1, 0.00025, 0, 0.0002],
  [0.00005, 0.0008, 0.1, 0.00025, 0, 0.0005],
  [0.00001, 0.0012, 0.08, 0.00025, 0.000005, 0.00002],
  [0.00001, 0.0012, 0.1, 0.00025, 0.000005, 0.00002],
  [0.00001, 0.0012, 0.12, 0.00025, 0.000005, 0.00002],
  [0.0001, 0.0006, 0.08, 0.0015, 0.000005, 0.00002],
  [0.0001, 0.0006, 0.1, 0.0015, 0.000005, 0.00002],
  [0.0002, 0.0004, 0.12, 0.003, 0.000005, 0.00002],
  [0, 0, 0.09, 0.0005, 0, 0.0001],
];

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

function frontRow(id, hardGatesPassed, values, lock = "a".repeat(64)) {
  return {
    candidate: { id },
    evaluatorLockDigest: lock,
    hardGatesPassed,
    pareto: values,
  };
}

test("batch plan pins all 24 ordered candidate vectors and rejects expansion", async () => {
  const plan = JSON.parse(await readFile(DEFAULT_BATCH_PLAN_PATH, "utf8"));
  assert.equal(validateBatchPlan(plan), true);
  assert.equal(plan.candidates.length, MAX_BATCH_CANDIDATES);
  assert.deepEqual(
    plan.candidates.map((candidate) => RATE_KEYS.map((key) => candidate[key])),
    EXPECTED_R14_01_VECTORS,
  );
  const tooMany = {
    ...plan,
    candidates: [
      ...plan.candidates,
      { ...plan.candidates[0], id: "dual-shading-b1-25-forbidden" },
    ],
  };
  assert.throws(() => validateBatchPlan(tooMany), /1\.\.\.24 candidates/);
  const malformed = structuredClone(plan);
  malformed.candidates[0].paletteGain = 2;
  assert.throws(() => validateBatchPlan(malformed), /keys mismatch/);
});

test("R14-02 batch plan pins the ordered adsorption and interaction vectors", async () => {
  const plan = JSON.parse(await readFile(BATCH_PLAN_R14_02_PATH, "utf8"));
  assert.equal(validateBatchPlan(plan), true);
  assert.equal(plan.id, "dual-shading-batch-r14-02");
  assert.equal(plan.candidates.length, MAX_BATCH_CANDIDATES);
  assert.deepEqual(
    plan.candidates.map((candidate) => RATE_KEYS.map((key) => candidate[key])),
    EXPECTED_R14_02_VECTORS,
  );
  assert.deepEqual(
    plan.candidates.map(({ id }) => id.match(/dual-shading-b2-(\d{2})-/)?.[1]),
    Array.from({ length: 24 }, (_value, index) =>
      String(index + 1).padStart(2, "0")),
  );
});

test("Pareto front excludes hard failures and never lets a failing baseline dominate", () => {
  const rows = [
    frontRow("hard-failing-baseline", false, pareto(100)),
    frontRow("strong", true, pareto(2)),
    frontRow("dominated", true, pareto(1)),
    frontRow("tradeoff", true, pareto(0.5, { signedFractionFidelity: 3 })),
  ];
  const result = classifyBatchRows(rows);
  assert.deepEqual(
    result.dispositions,
    ["reject-hard", "shortlist", "reject-dominated", "shortlist"],
  );
  assert.deepEqual(result.nondominatedFront, ["strong", "tradeoff"]);
  assert.equal(result.plateau, false);
  assert.equal(
    classifyBatchRows([rows[0]]).plateau,
    true,
  );
  assert.throws(
    () => classifyBatchRows([
      rows[1],
      frontRow("other-lock", true, pareto(3), "b".repeat(64)),
    ]),
    /one evaluator lock digest/,
  );
});

test("batch recording is self-contained, idempotent, and single-writer", async () => {
  const directory = await mkdtemp(join(tmpdir(), "fountain-batch-record-"));
  const resultsPath = join(directory, "results.ndjson");
  const row = {
    schemaVersion: BATCH_RESULT_SCHEMA_VERSION,
    batchPlanId: "dual-shading-batch-test",
    resultId: "result-1",
    disposition: "reject-hard",
    candidate: {
      id: "dual-shading-test",
      primaryDiffusivity: 0.1,
    },
    evaluatorLockDigest: "a".repeat(64),
    hardGates: { passed: false, failures: ["test"] },
    pareto: pareto(1),
    automaticNinePointClaim: false,
  };
  try {
    assert.equal(await recordBatchRows(resultsPath, [row]), 1);
    assert.equal(await recordBatchRows(resultsPath, [row]), 0);
    const lines = (await readFile(resultsPath, "utf8")).trim().split("\n");
    assert.equal(lines.length, 1);
    assert.equal(stableStringify(JSON.parse(lines[0])), stableStringify(row));

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

test("archived R14 batch execution rejects the current A7-3 runtime without recording", async () => {
  const resultsBefore = await readFile(DEFAULT_BATCH_RESULTS_PATH, "utf8");
  await assert.rejects(
    runBatch({ candidateLimit: 1, record: false }),
    /candidate child failed.*(?:evaluator lock mismatch|engine source tree lock mismatch|pinned to engine)/s,
  );
  assert.equal(await readFile(DEFAULT_BATCH_RESULTS_PATH, "utf8"), resultsBefore);
});
