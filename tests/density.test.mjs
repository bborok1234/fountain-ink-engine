import assert from "node:assert/strict";
import test from "node:test";
import {
  MAXIMUM_INK_ALPHA,
  MINIMUM_INK_ALPHA,
  ORDINARY_INK_RGB,
  compositeOrdinaryInk,
  createDensityField,
  getEffectiveFlow,
  getMeanDensity,
  sampleGlyphDensityVariation,
} from "../src/density/index.js";

test("preserves the accepted flow and mean-density equations", () => {
  assert.equal(getEffectiveFlow("M", 58), 0.58);
  assert.equal(getEffectiveFlow("UEF", 0), 0);
  assert.equal(getEffectiveFlow("EB", 100), 1);
  assert.ok(Math.abs(getMeanDensity("M", 58, 42) - 0.5524) < 1e-12);
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
  });
  assert.deepEqual(Array.from(result.data.slice(0, 3)), [
    ORDINARY_INK_RGB.red,
    ORDINARY_INK_RGB.green,
    ORDINARY_INK_RGB.blue,
  ]);
  assert.ok(result.data[3] >= Math.floor(MINIMUM_INK_ALPHA * 255));
  assert.ok(result.data[3] <= Math.ceil(MAXIMUM_INK_ALPHA * 255));
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
  });
  assert.deepEqual(Array.from(result.data), [0, 0, 0, 0]);
});
