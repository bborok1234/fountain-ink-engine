import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import {
  DEFAULT_SURFACE_SEED,
  WetInkSimulation,
  createKeyboardSurfaceState as createKeyboardSurfaceStateForRecipe,
  createMaterialCoverage as createMaterialCoverageForRecipe,
  getDirectDepositLoads,
  getSurfaceDensityRange as getSurfaceDensityRangeForRecipe,
  resolveKeyboardSurfaceCoverage as resolveKeyboardSurfaceCoverageForRecipe,
} from "../src/surface/index.js";
import {
  ORDINARY_BLUE_BLACK_RECIPE_R6,
  ORDINARY_BURGUNDY_RECIPE_R6,
  ORDINARY_GREEN_RECIPE_R12,
  ORDINARY_TEAL_RECIPE_R6,
} from "../src/recipes/index.js";
import {
  resampleContactDensityToSurfaceGrid,
  sampleSurfaceDensityVariation,
} from "../src/surface/density-transport.js";
import { legacySurfaceAt } from "./helpers/material-fixtures.mjs";
import {
  PAPER_SURFACE_ABSORBENT_R1,
  PAPER_SURFACE_ABSORBENT_R2,
  PAPER_SURFACE_ABSORBENT_R3,
  PAPER_SURFACE_ABSORBENT_R4,
  PAPER_SURFACE_BALANCED_R1,
  PAPER_SURFACE_BALANCED_R2,
  PAPER_SURFACE_SMOOTH_R1,
} from "../src/surface-recipes/index.js";

const createKeyboardSurfaceState = (
  deposit,
  absorption,
  surfaceSeed,
  recipe,
  densityTransport = null,
) => createKeyboardSurfaceStateForRecipe(
  deposit,
  legacySurfaceAt(absorption),
  surfaceSeed,
  recipe,
  densityTransport,
);
const createMaterialCoverage = (deposit, absorption, surfaceSeed, recipe) =>
  createMaterialCoverageForRecipe(
    deposit,
    legacySurfaceAt(absorption),
    surfaceSeed,
    recipe,
  );
const resolveKeyboardSurfaceCoverage = (options) =>
  resolveKeyboardSurfaceCoverageForRecipe({
    ...options,
    surfaceRecipe: options.surfaceRecipe
      ?? legacySurfaceAt((options.absorption ?? 42) / 100),
  });
const getSurfaceDensityRange = (absorption) =>
  getSurfaceDensityRangeForRecipe(legacySurfaceAt(absorption));

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

test("Surface owns the accepted Contact/candidate coverage resolution", () => {
  const contactMask = {
    width: 3,
    height: 1,
    data: new Uint8ClampedArray([
      255, 255, 255, 255,
      255, 255, 255, 128,
      0, 0, 0, 0,
    ]),
  };
  const materialCoverageCandidate = {
    width: 3,
    height: 1,
    data: new Uint8ClampedArray([
      255, 255, 255, 0,
      255, 255, 255, 64,
      255, 255, 255, 192,
    ]),
  };
  const result = resolveKeyboardSurfaceCoverage({
    width: 3,
    height: 1,
    contactMask,
    materialCoverageCandidate,
    absorption: 42,
    recipe: ORDINARY_GREEN_RECIPE_R12,
  });
  const surfaceRecipe = legacySurfaceAt(0.42);
  const mix = Math.pow(
    0.42,
    surfaceRecipe.keyboard.coverageMixExponent,
  );
  const expected = [
    Math.max(
      1 - mix,
      surfaceRecipe.keyboard.contactRetentionFloor,
    ),
    Math.max(
      (128 / 255) * (1 - mix) + (64 / 255) * mix,
      (128 / 255)
        * surfaceRecipe.keyboard.contactRetentionFloor,
    ),
    (192 / 255) * mix,
  ];
  assert.ok(result.data instanceof Float32Array);
  assert.deepEqual(Array.from(result.data), expected.map(Math.fround));
  assert.equal(result.materialMix, mix);
  assert.deepEqual(contactMask.data, new Uint8ClampedArray([
    255, 255, 255, 255,
    255, 255, 255, 128,
    0, 0, 0, 0,
  ]));
});

test("Surface owns absorption-dependent density preservation", () => {
  assert.ok(
    Math.abs(
      getSurfaceDensityRange(0.42)
        - (0.045 + 0.58 * 0.635)
    ) < 1e-12,
  );
  assert.ok(
    getSurfaceDensityRange(0) > getSurfaceDensityRange(1),
  );
  assert.throws(
    () => getSurfaceDensityRange(1.01),
    /normalizedAbsorption/,
  );
});

test("resolved Surface coverage fails closed before allocating an invalid plane", () => {
  const mask = makeDeposit(2, 2);
  for (const absorption of [Number.NaN, -1, 101]) {
    assert.throws(() => resolveKeyboardSurfaceCoverage({
      width: 2,
      height: 2,
      contactMask: mask,
      absorption,
      recipe: ORDINARY_GREEN_RECIPE_R12,
    }), /normalizedAbsorption must be finite/);
  }
  assert.throws(() => resolveKeyboardSurfaceCoverage({
    width: 2,
    height: 2,
    contactMask: { data: new Uint8ClampedArray(4) },
    absorption: 42,
    recipe: ORDINARY_GREEN_RECIPE_R12,
  }), /RGBA length must match/);
  assert.throws(() => resolveKeyboardSurfaceCoverage({
    width: 2,
    height: 2,
    contactMask: mask,
    materialCoverageCandidate: { data: new Float32Array(16) },
    absorption: 42,
    recipe: ORDINARY_GREEN_RECIPE_R12,
  }), /Uint8ClampedArray/);

  let getterReads = 0;
  const accessorOptions = {
    width: 2,
    height: 2,
    contactMask: mask,
    surfaceRecipe: legacySurfaceAt(0.42),
  };
  Object.defineProperty(accessorOptions, "contactMask", {
    enumerable: true,
    get() {
      getterReads += 1;
      return mask;
    },
  });
  assert.throws(
    () => resolveKeyboardSurfaceCoverageForRecipe(accessorOptions),
    /contactMask must be an enumerable own data property/,
  );
  assert.equal(getterReads, 0);
});

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
  const surfaceRecipe = legacySurfaceAt(absorption);
  const simulation = new WetInkSimulation(
    deposit.width,
    deposit.height,
    DEFAULT_SURFACE_SEED,
  );
  simulation.depositMask(deposit, {
    waterLoad: ORDINARY_GREEN_RECIPE_R12.keyboardDeposit.waterLoad,
    pigmentLoad: ORDINARY_GREEN_RECIPE_R12.keyboardDeposit.pigmentLoad,
    seed: (DEFAULT_SURFACE_SEED ^ 0x85ebca6b) >>> 0,
  });
  const steps = Math.round(
    surfaceRecipe.keyboard.stepBase
      + absorption
        * surfaceRecipe.keyboard.stepUptakeGain,
  );
  for (let index = 0; index < steps; index += 1) {
    simulation.step(
      surfaceRecipe.keyboard.stepMilliseconds,
      absorption,
    );
  }
  const image = {
    data: new Uint8ClampedArray(deposit.width * deposit.height * 4),
  };
  simulation.render(image, ORDINARY_GREEN_RECIPE_R12);
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
  const loads = getDirectDepositLoads(ORDINARY_GREEN_RECIPE_R12, 0.58);
  assert.ok(Math.abs(loads.waterLoad - 0.2242) < 1e-12);
  assert.ok(Math.abs(loads.pigmentLoad - 0.1536) < 1e-12);
  assert.ok(Object.isFrozen(getDirectDepositLoads(ORDINARY_GREEN_RECIPE_R12, 0)));
  assert.throws(() => getDirectDepositLoads(undefined, 0.58), /recipe/);
  for (const flow of [Number.NaN, Number.POSITIVE_INFINITY, -0.01, 1.01]) {
    assert.throws(
      () => getDirectDepositLoads(ORDINARY_GREEN_RECIPE_R12, flow),
      /normalizedFlow must be a finite number in 0\.\.\.1/,
    );
  }
});

test("excessive keyboard Surface work fails before touching a deposit", () => {
  const excessive = JSON.parse(JSON.stringify(legacySurfaceAt(0.42)));
  excessive.id = "custom-excessive-steps";
  excessive.keyboard.stepBase = 64;
  excessive.keyboard.stepUptakeGain = 1;
  const untouchedDeposit = {
    get width() {
      throw new Error("deposit must not be read");
    },
  };
  assert.throws(
    () => createMaterialCoverageForRecipe(
      untouchedDeposit,
      excessive,
      7,
      ORDINARY_GREEN_RECIPE_R12,
    ),
    /step budget/,
  );
});

test("invalid Surface recipes fail before touching a deposit", () => {
  const untouchedDeposit = {
    get width() {
      throw new Error("deposit must not be read");
    },
  };
  for (const verticalUptake of [Number.NaN, Number.POSITIVE_INFINITY, -0.01, 1.01]) {
    const invalid = JSON.parse(JSON.stringify(legacySurfaceAt(0.42)));
    invalid.id = "custom-invalid-uptake";
    invalid.axes.verticalUptake = verticalUptake;
    assert.throws(
      () => createMaterialCoverageForRecipe(
        untouchedDeposit,
        invalid,
        7,
        ORDINARY_GREEN_RECIPE_R12,
      ),
      /verticalUptake must be a finite number in 0\.\.\.1/,
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
    const invalid = JSON.parse(JSON.stringify(legacySurfaceAt(0.42)));
    invalid.id = "custom-invalid-reference";
    invalid.keyboard.normalizationReferenceAlpha = value;
    assert.throws(
      () => createMaterialCoverageForRecipe(
        untouchedDeposit,
        invalid,
        DEFAULT_SURFACE_SEED,
        ORDINARY_GREEN_RECIPE_R12,
      ),
      /normalizationReferenceAlpha/,
    );
  }

  const accessor = JSON.parse(JSON.stringify(legacySurfaceAt(0.42)));
  accessor.id = "custom-accessor-reference";
  Object.defineProperty(
    accessor.keyboard,
    "normalizationReferenceAlpha",
    { enumerable: true, get: () => 107 },
  );
  assert.throws(
    () => createMaterialCoverageForRecipe(
      untouchedDeposit,
      accessor,
      DEFAULT_SURFACE_SEED,
      ORDINARY_GREEN_RECIPE_R12,
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
    simulation.render(image, ORDINARY_GREEN_RECIPE_R12);
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

test("balanced paper preserves the direct-input absorption-42 solver path", () => {
  const historical = new WetInkSimulation(24, 18, 0x10203040);
  const separated = new WetInkSimulation(24, 18, 0x10203040);
  const revised = new WetInkSimulation(24, 18, 0x10203040);
  const deposit = makeDeposit(24, 18);
  const options = {
    waterLoad: 0.377,
    pigmentLoad: 0.291,
    seed: 0x55667788,
  };
  historical.depositMask(deposit, options);
  separated.depositMask(deposit, options);
  revised.depositMask(deposit, options);
  for (let index = 0; index < 9; index += 1) {
    historical.step(16.667, 0.42);
    separated.stepSurface(16.667, PAPER_SURFACE_BALANCED_R1);
    revised.stepSurface(16.667, PAPER_SURFACE_BALANCED_R2);
  }
  assert.deepEqual(separated.water, historical.water);
  assert.deepEqual(separated.mobile, historical.mobile);
  assert.deepEqual(separated.fixed, historical.fixed);
  assert.deepEqual(revised.water, historical.water);
  assert.deepEqual(revised.mobile, historical.mobile);
  assert.deepEqual(revised.fixed, historical.fixed);
});

test("absorbent r4 changes only keyboard fibre scaling, not direct solver state", () => {
  const run = (surfaceRecipe) => {
    const simulation = new WetInkSimulation(24, 18, 0x10203040);
    simulation.depositMask(makeDeposit(24, 18), {
      waterLoad: 0.377,
      pigmentLoad: 0.291,
      seed: 0x55667788,
    });
    for (let index = 0; index < 9; index += 1) {
      simulation.stepSurface(16.667, surfaceRecipe);
    }
    return simulation;
  };
  const historical = run(PAPER_SURFACE_ABSORBENT_R3);
  const scaleAware = run(PAPER_SURFACE_ABSORBENT_R4);
  assert.deepEqual(scaleAware.water, historical.water);
  assert.deepEqual(scaleAware.mobile, historical.mobile);
  assert.deepEqual(scaleAware.fixed, historical.fixed);
  assert.deepEqual(
    scaleAware.subsurfacePigment,
    historical.subsurfacePigment,
  );
});

test("direct-input ordinary recipes preserve physical state and alpha while changing color", () => {
  const recipes = [
    ORDINARY_GREEN_RECIPE_R12,
    ORDINARY_BLUE_BLACK_RECIPE_R6,
    ORDINARY_BURGUNDY_RECIPE_R6,
    ORDINARY_TEAL_RECIPE_R6,
  ];
  const outputs = recipes.map((recipe) => {
    const simulation = new WetInkSimulation(24, 18, 0x10203040);
    simulation.depositMask(makeDeposit(24, 18), {
      waterLoad: 0.377,
      pigmentLoad: 0.291,
      seed: 0x55667788,
    });
    for (let index = 0; index < 9; index += 1) simulation.step(16.667, 0.42);
    const image = { data: new Uint8ClampedArray(24 * 18 * 4) };
    simulation.render(image, recipe);
    return { simulation, image: image.data };
  });
  const control = outputs[0];
  for (const output of outputs.slice(1)) {
    assert.deepEqual(output.simulation.water, control.simulation.water);
    assert.deepEqual(output.simulation.mobile, control.simulation.mobile);
    assert.deepEqual(output.simulation.fixed, control.simulation.fixed);
    assert.deepEqual(
      Array.from(output.image).filter((_, index) => index % 4 === 3),
      Array.from(control.image).filter((_, index) => index % 4 === 3),
    );
  }
  assert.equal(
    new Set(outputs.map((output) => sha256(output.image))).size,
    recipes.length,
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
    ORDINARY_GREEN_RECIPE_R12,
  );
  const second = createMaterialCoverage(
    deposit,
    0.42,
    DEFAULT_SURFACE_SEED,
    ORDINARY_GREEN_RECIPE_R12,
  );
  const differentSeed = createMaterialCoverage(
    deposit,
    0.42,
    (DEFAULT_SURFACE_SEED ^ 0x9e3779b9) >>> 0,
    ORDINARY_GREEN_RECIPE_R12,
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

test("balanced paper preserves the accepted absorption-42 Surface bytes", () => {
  const deposit = makeDeposit(24, 18);
  const historical = createMaterialCoverage(
    deposit,
    0.42,
    DEFAULT_SURFACE_SEED,
    ORDINARY_GREEN_RECIPE_R12,
  );
  const balanced = createMaterialCoverageForRecipe(
    deposit,
    PAPER_SURFACE_BALANCED_R1,
    DEFAULT_SURFACE_SEED,
    ORDINARY_GREEN_RECIPE_R12,
  );
  assert.deepEqual(balanced, historical);
  assert.equal(
    sha256(balanced.data),
    "2bee8374e17bb59d48e0b34ab2d74637ad83d1594ff0888303f3e67bb42adc41",
  );
});

test("paper recipes keep vertical uptake and lateral spread independent", () => {
  const deposit = makeDeposit(24, 18);
  const render = (surfaceRecipe) => createMaterialCoverageForRecipe(
    deposit,
    surfaceRecipe,
    DEFAULT_SURFACE_SEED,
    ORDINARY_GREEN_RECIPE_R12,
  );
  const smooth = render(PAPER_SURFACE_SMOOTH_R1);
  const balanced = render(PAPER_SURFACE_BALANCED_R1);
  const absorbent = render(PAPER_SURFACE_ABSORBENT_R1);
  assert.equal(smooth.data.some((value, index) => index % 4 === 3 && value > 0), true);
  assert.notDeepEqual(absorbent.data, balanced.data);
  const supportedAlpha = (image) => {
    let count = 0;
    for (let offset = 3; offset < image.data.length; offset += 4) {
      if (image.data[offset] > 0) count += 1;
    }
    return count;
  };
  assert.ok(supportedAlpha(absorbent) >= supportedAlpha(smooth));
  assert.ok(
    PAPER_SURFACE_ABSORBENT_R1.axes.lateralMobility
      < PAPER_SURFACE_ABSORBENT_R1.axes.verticalUptake,
  );
});

test("absorbent r2 drives geometry from lateral mobility, not paper depth", () => {
  const contactMask = makeDeposit(3, 3);
  const candidate = makeDeposit(3, 3);
  candidate.data.fill(255);
  const result = resolveKeyboardSurfaceCoverageForRecipe({
    width: 3,
    height: 3,
    contactMask,
    materialCoverageCandidate: candidate,
    surfaceRecipe: PAPER_SURFACE_ABSORBENT_R2,
  });
  assert.equal(
    result.materialMix,
    Math.pow(
      PAPER_SURFACE_ABSORBENT_R2.axes.lateralMobility,
      PAPER_SURFACE_ABSORBENT_R2.keyboard.coverageMixExponent,
    ),
  );
  assert.notEqual(
    result.materialMix,
    Math.pow(
      PAPER_SURFACE_ABSORBENT_R2.axes.depthUptake,
      PAPER_SURFACE_ABSORBENT_R2.keyboard.coverageMixExponent,
    ),
  );
});

test("paper-depth uptake stores pigment locally without creating extra page spread", () => {
  const width = 24;
  const height = 18;
  const deposit = makeDeposit(width, height);
  const run = (depthUptake) => {
    const surfaceRecipe = JSON.parse(JSON.stringify(PAPER_SURFACE_ABSORBENT_R2));
    surfaceRecipe.id = `custom-depth-${depthUptake}`;
    surfaceRecipe.axes.depthUptake = depthUptake;
    const simulation = new WetInkSimulation(width, height, DEFAULT_SURFACE_SEED);
    simulation.depositMask(deposit, {
      waterLoad: ORDINARY_GREEN_RECIPE_R12.keyboardDeposit.waterLoad,
      pigmentLoad: ORDINARY_GREEN_RECIPE_R12.keyboardDeposit.pigmentLoad,
      seed: 7,
    });
    const steps = Math.round(
      surfaceRecipe.keyboard.stepBase
        + surfaceRecipe.axes.lateralMobility
          * surfaceRecipe.keyboard.stepMobilityGain,
    );
    for (let index = 0; index < steps; index += 1) {
      simulation.stepSurface(surfaceRecipe.keyboard.stepMilliseconds, surfaceRecipe);
    }
    return simulation;
  };
  const noDepth = run(0);
  const absorbed = run(0.86);
  const sum = (plane) => plane.reduce((total, value) => total + value, 0);
  assert.equal(sum(noDepth.subsurfacePigment), 0);
  assert.ok(sum(absorbed.subsurfacePigment) > 0);
  assert.ok(
    sum(absorbed.mobile) + sum(absorbed.fixed)
      < sum(noDepth.mobile) + sum(noDepth.fixed),
  );
  for (let index = 0; index < absorbed.length; index += 1) {
    if (absorbed.water[index] > 0) {
      assert.ok(
        noDepth.water[index] > 0,
        "depth uptake may remove surface liquid but cannot create page-plane spread",
      );
    }
  }
  const depthState = absorbed.createPaperDepthState();
  assert.ok(depthState.pigment instanceof Float32Array);
  assert.deepEqual(depthState.pigment, absorbed.subsurfacePigment);
  assert.notEqual(depthState.pigment, absorbed.subsurfacePigment);
});

test("keyboard absorbent r2 exposes a bounded paper-depth diagnostic", () => {
  const state = createKeyboardSurfaceStateForRecipe(
    makeDeposit(24, 18),
    PAPER_SURFACE_ABSORBENT_R2,
    DEFAULT_SURFACE_SEED,
    ORDINARY_GREEN_RECIPE_R12,
  );
  assert.ok(state.paperDepth);
  assert.equal(state.paperDepth.width, 24);
  assert.equal(state.paperDepth.height, 18);
  assert.ok(state.paperDepth.pigment.some((value) => value > 0));
  assert.equal(state.paperDepth.signedNumerator, null);
  assert.equal(state.paperDepth.pigment.length, 24 * 18);
  assert.equal(state.coverage.data.length, 24 * 18 * 4);
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
    ORDINARY_GREEN_RECIPE_R12,
    makeTransport(0.75),
  );
  const negative = createKeyboardSurfaceState(
    deposit,
    0.42,
    DEFAULT_SURFACE_SEED,
    ORDINARY_GREEN_RECIPE_R12,
    makeTransport(-0.75),
  );
  assert.deepEqual(positive.coverage, negative.coverage);
  const coverageOnly = createMaterialCoverage(
    deposit,
    0.42,
    DEFAULT_SURFACE_SEED,
    ORDINARY_GREEN_RECIPE_R12,
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
    waterLoad: ORDINARY_GREEN_RECIPE_R12.keyboardDeposit.waterLoad,
    pigmentLoad: ORDINARY_GREEN_RECIPE_R12.keyboardDeposit.pigmentLoad,
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
    ORDINARY_GREEN_RECIPE_R12,
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
    legacySurfaceAt(absorption).keyboard.normalizationScale,
  );
  const afterLegacy = legacyStrongestNormalization(
    afterRaw,
    legacySurfaceAt(absorption).keyboard.normalizationScale,
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
    ORDINARY_GREEN_RECIPE_R12,
  );
  const after = createMaterialCoverage(
    afterDeposit,
    absorption,
    DEFAULT_SURFACE_SEED,
    ORDINARY_GREEN_RECIPE_R12,
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
    ORDINARY_GREEN_RECIPE_R12,
  );
  const after = createMaterialCoverage(
    makeNearDeposit(true),
    0.42,
    DEFAULT_SURFACE_SEED,
    ORDINARY_GREEN_RECIPE_R12,
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
      ORDINARY_GREEN_RECIPE_R12,
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
      ORDINARY_GREEN_RECIPE_R12,
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
  assert.throws(
    () => missingStrokeSeed.depositDab(6, 6, {
      ...dab,
      strokeSeed: 0,
      nibAngle: Number.NaN,
    }),
    /nibAngle must be a finite number/,
  );
  assert.ok(missingStrokeSeed.water.every((value) => value === 0));
  missingStrokeSeed.depositDab(6, 6, { ...dab, strokeSeed: 0 });
  assert.ok(missingStrokeSeed.water.some((value) => value > 0));
  assert.throws(
    () => new WetInkSimulation(12, 12, 0x1_0000_0000),
    /unsigned 32-bit integer/,
  );
});
