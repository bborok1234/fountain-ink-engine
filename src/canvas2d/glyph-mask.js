import { morphAlpha } from "../contact/morphology.js";

/** @param {number} width @param {number} height */
export function makeLayer(width, height) {
  if (typeof document === "undefined") {
    throw new Error("Canvas2D adapter requires a browser document.");
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

/**
 * Apply engine morphology to a Canvas alpha channel in-place.
 *
 * @param {HTMLCanvasElement | OffscreenCanvas} canvas
 * @param {number} radiusX
 * @param {number} radiusY
 * @param {"dilate" | "erode"} mode
 */
export function morphGlyphAlpha(canvas, radiusX, radiusY, mode) {
  const context = canvas.getContext("2d");
  const image = context.getImageData(0, 0, canvas.width, canvas.height);
  const source = new Uint8ClampedArray(canvas.width * canvas.height);
  for (let index = 0; index < source.length; index += 1) {
    source[index] = image.data[index * 4 + 3];
  }
  const alpha = morphAlpha(
    source,
    canvas.width,
    canvas.height,
    radiusX,
    radiusY,
    mode,
  );
  for (let index = 0; index < alpha.length; index += 1) {
    const offset = index * 4;
    image.data[offset] = 255;
    image.data[offset + 1] = 255;
    image.data[offset + 2] = 255;
    image.data[offset + 3] = alpha[index];
  }
  context.putImageData(image, 0, 0);
}

/**
 * Create the accepted Canvas2D glyph contact mask. Font selection and metrics
 * are explicit client inputs; the engine does not bundle a font.
 */
export function makeGlyphMask({
  character,
  metrics,
  font,
  fontSize,
  scale,
  geometry,
  createLayer = makeLayer,
}) {
  const maximumDelta = geometry.kind === "round"
    ? Math.abs(geometry.morphDelta)
    : Math.max(
      geometry.horizontalMorphDelta,
      geometry.verticalMorphDelta,
    );
  const padding = 3 + maximumDelta / 2;
  const left = Number.isFinite(metrics.actualBoundingBoxLeft)
    ? metrics.actualBoundingBoxLeft
    : 0;
  const right = Number.isFinite(metrics.actualBoundingBoxRight)
    ? metrics.actualBoundingBoxRight
    : metrics.width;
  const ascent = Number.isFinite(metrics.actualBoundingBoxAscent)
    ? metrics.actualBoundingBoxAscent
    : fontSize;
  const descent = Number.isFinite(metrics.actualBoundingBoxDescent)
    ? metrics.actualBoundingBoxDescent
    : fontSize * 0.2;
  const cssWidth = Math.max(1, left + right + padding * 2);
  const cssHeight = Math.max(1, ascent + descent + padding * 2);
  const canvas = createLayer(
    Math.ceil(cssWidth * scale),
    Math.ceil(cssHeight * scale),
  );
  const context = canvas.getContext("2d");
  context.setTransform(scale, 0, 0, scale, 0, 0);
  context.font = font;
  context.textBaseline = "alphabetic";
  context.textAlign = "left";
  context.lineJoin = "round";
  context.lineCap = "round";
  context.fillStyle = "#fff";
  context.strokeStyle = "#fff";
  const originX = padding + left;
  const baseline = padding + ascent;
  context.fillText(character, originX, baseline);

  if (geometry.kind === "round" && geometry.morphDelta > 0) {
    context.lineWidth = geometry.morphDelta;
    context.strokeText(character, originX, baseline);
  }
  context.setTransform(1, 0, 0, 1, 0, 0);

  if (geometry.kind === "round" && geometry.morphDelta < 0) {
    const erosionRadius = Math.abs(geometry.morphDelta) * scale / 2;
    morphGlyphAlpha(canvas, erosionRadius, erosionRadius, "erode");
  } else if (geometry.kind === "anisotropic") {
    const horizontalRadius = Math.abs(geometry.horizontalMorphDelta) * scale / 2;
    const verticalRadius = Math.abs(geometry.verticalMorphDelta) * scale / 2;
    morphGlyphAlpha(
      canvas,
      horizontalRadius,
      0,
      geometry.horizontalMorphDelta >= 0 ? "dilate" : "erode",
    );
    morphGlyphAlpha(
      canvas,
      0,
      verticalRadius,
      geometry.verticalMorphDelta >= 0 ? "dilate" : "erode",
    );
  }

  return {
    canvas,
    offsetX: -left - padding,
    offsetY: -ascent - padding,
  };
}
