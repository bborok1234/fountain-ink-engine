import assert from "node:assert/strict";
import test from "node:test";
import {
  EDGE_DYE_COMPONENT_RECIPE_R14,
  dyeComponentStateModelVersion,
} from "fountain-ink-engine/dye-components";
import { ORDINARY_GREEN_RECIPE_R12 } from "fountain-ink-engine/recipes";
import {
  PAPER_SURFACE_ABSORBENT_R4,
  PAPER_SURFACE_BALANCED_R2,
  PAPER_SURFACE_SMOOTH_R1,
} from "fountain-ink-engine/surface-recipes";
import {
  DEFAULT_SURFACE_SEED,
  WetInkSimulation,
} from "fountain-ink-engine/surface";

const WIDTH = 56;
const HEIGHT = 40;
const FLOAT32_EPSILON = 2 ** -23;
const PLANE_PAIRS = Object.freeze([
  ["mobileTotalMass", "mobileSecondaryResidualMass"],
  ["adsorbedTotalMass", "adsorbedSecondaryResidualMass"],
  ["depthTotalMass", "depthSecondaryResidualMass"],
]);
const DYE_PLANES = Object.freeze(PLANE_PAIRS.flat());
const SURFACES = Object.freeze([
  { name: "smooth", recipe: PAPER_SURFACE_SMOOTH_R1 },
  { name: "balanced", recipe: PAPER_SURFACE_BALANCED_R2 },
  { name: "absorbent", recipe: PAPER_SURFACE_ABSORBENT_R4 },
]);
const WIDTHS = Object.freeze([
  { name: "thin", radius: 1.2 },
  { name: "medium", radius: 2.8 },
  { name: "broad", radius: 4.8 },
]);

function makeMask() {
  return {
    width: WIDTH,
    height: HEIGHT,
    data: new Uint8ClampedArray(WIDTH * HEIGHT * 4),
  };
}

function paintCapsule(mask, start, end, radius, profile = () => 1) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  for (let y = 0; y < mask.height; y += 1) {
    for (let x = 0; x < mask.width; x += 1) {
      const projection = lengthSquared === 0
        ? 0
        : ((x - start.x) * dx + (y - start.y) * dy) / lengthSquared;
      const t = Math.max(0, Math.min(1, projection));
      const nearestX = start.x + t * dx;
      const nearestY = start.y + t * dy;
      const distance = Math.hypot(x - nearestX, y - nearestY);
      const coverage = Math.max(0, Math.min(1, radius + 0.5 - distance));
      if (coverage === 0) continue;
      const alpha = Math.round(
        255 * coverage * Math.max(0, Math.min(1, profile(t))),
      );
      const offset = (y * mask.width + x) * 4;
      mask.data[offset + 3] = Math.max(mask.data[offset + 3], alpha);
    }
  }
  return mask;
}

function makePasses(shape, radius) {
  if (shape === "start-stop") {
    return [paintCapsule(
      makeMask(),
      { x: 8, y: 20 },
      { x: 47, y: 20 },
      radius,
      (t) => 0.58 + 0.32 * t + 0.1 * Math.sin(Math.PI * t) ** 2,
    )];
  }
  if (shape === "cross-junction") {
    return [
      paintCapsule(
        makeMask(),
        { x: 8, y: 20 },
        { x: 47, y: 20 },
        radius,
        (t) => 0.68 + 0.28 * t,
      ),
      paintCapsule(
        makeMask(),
        { x: 28, y: 7 },
        { x: 28, y: 33 },
        radius,
        (t) => 0.92 - 0.24 * t,
      ),
    ];
  }
  if (shape === "double-pass") {
    return [
      paintCapsule(
        makeMask(),
        { x: 7, y: 18 },
        { x: 46, y: 20 },
        radius,
        (t) => 0.62 + 0.3 * t,
      ),
      paintCapsule(
        makeMask(),
        { x: 48, y: 22 },
        { x: 11, y: 20 },
        radius,
        (t) => 0.7 + 0.24 * t,
      ),
    ];
  }
  throw new TypeError(`unknown calibration shape ${shape}`);
}

const SHAPES = Object.freeze([
  "start-stop",
  "cross-junction",
  "double-pass",
]);

function contactUnion(passes) {
  const contact = new Uint8Array(WIDTH * HEIGHT);
  for (const pass of passes) {
    for (let index = 0; index < contact.length; index += 1) {
      if (pass.data[index * 4 + 3] > 0) contact[index] = 1;
    }
  }
  return contact;
}

function stepCountFor(surfaceRecipe) {
  const response = surfaceRecipe.surfaceRecipeSchemaVersion === 1
    ? surfaceRecipe.axes.verticalUptake
      * surfaceRecipe.keyboard.stepUptakeGain
    : surfaceRecipe.axes.lateralMobility
      * surfaceRecipe.keyboard.stepMobilityGain;
  return Math.round(surfaceRecipe.keyboard.stepBase + response);
}

function runFixture(shape, widthProfile, surfaceProfile) {
  const passes = makePasses(shape, widthProfile.radius);
  const simulation = new WetInkSimulation(
    WIDTH,
    HEIGHT,
    DEFAULT_SURFACE_SEED,
  );
  for (let index = 0; index < passes.length; index += 1) {
    simulation.depositMask(passes[index], {
      waterLoad: ORDINARY_GREEN_RECIPE_R12.keyboardDeposit.waterLoad,
      pigmentLoad: ORDINARY_GREEN_RECIPE_R12.keyboardDeposit.pigmentLoad,
      seed: (DEFAULT_SURFACE_SEED ^ Math.imul(index + 1, 0x85ebca6b)) >>> 0,
      dyeComponentRecipe: EDGE_DYE_COMPONENT_RECIPE_R14,
    });
  }
  const initialState = simulation.createDyeComponentState();
  const steps = stepCountFor(surfaceProfile.recipe);
  for (let index = 0; index < steps; index += 1) {
    simulation.stepSurface(
      surfaceProfile.recipe.keyboard.stepMilliseconds,
      surfaceProfile.recipe,
    );
  }
  return {
    contact: contactUnion(passes),
    initialState,
    state: simulation.createDyeComponentState(),
    steps,
  };
}

function reconstructSpecies(total, residual, fraction) {
  return {
    primary: (1 - fraction) * total - residual,
    secondary: fraction * total + residual,
  };
}

function speciesTotals(state) {
  let primary = 0;
  let secondary = 0;
  let residual = 0;
  for (const [totalName, residualName] of PLANE_PAIRS) {
    for (let index = 0; index < state[totalName].length; index += 1) {
      const localResidual = state[residualName][index];
      const species = reconstructSpecies(
        state[totalName][index],
        localResidual,
        state.initialSecondaryFraction,
      );
      primary += species.primary;
      secondary += species.secondary;
      residual += localResidual;
    }
  }
  return { primary, secondary, residual, total: primary + secondary };
}

function float32Budget(magnitude, steps) {
  return Math.max(
    2e-6,
    Math.max(1, Math.abs(magnitude))
      * FLOAT32_EPSILON * 64 * Math.max(1, steps),
  );
}

function assertValidConservedState(result, label) {
  const { initialState, state, steps } = result;
  assert.equal(state.id, EDGE_DYE_COMPONENT_RECIPE_R14.id, label);
  assert.equal(state.revision, 14, label);
  assert.equal(state.stateModelVersion, dyeComponentStateModelVersion, label);
  assert.equal(state.width, WIDTH, label);
  assert.equal(state.height, HEIGHT, label);
  for (const name of DYE_PLANES) {
    assert.ok(state[name] instanceof Float32Array, `${label} ${name} type`);
    assert.equal(state[name].length, WIDTH * HEIGHT, `${label} ${name} length`);
    assert.ok(state[name].every(Number.isFinite), `${label} ${name} finite`);
  }
  for (const [totalName, residualName] of PLANE_PAIRS) {
    for (let index = 0; index < state[totalName].length; index += 1) {
      const total = state[totalName][index];
      const species = reconstructSpecies(
        total,
        state[residualName][index],
        state.initialSecondaryFraction,
      );
      assert.ok(total >= 0, `${label} ${totalName}[${index}] ${total}`);
      assert.ok(
        species.primary >= -FLOAT32_EPSILON,
        `${label} primary ${totalName}[${index}] ${species.primary}`,
      );
      assert.ok(
        species.secondary >= -FLOAT32_EPSILON,
        `${label} secondary ${totalName}[${index}] ${species.secondary}`,
      );
    }
  }
  const before = speciesTotals(initialState);
  const after = speciesTotals(state);
  const budget = float32Budget(before.total, steps);
  assert.ok(
    Math.abs(after.primary - before.primary) <= budget,
    `${label} primary drift ${after.primary - before.primary} > ${budget}`,
  );
  assert.ok(
    Math.abs(after.secondary - before.secondary) <= budget,
    `${label} secondary drift ${after.secondary - before.secondary} > ${budget}`,
  );
  assert.ok(
    Math.abs(after.residual) <= budget,
    `${label} residual sum ${after.residual} > ${budget}`,
  );
}

function quantile(values, fraction) {
  const ordered = [...values].sort((left, right) => left - right);
  return ordered[Math.floor((ordered.length - 1) * fraction)];
}

function isContactInterior(contact, index) {
  if (contact[index] === 0) return false;
  const x = index % WIDTH;
  const y = Math.floor(index / WIDTH);
  return x > 0
    && y > 0
    && x < WIDTH - 1
    && y < HEIGHT - 1
    && contact[index - 1] === 1
    && contact[index + 1] === 1
    && contact[index - WIDTH] === 1
    && contact[index + WIDTH] === 1;
}

function largestConnectedPatch(mask) {
  const visited = new Uint8Array(mask.length);
  let largest = 0;
  const neighbors = [
    [-1, -1], [0, -1], [1, -1],
    [-1, 0], [1, 0],
    [-1, 1], [0, 1], [1, 1],
  ];
  for (let start = 0; start < mask.length; start += 1) {
    if (mask[start] === 0 || visited[start] === 1) continue;
    visited[start] = 1;
    const pending = [start];
    let size = 0;
    while (pending.length > 0) {
      const index = pending.pop();
      size += 1;
      const x = index % WIDTH;
      const y = Math.floor(index / WIDTH);
      for (const [dx, dy] of neighbors) {
        const nextX = x + dx;
        const nextY = y + dy;
        if (
          nextX < 0
          || nextY < 0
          || nextX >= WIDTH
          || nextY >= HEIGHT
        ) continue;
        const next = nextY * WIDTH + nextX;
        if (mask[next] === 0 || visited[next] === 1) continue;
        visited[next] = 1;
        pending.push(next);
      }
    }
    largest = Math.max(largest, size);
  }
  return largest;
}

function separationMetrics(result) {
  const { contact, state } = result;
  const deltas = [];
  const indexedDeltas = [];
  let primaryOutside = 0;
  let secondaryOutside = 0;
  for (let index = 0; index < WIDTH * HEIGHT; index += 1) {
    const visibleTotal = state.mobileTotalMass[index]
      + state.adsorbedTotalMass[index];
    const visibleResidual = state.mobileSecondaryResidualMass[index]
      + state.adsorbedSecondaryResidualMass[index];
    if (visibleTotal > 1e-9) {
      const delta = visibleResidual / visibleTotal;
      deltas.push(delta);
      indexedDeltas.push([index, delta]);
    }
    if (contact[index] !== 0) continue;
    for (const [totalName, residualName] of PLANE_PAIRS) {
      const species = reconstructSpecies(
        state[totalName][index],
        state[residualName][index],
        state.initialSecondaryFraction,
      );
      primaryOutside += Math.max(0, species.primary);
      secondaryOutside += Math.max(0, species.secondary);
    }
  }
  const q05 = quantile(deltas, 0.05);
  const q95 = quantile(deltas, 0.95);
  const positiveThreshold = Math.max(1e-8, q95 * 0.25);
  const negativeThreshold = Math.min(-1e-8, q05 * 0.25);
  const positiveMask = new Uint8Array(WIDTH * HEIGHT);
  const negativeMask = new Uint8Array(WIDTH * HEIGHT);
  let meaningful = 0;
  let meaningfulInterior = 0;
  for (const [index, delta] of indexedDeltas) {
    const positive = delta >= positiveThreshold;
    const negative = delta <= negativeThreshold;
    if (positive) positiveMask[index] = 1;
    if (negative) negativeMask[index] = 1;
    if (!positive && !negative) continue;
    meaningful += 1;
    if (isContactInterior(contact, index)) meaningfulInterior += 1;
  }
  const totals = speciesTotals(state);
  return {
    q05,
    q95,
    positivePatch: largestConnectedPatch(positiveMask),
    negativePatch: largestConnectedPatch(negativeMask),
    meaningful,
    meaningfulInterior,
    outsideAdvantage:
      secondaryOutside / totals.secondary - primaryOutside / totals.primary,
  };
}

function matrixLabel(shape, widthProfile, surfaceProfile) {
  return `${shape}/${widthProfile.name}/${surfaceProfile.name}`;
}

test("R14 diagnostic matrix is deterministic, finite and species-conservative", () => {
  for (const shape of SHAPES) {
    for (const widthProfile of WIDTHS) {
      for (const surfaceProfile of SURFACES) {
        const label = matrixLabel(shape, widthProfile, surfaceProfile);
        const first = runFixture(shape, widthProfile, surfaceProfile);
        const second = runFixture(shape, widthProfile, surfaceProfile);
        for (const name of DYE_PLANES) {
          assert.deepEqual(first.state[name], second.state[name], `${label} ${name}`);
        }
        assertValidConservedState(first, label);
      }
    }
  }
});

test("R14 porous medium and broad fixtures form signed connected local patches", () => {
  for (const shape of SHAPES) {
    for (const widthProfile of WIDTHS.filter(({ name }) => name !== "thin")) {
      for (const surfaceProfile of SURFACES.filter(({ name }) => name !== "smooth")) {
        const label = matrixLabel(shape, widthProfile, surfaceProfile);
        const metrics = separationMetrics(
          runFixture(shape, widthProfile, surfaceProfile),
        );
        const evidence = `${label} ${JSON.stringify(metrics)}`;
        assert.ok(metrics.q05 < 0, evidence);
        assert.ok(metrics.q95 > 0, evidence);
        assert.ok(metrics.positivePatch >= 16, evidence);
        assert.ok(metrics.negativePatch >= 16, evidence);
        const interiorShare = metrics.meaningfulInterior / metrics.meaningful;
        assert.ok(interiorShare >= 0.15, evidence);
        assert.ok(interiorShare <= 0.85, evidence);
      }
    }
  }
});

test("R14 porous medium and broad calibration gives secondary an outside advantage", () => {
  for (const surfaceProfile of SURFACES.filter(({ name }) => name !== "smooth")) {
    for (const widthProfile of WIDTHS.filter(({ name }) => name !== "thin")) {
      const advantages = SHAPES.map((shape) => separationMetrics(
        runFixture(shape, widthProfile, surfaceProfile),
      ).outsideAdvantage);
      const evidence = `${surfaceProfile.name}/${widthProfile.name} ${JSON.stringify(advantages)}`;
      assert.ok(advantages.every((value) => value > 0), evidence);
    }
  }
});
