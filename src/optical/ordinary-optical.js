import { createOrdinaryConcentrationField } from "../density/index.js";
import { assertInkRecipeCompatible } from "../recipes/compatibility.js";

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
    if (!Number.isFinite(value.data[index]) || value.data[index] < 0 || value.data[index] > 1) {
      throw new TypeError(`${path} data must be finite in 0...1.`);
    }
  }
  return value.data;
}

/** Map normalized Density and Surface coverage to recipe-owned RGB/alpha. */
export function compositeOrdinaryOptical({
  pixelWidth,
  pixelHeight,
  concentration,
  resolvedCoverage,
  recipe,
  output,
}) {
  assertInkRecipeCompatible(recipe);
  const concentrationData = assertScalarPlane(
    concentration,
    pixelWidth,
    pixelHeight,
    "concentration",
  );
  const coverageData = assertScalarPlane(
    resolvedCoverage,
    pixelWidth,
    pixelHeight,
    "resolvedCoverage",
  );
  const result = output ?? {
    width: pixelWidth,
    height: pixelHeight,
    data: new Uint8ClampedArray(pixelWidth * pixelHeight * 4),
  };
  if (
    result.width !== pixelWidth
    || result.height !== pixelHeight
    || !(result.data instanceof Uint8ClampedArray)
    || result.data.length !== pixelWidth * pixelHeight * 4
  ) {
    throw new TypeError("output must expose width * height Uint8Clamped RGBA data.");
  }
  result.data.fill(0);
  for (let index = 0; index < concentrationData.length; index += 1) {
    const coverage = coverageData[index];
    if (coverage <= 0.001) continue;
    const alpha = (recipe.optical.minimumAlpha
      + (recipe.optical.maximumAlpha - recipe.optical.minimumAlpha)
        * concentrationData[index]) * coverage;
    const offset = index * 4;
    result.data[offset] = recipe.optical.rgb.red;
    result.data[offset + 1] = recipe.optical.rgb.green;
    result.data[offset + 2] = recipe.optical.rgb.blue;
    result.data[offset + 3] = Math.round(alpha * 255);
  }
  return result;
}

/** Backwards-compatible high-level ordinary material wrapper. */
export function compositeOrdinaryInk(options) {
  const concentration = createOrdinaryConcentrationField(options);
  return compositeOrdinaryOptical({
    pixelWidth: options.pixelWidth,
    pixelHeight: options.pixelHeight,
    concentration,
    resolvedCoverage: options.resolvedCoverage,
    recipe: options.recipe,
    output: options.output,
  });
}
