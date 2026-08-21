import assert from "node:assert/strict";
import test from "node:test";
import { EDGE_DYE_COMPONENT_RECIPE_R1 } from "../src/dye-components/index.js";
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
  const component = runSimulation(EDGE_DYE_COMPONENT_RECIPE_R1);
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
    EDGE_DYE_COMPONENT_RECIPE_R1,
    PAPER_SURFACE_ABSORBENT_R4,
  ).createDyeComponentState();
  const second = runSimulation(
    EDGE_DYE_COMPONENT_RECIPE_R1,
    PAPER_SURFACE_ABSORBENT_R4,
  ).createDyeComponentState();
  assert.deepEqual(second, first);
  assert.equal(first.id, "edge-dye-study");
  assert.equal(first.revision, 1);
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

test("component mobility reaches farther and lower retention fixes a smaller share", () => {
  const simulation = runSimulation(EDGE_DYE_COMPONENT_RECIPE_R1);
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
    EDGE_DYE_COMPONENT_RECIPE_R1,
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
      return EDGE_DYE_COMPONENT_RECIPE_R1;
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
