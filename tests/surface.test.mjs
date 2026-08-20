import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_SURFACE_SEED,
  WetInkSimulation,
  createMaterialCoverage,
} from "../src/surface/index.js";

function makeDeposit(width, height) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 3; y < height - 3; y += 1) {
    for (let x = 4; x < width - 4; x += 1) {
      data[(y * width + x) * 4 + 3] = 210;
    }
  }
  return { width, height, data };
}

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
    simulation.render(image);
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

test("normalized material coverage is deterministic and structural ImageData", () => {
  const deposit = makeDeposit(24, 18);
  const first = createMaterialCoverage(deposit, 0.42, DEFAULT_SURFACE_SEED);
  const second = createMaterialCoverage(deposit, 0.42, DEFAULT_SURFACE_SEED);
  const differentSeed = createMaterialCoverage(
    deposit,
    0.42,
    (DEFAULT_SURFACE_SEED ^ 0x9e3779b9) >>> 0,
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
    /explicit non-negative integer/,
  );
  assert.throws(
    () => createMaterialCoverage(makeDeposit(12, 12), 0.42),
    /explicit non-negative integer/,
  );
});
