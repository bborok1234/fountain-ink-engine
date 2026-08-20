import {
  getNibDensityRange,
  getNibProfile,
  shapeNibDensityVariation,
} from "../contact/nib-profiles.js";

export const ORDINARY_INK_RGB = Object.freeze({ red: 29, green: 55, blue: 40 });
export const MINIMUM_INK_ALPHA = 0.68;
export const MAXIMUM_INK_ALPHA = 0.96;

/** @param {string} nibId @param {number} flow percent 0...100 */
export function getEffectiveFlow(nibId, flow) {
  const normalizedFlow = flow / 100;
  return Math.max(
    0,
    Math.min(1, normalizedFlow + getNibProfile(nibId).flowOffset),
  );
}

/**
 * Reference ordinary mean concentration.
 * @param {string} nibId
 * @param {number} flow percent 0...100
 * @param {number} absorption percent 0...100
 */
export function getMeanDensity(nibId, flow, absorption) {
  const effectiveFlow = getEffectiveFlow(nibId, flow);
  const normalizedAbsorption = absorption / 100;
  return Math.max(
    0.08,
    Math.min(0.9, 0.18 + effectiveFlow * 0.7 - normalizedAbsorption * 0.08),
  );
}

/** @param {number} absorption percent 0...100 */
export function getMaterialMix(absorption) {
  return Math.pow(absorption / 100, 0.92);
}

/**
 * One glyph-local sample of the accepted signed sinusoidal density field.
 *
 * @param {number} localX
 * @param {number} localY
 * @param {number} fontSize
 * @param {number} seed
 */
export function sampleGlyphDensityVariation(localX, localY, fontSize, seed) {
  const phaseA = (seed & 0xffff) / 65535 * Math.PI * 2;
  const phaseB = ((seed >>> 8) & 0xffff) / 65535 * Math.PI * 2;
  const phaseC = ((seed >>> 16) & 0xffff) / 65535 * Math.PI * 2;
  const broad = Math.sin(localX / (fontSize * 0.46) + phaseA) * 0.48;
  const diagonal = Math.sin(
    (localX * 0.62 + localY) / (fontSize * 0.34) + phaseB,
  ) * 0.31;
  const fine = Math.cos(localY / (fontSize * 0.22) + phaseC) * 0.21;
  return broad + diagonal + fine;
}

/**
 * Build the exact reference density sum and sample-count planes from plain
 * layout facts supplied by the client.
 *
 * @param {{
 *   pixelWidth:number,
 *   pixelHeight:number,
 *   scale:number,
 *   fontSize:number,
 *   lineLayouts:Array<{
 *     baseline:number,
 *     glyphs:Array<{
 *       character:string,
 *       x:number,
 *       width:number,
 *       sourceIndex:number,
 *       cadence?:{seed?:number}
 *     }>
 *   }>
 * }} options
 */
export function createDensityField({
  pixelWidth,
  pixelHeight,
  scale,
  fontSize,
  lineLayouts,
}) {
  const densityField = new Float32Array(pixelWidth * pixelHeight);
  const densitySamples = new Uint8Array(pixelWidth * pixelHeight);
  lineLayouts.forEach((layout) => {
    layout.glyphs.forEach((glyph) => {
      if (glyph.character.trim() === "") return;
      const seed = glyph.cadence?.seed
        ?? Math.imul(glyph.sourceIndex + 1, 2654435761);
      const phaseA = (seed & 0xffff) / 65535 * Math.PI * 2;
      const phaseB = ((seed >>> 8) & 0xffff) / 65535 * Math.PI * 2;
      const phaseC = ((seed >>> 16) & 0xffff) / 65535 * Math.PI * 2;
      const minimumX = Math.max(0, Math.floor((glyph.x - 5) * scale));
      const maximumX = Math.min(
        pixelWidth - 1,
        Math.ceil((glyph.x + glyph.width + 5) * scale),
      );
      const minimumY = Math.max(
        0,
        Math.floor((layout.baseline - fontSize - 5) * scale),
      );
      const maximumY = Math.min(
        pixelHeight - 1,
        Math.ceil((layout.baseline + fontSize * 0.14 + 5) * scale),
      );
      for (let y = minimumY; y <= maximumY; y += 1) {
        const localY = y / scale - (layout.baseline - fontSize * 0.5);
        for (let x = minimumX; x <= maximumX; x += 1) {
          const localX = x / scale - glyph.x;
          const broad = Math.sin(
            localX / (fontSize * 0.46) + phaseA,
          ) * 0.48;
          const diagonal = Math.sin(
            (localX * 0.62 + localY) / (fontSize * 0.34) + phaseB,
          ) * 0.31;
          const fine = Math.cos(
            localY / (fontSize * 0.22) + phaseC,
          ) * 0.21;
          const fieldIndex = y * pixelWidth + x;
          densityField[fieldIndex] += broad + diagonal + fine;
          densitySamples[fieldIndex] += 1;
        }
      }
    });
  });
  return { densityField, densitySamples };
}

const rgbaData = (value) => value?.data ?? value;

/**
 * Composite the ordinary fixed RGB and calibrated alpha endpoints into a
 * structural ImageData-compatible result.
 *
 * @param {{
 *   pixelWidth:number,
 *   pixelHeight:number,
 *   mask:{data:Uint8ClampedArray}|Uint8ClampedArray,
 *   materialCoverage?:{data:Uint8ClampedArray}|Uint8ClampedArray|null,
 *   densityField:Float32Array,
 *   densitySamples:Uint8Array,
 *   nibId:string,
 *   flow:number,
 *   absorption:number,
 *   output?:{width:number,height:number,data:Uint8ClampedArray}
 * }} options
 */
export function compositeOrdinaryInk({
  pixelWidth,
  pixelHeight,
  mask,
  materialCoverage = null,
  densityField,
  densitySamples,
  nibId,
  flow,
  absorption,
  output,
}) {
  const result = output ?? {
    width: pixelWidth,
    height: pixelHeight,
    data: new Uint8ClampedArray(pixelWidth * pixelHeight * 4),
  };
  const normalizedAbsorption = absorption / 100;
  const materialMix = Math.pow(normalizedAbsorption, 0.92);
  const meanDensity = getMeanDensity(nibId, flow, absorption);
  const densityRange = getNibDensityRange(nibId, normalizedAbsorption);
  const pixels = result.data;
  const maskData = rgbaData(mask);
  const materialData = materialCoverage ? rgbaData(materialCoverage) : null;

  for (let y = 0; y < pixelHeight; y += 1) {
    for (let x = 0; x < pixelWidth; x += 1) {
      const offset = (y * pixelWidth + x) * 4;
      const maskAlpha = maskData[offset + 3] / 255;
      const roughAlpha = materialData?.[offset + 3] / 255 || 0;
      const coverage = maskAlpha * (1 - materialMix) + roughAlpha * materialMix;
      if (coverage <= 0.001) continue;
      const fieldIndex = y * pixelWidth + x;
      const variation = densitySamples[fieldIndex] > 0
        ? densityField[fieldIndex] / densitySamples[fieldIndex]
        : 0;
      const shapedVariation = shapeNibDensityVariation(nibId, variation);
      const concentration = Math.max(
        0,
        Math.min(1, meanDensity + shapedVariation * densityRange),
      );
      const alpha = (MINIMUM_INK_ALPHA
        + (MAXIMUM_INK_ALPHA - MINIMUM_INK_ALPHA) * concentration) * coverage;
      pixels[offset] = ORDINARY_INK_RGB.red;
      pixels[offset + 1] = ORDINARY_INK_RGB.green;
      pixels[offset + 2] = ORDINARY_INK_RGB.blue;
      pixels[offset + 3] = Math.round(alpha * 255);
    }
  }
  return result;
}
