import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import {
  SHIMMER_COMPONENT_RECIPE_R1,
  assertShimmerComponentRecipeCompatible,
  createShimmerParticleState,
  freezeShimmerComponentRecipe,
  serializeShimmerComponentRecipe,
} from "fountain-ink-engine/shimmer-components";
import { compositeShimmerOptical } from "fountain-ink-engine/optical";
import {
  PAPER_SURFACE_ABSORBENT_R4,
  PAPER_SURFACE_BALANCED_R2,
  PAPER_SURFACE_SMOOTH_R1,
} from "fountain-ink-engine/surface-recipes";

function coverageFixture(width = 64, height = 32) {
  const data = new Float32Array(width * height);
  for (let y = 5; y < height - 5; y += 1) {
    for (let x = 6; x < width - 6; x += 1) {
      data[y * width + x] = 0.75;
    }
  }
  return Object.freeze({ width, height, data });
}

function createState(overrides = {}) {
  const resolvedCoverage = overrides.resolvedCoverage ?? coverageFixture();
  return createShimmerParticleState({
    pixelWidth: resolvedCoverage.width,
    pixelHeight: resolvedCoverage.height,
    rasterScale: 2,
    resolvedCoverage,
    surfaceRecipe: PAPER_SURFACE_BALANCED_R2,
    shimmerComponentRecipe: SHIMMER_COMPONENT_RECIPE_R1,
    particleSeed: 0x6a09e667,
    ...overrides,
  });
}

test("registered shimmer recipe is canonical, frozen, and independently pinned", () => {
  const serialized = serializeShimmerComponentRecipe(
    SHIMMER_COMPONENT_RECIPE_R1,
  );
  assert.equal(Object.isFrozen(SHIMMER_COMPONENT_RECIPE_R1), true);
  assert.equal(
    createHash("sha256").update(serialized).digest("hex"),
    "29e636b23bbb7aa5d791aa94c989e5c4d6d42998735694009e05c59b42981107",
  );
  assert.equal(
    assertShimmerComponentRecipeCompatible(SHIMMER_COMPONENT_RECIPE_R1),
    true,
  );
});

test("custom shimmer recipes are explicit while registered identity rejects retuning", () => {
  const custom = freezeShimmerComponentRecipe({
    ...SHIMMER_COMPONENT_RECIPE_R1,
    id: "workbench-shimmer",
    particleLoad: 0.65,
  });
  assert.equal(assertShimmerComponentRecipeCompatible(custom), true);
  assert.throws(() => assertShimmerComponentRecipeCompatible({
    ...SHIMMER_COMPONENT_RECIPE_R1,
    particleLoad: 0.65,
  }), /does not match/);
});

test("particles are deterministic, bounded, and remain inside the wet footprint", () => {
  const coverage = coverageFixture();
  const first = createState({ resolvedCoverage: coverage });
  const second = createState({ resolvedCoverage: coverage });
  const changedSeed = createState({
    resolvedCoverage: coverage,
    particleSeed: 0x6a09e668,
  });
  assert.deepEqual(first, second);
  assert.notDeepEqual(first.x, changedSeed.x);
  assert.ok(first.count > 0);
  assert.ok(first.count <= SHIMMER_COMPONENT_RECIPE_R1.particleBudget);
  for (let index = 0; index < first.count; index += 1) {
    const x = Math.floor(first.x[index]);
    const y = Math.floor(first.y[index]);
    assert.ok(coverage.data[y * coverage.width + x] >= 0.18);
    assert.ok(first.radius[index] >= 1);
    assert.ok(first.radius[index] <= 2.4);
    assert.ok(first.orientation[index] >= 0 && first.orientation[index] <= 1);
    assert.ok(first.strength[index] >= 0 && first.strength[index] <= 1);
  }
});

test("particle population is independent of Density and follows Surface catch", () => {
  const resolvedCoverage = coverageFixture();
  const common = {
    pixelWidth: resolvedCoverage.width,
    pixelHeight: resolvedCoverage.height,
    rasterScale: 2,
    resolvedCoverage,
    shimmerComponentRecipe: SHIMMER_COMPONENT_RECIPE_R1,
    particleSeed: 19,
  };
  const smooth = createShimmerParticleState({
    ...common,
    surfaceRecipe: PAPER_SURFACE_SMOOTH_R1,
  });
  const balanced = createShimmerParticleState({
    ...common,
    surfaceRecipe: PAPER_SURFACE_BALANCED_R2,
  });
  const absorbent = createShimmerParticleState({
    ...common,
    surfaceRecipe: PAPER_SURFACE_ABSORBENT_R4,
  });
  assert.ok(smooth.count <= balanced.count);
  assert.ok(balanced.count <= absorbent.count);
  assert.ok(absorbent.count <= SHIMMER_COMPONENT_RECIPE_R1.particleBudget);
});

test("Reduce Motion fixes the view while dynamic phase changes only ink RGB", () => {
  const width = 64;
  const height = 32;
  const state = createState();
  const base = {
    width,
    height,
    data: new Uint8ClampedArray(width * height * 4),
  };
  for (let index = 0; index < width * height; index += 1) {
    base.data.set([29, 55, 40, 220], index * 4);
  }
  const render = (lightPhase, reduceMotion) => {
    const output = {
      width,
      height,
      data: new Uint8ClampedArray(width * height * 4),
    };
    compositeShimmerOptical({
      pixelWidth: width,
      pixelHeight: height,
      baseRgba: base,
      shimmerParticles: state,
      shimmerComponentRecipe: SHIMMER_COMPONENT_RECIPE_R1,
      shimmerObservation: { lightPhase, reduceMotion },
      output,
    });
    return output;
  };
  const staticA = render(0, true);
  const staticB = render(0.8, true);
  const movingA = render(0, false);
  const movingB = render(0.25, false);
  assert.deepEqual(staticA, staticB);
  assert.notDeepEqual(movingA.data, movingB.data);
  assert.ok(staticA.data.some((value, index) => (
    index % 4 !== 3 && value !== base.data[index]
  )));
  for (let offset = 0; offset < base.data.length; offset += 4) {
    assert.equal(staticA.data[offset + 3], base.data[offset + 3]);
    assert.equal(movingA.data[offset + 3], base.data[offset + 3]);
  }
});

test("malformed particle inputs fail before Optical output mutation", () => {
  const output = {
    width: 2,
    height: 2,
    data: new Uint8ClampedArray(16).fill(17),
  };
  assert.throws(() => compositeShimmerOptical({
    pixelWidth: 2,
    pixelHeight: 2,
    baseRgba: { width: 2, height: 2, data: new Uint8ClampedArray(16) },
    shimmerParticles: {
      width: 2,
      height: 2,
      seed: 1,
      count: 1,
      x: new Float32Array(0),
      y: new Float32Array(1),
      radius: new Float32Array(1),
      orientation: new Float32Array(1),
      strength: new Float32Array(1),
    },
    shimmerComponentRecipe: SHIMMER_COMPONENT_RECIPE_R1,
    shimmerObservation: { lightPhase: 0, reduceMotion: true },
    output,
  }), /count-sized/);
  assert.deepEqual(output.data, new Uint8ClampedArray(16).fill(17));
});

test("coverage accessors fail without getter reads", () => {
  let getterReads = 0;
  const resolvedCoverage = {};
  Object.defineProperty(resolvedCoverage, "width", {
    enumerable: true,
    get() {
      getterReads += 1;
      return 4;
    },
  });
  Object.defineProperty(resolvedCoverage, "height", {
    enumerable: true,
    value: 4,
  });
  Object.defineProperty(resolvedCoverage, "data", {
    enumerable: true,
    value: new Float32Array(16),
  });
  assert.throws(() => createShimmerParticleState({
    pixelWidth: 4,
    pixelHeight: 4,
    rasterScale: 1,
    resolvedCoverage,
    surfaceRecipe: PAPER_SURFACE_BALANCED_R2,
    shimmerComponentRecipe: SHIMMER_COMPONENT_RECIPE_R1,
    particleSeed: 1,
  }), /own data property/);
  assert.equal(getterReads, 0);
});
