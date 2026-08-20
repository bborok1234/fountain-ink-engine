import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_SURFACE_SEED,
  WetInkSimulation,
  createMaterialCoverage,
  getDirectDepositLoads,
} from "../src/surface/index.js";
import { ORDINARY_GREEN_RECIPE_R4 } from "../src/recipes/index.js";

function makeDeposit(width, height) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 3; y < height - 3; y += 1) {
    for (let x = 4; x < width - 4; x += 1) {
      data[(y * width + x) * 4 + 3] = 210;
    }
  }
  return { width, height, data };
}

function makeLocalityDeposit(includeFarSuffix) {
  const width = 80;
  const height = 36;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 10; y < 18; y += 1) {
    for (let x = 6; x < 14; x += 1) {
      data[(y * width + x) * 4 + 3] = 90;
    }
  }
  if (includeFarSuffix) {
    for (let y = 10; y < 18; y += 1) {
      for (let x = 66; x < 74; x += 1) {
        data[(y * width + x) * 4 + 3] = 255;
      }
    }
  }
  return { width, height, data };
}

function renderRawSurface(deposit, absorption) {
  const simulation = new WetInkSimulation(
    deposit.width,
    deposit.height,
    DEFAULT_SURFACE_SEED,
  );
  simulation.depositMask(deposit, {
    waterLoad: ORDINARY_GREEN_RECIPE_R4.surface.keyboard.waterLoad,
    pigmentLoad: ORDINARY_GREEN_RECIPE_R4.surface.keyboard.pigmentLoad,
    seed: (DEFAULT_SURFACE_SEED ^ 0x85ebca6b) >>> 0,
  });
  const steps = Math.round(
    ORDINARY_GREEN_RECIPE_R4.surface.keyboard.stepBase
      + absorption
        * ORDINARY_GREEN_RECIPE_R4.surface.keyboard.stepAbsorptionGain,
  );
  for (let index = 0; index < steps; index += 1) {
    simulation.step(
      ORDINARY_GREEN_RECIPE_R4.surface.keyboard.stepMilliseconds,
      absorption,
    );
  }
  const image = {
    data: new Uint8ClampedArray(deposit.width * deposit.height * 4),
  };
  simulation.render(image, ORDINARY_GREEN_RECIPE_R4);
  return image.data;
}

function legacyStrongestNormalization(data, normalizationScale) {
  let strongest = 1;
  for (let offset = 3; offset < data.length; offset += 4) {
    strongest = Math.max(strongest, data[offset]);
  }
  const alpha = new Uint8ClampedArray(data.length / 4);
  for (let offset = 3; offset < data.length; offset += 4) {
    alpha[(offset - 3) / 4] = Math.round(
      Math.min(1, data[offset] / (strongest * normalizationScale)) * 255,
    );
  }
  return { alpha, strongest };
}

function alphaCrop(data, width, minimumX, maximumX) {
  const alpha = [];
  for (let offset = 3; offset < data.length; offset += 4) {
    const pixelIndex = (offset - 3) / 4;
    const x = pixelIndex % width;
    if (x >= minimumX && x < maximumX) alpha.push(data[offset]);
  }
  return alpha;
}

function alphaPlaneCrop(alpha, width, minimumX, maximumX) {
  return Array.from(alpha).filter((_, pixelIndex) => {
    const x = pixelIndex % width;
    return x >= minimumX && x < maximumX;
  });
}

test("direct flow loads come from the authored recipe", () => {
  const loads = getDirectDepositLoads(ORDINARY_GREEN_RECIPE_R4, 0.58);
  assert.ok(Math.abs(loads.waterLoad - 0.2242) < 1e-12);
  assert.ok(Math.abs(loads.pigmentLoad - 0.1536) < 1e-12);
  assert.ok(Object.isFrozen(getDirectDepositLoads(ORDINARY_GREEN_RECIPE_R4, 0)));
  assert.throws(() => getDirectDepositLoads(undefined, 0.58), /recipe/);
  for (const flow of [Number.NaN, Number.POSITIVE_INFINITY, -0.01, 1.01]) {
    assert.throws(
      () => getDirectDepositLoads(ORDINARY_GREEN_RECIPE_R4, flow),
      /normalizedFlow must be a finite number in 0\.\.\.1/,
    );
  }
});

test("excessive keyboard Surface work fails before touching a deposit", () => {
  const excessive = JSON.parse(JSON.stringify(ORDINARY_GREEN_RECIPE_R4));
  excessive.id = "custom-excessive-steps";
  excessive.surface.keyboard.stepBase = 64;
  excessive.surface.keyboard.stepAbsorptionGain = 1;
  const untouchedDeposit = {
    get width() {
      throw new Error("deposit must not be read");
    },
  };
  assert.throws(
    () => createMaterialCoverage(untouchedDeposit, 1, 7, excessive),
    /step budget/,
  );
});

test("invalid normalized absorption fails before touching a deposit", () => {
  const untouchedDeposit = {
    get width() {
      throw new Error("deposit must not be read");
    },
  };
  for (const absorption of [Number.NaN, Number.POSITIVE_INFINITY, -0.01, 1.01]) {
    assert.throws(
      () => createMaterialCoverage(
        untouchedDeposit,
        absorption,
        7,
        ORDINARY_GREEN_RECIPE_R4,
      ),
      /absorption must be a finite number in 0\.\.\.1/,
    );
  }
});

test("invalid fixed normalization references fail before touching a deposit", () => {
  const untouchedDeposit = {
    get width() {
      throw new Error("deposit must not be read");
    },
  };
  for (const value of [0, Number.NaN, 256]) {
    const invalid = JSON.parse(JSON.stringify(ORDINARY_GREEN_RECIPE_R4));
    invalid.id = "custom-invalid-reference";
    invalid.surface.keyboard.normalizationReferenceAlpha = value;
    assert.throws(
      () => createMaterialCoverage(
        untouchedDeposit,
        0.42,
        DEFAULT_SURFACE_SEED,
        invalid,
      ),
      /normalizationReferenceAlpha/,
    );
  }

  const accessor = JSON.parse(JSON.stringify(ORDINARY_GREEN_RECIPE_R4));
  accessor.id = "custom-accessor-reference";
  Object.defineProperty(
    accessor.surface.keyboard,
    "normalizationReferenceAlpha",
    { enumerable: true, get: () => 107 },
  );
  assert.throws(
    () => createMaterialCoverage(
      untouchedDeposit,
      0.42,
      DEFAULT_SURFACE_SEED,
      accessor,
    ),
    /normalizationReferenceAlpha must be an enumerable own data property/,
  );
});

test("WetInkSimulation repeats typed-array state for the same input", () => {
  const run = () => {
    const simulation = new WetInkSimulation(24, 18, 0x10203040);
    simulation.depositMask(makeDeposit(24, 18), {
      waterLoad: 0.377,
      pigmentLoad: 0.291,
      seed: 0x55667788,
    });
    for (let index = 0; index < 9; index += 1) simulation.step(16.667, 0.42);
    const image = { data: new Uint8ClampedArray(24 * 18 * 4) };
    simulation.render(image, ORDINARY_GREEN_RECIPE_R4);
    return {
      water: simulation.water,
      mobile: simulation.mobile,
      fixed: simulation.fixed,
      image: image.data,
    };
  };
  const first = run();
  const second = run();
  assert.deepEqual(first.water, second.water);
  assert.deepEqual(first.mobile, second.mobile);
  assert.deepEqual(first.fixed, second.fixed);
  assert.deepEqual(first.image, second.image);
  assert.ok(first.fixed.some((value) => value > 0));
});

test("a suspended animation frame keeps the existing capped-step behavior", () => {
  const makeSimulation = () => {
    const simulation = new WetInkSimulation(24, 18, 0x10203040);
    simulation.depositMask(makeDeposit(24, 18), {
      waterLoad: 0.377,
      pigmentLoad: 0.291,
      seed: 0x55667788,
    });
    return simulation;
  };
  const suspended = makeSimulation();
  const capped = makeSimulation();
  suspended.step(60_000, 0.42);
  capped.step(16.667 * 2.5, 0.42);
  assert.deepEqual(suspended.water, capped.water);
  assert.deepEqual(suspended.mobile, capped.mobile);
  assert.deepEqual(suspended.fixed, capped.fixed);
});

test("normalized material coverage is deterministic and structural ImageData", () => {
  const deposit = makeDeposit(24, 18);
  const first = createMaterialCoverage(
    deposit,
    0.42,
    DEFAULT_SURFACE_SEED,
    ORDINARY_GREEN_RECIPE_R4,
  );
  const second = createMaterialCoverage(
    deposit,
    0.42,
    DEFAULT_SURFACE_SEED,
    ORDINARY_GREEN_RECIPE_R4,
  );
  const differentSeed = createMaterialCoverage(
    deposit,
    0.42,
    (DEFAULT_SURFACE_SEED ^ 0x9e3779b9) >>> 0,
    ORDINARY_GREEN_RECIPE_R4,
  );
  assert.deepEqual(first, second);
  assert.notDeepEqual(first.data, differentSeed.data);
  assert.equal(first.width, 24);
  assert.equal(first.height, 18);
  assert.equal(first.data.length, 24 * 18 * 4);
  for (let index = 0; index < first.data.length; index += 4) {
    assert.equal(first.data[index], 255);
    assert.equal(first.data[index + 1], 255);
    assert.equal(first.data[index + 2], 255);
  }
});

test("a fixed authored reference removes far-suffix normalization coupling", () => {
  const absorption = 0.42;
  const beforeDeposit = makeLocalityDeposit(false);
  const afterDeposit = makeLocalityDeposit(true);
  const beforeRaw = renderRawSurface(beforeDeposit, absorption);
  const afterRaw = renderRawSurface(afterDeposit, absorption);
  assert.deepEqual(
    alphaCrop(beforeRaw, beforeDeposit.width, 0, 30),
    alphaCrop(afterRaw, afterDeposit.width, 0, 30),
    "the wet solver itself must not carry the far suffix into the prefix crop",
  );

  const beforeLegacy = legacyStrongestNormalization(
    beforeRaw,
    ORDINARY_GREEN_RECIPE_R4.surface.keyboard.normalizationScale,
  );
  const afterLegacy = legacyStrongestNormalization(
    afterRaw,
    ORDINARY_GREEN_RECIPE_R4.surface.keyboard.normalizationScale,
  );
  assert.equal(beforeLegacy.strongest, 45);
  assert.equal(afterLegacy.strongest, 105);
  assert.notDeepEqual(
    alphaPlaneCrop(beforeLegacy.alpha, beforeDeposit.width, 0, 30),
    alphaPlaneCrop(afterLegacy.alpha, afterDeposit.width, 0, 30),
    "the removed page-observed divisor must remain a sensitive regression fixture",
  );

  const before = createMaterialCoverage(
    beforeDeposit,
    absorption,
    DEFAULT_SURFACE_SEED,
    ORDINARY_GREEN_RECIPE_R4,
  );
  const after = createMaterialCoverage(
    afterDeposit,
    absorption,
    DEFAULT_SURFACE_SEED,
    ORDINARY_GREEN_RECIPE_R4,
  );
  assert.deepEqual(
    alphaCrop(before.data, before.width, 0, 30),
    alphaCrop(after.data, after.width, 0, 30),
  );
});

test("a nearby wet suffix may interact locally but not through normalization", () => {
  const width = 80;
  const height = 36;
  const makeNearDeposit = (includeNearSuffix) => {
    const data = new Uint8ClampedArray(width * height * 4);
    for (let y = 10; y < 18; y += 1) {
      for (let x = 20; x < 28; x += 1) {
        data[(y * width + x) * 4 + 3] = 90;
      }
      if (includeNearSuffix) {
        for (let x = 28; x < 36; x += 1) {
          data[(y * width + x) * 4 + 3] = 255;
        }
      }
    }
    return { width, height, data };
  };
  const before = createMaterialCoverage(
    makeNearDeposit(false),
    0.42,
    DEFAULT_SURFACE_SEED,
    ORDINARY_GREEN_RECIPE_R4,
  );
  const after = createMaterialCoverage(
    makeNearDeposit(true),
    0.42,
    DEFAULT_SURFACE_SEED,
    ORDINARY_GREEN_RECIPE_R4,
  );

  assert.deepEqual(
    alphaCrop(before.data, width, 0, 10),
    alphaCrop(after.data, width, 0, 10),
    "a remote dry crop remains exact",
  );
  assert.notDeepEqual(
    alphaCrop(before.data, width, 15, 28),
    alphaCrop(after.data, width, 15, 28),
    "adjacent wet footprints may still interact through the solver",
  );
});

test("clear removes all deposited physical state", () => {
  const simulation = new WetInkSimulation(12, 12, DEFAULT_SURFACE_SEED);
  simulation.depositDab(6, 6, {
    radius: 3,
    aspect: 0.62,
    pressure: 0.5,
    waterLoad: 0.2,
    pigmentLoad: 0.12,
    strokeSeed: 9,
  });
  simulation.clear();
  assert.ok(simulation.water.every((value) => value === 0));
  assert.ok(simulation.mobile.every((value) => value === 0));
  assert.ok(simulation.fixed.every((value) => value === 0));
  assert.equal(simulation.activity, 0);
});

test("surface calculations reject an implicit seed", () => {
  assert.throws(
    () => new WetInkSimulation(12, 12),
    /explicit unsigned 32-bit integer/,
  );
  assert.throws(
    () => createMaterialCoverage(
      makeDeposit(12, 12),
      0.42,
      undefined,
      ORDINARY_GREEN_RECIPE_R4,
    ),
    /explicit unsigned 32-bit integer/,
  );
  assert.throws(
    () => createMaterialCoverage(
      makeDeposit(12, 12),
      0.42,
      DEFAULT_SURFACE_SEED,
    ),
    /recipe/,
  );

  const missingMaskSeed = new WetInkSimulation(12, 12, 0);
  assert.throws(() => missingMaskSeed.depositMask(makeDeposit(12, 12), {
    waterLoad: 0.2,
    pigmentLoad: 0.12,
  }), /options\.seed must be an explicit unsigned 32-bit integer/);
  assert.ok(missingMaskSeed.water.every((value) => value === 0));
  missingMaskSeed.depositMask(makeDeposit(12, 12), {
    waterLoad: 0.2,
    pigmentLoad: 0.12,
    seed: 0,
  });
  assert.ok(missingMaskSeed.water.some((value) => value > 0));

  const missingStrokeSeed = new WetInkSimulation(12, 12, 0);
  const dab = {
    radius: 3,
    aspect: 0.62,
    pressure: 0.5,
    waterLoad: 0.2,
    pigmentLoad: 0.12,
  };
  assert.throws(
    () => missingStrokeSeed.depositDab(6, 6, dab),
    /options\.strokeSeed must be an explicit unsigned 32-bit integer/,
  );
  assert.ok(missingStrokeSeed.water.every((value) => value === 0));
  missingStrokeSeed.depositDab(6, 6, { ...dab, strokeSeed: 0 });
  assert.ok(missingStrokeSeed.water.some((value) => value > 0));
  assert.throws(
    () => new WetInkSimulation(12, 12, 0x1_0000_0000),
    /unsigned 32-bit integer/,
  );
});
