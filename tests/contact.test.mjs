import assert from "node:assert/strict";
import test from "node:test";
import {
  M_STROKE_EM,
  NIB_IDS,
  ROUND_NIB_RATIOS,
  analyzeContactAlpha,
  geometryExpansion,
  getGlyphContactGeometry,
  getNibGeometry,
  getNibProfile,
  getScaledNibGeometry,
  morphAlpha,
  shapeNibDensityVariation,
} from "../src/contact/index.js";
import { getNibDensityRange } from "../src/density/index.js";
import { hashString, randomFrom } from "../src/deterministic/index.js";
import { ORDINARY_GREEN_RECIPE_R10 } from "../src/recipes/index.js";
import { PAPER_SURFACE_BALANCED_R1 } from "../src/surface-recipes/index.js";

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
    assert.ok(
      Math.abs(getNibDensityRange(
        nibId,
        PAPER_SURFACE_BALANCED_R1,
        ORDINARY_GREEN_RECIPE_R10,
      ) - acceptedRangeAtAbsorption42[nibId]) < 1e-12,
    );
  }
  assert.ok(
    getNibDensityRange("EB", PAPER_SURFACE_BALANCED_R1, ORDINARY_GREEN_RECIPE_R10)
      > getNibDensityRange("M", PAPER_SURFACE_BALANCED_R1, ORDINARY_GREEN_RECIPE_R10),
  );
  assert.equal(
    shapeNibDensityVariation("EB", -0.3),
    -shapeNibDensityVariation("EB", 0.3),
  );
  assert.throws(() => getNibDensityRange("M", 0.42), /recipe must be an object/);
  assert.throws(
    () => getNibDensityRange("M", PAPER_SURFACE_BALANCED_R1, {}),
    /recipeSchemaVersion must be an enumerable own data property/,
  );

  const nonFinite = JSON.parse(JSON.stringify(ORDINARY_GREEN_RECIPE_R10));
  nonFinite.id = "custom-non-finite-study";
  nonFinite.density.rangeMaximum = Number.NaN;
  assert.throws(
    () => getNibDensityRange("M", 0.42, nonFinite),
    /finite number/,
  );
  assert.throws(
    () => getNibDensityRange("M", null, ORDINARY_GREEN_RECIPE_R10),
    /surfaceRecipe must be a plain object/,
  );
});

test("final Contact masks expose measurable width, components, and counters", () => {
  const ring = new Uint8ClampedArray(11 * 11);
  for (let y = 2; y <= 8; y += 1) {
    for (let x = 2; x <= 8; x += 1) {
      if (x <= 3 || x >= 7 || y <= 3 || y >= 7) ring[y * 11 + x] = 255;
    }
  }
  const metrics = analyzeContactAlpha(ring, 11, 11);
  assert.equal(metrics.connectedComponents, 1);
  assert.equal(metrics.counterCount, 1);
  assert.deepEqual(metrics.counterAreas, [9]);
  assert.ok(metrics.medianStrokeWidth > 0);
  assert.ok(metrics.medianHorizontalRun > 0);
  assert.ok(metrics.medianVerticalRun > 0);
});

test("synthetic final-mask ladder is monotonic and SU remains anisotropic", () => {
  const width = 41;
  const height = 41;
  const base = new Uint8ClampedArray(width * height);
  for (let y = 8; y < 33; y += 1) {
    for (let x = 19; x < 22; x += 1) base[y * width + x] = 255;
  }
  const roundWidths = [0, 1, 2, 3].map((radius) => analyzeContactAlpha(
    morphAlpha(base, width, height, radius, radius, "dilate"),
    width,
    height,
  ).medianStrokeWidth);
  assert.ok(roundWidths.every((value, index) => index === 0 || value > roundWidths[index - 1]));
  const su = analyzeContactAlpha(
    morphAlpha(base, width, height, 4, 1, "dilate"),
    width,
    height,
  );
  const baseMetrics = analyzeContactAlpha(base, width, height);
  assert.ok(
    su.medianHorizontalRun - baseMetrics.medianHorizontalRun
      > su.medianVerticalRun - baseMetrics.medianVerticalRun,
  );
});
