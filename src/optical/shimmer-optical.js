import {
  assertShimmerComponentRecipeCompatible,
  readShimmerObservation,
} from "../shimmer-components/index.js";
import { assertUint32 } from "../contracts/numeric.js";

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

function assertParticleState(state, width, height, budget) {
  const stateWidth = readOwnData(state, "width", "shimmerParticles");
  const stateHeight = readOwnData(state, "height", "shimmerParticles");
  assertUint32(readOwnData(state, "seed", "shimmerParticles"), "shimmerParticles.seed");
  const count = readOwnData(state, "count", "shimmerParticles");
  if (
    stateWidth !== width
    || stateHeight !== height
    || !Number.isInteger(count)
    || count < 0
    || count > budget
  ) {
    throw new TypeError("shimmerParticles dimensions or count are invalid.");
  }
  const arrays = Object.fromEntries(
    ["x", "y", "radius", "orientation", "strength"].map((key) => {
      const value = readOwnData(state, key, "shimmerParticles");
      if (!(value instanceof Float32Array) || value.length !== count) {
        throw new TypeError(`shimmerParticles.${key} must be a count-sized Float32Array.`);
      }
      return [key, value];
    }),
  );
  for (let index = 0; index < count; index += 1) {
    if (
      !Number.isFinite(arrays.x[index])
      || arrays.x[index] < 0
      || arrays.x[index] >= width
      || !Number.isFinite(arrays.y[index])
      || arrays.y[index] < 0
      || arrays.y[index] >= height
      || !Number.isFinite(arrays.radius[index])
      || arrays.radius[index] <= 0
      || arrays.radius[index] > 48
      || !Number.isFinite(arrays.orientation[index])
      || arrays.orientation[index] < 0
      || arrays.orientation[index] > 1
      || !Number.isFinite(arrays.strength[index])
      || arrays.strength[index] < 0
      || arrays.strength[index] > 1
    ) {
      throw new TypeError("shimmerParticles values are outside their bounds.");
    }
  }
  return { count, ...arrays };
}

/**
 * Render a bounded fixed particle list inside existing ordinary ink alpha.
 * Reduce Motion selects the authored static light phase; it never relocates or
 * animates particles. Alpha and glyph coverage are copied exactly.
 */
export function compositeShimmerOptical({
  pixelWidth,
  pixelHeight,
  baseRgba,
  shimmerParticles,
  shimmerComponentRecipe,
  shimmerObservation,
  output = baseRgba,
}) {
  const width = assertPositiveInteger(pixelWidth, "pixelWidth");
  const height = assertPositiveInteger(pixelHeight, "pixelHeight");
  assertShimmerComponentRecipeCompatible(shimmerComponentRecipe);
  const observation = readShimmerObservation(shimmerObservation);
  const base = assertRgba(baseRgba, width, height, "baseRgba");
  const result = assertRgba(output, width, height, "output");
  const particles = assertParticleState(
    shimmerParticles,
    width,
    height,
    shimmerComponentRecipe.particleBudget,
  );
  result.set(base);
  const phase = observation.reduceMotion
    ? shimmerComponentRecipe.staticPhase
    : observation.lightPhase;
  for (let particle = 0; particle < particles.count; particle += 1) {
    const radius = particles.radius[particle];
    const left = Math.max(0, Math.floor(particles.x[particle] - radius));
    const right = Math.min(width - 1, Math.ceil(particles.x[particle] + radius));
    const top = Math.max(0, Math.floor(particles.y[particle] - radius));
    const bottom = Math.min(height - 1, Math.ceil(particles.y[particle] + radius));
    const alignment = Math.pow(
      0.5 + 0.5 * Math.cos(
        Math.PI * 2 * (particles.orientation[particle] + phase),
      ),
      shimmerComponentRecipe.lightExponent,
    );
    const peakMix = shimmerComponentRecipe.reflectivity
      * particles.strength[particle]
      * alignment;
    if (peakMix <= 0.001) continue;
    for (let y = top; y <= bottom; y += 1) {
      for (let x = left; x <= right; x += 1) {
        const dx = x + 0.5 - particles.x[particle];
        const dy = y + 0.5 - particles.y[particle];
        const distance = Math.hypot(dx, dy);
        if (distance >= radius) continue;
        const offset = (y * width + x) * 4;
        if (result[offset + 3] === 0) continue;
        // A flake is a crisp reflective facet rather than a soft radial glow.
        // Keep only a small edge taper to avoid aliased square pixels.
        const mix = peakMix * (0.55 + 0.45 * (1 - distance / radius));
        result[offset] = Math.round(
          result[offset] * (1 - mix)
            + shimmerComponentRecipe.particleRed * mix,
        );
        result[offset + 1] = Math.round(
          result[offset + 1] * (1 - mix)
            + shimmerComponentRecipe.particleGreen * mix,
        );
        result[offset + 2] = Math.round(
          result[offset + 2] * (1 - mix)
            + shimmerComponentRecipe.particleBlue * mix,
        );
      }
    }
  }
  return output;
}
