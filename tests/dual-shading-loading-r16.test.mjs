import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  CANDIDATE_SCHEMA_VERSION,
  MAX_CANDIDATE_MILLISECONDS,
  createEvaluatorLock,
  evaluateCandidateFromFile,
  stableStringify,
  validateCandidate,
  verifyEvaluatorLock,
} from "../scripts/dual-shading-autoresearch/a7-loading-r16/evaluator.mjs";
import {
  FIXTURE_CASE_COUNT,
  fixtureDefinitions,
  runFixture,
} from "../scripts/dual-shading-autoresearch/a7-loading-r16/fixtures.mjs";

async function withTemporaryLock(call) {
  const directory = await mkdtemp(join(tmpdir(), "fountain-r16-loading-"));
  const lockPath = join(directory, "evaluator-lock.json");
  try {
    const lock = await createEvaluatorLock();
    await writeFile(lockPath, `${stableStringify(lock, 2)}\n`);
    return await call({ directory, lock, lockPath });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

test("R16 loading matrix is exactly 81 primary plus 18 controls", () => {
  const definitions = fixtureDefinitions();
  assert.equal(FIXTURE_CASE_COUNT, 99);
  assert.equal(definitions.length, 99);
  assert.equal(definitions.filter(({ family }) => family === "main").length, 81);
  assert.equal(definitions.filter(({ family }) => family === "m-length").length, 9);
  assert.equal(definitions.filter(({ family }) => family === "equal-area").length, 9);
  assert.equal(new Set(definitions.map(({ id }) => id)).size, 99);
});

test("R16 loading control areas are matched within one percent", () => {
  for (const definition of fixtureDefinitions().filter(({ family }) => family !== "main")) {
    const fixture = runFixture(definition);
    assert.ok(fixture.areaMismatch <= 0.01, `${definition.id}: ${fixture.areaMismatch}`);
  }
});

test("R16 candidate has no tunable parameter", () => {
  const candidate = {
    schemaVersion: CANDIDATE_SCHEMA_VERSION,
    id: "dual-shading-loading-r16-keyboard-dye-areal-load-v1",
    hypothesis: "fixed hypothesis",
    method: "keyboard-dye-areal-load-v1",
  };
  assert.equal(validateCandidate(candidate), true);
  assert.throws(
    () => validateCandidate({ ...candidate, gain: 1.1 }),
    /keys mismatch/,
  );
});

test("R16 locked evaluator records contract-pass visual falsification without a nine-point claim", async () => {
  await withTemporaryLock(async ({ lock, lockPath }) => {
    assert.equal(lock.fixedBaseline.caseCount, 99);
    assert.equal(lock.fixedBaseline.maximumMilliseconds, MAX_CANDIDATE_MILLISECONDS);
    assert.equal(lock.predecessor.currentRuntimeRejected, true);
    const summary = await evaluateCandidateFromFile({ lockPath });
    assert.equal(summary.matrix.caseCount, 99);
    assert.equal(summary.hardGates.algebraPassed, true);
    assert.deepEqual(summary.hardGates.algebraFailures, []);
    assert.equal(summary.hardGates.visualPassed, false);
    assert.ok(summary.hardGates.visualFailures.length > 0);
    assert.equal(summary.status, "contract-pass-visual-falsified");
    assert.equal(summary.scientificConclusion, "loading-only-falsified");
    assert.equal(summary.scoreBefore, 6.3);
    assert.equal(summary.scoreAfter, 6.3);
    assert.equal(summary.automaticNinePointClaim, false);
    assert.equal(summary.humanReview.completed, false);
    assert.equal(
      summary.nextMethod,
      "ordered-deposit-time-plus-surface-lifetime-gated-pinned-redistribution",
    );
  });
});

test("R16 evaluator lock rejects one-byte logical tampering", async () => {
  await withTemporaryLock(async ({ directory, lock }) => {
    const path = join(directory, "tampered-lock.json");
    const tampered = structuredClone(lock);
    tampered.files["scripts/dual-shading-autoresearch/a7-loading-r16/metrics.mjs"] =
      "0".repeat(64);
    await writeFile(path, `${stableStringify(tampered, 2)}\n`);
    await assert.rejects(
      verifyEvaluatorLock({ lockPath: path }),
      /lock mismatch/,
    );
  });
});
