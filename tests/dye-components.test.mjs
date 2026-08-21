import assert from "node:assert/strict";
import test from "node:test";
import {
  EDGE_DYE_COMPONENT_RECIPE_R1,
  assertDyeComponentRecipeCompatible,
  dyeComponentModelVersion,
  dyeComponentRecipeSchemaVersion,
  parseDyeComponentRecipe,
  serializeDyeComponentRecipe,
  validateDyeComponentRecipe,
} from "../src/dye-components/index.js";

test("edge dye component has an independently versioned canonical identity", () => {
  assert.equal(dyeComponentModelVersion, "dye-component-js-r1");
  assert.equal(dyeComponentRecipeSchemaVersion, 1);
  assert.equal(EDGE_DYE_COMPONENT_RECIPE_R1.id, "edge-dye-study");
  assert.equal(EDGE_DYE_COMPONENT_RECIPE_R1.revision, 1);
  assert.equal(validateDyeComponentRecipe(EDGE_DYE_COMPONENT_RECIPE_R1), true);
  assert.equal(
    assertDyeComponentRecipeCompatible(EDGE_DYE_COMPONENT_RECIPE_R1),
    true,
  );
  assert.equal(Object.isFrozen(EDGE_DYE_COMPONENT_RECIPE_R1), true);
  assert.equal(
    serializeDyeComponentRecipe(EDGE_DYE_COMPONENT_RECIPE_R1),
    "{\"componentModelVersion\":\"dye-component-js-r1\",\"componentRecipeSchemaVersion\":1,\"id\":\"edge-dye-study\",\"massFraction\":0.32,\"mobilityMultiplier\":1.45,\"retentionMultiplier\":0.62,\"revision\":1}",
  );
  assert.deepEqual(
    parseDyeComponentRecipe(
      serializeDyeComponentRecipe(EDGE_DYE_COMPONENT_RECIPE_R1),
    ),
    EDGE_DYE_COMPONENT_RECIPE_R1,
  );
});

test("registered dye component identity rejects silent retuning", () => {
  const impostor = {
    ...EDGE_DYE_COMPONENT_RECIPE_R1,
    mobilityMultiplier: 1.8,
  };
  assert.equal(validateDyeComponentRecipe(impostor), true);
  assert.throws(
    () => assertDyeComponentRecipeCompatible(impostor),
    /does not match its registered definition/,
  );
});

test("dye component recipes reject accessors and invalid transport values", () => {
  let reads = 0;
  const accessor = { ...EDGE_DYE_COMPONENT_RECIPE_R1 };
  Object.defineProperty(accessor, "massFraction", {
    enumerable: true,
    get() {
      reads += 1;
      return 0.32;
    },
  });
  assert.throws(
    () => validateDyeComponentRecipe(accessor),
    /enumerable own data property/,
  );
  assert.equal(reads, 0);

  for (const [key, value] of [
    ["massFraction", -0.01],
    ["mobilityMultiplier", Number.NaN],
    ["retentionMultiplier", 2.01],
  ]) {
    assert.throws(
      () => validateDyeComponentRecipe({
        ...EDGE_DYE_COMPONENT_RECIPE_R1,
        [key]: value,
      }),
      new RegExp(key),
    );
  }
});
