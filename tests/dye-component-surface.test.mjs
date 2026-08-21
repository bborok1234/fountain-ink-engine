import assert from "node:assert/strict";
import test from "node:test";
import { EDGE_DYE_COMPONENT_RECIPE_R3 } from "../src/dye-components/index.js";
import { ORDINARY_GREEN_RECIPE_R12 } from "../src/recipes/index.js";
import {
  PAPER_SURFACE_BALANCED_R2,
  PAPER_SURFACE_ABSORBENT_R4,
} from "../src/surface-recipes/index.js";
import {
  DEFAULT_SURFACE_SEED,
  WetInkSimulation,
  createKeyboardSurfaceState,
} from "../src/surface/index.js";

function makeDeposit(width = 40, height = 24) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 9; y < 15; y += 1) {
    for (let x = 17; x < 23; x += 1) {
      data[(y * width + x) * 4 + 3] = 224;
    }
  }
  return { width, height, data };
}

function runSimulation(dyeComponentRecipe = null, surfaceRecipe = PAPER_SURFACE_BALANCED_R2) {
  const deposit = makeDeposit();
  const simulation = new WetInkSimulation(
    deposit.width,
    deposit.height,
    DEFAULT_SURFACE_SEED,
  );
  simulation.depositMask(deposit, {
    waterLoad: ORDINARY_GREEN_RECIPE_R12.keyboardDeposit.waterLoad,
    pigmentLoad: ORDINARY_GREEN_RECIPE_R12.keyboardDeposit.pigmentLoad,
    seed: (DEFAULT_SURFACE_SEED ^ 0x85ebca6b) >>> 0,
    ...(dyeComponentRecipe === null ? {} : { dyeComponentRecipe }),
  });
  const stepResponse = surfaceRecipe.surfaceRecipeSchemaVersion === 1
    ? surfaceRecipe.axes.verticalUptake
      * surfaceRecipe.keyboard.stepUptakeGain
    : surfaceRecipe.axes.lateralMobility
      * surfaceRecipe.keyboard.stepMobilityGain;
  const steps = Math.round(surfaceRecipe.keyboard.stepBase + stepResponse);
  for (let index = 0; index < steps; index += 1) {
    simulation.stepSurface(surfaceRecipe.keyboard.stepMilliseconds, surfaceRecipe);
  }
  return simulation;
}

const sum = (values) => values.reduce((total, value) => total + value, 0);

test("optional dye component off preserves ordinary solver bytes and allocates no planes", () => {
  const baseline = runSimulation();
  const explicitOff = runSimulation(null);
  for (const plane of ["water", "mobile", "fixed"]) {
    assert.deepEqual(explicitOff[plane], baseline[plane]);
  }
  assert.deepEqual(
    explicitOff.createPaperDepthState(),
    baseline.createPaperDepthState(),
  );
  assert.equal(explicitOff.createDyeComponentState(), null);
  assert.equal(explicitOff.dyeComponentMobile, null);
  assert.equal(explicitOff.dyeComponentFixed, null);
  assert.equal(explicitOff.nextDyeComponentMobile, null);
  assert.equal(explicitOff.dyeComponentSubsurface, null);
});

test("dye component shares water while preserving ordinary mass and Optical bytes", () => {
  const baseline = runSimulation();
  const component = runSimulation(EDGE_DYE_COMPONENT_RECIPE_R3);
  assert.deepEqual(component.water, baseline.water);
  assert.deepEqual(component.mobile, baseline.mobile);
  assert.deepEqual(component.fixed, baseline.fixed);
  assert.deepEqual(
    component.createPaperDepthState(),
    baseline.createPaperDepthState(),
  );

  const baselineImage = {
    data: new Uint8ClampedArray(baseline.length * 4),
  };
  const componentImage = {
    data: new Uint8ClampedArray(component.length * 4),
  };
  baseline.render(baselineImage, ORDINARY_GREEN_RECIPE_R12);
  component.render(componentImage, ORDINARY_GREEN_RECIPE_R12);
  assert.deepEqual(componentImage.data, baselineImage.data);
});

test("edge dye has deterministic separate mobile, fixed and depth mass", () => {
  const first = runSimulation(
    EDGE_DYE_COMPONENT_RECIPE_R3,
    PAPER_SURFACE_ABSORBENT_R4,
  ).createDyeComponentState();
  const second = runSimulation(
    EDGE_DYE_COMPONENT_RECIPE_R3,
    PAPER_SURFACE_ABSORBENT_R4,
  ).createDyeComponentState();
  assert.deepEqual(second, first);
  assert.equal(first.id, "edge-dye-study");
  assert.equal(first.revision, 3);
  assert.ok(first.mobileMass instanceof Float32Array);
  assert.ok(first.fixedMass instanceof Float32Array);
  assert.ok(first.subsurfaceMass instanceof Float32Array);
  assert.ok(sum(first.mobileMass) > 0);
  assert.ok(sum(first.fixedMass) > 0);
  assert.ok(sum(first.subsurfaceMass) > 0);
  for (const plane of [
    first.mobileMass,
    first.fixedMass,
    first.subsurfaceMass,
  ]) {
    assert.equal(plane.length, first.width * first.height);
    assert.ok(plane.every((value) => Number.isFinite(value) && value >= 0));
  }
});

test("visible fraction isolates component enrichment from ordinary internal density", () => {
  const component = runSimulation(
    EDGE_DYE_COMPONENT_RECIPE_R3,
  ).createDyeComponentState();
  const expected = EDGE_DYE_COMPONENT_RECIPE_R3.massFraction
    / (1 + EDGE_DYE_COMPONENT_RECIPE_R3.massFraction);
  assert.equal(component.expectedFraction, expected);
  assert.ok(component.visibleFraction instanceof Float32Array);
  assert.ok(component.fractionDelta instanceof Float32Array);
  assert.equal(component.visibleFraction.length, component.width * component.height);
  assert.equal(component.fractionDelta.length, component.visibleFraction.length);
  let enriched = 0;
  let depleted = 0;
  for (let index = 0; index < component.visibleFraction.length; index += 1) {
    const fraction = component.visibleFraction[index];
    const delta = component.fractionDelta[index];
    assert.ok(Number.isFinite(fraction) && fraction >= 0 && fraction <= 1);
    assert.ok(
      Number.isFinite(delta)
        && delta >= -expected - 1e-7
        && delta <= 1 - expected + 1e-7,
    );
    if (delta > 1e-7) enriched += 1;
    if (delta < -1e-7) depleted += 1;
  }
  assert.ok(enriched > 0);
  assert.ok(depleted > 0);
});

test("edge accumulation is sparse, enriched and Surface-driven", () => {
  const deposit = makeDeposit();
  const balanced = runSimulation(
    EDGE_DYE_COMPONENT_RECIPE_R3,
    PAPER_SURFACE_BALANCED_R2,
  ).createDyeComponentState();
  const absorbent = runSimulation(
    EDGE_DYE_COMPONENT_RECIPE_R3,
    PAPER_SURFACE_ABSORBENT_R4,
  ).createDyeComponentState();
  let enriched = 0;
  let accumulated = 0;
  let accumulatedOutsideContact = 0;
  let contactBoundary = 0;
  let accumulatedContactBoundary = 0;
  for (let y = 0; y < balanced.height; y += 1) {
    for (let x = 0; x < balanced.width; x += 1) {
      const index = y * balanced.width + x;
      const contact = deposit.data[index * 4 + 3] > 0;
      if (balanced.fractionDelta[index] > 0) enriched += 1;
      if (balanced.edgeAccumulation[index] > 0) {
        accumulated += 1;
        if (!contact) accumulatedOutsideContact += 1;
        assert.ok(balanced.fractionDelta[index] > 0);
        assert.ok(balanced.visibleFraction[index] > balanced.expectedFraction);
        assert.ok(balanced.edgeAccumulation[index] <= 1);
      }
      if (!contact) continue;
      const boundary = x === 0 || y === 0
        || x === balanced.width - 1 || y === balanced.height - 1
        || deposit.data[(index - 1) * 4 + 3] === 0
        || deposit.data[(index + 1) * 4 + 3] === 0
        || deposit.data[(index - balanced.width) * 4 + 3] === 0
        || deposit.data[(index + balanced.width) * 4 + 3] === 0;
      if (boundary) {
        contactBoundary += 1;
        if (balanced.edgeAccumulation[index] > 0) {
          accumulatedContactBoundary += 1;
        }
      }
    }
  }
  assert.ok(accumulated > 0);
  assert.ok(accumulated < enriched / 2);
  assert.ok(accumulatedOutsideContact > 0);
  assert.ok(accumulatedContactBoundary < contactBoundary / 2);
  assert.ok(absorbent.edgeAccumulation.every((value) => value === 0));
  assert.notDeepEqual(
    balanced.edgeAccumulation,
    absorbent.edgeAccumulation,
  );
});

test("signed glyph Density does not change component enrichment", () => {
  const deposit = makeDeposit(40, 24);
  const makeTransport = (ratio) => {
    const signedNumerator = new Float32Array(40 * 24);
    const pigmentWeight = new Float32Array(40 * 24);
    for (let index = 0; index < pigmentWeight.length; index += 1) {
      if (deposit.data[index * 4 + 3] === 0) continue;
      pigmentWeight[index] = 1;
      signedNumerator[index] = ratio;
    }
    return { width: 40, height: 24, signedNumerator, pigmentWeight };
  };
  const positive = createKeyboardSurfaceState(
    deposit,
    PAPER_SURFACE_BALANCED_R2,
    DEFAULT_SURFACE_SEED,
    ORDINARY_GREEN_RECIPE_R12,
    makeTransport(0.8),
    EDGE_DYE_COMPONENT_RECIPE_R3,
  );
  const negative = createKeyboardSurfaceState(
    deposit,
    PAPER_SURFACE_BALANCED_R2,
    DEFAULT_SURFACE_SEED,
    ORDINARY_GREEN_RECIPE_R12,
    makeTransport(-0.8),
    EDGE_DYE_COMPONENT_RECIPE_R3,
  );
  assert.deepEqual(
    positive.dyeComponent.visibleFraction,
    negative.dyeComponent.visibleFraction,
  );
  assert.deepEqual(
    positive.dyeComponent.fractionDelta,
    negative.dyeComponent.fractionDelta,
  );
  assert.deepEqual(
    positive.dyeComponent.edgeAccumulation,
    negative.dyeComponent.edgeAccumulation,
  );
  assert.notDeepEqual(
    positive.densityTransport.signedNumerator,
    negative.densityTransport.signedNumerator,
  );
});

test("component mobility reaches farther and lower retention fixes a smaller share", () => {
  const simulation = runSimulation(EDGE_DYE_COMPONENT_RECIPE_R3);
  const component = simulation.createDyeComponentState();
  const baseTotal = new Float32Array(simulation.length);
  const componentTotal = new Float32Array(simulation.length);
  for (let index = 0; index < simulation.length; index += 1) {
    baseTotal[index] = simulation.mobile[index] + simulation.fixed[index];
    componentTotal[index] = component.mobileMass[index] + component.fixedMass[index];
  }
  const baseOccupied = baseTotal.reduce(
    (count, value) => count + (value > 1e-9 ? 1 : 0),
    0,
  );
  const componentOccupied = componentTotal.reduce(
    (count, value) => count + (value > 1e-9 ? 1 : 0),
    0,
  );
  assert.ok(componentOccupied > baseOccupied);
  const baseFixedShare = sum(simulation.fixed) / sum(baseTotal);
  const componentFixedShare = sum(component.fixedMass) / sum(componentTotal);
  assert.ok(componentFixedShare < baseFixedShare);
});

test("high-level keyboard Surface exposes diagnostic component without changing coverage", () => {
  const deposit = makeDeposit(48, 28);
  const ordinary = createKeyboardSurfaceState(
    deposit,
    PAPER_SURFACE_BALANCED_R2,
    DEFAULT_SURFACE_SEED,
    ORDINARY_GREEN_RECIPE_R12,
  );
  const component = createKeyboardSurfaceState(
    deposit,
    PAPER_SURFACE_BALANCED_R2,
    DEFAULT_SURFACE_SEED,
    ORDINARY_GREEN_RECIPE_R12,
    null,
    EDGE_DYE_COMPONENT_RECIPE_R3,
  );
  assert.deepEqual(component.coverage, ordinary.coverage);
  assert.deepEqual(component.densityTransport, ordinary.densityTransport);
  assert.deepEqual(component.paperDepth, ordinary.paperDepth);
  assert.equal(ordinary.dyeComponent, null);
  assert.ok(component.dyeComponent.mobileMass.some((value) => value > 0));
});

test("invalid component fails before deposit mutation and component allocation", () => {
  const simulation = new WetInkSimulation(12, 12, DEFAULT_SURFACE_SEED);
  const deposit = makeDeposit(12, 12);
  let reads = 0;
  const options = {
    waterLoad: 0.377,
    pigmentLoad: 0.291,
    seed: 123,
  };
  Object.defineProperty(options, "dyeComponentRecipe", {
    enumerable: true,
    get() {
      reads += 1;
      return EDGE_DYE_COMPONENT_RECIPE_R3;
    },
  });
  assert.throws(
    () => simulation.depositMask(deposit, options),
    /enumerable own data property/,
  );
  assert.equal(reads, 0);
  assert.ok(simulation.water.every((value) => value === 0));
  assert.ok(simulation.mobile.every((value) => value === 0));
  assert.equal(simulation.dyeComponentMobile, null);
});

test("maximum-grid enrichment has an explicit component memory bound", () => {
  const width = 320;
  const height = 240;
  const deposit = makeDeposit(width, height);
  const simulation = new WetInkSimulation(width, height, DEFAULT_SURFACE_SEED);
  simulation.depositMask(deposit, {
    waterLoad: ORDINARY_GREEN_RECIPE_R12.keyboardDeposit.waterLoad,
    pigmentLoad: ORDINARY_GREEN_RECIPE_R12.keyboardDeposit.pigmentLoad,
    seed: (DEFAULT_SURFACE_SEED ^ 0x85ebca6b) >>> 0,
    dyeComponentRecipe: EDGE_DYE_COMPONENT_RECIPE_R3,
  });
  simulation.stepSurface(
    PAPER_SURFACE_ABSORBENT_R4.keyboard.stepMilliseconds,
    PAPER_SURFACE_ABSORBENT_R4,
  );
  const state = simulation.createDyeComponentState();
  const solverBytes = [
    simulation.dyeComponentMobile,
    simulation.dyeComponentFixed,
    simulation.nextDyeComponentMobile,
    simulation.dyeComponentSubsurface,
  ].reduce((total, plane) => total + plane.byteLength, 0);
  const retainedBytes = [
    state.mobileMass,
    state.fixedMass,
    state.subsurfaceMass,
    state.visibleFraction,
    state.fractionDelta,
    state.edgeAccumulation,
  ].reduce((total, plane) => total + plane.byteLength, 0);
  assert.equal(solverBytes, 1_228_800);
  assert.equal(retainedBytes, 1_843_200);
  assert.equal(solverBytes + retainedBytes, 3_072_000);
});
