import assert from "node:assert/strict";
import test from "node:test";
import { compositeOrdinaryOptical } from "../src/optical/index.js";
import {
  ORDINARY_BLUE_BLACK_RECIPE_R6,
  ORDINARY_BURGUNDY_RECIPE_R6,
  ORDINARY_GREEN_RECIPE_R12,
  ORDINARY_TEAL_RECIPE_R6,
} from "../src/recipes/index.js";

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
    recipe: ORDINARY_GREEN_RECIPE_R12,
    output,
  });
  assert.equal(result, output);
  assert.deepEqual(Array.from(result.data.slice(0, 3)), [29, 55, 40]);
  assert.ok(result.data[3] > 0);
  assert.deepEqual(Array.from(result.data.slice(4)), [0, 0, 0, 0]);
});

test("r8 color curves map low, middle, and high Density without changing alpha", () => {
  const recipes = [
    ORDINARY_GREEN_RECIPE_R12,
    ORDINARY_BLUE_BLACK_RECIPE_R6,
    ORDINARY_BURGUNDY_RECIPE_R6,
    ORDINARY_TEAL_RECIPE_R6,
  ];
  const concentration = {
    width: 3,
    height: 1,
    data: new Float32Array([0, 0.5, 1]),
  };
  const coverage = {
    width: 3,
    height: 1,
    data: new Float32Array([1, 1, 1]),
  };
  const alphaSignatures = [];
  for (const recipe of recipes) {
    const result = compositeOrdinaryOptical({
      pixelWidth: 3,
      pixelHeight: 1,
      concentration,
      resolvedCoverage: coverage,
      recipe,
    });
    const rgb = [0, 1, 2].map((index) =>
      Array.from(result.data.slice(index * 4, index * 4 + 3)));
    assert.deepEqual(
      rgb,
      recipe.optical.densityColorCurve.map((point) => [
        point.rgb.red,
        point.rgb.green,
        point.rgb.blue,
      ]),
    );
    alphaSignatures.push([result.data[3], result.data[7], result.data[11]]);
  }
  for (const signature of alphaSignatures.slice(1)) {
    assert.deepEqual(signature, alphaSignatures[0]);
  }
});

test("density color curves interpolate channels rather than applying a hue skin", () => {
  const result = compositeOrdinaryOptical({
    pixelWidth: 2,
    pixelHeight: 1,
    concentration: { width: 2, height: 1, data: new Float32Array([0.25, 0.75]) },
    resolvedCoverage: { width: 2, height: 1, data: new Float32Array([1, 1]) },
    recipe: ORDINARY_BLUE_BLACK_RECIPE_R6,
  });
  assert.deepEqual(Array.from(result.data.slice(0, 3)), [60, 80, 96]);
  assert.deepEqual(Array.from(result.data.slice(4, 7)), [32, 51, 70]);
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
    recipe: ORDINARY_GREEN_RECIPE_R12,
    output,
  }), /concentration data must be finite/);
  assert.deepEqual(Array.from(output.data), [9, 8, 7, 6]);
});
