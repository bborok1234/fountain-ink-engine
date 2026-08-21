import { assertDyeComponentRecipeCompatible } from "../dye-components/index.js";

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

function assertPositiveInteger(value, path) {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new TypeError(`${path} must be a positive integer.`);
  }
  return value;
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

function assertDyeComponentState(value, recipe) {
  const width = assertPositiveInteger(
    readOwnData(value, "width", "dyeComponent"),
    "dyeComponent.width",
  );
  const height = assertPositiveInteger(
    readOwnData(value, "height", "dyeComponent"),
    "dyeComponent.height",
  );
  const id = readOwnData(value, "id", "dyeComponent");
  const revision = readOwnData(value, "revision", "dyeComponent");
  const colorZone = readOwnData(
    value,
    "colorZone",
    "dyeComponent",
  );
  if (id !== recipe.id || revision !== recipe.revision) {
    throw new TypeError("dyeComponent identity must match dyeComponentRecipe.");
  }
  if (
    !(colorZone instanceof Float32Array)
    || colorZone.length !== width * height
  ) {
    throw new TypeError(
      "dyeComponent.colorZone must be a width * height Float32Array.",
    );
  }
  for (let index = 0; index < colorZone.length; index += 1) {
    const valueAtIndex = colorZone[index];
    if (
      !Number.isFinite(valueAtIndex)
      || valueAtIndex < 0
      || valueAtIndex > 1
    ) {
      throw new TypeError(
        "dyeComponent.colorZone values must be finite in 0...1.",
      );
    }
  }
  return {
    width,
    height,
    colorZone,
  };
}

function bilinearSample(plane, width, height, x, y) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = Math.min(width - 1, x0 + 1);
  const y1 = Math.min(height - 1, y0 + 1);
  const fractionX = x - x0;
  const fractionY = y - y0;
  const top = plane[y0 * width + x0] * (1 - fractionX)
    + plane[y0 * width + x1] * fractionX;
  const bottom = plane[y1 * width + x0] * (1 - fractionX)
    + plane[y1 * width + x1] * fractionX;
  return top * (1 - fractionY) + bottom * fractionY;
}

/**
 * Apply a Surface-owned discontinuous dye color zone as an Optical RGB mix.
 * Existing alpha is copied exactly, so this operator cannot add coverage,
 * halos, shadows, or a duplicate glyph pass.
 */
export function compositeDyeEdgeOptical({
  pixelWidth,
  pixelHeight,
  baseRgba,
  dyeComponent,
  dyeComponentRecipe,
  output = baseRgba,
}) {
  const width = assertPositiveInteger(pixelWidth, "pixelWidth");
  const height = assertPositiveInteger(pixelHeight, "pixelHeight");
  assertDyeComponentRecipeCompatible(dyeComponentRecipe);
  const base = assertRgba(baseRgba, width, height, "baseRgba");
  const result = assertRgba(output, width, height, "output");
  const component = assertDyeComponentState(
    dyeComponent,
    dyeComponentRecipe,
  );
  if (result !== base) result.set(base);

  for (let y = 0; y < height; y += 1) {
    const mappedY = Math.max(
      0,
      Math.min(
        component.height - 1,
        (y + 0.5) * component.height / height - 0.5,
      ),
    );
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      if (base[offset + 3] === 0) continue;
      const mappedX = Math.max(
        0,
        Math.min(
          component.width - 1,
          (x + 0.5) * component.width / width - 0.5,
        ),
      );
      const colorZone = bilinearSample(
        component.colorZone,
        component.width,
        component.height,
        mappedX,
        mappedY,
      );
      if (!(colorZone > 0)) continue;
      const mix = Math.min(
        dyeComponentRecipe.edgeMixMaximum,
        colorZone * dyeComponentRecipe.edgeMixGain,
      );
      if (!(mix > 0)) continue;
      const keep = 1 - mix;
      result[offset] = Math.round(
        base[offset] * keep + dyeComponentRecipe.edgeRed * mix,
      );
      result[offset + 1] = Math.round(
        base[offset + 1] * keep + dyeComponentRecipe.edgeGreen * mix,
      );
      result[offset + 2] = Math.round(
        base[offset + 2] * keep + dyeComponentRecipe.edgeBlue * mix,
      );
      result[offset + 3] = base[offset + 3];
    }
  }
  return output;
}
