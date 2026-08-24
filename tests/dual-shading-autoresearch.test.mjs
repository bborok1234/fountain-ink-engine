import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  DEFAULT_ARCHIVE_MANIFEST_PATH,
  validateR14Archive,
} from "../scripts/dual-shading-autoresearch/archive-validator.mjs";
import {
  evaluateCandidateFromFile as evaluateR14CandidateFromFile,
  verifyEvaluatorLock as verifyR14EvaluatorLock,
} from "../scripts/dual-shading-autoresearch/evaluator.mjs";
import { analyzePhysicalState } from "../scripts/dual-shading-autoresearch/metrics.mjs";

test("frozen R14 artifacts preserve all 49 rejected rows while current runtime is rejected", async () => {
  const report = await validateR14Archive();
  assert.equal(
    report.evaluatorLockDigest,
    "2cee2e1511347df5627dda778518ebcc67b82b3d13020c1334dea62187adf2e2",
  );
  assert.equal(report.resultRowCount, 1);
  assert.equal(report.batchResultRowCount, 48);
  assert.equal(report.archivedCandidateCount, 49);
  assert.equal(report.conclusion, "capacity-free-r14-plateau");
  assert.equal(report.currentRuntimeRejected, true);
  assert.notEqual(report.currentPackageVersion, "0.43.0-experimental.1");
});

test("the archived R14 evaluator cannot silently run or refresh against A7-3", async () => {
  await assert.rejects(
    verifyR14EvaluatorLock(),
    /evaluator lock mismatch|engine source tree lock mismatch|pinned to engine/,
  );
  await assert.rejects(
    evaluateR14CandidateFromFile(),
    /evaluator lock mismatch|engine source tree lock mismatch|pinned to engine/,
  );
});

test("archive manifest tampering fails before archived rows are trusted", async () => {
  const directory = await mkdtemp(join(tmpdir(), "fountain-r14-archive-"));
  const manifestPath = join(directory, "manifest.json");
  try {
    const manifest = JSON.parse(await readFile(
      DEFAULT_ARCHIVE_MANIFEST_PATH,
      "utf8",
    ));
    manifest.artifacts[
      "research/dual-shading-autoresearch/results.ndjson"
    ] = "0".repeat(64);
    await writeFile(manifestPath, `${JSON.stringify(manifest)}\n`, "utf8");
    await assert.rejects(
      validateR14Archive({ manifestPath }),
      /R14 archive artifact mismatch/,
    );

    delete manifest.artifacts[
      "research/dual-shading-autoresearch/results.ndjson"
    ];
    await writeFile(manifestPath, `${JSON.stringify(manifest)}\n`, "utf8");
    await assert.rejects(
      validateR14Archive({ manifestPath }),
      /archiveManifest\.artifacts keys mismatch/,
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("frozen R14 metrics still exclude near-zero visible-mass tails", () => {
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
