const MINIMUM_CARRIER = Number.EPSILON;

const isPlainRecord = (value) => {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

function readExactRecord(value, keys, path) {
  if (!isPlainRecord(value)) {
    throw new TypeError(`${path} must be an object with a plain prototype.`);
  }
  const expected = new Set(keys);
  const actual = Reflect.ownKeys(value);
  const unexpected = actual.filter((key) => (
    typeof key !== "string" || !expected.has(key)
  ));
  const missing = keys.filter((key) => !Object.hasOwn(value, key));
  if (unexpected.length > 0 || missing.length > 0) {
    throw new TypeError(
      `${path} has invalid keys; unexpected=${unexpected.map(String).join(",") || "none"}; missing=${missing.join(",") || "none"}.`,
    );
  }
  const record = {};
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor?.enumerable || !("value" in descriptor)) {
      throw new TypeError(`${path}.${key} must be an enumerable own data property.`);
    }
    record[key] = descriptor.value;
  }
  return record;
}

function assertPositiveInteger(value, path) {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new TypeError(`${path} must be a positive integer.`);
  }
  return value;
}

function assertGridLength(width, height, path) {
  const length = width * height;
  if (!Number.isSafeInteger(length)) {
    throw new TypeError(`${path} width * height must be a safe integer.`);
  }
  return length;
}

/**
 * Validate a signed numerator and its positive pigment carrier as two distinct
 * Float32 planes. A zero carrier has no ratio; it never invents one.
 */
export function assertSurfaceDensityTransportGrid(value, path = "densityTransport") {
  const grid = readExactRecord(value, [
    "width",
    "height",
    "signedNumerator",
    "pigmentWeight",
  ], path);
  const width = assertPositiveInteger(grid.width, `${path}.width`);
  const height = assertPositiveInteger(grid.height, `${path}.height`);
  const length = assertGridLength(width, height, path);
  if (!(grid.signedNumerator instanceof Float32Array)) {
    throw new TypeError(`${path}.signedNumerator must be a Float32Array.`);
  }
  if (!(grid.pigmentWeight instanceof Float32Array)) {
    throw new TypeError(`${path}.pigmentWeight must be a Float32Array.`);
  }
  if (
    grid.signedNumerator.length !== length
    || grid.pigmentWeight.length !== length
  ) {
    throw new TypeError(`${path} plane lengths must exactly match width * height.`);
  }
  for (let index = 0; index < length; index += 1) {
    const numerator = grid.signedNumerator[index];
    const weight = grid.pigmentWeight[index];
    if (!Number.isFinite(numerator)) {
      throw new TypeError(`${path}.signedNumerator[${index}] must be finite.`);
    }
    if (!Number.isFinite(weight) || weight < 0) {
      throw new TypeError(`${path}.pigmentWeight[${index}] must be finite and non-negative.`);
    }
    if (Math.abs(numerator) > weight) {
      throw new TypeError(
        `${path}.signedNumerator[${index}] magnitude must not exceed its pigmentWeight.`,
      );
    }
  }
  return Object.freeze({
    width,
    height,
    signedNumerator: grid.signedNumerator,
    pigmentWeight: grid.pigmentWeight,
  });
}

/**
 * Area-resample raw, unshaped Contact density into a Surface grid. Numerator
 * and positive mask weight are accumulated separately; resampling a ratio is
 * deliberately forbidden because it would give low-coverage edge pixels the
 * same authority as fully covered pigment.
 */
export function resampleContactDensityToSurfaceGrid({
  sourceWidth,
  sourceHeight,
  targetWidth,
  targetHeight,
  mask,
  accumulatedVariation,
  sampleCount,
}) {
  const width = assertPositiveInteger(sourceWidth, "sourceWidth");
  const height = assertPositiveInteger(sourceHeight, "sourceHeight");
  const gridWidth = assertPositiveInteger(targetWidth, "targetWidth");
  const gridHeight = assertPositiveInteger(targetHeight, "targetHeight");
  const sourceLength = assertGridLength(width, height, "source");
  const targetLength = assertGridLength(gridWidth, gridHeight, "target");
  const maskData = mask?.data ?? mask;
  if (!(maskData instanceof Uint8ClampedArray)) {
    throw new TypeError("mask must expose Uint8ClampedArray data.");
  }
  if (maskData.length !== sourceLength * 4) {
    throw new TypeError("mask data length must exactly match sourceWidth * sourceHeight * 4.");
  }
  if (!(accumulatedVariation instanceof Float32Array)) {
    throw new TypeError("accumulatedVariation must be a Float32Array.");
  }
  if (!(sampleCount instanceof Uint16Array)) {
    throw new TypeError("sampleCount must be a Uint16Array.");
  }
  if (
    accumulatedVariation.length !== sourceLength
    || sampleCount.length !== sourceLength
  ) {
    throw new TypeError("density plane lengths must exactly match the source grid.");
  }

  const signedNumerator = new Float32Array(targetLength);
  const pigmentWeight = new Float32Array(targetLength);
  for (let targetY = 0; targetY < gridHeight; targetY += 1) {
    const sourceTop = targetY * height / gridHeight;
    const sourceBottom = (targetY + 1) * height / gridHeight;
    const minimumSourceY = Math.floor(sourceTop);
    const maximumSourceY = Math.ceil(sourceBottom);
    for (let targetX = 0; targetX < gridWidth; targetX += 1) {
      const sourceLeft = targetX * width / gridWidth;
      const sourceRight = (targetX + 1) * width / gridWidth;
      const minimumSourceX = Math.floor(sourceLeft);
      const maximumSourceX = Math.ceil(sourceRight);
      let numeratorSum = 0;
      let weightSum = 0;
      for (let sourceY = minimumSourceY; sourceY < maximumSourceY; sourceY += 1) {
        if (sourceY < 0 || sourceY >= height) continue;
        const overlapY = Math.min(sourceBottom, sourceY + 1)
          - Math.max(sourceTop, sourceY);
        if (overlapY <= 0) continue;
        for (let sourceX = minimumSourceX; sourceX < maximumSourceX; sourceX += 1) {
          if (sourceX < 0 || sourceX >= width) continue;
          const overlapX = Math.min(sourceRight, sourceX + 1)
            - Math.max(sourceLeft, sourceX);
          if (overlapX <= 0) continue;
          const sourceIndex = sourceY * width + sourceX;
          const alpha = maskData[sourceIndex * 4 + 3] / 255;
          if (alpha <= 0) continue;
          const overlap = overlapX * overlapY;
          const weight = alpha * overlap;
          const samples = sampleCount[sourceIndex];
          const rawVariation = samples > 0
            ? accumulatedVariation[sourceIndex] / samples
            : 0;
          if (!Number.isFinite(rawVariation)) {
            throw new TypeError(`density variation at source pixel ${sourceIndex} must be finite.`);
          }
          weightSum += weight;
          numeratorSum += weight * Math.max(-1, Math.min(1, rawVariation));
        }
      }
      const cellArea = (sourceRight - sourceLeft) * (sourceBottom - sourceTop);
      const targetIndex = targetY * gridWidth + targetX;
      const weight = Math.fround(weightSum / cellArea);
      const numerator = Math.fround(numeratorSum / cellArea);
      pigmentWeight[targetIndex] = weight;
      signedNumerator[targetIndex] = Math.max(-weight, Math.min(weight, numerator));
    }
  }
  return Object.freeze({
    width: gridWidth,
    height: gridHeight,
    signedNumerator,
    pigmentWeight,
  });
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
 * Bilinear-sample numerator and carrier independently at one page pixel.
 * `null` means the Surface has no transported pigment authority there.
 */
export function sampleSurfaceDensityVariation(
  densityTransport,
  pageX,
  pageY,
  pageWidth,
  pageHeight,
) {
  const grid = densityTransport;
  const mappedX = Math.max(
    0,
    Math.min(grid.width - 1, (pageX + 0.5) * grid.width / pageWidth - 0.5),
  );
  const mappedY = Math.max(
    0,
    Math.min(grid.height - 1, (pageY + 0.5) * grid.height / pageHeight - 0.5),
  );
  const numerator = bilinearSample(
    grid.signedNumerator,
    grid.width,
    grid.height,
    mappedX,
    mappedY,
  );
  const weight = bilinearSample(
    grid.pigmentWeight,
    grid.width,
    grid.height,
    mappedX,
    mappedY,
  );
  if (!Number.isFinite(numerator) || !Number.isFinite(weight)) {
    throw new TypeError("sampled Surface density transport must remain finite.");
  }
  if (weight <= MINIMUM_CARRIER) return null;
  return Math.max(-1, Math.min(1, numerator / weight));
}
