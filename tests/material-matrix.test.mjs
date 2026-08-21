import assert from "node:assert/strict";
import test from "node:test";
import { renderOrdinaryInkMaterial } from "fountain-ink-engine/canvas2d";
import { NIB_IDS } from "fountain-ink-engine/contact";
import {
  ORDINARY_BLUE_BLACK_RECIPE_R5,
  ORDINARY_BURGUNDY_RECIPE_R5,
  ORDINARY_GREEN_RECIPE_R11,
  ORDINARY_TEAL_RECIPE_R5,
} from "fountain-ink-engine/recipes";
import {
  PAPER_SURFACE_ABSORBENT_R4,
  PAPER_SURFACE_BALANCED_R2,
  PAPER_SURFACE_SMOOTH_R1,
} from "fountain-ink-engine/surface-recipes";

const WIDTH = 18;
const HEIGHT = 14;
const PAGE_PIXELS = WIDTH * HEIGHT;
const INKS = Object.freeze([
  ORDINARY_GREEN_RECIPE_R11,
  ORDINARY_BLUE_BLACK_RECIPE_R5,
  ORDINARY_BURGUNDY_RECIPE_R5,
  ORDINARY_TEAL_RECIPE_R5,
]);
const SURFACES = Object.freeze([
  PAPER_SURFACE_SMOOTH_R1,
  PAPER_SURFACE_BALANCED_R2,
  PAPER_SURFACE_ABSORBENT_R4,
]);
const FLOWS = Object.freeze([0, 58, 100]);

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
      pixels = makeImageData(width, height, image.data);
    },
    drawImage(source, x, y, requestedWidth, requestedHeight) {
      assert.equal(x, 0);
      assert.equal(y, 0);
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
  };
}

function makeMaskPixels() {
  const data = new Uint8ClampedArray(PAGE_PIXELS * 4);
  for (let y = 3; y <= 10; y += 1) {
    for (let x = 3; x <= 14; x += 1) {
      if (x > 6 && x < 11 && y > 5 && y < 9) continue;
      const offset = (y * WIDTH + x) * 4;
      data[offset] = 255;
      data[offset + 1] = 255;
      data[offset + 2] = 255;
      data[offset + 3] = 170 + ((x * 13 + y * 7) % 86);
    }
  }
  return data;
}

function renderFixture({ nibId, flow, recipe, surfaceRecipe }) {
  const maskPixels = makeMaskPixels();
  const mask = makeCanvas(WIDTH, HEIGHT, maskPixels);
  return renderOrdinaryInkMaterial({
    outputContext: makeCanvas(WIDTH, HEIGHT).getContext("2d"),
    mask,
    pixelWidth: WIDTH,
    pixelHeight: HEIGHT,
    width: WIDTH,
    height: HEIGHT,
    surfaceRecipe,
    surfaceSeed: 0x13579bdf,
    nibId,
    flow,
    scale: 1,
    fontSize: 12,
    glyphContacts: [{
      rgbaMask: makeImageData(WIDTH, HEIGHT, maskPixels),
      destinationX: 0,
      destinationY: 0,
      x: 3.25,
      baseline: 11.5,
      seed: 0x1234abcd,
    }],
    recipe,
    createLayer: makeCanvas,
  });
}

function assertFiniteRange(data, minimum, maximum, label) {
  assert.ok(ArrayBuffer.isView(data), `${label} must be a typed array`);
  assert.ok(data.every((value) => (
    Number.isFinite(value) && value >= minimum && value <= maximum
  )), `${label} must stay in ${minimum}...${maximum}`);
}

function retainedBufferBytes(value, buffers = new Set()) {
  if (ArrayBuffer.isView(value)) {
    buffers.add(value.buffer);
    return buffers;
  }
  if (value && typeof value === "object") {
    for (const entry of Object.values(value)) {
      retainedBufferBytes(entry, buffers);
    }
  }
  return buffers;
}

function maximumSurfaceGridCells(stages) {
  return Math.max(0, ...[
    stages.surface.densityTransport,
    stages.surface.paperDepth,
  ].filter(Boolean).map((field) => field.width * field.height));
}

test("active nib × ink × Surface × flow matrix stays finite, bounded, and nonblank", () => {
  let renderedCases = 0;
  for (const nibId of NIB_IDS) {
    for (const recipe of INKS) {
      for (const surfaceRecipe of SURFACES) {
        for (const flow of FLOWS) {
          const result = renderFixture({ nibId, flow, recipe, surfaceRecipe });
          const { stages } = result;
          renderedCases += 1;

          assert.equal(stages.contact.rgbaMask.data.length, PAGE_PIXELS * 4);
          assert.equal(stages.density.accumulatedVariation.length, PAGE_PIXELS);
          assert.equal(stages.density.sampleCount.length, PAGE_PIXELS);
          assert.equal(
            stages.density.normalizedConcentration.data.length,
            PAGE_PIXELS,
          );
          assert.equal(stages.surface.resolvedCoverage.data.length, PAGE_PIXELS);
          assert.equal(stages.optical.compositeRgba.data.length, PAGE_PIXELS * 4);

          assertFiniteRange(
            stages.density.accumulatedVariation,
            -1,
            1,
            "Density variation",
          );
          assertFiniteRange(
            stages.density.sampleCount,
            0,
            0xffff,
            "Density sample count",
          );
          assertFiniteRange(
            stages.density.normalizedConcentration.data,
            0,
            1,
            "normalized concentration",
          );
          assertFiniteRange(
            stages.surface.resolvedCoverage.data,
            0,
            1,
            "resolved coverage",
          );
          assertFiniteRange(
            stages.optical.compositeRgba.data,
            0,
            255,
            "Optical RGBA",
          );

          if (stages.surface.materialCoverageCandidate !== null) {
            assert.equal(
              stages.surface.materialCoverageCandidate.data.length,
              PAGE_PIXELS * 4,
            );
            assertFiniteRange(
              stages.surface.materialCoverageCandidate.data,
              0,
              255,
              "Surface candidate",
            );
          }
          assert.equal(
            stages.surface.applied,
            stages.surface.materialCoverageCandidate !== null,
          );
          if (stages.surface.densityTransport !== null) {
            const transport = stages.surface.densityTransport;
            const gridCells = transport.width * transport.height;
            assert.equal(transport.signedNumerator.length, gridCells);
            assert.equal(transport.pigmentWeight.length, gridCells);
            assertFiniteRange(
              transport.signedNumerator,
              -Number.MAX_VALUE,
              Number.MAX_VALUE,
              "Surface signed numerator",
            );
            assertFiniteRange(
              transport.pigmentWeight,
              0,
              Number.MAX_VALUE,
              "Surface pigment weight",
            );
            for (let index = 0; index < gridCells; index += 1) {
              assert.ok(
                Math.abs(transport.signedNumerator[index])
                  <= transport.pigmentWeight[index] + 1e-7,
              );
            }
          }
          if (stages.surface.paperDepth !== null) {
            const paperDepth = stages.surface.paperDepth;
            assert.equal(
              paperDepth.pigment.length,
              paperDepth.width * paperDepth.height,
            );
            assertFiniteRange(
              paperDepth.pigment,
              0,
              Number.MAX_VALUE,
              "paper-depth pigment",
            );
            if (paperDepth.signedNumerator !== null) {
              assert.equal(
                paperDepth.signedNumerator.length,
                paperDepth.pigment.length,
              );
              assertFiniteRange(
                paperDepth.signedNumerator,
                -Number.MAX_VALUE,
                Number.MAX_VALUE,
                "paper-depth signed numerator",
              );
              for (let index = 0; index < paperDepth.pigment.length; index += 1) {
                assert.ok(
                  Math.abs(paperDepth.signedNumerator[index])
                    <= paperDepth.pigment[index] + 1e-7,
                );
              }
            }
          }
          if (stages.surface.fiberEdgeCoverage !== null) {
            assert.equal(stages.surface.fiberEdgeCoverage.data.length, PAGE_PIXELS);
            assertFiniteRange(
              stages.surface.fiberEdgeCoverage.data,
              0,
              255,
              "fibre edge coverage",
            );
          }

          assert.ok(
            stages.contact.rgbaMask.data.some(
              (value, index) => index % 4 === 3 && value > 0,
            ),
          );
          assert.ok(stages.surface.resolvedCoverage.data.some((value) => value > 0));
          assert.ok(
            stages.optical.compositeRgba.data.some(
              (value, index) => index % 4 === 3 && value > 0,
            ),
          );

          const retainedBytes = Array.from(retainedBufferBytes(stages))
            .reduce((sum, buffer) => sum + buffer.byteLength, 0);
          const retainedBudget = PAGE_PIXELS * 32
            + maximumSurfaceGridCells(stages) * 16;
          assert.ok(
            retainedBytes <= retainedBudget,
            `retained ${retainedBytes} bytes exceeded ${retainedBudget}`,
          );
        }
      }
    }
  }
  assert.equal(renderedCases, 7 * 4 * 3 * 3);
});
