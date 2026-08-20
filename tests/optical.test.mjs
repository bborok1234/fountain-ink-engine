import assert from "node:assert/strict";
import test from "node:test";
import { compositeOrdinaryOptical } from "../src/optical/index.js";
import { ORDINARY_GREEN_RECIPE_R6 } from "../src/recipes/index.js";

test("Optical maps only normalized concentration and resolved coverage", () => {
  const output = {
    width: 2,
    height: 1,
    data: new Uint8ClampedArray([9, 8, 7, 6, 9, 8, 7, 6]),
  };
  const result = compositeOrdinaryOptical({
    pixelWidth: 2,
    pixelHeight: 1,
    concentration: { width: 2, height: 1, data: new Float32Array([0.5, 1]) },
    resolvedCoverage: { width: 2, height: 1, data: new Float32Array([1, 0]) },
    recipe: ORDINARY_GREEN_RECIPE_R6,
    output,
  });
  assert.equal(result, output);
  assert.deepEqual(Array.from(result.data.slice(0, 3)), [29, 55, 40]);
  assert.ok(result.data[3] > 0);
  assert.deepEqual(Array.from(result.data.slice(4)), [0, 0, 0, 0]);
});

test("Optical rejects malformed scalar planes before mutating output", () => {
  const output = {
    width: 1,
    height: 1,
    data: new Uint8ClampedArray([9, 8, 7, 6]),
  };
  assert.throws(() => compositeOrdinaryOptical({
    pixelWidth: 1,
    pixelHeight: 1,
    concentration: { width: 1, height: 1, data: new Float32Array([NaN]) },
    resolvedCoverage: { width: 1, height: 1, data: new Float32Array([1]) },
    recipe: ORDINARY_GREEN_RECIPE_R6,
    output,
  }), /concentration data must be finite/);
  assert.deepEqual(Array.from(output.data), [9, 8, 7, 6]);
});
