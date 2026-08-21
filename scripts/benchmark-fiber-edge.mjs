import { createPaperFiberEdge } from "../src/surface/fiber-edge.js";
import { PAPER_SURFACE_ABSORBENT_R4 } from "../src/surface-recipes/index.js";

const CSS_WIDTH = 790;
const CSS_HEIGHT = 610;
const SURFACE_SEED = 0x13579bdf;
const SCALES = Object.freeze([1, 2, 3]);
const FONT_SIZES = Object.freeze([18, 28, 52]);

function quantile(values, fraction) {
  const sorted = values.slice().sort((left, right) => left - right);
  return sorted[Math.floor((sorted.length - 1) * fraction)];
}

function makeSyntheticContact(scale, fontSize) {
  const width = CSS_WIDTH * scale;
  const height = CSS_HEIGHT * scale;
  const data = new Uint8ClampedArray(width * height * 4);
  const fill = (minimumX, minimumY, maximumX, maximumY) => {
    for (let y = Math.round(minimumY * scale); y < Math.round(maximumY * scale); y += 1) {
      for (let x = Math.round(minimumX * scale); x < Math.round(maximumX * scale); x += 1) {
        data[(y * width + x) * 4 + 3] = 255;
      }
    }
  };
  const stroke = Math.max(1.5, fontSize * 0.09);
  const glyphWidth = fontSize * 0.58;
  const glyphHeight = fontSize * 1.02;
  const advance = fontSize * 0.72;
  for (let row = 0; row < 2; row += 1) {
    const y = 250 + row * fontSize * 1.4;
    for (let glyph = 0; glyph < 12; glyph += 1) {
      const x = 55 + glyph * advance;
      fill(x, y, x + stroke, y + glyphHeight);
      fill(x, y, x + glyphWidth, y + stroke);
      fill(x, y + glyphHeight * 0.52, x + glyphWidth * 0.88, y + glyphHeight * 0.52 + stroke);
    }
  }
  return { width, height, data };
}

for (const fontSize of FONT_SIZES) {
  for (const scale of SCALES) {
    const contactMask = makeSyntheticContact(scale, fontSize);
    const options = {
      width: contactMask.width,
      height: contactMask.height,
      contactMask: contactMask.data,
      scale,
      surfaceSeed: SURFACE_SEED,
      surfaceRecipe: PAPER_SURFACE_ABSORBENT_R4,
    };
    for (let index = 0; index < 3; index += 1) createPaperFiberEdge(options);
    const samples = [];
    let result;
    for (let index = 0; index < 9; index += 1) {
      const startedAt = performance.now();
      result = createPaperFiberEdge(options);
      samples.push(performance.now() - startedAt);
    }
    let occupiedPixels = 0;
    let alphaSum = 0;
    for (const alpha of result.data) {
      if (alpha === 0) continue;
      occupiedPixels += 1;
      alphaSum += alpha;
    }
    process.stdout.write(`${JSON.stringify({
      fontSize,
      scale,
      pixels: contactMask.width * contactMask.height,
      outputBytes: result.data.byteLength,
      occupiedPixels,
      cssAlphaArea: alphaSum / (255 * scale * scale),
      p50Milliseconds: quantile(samples, 0.5),
      p95Milliseconds: quantile(samples, 0.95),
    })}\n`);
  }
}
