import { createFieldSignature } from "../contracts/index.js";

function readOwnData(record, key, path) {
  if (record === null || typeof record !== "object") {
    throw new TypeError(`${path} must be an object.`);
  }
  const descriptor = Object.getOwnPropertyDescriptor(record, key);
  if (!descriptor?.enumerable || !("value" in descriptor)) {
    throw new TypeError(`${path}.${key} must be an enumerable own data property.`);
  }
  return descriptor.value;
}

function readPlane(plane, path) {
  if (plane === null || typeof plane !== "object") {
    throw new TypeError(`${path} must be an image or scalar plane.`);
  }
  // Canvas ImageData exposes browser-owned read-only accessors, while engine
  // scalar planes expose own data properties. Read each value exactly once and
  // hand a plain structural snapshot to createFieldSignature.
  const width = plane.width;
  const height = plane.height;
  const data = plane.data;
  return { width, height, data };
}

export function createOrdinaryStageSignatures(stages) {
  const contact = readOwnData(stages, "contact", "stages");
  const density = readOwnData(stages, "density", "stages");
  const surface = readOwnData(stages, "surface", "stages");
  const optical = readOwnData(stages, "optical", "stages");
  const rgbaMask = readPlane(
    readOwnData(contact, "rgbaMask", "stages.contact"),
    "stages.contact.rgbaMask",
  );
  const accumulatedVariation = readOwnData(
    density,
    "accumulatedVariation",
    "stages.density",
  );
  const sampleCount = readOwnData(density, "sampleCount", "stages.density");
  const normalizedConcentration = readPlane(
    readOwnData(density, "normalizedConcentration", "stages.density"),
    "stages.density.normalizedConcentration",
  );
  const resolvedCoverage = readPlane(
    readOwnData(surface, "resolvedCoverage", "stages.surface"),
    "stages.surface.resolvedCoverage",
  );
  const compositeRgba = readPlane(
    readOwnData(optical, "compositeRgba", "stages.optical"),
    "stages.optical.compositeRgba",
  );
  const width = normalizedConcentration.width;
  const height = normalizedConcentration.height;
  return Object.freeze({
    contactRgba: createFieldSignature({
      domain: "contact.rgba-mask",
      width: rgbaMask.width,
      height: rgbaMask.height,
      channels: 4,
      data: rgbaMask.data,
    }),
    densityAccumulatedVariation: createFieldSignature({
      domain: "density.accumulated-variation",
      width,
      height,
      channels: 1,
      data: accumulatedVariation,
    }),
    densitySampleCount: createFieldSignature({
      domain: "density.sample-count",
      width,
      height,
      channels: 1,
      data: sampleCount,
    }),
    surfaceResolvedCoverage: createFieldSignature({
      domain: "surface.resolved-coverage",
      width: resolvedCoverage.width,
      height: resolvedCoverage.height,
      channels: 1,
      data: resolvedCoverage.data,
    }),
    densityNormalizedConcentration: createFieldSignature({
      domain: "density.normalized-concentration",
      width,
      height,
      channels: 1,
      data: normalizedConcentration.data,
    }),
    opticalCompositeRgba: createFieldSignature({
      domain: "optical.composite-rgba",
      width: compositeRgba.width,
      height: compositeRgba.height,
      channels: 4,
      data: compositeRgba.data,
    }),
  });
}
