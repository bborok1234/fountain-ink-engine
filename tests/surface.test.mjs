import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_SURFACE_SEED,
  WetInkSimulation,
  createMaterialCoverage,
  getDirectDepositLoads,
} from "../src/surface/index.js";
import { ORDINARY_GREEN_RECIPE_R1 } from "../src/recipes/index.js";

function makeDeposit(width, height) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 3; y < height - 3; y += 1) {
    for (let x = 4; x < width - 4; x += 1) {
      data[(y * width + x) * 4 + 3] = 210;
    }
  }
  return { width, height, data };
}

test("direct flow loads come from the authored recipe", () => {
  const loads = getDirectDepositLoads(ORDINARY_GREEN_RECIPE_R1, 0.58);
  assert.ok(Math.abs(loads.waterLoad - 0.2242) < 1e-12);
  assert.ok(Math.abs(loads.pigmentLoad - 0.1536) < 1e-12);
  assert.ok(Object.isFrozen(getDirectDepositLoads(ORDINARY_GREEN_RECIPE_R1, 0)));
  assert.throws(() => getDirectDepositLoads(undefined, 0.58), /recipe/);
  for (const flow of [Number.NaN, Number.POSITIVE_INFINITY, -0.01, 1.01]) {
    assert.throws(
      () => getDirectDepositLoads(ORDINARY_GREEN_RECIPE_R1, flow),
      /normalizedFlow must be a finite number in 0\.\.\.1/,
    );
  }
});

test("excessive keyboard Surface work fails before touching a deposit", () => {
  const excessive = JSON.parse(JSON.stringify(ORDINARY_GREEN_RECIPE_R1));
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
        ORDINARY_GREEN_RECIPE_R1,
      ),
      /absorption must be a finite number in 0\.\.\.1/,
    );
  }
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
    simulation.render(image, ORDINARY_GREEN_RECIPE_R1);
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
    ORDINARY_GREEN_RECIPE_R1,
  );
  const second = createMaterialCoverage(
    deposit,
    0.42,
    DEFAULT_SURFACE_SEED,
    ORDINARY_GREEN_RECIPE_R1,
  );
  const differentSeed = createMaterialCoverage(
    deposit,
    0.42,
    (DEFAULT_SURFACE_SEED ^ 0x9e3779b9) >>> 0,
    ORDINARY_GREEN_RECIPE_R1,
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
      ORDINARY_GREEN_RECIPE_R1,
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
