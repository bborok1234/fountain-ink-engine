import assert from "node:assert/strict";
import test from "node:test";
import {
  EDGE_DYE_COMPONENT_RECIPE_R12,
  EDGE_DYE_COMPONENT_RECIPE_R13 as ACTIVE_DYE_COMPONENT_RECIPE,
  dyeComponentStateModelVersion,
  freezeDyeComponentRecipe,
} from "../src/dye-components/index.js";
import { ORDINARY_GREEN_RECIPE_R12 } from "../src/recipes/index.js";
import {
  PAPER_SURFACE_ABSORBENT_R4,
  PAPER_SURFACE_BALANCED_R2,
  PAPER_SURFACE_SMOOTH_R1,
} from "../src/surface-recipes/index.js";
import {
  DEFAULT_SURFACE_SEED,
  WetInkSimulation,
  createKeyboardSurfaceState,
} from "../src/surface/index.js";

const FLOAT32_EPSILON = 2 ** -23;
const DYE_PLANES = Object.freeze([
  "mobileTotalMass",
  "mobileSecondaryResidualMass",
  "adsorbedTotalMass",
  "adsorbedSecondaryResidualMass",
  "depthTotalMass",
  "depthSecondaryResidualMass",
]);

const NEUTRAL_DYE_RECIPE = freezeDyeComponentRecipe({
  ...ACTIVE_DYE_COMPONENT_RECIPE,
  id: "neutral-two-dye-control",
  revision: 1,
  secondaryDiffusivity: ACTIVE_DYE_COMPONENT_RECIPE.primaryDiffusivity,
  secondaryAdsorptionRate:
    ACTIVE_DYE_COMPONENT_RECIPE.primaryAdsorptionRate,
  secondaryDesorptionRate:
    ACTIVE_DYE_COMPONENT_RECIPE.primaryDesorptionRate,
});

const NO_TRANSPORT_REACTION_RECIPE = freezeDyeComponentRecipe({
  ...NEUTRAL_DYE_RECIPE,
  id: "static-two-dye-control",
  primaryDiffusivity: 0,
  secondaryDiffusivity: 0,
  primaryAdsorptionRate: 0,
  secondaryAdsorptionRate: 0,
  primaryDesorptionRate: 0,
  secondaryDesorptionRate: 0,
});

const FACE_ONLY_DIFFERENTIAL_RECIPE = freezeDyeComponentRecipe({
  ...ACTIVE_DYE_COMPONENT_RECIPE,
  id: "face-only-differential-control",
  primaryAdsorptionRate: 0,
  secondaryAdsorptionRate: 0,
  primaryDesorptionRate: 0,
  secondaryDesorptionRate: 0,
});

function makeDeposit(width = 40, height = 24) {
  const data = new Uint8ClampedArray(width * height * 4);
  const minimumX = Math.max(1, Math.floor(width / 2) - 3);
  const maximumX = Math.min(width - 1, minimumX + 6);
  const minimumY = Math.max(1, Math.floor(height / 2) - 3);
  const maximumY = Math.min(height - 1, minimumY + 6);
  for (let y = minimumY; y < maximumY; y += 1) {
    for (let x = minimumX; x < maximumX; x += 1) {
      data[(y * width + x) * 4 + 3] = 224;
    }
  }
  return { width, height, data };
}

function stepCountFor(surfaceRecipe) {
  const response = surfaceRecipe.surfaceRecipeSchemaVersion === 1
    ? surfaceRecipe.axes.verticalUptake
      * surfaceRecipe.keyboard.stepUptakeGain
    : surfaceRecipe.axes.lateralMobility
      * surfaceRecipe.keyboard.stepMobilityGain;
  return Math.round(surfaceRecipe.keyboard.stepBase + response);
}

function depositSimulation(
  dyeComponentRecipe = null,
  deposit = makeDeposit(),
) {
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
  return simulation;
}

function snapshotDepositState(simulation) {
  const copy = (plane) => plane === null ? null : new Float32Array(plane);
  return {
    water: copy(simulation.water),
    mobile: copy(simulation.mobile),
    fixed: copy(simulation.fixed),
    nextWater: copy(simulation.nextWater),
    nextMobile: copy(simulation.nextMobile),
    materialComponentMobile: copy(simulation.materialComponentMobile),
    materialComponentFixed: copy(simulation.materialComponentFixed),
    nextMaterialComponentMobile:
      copy(simulation.nextMaterialComponentMobile),
    materialComponentMobileResidual:
      copy(simulation.materialComponentMobileResidual),
    materialComponentFixedResidual:
      copy(simulation.materialComponentFixedResidual),
    nextMaterialComponentMobileResidual:
      copy(simulation.nextMaterialComponentMobileResidual),
    materialComponentKind: simulation.materialComponentKind,
    materialComponentRecipe: simulation.materialComponentRecipe,
    materialComponentRecipeCanonical:
      simulation.materialComponentRecipeCanonical,
    activity: simulation.activity,
    dyeTransportScratch: simulation.dyeTransportScratch,
  };
}

function runSimulation(
  dyeComponentRecipe = null,
  surfaceRecipe = PAPER_SURFACE_BALANCED_R2,
  deposit = makeDeposit(),
  steps = stepCountFor(surfaceRecipe),
) {
  const simulation = depositSimulation(dyeComponentRecipe, deposit);
  for (let index = 0; index < steps; index += 1) {
    simulation.stepSurface(
      surfaceRecipe.keyboard.stepMilliseconds,
      surfaceRecipe,
    );
  }
  return simulation;
}

const sum = (values) => values.reduce((total, value) => total + value, 0);

function float32Budget(magnitude, steps = 1) {
  // A7 state crosses Float32 storage once per operator/step. The invariant
  // gate permits 64 single-precision ULP-equivalents per authored step and
  // never scales the tolerance with grid size.
  return Math.max(
    2e-6,
    Math.max(1, Math.abs(magnitude))
      * FLOAT32_EPSILON * 64 * Math.max(1, steps),
  );
}

function reconstructSpecies(total, residual, fraction) {
  return {
    primary: (1 - fraction) * total - residual,
    secondary: fraction * total + residual,
  };
}

function speciesTotals(state) {
  const fraction = state.initialSecondaryFraction;
  let primary = 0;
  let secondary = 0;
  let residual = 0;
  for (const [totalName, residualName] of [
    ["mobileTotalMass", "mobileSecondaryResidualMass"],
    ["adsorbedTotalMass", "adsorbedSecondaryResidualMass"],
    ["depthTotalMass", "depthSecondaryResidualMass"],
  ]) {
    for (let index = 0; index < state[totalName].length; index += 1) {
      const total = state[totalName][index];
      const localResidual = state[residualName][index];
      const species = reconstructSpecies(total, localResidual, fraction);
      primary += species.primary;
      secondary += species.secondary;
      residual += localResidual;
    }
  }
  return { primary, secondary, residual, total: primary + secondary };
}

function phaseSpeciesTotals(state, phase) {
  const totalPlane = state[`${phase}TotalMass`];
  const residualPlane = state[`${phase}SecondaryResidualMass`];
  let primary = 0;
  let secondary = 0;
  for (let index = 0; index < totalPlane.length; index += 1) {
    const species = reconstructSpecies(
      totalPlane[index],
      residualPlane[index],
      state.initialSecondaryFraction,
    );
    primary += species.primary;
    secondary += species.secondary;
  }
  return { primary, secondary };
}

function assertExactPositiveZeroPlane(plane) {
  for (const value of plane) {
    assert.equal(value, 0);
    assert.equal(Object.is(value, -0), false);
  }
}

function assertValidDyeState(state, recipe, { neutral = false } = {}) {
  assert.equal(state.id, recipe.id);
  assert.equal(state.revision, recipe.revision);
  assert.equal(state.componentModelVersion, "dye-component-js-r13");
  assert.equal(state.componentRecipeSchemaVersion, 12);
  assert.equal(state.stateModelVersion, dyeComponentStateModelVersion);
  assert.equal(state.stateModelVersion, "two-dye-total-residual-v2");
  assert.equal(state.initialSecondaryFraction, recipe.initialSecondaryFraction);
  for (const name of DYE_PLANES) {
    assert.ok(state[name] instanceof Float32Array, name);
    assert.equal(state[name].length, state.width * state.height, name);
    assert.ok(state[name].every(Number.isFinite), name);
  }
  for (const [totalName, residualName] of [
    ["mobileTotalMass", "mobileSecondaryResidualMass"],
    ["adsorbedTotalMass", "adsorbedSecondaryResidualMass"],
    ["depthTotalMass", "depthSecondaryResidualMass"],
  ]) {
    for (let index = 0; index < state[totalName].length; index += 1) {
      const total = state[totalName][index];
      const species = reconstructSpecies(
        total,
        state[residualName][index],
        state.initialSecondaryFraction,
      );
      assert.ok(total >= 0, `${totalName}[${index}] = ${total}`);
      assert.ok(
        species.primary >= 0,
        `${totalName}[${index}] reconstructs primary ${species.primary}`,
      );
      assert.ok(
        species.secondary >= 0,
        `${totalName}[${index}] reconstructs secondary ${species.secondary}`,
      );
    }
    if (neutral) assertExactPositiveZeroPlane(state[residualName]);
  }
  assert.ok(Math.abs(sum(state.mobileTotalMass) - state.mobileTotal) < 1e-9);
  assert.ok(Math.abs(sum(state.adsorbedTotalMass) - state.adsorbedTotal) < 1e-9);
  assert.ok(Math.abs(sum(state.depthTotalMass) - state.depthTotal) < 1e-9);
  assert.equal(
    state.totalMass,
    state.mobileTotal + state.adsorbedTotal + state.depthTotal,
  );
}

function fillTwoCellState(simulation, {
  water = [1, 0.2],
  total = [0.4, 0.1],
  residual = [0, 0],
} = {}) {
  for (const plane of [
    simulation.water,
    simulation.mobile,
    simulation.fixed,
    simulation.nextWater,
    simulation.nextMobile,
    simulation.materialComponentMobile,
    simulation.materialComponentFixed,
    simulation.nextMaterialComponentMobile,
    simulation.materialComponentMobileResidual,
    simulation.materialComponentFixedResidual,
    simulation.nextMaterialComponentMobileResidual,
  ]) plane.fill(0);
  const first = simulation.width + 1;
  const second = first + 1;
  simulation.water[first] = water[0];
  simulation.water[second] = water[1];
  simulation.mobile[first] = total[0];
  simulation.mobile[second] = total[1];
  simulation.materialComponentMobile[first] = total[0];
  simulation.materialComponentMobile[second] = total[1];
  simulation.materialComponentMobileResidual[first] = residual[0];
  simulation.materialComponentMobileResidual[second] = residual[1];
  return { first, second };
}

test("component-off keeps legacy ordinary bytes and performs no A7 allocation", () => {
  const baseline = runSimulation();
  const explicitOff = runSimulation(null);
  for (const plane of ["water", "mobile", "fixed"]) {
    assert.deepEqual(explicitOff[plane], baseline[plane]);
  }
  assert.deepEqual(explicitOff.createPaperDepthState(), baseline.createPaperDepthState());
  assert.equal(explicitOff.createDyeComponentState(), null);
  assert.equal(explicitOff.dyeComponentMobile, null);
  assert.equal(explicitOff.dyeComponentMobileResidual, null);
  assert.equal(explicitOff.dyeTransportScratch, null);
});

test("r13 deposit partitions ordinary dye without depositing extra mass", () => {
  const baseline = depositSimulation();
  const component = depositSimulation(ACTIVE_DYE_COMPONENT_RECIPE);
  assert.deepEqual(component.water, baseline.water);
  assert.deepEqual(component.mobile, baseline.mobile);
  assert.deepEqual(component.fixed, baseline.fixed);
  assert.deepEqual(component.materialComponentMobile, baseline.mobile);
  assert.equal(sum(component.materialComponentMobile), sum(baseline.mobile));
  assertExactPositiveZeroPlane(component.materialComponentMobileResidual);
  assertExactPositiveZeroPlane(component.materialComponentFixedResidual);
  assertValidDyeState(
    component.createDyeComponentState(),
    ACTIVE_DYE_COMPONENT_RECIPE,
  );
});

test("repeated dye deposits require the same complete canonical recipe", () => {
  const deposit = makeDeposit(12, 12);
  const recipe = freezeDyeComponentRecipe({
    ...ACTIVE_DYE_COMPONENT_RECIPE,
    id: "custom-repeat-deposit-contract",
    revision: 1,
  });
  const simulation = new WetInkSimulation(
    deposit.width,
    deposit.height,
    DEFAULT_SURFACE_SEED,
  );
  const depositWith = (dyeComponentRecipe) => simulation.depositMask(deposit, {
    waterLoad: ORDINARY_GREEN_RECIPE_R12.keyboardDeposit.waterLoad,
    pigmentLoad: ORDINARY_GREEN_RECIPE_R12.keyboardDeposit.pigmentLoad,
    seed: 123,
    ...(dyeComponentRecipe === null ? {} : { dyeComponentRecipe }),
  });

  depositWith(recipe);
  // Equality is canonical value equality, not object identity.
  depositWith({ ...recipe });

  for (const differentRecipe of [
    freezeDyeComponentRecipe({
      ...recipe,
      initialSecondaryFraction: recipe.initialSecondaryFraction + 0.05,
    }),
    freezeDyeComponentRecipe({
      ...recipe,
      primaryAdsorptionRate: recipe.primaryAdsorptionRate + 0.05,
      secondaryDesorptionRate: recipe.secondaryDesorptionRate + 0.0004,
    }),
  ]) {
    const before = snapshotDepositState(simulation);
    assert.throws(
      () => depositWith(differentRecipe),
      /different canonical dye component recipes/,
    );
    assert.deepEqual(snapshotDepositState(simulation), before);
  }

  const beforeMissingRecipe = snapshotDepositState(simulation);
  assert.throws(
    () => depositWith(null),
    /Every deposit after dye activation requires the same canonical dye component recipe/,
  );
  assert.deepEqual(snapshotDepositState(simulation), beforeMissingRecipe);
});

test("equal coefficients keep R bitwise positive zero on every paper and step", () => {
  for (const surfaceRecipe of [
    PAPER_SURFACE_SMOOTH_R1,
    PAPER_SURFACE_BALANCED_R2,
    PAPER_SURFACE_ABSORBENT_R4,
  ]) {
    const simulation = depositSimulation(NEUTRAL_DYE_RECIPE);
    const steps = stepCountFor(surfaceRecipe);
    for (let index = 0; index < steps; index += 1) {
      simulation.stepSurface(
        surfaceRecipe.keyboard.stepMilliseconds,
        surfaceRecipe,
      );
      assertValidDyeState(
        simulation.createDyeComponentState(),
        NEUTRAL_DYE_RECIPE,
        { neutral: true },
      );
    }
  }
});

test("non-depth papers expose explicit zero depth total and residual planes", () => {
  for (const surfaceRecipe of [
    PAPER_SURFACE_SMOOTH_R1,
    PAPER_SURFACE_BALANCED_R2,
  ]) {
    const state = runSimulation(
      ACTIVE_DYE_COMPONENT_RECIPE,
      surfaceRecipe,
    ).createDyeComponentState();
    assertExactPositiveZeroPlane(state.depthTotalMass);
    assertExactPositiveZeroPlane(state.depthSecondaryResidualMass);
  }
});

test("two-cell face transfers are equal/opposite and keep both donors bounded", () => {
  const deposit = makeDeposit(4, 3);
  const simulation = depositSimulation(FACE_ONLY_DIFFERENTIAL_RECIPE, deposit);
  const { first, second } = fillTwoCellState(simulation, {
    water: [1.2, 0.08],
    total: [0.5, 0.07],
    residual: [-0.04, 0.01],
  });
  const before = speciesTotals(simulation.createDyeComponentState());
  simulation.stepSurface(
    PAPER_SURFACE_BALANCED_R2.keyboard.stepMilliseconds,
    PAPER_SURFACE_BALANCED_R2,
  );
  const state = simulation.createDyeComponentState();
  const after = speciesTotals(state);
  const budget = float32Budget(before.total, 1);
  assert.ok(Math.abs(after.primary - before.primary) <= budget);
  assert.ok(Math.abs(after.secondary - before.secondary) <= budget);
  assertValidDyeState(state, FACE_ONLY_DIFFERENTIAL_RECIPE);
  const firstSpecies = reconstructSpecies(
    state.mobileTotalMass[first],
    state.mobileSecondaryResidualMass[first],
    state.initialSecondaryFraction,
  );
  const secondSpecies = reconstructSpecies(
    state.mobileTotalMass[second],
    state.mobileSecondaryResidualMass[second],
    state.initialSecondaryFraction,
  );
  assert.ok(firstSpecies.primary >= 0);
  assert.ok(firstSpecies.secondary >= 0);
  assert.ok(secondSpecies.primary >= 0);
  assert.ok(secondSpecies.secondary >= 0);
});

test("extreme dispersion donor remains reconstructably nonnegative", () => {
  const extreme = freezeDyeComponentRecipe({
    ...FACE_ONLY_DIFFERENTIAL_RECIPE,
    id: "extreme-donor-control",
    primaryDiffusivity: 1,
    secondaryDiffusivity: 0.65,
  });
  const simulation = depositSimulation(extreme, makeDeposit(4, 3));
  fillTwoCellState(simulation, {
    water: [0.01, 1.3],
    total: [0.7, 0],
    residual: [0.12, 0],
  });
  simulation.stepSurface(
    PAPER_SURFACE_BALANCED_R2.keyboard.stepMilliseconds,
    PAPER_SURFACE_BALANCED_R2,
  );
  assertValidDyeState(simulation.createDyeComponentState(), extreme);
});

test("uniform wetness and concentration produce zero A7 face flux", () => {
  const simulation = depositSimulation(
    FACE_ONLY_DIFFERENTIAL_RECIPE,
    makeDeposit(4, 3),
  );
  const { first, second } = fillTwoCellState(simulation, {
    water: [0.8, 0.8],
    total: [0.32, 0.32],
    residual: [0.04, 0.04],
  });
  const beforeTotal = [
    simulation.materialComponentMobile[first],
    simulation.materialComponentMobile[second],
  ];
  const beforeResidual = [
    simulation.materialComponentMobileResidual[first],
    simulation.materialComponentMobileResidual[second],
  ];
  simulation.stepSurface(
    PAPER_SURFACE_BALANCED_R2.keyboard.stepMilliseconds,
    PAPER_SURFACE_BALANCED_R2,
  );
  assert.deepEqual(
    [
      simulation.materialComponentMobile[first],
      simulation.materialComponentMobile[second],
    ],
    beforeTotal,
  );
  assert.deepEqual(
    [
      simulation.materialComponentMobileResidual[first],
      simulation.materialComponentMobileResidual[second],
    ],
    beforeResidual,
  );
});

test("evaporation changes water only when A7 transport and reaction are zero", () => {
  const simulation = depositSimulation(
    NO_TRANSPORT_REACTION_RECIPE,
    makeDeposit(4, 3),
  );
  const { first, second } = fillTwoCellState(simulation, {
    water: [0.8, 0.8],
    total: [0.32, 0.32],
    residual: [0, 0],
  });
  const waterBefore = [simulation.water[first], simulation.water[second]];
  const totalBefore = new Float32Array(simulation.materialComponentMobile);
  const residualBefore = new Float32Array(
    simulation.materialComponentMobileResidual,
  );
  simulation.stepSurface(
    PAPER_SURFACE_BALANCED_R2.keyboard.stepMilliseconds,
    PAPER_SURFACE_BALANCED_R2,
  );
  assert.notDeepEqual(
    [simulation.water[first], simulation.water[second]],
    waterBefore,
  );
  assert.deepEqual(simulation.materialComponentMobile, totalBefore);
  assert.deepEqual(simulation.materialComponentMobileResidual, residualBefore);
});

test("ghost mass is no-flux and does not react", () => {
  const simulation = depositSimulation(
    ACTIVE_DYE_COMPONENT_RECIPE,
    makeDeposit(8, 6),
  );
  const ghost = 0;
  simulation.materialComponentMobile[ghost] = 0.2;
  simulation.materialComponentMobileResidual[ghost] = 0.01;
  simulation.materialComponentFixed[ghost] = 0.3;
  simulation.materialComponentFixedResidual[ghost] = -0.01;
  const before = {
    mobile: simulation.materialComponentMobile[ghost],
    mobileResidual: simulation.materialComponentMobileResidual[ghost],
    fixed: simulation.materialComponentFixed[ghost],
    fixedResidual: simulation.materialComponentFixedResidual[ghost],
  };
  simulation.stepSurface(
    PAPER_SURFACE_BALANCED_R2.keyboard.stepMilliseconds,
    PAPER_SURFACE_BALANCED_R2,
  );
  assert.deepEqual({
    mobile: simulation.materialComponentMobile[ghost],
    mobileResidual: simulation.materialComponentMobileResidual[ghost],
    fixed: simulation.materialComponentFixed[ghost],
    fixedResidual: simulation.materialComponentFixedResidual[ghost],
  }, before);
});

test("each species is globally conserved through transport, depth and reaction", () => {
  for (const surfaceRecipe of [
    PAPER_SURFACE_SMOOTH_R1,
    PAPER_SURFACE_BALANCED_R2,
    PAPER_SURFACE_ABSORBENT_R4,
  ]) {
    const simulation = depositSimulation(ACTIVE_DYE_COMPONENT_RECIPE);
    const before = speciesTotals(simulation.createDyeComponentState());
    const steps = stepCountFor(surfaceRecipe);
    for (let index = 0; index < steps; index += 1) {
      simulation.stepSurface(
        surfaceRecipe.keyboard.stepMilliseconds,
        surfaceRecipe,
      );
      assertValidDyeState(
        simulation.createDyeComponentState(),
        ACTIVE_DYE_COMPONENT_RECIPE,
      );
    }
    const after = speciesTotals(simulation.createDyeComponentState());
    const budget = float32Budget(before.total, steps);
    assert.ok(
      Math.abs(after.primary - before.primary) <= budget,
      `${surfaceRecipe.id} primary drift ${after.primary - before.primary}`,
    );
    assert.ok(
      Math.abs(after.secondary - before.secondary) <= budget,
      `${surfaceRecipe.id} secondary drift ${after.secondary - before.secondary}`,
    );
  }
});

test("active coefficients deterministically create signed separation", () => {
  const first = runSimulation(ACTIVE_DYE_COMPONENT_RECIPE);
  const second = runSimulation(ACTIVE_DYE_COMPONENT_RECIPE);
  const state = first.createDyeComponentState();
  assert.deepEqual(second.createDyeComponentState(), state);
  assert.deepEqual(second.dyeTransportScratch, first.dyeTransportScratch);
  let positive = 0;
  let negative = 0;
  for (let index = 0; index < state.width * state.height; index += 1) {
    const residual = state.mobileSecondaryResidualMass[index]
      + state.adsorbedSecondaryResidualMass[index]
      + state.depthSecondaryResidualMass[index];
    if (residual > 1e-8) positive += 1;
    if (residual < -1e-8) negative += 1;
  }
  const totals = speciesTotals(state);
  assert.ok(positive > 0);
  assert.ok(negative > 0);
  assert.ok(Math.abs(totals.residual) <= float32Budget(totals.total, 16));
});

test("secondary reaches beyond contact farther while primary adsorbs more", () => {
  const deposit = makeDeposit();
  const state = runSimulation(
    ACTIVE_DYE_COMPONENT_RECIPE,
    PAPER_SURFACE_BALANCED_R2,
    deposit,
  ).createDyeComponentState();
  let primaryOutside = 0;
  let secondaryOutside = 0;
  for (let index = 0; index < state.width * state.height; index += 1) {
    if (deposit.data[index * 4 + 3] !== 0) continue;
    for (const [totalName, residualName] of [
      ["mobileTotalMass", "mobileSecondaryResidualMass"],
      ["adsorbedTotalMass", "adsorbedSecondaryResidualMass"],
    ]) {
      const species = reconstructSpecies(
        state[totalName][index],
        state[residualName][index],
        state.initialSecondaryFraction,
      );
      primaryOutside += species.primary;
      secondaryOutside += species.secondary;
    }
  }
  const totals = speciesTotals(state);
  const adsorbed = phaseSpeciesTotals(state, "adsorbed");
  assert.ok(
    secondaryOutside / totals.secondary > primaryOutside / totals.primary,
  );
  assert.ok(
    adsorbed.primary / totals.primary > adsorbed.secondary / totals.secondary,
  );
});

test("dye path preserves ordinary mass, alpha, depth and coverage bytes", () => {
  for (const surfaceRecipe of [
    PAPER_SURFACE_BALANCED_R2,
    PAPER_SURFACE_ABSORBENT_R4,
  ]) {
    const baseline = runSimulation(null, surfaceRecipe);
    const component = runSimulation(ACTIVE_DYE_COMPONENT_RECIPE, surfaceRecipe);
    for (const plane of ["water", "mobile", "fixed"]) {
      assert.deepEqual(component[plane], baseline[plane]);
    }
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
  }

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
    ACTIVE_DYE_COMPONENT_RECIPE,
  );
  assert.deepEqual(component.coverage, ordinary.coverage);
  assert.deepEqual(component.densityTransport, ordinary.densityTransport);
  assert.deepEqual(component.paperDepth, ordinary.paperDepth);
  assertValidDyeState(component.dyeComponent, ACTIVE_DYE_COMPONENT_RECIPE);
});

test("signed glyph Density does not alter A7 species transport", () => {
  const deposit = makeDeposit();
  const makeTransport = (ratio) => {
    const signedNumerator = new Float32Array(deposit.width * deposit.height);
    const pigmentWeight = new Float32Array(deposit.width * deposit.height);
    for (let index = 0; index < pigmentWeight.length; index += 1) {
      if (deposit.data[index * 4 + 3] === 0) continue;
      pigmentWeight[index] = 1;
      signedNumerator[index] = ratio;
    }
    return {
      width: deposit.width,
      height: deposit.height,
      signedNumerator,
      pigmentWeight,
    };
  };
  const positive = createKeyboardSurfaceState(
    deposit,
    PAPER_SURFACE_BALANCED_R2,
    DEFAULT_SURFACE_SEED,
    ORDINARY_GREEN_RECIPE_R12,
    makeTransport(0.8),
    ACTIVE_DYE_COMPONENT_RECIPE,
  );
  const negative = createKeyboardSurfaceState(
    deposit,
    PAPER_SURFACE_BALANCED_R2,
    DEFAULT_SURFACE_SEED,
    ORDINARY_GREEN_RECIPE_R12,
    makeTransport(-0.8),
    ACTIVE_DYE_COMPONENT_RECIPE,
  );
  assert.deepEqual(positive.dyeComponent, negative.dyeComponent);
  assert.notDeepEqual(
    positive.densityTransport.signedNumerator,
    negative.densityTransport.signedNumerator,
  );
});

test("invalid or historical state recipe fails before deposit mutation", () => {
  const deposit = makeDeposit(12, 12);
  for (const invalidRecipe of [
    EDGE_DYE_COMPONENT_RECIPE_R12,
    { ...ACTIVE_DYE_COMPONENT_RECIPE, primaryDiffusivity: NaN },
  ]) {
    const simulation = new WetInkSimulation(
      deposit.width,
      deposit.height,
      DEFAULT_SURFACE_SEED,
    );
    assert.throws(() => simulation.depositMask(deposit, {
      waterLoad: ORDINARY_GREEN_RECIPE_R12.keyboardDeposit.waterLoad,
      pigmentLoad: ORDINARY_GREEN_RECIPE_R12.keyboardDeposit.pigmentLoad,
      seed: 123,
      dyeComponentRecipe: invalidRecipe,
    }));
    assert.ok(simulation.water.every((value) => value === 0));
    assert.ok(simulation.mobile.every((value) => value === 0));
    assert.equal(simulation.dyeComponentMobile, null);
    assert.equal(simulation.dyeTransportScratch, null);
  }
});

test("A7 scratch is lazy, reused, bounded to cell planes and never public", () => {
  const off = depositSimulation();
  off.stepSurface(
    PAPER_SURFACE_BALANCED_R2.keyboard.stepMilliseconds,
    PAPER_SURFACE_BALANCED_R2,
  );
  assert.equal(off.dyeTransportScratch, null);

  const simulation = depositSimulation(ACTIVE_DYE_COMPONENT_RECIPE);
  assert.equal(simulation.dyeTransportScratch, null);
  simulation.stepSurface(
    PAPER_SURFACE_BALANCED_R2.keyboard.stepMilliseconds,
    PAPER_SURFACE_BALANCED_R2,
  );
  const scratch = simulation.dyeTransportScratch;
  assert.deepEqual(Object.keys(scratch).sort(), [
    "outgoingPrimary",
    "outgoingSecondary",
    "outgoingWater",
    "primaryDelta",
    "secondaryDelta",
  ]);
  for (const plane of Object.values(scratch)) {
    assert.ok(plane instanceof Float64Array);
    assert.equal(plane.length, simulation.length);
  }
  const references = Object.values(scratch);
  simulation.stepSurface(
    PAPER_SURFACE_BALANCED_R2.keyboard.stepMilliseconds,
    PAPER_SURFACE_BALANCED_R2,
  );
  assert.equal(simulation.dyeTransportScratch, scratch);
  assert.deepEqual(Object.values(simulation.dyeTransportScratch), references);

  const state = simulation.createDyeComponentState();
  const publicPlanes = Object.entries(state)
    .filter(([, value]) => ArrayBuffer.isView(value))
    .map(([name]) => name)
    .sort();
  assert.deepEqual(publicPlanes, [...DYE_PLANES].sort());
});

test("maximum practical grid retains exactly six public Float32 dye planes", () => {
  const width = 320;
  const height = 240;
  const simulation = depositSimulation(
    ACTIVE_DYE_COMPONENT_RECIPE,
    makeDeposit(width, height),
  );
  simulation.stepSurface(
    PAPER_SURFACE_ABSORBENT_R4.keyboard.stepMilliseconds,
    PAPER_SURFACE_ABSORBENT_R4,
  );
  const state = simulation.createDyeComponentState();
  const planes = DYE_PLANES.map((name) => state[name]);
  assert.ok(planes.every((plane) => plane instanceof Float32Array));
  assert.equal(
    planes.reduce((total, plane) => total + plane.byteLength, 0),
    width * height * 6 * Float32Array.BYTES_PER_ELEMENT,
  );
  assert.ok(
    Object.keys(state).every((name) => !name.toLowerCase().includes("face")),
  );
});
