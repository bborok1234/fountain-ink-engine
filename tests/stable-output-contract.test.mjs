import assert from "node:assert/strict";
import test from "node:test";
import {
  STABLE_OUTPUT_CONTRACT_SCOPE,
  STABLE_OUTPUT_CONTRACT_VERSION,
  compareStableOutputContracts,
  createExperimentRecord,
  createFieldSignature,
  createStableOutputContract,
  validateStableOutputContract,
} from "../src/contracts/index.js";
import { ORDINARY_GREEN_RECIPE_R12 } from "../src/recipes/index.js";
import { PAPER_SURFACE_BALANCED_R2 } from "../src/surface-recipes/index.js";

const makeRenderContext = (flow = 58) => ({
  literalText: "한글",
  segmentationLocale: "ko",
  segmentationRuntime: "Intl.Segmenter",
  segmentationRuntimeVersion: "test-runtime",
  graphemes: ["한", "글"],
  glyphSeeds: [11, 22],
  glyphSeedDerivation: "fountain-cadence-seed-v1-explicit-values",
  surfaceSeed: 0x13579bdf,
  surfaceSeedDerivation: "explicit-surface-seed-v1",
  nibId: "M",
  flow,
  fontSize: 28,
  textPosition: { x: 0, y: 0.5 },
  viewport: { width: 390, height: 844 },
  raster: { devicePixelRatio: 3, scale: 2, colorSpace: "srgb" },
  font: {
    family: "Nanum Pen Script",
    weight: 400,
    style: "normal",
    packageName: "@fontsource/nanum-pen-script",
    packageVersion: "5.3.0",
    assetSha256: "a".repeat(64),
    loadState: "loaded",
  },
  dependencies: {
    lockfileName: "package-lock.json",
    lockfileSha256: "b".repeat(64),
  },
});

const makeCheckpoint = (flow = 58, metadata = {}) => createExperimentRecord({
  id: metadata.id ?? "E-stable-output",
  attempt: metadata.attempt ?? "A1",
  hypothesis: metadata.hypothesis ?? "The same replay inputs reproduce exact named fields.",
  seed: 0x13579bdf,
  recipe: ORDINARY_GREEN_RECIPE_R12,
  surfaceRecipe: PAPER_SURFACE_BALANCED_R2,
  renderContext: makeRenderContext(flow),
  expected: metadata.expected ?? null,
  observed: metadata.observed ?? null,
});

function signature(domain, data, width = 2, height = 1, channels = 1) {
  return createFieldSignature({ domain, width, height, channels, data });
}

const makeStageSignatures = (opticalBlue = 40) => Object.freeze({
  contactRgba: signature(
    "contact.rgba-mask",
    new Uint8ClampedArray([0, 0, 0, 255, 0, 0, 0, 128]),
    2,
    1,
    4,
  ),
  densityAccumulatedVariation: signature(
    "density.accumulated-variation",
    new Float32Array([0.25, -0.5]),
  ),
  densitySampleCount: signature(
    "density.sample-count",
    new Uint16Array([1, 1]),
  ),
  surfaceResolvedCoverage: signature(
    "surface.resolved-coverage",
    new Float32Array([1, 0.5]),
  ),
  densityNormalizedConcentration: signature(
    "density.normalized-concentration",
    new Float32Array([0.8, 0.3]),
  ),
  opticalCompositeRgba: signature(
    "optical.composite-rgba",
    new Uint8ClampedArray([29, 55, 40, 240, 29, 55, opticalBlue, 120]),
    2,
    1,
    4,
  ),
});

test("stable output contracts bind one fixture-v3 replay input to six exact named fields", () => {
  const first = createStableOutputContract({
    checkpoint: makeCheckpoint(),
    stageSignatures: makeStageSignatures(),
  });
  const second = createStableOutputContract({
    checkpoint: makeCheckpoint(),
    stageSignatures: makeStageSignatures(),
  });
  assert.deepEqual(first, second);
  assert.equal(validateStableOutputContract(first), true);
  assert.equal(first.contractVersion, STABLE_OUTPUT_CONTRACT_VERSION);
  assert.equal(first.scope, STABLE_OUTPUT_CONTRACT_SCOPE);
  assert.deepEqual(compareStableOutputContracts(first, second), {
    matches: true,
    sameReplayInputs: true,
    mismatchedFields: [],
  });
  assert.ok(Object.isFrozen(first));
  assert.ok(Object.isFrozen(first.fields));
});

test("human experiment prose does not change replay identity, but material input does", () => {
  const baseline = createStableOutputContract({
    checkpoint: makeCheckpoint(58),
    stageSignatures: makeStageSignatures(),
  });
  const renamed = createStableOutputContract({
    checkpoint: makeCheckpoint(58, {
      id: "E-renamed",
      hypothesis: "Different prose must not pretend to be a material input.",
      observed: { reviewer: "human" },
    }),
    stageSignatures: makeStageSignatures(),
  });
  const changedFlow = createStableOutputContract({
    checkpoint: makeCheckpoint(59),
    stageSignatures: makeStageSignatures(),
  });
  assert.equal(baseline.replayInputSignature.hash, renamed.replayInputSignature.hash);
  assert.notEqual(baseline.replayInputSignature.hash, changedFlow.replayInputSignature.hash);
  assert.equal(compareStableOutputContracts(baseline, changedFlow).sameReplayInputs, false);
});

test("comparison identifies an exact field mismatch under the same replay input", () => {
  const checkpoint = makeCheckpoint();
  const expected = createStableOutputContract({
    checkpoint,
    stageSignatures: makeStageSignatures(40),
  });
  const actual = createStableOutputContract({
    checkpoint,
    stageSignatures: makeStageSignatures(41),
  });
  assert.deepEqual(compareStableOutputContracts(expected, actual), {
    matches: false,
    sameReplayInputs: true,
    mismatchedFields: ["opticalCompositeRgba"],
  });
});

test("stable output contracts fail closed for old manifests, forged fields, and accessors", () => {
  const stageSignatures = makeStageSignatures();
  const manifestV2 = createExperimentRecord({
    id: "E-v2",
    hypothesis: "Historical input does not invent a render environment.",
    seed: 1,
    recipe: ORDINARY_GREEN_RECIPE_R12,
    surfaceRecipe: PAPER_SURFACE_BALANCED_R2,
    fixtureManifestVersion: 2,
  });
  assert.throws(() => createStableOutputContract({
    checkpoint: manifestV2,
    stageSignatures,
  }), /fixtureManifestVersion 3/);
  assert.throws(() => createStableOutputContract({
    checkpoint: makeCheckpoint(),
    stageSignatures: { ...stageSignatures, extra: true },
  }), /invalid key set/);
  assert.throws(() => createStableOutputContract({
    checkpoint: makeCheckpoint(),
    stageSignatures: {
      ...stageSignatures,
      opticalCompositeRgba: signature(
        "optical.composite-rgba",
        new Uint8Array([29, 55, 40, 240, 29, 55, 40, 120]),
        2,
        1,
        4,
      ),
    },
  }), /invalid type or channel count/);
  let getterReads = 0;
  const accessor = { ...stageSignatures };
  Object.defineProperty(accessor, "contactRgba", {
    enumerable: true,
    get() {
      getterReads += 1;
      return stageSignatures.contactRgba;
    },
  });
  assert.throws(() => createStableOutputContract({
    checkpoint: makeCheckpoint(),
    stageSignatures: accessor,
  }), /own data property/);
  assert.equal(getterReads, 0);
});
