import assert from "node:assert/strict";
import test from "node:test";
import {
  ENGINE_VERSIONS,
  createExperimentRecord,
  engineModelVersion,
  fixtureManifestVersion,
  recipeSchemaVersion,
  validateExperimentRecord,
} from "../src/contracts/index.js";
import {
  ORDINARY_GREEN_RECIPE_R3,
  ORDINARY_GREEN_RECIPE_R5,
  assertInkRecipeCompatible,
} from "../src/recipes/index.js";

test("publishes three independent engine version axes", () => {
  assert.equal(engineModelVersion, "ordinary-js-r6");
  assert.equal(recipeSchemaVersion, 3);
  assert.equal(fixtureManifestVersion, 1);
  assert.deepEqual(ENGINE_VERSIONS, {
    engineModelVersion,
    recipeSchemaVersion,
    fixtureManifestVersion,
  });
  assert.ok(Object.isFrozen(ENGINE_VERSIONS));
});

test("creates explicit immutable experiment records without a wall clock", () => {
  const record = createExperimentRecord({
    id: "E-002-blue-ordinary",
    hypothesis: "A blue dye curve can reuse the same geometry.",
    seed: 42,
    recipe: ORDINARY_GREEN_RECIPE_R5,
    expected: "Geometry is unchanged.",
  });
  assert.equal(validateExperimentRecord(record), true);
  assert.equal(record.recordedAt, null);
  assert.equal(record.engineModelVersion, engineModelVersion);
  assert.ok(Object.isFrozen(record));
  assert.ok(Object.isFrozen(record.recipe));
});

test("rejects implicit, invalid, or non-serializable experiment inputs", () => {
  assert.throws(() => createExperimentRecord({
    id: "",
    hypothesis: "missing id",
    seed: 1,
    recipe: ORDINARY_GREEN_RECIPE_R5,
  }));
  assert.throws(() => createExperimentRecord({
    id: "E-x",
    hypothesis: "aliased seed",
    seed: 0x1_0000_0000,
    recipe: ORDINARY_GREEN_RECIPE_R5,
  }), /unsigned 32-bit integer/);
  assert.throws(() => createExperimentRecord({
    id: "E-x",
    hypothesis: "invalid seed",
    seed: -1,
    recipe: ORDINARY_GREEN_RECIPE_R5,
  }));
  assert.throws(() => createExperimentRecord({
    id: "E-x",
    hypothesis: "invalid recipe",
    seed: 1,
    recipe: { amount: Number.NaN },
  }));
  assert.throws(() => createExperimentRecord({
    id: "E-x",
    hypothesis: "mismatched model",
    seed: 1,
    recipe: ORDINARY_GREEN_RECIPE_R5,
    engineModelVersion: "something-else",
  }), /must match/);
  assert.throws(() => createExperimentRecord({
    id: "E-x",
    hypothesis: "mismatched schema",
    seed: 1,
    recipe: ORDINARY_GREEN_RECIPE_R5,
    recipeSchemaVersion: 999,
  }), /Unsupported experiment recipeSchemaVersion/);
  assert.throws(() => createExperimentRecord({
    id: "E-x",
    hypothesis: "unknown fixture schema",
    seed: 1,
    recipe: ORDINARY_GREEN_RECIPE_R5,
    fixtureManifestVersion: 999,
  }), /Unsupported fixtureManifestVersion/);
});

test("experiment records deeply freeze a pre-frozen recipe root", () => {
  const clone = JSON.parse(JSON.stringify(ORDINARY_GREEN_RECIPE_R5));
  Object.freeze(clone);
  const record = createExperimentRecord({
    id: "E-deep-freeze",
    hypothesis: "Pre-frozen input cannot leave mutable recipe children.",
    seed: 7,
    recipe: clone,
  });
  assert.ok(Object.isFrozen(record.recipe.density));
  assert.throws(() => {
    record.recipe.density.meanBase = 0.77;
  }, TypeError);
});

test("experiment records reject a forged built-in recipe identity", () => {
  const impostor = JSON.parse(JSON.stringify(ORDINARY_GREEN_RECIPE_R5));
  impostor.density.meanBase = 0.75;
  assert.throws(() => createExperimentRecord({
    id: "E-forged-built-in",
    hypothesis: "A reserved identity cannot describe new calculations.",
    seed: 9,
    recipe: impostor,
  }), /does not match its registered definition/);
});

test("experiment metadata rejects accessors that outlive deep freezing", () => {
  let externalResult = "first";
  const observed = {};
  Object.defineProperty(observed, "result", {
    enumerable: true,
    get: () => externalResult,
  });
  assert.throws(() => createExperimentRecord({
    id: "E-accessor-observation",
    hypothesis: "Observation evidence must be immutable plain data.",
    seed: 10,
    recipe: ORDINARY_GREEN_RECIPE_R5,
    observed,
  }), /result must be an enumerable data property/);
  externalResult = "changed";
  assert.equal(observed.result, "changed");
});

test("experiment records require their complete schema as own data", () => {
  const valid = createExperimentRecord({
    id: "E-own-data",
    hypothesis: "Checkpoint fields cannot come from a polluted prototype.",
    seed: 11,
    recipe: ORDINARY_GREEN_RECIPE_R5,
  });
  const missingOwnFields = { recipe: ORDINARY_GREEN_RECIPE_R5 };
  assert.throws(
    () => validateExperimentRecord(missingOwnFields),
    /missing=id,attempt,parentExperimentId/,
  );

  const accessorRoot = { ...valid };
  Object.defineProperty(accessorRoot, "id", {
    enumerable: true,
    get: () => "E-accessor-root",
  });
  assert.throws(
    () => validateExperimentRecord(accessorRoot),
    /record\.id must be an enumerable own data property/,
  );
  assert.throws(
    () => validateExperimentRecord({
      ...valid,
      fixtureManifestVersion: 999,
    }),
    /Unsupported fixtureManifestVersion/,
  );
});

test("schema-2 experiment checkpoints remain readable without migration", () => {
  const historical = createExperimentRecord({
    id: "E-005-density-locality-r3",
    hypothesis: "A schema-2 checkpoint keeps its authored recipe unchanged.",
    seed: 0x13579bdf,
    recipe: ORDINARY_GREEN_RECIPE_R3,
  });
  assert.equal(validateExperimentRecord(historical), true);
  assert.equal(historical.recipeSchemaVersion, 2);
  assert.equal(historical.engineModelVersion, "ordinary-js-r4");
  assert.deepEqual(historical.recipe, ORDINARY_GREEN_RECIPE_R3);
  assert.throws(
    () => assertInkRecipeCompatible(historical.recipe),
    /incompatible/,
  );
});

test("schema-1 experiment checkpoints remain archival and non-renderable", () => {
  const legacyRecipe = {
    nib: "M",
    ink: "ordinary-blue",
    surface: "middle",
  };
  const legacy = createExperimentRecord({
    id: "E-001-public-schema-1",
    attempt: "A1",
    parentExperimentId: null,
    engineModelVersion: "ordinary-js-r1",
    recipeSchemaVersion: 1,
    fixtureManifestVersion: 1,
    status: "passed",
    hypothesis: "The first public checkpoint remains readable.",
    seed: 1_787_200_000_000,
    recipe: legacyRecipe,
    expected: "archival only",
    observed: "preserved",
    lesson: null,
    nextMethod: null,
    recordedAt: null,
  });
  assert.equal(validateExperimentRecord(legacy), true);
  assert.equal(legacy.seed, 1_787_200_000_000);
  assert.deepEqual(legacy.recipe, legacyRecipe);
  assert.ok(Object.isFrozen(legacy.recipe));
  assert.throws(
    () => assertInkRecipeCompatible(legacy.recipe),
    /invalid keys/,
  );
});
