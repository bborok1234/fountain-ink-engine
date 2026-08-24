import {
  KEYBOARD_DYE_AREAL_LOAD_CONTRACT_VERSION,
  assertKeyboardDyeArealLoad,
} from "../contracts/keyboard-dye-areal-load.js";
import {
  assertDensityFieldInputs,
  getEffectiveFlow,
} from "../density/ordinary-density.js";

const MAX_KEYBOARD_DYE_AREAL_LOAD_CELLS = 320 * 240;
const MAX_KEYBOARD_DYE_AREAL_LOAD_WORK = 16_000_000;

function readExactDataRecord(value, expectedKeys, path) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${path} must be an object with a plain prototype.`);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError(`${path} must be an object with a plain prototype.`);
  }
  const expected = new Set(expectedKeys);
  const actual = Reflect.ownKeys(value);
  const unexpected = actual.filter((key) => (
    typeof key !== "string" || !expected.has(key)
  ));
  const missing = expectedKeys.filter((key) => !Object.hasOwn(value, key));
  if (unexpected.length > 0 || missing.length > 0) {
    throw new TypeError(
      `${path} has invalid keys; unexpected=${unexpected.map(String).join(",") || "none"}; missing=${missing.join(",") || "none"}.`,
    );
  }
  const result = {};
  for (const key of expectedKeys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor?.enumerable || !("value" in descriptor)) {
      throw new TypeError(`${path}.${key} must be an enumerable own data property.`);
    }
    result[key] = descriptor.value;
  }
  return result;
}

function assertPositiveInteger(value, path) {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new TypeError(`${path} must be a positive safe integer.`);
  }
  return value;
}

export function getKeyboardDyeArealLoadScale(nibId, flow) {
  return Math.fround(
    1 + getEffectiveFlow(nibId, flow) - getEffectiveFlow("M", 58),
  );
}

export function createKeyboardDyeArealLoad(options) {
  const root = readExactDataRecord(options, [
    "pixelWidth",
    "pixelHeight",
    "targetWidth",
    "targetHeight",
    "scale",
    "fontSize",
    "glyphContacts",
    "nibId",
    "flow",
  ], "options");
  const targetWidth = assertPositiveInteger(root.targetWidth, "targetWidth");
  const targetHeight = assertPositiveInteger(root.targetHeight, "targetHeight");
  const targetLength = targetWidth * targetHeight;
  if (!Number.isSafeInteger(targetLength)) {
    throw new TypeError("targetWidth * targetHeight must be a safe integer.");
  }
  if (targetLength > MAX_KEYBOARD_DYE_AREAL_LOAD_CELLS) {
    throw new RangeError(
      `targetWidth * targetHeight must be at most ${MAX_KEYBOARD_DYE_AREAL_LOAD_CELLS} cells.`,
    );
  }
  const validated = assertDensityFieldInputs({
    pixelWidth: root.pixelWidth,
    pixelHeight: root.pixelHeight,
    scale: root.scale,
    fontSize: root.fontSize,
    glyphContacts: root.glyphContacts,
  });
  const work = validated.glyphContacts.length * targetLength;
  if (!Number.isSafeInteger(work) || work > MAX_KEYBOARD_DYE_AREAL_LOAD_WORK) {
    throw new RangeError(
      `glyphContacts.length * target cells must be at most ${MAX_KEYBOARD_DYE_AREAL_LOAD_WORK}.`,
    );
  }
  const loadScale = getKeyboardDyeArealLoadScale(root.nibId, root.flow);
  const accumulated = new Float64Array(targetLength);
  const sourceToTargetX = validated.pixelWidth / targetWidth;
  const sourceToTargetY = validated.pixelHeight / targetHeight;
  const targetCellArea = sourceToTargetX * sourceToTargetY;

  // Each glyph pass is integrated independently in source order. Within a
  // pass the destination grid is visited row-major, making intersections and
  // repeated strokes additive without a nib-name gain or union operation.
  for (const contact of validated.glyphContacts) {
    const { rgbaMask } = contact;
    for (let targetY = 0; targetY < targetHeight; targetY += 1) {
      const sourceTop = targetY * sourceToTargetY;
      const sourceBottom = sourceTop + sourceToTargetY;
      const firstSourceY = Math.max(
        contact.destinationY,
        Math.floor(sourceTop),
      );
      const lastSourceY = Math.min(
        contact.destinationY + rgbaMask.height - 1,
        Math.ceil(sourceBottom) - 1,
      );
      if (firstSourceY > lastSourceY) continue;
      for (let targetX = 0; targetX < targetWidth; targetX += 1) {
        const sourceLeft = targetX * sourceToTargetX;
        const sourceRight = sourceLeft + sourceToTargetX;
        const firstSourceX = Math.max(
          contact.destinationX,
          Math.floor(sourceLeft),
        );
        const lastSourceX = Math.min(
          contact.destinationX + rgbaMask.width - 1,
          Math.ceil(sourceRight) - 1,
        );
        if (firstSourceX > lastSourceX) continue;
        let coveredArea = 0;
        for (let sourceY = firstSourceY; sourceY <= lastSourceY; sourceY += 1) {
          if (sourceY < 0 || sourceY >= validated.pixelHeight) continue;
          const overlapY = Math.min(sourceBottom, sourceY + 1)
            - Math.max(sourceTop, sourceY);
          if (!(overlapY > 0)) continue;
          const maskY = sourceY - contact.destinationY;
          for (let sourceX = firstSourceX; sourceX <= lastSourceX; sourceX += 1) {
            if (sourceX < 0 || sourceX >= validated.pixelWidth) continue;
            const overlapX = Math.min(sourceRight, sourceX + 1)
              - Math.max(sourceLeft, sourceX);
            if (!(overlapX > 0)) continue;
            const maskX = sourceX - contact.destinationX;
            const alpha = rgbaMask.data[
              (maskY * rgbaMask.width + maskX) * 4 + 3
            ] / 255;
            coveredArea += alpha * overlapX * overlapY;
          }
        }
        accumulated[targetY * targetWidth + targetX] +=
          coveredArea / targetCellArea * loadScale;
      }
    }
  }

  const data = new Float32Array(targetLength);
  for (let index = 0; index < targetLength; index += 1) {
    data[index] = Math.fround(accumulated[index]);
  }
  const result = Object.freeze({
    contractVersion: KEYBOARD_DYE_AREAL_LOAD_CONTRACT_VERSION,
    width: targetWidth,
    height: targetHeight,
    data,
  });
  assertKeyboardDyeArealLoad(result);
  return result;
}

export {
  KEYBOARD_DYE_AREAL_LOAD_CONTRACT_VERSION,
  assertKeyboardDyeArealLoad,
};
