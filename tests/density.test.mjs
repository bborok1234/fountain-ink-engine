import assert from "node:assert/strict";
import test from "node:test";
import {
  compositeOrdinaryInk,
  createDensityField,
  getEffectiveFlow,
  getMaterialMix,
  getMeanDensity,
  sampleGlyphDensityVariation,
} from "../src/density/index.js";
import { ORDINARY_GREEN_RECIPE_R1 } from "../src/recipes/index.js";

test("preserves the accepted flow and mean-density equations", () => {
  assert.equal(getEffectiveFlow("M", 58), 0.58);
  assert.equal(getEffectiveFlow("UEF", 0), 0);
  assert.equal(getEffectiveFlow("EB", 100), 1);
  assert.ok(
    Math.abs(getMeanDensity("M", 58, 42, ORDINARY_GREEN_RECIPE_R1) - 0.5524)
      < 1e-12,
  );
});

test("public flow and absorption inputs fail closed outside percent units", () => {
  for (const flow of [Number.NaN, Number.POSITIVE_INFINITY, -1, 101]) {
    assert.throws(() => getEffectiveFlow("M", flow), /flow must be a finite number/);
  }
  for (const absorption of [Number.NaN, Number.NEGATIVE_INFINITY, -1, 101]) {
    assert.throws(
      () => getMeanDensity("M", 58, absorption, ORDINARY_GREEN_RECIPE_R1),
      /absorption must be a finite number/,
    );
    assert.throws(
      () => getMaterialMix(absorption, ORDINARY_GREEN_RECIPE_R1),
      /absorption must be a finite number/,
    );
  }
});

test("glyph density sampling and planes repeat from explicit layout seeds", () => {
  const sample = sampleGlyphDensityVariation(3.2, -4.7, 28, 1234);
  assert.equal(sample, sampleGlyphDensityVariation(3.2, -4.7, 28, 1234));
  const options = {
    pixelWidth: 32,
    pixelHeight: 24,
    scale: 1,
    fontSize: 20,
    lineLayouts: [{
      baseline: 18,
      glyphs: [{
        character: "가",
        x: 4,
        width: 12,
        sourceIndex: 0,
        cadence: { seed: 0x1234abcd },
      }],
    }],
  };
  const first = createDensityField(options);
  const second = createDensityField(options);
  assert.deepEqual(first.densityField, second.densityField);
  assert.deepEqual(first.densitySamples, second.densitySamples);
  assert.ok(first.densitySamples.some((value) => value > 0));

  const zeroSeed = createDensityField({
    ...options,
    lineLayouts: [{
      ...options.lineLayouts[0],
      glyphs: [{
        ...options.lineLayouts[0].glyphs[0],
        cadence: { seed: 0 },
      }],
    }],
  });
  const missingSeed = createDensityField({
    ...options,
    lineLayouts: [{
      ...options.lineLayouts[0],
      glyphs: [{
        ...options.lineLayouts[0].glyphs[0],
        cadence: {},
      }],
    }],
  });
  assert.notDeepEqual(zeroSeed.densityField, missingSeed.densityField);

  assert.throws(() => createDensityField({
    ...options,
    lineLayouts: [{
      ...options.lineLayouts[0],
      glyphs: [{
        ...options.lineLayouts[0].glyphs[0],
        cadence: { seed: 0x1_0000_0000 },
      }],
    }],
  }), /glyph\.cadence\.seed must be an explicit unsigned 32-bit integer/);
});

test("ordinary composite stays inside calibrated direct-stroke endpoints", () => {
  const mask = new Uint8ClampedArray([255, 255, 255, 255]);
  const result = compositeOrdinaryInk({
    pixelWidth: 1,
    pixelHeight: 1,
    mask,
    materialCoverage: mask,
    densityField: new Float32Array([0]),
    densitySamples: new Uint8Array([1]),
    nibId: "M",
    flow: 58,
    absorption: 42,
    recipe: ORDINARY_GREEN_RECIPE_R1,
  });
  assert.deepEqual(Array.from(result.data), [29, 55, 40, 213]);
});

test("transparent coverage produces no optical ink", () => {
  const result = compositeOrdinaryInk({
    pixelWidth: 1,
    pixelHeight: 1,
    mask: new Uint8ClampedArray(4),
    densityField: new Float32Array(1),
    densitySamples: new Uint8Array(1),
    nibId: "M",
    flow: 58,
    absorption: 0,
    recipe: ORDINARY_GREEN_RECIPE_R1,
  });
  assert.deepEqual(Array.from(result.data), [0, 0, 0, 0]);
  assert.throws(() => compositeOrdinaryInk({
    pixelWidth: 1,
    pixelHeight: 1,
    mask: new Uint8ClampedArray(4),
    densityField: new Float32Array(1),
    densitySamples: new Uint8Array(1),
    nibId: "M",
    flow: 58,
    absorption: 0,
  }), /recipe/);
});
