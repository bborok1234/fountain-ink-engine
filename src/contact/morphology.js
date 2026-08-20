import { getNibGeometry } from "./nib-profiles.js";

/**
 * Run one signed morphology axis pass. This is the exact reference algorithm.
 *
 * @param {Uint8ClampedArray} source
 * @param {number} width
 * @param {number} height
 * @param {number} radius
 * @param {boolean} horizontal
 * @param {"dilate" | "erode"} mode
 */
export function morphologyPass(source, width, height, radius, horizontal, mode) {
  if (radius <= 0) return source;
  const result = new Uint8ClampedArray(source.length);
  const whole = Math.floor(radius);
  const fraction = radius - whole;
  const pick = mode === "dilate" ? Math.max : Math.min;
  const sample = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return 0;
    return source[y * width + x];
  };

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let core = sample(x, y);
      for (let offset = 1; offset <= whole; offset += 1) {
        core = horizontal
          ? pick(core, sample(x - offset, y), sample(x + offset, y))
          : pick(core, sample(x, y - offset), sample(x, y + offset));
      }
      if (fraction <= 0) {
        result[y * width + x] = core;
        continue;
      }
      const outerOffset = whole + 1;
      const outer = horizontal
        ? pick(core, sample(x - outerOffset, y), sample(x + outerOffset, y))
        : pick(core, sample(x, y - outerOffset), sample(x, y + outerOffset));
      result[y * width + x] = Math.round(core + (outer - core) * fraction);
    }
  }
  return result;
}

/**
 * Apply the reference horizontal then vertical morphology to an alpha plane.
 *
 * @param {Uint8ClampedArray} source
 * @param {number} width
 * @param {number} height
 * @param {number} radiusX
 * @param {number} radiusY
 * @param {"dilate" | "erode"} mode
 */
export function morphAlpha(source, width, height, radiusX, radiusY, mode) {
  let alpha = morphologyPass(source, width, height, radiusX, true, mode);
  alpha = morphologyPass(alpha, width, height, radiusY, false, mode);
  return alpha;
}

/** @param {Record<string, number | string>} geometry @param {number} widthScale */
export function scaleNibGeometry(geometry, widthScale) {
  if (geometry.kind === "round") {
    return {
      kind: geometry.kind,
      morphDelta: Number(geometry.morphDelta) * widthScale,
    };
  }
  return {
    kind: geometry.kind,
    horizontalMorphDelta: Number(geometry.horizontalMorphDelta) * widthScale,
    verticalMorphDelta: Number(geometry.verticalMorphDelta) * widthScale,
  };
}

/**
 * Preserve the reference call shape while keeping nib lookup in one module.
 *
 * @param {string} nibId
 * @param {number} fontSize
 * @param {number} widthScale
 */
export function getScaledNibGeometry(nibId, fontSize, widthScale) {
  return scaleNibGeometry(getNibGeometry(nibId, fontSize), widthScale);
}

/** @param {Record<string, number | string>} geometry */
export function geometryExpansion(geometry) {
  if (geometry.kind === "round") {
    const radius = Math.max(0, Number(geometry.morphDelta) / 2);
    return { x: radius + 1, y: radius + 1 };
  }
  return {
    x: Math.max(0, Number(geometry.horizontalMorphDelta) / 2) + 1,
    y: Math.max(0, Number(geometry.verticalMorphDelta) / 2) + 1,
  };
}
