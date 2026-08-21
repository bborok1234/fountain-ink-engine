import { assertUint32 } from "./numeric.js";

const RENDER_CONTEXT_KEYS = Object.freeze([
  "literalText",
  "segmentationLocale",
  "segmentationRuntime",
  "segmentationRuntimeVersion",
  "graphemes",
  "glyphSeeds",
  "glyphSeedDerivation",
  "surfaceSeed",
  "surfaceSeedDerivation",
  "nibId",
  "flow",
  "fontSize",
  "textPosition",
  "viewport",
  "raster",
  "font",
  "dependencies",
]);

const TEXT_POSITION_KEYS = Object.freeze(["x", "y"]);
const VIEWPORT_KEYS = Object.freeze(["width", "height"]);
const RASTER_KEYS = Object.freeze([
  "devicePixelRatio",
  "scale",
  "colorSpace",
]);
const FONT_KEYS = Object.freeze([
  "family",
  "weight",
  "style",
  "packageName",
  "packageVersion",
  "assetSha256",
  "loadState",
]);
const DEPENDENCY_KEYS = Object.freeze([
  "lockfileName",
  "lockfileSha256",
]);

function readExactDataRecord(value, keys, path) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${path} must be an object.`);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError(`${path} must have a plain prototype.`);
  }
  const expected = new Set(keys);
  const actual = Reflect.ownKeys(value);
  const unexpected = actual.filter((key) =>
    typeof key !== "string" || !expected.has(key));
  const missing = keys.filter((key) => !Object.hasOwn(value, key));
  if (unexpected.length > 0 || missing.length > 0) {
    throw new TypeError(
      `${path} has invalid keys; unexpected=${unexpected.map(String).join(",") || "none"}; missing=${missing.join(",") || "none"}.`,
    );
  }
  return Object.fromEntries(keys.map((key) => {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor?.enumerable || !("value" in descriptor)) {
      throw new TypeError(`${path}.${key} must be an enumerable own data property.`);
    }
    return [key, descriptor.value];
  }));
}

function assertNonEmptyString(value, path) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError(`${path} must be a non-empty string.`);
  }
  return value;
}

function assertFiniteRange(value, path, minimum, maximum) {
  if (!Number.isFinite(value) || value < minimum || value > maximum) {
    throw new TypeError(`${path} must be finite in ${minimum}...${maximum}.`);
  }
  return value;
}

function assertPositiveSafeInteger(value, path) {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new TypeError(`${path} must be a positive safe integer.`);
  }
  return value;
}

function assertSha256(value, path) {
  if (typeof value !== "string" || !/^[0-9a-f]{64}$/.test(value)) {
    throw new TypeError(`${path} must be a lowercase SHA-256 hexadecimal string.`);
  }
  return value;
}

function readDenseArray(value, path) {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) {
    throw new TypeError(`${path} must be a plain array.`);
  }
  const expectedKeys = new Set([
    ...Array.from({ length: value.length }, (_, index) => String(index)),
    "length",
  ]);
  const actualKeys = Reflect.ownKeys(value);
  if (
    actualKeys.length !== expectedKeys.size
    || actualKeys.some((key) => typeof key !== "string" || !expectedKeys.has(key))
  ) {
    throw new TypeError(`${path} must be a dense array without extra keys.`);
  }
  return Array.from({ length: value.length }, (_, index) => {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (!descriptor?.enumerable || !("value" in descriptor)) {
      throw new TypeError(`${path}[${index}] must be an enumerable data property.`);
    }
    return descriptor.value;
  });
}

function readRenderContext(renderContext) {
  const value = readExactDataRecord(
    renderContext,
    RENDER_CONTEXT_KEYS,
    "renderContext",
  );
  if (typeof value.literalText !== "string") {
    throw new TypeError("renderContext.literalText must be a string.");
  }
  assertNonEmptyString(value.segmentationLocale, "renderContext.segmentationLocale");
  if (!["Intl.Segmenter", "code-point-fallback"].includes(value.segmentationRuntime)) {
    throw new TypeError(
      "renderContext.segmentationRuntime must be Intl.Segmenter or code-point-fallback.",
    );
  }
  assertNonEmptyString(
    value.segmentationRuntimeVersion,
    "renderContext.segmentationRuntimeVersion",
  );
  const graphemes = readDenseArray(value.graphemes, "renderContext.graphemes");
  graphemes.forEach((grapheme, index) => {
    if (typeof grapheme !== "string" || grapheme === "") {
      throw new TypeError(`renderContext.graphemes[${index}] must be a non-empty string.`);
    }
  });
  if (graphemes.join("") !== value.literalText) {
    throw new TypeError("renderContext.graphemes must reconstruct literalText exactly.");
  }
  const glyphSeeds = readDenseArray(value.glyphSeeds, "renderContext.glyphSeeds");
  if (glyphSeeds.length !== graphemes.length) {
    throw new TypeError("renderContext.glyphSeeds must match grapheme count.");
  }
  glyphSeeds.forEach((seed, index) => {
    assertUint32(seed, `renderContext.glyphSeeds[${index}]`);
  });
  assertNonEmptyString(
    value.glyphSeedDerivation,
    "renderContext.glyphSeedDerivation",
  );
  assertUint32(value.surfaceSeed, "renderContext.surfaceSeed");
  assertNonEmptyString(
    value.surfaceSeedDerivation,
    "renderContext.surfaceSeedDerivation",
  );
  assertNonEmptyString(value.nibId, "renderContext.nibId");
  assertFiniteRange(value.flow, "renderContext.flow", 0, 100);
  assertFiniteRange(value.fontSize, "renderContext.fontSize", Number.MIN_VALUE, 10_000);

  const textPosition = readExactDataRecord(
    value.textPosition,
    TEXT_POSITION_KEYS,
    "renderContext.textPosition",
  );
  assertFiniteRange(textPosition.x, "renderContext.textPosition.x", 0, 1);
  assertFiniteRange(textPosition.y, "renderContext.textPosition.y", 0, 1);

  const viewport = readExactDataRecord(
    value.viewport,
    VIEWPORT_KEYS,
    "renderContext.viewport",
  );
  assertPositiveSafeInteger(viewport.width, "renderContext.viewport.width");
  assertPositiveSafeInteger(viewport.height, "renderContext.viewport.height");

  const raster = readExactDataRecord(value.raster, RASTER_KEYS, "renderContext.raster");
  assertFiniteRange(
    raster.devicePixelRatio,
    "renderContext.raster.devicePixelRatio",
    Number.MIN_VALUE,
    16,
  );
  assertFiniteRange(raster.scale, "renderContext.raster.scale", Number.MIN_VALUE, 16);
  assertNonEmptyString(raster.colorSpace, "renderContext.raster.colorSpace");

  const font = readExactDataRecord(value.font, FONT_KEYS, "renderContext.font");
  assertNonEmptyString(font.family, "renderContext.font.family");
  if (!Number.isInteger(font.weight) || font.weight < 1 || font.weight > 1000) {
    throw new TypeError("renderContext.font.weight must be an integer in 1...1000.");
  }
  assertNonEmptyString(font.style, "renderContext.font.style");
  assertNonEmptyString(font.packageName, "renderContext.font.packageName");
  assertNonEmptyString(font.packageVersion, "renderContext.font.packageVersion");
  assertSha256(font.assetSha256, "renderContext.font.assetSha256");
  if (!["loaded", "unverified"].includes(font.loadState)) {
    throw new TypeError("renderContext.font.loadState must be loaded or unverified.");
  }

  const dependencies = readExactDataRecord(
    value.dependencies,
    DEPENDENCY_KEYS,
    "renderContext.dependencies",
  );
  assertNonEmptyString(
    dependencies.lockfileName,
    "renderContext.dependencies.lockfileName",
  );
  assertSha256(
    dependencies.lockfileSha256,
    "renderContext.dependencies.lockfileSha256",
  );
  return {
    ...value,
    graphemes,
    glyphSeeds,
    textPosition,
    viewport,
    raster,
    font,
    dependencies,
  };
}

export function validateRenderContext(renderContext) {
  readRenderContext(renderContext);
  return true;
}

export function freezeRenderContext(renderContext) {
  const value = readRenderContext(renderContext);
  const graphemes = Object.freeze([...value.graphemes]);
  const glyphSeeds = Object.freeze([...value.glyphSeeds]);
  return Object.freeze({
    ...value,
    graphemes,
    glyphSeeds,
    textPosition: Object.freeze({ ...value.textPosition }),
    viewport: Object.freeze({ ...value.viewport }),
    raster: Object.freeze({ ...value.raster }),
    font: Object.freeze({ ...value.font }),
    dependencies: Object.freeze({ ...value.dependencies }),
  });
}
