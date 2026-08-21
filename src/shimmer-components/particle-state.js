import { assertUint32 } from "../contracts/numeric.js";
import { randomFrom } from "../deterministic/random.js";
import { assertSurfaceRecipeCompatible } from "../surface-recipes/index.js";
import { assertShimmerComponentRecipeCompatible } from "./compatibility.js";

function assertPositiveInteger(value, path) {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new TypeError(`${path} must be a positive integer.`);
  }
  return value;
}

function assertRasterScale(value) {
  if (!Number.isFinite(value) || value < 0.25 || value > 8) {
    throw new TypeError("rasterScale must be finite in 0.25...8.");
  }
  return value;
}

function assertCoverage(value, width, height) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("resolvedCoverage must be a plain object.");
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError("resolvedCoverage must have a plain prototype.");
  }
  const read = (key) => {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor?.enumerable || !("value" in descriptor)) {
      throw new TypeError(
        `resolvedCoverage.${key} must be an enumerable own data property.`,
      );
    }
    return descriptor.value;
  };
  const coverageWidth = read("width");
  const coverageHeight = read("height");
  const data = read("data");
  if (
    coverageWidth !== width
    || coverageHeight !== height
    || !(data instanceof Float32Array)
    || data.length !== width * height
  ) {
    throw new TypeError(
      "resolvedCoverage must expose width * height Float32 data.",
    );
  }
  for (let index = 0; index < data.length; index += 1) {
    if (
      !Number.isFinite(data[index])
      || data[index] < 0
      || data[index] > 1
    ) {
      throw new TypeError("resolvedCoverage data must be finite in 0...1.");
    }
  }
  return data;
}

/**
 * Select a bounded deterministic particle population from the actual resolved
 * wet footprint. Density is intentionally not an input. Surface particleCatch
 * controls how much of the authored load remains on the page.
 */
export function createShimmerParticleState({
  pixelWidth,
  pixelHeight,
  rasterScale,
  resolvedCoverage,
  surfaceRecipe,
  shimmerComponentRecipe,
  particleSeed,
}) {
  const width = assertPositiveInteger(pixelWidth, "pixelWidth");
  const height = assertPositiveInteger(pixelHeight, "pixelHeight");
  const scale = assertRasterScale(rasterScale);
  assertSurfaceRecipeCompatible(surfaceRecipe);
  assertShimmerComponentRecipeCompatible(shimmerComponentRecipe);
  const seed = assertUint32(particleSeed, "particleSeed");
  const coverage = assertCoverage(resolvedCoverage, width, height);
  const budget = shimmerComponentRecipe.particleBudget;
  if (budget === 0 || shimmerComponentRecipe.particleLoad === 0) {
    return Object.freeze({
      width,
      height,
      seed,
      count: 0,
      x: new Float32Array(0),
      y: new Float32Array(0),
      radius: new Float32Array(0),
      orientation: new Float32Array(0),
      strength: new Float32Array(0),
    });
  }

  const random = randomFrom(seed);
  const reservoir = new Uint32Array(budget);
  let eligibleCount = 0;
  for (let index = 0; index < coverage.length; index += 1) {
    if (coverage[index] < shimmerComponentRecipe.coverageThreshold) continue;
    if (eligibleCount < budget) {
      reservoir[eligibleCount] = index;
    } else {
      const replacement = Math.floor(random() * (eligibleCount + 1));
      if (replacement < budget) reservoir[replacement] = index;
    }
    eligibleCount += 1;
  }

  const catchResponse = 0.25 + surfaceRecipe.axes.particleCatch * 0.75;
  const eligibleCssArea = eligibleCount / (scale * scale);
  const desired = Math.floor(
    eligibleCssArea
      * shimmerComponentRecipe.particleLoad
      * catchResponse
      / 12,
  );
  const count = Math.min(budget, eligibleCount, Math.max(0, desired));
  const x = new Float32Array(count);
  const y = new Float32Array(count);
  const radius = new Float32Array(count);
  const orientation = new Float32Array(count);
  const strength = new Float32Array(count);
  const radiusSpan = shimmerComponentRecipe.sizeMaximumCssPixels
    - shimmerComponentRecipe.sizeMinimumCssPixels;
  for (let particle = 0; particle < count; particle += 1) {
    const index = reservoir[particle];
    x[particle] = index % width + 0.2 + random() * 0.6;
    y[particle] = Math.floor(index / width) + 0.2 + random() * 0.6;
    radius[particle] = (
      shimmerComponentRecipe.sizeMinimumCssPixels
      + radiusSpan * Math.pow(random(), 1.6)
    ) * scale;
    orientation[particle] = random();
    strength[particle] = (0.65 + random() * 0.35)
      * (0.7 + surfaceRecipe.axes.particleCatch * 0.3);
  }
  return Object.freeze({
    width,
    height,
    seed,
    count,
    x,
    y,
    radius,
    orientation,
    strength,
  });
}
