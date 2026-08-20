import {
  getNibDensityRange,
  getNibProfile,
  shapeNibDensityVariation,
} from "../contact/nib-profiles.js";
import { assertInkRecipeCompatible } from "../recipes/compatibility.js";
import { assertPercent, assertUint32 } from "../contracts/numeric.js";

export const MAX_GLYPH_CONTACTS = 0xffff;
const MINIMUM_NORMAL_NUMBER = 2 ** -1022;

const isPlainRecord = (value) => {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

function readExactDataRecord(value, expectedKeys, path) {
  if (!isPlainRecord(value)) {
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
  const values = {};
  for (const key of expectedKeys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor?.enumerable || !("value" in descriptor)) {
      throw new TypeError(
        `${path}.${key} must be an enumerable own data property.`,
      );
    }
    values[key] = descriptor.value;
  }
  return values;
}

function readPlainArray(value, path) {
  if (
    !Array.isArray(value)
    || Object.getPrototypeOf(value) !== Array.prototype
  ) {
    throw new TypeError(`${path} must be an array with the standard prototype.`);
  }
  const lengthDescriptor = Object.getOwnPropertyDescriptor(value, "length");
  const length = lengthDescriptor?.value;
  if (!Number.isSafeInteger(length) || length < 0) {
    throw new TypeError(`${path}.length must be a non-negative safe integer.`);
  }
  if (length > MAX_GLYPH_CONTACTS) {
    throw new TypeError(
      `${path} must contain at most ${MAX_GLYPH_CONTACTS} contacts.`,
    );
  }
  const allowedKeys = new Set([
    "length",
    ...Array.from({ length }, (_, index) => String(index)),
  ]);
  const unexpected = Reflect.ownKeys(value).filter((key) => (
    typeof key !== "string" || !allowedKeys.has(key)
  ));
  if (unexpected.length > 0) {
    throw new TypeError(
      `${path} has unexpected properties: ${unexpected.map(String).join(",")}.`,
    );
  }
  const elements = new Array(length);
  for (let index = 0; index < length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
    if (!descriptor?.enumerable || !("value" in descriptor)) {
      throw new TypeError(
        `${path}[${index}] must be an enumerable own data property.`,
      );
    }
    elements[index] = descriptor.value;
  }
  return elements;
}

function assertPositiveInteger(value, path) {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new TypeError(`${path} must be a positive integer.`);
  }
  return value;
}

function assertFiniteNumber(value, path) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(`${path} must be a finite number.`);
  }
  return value;
}

function assertCalculablePositiveNumber(value, path) {
  if (
    typeof value !== "number"
    || !Number.isFinite(value)
    || value < MINIMUM_NORMAL_NUMBER
  ) {
    throw new TypeError(
      `${path} must be a positive finite number in the calculable normal range.`,
    );
  }
  return value;
}

function assertInteger(value, path) {
  if (!Number.isSafeInteger(value)) {
    throw new TypeError(`${path} must be an integer.`);
  }
  return value;
}

/**
 * Validate the complete glyph-contact list before density planes are allocated.
 * A Contact mask is an immutable structural RGBA snapshot; Density reads only
 * its alpha support and never owns browser Canvas objects.
 */
export function assertDensityFieldInputs(options) {
  const root = readExactDataRecord(options, [
    "pixelWidth",
    "pixelHeight",
    "scale",
    "fontSize",
    "glyphContacts",
  ], "options");
  const {
    pixelWidth,
    pixelHeight,
    scale,
    fontSize,
  } = root;
  assertPositiveInteger(pixelWidth, "pixelWidth");
  assertPositiveInteger(pixelHeight, "pixelHeight");
  if (!Number.isSafeInteger(pixelWidth * pixelHeight)) {
    throw new TypeError("pixelWidth * pixelHeight must be a safe integer.");
  }
  assertCalculablePositiveNumber(scale, "scale");
  assertCalculablePositiveNumber(fontSize, "fontSize");
  const glyphContacts = readPlainArray(root.glyphContacts, "glyphContacts");

  for (
    let contactIndex = 0;
    contactIndex < glyphContacts.length;
    contactIndex += 1
  ) {
    const path = `glyphContacts[${contactIndex}]`;
    const contact = readExactDataRecord(glyphContacts[contactIndex], [
      "rgbaMask",
      "destinationX",
      "destinationY",
      "x",
      "baseline",
      "seed",
    ], path);
    const rgbaMask = readExactDataRecord(contact.rgbaMask, [
      "width",
      "height",
      "data",
    ], `${path}.rgbaMask`);
    const maskWidth = assertPositiveInteger(
      rgbaMask.width,
      `${path}.rgbaMask.width`,
    );
    const maskHeight = assertPositiveInteger(
      rgbaMask.height,
      `${path}.rgbaMask.height`,
    );
    if (!(rgbaMask.data instanceof Uint8ClampedArray)) {
      throw new TypeError(
        `${path}.rgbaMask.data must be a Uint8ClampedArray.`,
      );
    }
    const expectedMaskLength = maskWidth * maskHeight * 4;
    if (!Number.isSafeInteger(expectedMaskLength)) {
      throw new TypeError(
        `${path}.rgbaMask width * height * 4 must be a safe integer.`,
      );
    }
    if (rgbaMask.data.length !== expectedMaskLength) {
      throw new TypeError(
        `${path}.rgbaMask.data length must exactly match width * height * 4.`,
      );
    }
    assertInteger(contact.destinationX, `${path}.destinationX`);
    assertInteger(contact.destinationY, `${path}.destinationY`);
    assertFiniteNumber(contact.x, `${path}.x`);
    assertFiniteNumber(contact.baseline, `${path}.baseline`);
    assertUint32(contact.seed, `${path}.seed`);
    glyphContacts[contactIndex] = Object.freeze({
      rgbaMask: Object.freeze({
        width: maskWidth,
        height: maskHeight,
        data: rgbaMask.data,
      }),
      destinationX: contact.destinationX,
      destinationY: contact.destinationY,
      x: contact.x,
      baseline: contact.baseline,
      seed: contact.seed,
    });
  }

  const validated = Object.freeze({
    pixelWidth,
    pixelHeight,
    scale,
    fontSize,
    glyphContacts: Object.freeze(glyphContacts),
  });
  assertDensityCalculationsFinite(validated);
  return validated;
}

/** @param {string} nibId @param {number} flow percent 0...100 */
export function getEffectiveFlow(nibId, flow) {
  const normalizedFlow = assertPercent(flow, "flow") / 100;
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
export function getMeanDensity(nibId, flow, absorption, recipe) {
  assertInkRecipeCompatible(recipe);
  const effectiveFlow = getEffectiveFlow(nibId, flow);
  const normalizedAbsorption = assertPercent(absorption, "absorption") / 100;
  return Math.max(
    recipe.density.meanMinimum,
    Math.min(
      recipe.density.meanMaximum,
      recipe.density.meanBase
        + effectiveFlow * recipe.density.flowGain
        - normalizedAbsorption * recipe.density.absorptionLoss,
    ),
  );
}

/** @param {number} absorption percent 0...100 */
export function getMaterialMix(absorption, recipe) {
  assertInkRecipeCompatible(recipe);
  return Math.pow(
    assertPercent(absorption, "absorption") / 100,
    recipe.surface.keyboard.coverageMixExponent,
  );
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
  assertFiniteNumber(localX, "localX");
  assertFiniteNumber(localY, "localY");
  assertCalculablePositiveNumber(fontSize, "fontSize");
  assertUint32(seed, "seed");
  const phaseA = (seed & 0xffff) / 65535 * Math.PI * 2;
  const phaseB = ((seed >>> 8) & 0xffff) / 65535 * Math.PI * 2;
  const phaseC = ((seed >>> 16) & 0xffff) / 65535 * Math.PI * 2;
  const sample = sampleGlyphDensityVariationWithPhases(
    localX,
    localY,
    fontSize,
    phaseA,
    phaseB,
    phaseC,
  );
  if (!Number.isFinite(sample)) {
    throw new TypeError(
      "density sample inputs must produce a finite result.",
    );
  }
  return sample;
}

function sampleGlyphDensityVariationWithPhases(
  localX,
  localY,
  fontSize,
  phaseA,
  phaseB,
  phaseC,
) {
  const broad = Math.sin(localX / (fontSize * 0.46) + phaseA) * 0.48;
  const diagonal = Math.sin(
    (localX * 0.62 + localY) / (fontSize * 0.34) + phaseB,
  ) * 0.31;
  const fine = Math.cos(localY / (fontSize * 0.22) + phaseC) * 0.21;
  return broad + diagonal + fine;
}

function assertDensityCalculationsFinite({
  pixelWidth,
  pixelHeight,
  scale,
  fontSize,
  glyphContacts,
}) {
  const broadScale = fontSize * 0.46;
  const diagonalScale = fontSize * 0.34;
  const fineScale = fontSize * 0.22;
  if (
    !Number.isFinite(broadScale)
    || broadScale <= 0
    || !Number.isFinite(diagonalScale)
    || diagonalScale <= 0
    || !Number.isFinite(fineScale)
    || fineScale <= 0
  ) {
    throw new TypeError("fontSize must keep every density scale finite.");
  }

  for (
    let contactIndex = 0;
    contactIndex < glyphContacts.length;
    contactIndex += 1
  ) {
    const contact = glyphContacts[contactIndex];
    const { rgbaMask } = contact;
    const phaseA = (contact.seed & 0xffff) / 65535 * Math.PI * 2;
    const phaseB = ((contact.seed >>> 8) & 0xffff) / 65535 * Math.PI * 2;
    const phaseC = ((contact.seed >>> 16) & 0xffff) / 65535 * Math.PI * 2;
    const contactMaximumX = contact.destinationX + rgbaMask.width - 1;
    const contactMaximumY = contact.destinationY + rgbaMask.height - 1;
    if (
      !Number.isSafeInteger(contactMaximumX)
      || !Number.isSafeInteger(contactMaximumY)
    ) {
      throw new TypeError(
        `glyphContacts[${contactIndex}] placement must remain a safe integer across its mask.`,
      );
    }
    const visibleMinimumX = Math.max(0, contact.destinationX);
    const visibleMaximumX = Math.min(pixelWidth - 1, contactMaximumX);
    const visibleMinimumY = Math.max(0, contact.destinationY);
    const visibleMaximumY = Math.min(pixelHeight - 1, contactMaximumY);
    if (
      visibleMinimumX > visibleMaximumX
      || visibleMinimumY > visibleMaximumY
    ) {
      continue;
    }

    const localXs = [visibleMinimumX, visibleMaximumX].map((pageX) => (
      pageX / scale - contact.x
    ));
    const localYs = [visibleMinimumY, visibleMaximumY].map((pageY) => (
      pageY / scale - (contact.baseline - fontSize * 0.5)
    ));
    const densityArguments = [
      ...localXs,
      ...localYs,
      ...localXs.map((localX) => localX / broadScale + phaseA),
      ...localYs.map((localY) => localY / fineScale + phaseC),
    ];
    for (const localX of localXs) {
      for (const localY of localYs) {
        const diagonalPosition = localX * 0.62 + localY;
        densityArguments.push(
          diagonalPosition,
          diagonalPosition / diagonalScale + phaseB,
        );
      }
    }
    if (!densityArguments.every(Number.isFinite)) {
      throw new TypeError(
        `glyphContacts[${contactIndex}] must produce finite density coordinates.`,
      );
    }
  }
}

/**
 * Build the reference density sum and sample-count planes strictly on final
 * glyph Contact support supplied by the client. Page placement is expressed in
 * integer device pixels; x/baseline remain CSS-pixel phase anchors so the
 * accepted single-glyph density values are preserved exactly.
 *
 * @param {{
 *   pixelWidth:number,
 *   pixelHeight:number,
 *   scale:number,
 *   fontSize:number,
 *   glyphContacts:Array<{
 *     rgbaMask:{width:number,height:number,data:Uint8ClampedArray},
 *     destinationX:number,
 *     destinationY:number,
 *     x:number,
 *     baseline:number,
 *     seed:number
 *   }>
 * }} options
 */
export function createDensityField(options) {
  const {
    pixelWidth,
    pixelHeight,
    scale,
    fontSize,
    glyphContacts,
  } = assertDensityFieldInputs(options);
  const densityField = new Float32Array(pixelWidth * pixelHeight);
  const densitySamples = new Uint16Array(pixelWidth * pixelHeight);
  glyphContacts.forEach((contact) => {
    const { rgbaMask } = contact;
    const phaseA = (contact.seed & 0xffff) / 65535 * Math.PI * 2;
    const phaseB = ((contact.seed >>> 8) & 0xffff) / 65535 * Math.PI * 2;
    const phaseC = ((contact.seed >>> 16) & 0xffff) / 65535 * Math.PI * 2;
    for (let maskY = 0; maskY < rgbaMask.height; maskY += 1) {
      const pageY = contact.destinationY + maskY;
      if (pageY < 0 || pageY >= pixelHeight) continue;
      const localY = pageY / scale - (contact.baseline - fontSize * 0.5);
      for (let maskX = 0; maskX < rgbaMask.width; maskX += 1) {
        const maskOffset = (maskY * rgbaMask.width + maskX) * 4;
        if (rgbaMask.data[maskOffset + 3] === 0) continue;
        const pageX = contact.destinationX + maskX;
        if (pageX < 0 || pageX >= pixelWidth) continue;
        const localX = pageX / scale - contact.x;
        const fieldIndex = pageY * pixelWidth + pageX;
        densityField[fieldIndex] += sampleGlyphDensityVariationWithPhases(
          localX,
          localY,
          fontSize,
          phaseA,
          phaseB,
          phaseC,
        );
        densitySamples[fieldIndex] += 1;
      }
    }
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
 *   densitySamples:Uint16Array,
 *   nibId:string,
 *   flow:number,
 *   absorption:number,
 *   recipe:Record<string, unknown>,
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
  recipe,
  output,
}) {
  assertInkRecipeCompatible(recipe);
  assertPercent(flow, "flow");
  assertPercent(absorption, "absorption");
  const result = output ?? {
    width: pixelWidth,
    height: pixelHeight,
    data: new Uint8ClampedArray(pixelWidth * pixelHeight * 4),
  };
  const normalizedAbsorption = absorption / 100;
  const materialMix = getMaterialMix(absorption, recipe);
  const meanDensity = getMeanDensity(nibId, flow, absorption, recipe);
  const densityRange = getNibDensityRange(
    nibId,
    normalizedAbsorption,
    recipe,
  );
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
      const alpha = (recipe.optical.minimumAlpha
        + (recipe.optical.maximumAlpha - recipe.optical.minimumAlpha)
          * concentration) * coverage;
      pixels[offset] = recipe.optical.rgb.red;
      pixels[offset + 1] = recipe.optical.rgb.green;
      pixels[offset + 2] = recipe.optical.rgb.blue;
      pixels[offset + 3] = Math.round(alpha * 255);
    }
  }
  return result;
}
