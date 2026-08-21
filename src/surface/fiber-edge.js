import { assertFiniteRange, assertUint32 } from "../contracts/numeric.js";
import { coordinateNoiseUnchecked as coordinateNoise } from "../deterministic/random.js";
import { assertSurfaceRecipeCompatible } from "../surface-recipes/index.js";

const BARRIER_ALPHA = 8;
const SOURCE_ALPHA = 64;
const NEIGHBORS_4 = Object.freeze([
  Object.freeze([-1, 0]),
  Object.freeze([1, 0]),
  Object.freeze([0, -1]),
  Object.freeze([0, 1]),
]);
const NEIGHBORS_8 = Object.freeze([
  ...NEIGHBORS_4,
  Object.freeze([-1, -1]),
  Object.freeze([1, -1]),
  Object.freeze([-1, 1]),
  Object.freeze([1, 1]),
]);

function ownDataValue(object, key, path) {
  const descriptor = Object.getOwnPropertyDescriptor(object, key);
  if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) {
    throw new TypeError(`${path}.${key} must be an enumerable own data property.`);
  }
  return descriptor.value;
}

function assertPlainRecord(value, path) {
  if (
    value === null
    || typeof value !== "object"
    || (Object.getPrototypeOf(value) !== Object.prototype
      && Object.getPrototypeOf(value) !== null)
  ) {
    throw new TypeError(`${path} must be a plain object.`);
  }
  return value;
}

function assertDimensions(width, height) {
  if (!Number.isSafeInteger(width) || width <= 0) {
    throw new TypeError("width must be a positive safe integer.");
  }
  if (!Number.isSafeInteger(height) || height <= 0) {
    throw new TypeError("height must be a positive safe integer.");
  }
  const pixelCount = width * height;
  if (!Number.isSafeInteger(pixelCount)) {
    throw new TypeError("width * height must be a safe integer.");
  }
  return pixelCount;
}

function readContactData(contactMask, pixelCount) {
  const data = contactMask instanceof Uint8ClampedArray
    ? contactMask
    : ownDataValue(contactMask, "data", "contactMask");
  if (!(data instanceof Uint8ClampedArray)) {
    throw new TypeError("contactMask must expose Uint8ClampedArray RGBA data.");
  }
  if (data.length !== pixelCount * 4) {
    throw new TypeError("contactMask length must match width * height * 4.");
  }
  return data;
}

function floodExterior(contactData, width, height, bounds) {
  const localWidth = bounds.maximumX - bounds.minimumX + 1;
  const localHeight = bounds.maximumY - bounds.minimumY + 1;
  const localLength = localWidth * localHeight;
  const exterior = new Uint8Array(localLength);
  const queue = new Int32Array(localLength);
  let head = 0;
  let tail = 0;

  const enqueue = (localX, localY) => {
    const localIndex = localY * localWidth + localX;
    if (exterior[localIndex] !== 0) return;
    const pageX = bounds.minimumX + localX;
    const pageY = bounds.minimumY + localY;
    if (contactData[(pageY * width + pageX) * 4 + 3] > BARRIER_ALPHA) return;
    exterior[localIndex] = 1;
    queue[tail] = localIndex;
    tail += 1;
  };

  for (let x = 0; x < localWidth; x += 1) {
    enqueue(x, 0);
    enqueue(x, localHeight - 1);
  }
  for (let y = 1; y < localHeight - 1; y += 1) {
    enqueue(0, y);
    enqueue(localWidth - 1, y);
  }

  while (head < tail) {
    const localIndex = queue[head];
    head += 1;
    const localX = localIndex % localWidth;
    const localY = Math.floor(localIndex / localWidth);
    for (const [dx, dy] of NEIGHBORS_4) {
      const nextX = localX + dx;
      const nextY = localY + dy;
      if (
        nextX < 0
        || nextY < 0
        || nextX >= localWidth
        || nextY >= localHeight
      ) continue;
      enqueue(nextX, nextY);
    }
  }
  return Object.freeze({ exterior, localWidth, localHeight });
}

/**
 * Create a sparse, Contact-connected high-resolution fibre fringe. This is
 * intentionally different from the coarse wet-grid candidate: it never blurs
 * or dilates the whole glyph and never enters enclosed counters.
 */
export function createPaperFiberEdge(options) {
  assertPlainRecord(options, "options");
  const width = ownDataValue(options, "width", "options");
  const height = ownDataValue(options, "height", "options");
  const contactMask = ownDataValue(options, "contactMask", "options");
  const scale = ownDataValue(options, "scale", "options");
  const surfaceSeed = ownDataValue(options, "surfaceSeed", "options");
  const surfaceRecipe = ownDataValue(options, "surfaceRecipe", "options");
  const pixelCount = assertDimensions(width, height);
  const contactData = readContactData(contactMask, pixelCount);
  assertFiniteRange(scale, "scale", 0.25, 8);
  assertUint32(surfaceSeed, "surfaceSeed");
  assertSurfaceRecipeCompatible(surfaceRecipe);

  if (surfaceRecipe.surfaceRecipeSchemaVersion < 3) return null;
  const reachCssPixels = surfaceRecipe.keyboard.fiberEdgeReachCssPixels;
  const occupancy = surfaceRecipe.keyboard.fiberEdgeOccupancy;
  const strength = surfaceRecipe.keyboard.fiberEdgeStrength;
  const reach = Math.max(1, Math.round(reachCssPixels * scale));
  const data = new Uint8Array(pixelCount);

  let minimumX = width;
  let minimumY = height;
  let maximumX = -1;
  let maximumY = -1;
  for (let index = 0; index < pixelCount; index += 1) {
    if (contactData[index * 4 + 3] <= BARRIER_ALPHA) continue;
    const x = index % width;
    const y = Math.floor(index / width);
    minimumX = Math.min(minimumX, x);
    minimumY = Math.min(minimumY, y);
    maximumX = Math.max(maximumX, x);
    maximumY = Math.max(maximumY, y);
  }
  if (maximumX < minimumX || maximumY < minimumY) {
    return Object.freeze({ width, height, data });
  }

  const bounds = Object.freeze({
    minimumX: Math.max(0, minimumX - reach - 1),
    minimumY: Math.max(0, minimumY - reach - 1),
    maximumX: Math.min(width - 1, maximumX + reach + 1),
    maximumY: Math.min(height - 1, maximumY + reach + 1),
  });
  const { exterior, localWidth, localHeight } = floodExterior(
    contactData,
    width,
    height,
    bounds,
  );
  let frontier = new Uint8Array(localWidth * localHeight);

  for (let distance = 1; distance <= reach; distance += 1) {
    const nextFrontier = new Uint8Array(frontier.length);
    const gate = distance === 1
      ? occupancy
      : 0.1 + occupancy * 0.08;
    for (let localY = 1; localY < localHeight - 1; localY += 1) {
      for (let localX = 1; localX < localWidth - 1; localX += 1) {
        const localIndex = localY * localWidth + localX;
        if (exterior[localIndex] === 0 || frontier[localIndex] !== 0) continue;
        const pageX = bounds.minimumX + localX;
        const pageY = bounds.minimumY + localY;
        const pageIndex = pageY * width + pageX;
        if (data[pageIndex] !== 0) continue;

        let sourceAlpha = 0;
        for (const [dx, dy] of NEIGHBORS_8) {
          const neighborLocal = (localY + dy) * localWidth + localX + dx;
          if (distance === 1) {
            const neighborPage = (pageY + dy) * width + pageX + dx;
            sourceAlpha = Math.max(
              sourceAlpha,
              contactData[neighborPage * 4 + 3],
            );
          } else {
            sourceAlpha = Math.max(sourceAlpha, frontier[neighborLocal]);
          }
        }
        if (sourceAlpha < (distance === 1 ? SOURCE_ALPHA : 10)) continue;
        const gateNoise = coordinateNoise(
          pageX,
          pageY,
          (surfaceSeed ^ 0x6c8e9cf5 ^ Math.imul(distance, 0x9e3779b1)) >>> 0,
        );
        if (gateNoise < 1 - gate) continue;
        const texture = 0.74 + coordinateNoise(
          pageX,
          pageY,
          surfaceSeed ^ 0x243f6a88,
        ) * 0.26;
        const alpha = distance === 1
          ? Math.round(sourceAlpha * strength * texture)
          : Math.round(sourceAlpha * 0.78 * texture);
        if (alpha <= 0) continue;
        data[pageIndex] = Math.max(data[pageIndex], alpha);
        nextFrontier[localIndex] = alpha;
      }
    }
    frontier = nextFrontier;
  }

  return Object.freeze({ width, height, data });
}
