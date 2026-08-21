import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import {
  PIGMENT_COMPONENT_RECIPE_R1,
  assertPigmentComponentRecipeCompatible,
  freezePigmentComponentRecipe,
  serializePigmentComponentRecipe,
} from "fountain-ink-engine/pigment-components";
import { EDGE_DYE_COMPONENT_RECIPE_R5 } from "fountain-ink-engine/dye-components";
import { ORDINARY_GREEN_RECIPE_R12 } from "fountain-ink-engine/recipes";
import {
  PAPER_SURFACE_ABSORBENT_R4,
  PAPER_SURFACE_BALANCED_R2,
} from "fountain-ink-engine/surface-recipes";
import {
  DEFAULT_SURFACE_SEED,
  WetInkSimulation,
  createKeyboardSurfaceState,
} from "fountain-ink-engine/surface";

function makeDeposit(width = 40, height = 24) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 9; y < 15; y += 1) {
    for (let x = 17; x < 23; x += 1) {
      data[(y * width + x) * 4 + 3] = 224;
    }
  }
  return { width, height, data };
}

function runSimulation(
  pigmentComponentRecipe = null,
  surfaceRecipe = PAPER_SURFACE_BALANCED_R2,
) {
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
    ...(pigmentComponentRecipe === null ? {} : { pigmentComponentRecipe }),
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

function outsideContactMass(state) {
  let total = 0;
  for (let y = 0; y < state.height; y += 1) {
    for (let x = 0; x < state.width; x += 1) {
      if (x >= 17 && x < 23 && y >= 9 && y < 15) continue;
      const index = y * state.width + x;
      total += state.mobileMass[index] + state.fixedMass[index];
    }
  }
  return total;
}

test("registered pigment recipe is canonical, frozen, and independently pinned", () => {
  const serialized = serializePigmentComponentRecipe(PIGMENT_COMPONENT_RECIPE_R1);
  assert.equal(Object.isFrozen(PIGMENT_COMPONENT_RECIPE_R1), true);
  assert.equal(
    createHash("sha256").update(serialized).digest("hex"),
    "fd101dd0fe00346e3815aa97a9eb18fa5e0a694c565c2348d4a063e6e314c0a9",
  );
  assert.equal(assertPigmentComponentRecipeCompatible(PIGMENT_COMPONENT_RECIPE_R1), true);
});

test("custom pigment recipes remain explicit while registered identity rejects retuning", () => {
  const custom = freezePigmentComponentRecipe({
    ...PIGMENT_COMPONENT_RECIPE_R1,
    id: "workbench-pigment",
    mobilityMultiplier: 0.5,
  });
  assert.equal(assertPigmentComponentRecipeCompatible(custom), true);
  assert.throws(() => assertPigmentComponentRecipeCompatible({
    ...PIGMENT_COMPONENT_RECIPE_R1,
    mobilityMultiplier: 0.5,
  }), /does not match/);
});

test("pigment state shares water while preserving ordinary mass and Optical bytes", () => {
  const baseline = runSimulation();
  const pigment = runSimulation(PIGMENT_COMPONENT_RECIPE_R1);
  assert.deepEqual(pigment.water, baseline.water);
  assert.deepEqual(pigment.mobile, baseline.mobile);
  assert.deepEqual(pigment.fixed, baseline.fixed);
  assert.deepEqual(pigment.createPaperDepthState(), baseline.createPaperDepthState());
  assert.equal(baseline.createPigmentComponentState(), null);
  const state = pigment.createPigmentComponentState();
  assert.equal(state.id, "pigment-study");
  assert.equal(state.revision, 1);
  assert.ok(state.mobileTotal > 0);
  assert.ok(state.fixedTotal > 0);
  assert.ok(state.fixedFraction > 0 && state.fixedFraction < 1);
  const baselineImage = { data: new Uint8ClampedArray(baseline.length * 4) };
  const pigmentImage = { data: new Uint8ClampedArray(pigment.length * 4) };
  baseline.render(baselineImage, ORDINARY_GREEN_RECIPE_R12);
  pigment.render(pigmentImage, ORDINARY_GREEN_RECIPE_R12);
  assert.deepEqual(pigmentImage.data, baselineImage.data);
});

test("authored pigment mobility and retention change independent state", () => {
  const mobileRecipe = freezePigmentComponentRecipe({
    ...PIGMENT_COMPONENT_RECIPE_R1,
    id: "mobile-pigment",
    mobilityMultiplier: 1.2,
    retentionMultiplier: 1,
  });
  const slowRecipe = freezePigmentComponentRecipe({
    ...PIGMENT_COMPONENT_RECIPE_R1,
    id: "slow-pigment",
    mobilityMultiplier: 0.2,
    retentionMultiplier: 1,
  });
  const lowRetentionRecipe = freezePigmentComponentRecipe({
    ...PIGMENT_COMPONENT_RECIPE_R1,
    id: "low-retention-pigment",
    mobilityMultiplier: 0.35,
    retentionMultiplier: 0.5,
  });
  const retainedRecipe = freezePigmentComponentRecipe({
    ...PIGMENT_COMPONENT_RECIPE_R1,
    id: "retained-pigment",
    mobilityMultiplier: 0.35,
    retentionMultiplier: 2.4,
  });
  const mobile = runSimulation(mobileRecipe).createPigmentComponentState();
  const slow = runSimulation(slowRecipe).createPigmentComponentState();
  const lowRetention = runSimulation(
    lowRetentionRecipe,
  ).createPigmentComponentState();
  const retained = runSimulation(retainedRecipe).createPigmentComponentState();
  assert.ok(outsideContactMass(mobile) > outsideContactMass(slow));
  assert.ok(retained.fixedFraction > lowRetention.fixedFraction);
});

test("absorbent paper exposes deterministic pigment depth without changing coverage", () => {
  const deposit = makeDeposit();
  const baseline = createKeyboardSurfaceState(
    deposit,
    PAPER_SURFACE_ABSORBENT_R4,
    DEFAULT_SURFACE_SEED,
    ORDINARY_GREEN_RECIPE_R12,
  );
  const first = createKeyboardSurfaceState(
    deposit,
    PAPER_SURFACE_ABSORBENT_R4,
    DEFAULT_SURFACE_SEED,
    ORDINARY_GREEN_RECIPE_R12,
    null,
    null,
    PIGMENT_COMPONENT_RECIPE_R1,
  );
  const second = createKeyboardSurfaceState(
    deposit,
    PAPER_SURFACE_ABSORBENT_R4,
    DEFAULT_SURFACE_SEED,
    ORDINARY_GREEN_RECIPE_R12,
    null,
    null,
    PIGMENT_COMPONENT_RECIPE_R1,
  );
  assert.deepEqual(first.coverage.data, baseline.coverage.data);
  assert.deepEqual(first.pigmentComponent, second.pigmentComponent);
  assert.ok(first.pigmentComponent.subsurfaceMass instanceof Float32Array);
  assert.ok(first.pigmentComponent.subsurfaceTotal > 0);
});

test("dye and pigment recipes cannot share one transport slot", () => {
  const deposit = makeDeposit();
  const simulation = new WetInkSimulation(
    deposit.width,
    deposit.height,
    DEFAULT_SURFACE_SEED,
  );
  assert.throws(() => simulation.depositMask(deposit, {
    waterLoad: ORDINARY_GREEN_RECIPE_R12.keyboardDeposit.waterLoad,
    pigmentLoad: ORDINARY_GREEN_RECIPE_R12.keyboardDeposit.pigmentLoad,
    seed: 1,
    dyeComponentRecipe: EDGE_DYE_COMPONENT_RECIPE_R5,
    pigmentComponentRecipe: PIGMENT_COMPONENT_RECIPE_R1,
  }), /Only one/);
  assert.ok(simulation.water.every((value) => value === 0));
  assert.equal(simulation.dyeComponentMobile, null);
});

test("pigment recipe accessors fail without getter reads", () => {
  let getterReads = 0;
  const forged = { ...PIGMENT_COMPONENT_RECIPE_R1 };
  Object.defineProperty(forged, "massFraction", {
    enumerable: true,
    get() {
      getterReads += 1;
      return 0.85;
    },
  });
  assert.throws(() => assertPigmentComponentRecipeCompatible(forged), /own data property/);
  assert.equal(getterReads, 0);
});
