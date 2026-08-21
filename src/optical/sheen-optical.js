import {
  assertSheenComponentRecipeCompatible,
  readSheenObservation,
} from "../sheen-components/index.js";

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

function assertFilm(value, width, height) {
  const filmWidth = readOwnData(value, "width", "sheenFilm");
  const filmHeight = readOwnData(value, "height", "sheenFilm");
  const data = readOwnData(value, "data", "sheenFilm");
  if (
    filmWidth !== width
    || filmHeight !== height
    || !(data instanceof Float32Array)
    || data.length !== width * height
  ) {
    throw new TypeError(
      "sheenFilm must expose width * height Float32 data.",
    );
  }
  for (let index = 0; index < data.length; index += 1) {
    if (!Number.isFinite(data[index]) || data[index] < 0 || data[index] > 1) {
      throw new TypeError("sheenFilm data must be finite in 0...1.");
    }
  }
  return data;
}

/**
 * Reveal a colored surface-film reflection for one explicit observation.
 * Alpha and glyph coverage are copied exactly. A zero/sub-threshold specular
 * alignment is the static fallback and returns the ordinary base color exact.
 */
export function compositeSheenOptical({
  pixelWidth,
  pixelHeight,
  baseRgba,
  sheenFilm,
  sheenComponentRecipe,
  sheenObservation,
  output = baseRgba,
}) {
  const width = assertPositiveInteger(pixelWidth, "pixelWidth");
  const height = assertPositiveInteger(pixelHeight, "pixelHeight");
  assertSheenComponentRecipeCompatible(sheenComponentRecipe);
  const observation = readSheenObservation(sheenObservation);
  const base = assertRgba(baseRgba, width, height, "baseRgba");
  const film = assertFilm(sheenFilm, width, height);
  const result = assertRgba(output, width, height, "output");
  result.set(base);

  if (observation.specularAlignment <= sheenComponentRecipe.viewThreshold) {
    return output;
  }
  const response = Math.pow(
    (
      observation.specularAlignment - sheenComponentRecipe.viewThreshold
    ) / (1 - sheenComponentRecipe.viewThreshold),
    sheenComponentRecipe.viewExponent,
  );
  for (let index = 0; index < film.length; index += 1) {
    if (film[index] <= 0) continue;
    const offset = index * 4;
    if (base[offset + 3] === 0) continue;
    const mix = Math.min(
      sheenComponentRecipe.mixMaximum,
      film[index] * response * sheenComponentRecipe.mixMaximum,
    );
    if (mix <= 0) continue;
    result[offset] = Math.round(
      base[offset] * (1 - mix) + sheenComponentRecipe.sheenRed * mix,
    );
    result[offset + 1] = Math.round(
      base[offset + 1] * (1 - mix) + sheenComponentRecipe.sheenGreen * mix,
    );
    result[offset + 2] = Math.round(
      base[offset + 2] * (1 - mix) + sheenComponentRecipe.sheenBlue * mix,
    );
  }
  return output;
}
