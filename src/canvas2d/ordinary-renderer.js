import {
  createDensityField,
  createOrdinaryConcentrationField,
} from "../density/index.js";
import { compositeOrdinaryOptical } from "../optical/index.js";
import { assertInkRecipeCompatible } from "../recipes/compatibility.js";
import {
  createKeyboardSurfaceState,
  createMaterialCoverage,
  resolveKeyboardSurfaceCoverage,
} from "../surface/index.js";
import { resampleContactDensityToSurfaceGrid } from "../surface/density-transport.js";
import {
  assertFiniteRange,
  assertPercent,
  assertUint32,
} from "../contracts/numeric.js";
import { makeLayer } from "./glyph-mask.js";

function assertSurfaceSeed(surfaceSeed) {
  return assertUint32(surfaceSeed, "surfaceSeed");
}

function makeDiagnosticStages({
  rgbaMask,
  accumulatedVariation,
  sampleCount,
  materialCoverageCandidate,
  resolvedCoverage,
  densityTransport,
  normalizedConcentration,
  compositeRgba,
}) {
  return Object.freeze({
    contact: Object.freeze({ rgbaMask }),
    density: Object.freeze({
      accumulatedVariation,
      sampleCount,
      normalizedConcentration,
    }),
    surface: Object.freeze({
      materialCoverageCandidate,
      resolvedCoverage,
      densityTransport,
      applied: materialCoverageCandidate !== null,
    }),
    optical: Object.freeze({ compositeRgba }),
  });
}

/**
 * Preserve the accepted downsample → physical coverage → upsample path.
 */
export function makeMaterialCoverage({
  mask,
  pixelWidth,
  pixelHeight,
  width,
  height,
  absorption,
  surfaceSeed,
  recipe,
  createLayer = makeLayer,
}) {
  assertInkRecipeCompatible(recipe);
  assertFiniteRange(absorption, "absorption", 0, 1);
  assertSurfaceSeed(surfaceSeed);
  const gridWidth = Math.max(160, Math.min(320, Math.round(width * 0.56)));
  const gridHeight = Math.max(130, Math.min(240, Math.round(height * 0.56)));
  const depositCanvas = createLayer(gridWidth, gridHeight);
  const depositContext = depositCanvas.getContext("2d");
  depositContext.imageSmoothingEnabled = true;
  depositContext.imageSmoothingQuality = "high";
  depositContext.drawImage(mask, 0, 0, gridWidth, gridHeight);
  const deposit = depositContext.getImageData(0, 0, gridWidth, gridHeight);

  const materialState = createMaterialCoverage(
    deposit,
    absorption,
    surfaceSeed,
    recipe,
  );
  const material = depositContext.createImageData(gridWidth, gridHeight);
  material.data.set(materialState.data);
  const gridCanvas = createLayer(gridWidth, gridHeight);
  gridCanvas.getContext("2d").putImageData(material, 0, 0);
  const coverageCanvas = createLayer(pixelWidth, pixelHeight);
  const coverageContext = coverageCanvas.getContext("2d");
  coverageContext.imageSmoothingEnabled = true;
  coverageContext.imageSmoothingQuality = "high";
  coverageContext.drawImage(gridCanvas, 0, 0, pixelWidth, pixelHeight);
  return coverageContext.getImageData(0, 0, pixelWidth, pixelHeight);
}

/**
 * Run one keyboard Surface solve with raw Contact density attached to positive
 * pigment mass. Coverage remains the existing RGBA candidate; density remains
 * a compact solver-grid numerator/carrier pair and is never expanded to a
 * full-page Float32 field.
 */
function makeKeyboardSurfaceState({
  mask,
  maskPixels,
  densityField,
  densitySamples,
  pixelWidth,
  pixelHeight,
  width,
  height,
  absorption,
  surfaceSeed,
  recipe,
  createLayer = makeLayer,
}) {
  assertInkRecipeCompatible(recipe);
  assertFiniteRange(absorption, "absorption", 0, 1);
  assertSurfaceSeed(surfaceSeed);
  const gridWidth = Math.max(160, Math.min(320, Math.round(width * 0.56)));
  const gridHeight = Math.max(130, Math.min(240, Math.round(height * 0.56)));
  const depositCanvas = createLayer(gridWidth, gridHeight);
  const depositContext = depositCanvas.getContext("2d");
  depositContext.imageSmoothingEnabled = true;
  depositContext.imageSmoothingQuality = "high";
  depositContext.drawImage(mask, 0, 0, gridWidth, gridHeight);
  const deposit = depositContext.getImageData(0, 0, gridWidth, gridHeight);
  const densityDeposit = resampleContactDensityToSurfaceGrid({
    sourceWidth: pixelWidth,
    sourceHeight: pixelHeight,
    targetWidth: gridWidth,
    targetHeight: gridHeight,
    mask: maskPixels,
    accumulatedVariation: densityField,
    sampleCount: densitySamples,
  });
  const surfaceState = createKeyboardSurfaceState(
    deposit,
    absorption,
    surfaceSeed,
    recipe,
    densityDeposit,
  );
  const material = depositContext.createImageData(gridWidth, gridHeight);
  material.data.set(surfaceState.coverage.data);
  const gridCanvas = createLayer(gridWidth, gridHeight);
  gridCanvas.getContext("2d").putImageData(material, 0, 0);
  const coverageCanvas = createLayer(pixelWidth, pixelHeight);
  const coverageContext = coverageCanvas.getContext("2d");
  coverageContext.imageSmoothingEnabled = true;
  coverageContext.imageSmoothingQuality = "high";
  coverageContext.drawImage(gridCanvas, 0, 0, pixelWidth, pixelHeight);
  return Object.freeze({
    materialCoverageCandidate: coverageContext.getImageData(
      0,
      0,
      pixelWidth,
      pixelHeight,
    ),
    densityTransport: surfaceState.densityTransport,
  });
}

/**
 * Calculate density, Surface coverage, and ordinary optical RGBA from a mask.
 * Layout and glyph-mask placement remain caller responsibilities.
 * `glyphContacts` must describe the exact final masks and integer device-pixel
 * destinations already used to compose `mask`; x/baseline are CSS-pixel phase
 * anchors, and every seed is an explicit uint32.
 * The returned `stages` record names the existing intermediate buffers without
 * adding a second calculation path. Legacy top-level fields remain same-reference
 * aliases for compatibility.
 */
export function renderOrdinaryInkMaterial({
  outputContext,
  mask,
  pixelWidth,
  pixelHeight,
  width,
  height,
  absorption,
  surfaceSeed,
  nibId,
  flow,
  scale,
  fontSize,
  glyphContacts,
  recipe,
  createLayer = makeLayer,
}) {
  assertInkRecipeCompatible(recipe);
  assertPercent(flow, "flow");
  assertPercent(absorption, "absorption");
  assertSurfaceSeed(surfaceSeed);
  const normalizedAbsorption = absorption / 100;
  // Validate every glyph Contact before Canvas reads, Surface work, or output
  // allocation. createDensityField itself remains fail-closed for direct users.
  const { densityField, densitySamples } = createDensityField({
    pixelWidth,
    pixelHeight,
    scale,
    fontSize,
    glyphContacts,
  });
  const maskPixels = mask.getContext("2d").getImageData(
    0,
    0,
    pixelWidth,
    pixelHeight,
  );
  const surfaceState = normalizedAbsorption > 0.002
    ? makeKeyboardSurfaceState({
      mask,
      maskPixels,
      densityField,
      densitySamples,
      pixelWidth,
      pixelHeight,
      width,
      height,
      absorption: normalizedAbsorption,
      surfaceSeed,
      recipe,
      createLayer,
    })
    : null;
  const materialCoverage = surfaceState?.materialCoverageCandidate ?? null;
  const surfaceDensityTransport = surfaceState?.densityTransport ?? null;
  const resolvedCoverage = resolveKeyboardSurfaceCoverage({
    width: pixelWidth,
    height: pixelHeight,
    contactMask: maskPixels.data,
    materialCoverageCandidate: materialCoverage,
    absorption,
    recipe,
  });
  const result = outputContext.createImageData(pixelWidth, pixelHeight);
  const normalizedConcentration = createOrdinaryConcentrationField({
    pixelWidth,
    pixelHeight,
    resolvedCoverage,
    surfaceDensityTransport,
    densityField,
    densitySamples,
    nibId,
    flow,
    absorption,
    recipe,
  });
  compositeOrdinaryOptical({
    pixelWidth,
    pixelHeight,
    concentration: normalizedConcentration,
    resolvedCoverage,
    recipe,
    output: result,
  });
  const stages = makeDiagnosticStages({
    rgbaMask: maskPixels,
    accumulatedVariation: densityField,
    sampleCount: densitySamples,
    materialCoverageCandidate: materialCoverage,
    resolvedCoverage,
    densityTransport: surfaceDensityTransport,
    normalizedConcentration,
    compositeRgba: result,
  });
  return {
    stages,
    imageData: stages.optical.compositeRgba,
    densityField: stages.density.accumulatedVariation,
    densitySamples: stages.density.sampleCount,
    normalizedConcentration: stages.density.normalizedConcentration,
    materialCoverage: stages.surface.materialCoverageCandidate,
    resolvedCoverage: stages.surface.resolvedCoverage,
    surfaceDensityTransport: stages.surface.densityTransport,
  };
}
