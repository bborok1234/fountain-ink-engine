import { assertOxidationComponentRecipeCompatible } from "../oxidation-components/index.js";

function assertPositiveInteger(value, path) {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new TypeError(`${path} must be a positive integer.`);
  }
  return value;
}

function readOwnData(value, key, path) {
  if (value === null || typeof value !== "object") {
    throw new TypeError(`${path} must be an object.`);
  }
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  if (!descriptor?.enumerable || !("value" in descriptor)) {
    throw new TypeError(`${path}.${key} must be an enumerable own data property.`);
  }
  return descriptor.value;
}

function assertRgba(value, width, height, path) {
  const rgbaWidth = readOwnData(value, "width", path);
  const rgbaHeight = readOwnData(value, "height", path);
  const data = readOwnData(value, "data", path);
  if (
    rgbaWidth !== width
    || rgbaHeight !== height
    || !(data instanceof Uint8ClampedArray)
    || data.length !== width * height * 4
  ) {
    throw new TypeError(`${path} must expose width * height Uint8Clamped RGBA data.`);
  }
  return data;
}

function assertConcentration(value, width, height) {
  const fieldWidth = readOwnData(value, "width", "concentration");
  const fieldHeight = readOwnData(value, "height", "concentration");
  const data = readOwnData(value, "data", "concentration");
  if (
    fieldWidth !== width
    || fieldHeight !== height
    || !(data instanceof Float32Array)
    || data.length !== width * height
  ) {
    throw new TypeError(
      "concentration must expose width * height Float32 data.",
    );
  }
  for (let index = 0; index < data.length; index += 1) {
    if (!Number.isFinite(data[index]) || data[index] < 0 || data[index] > 1) {
      throw new TypeError("concentration data must be finite in 0...1.");
    }
  }
  return data;
}

function assertOxidationState(value) {
  const progress = readOwnData(value, "progress", "oxidationState");
  if (!Number.isFinite(progress) || progress < 0 || progress > 1) {
    throw new TypeError("oxidationState.progress must be finite in 0...1.");
  }
  return progress;
}

export function compositeOxidationOptical({
  pixelWidth,
  pixelHeight,
  baseRgba,
  concentration,
  oxidationState,
  oxidationComponentRecipe,
  output = baseRgba,
}) {
  const width = assertPositiveInteger(pixelWidth, "pixelWidth");
  const height = assertPositiveInteger(pixelHeight, "pixelHeight");
  assertOxidationComponentRecipeCompatible(oxidationComponentRecipe);
  const base = assertRgba(baseRgba, width, height, "baseRgba");
  const concentrationData = assertConcentration(concentration, width, height);
  const progress = assertOxidationState(oxidationState);
  const result = assertRgba(output, width, height, "output");
  result.set(base);

  const fresh = [
    oxidationComponentRecipe.freshRed,
    oxidationComponentRecipe.freshGreen,
    oxidationComponentRecipe.freshBlue,
  ];
  const settled = [
    oxidationComponentRecipe.settledRed,
    oxidationComponentRecipe.settledGreen,
    oxidationComponentRecipe.settledBlue,
  ];
  const target = fresh.map((channel, index) =>
    channel * (1 - progress) + settled[index] * progress);
  for (let index = 0; index < concentrationData.length; index += 1) {
    const offset = index * 4;
    if (base[offset + 3] === 0) continue;
    const concentrationResponse = 1
      - oxidationComponentRecipe.concentrationInfluence
      + oxidationComponentRecipe.concentrationInfluence
        * concentrationData[index];
    const mix = oxidationComponentRecipe.mixMaximum * concentrationResponse;
    for (let channel = 0; channel < 3; channel += 1) {
      result[offset + channel] = Math.round(
        base[offset + channel] * (1 - mix) + target[channel] * mix,
      );
    }
  }
  return output;
}
