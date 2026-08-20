import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import {
  DEFAULT_SURFACE_SEED,
  WetInkSimulation,
  createKeyboardSurfaceState,
  createMaterialCoverage,
  getDirectDepositLoads,
} from "../src/surface/index.js";
import { ORDINARY_GREEN_RECIPE_R6 } from "../src/recipes/index.js";
import {
  resampleContactDensityToSurfaceGrid,
  sampleSurfaceDensityVariation,
} from "../src/surface/density-transport.js";

const sha256 = (typedArray) => createHash("sha256")
  .update(Buffer.from(
    typedArray.buffer,
    typedArray.byteOffset,
    typedArray.byteLength,
  ))
  .digest("hex");

function makeDeposit(width, height) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 3; y < height - 3; y += 1) {
    for (let x = 4; x < width - 4; x += 1) {
      data[(y * width + x) * 4 + 3] = 210;
    }
  }
  return { width, height, data };
}

function makeLocalityDeposit(includeFarSuffix) {
  const width = 80;
  const height = 36;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 10; y < 18; y += 1) {
    for (let x = 6; x < 14; x += 1) {
      data[(y * width + x) * 4 + 3] = 90;
    }
  }
  if (includeFarSuffix) {
    for (let y = 10; y < 18; y += 1) {
      for (let x = 66; x < 74; x += 1) {
        data[(y * width + x) * 4 + 3] = 255;
      }
    }
  }
  return { width, height, data };
}

function renderRawSurface(deposit, absorption) {
  const simulation = new WetInkSimulation(
    deposit.width,
    deposit.height,
    DEFAULT_SURFACE_SEED,
  );
  simulation.depositMask(deposit, {
    waterLoad: ORDINARY_GREEN_RECIPE_R6.surface.keyboard.waterLoad,
    pigmentLoad: ORDINARY_GREEN_RECIPE_R6.surface.keyboard.pigmentLoad,
    seed: (DEFAULT_SURFACE_SEED ^ 0x85ebca6b) >>> 0,
  });
  const steps = Math.round(
    ORDINARY_GREEN_RECIPE_R6.surface.keyboard.stepBase
      + absorption
        * ORDINARY_GREEN_RECIPE_R6.surface.keyboard.stepAbsorptionGain,
  );
  for (let index = 0; index < steps; index += 1) {
    simulation.step(
      ORDINARY_GREEN_RECIPE_R6.surface.keyboard.stepMilliseconds,
      absorption,
    );
  }
  const image = {
    data: new Uint8ClampedArray(deposit.width * deposit.height * 4),
  };
  simulation.render(image, ORDINARY_GREEN_RECIPE_R6);
  return image.data;
}

function legacyStrongestNormalization(data, normalizationScale) {
  let strongest = 1;
  for (let offset = 3; offset < data.length; offset += 4) {
    strongest = Math.max(strongest, data[offset]);
  }
  const alpha = new Uint8ClampedArray(data.length / 4);
  for (let offset = 3; offset < data.length; offset += 4) {
    alpha[(offset - 3) / 4] = Math.round(
      Math.min(1, data[offset] / (strongest * normalizationScale)) * 255,
    );
  }
  return { alpha, strongest };
}

function alphaCrop(data, width, minimumX, maximumX) {
  const alpha = [];
  for (let offset = 3; offset < data.length; offset += 4) {
    const pixelIndex = (offset - 3) / 4;
    const x = pixelIndex % width;
    if (x >= minimumX && x < maximumX) alpha.push(data[offset]);
  }
  return alpha;
}

function alphaPlaneCrop(alpha, width, minimumX, maximumX) {
  return Array.from(alpha).filter((_, pixelIndex) => {
    const x = pixelIndex % width;
    return x >= minimumX && x < maximumX;
  });
}

function cropScalarPlane(field, width, minimumX, maximumX) {
  return Array.from(field).filter((_, pixelIndex) => {
    const x = pixelIndex % width;
    return x >= minimumX && x < maximumX;
  });
}

test("direct flow loads come from the authored recipe", () => {
  const loads = getDirectDepositLoads(ORDINARY_GREEN_RECIPE_R6, 0.58);
  assert.ok(Math.abs(loads.waterLoad - 0.2242) < 1e-12);
  assert.ok(Math.abs(loads.pigmentLoad - 0.1536) < 1e-12);
  assert.ok(Object.isFrozen(getDirectDepositLoads(ORDINARY_GREEN_RECIPE_R6, 0)));
  assert.throws(() => getDirectDepositLoads(undefined, 0.58), /recipe/);
  for (const flow of [Number.NaN, Number.POSITIVE_INFINITY, -0.01, 1.01]) {
    assert.throws(
      () => getDirectDepositLoads(ORDINARY_GREEN_RECIPE_R6, flow),
      /normalizedFlow must be a finite number in 0\.\.\.1/,
    );
  }
});

test("excessive keyboard Surface work fails before touching a deposit", () => {
  const excessive = JSON.parse(JSON.stringify(ORDINARY_GREEN_RECIPE_R6));
  excessive.id = "custom-excessive-steps";
  excessive.surface.keyboard.stepBase = 64;
  excessive.surface.keyboard.stepAbsorptionGain = 1;
  const untouchedDeposit = {
    get width() {
      throw new Error("deposit must not be read");
    },
  };
  assert.throws(
    () => createMaterialCoverage(untouchedDeposit, 1, 7, excessive),
    /step budget/,
  );
});

test("invalid normalized absorption fails before touching a deposit", () => {
  const untouchedDeposit = {
    get width() {
      throw new Error("deposit must not be read");
    },
  };
  for (const absorption of [Number.NaN, Number.POSITIVE_INFINITY, -0.01, 1.01]) {
    assert.throws(
      () => createMaterialCoverage(
        untouchedDeposit,
        absorption,
        7,
        ORDINARY_GREEN_RECIPE_R6,
      ),
      /absorption must be a finite number in 0\.\.\.1/,
    );
  }
});

test("invalid fixed normalization references fail before touching a deposit", () => {
  const untouchedDeposit = {
    get width() {
      throw new Error("deposit must not be read");
    },
  };
  for (const value of [0, Number.NaN, 256]) {
    const invalid = JSON.parse(JSON.stringify(ORDINARY_GREEN_RECIPE_R6));
    invalid.id = "custom-invalid-reference";
    invalid.surface.keyboard.normalizationReferenceAlpha = value;
    assert.throws(
      () => createMaterialCoverage(
        untouchedDeposit,
        0.42,
        DEFAULT_SURFACE_SEED,
        invalid,
      ),
      /normalizationReferenceAlpha/,
    );
  }

  const accessor = JSON.parse(JSON.stringify(ORDINARY_GREEN_RECIPE_R6));
  accessor.id = "custom-accessor-reference";
  Object.defineProperty(
    accessor.surface.keyboard,
    "normalizationReferenceAlpha",
    { enumerable: true, get: () => 107 },
  );
  assert.throws(
    () => createMaterialCoverage(
      untouchedDeposit,
      0.42,
      DEFAULT_SURFACE_SEED,
      accessor,
    ),
    /normalizationReferenceAlpha must be an enumerable own data property/,
  );
});

test("WetInkSimulation repeats typed-array state for the same input", () => {
  const run = () => {
    const simulation = new WetInkSimulation(24, 18, 0x10203040);
    simulation.depositMask(makeDeposit(24, 18), {
      waterLoad: 0.377,
      pigmentLoad: 0.291,
      seed: 0x55667788,
    });
    for (let index = 0; index < 9; index += 1) simulation.step(16.667, 0.42);
    const image = { data: new Uint8ClampedArray(24 * 18 * 4) };
    simulation.render(image, ORDINARY_GREEN_RECIPE_R6);
    return {
      water: simulation.water,
      mobile: simulation.mobile,
      fixed: simulation.fixed,
      image: image.data,
      mobileSignedMass: simulation.mobileSignedMass,
      fixedSignedMass: simulation.fixedSignedMass,
      nextMobileSignedMass: simulation.nextMobileSignedMass,
    };
  };
  const first = run();
  const second = run();
  assert.deepEqual(first.water, second.water);
  assert.deepEqual(first.mobile, second.mobile);
  assert.deepEqual(first.fixed, second.fixed);
  assert.deepEqual(first.image, second.image);
  assert.ok(first.fixed.some((value) => value > 0));
  assert.equal(first.mobileSignedMass, null);
  assert.equal(first.fixedSignedMass, null);
  assert.equal(first.nextMobileSignedMass, null);
  assert.equal(
    sha256(first.image),
    "ffb679936a6bc7efb30ea6df56536219cfd6ac62640c5a12f234b0b026292b72",
  );
  assert.equal(
    sha256(first.water),
    "feaac4eec1eebf4f4d66dcb5befc904a0c614e4a5ccf4c8d318815634afe661b",
  );
  assert.equal(
    sha256(first.mobile),
    "03d0ba7de6e2a2a8713a5856cb7aeddd989bfa8ee9f2ae3f68e36f66c6c15b91",
  );
  assert.equal(
    sha256(first.fixed),
    "971778c77a6b1291a33996c78fb37542318b83b9a51eb6aaaeebee964d614e5c",
  );
});

test("a suspended animation frame keeps the existing capped-step behavior", () => {
  const makeSimulation = () => {
    const simulation = new WetInkSimulation(24, 18, 0x10203040);
    simulation.depositMask(makeDeposit(24, 18), {
      waterLoad: 0.377,
      pigmentLoad: 0.291,
      seed: 0x55667788,
    });
    return simulation;
  };
  const suspended = makeSimulation();
  const capped = makeSimulation();
  suspended.step(60_000, 0.42);
  capped.step(16.667 * 2.5, 0.42);
  assert.deepEqual(suspended.water, capped.water);
  assert.deepEqual(suspended.mobile, capped.mobile);
  assert.deepEqual(suspended.fixed, capped.fixed);
});

test("normalized material coverage is deterministic and structural ImageData", () => {
  const deposit = makeDeposit(24, 18);
  const first = createMaterialCoverage(
    deposit,
    0.42,
    DEFAULT_SURFACE_SEED,
    ORDINARY_GREEN_RECIPE_R6,
  );
  const second = createMaterialCoverage(
    deposit,
    0.42,
    DEFAULT_SURFACE_SEED,
    ORDINARY_GREEN_RECIPE_R6,
  );
  const differentSeed = createMaterialCoverage(
    deposit,
    0.42,
    (DEFAULT_SURFACE_SEED ^ 0x9e3779b9) >>> 0,
    ORDINARY_GREEN_RECIPE_R6,
  );
  assert.deepEqual(first, second);
  assert.notDeepEqual(first.data, differentSeed.data);
  assert.equal(first.width, 24);
  assert.equal(first.height, 18);
  assert.equal(first.data.length, 24 * 18 * 4);
  for (let index = 0; index < first.data.length; index += 4) {
    assert.equal(first.data[index], 255);
    assert.equal(first.data[index + 1], 255);
    assert.equal(first.data[index + 2], 255);
  }
  assert.equal(
    sha256(first.data),
    "2bee8374e17bb59d48e0b34ab2d74637ad83d1594ff0888303f3e67bb42adc41",
  );
});

test("coverage-weighted resampling preserves signed mass mixtures", () => {
  const mask = {
    data: new Uint8ClampedArray([
      0, 0, 0, 255,
      0, 0, 0, 255,
    ]),
  };
  const sampleCount = new Uint16Array([1, 1]);
  const equalMass = resampleContactDensityToSurfaceGrid({
    sourceWidth: 2,
    sourceHeight: 1,
    targetWidth: 1,
    targetHeight: 1,
    mask,
    accumulatedVariation: new Float32Array([1, -1]),
    sampleCount,
  });
  assert.equal(equalMass.signedNumerator[0], 0);
  assert.equal(equalMass.pigmentWeight[0], 1);
  assert.equal(
    sampleSurfaceDensityVariation(equalMass, 0, 0, 1, 1),
    0,
  );

  const convex = resampleContactDensityToSurfaceGrid({
    sourceWidth: 2,
    sourceHeight: 1,
    targetWidth: 1,
    targetHeight: 1,
    mask,
    accumulatedVariation: new Float32Array([0.25, 0.75]),
    sampleCount,
  });
  assert.equal(convex.pigmentWeight[0], 1);
  assert.equal(convex.signedNumerator[0], 0.5);
  assert.equal(sampleSurfaceDensityVariation(convex, 0, 0, 1, 1), 0.5);

  const unequalCoverage = resampleContactDensityToSurfaceGrid({
    sourceWidth: 2,
    sourceHeight: 1,
    targetWidth: 1,
    targetHeight: 1,
    mask: {
      data: new Uint8ClampedArray([
        0, 0, 0, 255,
        0, 0, 0, 51,
      ]),
    },
    accumulatedVariation: new Float32Array([1, -1]),
    sampleCount,
  });
  assert.ok(Math.abs(
    sampleSurfaceDensityVariation(unequalCoverage, 0, 0, 1, 1)
      - (2 / 3)
  ) < 1e-6, "coverage weights must be resampled before division");

  const empty = Object.freeze({
    width: 1,
    height: 1,
    signedNumerator: new Float32Array(1),
    pigmentWeight: new Float32Array(1),
  });
  assert.equal(sampleSurfaceDensityVariation(empty, 0, 0, 1, 1), null);
});

test("keyboard Surface transports either sign within positive pigment mass", () => {
  const width = 24;
  const height = 18;
  const deposit = makeDeposit(width, height);
  const makeTransport = (ratio) => {
    const signedNumerator = new Float32Array(width * height);
    const pigmentWeight = new Float32Array(width * height);
    for (let index = 0; index < width * height; index += 1) {
      const alpha = deposit.data[index * 4 + 3] / 255;
      pigmentWeight[index] = alpha;
      signedNumerator[index] = alpha * ratio;
    }
    return { width, height, signedNumerator, pigmentWeight };
  };
  const positive = createKeyboardSurfaceState(
    deposit,
    0.42,
    DEFAULT_SURFACE_SEED,
    ORDINARY_GREEN_RECIPE_R6,
    makeTransport(0.75),
  );
  const negative = createKeyboardSurfaceState(
    deposit,
    0.42,
    DEFAULT_SURFACE_SEED,
    ORDINARY_GREEN_RECIPE_R6,
    makeTransport(-0.75),
  );
  assert.deepEqual(positive.coverage, negative.coverage);
  const coverageOnly = createMaterialCoverage(
    deposit,
    0.42,
    DEFAULT_SURFACE_SEED,
    ORDINARY_GREEN_RECIPE_R6,
  );
  assert.deepEqual(
    positive.coverage,
    coverageOnly,
    "attaching valid density mass must not change A2 coverage bytes",
  );
  assert.equal(
    sha256(positive.coverage.data),
    "2bee8374e17bb59d48e0b34ab2d74637ad83d1594ff0888303f3e67bb42adc41",
  );
  assert.deepEqual(
    positive.densityTransport.pigmentWeight,
    negative.densityTransport.pigmentWeight,
  );
  assert.ok(positive.densityTransport.signedNumerator.some((value) => value > 0));
  assert.ok(negative.densityTransport.signedNumerator.some((value) => value < 0));
  for (let index = 0; index < width * height; index += 1) {
    const positiveNumerator = positive.densityTransport.signedNumerator[index];
    const negativeNumerator = negative.densityTransport.signedNumerator[index];
    const weight = positive.densityTransport.pigmentWeight[index];
    assert.ok(Number.isFinite(positiveNumerator));
    assert.ok(Number.isFinite(negativeNumerator));
    assert.ok(Number.isFinite(weight) && weight >= 0);
    assert.ok(Math.abs(positiveNumerator) <= weight);
    assert.ok(Math.abs(negativeNumerator) <= weight);
    assert.ok(Math.abs(positiveNumerator + negativeNumerator) < 1e-6);
  }

  const bounded = new WetInkSimulation(width, height, DEFAULT_SURFACE_SEED);
  const boundedPayload = makeTransport(1);
  bounded.depositMask(deposit, {
    waterLoad: ORDINARY_GREEN_RECIPE_R6.surface.keyboard.waterLoad,
    pigmentLoad: ORDINARY_GREEN_RECIPE_R6.surface.keyboard.pigmentLoad,
    seed: 1,
    densityTransport: boundedPayload,
  });
  const assertMassBounds = () => {
    for (let index = 0; index < width * height; index += 1) {
      assert.ok(Math.abs(bounded.mobileSignedMass[index]) <= bounded.mobile[index]);
      assert.ok(Math.abs(bounded.fixedSignedMass[index]) <= bounded.fixed[index]);
    }
  };
  assertMassBounds();
  for (let step = 0; step < 18; step += 1) {
    bounded.step(16.667, 1);
    assertMassBounds();
  }
});

test("keyboard signed planes are lazy, bounded, and capped at three max-grid planes", () => {
  const width = 320;
  const height = 240;
  const deposit = { width, height, data: new Uint8ClampedArray(width * height * 4) };
  const payload = {
    width,
    height,
    signedNumerator: new Float32Array(width * height),
    pigmentWeight: new Float32Array(width * height),
  };
  const simulation = new WetInkSimulation(width, height, DEFAULT_SURFACE_SEED);
  assert.equal(simulation.mobileSignedMass, null);
  assert.equal(simulation.fixedSignedMass, null);
  assert.equal(simulation.nextMobileSignedMass, null);
  simulation.depositMask(deposit, {
    waterLoad: 0.377,
    pigmentLoad: 0.291,
    seed: 1,
    densityTransport: payload,
  });
  assert.equal(
    simulation.mobileSignedMass.byteLength
      + simulation.fixedSignedMass.byteLength
      + simulation.nextMobileSignedMass.byteLength,
    921_600,
  );
  simulation.step(16.667, 1);
  for (let index = 0; index < width * height; index += 1) {
    assert.ok(Math.abs(simulation.mobileSignedMass[index]) <= simulation.mobile[index]);
    assert.ok(Math.abs(simulation.fixedSignedMass[index]) <= simulation.fixed[index]);
  }
});

test("malformed keyboard density transport fails before solver mutation or signed allocation", () => {
  const simulation = new WetInkSimulation(12, 12, DEFAULT_SURFACE_SEED);
  let getterReads = 0;
  const malformed = {
    width: 12,
    height: 12,
    pigmentWeight: new Float32Array(12 * 12),
  };
  Object.defineProperty(malformed, "signedNumerator", {
    enumerable: true,
    get() {
      getterReads += 1;
      return new Float32Array(12 * 12);
    },
  });
  assert.throws(() => simulation.depositMask(makeDeposit(12, 12), {
    waterLoad: 0.377,
    pigmentLoad: 0.291,
    seed: 1,
    densityTransport: malformed,
  }), /signedNumerator must be an enumerable own data property/);
  assert.equal(getterReads, 0);
  assert.equal(simulation.mobileSignedMass, null);
  assert.equal(simulation.fixedSignedMass, null);
  assert.equal(simulation.nextMobileSignedMass, null);
  assert.ok(simulation.water.every((value) => value === 0));
  assert.ok(simulation.mobile.every((value) => value === 0));
  assert.ok(simulation.fixed.every((value) => value === 0));

  const invalidMagnitude = {
    width: 12,
    height: 12,
    signedNumerator: new Float32Array(12 * 12).fill(1),
    pigmentWeight: new Float32Array(12 * 12).fill(0.5),
  };
  let depositReads = 0;
  const untouchedDeposit = {
    get width() {
      depositReads += 1;
      throw new Error("deposit must not be read");
    },
  };
  assert.throws(() => createKeyboardSurfaceState(
    untouchedDeposit,
    0.42,
    DEFAULT_SURFACE_SEED,
    ORDINARY_GREEN_RECIPE_R6,
    invalidMagnitude,
  ), /magnitude must not exceed/);
  assert.equal(depositReads, 0);
});

test("a fixed authored reference removes far-suffix normalization coupling", () => {
  const absorption = 0.42;
  const beforeDeposit = makeLocalityDeposit(false);
  const afterDeposit = makeLocalityDeposit(true);
  const beforeRaw = renderRawSurface(beforeDeposit, absorption);
  const afterRaw = renderRawSurface(afterDeposit, absorption);
  assert.deepEqual(
    alphaCrop(beforeRaw, beforeDeposit.width, 0, 30),
    alphaCrop(afterRaw, afterDeposit.width, 0, 30),
    "the wet solver itself must not carry the far suffix into the prefix crop",
  );

  const beforeLegacy = legacyStrongestNormalization(
    beforeRaw,
    ORDINARY_GREEN_RECIPE_R6.surface.keyboard.normalizationScale,
  );
  const afterLegacy = legacyStrongestNormalization(
    afterRaw,
    ORDINARY_GREEN_RECIPE_R6.surface.keyboard.normalizationScale,
  );
  assert.equal(beforeLegacy.strongest, 45);
  assert.equal(afterLegacy.strongest, 105);
  assert.notDeepEqual(
    alphaPlaneCrop(beforeLegacy.alpha, beforeDeposit.width, 0, 30),
    alphaPlaneCrop(afterLegacy.alpha, afterDeposit.width, 0, 30),
    "the removed page-observed divisor must remain a sensitive regression fixture",
  );

  const before = createMaterialCoverage(
    beforeDeposit,
    absorption,
    DEFAULT_SURFACE_SEED,
    ORDINARY_GREEN_RECIPE_R6,
  );
  const after = createMaterialCoverage(
    afterDeposit,
    absorption,
    DEFAULT_SURFACE_SEED,
    ORDINARY_GREEN_RECIPE_R6,
  );
  assert.deepEqual(
    alphaCrop(before.data, before.width, 0, 30),
    alphaCrop(after.data, after.width, 0, 30),
  );
});

test("a nearby wet suffix may interact locally but not through normalization", () => {
  const width = 80;
  const height = 36;
  const makeNearDeposit = (includeNearSuffix) => {
    const data = new Uint8ClampedArray(width * height * 4);
    for (let y = 10; y < 18; y += 1) {
      for (let x = 20; x < 28; x += 1) {
        data[(y * width + x) * 4 + 3] = 90;
      }
      if (includeNearSuffix) {
        for (let x = 28; x < 36; x += 1) {
          data[(y * width + x) * 4 + 3] = 255;
        }
      }
    }
    return { width, height, data };
  };
  const before = createMaterialCoverage(
    makeNearDeposit(false),
    0.42,
    DEFAULT_SURFACE_SEED,
    ORDINARY_GREEN_RECIPE_R6,
  );
  const after = createMaterialCoverage(
    makeNearDeposit(true),
    0.42,
    DEFAULT_SURFACE_SEED,
    ORDINARY_GREEN_RECIPE_R6,
  );

  assert.deepEqual(
    alphaCrop(before.data, width, 0, 10),
    alphaCrop(after.data, width, 0, 10),
    "a remote dry crop remains exact",
  );
  assert.notDeepEqual(
    alphaCrop(before.data, width, 15, 28),
    alphaCrop(after.data, width, 15, 28),
    "adjacent wet footprints may still interact through the solver",
  );
});

test("nearby wet footprints mix transported density only in their shared halo", () => {
  const width = 80;
  const height = 36;
  const makeFixture = (includeNearSuffix) => {
    const deposit = {
      width,
      height,
      data: new Uint8ClampedArray(width * height * 4),
    };
    const signedNumerator = new Float32Array(width * height);
    const pigmentWeight = new Float32Array(width * height);
    for (let y = 10; y < 18; y += 1) {
      for (let x = 20; x < 28; x += 1) {
        const index = y * width + x;
        const alpha = 90 / 255;
        deposit.data[index * 4 + 3] = 90;
        pigmentWeight[index] = alpha;
        signedNumerator[index] = alpha * 0.8;
      }
      if (includeNearSuffix) {
        for (let x = 28; x < 36; x += 1) {
          const index = y * width + x;
          deposit.data[index * 4 + 3] = 255;
          pigmentWeight[index] = 1;
          signedNumerator[index] = -0.8;
        }
      }
    }
    return {
      deposit,
      densityTransport: { width, height, signedNumerator, pigmentWeight },
    };
  };
  const run = (includeNearSuffix) => {
    const fixture = makeFixture(includeNearSuffix);
    return createKeyboardSurfaceState(
      fixture.deposit,
      0.42,
      DEFAULT_SURFACE_SEED,
      ORDINARY_GREEN_RECIPE_R6,
      fixture.densityTransport,
    );
  };
  const before = run(false);
  const after = run(true);
  for (const plane of ["signedNumerator", "pigmentWeight"]) {
    assert.deepEqual(
      cropScalarPlane(before.densityTransport[plane], width, 0, 10),
      cropScalarPlane(after.densityTransport[plane], width, 0, 10),
      "a remote dry crop must stay exact",
    );
  }
  assert.notDeepEqual(
    cropScalarPlane(before.densityTransport.signedNumerator, width, 15, 28),
    cropScalarPlane(after.densityTransport.signedNumerator, width, 15, 28),
    "opposing adjacent pigment may mix in the physical cross-halo",
  );
});

test("clear removes all deposited physical state", () => {
  const simulation = new WetInkSimulation(12, 12, DEFAULT_SURFACE_SEED);
  simulation.depositDab(6, 6, {
    radius: 3,
    aspect: 0.62,
    pressure: 0.5,
    waterLoad: 0.2,
    pigmentLoad: 0.12,
    strokeSeed: 9,
  });
  simulation.clear();
  assert.ok(simulation.water.every((value) => value === 0));
  assert.ok(simulation.mobile.every((value) => value === 0));
  assert.ok(simulation.fixed.every((value) => value === 0));
  assert.equal(simulation.activity, 0);
});

test("surface calculations reject an implicit seed", () => {
  assert.throws(
    () => new WetInkSimulation(12, 12),
    /explicit unsigned 32-bit integer/,
  );
  assert.throws(
    () => createMaterialCoverage(
      makeDeposit(12, 12),
      0.42,
      undefined,
      ORDINARY_GREEN_RECIPE_R6,
    ),
    /explicit unsigned 32-bit integer/,
  );
  assert.throws(
    () => createMaterialCoverage(
      makeDeposit(12, 12),
      0.42,
      DEFAULT_SURFACE_SEED,
    ),
    /recipe/,
  );

  const missingMaskSeed = new WetInkSimulation(12, 12, 0);
  assert.throws(() => missingMaskSeed.depositMask(makeDeposit(12, 12), {
    waterLoad: 0.2,
    pigmentLoad: 0.12,
  }), /options\.seed must be an explicit unsigned 32-bit integer/);
  assert.ok(missingMaskSeed.water.every((value) => value === 0));
  missingMaskSeed.depositMask(makeDeposit(12, 12), {
    waterLoad: 0.2,
    pigmentLoad: 0.12,
    seed: 0,
  });
  assert.ok(missingMaskSeed.water.some((value) => value > 0));

  const missingStrokeSeed = new WetInkSimulation(12, 12, 0);
  const dab = {
    radius: 3,
    aspect: 0.62,
    pressure: 0.5,
    waterLoad: 0.2,
    pigmentLoad: 0.12,
  };
  assert.throws(
    () => missingStrokeSeed.depositDab(6, 6, dab),
    /options\.strokeSeed must be an explicit unsigned 32-bit integer/,
  );
  assert.ok(missingStrokeSeed.water.every((value) => value === 0));
  missingStrokeSeed.depositDab(6, 6, { ...dab, strokeSeed: 0 });
  assert.ok(missingStrokeSeed.water.some((value) => value > 0));
  assert.throws(
    () => new WetInkSimulation(12, 12, 0x1_0000_0000),
    /unsigned 32-bit integer/,
  );
});
