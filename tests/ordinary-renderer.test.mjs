import assert from "node:assert/strict";
import test from "node:test";
import { createFieldSignature } from "fountain-ink-engine/contracts";
import {
  beginOrdinaryInkMaterial,
  completeOrdinaryInkMaterial,
  prepareOrdinaryInkCanvasInput,
  renderOrdinaryInkMaterial as renderOrdinaryInkMaterialForSurface,
  upsampleKeyboardSurfaceCoverage,
} from "fountain-ink-engine/canvas2d";
import {
  getMeanDensity as getMeanDensityForSurface,
  getNibDensityRange as getNibDensityRangeForSurface,
} from "fountain-ink-engine/density";
import { compositeOrdinaryInk as compositeOrdinaryInkForSurface } from "fountain-ink-engine/optical";
import { shapeNibDensityVariation } from "fountain-ink-engine/contact";
import { sampleSurfaceDensityVariation } from "../src/surface/density-transport.js";
import { EDGE_DYE_COMPONENT_RECIPE_R5 as ACTIVE_DYE_COMPONENT_RECIPE } from "fountain-ink-engine/dye-components";
import { SHEEN_COMPONENT_RECIPE_R1 } from "fountain-ink-engine/sheen-components";
import {
  ORDINARY_BLUE_BLACK_RECIPE_R6,
  ORDINARY_BURGUNDY_RECIPE_R6,
  ORDINARY_GREEN_RECIPE_R12,
  ORDINARY_TEAL_RECIPE_R6,
} from "fountain-ink-engine/recipes";
import { legacySurfaceAt } from "./helpers/material-fixtures.mjs";
import {
  PAPER_SURFACE_ABSORBENT_R1,
  PAPER_SURFACE_ABSORBENT_R2,
  PAPER_SURFACE_ABSORBENT_R3,
  PAPER_SURFACE_ABSORBENT_R4,
  PAPER_SURFACE_BALANCED_R1,
  PAPER_SURFACE_BALANCED_R2,
  PAPER_SURFACE_SMOOTH_R1,
} from "fountain-ink-engine/surface-recipes";

const renderOrdinaryInkMaterial = (options) =>
  renderOrdinaryInkMaterialForSurface({
    ...options,
    surfaceRecipe: options.surfaceRecipe
      ?? legacySurfaceAt((options.absorption ?? 42) / 100),
  });
const getMeanDensity = (nibId, flow, absorption, recipe) =>
  getMeanDensityForSurface(
    nibId,
    flow,
    legacySurfaceAt(absorption / 100),
    recipe,
  );
const getNibDensityRange = (nibId, normalizedAbsorption, recipe) =>
  getNibDensityRangeForSurface(
    nibId,
    legacySurfaceAt(normalizedAbsorption),
    recipe,
  );
const compositeOrdinaryInk = (options) => compositeOrdinaryInkForSurface({
  ...options,
  surfaceRecipe: options.surfaceRecipe
    ?? legacySurfaceAt((options.absorption ?? 42) / 100),
});

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

function makeOptions(absorption, pixelWidth = 18, pixelHeight = 14) {
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
      recipe: ORDINARY_GREEN_RECIPE_R12,
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

test("staged worker boundary is byte-exact with the synchronous renderer", () => {
  const { options } = makeOptions(42);
  const surfaceRecipe = legacySurfaceAt(0.42);
  const synchronous = renderOrdinaryInkMaterial({
    ...options,
    surfaceRecipe,
  });
  const canvasInput = prepareOrdinaryInkCanvasInput({
    mask: options.mask,
    pixelWidth: options.pixelWidth,
    pixelHeight: options.pixelHeight,
    width: options.width,
    height: options.height,
    surfaceRecipe,
    createLayer: makeCanvas,
  });
  const prepared = beginOrdinaryInkMaterial({
    ...options,
    ...canvasInput,
    surfaceRecipe,
  });
  const materialCoverageCandidate = upsampleKeyboardSurfaceCoverage({
    coverage: prepared.surfaceCoverageGrid,
    pixelWidth: options.pixelWidth,
    pixelHeight: options.pixelHeight,
    createLayer: makeCanvas,
  });
  const staged = completeOrdinaryInkMaterial({
    prepared,
    materialCoverageCandidate,
    output: makeImageData(options.pixelWidth, options.pixelHeight),
  });

  assert.deepEqual(staged.imageData.data, synchronous.imageData.data);
  assert.deepEqual(
    staged.stages.surface.resolvedCoverage.data,
    synchronous.stages.surface.resolvedCoverage.data,
  );
  assert.deepEqual(
    staged.stages.density.normalizedConcentration.data,
    synchronous.stages.density.normalizedConcentration.data,
  );
});

test("staged completion rejects a forged prepared state", () => {
  assert.throws(() => completeOrdinaryInkMaterial({
    prepared: {},
  }), /opaque result/);
});

function legacyCompositeBytes(result, options) {
  const { stages } = result;
  const output = new Uint8ClampedArray(options.pixelWidth * options.pixelHeight * 4);
  const mix = Math.pow(
    options.absorption / 100,
    legacySurfaceAt(options.absorption / 100).keyboard.coverageMixExponent,
  );
  const mean = getMeanDensity(
    options.nibId,
    options.flow,
    options.absorption,
    options.recipe,
  );
  const range = getNibDensityRange(
    options.nibId,
    options.absorption / 100,
    options.recipe,
  );
  for (let index = 0; index < options.pixelWidth * options.pixelHeight; index += 1) {
    const offset = index * 4;
    const contactAlpha = stages.contact.rgbaMask.data[offset + 3] / 255;
    const surfaceAlpha = stages.surface.materialCoverageCandidate?.data[offset + 3] / 255 || 0;
    const coverage = Math.max(
      contactAlpha * (1 - mix) + surfaceAlpha * mix,
      contactAlpha
        * legacySurfaceAt(options.absorption / 100).keyboard.contactRetentionFloor,
    );
    if (coverage <= 0.001) continue;
    let variation = 0;
    if (stages.density.sampleCount[index] > 0) {
      variation = stages.density.accumulatedVariation[index]
        / stages.density.sampleCount[index];
    } else if (stages.surface.densityTransport !== null) {
      variation = sampleSurfaceDensityVariation(
        stages.surface.densityTransport,
        index % options.pixelWidth,
        Math.floor(index / options.pixelWidth),
        options.pixelWidth,
        options.pixelHeight,
      ) ?? 0;
    }
    const concentration = Math.max(0, Math.min(
      1,
      mean + shapeNibDensityVariation(options.nibId, variation) * range,
    ));
    const alpha = (options.recipe.optical.minimumAlpha
      + (options.recipe.optical.maximumAlpha - options.recipe.optical.minimumAlpha)
        * concentration) * coverage;
    const legacyRgb = options.recipe.optical.densityColorCurve[0].rgb;
    output[offset] = legacyRgb.red;
    output[offset + 1] = legacyRgb.green;
    output[offset + 2] = legacyRgb.blue;
    output[offset + 3] = Math.round(alpha * 255);
  }
  return output;
}

test("green r8 curve preserves the prior final RGBA equation", () => {
  for (const absorption of [0, 42, 100]) {
    const { options } = makeOptions(absorption);
    const result = renderOrdinaryInkMaterial(options);
    assert.deepEqual(result.imageData.data, legacyCompositeBytes(result, options));
  }
});

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
    "normalizedConcentration",
  ]);
  assert.deepEqual(Object.keys(stages.surface), [
      "materialCoverageCandidate",
      "resolvedCoverage",
      "densityTransport",
      "paperDepth",
      "dyeComponent",
      "sheenFilm",
      "fiberEdgeCoverage",
      "applied",
  ]);
  assert.deepEqual(Object.keys(stages.optical), [
    "baseCompositeRgba",
    "compositeRgba",
  ]);
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
  assert.ok(stages.density.normalizedConcentration.data instanceof Float32Array);
  assert.equal(stages.density.normalizedConcentration.data.length, 18 * 14);
  assert.equal(stages.surface.applied, true);
  assertRgbaShape(stages.surface.materialCoverageCandidate, 18, 14);
  assert.equal(stages.surface.resolvedCoverage.width, 18);
  assert.equal(stages.surface.resolvedCoverage.height, 14);
  assert.ok(stages.surface.resolvedCoverage.data instanceof Float32Array);
  assert.equal(stages.surface.resolvedCoverage.data.length, 18 * 14);
  assert.ok(stages.surface.densityTransport.signedNumerator instanceof Float32Array);
  assert.ok(stages.surface.densityTransport.pigmentWeight instanceof Float32Array);
  assert.equal(stages.surface.dyeComponent, null);
  assert.equal(stages.surface.sheenFilm, null);
  assert.equal(stages.optical.baseCompositeRgba, null);
  assertRgbaShape(stages.optical.compositeRgba, 18, 14);

  assert.equal(result.imageData, stages.optical.compositeRgba);
  assert.equal(result.densityField, stages.density.accumulatedVariation);
  assert.equal(result.densitySamples, stages.density.sampleCount);
  assert.equal(
    result.normalizedConcentration,
    stages.density.normalizedConcentration,
  );
  assert.equal(
    result.materialCoverage,
    stages.surface.materialCoverageCandidate,
  );
  assert.equal(result.resolvedCoverage, stages.surface.resolvedCoverage);
  assert.equal(
    result.surfaceDensityTransport,
    stages.surface.densityTransport,
  );
  assert.equal(result.paperDepth, stages.surface.paperDepth);
  assert.equal(result.dyeComponent, stages.surface.dyeComponent);
  assert.equal(result.sheenFilm, stages.surface.sheenFilm);
  assert.equal(result.fiberEdgeCoverage, stages.surface.fiberEdgeCoverage);
});

test("dye edge Optical changes RGB only inside the ordinary alpha footprint", () => {
  const { options } = makeOptions(42, 96, 48);
  const ordinary = renderOrdinaryInkMaterial(options);
  const component = renderOrdinaryInkMaterial({
    ...options,
    dyeComponentRecipe: ACTIVE_DYE_COMPONENT_RECIPE,
  });
  let changedRgb = 0;
  let totalChannelDelta = 0;
  let maximumChannelDelta = 0;
  assert.deepEqual(
    component.stages.optical.baseCompositeRgba.data,
    ordinary.imageData.data,
  );
  for (let offset = 0; offset < component.imageData.data.length; offset += 4) {
    assert.equal(component.imageData.data[offset + 3], ordinary.imageData.data[offset + 3]);
    const changed = component.imageData.data[offset] !== ordinary.imageData.data[offset]
      || component.imageData.data[offset + 1] !== ordinary.imageData.data[offset + 1]
      || component.imageData.data[offset + 2] !== ordinary.imageData.data[offset + 2];
    if (!changed) continue;
    changedRgb += 1;
    for (let channel = 0; channel < 3; channel += 1) {
      const delta = Math.abs(
        component.imageData.data[offset + channel]
          - ordinary.imageData.data[offset + channel],
      );
      totalChannelDelta += delta;
      maximumChannelDelta = Math.max(maximumChannelDelta, delta);
    }
    assert.ok(ordinary.imageData.data[offset + 3] > 0);
  }
  assert.ok(changedRgb >= 40);
  assert.ok(totalChannelDelta / (changedRgb * 3) >= 18);
  assert.ok(maximumChannelDelta >= 50);
  assert.deepEqual(
    component.stages.surface.materialCoverageCandidate.data,
    ordinary.stages.surface.materialCoverageCandidate.data,
  );
  assert.deepEqual(
    component.stages.surface.resolvedCoverage.data,
    ordinary.stages.surface.resolvedCoverage.data,
  );
  assert.deepEqual(
    component.stages.surface.densityTransport,
    ordinary.stages.surface.densityTransport,
  );
  assert.deepEqual(
    component.stages.surface.paperDepth,
    ordinary.stages.surface.paperDepth,
  );
  assert.equal(ordinary.stages.surface.dyeComponent, null);
  assert.ok(
    component.stages.surface.dyeComponent.mobileMass.some(
      (value) => value > 0,
    ),
  );
});

test("smooth paper keeps ordinary coverage while exposing a visible dye color zone", () => {
  const { options } = makeOptions(42, 96, 48);
  const gradientData = new Uint8ClampedArray(96 * 48 * 4);
  for (let y = 7; y < 41; y += 1) {
    for (let x = 8; x < 88; x += 1) {
      const offset = (y * 96 + x) * 4;
      gradientData[offset] = 255;
      gradientData[offset + 1] = 255;
      gradientData[offset + 2] = 255;
      gradientData[offset + 3] = 72 + ((x * 17 + y * 11) % 184);
    }
  }
  const gradientMask = makeCanvas(96, 48, gradientData);
  const smoothOptions = {
    ...options,
    surfaceRecipe: PAPER_SURFACE_SMOOTH_R1,
    mask: gradientMask,
    glyphContacts: [{
      rgbaMask: gradientMask.getContext("2d").getImageData(0, 0, 96, 48),
      destinationX: 0,
      destinationY: 0,
      x: 3,
      baseline: 36,
      seed: 0x1234abcd,
    }],
  };
  const ordinary = renderOrdinaryInkMaterial(smoothOptions);
  const component = renderOrdinaryInkMaterial({
    ...smoothOptions,
    dyeComponentRecipe: ACTIVE_DYE_COMPONENT_RECIPE,
  });
  assert.equal(ordinary.stages.surface.materialCoverageCandidate, null);
  assert.equal(component.stages.surface.materialCoverageCandidate, null);
  assert.deepEqual(
    component.stages.surface.resolvedCoverage.data,
    ordinary.stages.surface.resolvedCoverage.data,
  );
  assert.ok(component.stages.surface.dyeComponent);
  assert.ok(
    component.stages.surface.dyeComponent.colorZone.some((value) => value > 0),
  );
  assert.deepEqual(
    component.stages.optical.baseCompositeRgba.data,
    ordinary.imageData.data,
  );
  let changedRgb = 0;
  for (let offset = 0; offset < component.imageData.data.length; offset += 4) {
    assert.equal(
      component.imageData.data[offset + 3],
      ordinary.imageData.data[offset + 3],
    );
    if (
      component.imageData.data[offset] !== ordinary.imageData.data[offset]
      || component.imageData.data[offset + 1] !== ordinary.imageData.data[offset + 1]
      || component.imageData.data[offset + 2] !== ordinary.imageData.data[offset + 2]
    ) {
      changedRgb += 1;
    }
  }
  assert.ok(changedRgb >= 8);
});

test("sheen keeps ordinary fallback exact and reveals only high-concentration film in specular view", () => {
  const { options } = makeOptions(42, 96, 48);
  const sheenOptions = {
    ...options,
    surfaceRecipe: PAPER_SURFACE_SMOOTH_R1,
    nibId: "EB",
    flow: 100,
    sheenComponentRecipe: SHEEN_COMPONENT_RECIPE_R1,
  };
  const ordinary = renderOrdinaryInkMaterial({
    ...sheenOptions,
    sheenComponentRecipe: null,
  });
  const fallback = renderOrdinaryInkMaterial({
    ...sheenOptions,
    sheenObservation: { specularAlignment: 0 },
  });
  const specular = renderOrdinaryInkMaterial({
    ...sheenOptions,
    sheenObservation: { specularAlignment: 1 },
  });

  assert.deepEqual(fallback.imageData.data, ordinary.imageData.data);
  assert.deepEqual(
    fallback.stages.optical.baseCompositeRgba.data,
    ordinary.imageData.data,
  );
  assert.deepEqual(
    fallback.stages.surface.sheenFilm.data,
    specular.stages.surface.sheenFilm.data,
  );
  assert.ok(
    specular.stages.surface.sheenFilm.data.some((value) => value > 0),
  );
  assert.deepEqual(
    specular.stages.contact.rgbaMask.data,
    ordinary.stages.contact.rgbaMask.data,
  );
  assert.deepEqual(
    specular.stages.density.normalizedConcentration.data,
    ordinary.stages.density.normalizedConcentration.data,
  );
  assert.deepEqual(
    specular.stages.surface.resolvedCoverage.data,
    ordinary.stages.surface.resolvedCoverage.data,
  );

  let changedPixels = 0;
  for (let index = 0; index < specular.stages.surface.sheenFilm.data.length; index += 1) {
    const offset = index * 4;
    assert.equal(specular.imageData.data[offset + 3], ordinary.imageData.data[offset + 3]);
    const changed = specular.imageData.data[offset] !== ordinary.imageData.data[offset]
      || specular.imageData.data[offset + 1] !== ordinary.imageData.data[offset + 1]
      || specular.imageData.data[offset + 2] !== ordinary.imageData.data[offset + 2];
    if (changed) {
      changedPixels += 1;
      assert.ok(specular.stages.surface.sheenFilm.data[index] > 0);
    } else if (specular.stages.surface.sheenFilm.data[index] === 0) {
      assert.deepEqual(
        specular.imageData.data.slice(offset, offset + 4),
        ordinary.imageData.data.slice(offset, offset + 4),
      );
    }
  }
  assert.ok(changedPixels > 0);
});

test("internal concentration and dye enrichment remain independent diagnostics", () => {
  const { options } = makeOptions(42);
  const dry = renderOrdinaryInkMaterial({
    ...options,
    flow: 0,
    dyeComponentRecipe: ACTIVE_DYE_COMPONENT_RECIPE,
  });
  const wet = renderOrdinaryInkMaterial({
    ...options,
    flow: 100,
    dyeComponentRecipe: ACTIVE_DYE_COMPONENT_RECIPE,
  });
  assert.deepEqual(
    dry.stages.surface.dyeComponent.visibleFraction,
    wet.stages.surface.dyeComponent.visibleFraction,
  );
  assert.deepEqual(
    dry.stages.surface.dyeComponent.fractionDelta,
    wet.stages.surface.dyeComponent.fractionDelta,
  );
  assert.deepEqual(
    dry.stages.surface.dyeComponent.edgeAccumulation,
    wet.stages.surface.dyeComponent.edgeAccumulation,
  );
  assert.deepEqual(
    dry.stages.surface.dyeComponent.colorZone,
    wet.stages.surface.dyeComponent.colorZone,
  );
  assert.notDeepEqual(
    dry.stages.density.normalizedConcentration.data,
    wet.stages.density.normalizedConcentration.data,
  );
  assert.notDeepEqual(
    dry.stages.optical.compositeRgba.data,
    wet.stages.optical.compositeRgba.data,
  );
});

test("absorbent r2 preserves the Contact core and confines coarse Surface spread", () => {
  const { options } = makeOptions(42);
  const render = (surfaceRecipe) => renderOrdinaryInkMaterial({
    ...options,
    surfaceRecipe,
  });
  const r1 = render(PAPER_SURFACE_ABSORBENT_R1);
  const r2 = render(PAPER_SURFACE_ABSORBENT_R2);
  assert.deepEqual(
    r2.stages.contact.rgbaMask.data,
    r1.stages.contact.rgbaMask.data,
  );
  assert.deepEqual(
    r2.stages.density.accumulatedVariation,
    r1.stages.density.accumulatedVariation,
  );
  assert.ok(r2.stages.surface.paperDepth);
  assert.ok(r2.stages.surface.paperDepth.pigment.some((value) => value > 0));
  assert.equal(r1.stages.surface.paperDepth, null);
  assert.ok(
    r2.stages.surface.resolvedCoverage.materialMix
      < r1.stages.surface.resolvedCoverage.materialMix,
  );
  let r1Outside = 0;
  let r2Outside = 0;
  for (let index = 0; index < options.pixelWidth * options.pixelHeight; index += 1) {
    const contact = r2.stages.contact.rgbaMask.data[index * 4 + 3] / 255;
    const r2Coverage = r2.stages.surface.resolvedCoverage.data[index];
    if (contact >= 0.5) {
      assert.ok(
        r2Coverage + 1e-7
          >= contact * PAPER_SURFACE_ABSORBENT_R2.keyboard.contactRetentionFloor,
      );
    } else if (contact === 0) {
      if (r1.stages.surface.resolvedCoverage.data[index] > 0.1) r1Outside += 1;
      if (r2Coverage > 0.1) r2Outside += 1;
    }
  }
  assert.ok(r2Outside <= r1Outside);
});

test("absorbent r3 adds a sparse full-resolution fibre edge outside Contact", () => {
  const { options } = makeOptions(42);
  const r2 = renderOrdinaryInkMaterial({
    ...options,
    surfaceRecipe: PAPER_SURFACE_ABSORBENT_R2,
  });
  const r3 = renderOrdinaryInkMaterial({
    ...options,
    surfaceRecipe: PAPER_SURFACE_ABSORBENT_R3,
  });
  assert.equal(r2.stages.surface.fiberEdgeCoverage, null);
  assert.ok(r3.stages.surface.fiberEdgeCoverage.data instanceof Uint8Array);
  let outsideFibres = 0;
  for (let index = 0; index < options.pixelWidth * options.pixelHeight; index += 1) {
    const contact = r3.stages.contact.rgbaMask.data[index * 4 + 3];
    const fibre = r3.stages.surface.fiberEdgeCoverage.data[index];
    if (contact === 0 && fibre > 0) {
      outsideFibres += 1;
      assert.ok(r3.stages.surface.resolvedCoverage.data[index] >= fibre / 255);
    }
  }
  assert.ok(outsideFibres > 0);
  assert.deepEqual(
    r3.stages.contact.rgbaMask.data,
    r2.stages.contact.rgbaMask.data,
  );
  assert.deepEqual(
    r3.stages.density.accumulatedVariation,
    r2.stages.density.accumulatedVariation,
  );
});

test("paper recipes change Surface response without changing Contact or Density accident", () => {
  const { options } = makeOptions(42);
  const render = (surfaceRecipe) => renderOrdinaryInkMaterial({
    ...options,
    surfaceRecipe,
  });
  const smooth = render(PAPER_SURFACE_SMOOTH_R1);
  const balanced = render(PAPER_SURFACE_BALANCED_R1);
  const absorbent = render(PAPER_SURFACE_ABSORBENT_R1);
  for (const result of [balanced, absorbent]) {
    assert.deepEqual(
      result.stages.contact.rgbaMask.data,
      smooth.stages.contact.rgbaMask.data,
    );
    assert.deepEqual(
      result.stages.density.accumulatedVariation,
      smooth.stages.density.accumulatedVariation,
    );
    assert.deepEqual(
      result.stages.density.sampleCount,
      smooth.stages.density.sampleCount,
    );
  }
  assert.notDeepEqual(
    absorbent.stages.surface.materialCoverageCandidate.data,
    balanced.stages.surface.materialCoverageCandidate.data,
  );
  assert.ok(
    smooth.normalizedConcentration.densityRange
      > balanced.normalizedConcentration.densityRange,
  );
  assert.ok(
    balanced.normalizedConcentration.densityRange
      > absorbent.normalizedConcentration.densityRange,
  );
  assert.ok(
    smooth.normalizedConcentration.meanDensity
      > absorbent.normalizedConcentration.meanDensity,
  );
});

test("active paper ladder increases lateral edge response from balanced to absorbent", () => {
  const { options } = makeOptions(42);
  const balanced = renderOrdinaryInkMaterial({
    ...options,
    surfaceRecipe: PAPER_SURFACE_BALANCED_R2,
  });
  const absorbent = renderOrdinaryInkMaterial({
    ...options,
    surfaceRecipe: PAPER_SURFACE_ABSORBENT_R4,
  });
  assert.ok(
    balanced.stages.surface.resolvedCoverage.materialMix
      < absorbent.stages.surface.resolvedCoverage.materialMix,
  );
  assert.equal(balanced.stages.surface.fiberEdgeCoverage, null);
  assert.ok(absorbent.stages.surface.fiberEdgeCoverage.data.some((alpha) => alpha > 0));
  assert.deepEqual(
    balanced.stages.contact.rgbaMask.data,
    absorbent.stages.contact.rgbaMask.data,
  );
  assert.deepEqual(
    balanced.stages.density.accumulatedVariation,
    absorbent.stages.density.accumulatedVariation,
  );
  const outsideVisibleCoverage = (result) => {
    let count = 0;
    for (let index = 0; index < options.pixelWidth * options.pixelHeight; index += 1) {
      const contactAlpha = result.stages.contact.rgbaMask.data[index * 4 + 3];
      const resolved = result.stages.surface.resolvedCoverage.data[index];
      if (contactAlpha === 0 && resolved >= 0.04) count += 1;
    }
    return count;
  };
  assert.ok(
    outsideVisibleCoverage(absorbent) > outsideVisibleCoverage(balanced),
    "absorbent paper must expose more visible exterior feathering than balanced paper",
  );
});

test("zero absorption records an explicit unapplied Surface stage", () => {
  const { options } = makeOptions(0);
  const result = renderOrdinaryInkMaterial(options);

  assert.equal(result.stages.surface.applied, false);
  assert.equal(result.stages.surface.materialCoverageCandidate, null);
  assert.ok(result.stages.surface.resolvedCoverage.data.some((value) => value > 0));
  assert.equal(result.stages.surface.densityTransport, null);
  assert.equal(result.stages.surface.paperDepth, null);
  assert.equal(result.stages.surface.dyeComponent, null);
  assert.equal(result.surfaceDensityTransport, null);
  assert.equal(result.materialCoverage, null);
  assert.ok(result.stages.contact.rgbaMask.data.some((value, index) => (
    index % 4 === 3 && value > 0
  )));
  assert.ok(result.stages.optical.compositeRgba.data.some((value, index) => (
    index % 4 === 3 && value > 0
  )));
});

test("ordinary color recipes change only Optical RGB for the same material solve", () => {
  const recipes = [
    ORDINARY_GREEN_RECIPE_R12,
    ORDINARY_BLUE_BLACK_RECIPE_R6,
    ORDINARY_BURGUNDY_RECIPE_R6,
    ORDINARY_TEAL_RECIPE_R6,
  ];
  const results = recipes.map((recipe) => {
    const { options } = makeOptions(42);
    return renderOrdinaryInkMaterial({ ...options, recipe });
  });
  const control = results[0].stages;
  for (const result of results.slice(1)) {
    assert.deepEqual(result.stages.contact.rgbaMask.data, control.contact.rgbaMask.data);
    assert.deepEqual(result.stages.density.accumulatedVariation, control.density.accumulatedVariation);
    assert.deepEqual(result.stages.density.sampleCount, control.density.sampleCount);
    assert.deepEqual(result.stages.density.normalizedConcentration.data, control.density.normalizedConcentration.data);
    assert.deepEqual(result.stages.surface.materialCoverageCandidate.data, control.surface.materialCoverageCandidate.data);
    assert.deepEqual(result.stages.surface.resolvedCoverage.data, control.surface.resolvedCoverage.data);
    assert.deepEqual(
      Array.from(result.imageData.data).filter((_, index) => index % 4 === 3),
      Array.from(control.optical.compositeRgba.data).filter((_, index) => index % 4 === 3),
    );
  }
  const rgbaSignatures = results.map((result) => Buffer.from(result.imageData.data).toString("hex"));
  assert.equal(new Set(rgbaSignatures).size, recipes.length);
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

test("the active ordinary checkpoint has stable named field signatures", () => {
  const first = renderOrdinaryInkMaterial(makeOptions(42).options);
  const second = renderOrdinaryInkMaterial(makeOptions(42).options);
  const signatures = (result) => Object.freeze({
    contact: createFieldSignature({
      domain: "contact.rgba-mask",
      width: result.stages.contact.rgbaMask.width,
      height: result.stages.contact.rgbaMask.height,
      channels: 4,
      data: result.stages.contact.rgbaMask.data,
    }),
    density: createFieldSignature({
      domain: "density.accumulated-variation",
      width: 18,
      height: 14,
      channels: 1,
      data: result.stages.density.accumulatedVariation,
    }),
    samples: createFieldSignature({
      domain: "density.sample-count",
      width: 18,
      height: 14,
      channels: 1,
      data: result.stages.density.sampleCount,
    }),
    coverage: createFieldSignature({
      domain: "surface.resolved-coverage",
      width: 18,
      height: 14,
      channels: 1,
      data: result.stages.surface.resolvedCoverage.data,
    }),
    concentration: createFieldSignature({
      domain: "density.normalized-concentration",
      width: 18,
      height: 14,
      channels: 1,
      data: result.stages.density.normalizedConcentration.data,
    }),
    optical: createFieldSignature({
      domain: "optical.composite-rgba",
      width: result.imageData.width,
      height: result.imageData.height,
      channels: 4,
      data: result.imageData.data,
    }),
  });
  assert.deepEqual(signatures(first), signatures(second));
  assert.deepEqual(
    Object.fromEntries(Object.entries(signatures(first)).map(
      ([name, signature]) => [name, signature.hash],
    )),
    {
      contact: "992bda01b1d165b2",
      density: "838bf8cd73b9a7ff",
      samples: "a59a04e5edb1e707",
      coverage: "27e893b169caec6f",
      concentration: "73c9ab35c0b5decf",
      optical: "bdeadcc44a08086a",
    },
  );
});

test("density transport never changes Contact-owned Optical pixels", () => {
  const { options } = makeOptions(42);
  const result = renderOrdinaryInkMaterial(options);
  const legacyMeanFallback = compositeOrdinaryInk({
    pixelWidth: options.pixelWidth,
    pixelHeight: options.pixelHeight,
    mask: result.stages.contact.rgbaMask,
    resolvedCoverage: result.stages.surface.resolvedCoverage,
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
    recipe: ORDINARY_GREEN_RECIPE_R12,
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
    recipe: ORDINARY_GREEN_RECIPE_R12,
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
    recipe: ORDINARY_GREEN_RECIPE_R12,
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
