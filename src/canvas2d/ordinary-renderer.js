import {
  createDensityField,
  createOrdinaryConcentrationField,
} from "../density/index.js";
import { assertDensityFieldInputs } from "../density/ordinary-density.js";
import { compositeOrdinaryOptical } from "../optical/index.js";
import { assertInkRecipeCompatible } from "../recipes/compatibility.js";
import { assertSurfaceRecipeCompatible } from "../surface-recipes/index.js";
import {
  createKeyboardSurfaceState,
  createPaperFiberEdge,
  createMaterialCoverage,
  resolveKeyboardSurfaceCoverage,
} from "../surface/index.js";
import { resampleContactDensityToSurfaceGrid } from "../surface/density-transport.js";
import { assertPercent, assertUint32 } from "../contracts/numeric.js";
import { makeLayer } from "./glyph-mask.js";

const preparedMaterialStates = new WeakSet();

function assertSurfaceSeed(surfaceSeed) {
  return assertUint32(surfaceSeed, "surfaceSeed");
}

function surfaceGridDimensions(width, height) {
  return Object.freeze({
    width: Math.max(160, Math.min(320, Math.round(width * 0.56))),
    height: Math.max(130, Math.min(240, Math.round(height * 0.56))),
  });
}

function makeDiagnosticStages({
  rgbaMask,
  accumulatedVariation,
  sampleCount,
  materialCoverageCandidate,
  resolvedCoverage,
  densityTransport,
  paperDepth,
  dyeComponent,
  fiberEdgeCoverage,
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
      paperDepth,
      dyeComponent,
      fiberEdgeCoverage,
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
  surfaceRecipe,
  surfaceSeed,
  recipe,
  createLayer = makeLayer,
}) {
  assertInkRecipeCompatible(recipe);
  assertSurfaceRecipeCompatible(surfaceRecipe);
  assertSurfaceSeed(surfaceSeed);
  const deposit = makeKeyboardSurfaceDeposit({
    mask,
    width,
    height,
    createLayer,
  });

  const materialState = createMaterialCoverage(
    deposit,
    surfaceRecipe,
    surfaceSeed,
    recipe,
  );
  return upsampleKeyboardSurfaceCoverage({
    coverage: materialState,
    pixelWidth,
    pixelHeight,
    createLayer,
  });
}

export function makeKeyboardSurfaceDeposit({
  mask,
  width,
  height,
  createLayer = makeLayer,
}) {
  const grid = surfaceGridDimensions(width, height);
  const gridWidth = grid.width;
  const gridHeight = grid.height;
  const depositCanvas = createLayer(gridWidth, gridHeight);
  const depositContext = depositCanvas.getContext("2d");
  depositContext.imageSmoothingEnabled = true;
  depositContext.imageSmoothingQuality = "high";
  depositContext.drawImage(mask, 0, 0, gridWidth, gridHeight);
  return depositContext.getImageData(0, 0, gridWidth, gridHeight);
}

export function upsampleKeyboardSurfaceCoverage({
  coverage,
  pixelWidth,
  pixelHeight,
  createLayer = makeLayer,
}) {
  const gridCanvas = createLayer(coverage.width, coverage.height);
  const gridContext = gridCanvas.getContext("2d");
  const material = gridContext.createImageData(
    coverage.width,
    coverage.height,
  );
  material.data.set(coverage.data);
  gridCanvas.getContext("2d").putImageData(material, 0, 0);
  const coverageCanvas = createLayer(pixelWidth, pixelHeight);
  const coverageContext = coverageCanvas.getContext("2d");
  coverageContext.imageSmoothingEnabled = true;
  coverageContext.imageSmoothingQuality = "high";
  coverageContext.drawImage(gridCanvas, 0, 0, pixelWidth, pixelHeight);
  return coverageContext.getImageData(0, 0, pixelWidth, pixelHeight);
}

export function prepareOrdinaryInkCanvasInput({
  mask,
  pixelWidth,
  pixelHeight,
  width,
  height,
  surfaceRecipe,
  createLayer = makeLayer,
}) {
  assertSurfaceRecipeCompatible(surfaceRecipe);
  const maskPixels = mask.getContext("2d").getImageData(
    0,
    0,
    pixelWidth,
    pixelHeight,
  );
  const surfaceResponse = surfaceRecipe.surfaceRecipeSchemaVersion === 1
    ? surfaceRecipe.axes.verticalUptake
    : Math.max(
      surfaceRecipe.axes.depthUptake,
      surfaceRecipe.axes.lateralMobility,
    );
  return Object.freeze({
    maskPixels,
    surfaceDeposit: surfaceResponse > 0.002
      ? makeKeyboardSurfaceDeposit({
        mask,
        width,
        height,
        createLayer,
      })
      : null,
  });
}

export function beginOrdinaryInkMaterial({
  maskPixels,
  surfaceDeposit = null,
  pixelWidth,
  pixelHeight,
  surfaceRecipe,
  surfaceSeed,
  nibId,
  flow,
  scale,
  fontSize,
  glyphContacts,
  recipe,
  dyeComponentRecipe = null,
}) {
  assertInkRecipeCompatible(recipe);
  assertSurfaceRecipeCompatible(surfaceRecipe);
  assertPercent(flow, "flow");
  assertSurfaceSeed(surfaceSeed);
  const { densityField, densitySamples } = createDensityField({
    pixelWidth,
    pixelHeight,
    scale,
    fontSize,
    glyphContacts,
  });
  const surfaceState = surfaceDeposit === null
    ? null
    : createKeyboardSurfaceState(
      surfaceDeposit,
      surfaceRecipe,
      surfaceSeed,
      recipe,
      resampleContactDensityToSurfaceGrid({
        sourceWidth: pixelWidth,
        sourceHeight: pixelHeight,
        targetWidth: surfaceDeposit.width,
        targetHeight: surfaceDeposit.height,
        mask: maskPixels,
        accumulatedVariation: densityField,
        sampleCount: densitySamples,
      }),
      dyeComponentRecipe,
    );
  const fiberEdgeCoverage = createPaperFiberEdge({
    width: pixelWidth,
    height: pixelHeight,
    contactMask: maskPixels.data,
    scale,
    surfaceSeed,
    surfaceRecipe,
  });
  const prepared = Object.freeze({
    pixelWidth,
    pixelHeight,
    maskPixels,
    densityField,
    densitySamples,
    surfaceCoverageGrid: surfaceState?.coverage ?? null,
    surfaceDensityTransport: surfaceState?.densityTransport ?? null,
    paperDepth: surfaceState?.paperDepth ?? null,
    dyeComponent: surfaceState?.dyeComponent ?? null,
    fiberEdgeCoverage,
    nibId,
    flow,
    surfaceRecipe,
    recipe,
  });
  preparedMaterialStates.add(prepared);
  return prepared;
}

export function completeOrdinaryInkMaterial({
  prepared,
  materialCoverageCandidate = null,
  output,
}) {
  if (!preparedMaterialStates.has(prepared)) {
    throw new TypeError(
      "prepared must be the opaque result of beginOrdinaryInkMaterial.",
    );
  }
  const {
    pixelWidth,
    pixelHeight,
    maskPixels,
    densityField,
    densitySamples,
    surfaceDensityTransport,
    paperDepth,
    dyeComponent,
    fiberEdgeCoverage,
    nibId,
    flow,
    surfaceRecipe,
    recipe,
  } = prepared;
  const resolvedCoverage = resolveKeyboardSurfaceCoverage({
    width: pixelWidth,
    height: pixelHeight,
    contactMask: maskPixels.data,
    materialCoverageCandidate,
    fiberEdgeCoverage,
    surfaceRecipe,
  });
  const normalizedConcentration = createOrdinaryConcentrationField({
    pixelWidth,
    pixelHeight,
    resolvedCoverage,
    surfaceDensityTransport,
    densityField,
    densitySamples,
    nibId,
    flow,
    surfaceRecipe,
    recipe,
  });
  const result = compositeOrdinaryOptical({
    pixelWidth,
    pixelHeight,
    concentration: normalizedConcentration,
    resolvedCoverage,
    recipe,
    output,
  });
  const stages = makeDiagnosticStages({
    rgbaMask: maskPixels,
    accumulatedVariation: densityField,
    sampleCount: densitySamples,
    materialCoverageCandidate,
    resolvedCoverage,
    densityTransport: surfaceDensityTransport,
    paperDepth,
    dyeComponent,
    fiberEdgeCoverage,
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
    paperDepth: stages.surface.paperDepth,
    dyeComponent: stages.surface.dyeComponent,
    fiberEdgeCoverage: stages.surface.fiberEdgeCoverage,
  };
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
  surfaceRecipe,
  surfaceSeed,
  nibId,
  flow,
  scale,
  fontSize,
  glyphContacts,
  recipe,
  dyeComponentRecipe = null,
  createLayer = makeLayer,
}) {
  assertInkRecipeCompatible(recipe);
  assertSurfaceRecipeCompatible(surfaceRecipe);
  assertPercent(flow, "flow");
  assertSurfaceSeed(surfaceSeed);
  assertDensityFieldInputs({
    pixelWidth,
    pixelHeight,
    scale,
    fontSize,
    glyphContacts,
  });
  const { maskPixels, surfaceDeposit } = prepareOrdinaryInkCanvasInput({
    mask,
    pixelWidth,
    pixelHeight,
    width,
    height,
    surfaceRecipe,
    createLayer,
  });
  const prepared = beginOrdinaryInkMaterial({
    maskPixels,
    surfaceDeposit,
    pixelWidth,
    pixelHeight,
    surfaceRecipe,
    surfaceSeed,
    nibId,
    flow,
    scale,
    fontSize,
    glyphContacts,
    recipe,
    dyeComponentRecipe,
  });
  const materialCoverageCandidate = prepared.surfaceCoverageGrid === null
    ? null
    : upsampleKeyboardSurfaceCoverage({
      coverage: prepared.surfaceCoverageGrid,
      pixelWidth,
      pixelHeight,
      createLayer,
    });
  return completeOrdinaryInkMaterial({
    prepared,
    materialCoverageCandidate,
    output: outputContext.createImageData(pixelWidth, pixelHeight),
  });
}
