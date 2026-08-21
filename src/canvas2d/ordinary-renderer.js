import {
  createDensityField,
  createOrdinaryConcentrationField,
} from "../density/index.js";
import { assertDensityFieldInputs } from "../density/ordinary-density.js";
import {
  compositeDyeEdgeOptical,
  compositeOrdinaryOptical,
  compositeSheenOptical,
  compositeShimmerOptical,
} from "../optical/index.js";
import { assertInkRecipeCompatible } from "../recipes/compatibility.js";
import { assertDyeComponentRecipeCompatible } from "../dye-components/index.js";
import {
  assertSheenComponentRecipeCompatible,
  createSheenSurfaceFilm,
  readSheenObservation,
} from "../sheen-components/index.js";
import {
  assertShimmerComponentRecipeCompatible,
  createShimmerParticleState,
  readShimmerObservation,
} from "../shimmer-components/index.js";
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
  sheenFilm,
  shimmerParticles,
  fiberEdgeCoverage,
  normalizedConcentration,
  baseCompositeRgba,
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
      sheenFilm,
      shimmerParticles,
      fiberEdgeCoverage,
      applied: materialCoverageCandidate !== null,
    }),
    optical: Object.freeze({ baseCompositeRgba, compositeRgba }),
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
  dyeComponentRecipe = null,
  sheenComponentRecipe = null,
  sheenObservation = null,
  shimmerComponentRecipe = null,
  shimmerObservation = null,
  shimmerSeed = null,
  createLayer = makeLayer,
}) {
  assertSurfaceRecipeCompatible(surfaceRecipe);
  if (dyeComponentRecipe !== null) {
    // Compatibility is asserted again at the calculation boundary; this early
    // check prevents a forged component from causing a Canvas allocation.
    assertDyeComponentRecipeCompatible(dyeComponentRecipe);
  }
  if (sheenComponentRecipe !== null) {
    assertSheenComponentRecipeCompatible(sheenComponentRecipe);
    readSheenObservation(sheenObservation);
  } else if (sheenObservation !== null) {
    throw new TypeError(
      "sheenObservation requires a sheenComponentRecipe.",
    );
  }
  if (shimmerComponentRecipe !== null) {
    assertShimmerComponentRecipeCompatible(shimmerComponentRecipe);
    readShimmerObservation(shimmerObservation);
    assertUint32(shimmerSeed, "shimmerSeed");
  } else if (shimmerObservation !== null || shimmerSeed !== null) {
    throw new TypeError(
      "shimmerObservation and shimmerSeed require a shimmerComponentRecipe.",
    );
  }
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
  const surfaceApplied = surfaceResponse > 0.002;
  return Object.freeze({
    maskPixels,
    surfaceDeposit: surfaceApplied || dyeComponentRecipe !== null
      ? makeKeyboardSurfaceDeposit({
        mask,
        width,
        height,
        createLayer,
      })
      : null,
    surfaceApplied,
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
  sheenComponentRecipe = null,
  sheenObservation = null,
  shimmerComponentRecipe = null,
  shimmerObservation = null,
  shimmerSeed = null,
}) {
  assertInkRecipeCompatible(recipe);
  assertSurfaceRecipeCompatible(surfaceRecipe);
  assertPercent(flow, "flow");
  assertSurfaceSeed(surfaceSeed);
  if (sheenComponentRecipe !== null) {
    assertSheenComponentRecipeCompatible(sheenComponentRecipe);
  } else if (sheenObservation !== null) {
    throw new TypeError(
      "sheenObservation requires a sheenComponentRecipe.",
    );
  }
  const validatedSheenObservation = sheenComponentRecipe === null
    ? null
    : readSheenObservation(sheenObservation);
  if (shimmerComponentRecipe !== null) {
    assertShimmerComponentRecipeCompatible(shimmerComponentRecipe);
  } else if (shimmerObservation !== null || shimmerSeed !== null) {
    throw new TypeError(
      "shimmerObservation and shimmerSeed require a shimmerComponentRecipe.",
    );
  }
  const validatedShimmerObservation = shimmerComponentRecipe === null
    ? null
    : readShimmerObservation(shimmerObservation);
  const validatedShimmerSeed = shimmerComponentRecipe === null
    ? null
    : assertUint32(shimmerSeed, "shimmerSeed");
  const surfaceResponse = surfaceRecipe.surfaceRecipeSchemaVersion === 1
    ? surfaceRecipe.axes.verticalUptake
    : Math.max(
      surfaceRecipe.axes.depthUptake,
      surfaceRecipe.axes.lateralMobility,
    );
  const surfaceApplied = surfaceResponse > 0.002;
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
      surfaceApplied
        ? resampleContactDensityToSurfaceGrid({
          sourceWidth: pixelWidth,
          sourceHeight: pixelHeight,
          targetWidth: surfaceDeposit.width,
          targetHeight: surfaceDeposit.height,
          mask: maskPixels,
          accumulatedVariation: densityField,
          sampleCount: densitySamples,
        })
        : null,
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
    surfaceCoverageGrid: surfaceApplied ? surfaceState?.coverage ?? null : null,
    surfaceDensityTransport: surfaceApplied
      ? surfaceState?.densityTransport ?? null
      : null,
    paperDepth: surfaceApplied ? surfaceState?.paperDepth ?? null : null,
    dyeComponent: surfaceState?.dyeComponent ?? null,
    dyeComponentRecipe,
    sheenComponentRecipe,
    sheenObservation: validatedSheenObservation,
    shimmerComponentRecipe,
    shimmerObservation: validatedShimmerObservation,
    shimmerSeed: validatedShimmerSeed,
    fiberEdgeCoverage,
    nibId,
    flow,
    scale,
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
    dyeComponentRecipe,
    sheenComponentRecipe,
    sheenObservation,
    shimmerComponentRecipe,
    shimmerObservation,
    shimmerSeed,
    fiberEdgeCoverage,
    nibId,
    flow,
    scale,
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
  const ordinaryResult = compositeOrdinaryOptical({
    pixelWidth,
    pixelHeight,
    concentration: normalizedConcentration,
    resolvedCoverage,
    recipe,
    output,
  });
  const dyeActive = dyeComponent !== null && dyeComponentRecipe !== null;
  const sheenActive = sheenComponentRecipe !== null;
  const shimmerActive = shimmerComponentRecipe !== null;
  const baseCompositeRgba = !dyeActive && !sheenActive && !shimmerActive
    ? null
    : Object.freeze({
      width: pixelWidth,
      height: pixelHeight,
      data: new Uint8ClampedArray(ordinaryResult.data),
    });
  const structuralRgba = {
    width: pixelWidth,
    height: pixelHeight,
    data: ordinaryResult.data,
  };
  if (dyeActive) {
    compositeDyeEdgeOptical({
      pixelWidth,
      pixelHeight,
      baseRgba: baseCompositeRgba,
      dyeComponent,
      dyeComponentRecipe,
      output: structuralRgba,
    });
  }
  const sheenFilm = sheenActive
    ? createSheenSurfaceFilm({
      pixelWidth,
      pixelHeight,
      concentration: normalizedConcentration,
      resolvedCoverage,
      surfaceRecipe,
      sheenComponentRecipe,
    })
    : null;
  if (sheenActive) {
    compositeSheenOptical({
      pixelWidth,
      pixelHeight,
      baseRgba: structuralRgba,
      sheenFilm,
      sheenComponentRecipe,
      sheenObservation,
      output: structuralRgba,
    });
  }
  const shimmerParticles = shimmerActive
    ? createShimmerParticleState({
      pixelWidth,
      pixelHeight,
      rasterScale: scale,
      resolvedCoverage,
      surfaceRecipe,
      shimmerComponentRecipe,
      particleSeed: shimmerSeed,
    })
    : null;
  if (shimmerActive) {
    compositeShimmerOptical({
      pixelWidth,
      pixelHeight,
      baseRgba: structuralRgba,
      shimmerParticles,
      shimmerComponentRecipe,
      shimmerObservation,
      output: structuralRgba,
    });
  }
  const result = ordinaryResult;
  const stages = makeDiagnosticStages({
    rgbaMask: maskPixels,
    accumulatedVariation: densityField,
    sampleCount: densitySamples,
    materialCoverageCandidate,
    resolvedCoverage,
    densityTransport: surfaceDensityTransport,
    paperDepth,
    dyeComponent,
    sheenFilm,
    shimmerParticles,
    fiberEdgeCoverage,
    normalizedConcentration,
    baseCompositeRgba,
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
    sheenFilm: stages.surface.sheenFilm,
    shimmerParticles: stages.surface.shimmerParticles,
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
  sheenComponentRecipe = null,
  sheenObservation = null,
  shimmerComponentRecipe = null,
  shimmerObservation = null,
  shimmerSeed = null,
  createLayer = makeLayer,
}) {
  assertInkRecipeCompatible(recipe);
  assertSurfaceRecipeCompatible(surfaceRecipe);
  assertPercent(flow, "flow");
  assertSurfaceSeed(surfaceSeed);
  if (sheenComponentRecipe !== null) {
    assertSheenComponentRecipeCompatible(sheenComponentRecipe);
    readSheenObservation(sheenObservation);
  } else if (sheenObservation !== null) {
    throw new TypeError(
      "sheenObservation requires a sheenComponentRecipe.",
    );
  }
  if (shimmerComponentRecipe !== null) {
    assertShimmerComponentRecipeCompatible(shimmerComponentRecipe);
    readShimmerObservation(shimmerObservation);
    assertUint32(shimmerSeed, "shimmerSeed");
  } else if (shimmerObservation !== null || shimmerSeed !== null) {
    throw new TypeError(
      "shimmerObservation and shimmerSeed require a shimmerComponentRecipe.",
    );
  }
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
    dyeComponentRecipe,
    sheenComponentRecipe,
    sheenObservation,
    shimmerComponentRecipe,
    shimmerObservation,
    shimmerSeed,
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
    sheenComponentRecipe,
    sheenObservation,
    shimmerComponentRecipe,
    shimmerObservation,
    shimmerSeed,
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
