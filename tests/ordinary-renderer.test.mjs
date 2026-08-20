import assert from "node:assert/strict";
import test from "node:test";
import { renderOrdinaryInkMaterial } from "fountain-ink-engine/canvas2d";
import { ORDINARY_GREEN_RECIPE_R1 } from "fountain-ink-engine/recipes";

function makeImageData(width, height, data) {
  return {
    width,
    height,
    data: data === undefined
      ? new Uint8ClampedArray(width * height * 4)
      : new Uint8ClampedArray(data),
  };
}

function makeCanvas(width, height, initialData) {
  let pixels = makeImageData(width, height, initialData);
  const context = {
    imageSmoothingEnabled: false,
    imageSmoothingQuality: "low",
    createImageData: makeImageData,
    getImageData(x, y, requestedWidth, requestedHeight) {
      assert.equal(x, 0);
      assert.equal(y, 0);
      assert.equal(requestedWidth, width);
      assert.equal(requestedHeight, height);
      return makeImageData(width, height, pixels.data);
    },
    putImageData(image, x, y) {
      assert.equal(x, 0);
      assert.equal(y, 0);
      assert.equal(image.width, width);
      assert.equal(image.height, height);
      pixels = makeImageData(width, height, image.data);
    },
    drawImage(source, x, y, requestedWidth, requestedHeight) {
      assert.equal(x, 0);
      assert.equal(y, 0);
      assert.equal(requestedWidth, width);
      assert.equal(requestedHeight, height);
      const sourcePixels = source.getContext("2d").getImageData(
        0,
        0,
        source.width,
        source.height,
      );
      const next = makeImageData(width, height);
      for (let destinationY = 0; destinationY < height; destinationY += 1) {
        const sourceY = Math.min(
          source.height - 1,
          Math.floor(destinationY * source.height / height),
        );
        for (let destinationX = 0; destinationX < width; destinationX += 1) {
          const sourceX = Math.min(
            source.width - 1,
            Math.floor(destinationX * source.width / width),
          );
          const sourceOffset = (sourceY * source.width + sourceX) * 4;
          const destinationOffset = (destinationY * width + destinationX) * 4;
          next.data.set(
            sourcePixels.data.subarray(sourceOffset, sourceOffset + 4),
            destinationOffset,
          );
        }
      }
      pixels = next;
    },
  };
  return {
    width,
    height,
    getContext(kind) {
      assert.equal(kind, "2d");
      return context;
    },
    snapshot() {
      return new Uint8ClampedArray(pixels.data);
    },
  };
}

function makeMask(width, height) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 2; y < height - 2; y += 1) {
    for (let x = 3; x < width - 3; x += 1) {
      const offset = (y * width + x) * 4;
      data[offset] = 255;
      data[offset + 1] = 255;
      data[offset + 2] = 255;
      data[offset + 3] = 210;
    }
  }
  return makeCanvas(width, height, data);
}

function makeOptions(absorption) {
  const pixelWidth = 18;
  const pixelHeight = 14;
  const mask = makeMask(pixelWidth, pixelHeight);
  const lineLayouts = [{
    baseline: 11,
    glyphs: [{
      character: "가",
      x: 3,
      width: 10,
      sourceIndex: 0,
      cadence: { seed: 0x1234abcd },
    }],
  }];
  return {
    options: {
      outputContext: makeCanvas(pixelWidth, pixelHeight).getContext("2d"),
      mask,
      pixelWidth,
      pixelHeight,
      width: pixelWidth,
      height: pixelHeight,
      absorption,
      surfaceSeed: 0x13579bdf,
      nibId: "M",
      flow: 58,
      scale: 1,
      fontSize: 12,
      lineLayouts,
      recipe: ORDINARY_GREEN_RECIPE_R1,
      createLayer: makeCanvas,
    },
    mask,
    lineLayouts,
  };
}

function assertRgbaShape(image, width, height) {
  assert.equal(image.width, width);
  assert.equal(image.height, height);
  assert.ok(image.data instanceof Uint8ClampedArray);
  assert.equal(image.data.length, width * height * 4);
  assert.ok(image.data.every((value) => Number.isInteger(value)));
}

test("keyboard renderer exposes honest four-stage diagnostics and aliases", () => {
  const { options } = makeOptions(42);
  const result = renderOrdinaryInkMaterial(options);
  const { stages } = result;

  assert.deepEqual(Object.keys(stages), [
    "contact",
    "density",
    "surface",
    "optical",
  ]);
  assert.deepEqual(Object.keys(stages.contact), ["rgbaMask"]);
  assert.deepEqual(Object.keys(stages.density), [
    "accumulatedVariation",
    "sampleCount",
  ]);
  assert.deepEqual(Object.keys(stages.surface), [
    "materialCoverageCandidate",
    "applied",
  ]);
  assert.deepEqual(Object.keys(stages.optical), ["compositeRgba"]);
  assert.ok(Object.isFrozen(stages));
  assert.ok(Object.isFrozen(stages.contact));
  assert.ok(Object.isFrozen(stages.density));
  assert.ok(Object.isFrozen(stages.surface));
  assert.ok(Object.isFrozen(stages.optical));

  assertRgbaShape(stages.contact.rgbaMask, 18, 14);
  assert.ok(stages.density.accumulatedVariation instanceof Float32Array);
  assert.ok(stages.density.sampleCount instanceof Uint8Array);
  assert.equal(stages.density.accumulatedVariation.length, 18 * 14);
  assert.equal(stages.density.sampleCount.length, 18 * 14);
  assert.equal(stages.surface.applied, true);
  assertRgbaShape(stages.surface.materialCoverageCandidate, 18, 14);
  assertRgbaShape(stages.optical.compositeRgba, 18, 14);

  assert.equal(result.imageData, stages.optical.compositeRgba);
  assert.equal(result.densityField, stages.density.accumulatedVariation);
  assert.equal(result.densitySamples, stages.density.sampleCount);
  assert.equal(
    result.materialCoverage,
    stages.surface.materialCoverageCandidate,
  );
});

test("zero absorption records an explicit unapplied Surface stage", () => {
  const { options } = makeOptions(0);
  const result = renderOrdinaryInkMaterial(options);

  assert.equal(result.stages.surface.applied, false);
  assert.equal(result.stages.surface.materialCoverageCandidate, null);
  assert.equal(result.materialCoverage, null);
  assert.ok(result.stages.contact.rgbaMask.data.some((value, index) => (
    index % 4 === 3 && value > 0
  )));
  assert.ok(result.stages.optical.compositeRgba.data.some((value, index) => (
    index % 4 === 3 && value > 0
  )));
});

test("stage diagnostics are deterministic and do not mutate renderer inputs", () => {
  const firstFixture = makeOptions(42);
  const secondFixture = makeOptions(42);
  const originalMask = firstFixture.mask.snapshot();
  const originalLayouts = structuredClone(firstFixture.lineLayouts);

  const first = renderOrdinaryInkMaterial(firstFixture.options);
  const second = renderOrdinaryInkMaterial(secondFixture.options);

  assert.deepEqual(
    first.stages.contact.rgbaMask.data,
    second.stages.contact.rgbaMask.data,
  );
  assert.deepEqual(
    first.stages.density.accumulatedVariation,
    second.stages.density.accumulatedVariation,
  );
  assert.deepEqual(
    first.stages.density.sampleCount,
    second.stages.density.sampleCount,
  );
  assert.deepEqual(
    first.stages.surface.materialCoverageCandidate.data,
    second.stages.surface.materialCoverageCandidate.data,
  );
  assert.deepEqual(
    first.stages.optical.compositeRgba.data,
    second.stages.optical.compositeRgba.data,
  );
  assert.deepEqual(firstFixture.mask.snapshot(), originalMask);
  assert.deepEqual(firstFixture.lineLayouts, originalLayouts);
});

test("stage fields remain finite, bounded, and nonblank", () => {
  const { options } = makeOptions(42);
  const { stages } = renderOrdinaryInkMaterial(options);

  assert.ok(stages.density.accumulatedVariation.every(Number.isFinite));
  assert.ok(stages.density.sampleCount.every((value) => (
    Number.isInteger(value) && value >= 0 && value <= 255
  )));
  for (const image of [
    stages.contact.rgbaMask,
    stages.surface.materialCoverageCandidate,
    stages.optical.compositeRgba,
  ]) {
    assert.ok(image.data.every((value) => (
      Number.isInteger(value) && value >= 0 && value <= 255
    )));
    assert.ok(image.data.some((value, index) => index % 4 === 3 && value > 0));
  }
});
