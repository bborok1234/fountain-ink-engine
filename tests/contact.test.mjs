import assert from "node:assert/strict";
import test from "node:test";
import {
  M_STROKE_EM,
  NIB_IDS,
  ROUND_NIB_RATIOS,
  geometryExpansion,
  getNibDensityRange,
  getNibGeometry,
  getScaledNibGeometry,
  morphAlpha,
  shapeNibDensityVariation,
} from "../src/contact/index.js";
import { ORDINARY_GREEN_RECIPE_R1 } from "../src/recipes/index.js";

test("preserves the accepted controlled-width nib ladder", () => {
  assert.deepEqual(NIB_IDS, ["UEF", "EF", "F", "M", "B", "EB", "SU"]);
  for (const fontSize of [18, 26, 28, 52]) {
    for (const id of ["UEF", "EF", "F", "M", "B", "EB"]) {
      const mStroke = fontSize * M_STROKE_EM;
      const finished = mStroke + getNibGeometry(id, fontSize).morphDelta;
      assert.ok(Math.abs(finished - mStroke * ROUND_NIB_RATIOS[id]) < 1e-12);
    }
  }
});

test("scaled contact and expansion preserve the reference formulas", () => {
  const geometry = getScaledNibGeometry("B", 26, 1.125);
  assert.equal(
    geometry.morphDelta,
    getNibGeometry("B", 26).morphDelta * 1.125,
  );
  assert.deepEqual(geometryExpansion({ kind: "round", morphDelta: -2 }), {
    x: 1,
    y: 1,
  });
});

test("morphology performs fractional dilation and erosion deterministically", () => {
  const source = new Uint8ClampedArray([
    0, 0, 0,
    0, 255, 0,
    0, 0, 0,
  ]);
  assert.deepEqual(Array.from(morphAlpha(source, 3, 3, 1, 0, "dilate")), [
    0, 0, 0,
    255, 255, 255,
    0, 0, 0,
  ]);
  assert.deepEqual(Array.from(morphAlpha(source, 3, 3, 0.5, 0, "dilate")), [
    0, 0, 0,
    128, 255, 128,
    0, 0, 0,
  ]);
});

test("broad nibs increase signed density range within the recipe cap", () => {
  assert.ok(
    getNibDensityRange("EB", 0.42, ORDINARY_GREEN_RECIPE_R1)
      > getNibDensityRange("M", 0.42, ORDINARY_GREEN_RECIPE_R1),
  );
  assert.equal(
    shapeNibDensityVariation("EB", -0.3),
    -shapeNibDensityVariation("EB", 0.3),
  );
  assert.throws(() => getNibDensityRange("M", 0.42), /recipe must be an object/);
  assert.throws(
    () => getNibDensityRange("M", 0.42, {}),
    /invalid keys/,
  );

  const nonFinite = JSON.parse(JSON.stringify(ORDINARY_GREEN_RECIPE_R1));
  nonFinite.id = "custom-non-finite-study";
  nonFinite.density.rangeMaximum = Number.NaN;
  assert.throws(
    () => getNibDensityRange("M", 0.42, nonFinite),
    /finite number/,
  );
  for (const absorption of [Number.NaN, Number.POSITIVE_INFINITY, -0.01, 1.01]) {
    assert.throws(
      () => getNibDensityRange("M", absorption, ORDINARY_GREEN_RECIPE_R1),
      /normalizedAbsorption must be a finite number in 0\.\.\.1/,
    );
  }
});
