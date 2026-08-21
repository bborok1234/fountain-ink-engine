import { assertSurfaceRecipeCompatible } from "../surface-recipes/index.js";

function ownDataValue(object, key, path) {
  const descriptor = Object.getOwnPropertyDescriptor(object, key);
  if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) {
    throw new TypeError(`${path}.${key} must be an enumerable own data property.`);
  }
  return descriptor.value;
}

function assertDimensions(width, height) {
  if (!Number.isSafeInteger(width) || width <= 0) {
    throw new TypeError("width must be a positive safe integer.");
  }
  if (!Number.isSafeInteger(height) || height <= 0) {
    throw new TypeError("height must be a positive safe integer.");
  }
  const pixels = width * height;
  if (!Number.isSafeInteger(pixels)) {
    throw new TypeError("width * height must be a safe integer.");
  }
  return pixels;
}

function assertRgbaPlane(value, expectedLength, path) {
  const data = value instanceof Uint8ClampedArray
    ? value
    : ownDataValue(value, "data", path);
  if (!(data instanceof Uint8ClampedArray)) {
    throw new TypeError(`${path} must expose Uint8ClampedArray RGBA data.`);
  }
  if (data.length !== expectedLength * 4) {
    throw new TypeError(`${path} RGBA length must match width * height * 4.`);
  }
  return data;
}

function assertAlphaPlane(value, expectedLength, path) {
  if (
    value === null
    || typeof value !== "object"
    || (Object.getPrototypeOf(value) !== Object.prototype
      && Object.getPrototypeOf(value) !== null)
  ) {
    throw new TypeError(`${path} must be a plain object.`);
  }
  const width = ownDataValue(value, "width", path);
  const height = ownDataValue(value, "height", path);
  const data = ownDataValue(value, "data", path);
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height)) {
    throw new TypeError(`${path} dimensions must be safe integers.`);
  }
  if (!(data instanceof Uint8Array) || data.length !== expectedLength) {
    throw new TypeError(`${path}.data must be an exact-length Uint8Array.`);
  }
  return { width, height, data };
}

/**
 * Surface-owned resolution of deposited Contact and the physical coverage
 * candidate. The Float32 result preserves the accepted unquantized equation;
 * Optical consumes it without reconstructing Surface policy.
 */
export function resolveKeyboardSurfaceCoverage(options) {
  if (
    options === null
    || typeof options !== "object"
    || (Object.getPrototypeOf(options) !== Object.prototype
      && Object.getPrototypeOf(options) !== null)
  ) {
    throw new TypeError("options must be a plain object.");
  }
  const width = ownDataValue(options, "width", "options");
  const height = ownDataValue(options, "height", "options");
  const contactMask = ownDataValue(options, "contactMask", "options");
  const surfaceRecipe = ownDataValue(options, "surfaceRecipe", "options");
  const candidateDescriptor = Object.getOwnPropertyDescriptor(
    options,
    "materialCoverageCandidate",
  );
  if (
    candidateDescriptor
    && (!("value" in candidateDescriptor) || !candidateDescriptor.enumerable)
  ) {
    throw new TypeError(
      "options.materialCoverageCandidate must be an enumerable own data property.",
    );
  }
  const materialCoverageCandidate = candidateDescriptor?.value ?? null;
  const fiberDescriptor = Object.getOwnPropertyDescriptor(
    options,
    "fiberEdgeCoverage",
  );
  if (
    fiberDescriptor
    && (!("value" in fiberDescriptor) || !fiberDescriptor.enumerable)
  ) {
    throw new TypeError(
      "options.fiberEdgeCoverage must be an enumerable own data property.",
    );
  }
  const fiberEdgeCoverage = fiberDescriptor?.value ?? null;
  assertSurfaceRecipeCompatible(surfaceRecipe);
  const pixelCount = assertDimensions(width, height);
  const contactData = assertRgbaPlane(contactMask, pixelCount, "contactMask");
  const candidateData = materialCoverageCandidate === null
    ? null
    : assertRgbaPlane(
      materialCoverageCandidate,
      pixelCount,
      "materialCoverageCandidate",
    );
  const fiberPlane = fiberEdgeCoverage === null
    ? null
    : assertAlphaPlane(fiberEdgeCoverage, pixelCount, "fiberEdgeCoverage");
  if (
    fiberPlane !== null
    && (fiberPlane.width !== width || fiberPlane.height !== height)
  ) {
    throw new TypeError("fiberEdgeCoverage dimensions must match width and height.");
  }
  const geometryResponse = surfaceRecipe.surfaceRecipeSchemaVersion === 1
    ? surfaceRecipe.axes.verticalUptake
    : surfaceRecipe.axes.lateralMobility;
  const materialMix = Math.pow(
    geometryResponse,
    surfaceRecipe.keyboard.coverageMixExponent,
  );
  const resolvedCoverage = new Float32Array(pixelCount);

  for (let index = 0; index < pixelCount; index += 1) {
    const alphaOffset = index * 4 + 3;
    const contactAlpha = contactData[alphaOffset] / 255;
    const surfaceAlpha = candidateData?.[alphaOffset] / 255 || 0;
    const mixedCoverage = contactAlpha * (1 - materialMix)
      + surfaceAlpha * materialMix;
    const retainedContact = contactAlpha
      * surfaceRecipe.keyboard.contactRetentionFloor;
    const fibreCoverage = (fiberPlane?.data[index] ?? 0) / 255;
    resolvedCoverage[index] = Math.max(
      mixedCoverage,
      retainedContact,
      fibreCoverage,
    );
  }

  return Object.freeze({
    width,
    height,
    data: resolvedCoverage,
    materialMix,
  });
}
