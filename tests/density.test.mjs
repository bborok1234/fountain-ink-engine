import assert from "node:assert/strict";
import test from "node:test";
import {
  createOrdinaryConcentrationField as createOrdinaryConcentrationFieldForSurface,
  createDensityField,
  getEffectiveFlow,
  getMeanDensity as getMeanDensityForSurface,
  sampleGlyphDensityVariation,
} from "../src/density/index.js";
import { compositeOrdinaryInk as compositeOrdinaryInkForSurface } from "../src/optical/index.js";
import { ORDINARY_GREEN_RECIPE_R9 } from "../src/recipes/index.js";
import { resolveKeyboardSurfaceCoverage } from "../src/surface/index.js";
import { legacySurfaceAt } from "./helpers/material-fixtures.mjs";

const getMeanDensity = (nibId, flow, absorption, recipe) =>
  getMeanDensityForSurface(
    nibId,
    flow,
    legacySurfaceAt(absorption / 100),
    recipe,
  );

const createOrdinaryConcentrationField = (options) =>
  createOrdinaryConcentrationFieldForSurface({
    ...options,
    surfaceRecipe: options.surfaceRecipe
      ?? legacySurfaceAt((options.absorption ?? 42) / 100),
  });
const compositeOrdinaryInk = (options) => compositeOrdinaryInkForSurface({
  ...options,
  surfaceRecipe: options.surfaceRecipe
    ?? legacySurfaceAt((options.absorption ?? 42) / 100),
});

function makeRgbaMask(width, height, supportedPixels) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (const [x, y, alpha = 255] of supportedPixels) {
    const offset = (y * width + x) * 4;
    data[offset] = 255;
    data[offset + 1] = 255;
    data[offset + 2] = 255;
    data[offset + 3] = alpha;
  }
  return { width, height, data };
}

function resolveCoverage(mask, materialCoverageCandidate, absorption, width = 1, height = 1) {
  return resolveKeyboardSurfaceCoverage({
    width,
    height,
    contactMask: mask,
    materialCoverageCandidate,
    surfaceRecipe: legacySurfaceAt(absorption / 100),
  });
}

function makeContact({
  supportedPixels = [[0, 0]],
  maskWidth = 1,
  maskHeight = 1,
  destinationX = 0,
  destinationY = 0,
  x = destinationX,
  baseline = destinationY + 10,
  seed = 0x1234abcd,
} = {}) {
  return {
    rgbaMask: makeRgbaMask(maskWidth, maskHeight, supportedPixels),
    destinationX,
    destinationY,
    x,
    baseline,
    seed,
  };
}

function createLegacyDensityField({
  pixelWidth,
  pixelHeight,
  scale,
  fontSize,
  lineLayouts,
}) {
  const densityField = new Float32Array(pixelWidth * pixelHeight);
  const densitySamples = new Uint16Array(pixelWidth * pixelHeight);
  for (const layout of lineLayouts) {
    for (const glyph of layout.glyphs) {
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
          const fieldIndex = y * pixelWidth + x;
          densityField[fieldIndex] += sampleGlyphDensityVariation(
            localX,
            localY,
            fontSize,
            glyph.seed,
          );
          densitySamples[fieldIndex] += 1;
        }
      }
    }
  }
  return { densityField, densitySamples };
}

test("preserves the accepted flow and mean-density equations", () => {
  assert.equal(getEffectiveFlow("M", 58), 0.58);
  assert.equal(getEffectiveFlow("UEF", 0), 0);
  assert.equal(getEffectiveFlow("EB", 100), 1);
  assert.ok(
    Math.abs(getMeanDensity("M", 58, 42, ORDINARY_GREEN_RECIPE_R9) - 0.5524)
      < 1e-12,
  );
  const acceptedMeanAtFlow58Absorption42 = {
    UEF: 0.4753999999999999,
    EF: 0.4893999999999999,
    F: 0.5209,
    M: 0.5524,
    B: 0.6013999999999999,
    EB: 0.6294,
    SU: 0.5839,
  };
  for (const [nibId, expected] of Object.entries(
    acceptedMeanAtFlow58Absorption42,
  )) {
    assert.equal(
      getMeanDensity(nibId, 58, 42, ORDINARY_GREEN_RECIPE_R9),
      expected,
    );
  }
});

test("public flow and Surface inputs fail closed outside their units", () => {
  for (const flow of [Number.NaN, Number.POSITIVE_INFINITY, -1, 101]) {
    assert.throws(() => getEffectiveFlow("M", flow), /flow must be a finite number/);
  }
  for (const absorption of [Number.NaN, Number.NEGATIVE_INFINITY, -1, 101]) {
    assert.throws(
      () => getMeanDensity("M", 58, absorption, ORDINARY_GREEN_RECIPE_R9),
      /normalizedAbsorption must be finite/,
    );
    assert.throws(() => resolveCoverage(
      new Uint8ClampedArray(4),
      null,
      absorption,
    ), /normalizedAbsorption must be finite/);
  }
});

test("density is deterministic and exists only on actual Contact alpha support", () => {
  const contact = makeContact({
    maskWidth: 4,
    maskHeight: 3,
    supportedPixels: [[0, 0, 1], [2, 1, 255], [3, 2, 0]],
    destinationX: 3,
    destinationY: 4,
    x: 5.25,
    baseline: 13.5,
    seed: 0,
  });
  const options = {
    pixelWidth: 12,
    pixelHeight: 10,
    scale: 1,
    fontSize: 12,
    glyphContacts: [contact],
  };
  const originalMask = new Uint8ClampedArray(contact.rgbaMask.data);
  const originalFacts = {
    destinationX: contact.destinationX,
    destinationY: contact.destinationY,
    x: contact.x,
    baseline: contact.baseline,
    seed: contact.seed,
  };

  const first = createDensityField(options);
  const second = createDensityField(options);
  assert.deepEqual(first.densityField, second.densityField);
  assert.deepEqual(first.densitySamples, second.densitySamples);
  assert.ok(first.densitySamples instanceof Uint16Array);
  const sampledIndices = Array.from(first.densitySamples.entries())
    .filter(([, count]) => count > 0)
    .map(([index]) => index);
  assert.deepEqual(sampledIndices, [4 * 12 + 3, 5 * 12 + 5]);
  assert.deepEqual(contact.rgbaMask.data, originalMask);
  assert.deepEqual({
    destinationX: contact.destinationX,
    destinationY: contact.destinationY,
    x: contact.x,
    baseline: contact.baseline,
    seed: contact.seed,
  }, originalFacts);
});

test("fractional phase anchors stay exact across scale and clipped Contact overhang", () => {
  const pixelWidth = 5;
  const pixelHeight = 4;
  const fontSize = 7.75;
  const x = 1.375;
  const baseline = 3.625;
  const seed = 0x89abcdef;
  const contact = makeContact({
    maskWidth: 7,
    maskHeight: 6,
    supportedPixels: [
      [0, 0], // negative x/y overhang: clipped
      [1, 1], // page (0, 0)
      [3, 2], // page (2, 1)
      [5, 4], // page (4, 3)
      [6, 5], // right/bottom overhang: clipped
    ],
    destinationX: -1,
    destinationY: -1,
    x,
    baseline,
    seed,
  });
  const visiblePixels = [[0, 0], [2, 1], [4, 3]];

  for (const scale of [1, 1.25, 1.5, 2]) {
    const result = createDensityField({
      pixelWidth,
      pixelHeight,
      scale,
      fontSize,
      glyphContacts: [contact],
    });
    const sampledIndices = Array.from(result.densitySamples.entries())
      .filter(([, count]) => count > 0)
      .map(([index]) => index);
    assert.deepEqual(
      sampledIndices,
      visiblePixels.map(([pageX, pageY]) => pageY * pixelWidth + pageX),
      `scale ${scale} must sample only visible alpha support`,
    );

    for (const [pageX, pageY] of visiblePixels) {
      const index = pageY * pixelWidth + pageX;
      const expected = sampleGlyphDensityVariation(
        pageX / scale - x,
        pageY / scale - (baseline - fontSize * 0.5),
        fontSize,
        seed,
      );
      assert.equal(
        result.densityField[index],
        Math.fround(expected),
        `scale ${scale} page (${pageX}, ${pageY}) must retain exact local coordinates`,
      );
      assert.equal(result.densitySamples[index], 1);
    }
  }
});

test("single-glyph visible density is exact with the r3 bbox calculation", () => {
  const pixelWidth = 20;
  const pixelHeight = 16;
  const fontSize = 12;
  const contact = makeContact({
    maskWidth: 9,
    maskHeight: 10,
    supportedPixels: [[1, 2], [3, 2, 128], [4, 5], [7, 8]],
    destinationX: 2,
    destinationY: 1,
    x: 4,
    baseline: 11,
    seed: 0x1234abcd,
  });
  const current = createDensityField({
    pixelWidth,
    pixelHeight,
    scale: 1,
    fontSize,
    glyphContacts: [contact],
  });
  const legacy = createLegacyDensityField({
    pixelWidth,
    pixelHeight,
    scale: 1,
    fontSize,
    lineLayouts: [{
      baseline: contact.baseline,
      glyphs: [{ x: contact.x, width: 10, seed: contact.seed }],
    }],
  });

  for (let maskY = 0; maskY < contact.rgbaMask.height; maskY += 1) {
    for (let maskX = 0; maskX < contact.rgbaMask.width; maskX += 1) {
      const alphaOffset = (maskY * contact.rgbaMask.width + maskX) * 4 + 3;
      if (contact.rgbaMask.data[alphaOffset] === 0) continue;
      const pageX = contact.destinationX + maskX;
      const pageY = contact.destinationY + maskY;
      const index = pageY * pixelWidth + pageX;
      assert.equal(current.densityField[index], legacy.densityField[index]);
      assert.equal(current.densitySamples[index], legacy.densitySamples[index]);
    }
  }
});

test("a nonoverlapping appended Contact leaves the existing crop exact", () => {
  const base = makeContact({
    maskWidth: 3,
    maskHeight: 1,
    supportedPixels: [[0, 0], [1, 0], [2, 0]],
    destinationX: 2,
    destinationY: 2,
    x: 2,
    baseline: 9,
    seed: 1,
  });
  const suffix = makeContact({
    maskWidth: 2,
    maskHeight: 1,
    supportedPixels: [[0, 0], [1, 0]],
    destinationX: 7,
    destinationY: 2,
    x: 7,
    baseline: 9,
    seed: 2,
  });
  const options = {
    pixelWidth: 14,
    pixelHeight: 8,
    scale: 1,
    fontSize: 10,
  };
  const before = createDensityField({ ...options, glyphContacts: [base] });
  const after = createDensityField({
    ...options,
    glyphContacts: [base, suffix],
  });

  for (let x = 2; x <= 4; x += 1) {
    const index = 2 * options.pixelWidth + x;
    assert.equal(after.densityField[index], before.densityField[index]);
    assert.equal(after.densitySamples[index], before.densitySamples[index]);
  }

  const legacyBefore = createLegacyDensityField({
    ...options,
    lineLayouts: [{
      baseline: 9,
      glyphs: [{ x: 2, width: 3, seed: 1 }],
    }],
  });
  const legacyAfter = createLegacyDensityField({
    ...options,
    lineLayouts: [{
      baseline: 9,
      glyphs: [
        { x: 2, width: 3, seed: 1 },
        { x: 7, width: 2, seed: 2 },
      ],
    }],
  });
  const oldChangedPixels = [2, 3, 4].filter((x) => {
    const index = 2 * options.pixelWidth + x;
    return legacyAfter.densityField[index] !== legacyBefore.densityField[index];
  });
  assert.deepEqual(oldChangedPixels, [2, 3, 4]);
});

test("overlapping Contacts change an existing glyph only at the intersection", () => {
  const base = makeContact({
    maskWidth: 3,
    supportedPixels: [[0, 0], [1, 0], [2, 0]],
    destinationX: 2,
    destinationY: 2,
    x: 2,
    baseline: 9,
    seed: 3,
  });
  const overlap = makeContact({
    maskWidth: 2,
    supportedPixels: [[0, 0], [1, 0]],
    destinationX: 4,
    destinationY: 2,
    x: 4,
    baseline: 9,
    seed: 4,
  });
  const options = {
    pixelWidth: 10,
    pixelHeight: 6,
    scale: 1,
    fontSize: 10,
  };
  const before = createDensityField({ ...options, glyphContacts: [base] });
  const after = createDensityField({
    ...options,
    glyphContacts: [base, overlap],
  });

  for (const x of [2, 3]) {
    const index = 2 * options.pixelWidth + x;
    assert.equal(after.densityField[index], before.densityField[index]);
    assert.equal(after.densitySamples[index], 1);
  }
  const intersection = 2 * options.pixelWidth + 4;
  assert.notEqual(after.densityField[intersection], before.densityField[intersection]);
  assert.equal(after.densitySamples[intersection], 2);
});

test("glyph Contact inputs fail closed on malformed type, dimensions, placement, or seed", () => {
  const options = {
    pixelWidth: 8,
    pixelHeight: 8,
    scale: 1,
    fontSize: 10,
    glyphContacts: [makeContact()],
  };
  assert.throws(
    () => createDensityField({ ...options, glyphContacts: null }),
    /glyphContacts must be an array/,
  );
  assert.throws(
    () => createDensityField({ ...options, glyphContacts: new Array(1) }),
    /glyphContacts\[0\] must be an enumerable own data property/,
  );
  assert.throws(
    () => createDensityField({
      ...options,
      glyphContacts: [{
        ...makeContact(),
        rgbaMask: { width: 1, height: 1, data: new Uint8Array(4) },
      }],
    }),
    /Uint8ClampedArray/,
  );
  assert.throws(
    () => createDensityField({
      ...options,
      glyphContacts: [{
        ...makeContact(),
        rgbaMask: { width: 0, height: 1, data: new Uint8ClampedArray(0) },
      }],
    }),
    /rgbaMask\.width must be a positive integer/,
  );
  assert.throws(
    () => createDensityField({
      ...options,
      glyphContacts: [{
        ...makeContact(),
        rgbaMask: { width: 2, height: 1, data: new Uint8ClampedArray(4) },
      }],
    }),
    /length must exactly match/,
  );
  for (const [field, value, message] of [
    ["destinationX", 0.5, /destinationX must be an integer/],
    ["destinationY", Number.NaN, /destinationY must be an integer/],
    ["x", Number.POSITIVE_INFINITY, /\.x must be a finite number/],
    ["baseline", Number.NaN, /baseline must be a finite number/],
    ["seed", undefined, /seed must be an explicit unsigned 32-bit integer/],
    ["seed", 0x1_0000_0000, /seed must be an explicit unsigned 32-bit integer/],
  ]) {
    assert.throws(
      () => createDensityField({
        ...options,
        glyphContacts: [{ ...makeContact(), [field]: value }],
      }),
      message,
    );
  }
  assert.throws(
    () => createDensityField({
      ...options,
      glyphContacts: new Array(0x1_0000),
    }),
    /at most 65535 contacts/,
  );
});

test("subnormal scale and font size fail before density calculation", () => {
  const options = {
    pixelWidth: 2,
    pixelHeight: 2,
    scale: 1,
    fontSize: 10,
    glyphContacts: [makeContact()],
  };
  assert.throws(
    () => createDensityField({ ...options, scale: Number.MIN_VALUE }),
    /scale must be a positive finite number in the calculable normal range/,
  );
  assert.throws(
    () => createDensityField({ ...options, fontSize: Number.MIN_VALUE }),
    /fontSize must be a positive finite number in the calculable normal range/,
  );
  assert.throws(
    () => sampleGlyphDensityVariation(1, 1, Number.MIN_VALUE, 1),
    /fontSize must be a positive finite number in the calculable normal range/,
  );
});

test("root, Contact, and mask accessors are rejected without getter reads", () => {
  const base = {
    pixelWidth: 2,
    pixelHeight: 2,
    scale: 1,
    fontSize: 10,
    glyphContacts: [makeContact()],
  };

  let rootReads = 0;
  const rootAccessor = { ...base };
  Object.defineProperty(rootAccessor, "scale", {
    enumerable: true,
    get() {
      rootReads += 1;
      return rootReads === 1 ? 1 : Number.POSITIVE_INFINITY;
    },
  });
  assert.throws(
    () => createDensityField(rootAccessor),
    /options\.scale must be an enumerable own data property/,
  );
  assert.equal(rootReads, 0);

  let contactReads = 0;
  const contactAccessor = makeContact();
  Object.defineProperty(contactAccessor, "x", {
    enumerable: true,
    get() {
      contactReads += 1;
      return contactReads === 1 ? 0 : Number.POSITIVE_INFINITY;
    },
  });
  assert.throws(
    () => createDensityField({ ...base, glyphContacts: [contactAccessor] }),
    /glyphContacts\[0\]\.x must be an enumerable own data property/,
  );
  assert.equal(contactReads, 0);

  let maskReads = 0;
  const maskAccessor = { ...makeContact().rgbaMask };
  Object.defineProperty(maskAccessor, "width", {
    enumerable: true,
    get() {
      maskReads += 1;
      return maskReads === 1 ? 1 : Number.POSITIVE_INFINITY;
    },
  });
  assert.throws(
    () => createDensityField({
      ...base,
      glyphContacts: [{ ...makeContact(), rgbaMask: maskAccessor }],
    }),
    /glyphContacts\[0\]\.rgbaMask\.width must be an enumerable own data property/,
  );
  assert.equal(maskReads, 0);
});

test("prototype-inherited root, Contact, and mask fields fail closed", () => {
  const base = {
    pixelWidth: 2,
    pixelHeight: 2,
    scale: 1,
    fontSize: 10,
    glyphContacts: [makeContact()],
  };
  const inheritedRoot = Object.assign(
    Object.create({ scale: 1 }),
    {
      pixelWidth: 2,
      pixelHeight: 2,
      fontSize: 10,
      glyphContacts: [makeContact()],
    },
  );
  assert.throws(
    () => createDensityField(inheritedRoot),
    /options must be an object with a plain prototype/,
  );

  const inheritedContact = Object.assign(
    Object.create({ x: 0 }),
    {
      rgbaMask: makeContact().rgbaMask,
      destinationX: 0,
      destinationY: 0,
      baseline: 10,
      seed: 1,
    },
  );
  assert.throws(
    () => createDensityField({
      ...base,
      glyphContacts: [inheritedContact],
    }),
    /glyphContacts\[0\] must be an object with a plain prototype/,
  );

  const inheritedMask = Object.assign(
    Object.create({ width: 1 }),
    {
      height: 1,
      data: new Uint8ClampedArray(4),
    },
  );
  assert.throws(
    () => createDensityField({
      ...base,
      glyphContacts: [{ ...makeContact(), rgbaMask: inheritedMask }],
    }),
    /glyphContacts\[0\]\.rgbaMask must be an object with a plain prototype/,
  );
});

test("the declared contact limit reaches Uint16 maximum without count wrap", () => {
  const sharedContact = makeContact({ seed: 5 });
  const result = createDensityField({
    pixelWidth: 1,
    pixelHeight: 1,
    scale: 1,
    fontSize: 10,
    glyphContacts: new Array(0xffff).fill(sharedContact),
  });
  assert.equal(result.densitySamples[0], 0xffff);
});

test("ordinary composite stays inside calibrated direct-stroke endpoints", () => {
  const mask = new Uint8ClampedArray([255, 255, 255, 255]);
  const result = compositeOrdinaryInk({
    pixelWidth: 1,
    pixelHeight: 1,
    mask,
    resolvedCoverage: resolveCoverage(mask, mask, 42),
    densityField: new Float32Array([0]),
    densitySamples: new Uint16Array([1]),
    nibId: "M",
    flow: 58,
    absorption: 42,
    recipe: ORDINARY_GREEN_RECIPE_R9,
  });
  assert.deepEqual(Array.from(result.data), [29, 55, 40, 213]);
});

test("Density exposes normalized concentration without optical color or alpha", () => {
  const resolvedCoverage = {
    width: 2,
    height: 1,
    data: new Float32Array([1, 0]),
  };
  const result = createOrdinaryConcentrationField({
    pixelWidth: 2,
    pixelHeight: 1,
    resolvedCoverage,
    densityField: new Float32Array([0.5, 0]),
    densitySamples: new Uint16Array([1, 0]),
    nibId: "M",
    flow: 58,
    absorption: 42,
    recipe: ORDINARY_GREEN_RECIPE_R9,
  });
  assert.ok(result.data instanceof Float32Array);
  assert.ok(result.data[0] > 0 && result.data[0] <= 1);
  assert.equal(result.data[1], 0);
  assert.equal(result.width, 2);
  assert.equal(result.height, 1);
});

test("high absorption retains a legible Contact core without changing the default mix", () => {
  const mask = new Uint8ClampedArray([255, 255, 255, 255]);
  const emptySurface = new Uint8ClampedArray(4);
  const common = {
    pixelWidth: 1,
    pixelHeight: 1,
    mask,
    densityField: new Float32Array([0]),
    densitySamples: new Uint16Array([1]),
    nibId: "M",
    flow: 58,
    recipe: ORDINARY_GREEN_RECIPE_R9,
  };
  const maximumAbsorption = compositeOrdinaryInk({
    ...common,
    absorption: 100,
    resolvedCoverage: resolveCoverage(mask, emptySurface, 100),
  });
  const preCoverageAlpha = ORDINARY_GREEN_RECIPE_R9.optical.minimumAlpha
    + (ORDINARY_GREEN_RECIPE_R9.optical.maximumAlpha
      - ORDINARY_GREEN_RECIPE_R9.optical.minimumAlpha)
      * getMeanDensity("M", 58, 100, ORDINARY_GREEN_RECIPE_R9);
  assert.equal(
    maximumAbsorption.data[3],
    Math.round(
      preCoverageAlpha
        * legacySurfaceAt(1).keyboard.contactRetentionFloor
        * 255,
    ),
  );
  assert.ok(maximumAbsorption.data[3] > 0);
  const smoothSurface = compositeOrdinaryInk({
    ...common,
    absorption: 0,
    resolvedCoverage: resolveCoverage(mask, emptySurface, 0),
  });
  assert.ok(
    maximumAbsorption.data[3] < smoothSurface.data[3],
    "retained Contact must not make absorbent paper darker than smooth paper",
  );

  const defaultAbsorption = compositeOrdinaryInk({
    ...common,
    absorption: 42,
    resolvedCoverage: resolveCoverage(mask, emptySurface, 42),
  });
  const legacyDefaultCoverage = resolveCoverage(
    mask,
    emptySurface,
    42,
  ).data[0];
  assert.ok(
    legacyDefaultCoverage
      > legacySurfaceAt(0.42).keyboard.contactRetentionFloor,
  );
  const defaultPreCoverageAlpha = ORDINARY_GREEN_RECIPE_R9.optical.minimumAlpha
    + (ORDINARY_GREEN_RECIPE_R9.optical.maximumAlpha
      - ORDINARY_GREEN_RECIPE_R9.optical.minimumAlpha)
      * getMeanDensity("M", 58, 42, ORDINARY_GREEN_RECIPE_R9);
  assert.equal(
    defaultAbsorption.data[3],
    Math.round(defaultPreCoverageAlpha * legacyDefaultCoverage * 255),
  );
});

test("Contact density wins while Surface-only pigment uses transported raw variation", () => {
  const mask = new Uint8ClampedArray([
    255, 255, 255, 255,
    0, 0, 0, 0,
  ]);
  const materialCoverage = new Uint8ClampedArray([
    255, 255, 255, 255,
    255, 255, 255, 255,
  ]);
  const common = {
    pixelWidth: 2,
    pixelHeight: 1,
    mask,
    resolvedCoverage: resolveCoverage(mask, materialCoverage, 100, 2, 1),
    densityField: new Float32Array([1, 0]),
    densitySamples: new Uint16Array([1, 0]),
    nibId: "M",
    flow: 58,
    absorption: 100,
    recipe: ORDINARY_GREEN_RECIPE_R9,
  };
  const meanFallback = compositeOrdinaryInk(common);
  const transported = compositeOrdinaryInk({
    ...common,
    surfaceDensityTransport: {
      width: 2,
      height: 1,
      signedNumerator: new Float32Array([-1, -1]),
      pigmentWeight: new Float32Array([1, 1]),
    },
  });
  const zeroCarrier = compositeOrdinaryInk({
    ...common,
    surfaceDensityTransport: {
      width: 2,
      height: 1,
      signedNumerator: new Float32Array(2),
      pigmentWeight: new Float32Array(2),
    },
  });
  assert.deepEqual(
    transported.data.slice(0, 4),
    meanFallback.data.slice(0, 4),
    "Contact support must ignore an opposing transported value",
  );
  assert.notEqual(
    transported.data[7],
    meanFallback.data[7],
    "Surface-only coverage must use the transported signed ratio",
  );
  assert.deepEqual(zeroCarrier, meanFallback);
});

test("transparent coverage produces no optical ink", () => {
  const result = compositeOrdinaryInk({
    pixelWidth: 1,
    pixelHeight: 1,
    mask: new Uint8ClampedArray(4),
    resolvedCoverage: resolveCoverage(new Uint8ClampedArray(4), null, 0),
    densityField: new Float32Array(1),
    densitySamples: new Uint16Array(1),
    nibId: "M",
    flow: 58,
    absorption: 0,
    recipe: ORDINARY_GREEN_RECIPE_R9,
  });
  assert.deepEqual(Array.from(result.data), [0, 0, 0, 0]);
  assert.throws(() => compositeOrdinaryInk({
    pixelWidth: 1,
    pixelHeight: 1,
    mask: new Uint8ClampedArray(4),
    resolvedCoverage: resolveCoverage(new Uint8ClampedArray(4), null, 0),
    densityField: new Float32Array(1),
    densitySamples: new Uint16Array(1),
    nibId: "M",
    flow: 58,
    absorption: 0,
  }), /recipe/);
  assert.throws(() => compositeOrdinaryInk({
    pixelWidth: 1,
    pixelHeight: 1,
    mask: new Uint8ClampedArray(4),
    resolvedCoverage: { width: 1, height: 1, data: new Float32Array([NaN]) },
    densityField: new Float32Array(1),
    densitySamples: new Uint16Array(1),
    nibId: "M",
    flow: 58,
    absorption: 0,
    recipe: ORDINARY_GREEN_RECIPE_R9,
  }), /resolvedCoverage data must be finite/);
});
