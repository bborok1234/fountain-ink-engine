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

test("publishes three independent engine version axes", () => {
  assert.equal(engineModelVersion, "ordinary-js-r2");
  assert.equal(recipeSchemaVersion, 1);
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
    recipe: { nib: "M", ink: "ordinary-blue", surface: "middle" },
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
    recipe: {},
  }));
  assert.throws(() => createExperimentRecord({
    id: "E-x",
    hypothesis: "invalid seed",
    seed: -1,
    recipe: {},
  }));
  assert.throws(() => createExperimentRecord({
    id: "E-x",
    hypothesis: "invalid recipe",
    seed: 1,
    recipe: { amount: Number.NaN },
  }));
});
