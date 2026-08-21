import { assertSheenComponentRecipeCompatible } from "./compatibility.js";
import { assertSurfaceRecipeCompatible } from "../surface-recipes/index.js";

function assertPositiveInteger(value, path) {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new TypeError(`${path} must be a positive integer.`);
  }
  return value;
}

function assertScalarPlane(value, width, height, path) {
  if (
    value?.width !== width
    || value?.height !== height
    || !(value?.data instanceof Float32Array)
    || value.data.length !== width * height
  ) {
    throw new TypeError(`${path} must expose width * height Float32 data.`);
  }
  for (let index = 0; index < value.data.length; index += 1) {
    if (
      !Number.isFinite(value.data[index])
      || value.data[index] < 0
      || value.data[index] > 1
    ) {
      throw new TypeError(`${path} data must be finite in 0...1.`);
    }
  }
  return value.data;
}

/**
 * Resolve a high-concentration, paper-retained surface-film plane. The plane
 * owns no hue and does not add glyph coverage; Optical decides whether a view
 * direction reveals it.
 */
export function createSheenSurfaceFilm({
  pixelWidth,
  pixelHeight,
  concentration,
  resolvedCoverage,
  surfaceRecipe,
  sheenComponentRecipe,
}) {
  const width = assertPositiveInteger(pixelWidth, "pixelWidth");
  const height = assertPositiveInteger(pixelHeight, "pixelHeight");
  assertSurfaceRecipeCompatible(surfaceRecipe);
  assertSheenComponentRecipeCompatible(sheenComponentRecipe);
  const concentrationData = assertScalarPlane(
    concentration,
    width,
    height,
    "concentration",
  );
  const coverageData = assertScalarPlane(
    resolvedCoverage,
    width,
    height,
    "resolvedCoverage",
  );
  const result = new Float32Array(width * height);
  const threshold = sheenComponentRecipe.activationThreshold;
  const thresholdSpan = 1 - threshold;
  const paperRetention = surfaceRecipe.axes.filmPreservation
    / (
      1
      + surfaceRecipe.axes.roughness
        * sheenComponentRecipe.roughnessSensitivity
    );
  for (let index = 0; index < result.length; index += 1) {
    const concentrationValue = concentrationData[index];
    if (
      concentrationValue - threshold <= 1e-6
      || coverageData[index] <= 0.001
    ) {
      continue;
    }
    const activation = Math.pow(
      (concentrationValue - threshold) / thresholdSpan,
      sheenComponentRecipe.activationExponent,
    );
    result[index] = Math.min(
      sheenComponentRecipe.filmMaximum,
      activation
        * coverageData[index]
        * paperRetention
        * sheenComponentRecipe.filmGain,
    );
  }
  return Object.freeze({ width, height, data: result });
}
