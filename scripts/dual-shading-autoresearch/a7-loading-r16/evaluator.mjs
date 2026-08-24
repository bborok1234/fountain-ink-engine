import { createHash } from "node:crypto";
import { performance } from "node:perf_hooks";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import {
  EDGE_DYE_COMPONENT_RECIPE_R16,
  EDGE_DYE_COMPONENT_RECIPE_R15,
  KEYBOARD_DYE_AREAL_LOAD_CONTRACT_VERSION,
  ORDINARY_GREEN_RECIPE_R12,
  PAPER_SURFACE_BALANCED_R2,
  WARM_WHITE_PAPER_OPTICAL_PROFILE_R1,
  compositeDyeFiniteLoadingTransportedOptical,
  compositeDyeFiniteLoadingWellMixedControlOptical,
  createKeyboardSurfaceState,
  finiteLoadingDyeOpticalModelVersion,
  getKeyboardDyeArealLoadScale,
  serializeDyeComponentRecipe,
} from "fountain-ink-engine";
import {
  ENGINE_ROOT,
  computeCurrentEngineSourceTreeDigest,
  stableStringify,
} from "../archive-validator.mjs";
import { validateA7_3Archive } from "../a7-3/archive-validator.mjs";
import {
  FIXTURE_CASE_COUNT,
  FLOWS,
  NIB_IDS,
  PAPERS,
  PRIMARY_SHAPES,
  fixtureDefinitions,
  runFixture,
} from "./fixtures.mjs";
import {
  analyzeLoad,
  analyzeOptical,
  analyzePhysical,
  roundMetric,
} from "./metrics.mjs";

export const CANDIDATE_SCHEMA_VERSION =
  "dual-shading-loading-r16-candidate-v1";
export const EVALUATOR_LOCK_SCHEMA_VERSION =
  "dual-shading-loading-r16-evaluator-lock-v1";
export const MAX_CANDIDATE_MILLISECONDS = 30_000;
export const ENGINE_BASELINE_VERSION = "0.45.0-experimental.1";
export const DEFAULT_CANDIDATE_PATH = new URL(
  "../../../research/dual-shading-autoresearch/a7-loading-r16/candidate.json",
  import.meta.url,
);
export const DEFAULT_LOCK_PATH = new URL(
  "../../../research/dual-shading-autoresearch/a7-loading-r16/evaluator-lock.json",
  import.meta.url,
);
export const DEFAULT_RESULTS_PATH = new URL(
  "../../../research/dual-shading-autoresearch/a7-loading-r16/results.ndjson",
  import.meta.url,
);

const LOCKED_PATHS = Object.freeze([
  "package.json",
  "src/canvas2d/keyboard-dye-areal-load.js",
  "src/contracts/keyboard-dye-areal-load.js",
  "scripts/dual-shading-autoresearch/a7-loading-r16/fixtures.mjs",
  "scripts/dual-shading-autoresearch/a7-loading-r16/metrics.mjs",
  "scripts/dual-shading-autoresearch/a7-loading-r16/evaluator.mjs",
  "scripts/dual-shading-autoresearch/a7-loading-r16/run.mjs",
  "research/dual-shading-autoresearch/a7-loading-r16/PROGRAM.md",
  "research/dual-shading-autoresearch/a7-loading-r16/candidate.json",
  "research/dual-shading-autoresearch/a7-3/archive-manifest.json",
]);

export const GATES = Object.freeze({
  loadTolerance: 2e-6,
  areaMismatchMaximum: 0.01,
  overlapClampShareMaximum: 0.05,
  conservationRelativeMaximum: 5e-5,
  nonnegativeTolerance: 2e-6,
  fractionDeltaMinimum: 0.008,
  signedPatchMinimumPixels: 5,
  globalRecolorAreaMaximum: 0.72,
  interiorShareMinimum: 0.08,
  interiorShareMaximum: 0.92,
  speckleShareMaximum: 0.2,
  readabilityMinimum: 0.82,
  opticalChangedAreaMinimum: 0.015,
  opticalChangedAreaMaximum: 0.7,
  opticalMeanChannelDeltaMinimum: 0.25,
  opticalPatchMinimumPixels: 4,
  opticalPatchShareMinimum: 0.25,
  broadToUefSpanMinimum: 0.9,
  wetToDryBroadSpanMinimum: 1.1,
  wetToDryBroadOpticalAreaDeltaMinimum: 0.015,
  overlapOccupancyDeltaMinimum: 0.05,
  junctionToBodySpanMinimum: 1.1,
  mLengthBodySpanVariationMaximum: 0.1,
});

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function typedDigest(value) {
  return sha256(Buffer.from(value.buffer, value.byteOffset, value.byteLength));
}

function imageDigest(...images) {
  const hash = createHash("sha256");
  for (const image of images) {
    hash.update(Buffer.from(image.data.buffer, image.data.byteOffset, image.data.byteLength));
  }
  return hash.digest("hex");
}

function assertPlainObject(value, path) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${path} must be a plain object.`);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError(`${path} must have a plain prototype.`);
  }
}

function assertExactKeys(value, keys, path) {
  assertPlainObject(value, path);
  const expected = new Set(keys);
  const actual = Reflect.ownKeys(value);
  const unexpected = actual.filter((key) => typeof key !== "string" || !expected.has(key));
  const missing = keys.filter((key) => !Object.hasOwn(value, key));
  if (unexpected.length > 0 || missing.length > 0) {
    throw new TypeError(
      `${path} keys mismatch; unexpected=${unexpected.map(String).join(",") || "none"}; missing=${missing.join(",") || "none"}.`,
    );
  }
}

function assertSha256(value, path) {
  if (!/^[0-9a-f]{64}$/.test(value ?? "")) {
    throw new TypeError(`${path} must be SHA-256 hex.`);
  }
}

export function validateCandidate(candidate) {
  assertExactKeys(candidate, [
    "schemaVersion",
    "id",
    "hypothesis",
    "method",
  ], "candidate");
  if (
    candidate.schemaVersion !== CANDIDATE_SCHEMA_VERSION
    || candidate.id !== "dual-shading-loading-r16-keyboard-dye-areal-load-v1"
    || candidate.method !== KEYBOARD_DYE_AREAL_LOAD_CONTRACT_VERSION
  ) {
    throw new TypeError("R16 loading candidate identity is immutable.");
  }
  if (typeof candidate.hypothesis !== "string" || candidate.hypothesis.length > 500) {
    throw new TypeError("candidate.hypothesis must be a string of at most 500 characters.");
  }
  return true;
}

function compositePair(fixture) {
  const common = {
    pixelWidth: fixture.state.width,
    pixelHeight: fixture.state.height,
    baseRgba: fixture.baseRgba,
    concentration: fixture.concentration,
    dyeComponent: fixture.state,
    dyeComponentRecipe: EDGE_DYE_COMPONENT_RECIPE_R16,
    paperOpticalProfile: WARM_WHITE_PAPER_OPTICAL_PROFILE_R1,
  };
  return Object.freeze({
    transported: compositeDyeFiniteLoadingTransportedOptical(common),
    wellMixed: compositeDyeFiniteLoadingWellMixedControlOptical(common),
  });
}

function compactCase(fixture, load, physical, optical, opticalPair) {
  return Object.freeze({
    id: fixture.id,
    family: fixture.family,
    nibId: fixture.nibId,
    targetNib: fixture.targetNib ?? null,
    flow: fixture.flow,
    paper: fixture.paperId,
    shape: fixture.shape,
    length: roundMetric(fixture.length),
    integratedAlphaArea: roundMetric(fixture.integratedAlphaArea),
    areaMismatch: roundMetric(fixture.areaMismatch),
    loadDigest: typedDigest(fixture.arealLoad.data),
    stateDigest: sha256(stableStringify({
      mobileTotalMass: typedDigest(fixture.state.mobileTotalMass),
      mobileSecondaryResidualMass: typedDigest(fixture.state.mobileSecondaryResidualMass),
      adsorbedTotalMass: typedDigest(fixture.state.adsorbedTotalMass),
      adsorbedSecondaryResidualMass: typedDigest(fixture.state.adsorbedSecondaryResidualMass),
      depthTotalMass: typedDigest(fixture.state.depthTotalMass),
      depthSecondaryResidualMass: typedDigest(fixture.state.depthSecondaryResidualMass),
    })),
    opticalDigest: imageDigest(opticalPair.transported, opticalPair.wellMixed),
    clamp: fixture.clamp,
    acceptedDeposit: fixture.acceptedDeposit,
    load,
    physical,
    optical,
  });
}

function mean(values) {
  return values.length === 0
    ? 0
    : values.reduce((sum, value) => sum + value, 0) / values.length;
}

function average(cases, predicate, select) {
  return mean(cases.filter(predicate).map(select));
}

function findMain(cases, { nibId, flow, paper, shape }) {
  return cases.find((entry) => entry.family === "main"
    && entry.nibId === nibId && entry.flow === flow
    && entry.paper === paper && entry.shape === shape);
}

function dyeStateDigest(state) {
  return sha256(stableStringify({
    mobileTotalMass: typedDigest(state.mobileTotalMass),
    mobileSecondaryResidualMass: typedDigest(state.mobileSecondaryResidualMass),
    adsorbedTotalMass: typedDigest(state.adsorbedTotalMass),
    adsorbedSecondaryResidualMass: typedDigest(state.adsorbedSecondaryResidualMass),
    depthTotalMass: typedDigest(state.depthTotalMass),
    depthSecondaryResidualMass: typedDigest(state.depthSecondaryResidualMass),
  }));
}

function rejects(call, pattern) {
  try {
    call();
  } catch (error) {
    return pattern.test(String(error?.message));
  }
  return false;
}

function runContractProbes(representative) {
  const common = [
    representative.surfaceDeposit,
    PAPER_SURFACE_BALANCED_R2,
    0x13579bdf,
    ORDINARY_GREEN_RECIPE_R12,
    null,
  ];
  const r16MissingRejected = rejects(
    () => createKeyboardSurfaceState(
      ...common,
      EDGE_DYE_COMPONENT_RECIPE_R16,
      null,
      null,
    ),
    /required.*schema 14|schema 14.*required/i,
  );
  const legacyLoadRejected = rejects(
    () => createKeyboardSurfaceState(
      ...common,
      EDGE_DYE_COMPONENT_RECIPE_R15,
      null,
      representative.arealLoad,
    ),
    /only valid.*schema 14|schema 14.*only valid/i,
  );
  const legacyFirst = createKeyboardSurfaceState(
    ...common,
    EDGE_DYE_COMPONENT_RECIPE_R15,
  );
  const legacySecond = createKeyboardSurfaceState(
    ...common,
    EDGE_DYE_COMPONENT_RECIPE_R15,
  );
  return Object.freeze({
    r16MissingRejected,
    legacyLoadRejected,
    legacyRepeatExact:
      dyeStateDigest(legacyFirst.dyeComponent)
        === dyeStateDigest(legacySecond.dyeComponent),
  });
}

function algebraGates(fixtures, cases, probes) {
  const failures = [];
  if (!probes.r16MissingRejected) failures.push("contract/r16-missing-load-rejected");
  if (!probes.legacyLoadRejected) failures.push("contract/r15-load-rejected");
  if (!probes.legacyRepeatExact) failures.push("contract/r15-repeat-exact");
  const fixtureById = new Map(fixtures.map((fixture) => [fixture.id, fixture]));
  for (const entry of cases) {
    if (!entry.load.repeatExact) failures.push(`${entry.id}/load-repeat`);
    if (!entry.load.finiteNonnegative) failures.push(`${entry.id}/load-finite-nonnegative`);
    if (!entry.load.outsideZero) failures.push(`${entry.id}/load-outside-contact`);
    if (entry.family !== "main" && entry.areaMismatch > GATES.areaMismatchMaximum) {
      failures.push(`${entry.id}/area-match`);
    }
    const clampMaximum = entry.shape === "single"
      ? 0
      : GATES.overlapClampShareMaximum;
    if (entry.clamp.share > clampMaximum) failures.push(`${entry.id}/ordinary-clamp`);
    if (
      entry.acceptedDeposit.waterMaximum > 1.4
      || entry.acceptedDeposit.mobileMaximum > 1.8
      || entry.acceptedDeposit.dyeAcceptedMassMaximumError > GATES.loadTolerance
      || entry.acceptedDeposit.residualMaximum !== 0
    ) failures.push(`${entry.id}/accepted-deposit-contract`);
    const physical = entry.physical;
    if (!physical.allFinite || physical.minimumSpecies < -GATES.nonnegativeTolerance) {
      failures.push(`${entry.id}/finite-nonnegative`);
    }
    if (
      physical.initialSecondaryFraction
        !== EDGE_DYE_COMPONENT_RECIPE_R16.initialSecondaryFraction
      || physical.initialResidualMaximum !== 0
    ) failures.push(`${entry.id}/f0-r0`);
    if (
      physical.primaryConservationError > GATES.conservationRelativeMaximum
      || physical.secondaryConservationError > GATES.conservationRelativeMaximum
      || physical.residualConservationError > GATES.conservationRelativeMaximum
    ) failures.push(`${entry.id}/species-conservation`);
    if (entry.optical.alphaDeltaMaximum !== 0) {
      failures.push(`${entry.id}/optical-alpha-contract`);
    }
  }
  for (const paper of PAPERS.map((entry) => entry.id)) {
    const single = findMain(cases, { nibId: "M", flow: 58, paper, shape: "single" });
    if (Math.abs(single.load.interiorMaximum - 1) > GATES.loadTolerance) {
      failures.push(`main/M/58/${paper}/single/interior-one`);
    }
  }
  for (const nibId of NIB_IDS) {
    for (const flow of FLOWS) {
      for (const paper of PAPERS.map((entry) => entry.id)) {
        const single = findMain(cases, { nibId, flow, paper, shape: "single" });
        const double = findMain(cases, { nibId, flow, paper, shape: "double" });
        const singleFixture = fixtureById.get(single.id);
        const doubleFixture = fixtureById.get(double.id);
        const ratioError = Math.abs(double.load.total / single.load.total - 2);
        let fieldError = 0;
        for (let index = 0; index < singleFixture.arealLoad.data.length; index += 1) {
          fieldError = Math.max(
            fieldError,
            Math.abs(doubleFixture.arealLoad.data[index]
              - 2 * singleFixture.arealLoad.data[index]),
          );
        }
        if (ratioError > GATES.loadTolerance || fieldError > GATES.loadTolerance) {
          failures.push(`${double.id}/exact-double`);
        }
        const cross = findMain(cases, { nibId, flow, paper, shape: "cross" });
        if (cross.load.crossJunctionToArmRatio < 1.9) {
          failures.push(`${cross.id}/junction-load`);
        }
      }
    }
  }
  for (const nibId of NIB_IDS) {
    for (const paper of PAPERS.map((entry) => entry.id)) {
      for (const shape of PRIMARY_SHAPES) {
        const totals = FLOWS.map((flow) =>
          findMain(cases, { nibId, flow, paper, shape }).load.total);
        if (!(totals[0] < totals[1] && totals[1] < totals[2])) {
          failures.push(`main/${nibId}/${paper}/${shape}/flow-monotonic`);
        }
      }
    }
  }
  return Object.freeze([...new Set(failures)].sort());
}

function visualGates(cases) {
  const failures = [];
  for (const entry of cases) {
    const physical = entry.physical;
    const optical = entry.optical;
    if (
      optical.readabilityContrastRatio < GATES.readabilityMinimum
      || optical.readabilityRetentionRatio < GATES.readabilityMinimum
    ) failures.push(`${entry.id}/readability`);
    if (entry.family !== "main") continue;
    if (
      physical.q05 > -GATES.fractionDeltaMinimum
      || physical.q95 < GATES.fractionDeltaMinimum
      || physical.positivePatchPixels < GATES.signedPatchMinimumPixels
      || physical.negativePatchPixels < GATES.signedPatchMinimumPixels
    ) failures.push(`${entry.id}/signed-patches`);
    if (physical.signedAreaRatio > GATES.globalRecolorAreaMaximum) {
      failures.push(`${entry.id}/global-recolor`);
    }
    if (
      physical.signedInteriorShare < GATES.interiorShareMinimum
      || physical.signedInteriorShare > GATES.interiorShareMaximum
    ) failures.push(`${entry.id}/perfect-outline`);
    if (physical.speckleShare > GATES.speckleShareMaximum) {
      failures.push(`${entry.id}/state-speckle`);
    }
    if (
      optical.changedAreaRatio < GATES.opticalChangedAreaMinimum
      || optical.meanMaximumChannelDelta < GATES.opticalMeanChannelDeltaMinimum
    ) failures.push(`${entry.id}/optical-ab-too-weak`);
    if (optical.changedAreaRatio > GATES.opticalChangedAreaMaximum) {
      failures.push(`${entry.id}/optical-global-recolor`);
    }
    if (
      optical.changedPatchPixels < GATES.opticalPatchMinimumPixels
      || optical.changedPatchShare < GATES.opticalPatchShareMinimum
    ) failures.push(`${entry.id}/optical-fragmented`);
    if (
      optical.changedInteriorShare < GATES.interiorShareMinimum
      || optical.changedInteriorShare > GATES.interiorShareMaximum
    ) failures.push(`${entry.id}/optical-outline`);
    if (optical.changedSpeckleShare > GATES.speckleShareMaximum) {
      failures.push(`${entry.id}/optical-speckle`);
    }
  }

  const main = cases.filter((entry) => entry.family === "main");
  const byNib = Object.fromEntries(NIB_IDS.map((nibId) => [
    nibId,
    average(main, (entry) => entry.nibId === nibId, (entry) => entry.physical.fractionSpan),
  ]));
  const broadToUef = byNib.B / Math.max(byNib.UEF, 1e-12);
  if (broadToUef < GATES.broadToUefSpanMinimum) {
    failures.push("visual/broad-to-uef-span");
  }
  const broadDrySpan = average(
    main,
    (entry) => entry.nibId === "B" && entry.flow === 30,
    (entry) => entry.physical.fractionSpan,
  );
  const broadWetSpan = average(
    main,
    (entry) => entry.nibId === "B" && entry.flow === 85,
    (entry) => entry.physical.fractionSpan,
  );
  const broadDryOptical = average(
    main,
    (entry) => entry.nibId === "B" && entry.flow === 30,
    (entry) => entry.optical.changedAreaRatio,
  );
  const broadWetOptical = average(
    main,
    (entry) => entry.nibId === "B" && entry.flow === 85,
    (entry) => entry.optical.changedAreaRatio,
  );
  if (broadWetSpan / Math.max(broadDrySpan, 1e-12) < GATES.wetToDryBroadSpanMinimum) {
    failures.push("visual/wet-to-dry-broad-span");
  }
  if (broadWetOptical - broadDryOptical < GATES.wetToDryBroadOpticalAreaDeltaMinimum) {
    failures.push("visual/wet-to-dry-broad-optical-area");
  }
  for (const shape of ["double", "cross"]) {
    const occupancyDelta = average(
      main,
      (entry) => entry.shape === shape,
      (entry) => entry.load.highLoadOccupancy,
    ) - average(
      main,
      (entry) => entry.shape === "single",
      (entry) => entry.load.highLoadOccupancy,
    );
    if (occupancyDelta < GATES.overlapOccupancyDeltaMinimum) {
      failures.push(`visual/${shape}-occupancy`);
    }
  }
  const crossJunctionToBody = average(
    main,
    (entry) => entry.shape === "cross",
    (entry) => entry.physical.junctionFractionSpan
      / Math.max(entry.physical.bodyFractionSpan, 1e-12),
  );
  if (crossJunctionToBody < GATES.junctionToBodySpanMinimum) {
    failures.push("visual/junction-to-body-span");
  }
  const mLengths = cases.filter((entry) => entry.family === "m-length");
  const mLengthSpans = mLengths.map((entry) => entry.physical.bodyFractionSpan);
  const mLengthVariation = (Math.max(...mLengthSpans) - Math.min(...mLengthSpans))
    / Math.max(mean(mLengthSpans), 1e-12);
  if (mLengthVariation > GATES.mLengthBodySpanVariationMaximum) {
    failures.push("visual/m-length-body-span-variation");
  }
  for (const paper of PAPERS.map((entry) => entry.id)) {
    const equalB = cases.find((entry) => entry.family === "equal-area"
      && entry.nibId === "B" && entry.paper === paper);
    const equalUef = cases.find((entry) => entry.family === "equal-area"
      && entry.nibId === "UEF" && entry.paper === paper);
    if (equalB.physical.bodyFractionSpan < equalUef.physical.bodyFractionSpan) {
      failures.push(`visual/equal-area-${paper}-b-below-uef`);
    }
    const constantB = findMain(cases, {
      nibId: "B", flow: 58, paper, shape: "single",
    });
    const matchedM = cases.find((entry) => entry.family === "m-length"
      && entry.targetNib === "B" && entry.paper === paper);
    if (!(constantB.physical.bodyFractionSpan > matchedM.physical.bodyFractionSpan)) {
      failures.push(`visual/${paper}-constant-b-not-above-m-length`);
    }
  }
  return Object.freeze({
    failures: Object.freeze([...new Set(failures)].sort()),
    topology: Object.freeze({
      meanNibFractionSpan: Object.freeze(Object.fromEntries(
        Object.entries(byNib).map(([key, value]) => [key, roundMetric(value)]),
      )),
      broadToUefSpanRatio: roundMetric(broadToUef),
      wetToDryBroadSpanRatio: roundMetric(broadWetSpan / Math.max(broadDrySpan, 1e-12)),
      wetToDryBroadOpticalAreaDelta: roundMetric(broadWetOptical - broadDryOptical),
      crossJunctionToBodySpanRatio: roundMetric(crossJunctionToBody),
      mLengthBodySpanVariation: roundMetric(mLengthVariation),
    }),
  });
}

async function evaluateFixedCandidate({ maximumMilliseconds = MAX_CANDIDATE_MILLISECONDS } = {}) {
  if (!Number.isFinite(maximumMilliseconds) || maximumMilliseconds <= 0
    || maximumMilliseconds > MAX_CANDIDATE_MILLISECONDS) {
    throw new TypeError(`maximumMilliseconds must be in 1...${MAX_CANDIDATE_MILLISECONDS}.`);
  }
  const deadline = performance.now() + maximumMilliseconds;
  const fixtures = [];
  const cases = [];
  for (const definition of fixtureDefinitions()) {
    if (performance.now() > deadline) {
      throw new Error(`candidate exceeded the ${MAX_CANDIDATE_MILLISECONDS}ms budget.`);
    }
    const fixture = runFixture(definition);
    const scale = getKeyboardDyeArealLoadScale(fixture.nibId, fixture.flow);
    const opticalPair = compositePair(fixture);
    fixtures.push(fixture);
    cases.push(compactCase(
      fixture,
      analyzeLoad(fixture, scale),
      analyzePhysical(fixture, GATES.fractionDeltaMinimum),
      analyzeOptical({
        ...opticalPair,
        contactMask: fixture.contactMask,
        paper: [
          WARM_WHITE_PAPER_OPTICAL_PROFILE_R1.red,
          WARM_WHITE_PAPER_OPTICAL_PROFILE_R1.green,
          WARM_WHITE_PAPER_OPTICAL_PROFILE_R1.blue,
        ],
      }),
      opticalPair,
    ));
  }
  const contractProbes = runContractProbes(fixtures[0]);
  const visual = visualGates(cases);
  return Object.freeze({
    cases: Object.freeze(cases),
    contractProbes,
    algebraFailures: algebraGates(fixtures, cases, contractProbes),
    visualFailures: visual.failures,
    topology: visual.topology,
  });
}

async function digestLockedFiles({ engineRoot = ENGINE_ROOT } = {}) {
  const result = {};
  for (const path of LOCKED_PATHS) {
    result[path] = sha256(await readFile(new URL(path, `file://${engineRoot}/`)));
  }
  return result;
}

function matrixDigests(evaluated) {
  return Object.freeze({
    baselineMatrixDigest: sha256(stableStringify(evaluated.cases)),
    baselineLoadDigest: sha256(stableStringify(
      evaluated.cases.map((entry) => ({ id: entry.id, load: entry.load, loadDigest: entry.loadDigest })),
    )),
    baselineVisualDigest: sha256(stableStringify(
      evaluated.cases.map((entry) => ({ id: entry.id, physical: entry.physical, optical: entry.optical })),
    )),
  });
}

export async function createEvaluatorLock({ engineRoot = ENGINE_ROOT } = {}) {
  const predecessor = await validateA7_3Archive({ engineRoot });
  if (!predecessor.currentRuntimeRejected) {
    throw new Error("R16 lock requires current runtime rejection of terminal R15.");
  }
  const manifestBytes = await readFile(new URL(
    "research/dual-shading-autoresearch/a7-3/archive-manifest.json",
    `file://${engineRoot}/`,
  ));
  const evaluated = await evaluateFixedCandidate();
  const digests = matrixDigests(evaluated);
  return Object.freeze({
    schemaVersion: EVALUATOR_LOCK_SCHEMA_VERSION,
    algorithm: "sha256",
    evaluatorId: "dual-shading-loading-r16-v1",
    engineVersion: ENGINE_BASELINE_VERSION,
    fixedBaseline: Object.freeze({
      candidateSchemaVersion: CANDIDATE_SCHEMA_VERSION,
      method: KEYBOARD_DYE_AREAL_LOAD_CONTRACT_VERSION,
      dyeRecipe: "edge-dye-study@16",
      opticalModel: finiteLoadingDyeOpticalModelVersion,
      caseCount: FIXTURE_CASE_COUNT,
      maximumMilliseconds: MAX_CANDIDATE_MILLISECONDS,
      gates: GATES,
    }),
    files: Object.freeze(await digestLockedFiles({ engineRoot })),
    engineSourceTreeDigest: await computeCurrentEngineSourceTreeDigest({ engineRoot }),
    baseRecipeCanonicalDigest: sha256(serializeDyeComponentRecipe(EDGE_DYE_COMPONENT_RECIPE_R16)),
    ...digests,
    predecessor: Object.freeze({
      evaluatorLockDigest: predecessor.evaluatorLockDigest,
      archiveManifestDigest: sha256(manifestBytes),
      conclusion: predecessor.conclusion,
      currentRuntimeRejected: predecessor.currentRuntimeRejected,
    }),
  });
}

function validateLock(lock) {
  assertExactKeys(lock, [
    "schemaVersion", "algorithm", "evaluatorId", "engineVersion",
    "fixedBaseline", "files", "engineSourceTreeDigest",
    "baseRecipeCanonicalDigest", "baselineMatrixDigest",
    "baselineLoadDigest", "baselineVisualDigest", "predecessor",
  ], "evaluatorLock");
  if (
    lock.schemaVersion !== EVALUATOR_LOCK_SCHEMA_VERSION
    || lock.algorithm !== "sha256"
    || lock.evaluatorId !== "dual-shading-loading-r16-v1"
    || lock.engineVersion !== ENGINE_BASELINE_VERSION
  ) throw new TypeError("R16 evaluator lock identity mismatch.");
  for (const key of [
    "engineSourceTreeDigest", "baseRecipeCanonicalDigest",
    "baselineMatrixDigest", "baselineLoadDigest", "baselineVisualDigest",
  ]) assertSha256(lock[key], `evaluatorLock.${key}`);
  assertExactKeys(lock.files, LOCKED_PATHS, "evaluatorLock.files");
  for (const [path, digest] of Object.entries(lock.files)) {
    assertSha256(digest, `evaluatorLock.files[${path}]`);
  }
  if (
    lock.fixedBaseline?.method !== KEYBOARD_DYE_AREAL_LOAD_CONTRACT_VERSION
    || lock.fixedBaseline?.dyeRecipe !== "edge-dye-study@16"
    || lock.fixedBaseline?.caseCount !== 99
    || lock.fixedBaseline?.maximumMilliseconds !== 30_000
    || stableStringify(lock.fixedBaseline?.gates) !== stableStringify(GATES)
  ) throw new TypeError("R16 evaluator fixed baseline mismatch.");
  if (
    lock.predecessor?.conclusion !== "shared-vacancy-r15-plateau"
    || lock.predecessor?.currentRuntimeRejected !== true
  ) throw new TypeError("R16 predecessor closure mismatch.");
}

export async function verifyEvaluatorLock({
  lockPath = DEFAULT_LOCK_PATH,
  engineRoot = ENGINE_ROOT,
} = {}) {
  const lock = JSON.parse(await readFile(lockPath, "utf8"));
  validateLock(lock);
  const actualFiles = await digestLockedFiles({ engineRoot });
  for (const path of LOCKED_PATHS) {
    if (actualFiles[path] !== lock.files[path]) {
      throw new Error(`R16 evaluator lock mismatch for ${path}.`);
    }
  }
  const packageJson = JSON.parse(await readFile(
    new URL("package.json", `file://${engineRoot}/`),
    "utf8",
  ));
  if (packageJson.version !== ENGINE_BASELINE_VERSION) {
    throw new Error(`R16 evaluator requires engine ${ENGINE_BASELINE_VERSION}.`);
  }
  if (await computeCurrentEngineSourceTreeDigest({ engineRoot }) !== lock.engineSourceTreeDigest) {
    throw new Error("R16 engine source tree lock mismatch.");
  }
  if (sha256(serializeDyeComponentRecipe(EDGE_DYE_COMPONENT_RECIPE_R16))
    !== lock.baseRecipeCanonicalDigest) {
    throw new Error("R16 recipe canonical digest mismatch.");
  }
  const predecessor = await validateA7_3Archive({ engineRoot });
  if (
    !predecessor.currentRuntimeRejected
    || predecessor.evaluatorLockDigest !== lock.predecessor.evaluatorLockDigest
    || lock.files["research/dual-shading-autoresearch/a7-3/archive-manifest.json"]
      !== lock.predecessor.archiveManifestDigest
  ) throw new Error("R16 predecessor archive provenance mismatch.");
  return Object.freeze({ lock: Object.freeze(lock), digest: sha256(stableStringify(lock)) });
}

export async function evaluateCandidateFromFile({
  candidatePath = DEFAULT_CANDIDATE_PATH,
  lockPath = DEFAULT_LOCK_PATH,
  maximumMilliseconds = MAX_CANDIDATE_MILLISECONDS,
} = {}) {
  const lockInfo = await verifyEvaluatorLock({ lockPath });
  const candidate = JSON.parse(await readFile(candidatePath, "utf8"));
  validateCandidate(candidate);
  const evaluated = await evaluateFixedCandidate({ maximumMilliseconds });
  const digests = matrixDigests(evaluated);
  for (const [key, value] of Object.entries(digests)) {
    if (value !== lockInfo.lock[key]) throw new Error(`R16 ${key} mismatch.`);
  }
  const candidateDigest = sha256(stableStringify(candidate));
  const resultId = sha256(
    `${candidateDigest}:${lockInfo.digest}:${digests.baselineMatrixDigest}`,
  ).slice(0, 20);
  const visualFalsified = evaluated.visualFailures.length > 0;
  const status = evaluated.algebraFailures.length > 0
    ? "contract-fail"
    : visualFalsified ? "contract-pass-visual-falsified" : "shortlist";
  return Object.freeze({
    schemaVersion: "dual-shading-loading-r16-result-v1",
    resultId,
    status,
    scientificConclusion: visualFalsified
      ? "loading-only-falsified"
      : status === "shortlist" ? "loading-only-shortlist" : "implementation-invalid",
    automaticNinePointClaim: false,
    scoreBefore: 6.3,
    scoreAfter: status === "shortlist" ? null : 6.3,
    candidate: Object.freeze(candidate),
    candidateDigest,
    evaluatorLockDigest: lockInfo.digest,
    predecessor: lockInfo.lock.predecessor,
    matrix: Object.freeze({
      caseCount: evaluated.cases.length,
      primaryCaseCount: 81,
      controlCaseCount: 18,
      nibs: NIB_IDS,
      flows: FLOWS,
      papers: Object.freeze(PAPERS.map((entry) => entry.id)),
      shapes: PRIMARY_SHAPES,
      ...digests,
    }),
    hardGates: Object.freeze({
      algebraPassed: evaluated.algebraFailures.length === 0,
      algebraFailures: evaluated.algebraFailures,
      contractProbes: evaluated.contractProbes,
      visualPassed: !visualFalsified,
      visualFailures: evaluated.visualFailures,
    }),
    topology: evaluated.topology,
    cases: evaluated.cases,
    nextMethod: visualFalsified
      ? "ordered-deposit-time-plus-surface-lifetime-gated-pinned-redistribution"
      : null,
    humanReview: Object.freeze({
      requiredForAccepted: true,
      requiredForNinePointClaim: true,
      completed: false,
    }),
  });
}

export function resultRow(summary) {
  return Object.freeze({
    schemaVersion: "dual-shading-loading-r16-row-v1",
    resultId: summary.resultId,
    candidateId: summary.candidate.id,
    candidate: summary.candidate,
    candidateDigest: summary.candidateDigest,
    evaluatorLockDigest: summary.evaluatorLockDigest,
    matrixDigest: summary.matrix.baselineMatrixDigest,
    status: summary.status,
    scientificConclusion: summary.scientificConclusion,
    hardGates: summary.hardGates,
    topology: summary.topology,
    nextMethod: summary.nextMethod,
    scoreBefore: summary.scoreBefore,
    scoreAfter: summary.scoreAfter,
    automaticNinePointClaim: false,
  });
}

export function formatResultNdjson(summary) {
  return `${stableStringify(resultRow(summary))}\n`;
}

export { stableStringify };
