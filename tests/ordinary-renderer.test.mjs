import assert from "node:assert/strict";
import test from "node:test";
import { renderOrdinaryInkMaterial } from "fountain-ink-engine/canvas2d";
import {
  compositeOrdinaryInk,
  getMeanDensity,
} from "fountain-ink-engine/density";
import { ORDINARY_GREEN_RECIPE_R5 } from "fountain-ink-engine/recipes";

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

function makeSparseMask(width, height, supportedPixels) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (const [x, y, alpha = 255] of supportedPixels) {
    const offset = (y * width + x) * 4;
    data[offset] = 255;
    data[offset + 1] = 255;
    data[offset + 2] = 255;
    data[offset + 3] = alpha;
  }
  return makeCanvas(width, height, data);
}

function makeSparseContact({
  supportedPixels,
  destinationX,
  destinationY,
  x,
  baseline,
  seed,
}) {
  const width = Math.max(...supportedPixels.map(([localX]) => localX)) + 1;
  const height = Math.max(...supportedPixels.map(([, localY]) => localY)) + 1;
  const mask = makeSparseMask(width, height, supportedPixels);
  return {
    rgbaMask: mask.getContext("2d").getImageData(0, 0, width, height),
    destinationX,
    destinationY,
    x,
    baseline,
    seed,
  };
}

function makeOptions(absorption) {
  const pixelWidth = 18;
  const pixelHeight = 14;
  const mask = makeMask(pixelWidth, pixelHeight);
  const glyphContacts = [{
    rgbaMask: mask.getContext("2d").getImageData(
      0,
      0,
      pixelWidth,
      pixelHeight,
    ),
    destinationX: 0,
    destinationY: 0,
    x: 3,
    baseline: 11,
    seed: 0x1234abcd,
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
      glyphContacts,
      recipe: ORDINARY_GREEN_RECIPE_R5,
      createLayer: makeCanvas,
    },
    mask,
    glyphContacts,
  };
}

function assertRgbaShape(image, width, height) {
  assert.equal(image.width, width);
  assert.equal(image.height, height);
  assert.ok(image.data instanceof Uint8ClampedArray);
  assert.equal(image.data.length, width * height * 4);
  assert.ok(image.data.every((value) => Number.isInteger(value)));
}

function cropRgba(image, minimumX, maximumX) {
  const cropped = [];
  for (let y = 0; y < image.height; y += 1) {
    for (let x = minimumX; x < maximumX; x += 1) {
      const offset = (y * image.width + x) * 4;
      cropped.push(...image.data.slice(offset, offset + 4));
    }
  }
  return cropped;
}

function cropScalar(field, width, height, minimumX, maximumX) {
  const cropped = [];
  for (let y = 0; y < height; y += 1) {
    for (let x = minimumX; x < maximumX; x += 1) {
      cropped.push(field[y * width + x]);
    }
  }
  return cropped;
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
    "densityTransport",
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
  assert.ok(stages.density.sampleCount instanceof Uint16Array);
  assert.equal(stages.density.accumulatedVariation.length, 18 * 14);
  assert.equal(stages.density.sampleCount.length, 18 * 14);
  assert.equal(stages.surface.applied, true);
  assertRgbaShape(stages.surface.materialCoverageCandidate, 18, 14);
  assert.ok(stages.surface.densityTransport.signedNumerator instanceof Float32Array);
  assert.ok(stages.surface.densityTransport.pigmentWeight instanceof Float32Array);
  assertRgbaShape(stages.optical.compositeRgba, 18, 14);

  assert.equal(result.imageData, stages.optical.compositeRgba);
  assert.equal(result.densityField, stages.density.accumulatedVariation);
  assert.equal(result.densitySamples, stages.density.sampleCount);
  assert.equal(
    result.materialCoverage,
    stages.surface.materialCoverageCandidate,
  );
  assert.equal(
    result.surfaceDensityTransport,
    stages.surface.densityTransport,
  );
});

test("zero absorption records an explicit unapplied Surface stage", () => {
  const { options } = makeOptions(0);
  const result = renderOrdinaryInkMaterial(options);

  assert.equal(result.stages.surface.applied, false);
  assert.equal(result.stages.surface.materialCoverageCandidate, null);
  assert.equal(result.stages.surface.densityTransport, null);
  assert.equal(result.surfaceDensityTransport, null);
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
  const originalContacts = firstFixture.glyphContacts.map((contact) => ({
    ...contact,
    rgbaMask: {
      ...contact.rgbaMask,
      data: new Uint8ClampedArray(contact.rgbaMask.data),
    },
  }));

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
  assert.deepEqual(firstFixture.glyphContacts, originalContacts);
});

test("density transport never changes Contact-owned Optical pixels", () => {
  const { options } = makeOptions(42);
  const result = renderOrdinaryInkMaterial(options);
  const legacyMeanFallback = compositeOrdinaryInk({
    pixelWidth: options.pixelWidth,
    pixelHeight: options.pixelHeight,
    mask: result.stages.contact.rgbaMask,
    materialCoverage: result.stages.surface.materialCoverageCandidate,
    densityField: result.stages.density.accumulatedVariation,
    densitySamples: result.stages.density.sampleCount,
    nibId: options.nibId,
    flow: options.flow,
    absorption: options.absorption,
    recipe: options.recipe,
  });
  for (
    let index = 0;
    index < result.stages.density.sampleCount.length;
    index += 1
  ) {
    const alphaOffset = index * 4 + 3;
    if (result.stages.density.sampleCount[index] > 0) {
      assert.equal(
        result.imageData.data[alphaOffset],
        legacyMeanFallback.data[alphaOffset],
      );
    }
  }
});

test("a nonoverlapping suffix preserves existing Contact, Density, and Optical pixels at absorption zero", () => {
  const pixelWidth = 12;
  const pixelHeight = 5;
  const basePixels = [[1, 1, 160], [2, 1, 255]];
  const suffixPixels = [[7, 1, 255], [8, 1, 192]];
  const baseContact = makeSparseContact({
    supportedPixels: [[0, 0, 160], [1, 0, 255]],
    destinationX: 1,
    destinationY: 1,
    x: 1,
    baseline: 4,
    seed: 1,
  });
  const suffixContact = makeSparseContact({
    supportedPixels: [[0, 0, 255], [1, 0, 192]],
    destinationX: 7,
    destinationY: 1,
    x: 7,
    baseline: 4,
    seed: 2,
  });
  const common = {
    pixelWidth,
    pixelHeight,
    width: pixelWidth,
    height: pixelHeight,
    absorption: 0,
    surfaceSeed: 0x13579bdf,
    nibId: "M",
    flow: 58,
    scale: 1,
    fontSize: 6,
    recipe: ORDINARY_GREEN_RECIPE_R5,
    createLayer: makeCanvas,
  };
  const before = renderOrdinaryInkMaterial({
    ...common,
    outputContext: makeCanvas(pixelWidth, pixelHeight).getContext("2d"),
    mask: makeSparseMask(pixelWidth, pixelHeight, basePixels),
    glyphContacts: [baseContact],
  });
  const after = renderOrdinaryInkMaterial({
    ...common,
    outputContext: makeCanvas(pixelWidth, pixelHeight).getContext("2d"),
    mask: makeSparseMask(
      pixelWidth,
      pixelHeight,
      [...basePixels, ...suffixPixels],
    ),
    glyphContacts: [baseContact, suffixContact],
  });

  for (const [x, y] of basePixels) {
    const pixelIndex = y * pixelWidth + x;
    const rgbaOffset = pixelIndex * 4;
    assert.deepEqual(
      after.stages.contact.rgbaMask.data.slice(rgbaOffset, rgbaOffset + 4),
      before.stages.contact.rgbaMask.data.slice(rgbaOffset, rgbaOffset + 4),
    );
    assert.equal(
      after.stages.density.accumulatedVariation[pixelIndex],
      before.stages.density.accumulatedVariation[pixelIndex],
    );
    assert.equal(
      after.stages.density.sampleCount[pixelIndex],
      before.stages.density.sampleCount[pixelIndex],
    );
    assert.deepEqual(
      after.stages.optical.compositeRgba.data.slice(
        rgbaOffset,
        rgbaOffset + 4,
      ),
      before.stages.optical.compositeRgba.data.slice(
        rgbaOffset,
        rgbaOffset + 4,
      ),
    );
  }
});

test("a far suffix preserves the complete existing material crop at absorption 42", () => {
  const pixelWidth = 80;
  const pixelHeight = 36;
  const rectangle = (minimumX, maximumX, alpha) => {
    const pixels = [];
    for (let y = 10; y < 18; y += 1) {
      for (let x = minimumX; x < maximumX; x += 1) {
        pixels.push([x, y, alpha]);
      }
    }
    return pixels;
  };
  const localRectangle = (alpha) => {
    const pixels = [];
    for (let y = 0; y < 8; y += 1) {
      for (let x = 0; x < 8; x += 1) pixels.push([x, y, alpha]);
    }
    return pixels;
  };
  const basePixels = rectangle(6, 14, 90);
  const suffixPixels = rectangle(66, 74, 255);
  const baseContact = makeSparseContact({
    supportedPixels: localRectangle(90),
    destinationX: 6,
    destinationY: 10,
    x: 6,
    baseline: 18,
    seed: 1,
  });
  const suffixContact = makeSparseContact({
    supportedPixels: localRectangle(255),
    destinationX: 66,
    destinationY: 10,
    x: 66,
    baseline: 18,
    seed: 2,
  });
  const common = {
    pixelWidth,
    pixelHeight,
    width: pixelWidth,
    height: pixelHeight,
    absorption: 42,
    surfaceSeed: 0x13579bdf,
    nibId: "M",
    flow: 58,
    scale: 1,
    fontSize: 12,
    recipe: ORDINARY_GREEN_RECIPE_R5,
    createLayer: makeCanvas,
  };
  const render = (pixels, glyphContacts) => renderOrdinaryInkMaterial({
    ...common,
    outputContext: makeCanvas(pixelWidth, pixelHeight).getContext("2d"),
    mask: makeSparseMask(pixelWidth, pixelHeight, pixels),
    glyphContacts,
  });
  const before = render(basePixels, [baseContact]);
  const after = render(
    [...basePixels, ...suffixPixels],
    [baseContact, suffixContact],
  );
  const prefixMinimumX = 0;
  const prefixMaximumX = 30;

  assert.deepEqual(
    cropRgba(after.stages.contact.rgbaMask, prefixMinimumX, prefixMaximumX),
    cropRgba(before.stages.contact.rgbaMask, prefixMinimumX, prefixMaximumX),
  );
  assert.deepEqual(
    cropScalar(
      after.stages.density.accumulatedVariation,
      pixelWidth,
      pixelHeight,
      prefixMinimumX,
      prefixMaximumX,
    ),
    cropScalar(
      before.stages.density.accumulatedVariation,
      pixelWidth,
      pixelHeight,
      prefixMinimumX,
      prefixMaximumX,
    ),
  );
  assert.deepEqual(
    cropScalar(
      after.stages.density.sampleCount,
      pixelWidth,
      pixelHeight,
      prefixMinimumX,
      prefixMaximumX,
    ),
    cropScalar(
      before.stages.density.sampleCount,
      pixelWidth,
      pixelHeight,
      prefixMinimumX,
      prefixMaximumX,
    ),
  );
  assert.deepEqual(
    cropRgba(
      after.stages.surface.materialCoverageCandidate,
      prefixMinimumX,
      prefixMaximumX,
    ),
    cropRgba(
      before.stages.surface.materialCoverageCandidate,
      prefixMinimumX,
      prefixMaximumX,
    ),
  );
  const prefixGridMaximumX = Math.ceil(
    prefixMaximumX
      * before.stages.surface.densityTransport.width
      / pixelWidth,
  );
  for (const plane of ["signedNumerator", "pigmentWeight"]) {
    assert.deepEqual(
      cropScalar(
        after.stages.surface.densityTransport[plane],
        after.stages.surface.densityTransport.width,
        after.stages.surface.densityTransport.height,
        0,
        prefixGridMaximumX,
      ),
      cropScalar(
        before.stages.surface.densityTransport[plane],
        before.stages.surface.densityTransport.width,
        before.stages.surface.densityTransport.height,
        0,
        prefixGridMaximumX,
      ),
    );
  }
  assert.deepEqual(
    cropRgba(
      after.stages.optical.compositeRgba,
      prefixMinimumX,
      prefixMaximumX,
    ),
    cropRgba(
      before.stages.optical.compositeRgba,
      prefixMinimumX,
      prefixMaximumX,
    ),
  );
});

test("renderer rejects malformed glyph Contacts before Canvas reads or output allocation", () => {
  let maskReads = 0;
  let outputAllocations = 0;
  const mask = {
    getContext() {
      maskReads += 1;
      throw new Error("mask must not be read");
    },
  };
  const outputContext = {
    createImageData() {
      outputAllocations += 1;
      throw new Error("output must not be allocated");
    },
  };
  assert.throws(() => renderOrdinaryInkMaterial({
    outputContext,
    mask,
    pixelWidth: 4,
    pixelHeight: 4,
    width: 4,
    height: 4,
    absorption: 0,
    surfaceSeed: 0,
    nibId: "M",
    flow: 58,
    scale: 1,
    fontSize: 6,
    glyphContacts: [{
      rgbaMask: { width: 1, height: 1, data: new Uint8ClampedArray(4) },
      destinationX: 0.25,
      destinationY: 0,
      x: 0,
      baseline: 4,
      seed: 1,
    }],
    recipe: ORDINARY_GREEN_RECIPE_R5,
  }), /destinationX must be an integer/);
  assert.equal(maskReads, 0);
  assert.equal(outputAllocations, 0);
});

test("keyboard flow changes mean and optical output but not contact, density field, or Surface", () => {
  const { options } = makeOptions(42);
  const flows = [0, 58, 100];
  const results = flows.map((flow) => renderOrdinaryInkMaterial({
    ...options,
    outputContext: makeCanvas(
      options.pixelWidth,
      options.pixelHeight,
    ).getContext("2d"),
    flow,
  }));
  const reference = results[0].stages;

  for (const { stages } of results.slice(1)) {
    assert.deepEqual(stages.contact.rgbaMask, reference.contact.rgbaMask);
    assert.deepEqual(
      stages.density.accumulatedVariation,
      reference.density.accumulatedVariation,
    );
    assert.deepEqual(
      stages.density.sampleCount,
      reference.density.sampleCount,
    );
    assert.deepEqual(
      stages.surface.materialCoverageCandidate,
      reference.surface.materialCoverageCandidate,
    );
    assert.deepEqual(
      stages.surface.densityTransport,
      reference.surface.densityTransport,
    );
    assert.equal(stages.surface.applied, reference.surface.applied);
  }

  const means = flows.map((flow) => getMeanDensity(
    options.nibId,
    flow,
    options.absorption,
    options.recipe,
  ));
  assert.ok(means.every((mean) => (
    mean > options.recipe.density.meanMinimum
      && mean < options.recipe.density.meanMaximum
  )), "fixture means must avoid recipe clamps");
  assert.ok(means[0] < means[1] && means[1] < means[2]);

  const opticalAlphaTotal = ({ stages }) => {
    let total = 0;
    for (
      let offset = 3;
      offset < stages.optical.compositeRgba.data.length;
      offset += 4
    ) {
      total += stages.optical.compositeRgba.data[offset];
    }
    return total;
  };
  const alphaTotals = results.map(opticalAlphaTotal);
  assert.ok(
    alphaTotals[0] < alphaTotals[1] && alphaTotals[1] < alphaTotals[2],
  );
  assert.notDeepEqual(
    results[0].stages.optical.compositeRgba,
    results[1].stages.optical.compositeRgba,
  );
  assert.notDeepEqual(
    results[1].stages.optical.compositeRgba,
    results[2].stages.optical.compositeRgba,
  );
});

test("stage fields remain finite, bounded, and nonblank", () => {
  const { options } = makeOptions(42);
  const { stages } = renderOrdinaryInkMaterial(options);

  assert.ok(stages.density.accumulatedVariation.every(Number.isFinite));
  assert.ok(stages.density.sampleCount.every((value) => (
    Number.isInteger(value) && value >= 0 && value <= 0xffff
  )));
  assert.ok(stages.surface.densityTransport.signedNumerator.every(Number.isFinite));
  assert.ok(stages.surface.densityTransport.pigmentWeight.every((value) => (
    Number.isFinite(value) && value >= 0
  )));
  for (
    let index = 0;
    index < stages.surface.densityTransport.pigmentWeight.length;
    index += 1
  ) {
    assert.ok(
      Math.abs(stages.surface.densityTransport.signedNumerator[index])
        <= stages.surface.densityTransport.pigmentWeight[index],
    );
  }
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
