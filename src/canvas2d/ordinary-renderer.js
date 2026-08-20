import { createDensityField, compositeOrdinaryInk } from "../density/index.js";
import { createMaterialCoverage } from "../surface/index.js";
import { makeLayer } from "./glyph-mask.js";

function assertSurfaceSeed(surfaceSeed) {
  if (!Number.isInteger(surfaceSeed) || surfaceSeed < 0) {
    throw new TypeError("surfaceSeed must be an explicit non-negative integer.");
  }
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
  createLayer = makeLayer,
}) {
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
 * Calculate density, Surface coverage, and ordinary optical RGBA from a mask.
 * Layout and glyph-mask placement remain caller responsibilities.
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
  lineLayouts,
  createLayer = makeLayer,
}) {
  assertSurfaceSeed(surfaceSeed);
  const normalizedAbsorption = absorption / 100;
  const maskPixels = mask.getContext("2d").getImageData(
    0,
    0,
    pixelWidth,
    pixelHeight,
  );
  const materialCoverage = normalizedAbsorption > 0.002
    ? makeMaterialCoverage({
      mask,
      pixelWidth,
      pixelHeight,
      width,
      height,
      absorption: normalizedAbsorption,
      surfaceSeed,
      createLayer,
    })
    : null;
  const { densityField, densitySamples } = createDensityField({
    pixelWidth,
    pixelHeight,
    scale,
    fontSize,
    lineLayouts,
  });
  const result = outputContext.createImageData(pixelWidth, pixelHeight);
  compositeOrdinaryInk({
    pixelWidth,
    pixelHeight,
    mask: maskPixels,
    materialCoverage,
    densityField,
    densitySamples,
    nibId,
    flow,
    absorption,
    output: result,
  });
  return {
    imageData: result,
    densityField,
    densitySamples,
    materialCoverage,
  };
}
