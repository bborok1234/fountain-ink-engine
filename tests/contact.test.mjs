import assert from "node:assert/strict";
import test from "node:test";
import {
  M_STROKE_EM,
  NIB_IDS,
  ROUND_NIB_RATIOS,
  geometryExpansion,
  getGlyphContactGeometry,
  getNibDensityRange,
  getNibGeometry,
  getNibProfile,
  getScaledNibGeometry,
  morphAlpha,
  shapeNibDensityVariation,
} from "../src/contact/index.js";
import { hashString, randomFrom } from "../src/deterministic/index.js";
import { ORDINARY_GREEN_RECIPE_R4 } from "../src/recipes/index.js";

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

test("glyph contact preserves legacy flow-58 geometry without a flow input", () => {
  const legacyFlow58Geometry = (nibId, fontSize, glyphSeed) => {
    const profile = getNibProfile(nibId);
    const widthRandom = randomFrom(
      (glyphSeed ^ hashString(`${nibId}:width`)) >>> 0,
    )();
    const widthScale = 1 + (widthRandom - 0.5) * 2
      * profile.widthVariation * (0.72 + 58 / 100 * 0.28);
    return getScaledNibGeometry(nibId, fontSize, widthScale);
  };

  for (const nibId of NIB_IDS) {
    for (const fontSize of [18, 28, 52]) {
      for (const glyphSeed of [0, 0x1234abcd, 0xffffffff]) {
        assert.deepEqual(
          getGlyphContactGeometry(nibId, fontSize, glyphSeed),
          legacyFlow58Geometry(nibId, fontSize, glyphSeed),
          `${nibId}/${fontSize}/${glyphSeed} must remain bit-exact`,
        );
      }
    }
  }
});

test("glyph contact is deterministic and unknown inputs fail closed", () => {
  const first = getGlyphContactGeometry("B", 28, 0x1234abcd);
  const second = getGlyphContactGeometry("B", 28, 0x1234abcd);
  assert.deepEqual(first, second);
  assert.ok(Object.isFrozen(first));
  assert.throws(
    () => getGlyphContactGeometry("UNKNOWN", 28, 0x1234abcd),
    /Unknown nibId/,
  );
  assert.throws(
    () => getGlyphContactGeometry("M", 0, 0x1234abcd),
    /fontSize must be a finite number/,
  );
  assert.throws(
    () => getGlyphContactGeometry("M", 28, 0x1_0000_0000),
    /glyphSeed must be an explicit unsigned 32-bit integer/,
  );
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
  const acceptedRangeAtAbsorption42 = {
    UEF: 0.20665000000000003,
    EF: 0.25624600000000003,
    F: 0.33064000000000004,
    M: 0.42156600000000005,
    B: 0.6116840000000001,
    EB: 0.7356740000000002,
    SU: 0.49596000000000007,
  };
  for (const nibId of NIB_IDS) {
    assert.equal(
      getNibDensityRange(nibId, 0.42, ORDINARY_GREEN_RECIPE_R4),
      acceptedRangeAtAbsorption42[nibId],
    );
  }
  assert.ok(
    getNibDensityRange("EB", 0.42, ORDINARY_GREEN_RECIPE_R4)
      > getNibDensityRange("M", 0.42, ORDINARY_GREEN_RECIPE_R4),
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

  const nonFinite = JSON.parse(JSON.stringify(ORDINARY_GREEN_RECIPE_R4));
  nonFinite.id = "custom-non-finite-study";
  nonFinite.density.rangeMaximum = Number.NaN;
  assert.throws(
    () => getNibDensityRange("M", 0.42, nonFinite),
    /finite number/,
  );
  for (const absorption of [Number.NaN, Number.POSITIVE_INFINITY, -0.01, 1.01]) {
    assert.throws(
      () => getNibDensityRange("M", absorption, ORDINARY_GREEN_RECIPE_R4),
      /normalizedAbsorption must be a finite number in 0\.\.\.1/,
    );
  }
});
