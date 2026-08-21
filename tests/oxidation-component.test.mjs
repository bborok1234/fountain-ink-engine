import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import {
  OXIDATION_COMPONENT_RECIPE_R1,
  assertOxidationComponentRecipeCompatible,
  createOxidationState,
  freezeOxidationComponentRecipe,
  readOxidationObservation,
  serializeOxidationComponentRecipe,
} from "fountain-ink-engine/oxidation-components";
import { compositeOxidationOptical } from "fountain-ink-engine/optical";

function observation(committedAtMilliseconds, observedAtMilliseconds) {
  return { committedAtMilliseconds, observedAtMilliseconds };
}

function rgba(data) {
  return { width: 2, height: 1, data: new Uint8ClampedArray(data) };
}

function concentration(first = 0.4, second = 0.9) {
  return { width: 2, height: 1, data: new Float32Array([first, second]) };
}

test("registered oxidation recipe is canonical, frozen, and independently pinned", () => {
  const serialized = serializeOxidationComponentRecipe(
    OXIDATION_COMPONENT_RECIPE_R1,
  );
  assert.equal(Object.isFrozen(OXIDATION_COMPONENT_RECIPE_R1), true);
  assert.equal(
    createHash("sha256").update(serialized).digest("hex"),
    "7e3fd320b046aa089f11ad37d328ef106816bbfcf8844b834abc6296cc9d51a8",
  );
  assert.equal(
    assertOxidationComponentRecipeCompatible(OXIDATION_COMPONENT_RECIPE_R1),
    true,
  );
});

test("custom oxidation recipes remain explicit while registered identity rejects retuning", () => {
  const custom = freezeOxidationComponentRecipe({
    ...OXIDATION_COMPONENT_RECIPE_R1,
    id: "workbench-oxidation",
    reactionHalfLifeMilliseconds: 45_000,
  });
  assert.equal(assertOxidationComponentRecipeCompatible(custom), true);
  assert.throws(() => assertOxidationComponentRecipeCompatible({
    ...OXIDATION_COMPONENT_RECIPE_R1,
    reactionHalfLifeMilliseconds: 45_000,
  }), /does not match/);
});

test("explicit commit and observation times determine deterministic progress", () => {
  const fresh = createOxidationState({
    oxidationComponentRecipe: OXIDATION_COMPONENT_RECIPE_R1,
    oxidationObservation: observation(10_000, 10_000),
  });
  const half = createOxidationState({
    oxidationComponentRecipe: OXIDATION_COMPONENT_RECIPE_R1,
    oxidationObservation: observation(10_000, 100_000),
  });
  const shifted = createOxidationState({
    oxidationComponentRecipe: OXIDATION_COMPONENT_RECIPE_R1,
    oxidationObservation: observation(1_000_000, 1_090_000),
  });
  assert.equal(fresh.elapsedMilliseconds, 0);
  assert.equal(fresh.progress, 0);
  assert.equal(half.elapsedMilliseconds, 90_000);
  assert.equal(half.progress, 0.5);
  assert.deepEqual(
    { elapsed: shifted.elapsedMilliseconds, progress: shifted.progress },
    { elapsed: half.elapsedMilliseconds, progress: half.progress },
  );
});

test("oxidation changes RGB toward settled color without changing alpha", () => {
  const base = rgba([62, 92, 67, 204, 31, 57, 42, 242]);
  const fresh = rgba(new Uint8ClampedArray(8));
  const half = rgba(new Uint8ClampedArray(8));
  const settled = rgba(new Uint8ClampedArray(8));
  const renderAt = (elapsedMilliseconds, output) => compositeOxidationOptical({
    pixelWidth: 2,
    pixelHeight: 1,
    baseRgba: base,
    concentration: concentration(),
    oxidationState: createOxidationState({
      oxidationComponentRecipe: OXIDATION_COMPONENT_RECIPE_R1,
      oxidationObservation: observation(0, elapsedMilliseconds),
    }),
    oxidationComponentRecipe: OXIDATION_COMPONENT_RECIPE_R1,
    output,
  });
  renderAt(0, fresh);
  renderAt(90_000, half);
  renderAt(900_000, settled);
  assert.deepEqual(
    [fresh.data[3], fresh.data[7]],
    [base.data[3], base.data[7]],
  );
  assert.deepEqual(
    [half.data[3], half.data[7]],
    [base.data[3], base.data[7]],
  );
  assert.deepEqual(
    [settled.data[3], settled.data[7]],
    [base.data[3], base.data[7]],
  );
  const sum = (value, offset) => value.data[offset]
    + value.data[offset + 1]
    + value.data[offset + 2];
  assert.ok(sum(fresh, 0) > sum(half, 0));
  assert.ok(sum(half, 0) > sum(settled, 0));
  assert.ok(sum(fresh, 4) > sum(half, 4));
  assert.ok(sum(half, 4) > sum(settled, 4));
});

test("invalid time and optical inputs fail before output mutation", () => {
  assert.throws(() => readOxidationObservation(observation(10, 9)), /at or after/);
  const output = rgba(new Uint8ClampedArray(8).fill(17));
  const before = new Uint8ClampedArray(output.data);
  assert.throws(() => compositeOxidationOptical({
    pixelWidth: 2,
    pixelHeight: 1,
    baseRgba: rgba([62, 92, 67, 204, 31, 57, 42, 242]),
    concentration: concentration(),
    oxidationState: { progress: 2 },
    oxidationComponentRecipe: OXIDATION_COMPONENT_RECIPE_R1,
    output,
  }), /0\.\.\.1/);
  assert.deepEqual(output.data, before);
});

test("oxidation recipe and observation accessors fail without getter reads", () => {
  let getterReads = 0;
  const forgedRecipe = { ...OXIDATION_COMPONENT_RECIPE_R1 };
  Object.defineProperty(forgedRecipe, "mixMaximum", {
    enumerable: true,
    get() {
      getterReads += 1;
      return 0.88;
    },
  });
  assert.throws(
    () => assertOxidationComponentRecipeCompatible(forgedRecipe),
    /own data property/,
  );
  const forgedObservation = observation(0, 90_000);
  Object.defineProperty(forgedObservation, "observedAtMilliseconds", {
    enumerable: true,
    get() {
      getterReads += 1;
      return 90_000;
    },
  });
  assert.throws(() => readOxidationObservation(forgedObservation), /own data property/);
  assert.equal(getterReads, 0);
});
