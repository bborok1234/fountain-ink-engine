import assert from "node:assert/strict";
import test from "node:test";
import {
  EDGE_DYE_COMPONENT_RECIPE_R1,
  EDGE_DYE_COMPONENT_RECIPE_R2,
  EDGE_DYE_COMPONENT_RECIPE_R3,
  assertDyeComponentRecipeCompatible,
  dyeComponentModelVersion,
  dyeComponentRecipeSchemaVersion,
  parseDyeComponentRecipe,
  serializeDyeComponentRecipe,
  validateDyeComponentRecipe,
} from "../src/dye-components/index.js";

test("edge dye component revisions have independent canonical identities", () => {
  assert.equal(dyeComponentModelVersion, "dye-component-js-r3");
  assert.equal(dyeComponentRecipeSchemaVersion, 2);
  assert.equal(EDGE_DYE_COMPONENT_RECIPE_R1.id, "edge-dye-study");
  assert.equal(EDGE_DYE_COMPONENT_RECIPE_R1.revision, 1);
  assert.equal(validateDyeComponentRecipe(EDGE_DYE_COMPONENT_RECIPE_R1), true);
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
  assert.equal(EDGE_DYE_COMPONENT_RECIPE_R2.revision, 2);
  assert.throws(
    () => assertDyeComponentRecipeCompatible(EDGE_DYE_COMPONENT_RECIPE_R1),
    /incompatible with dye-component-js-r3/,
  );
  assert.equal(
    serializeDyeComponentRecipe(EDGE_DYE_COMPONENT_RECIPE_R2),
    "{\"componentModelVersion\":\"dye-component-js-r2\",\"componentRecipeSchemaVersion\":1,\"id\":\"edge-dye-study\",\"massFraction\":0.32,\"mobilityMultiplier\":1.45,\"retentionMultiplier\":0.62,\"revision\":2}",
  );
  assert.throws(
    () => assertDyeComponentRecipeCompatible(EDGE_DYE_COMPONENT_RECIPE_R2),
    /incompatible with dye-component-js-r3/,
  );
  assert.equal(EDGE_DYE_COMPONENT_RECIPE_R3.revision, 3);
  assert.equal(
    assertDyeComponentRecipeCompatible(EDGE_DYE_COMPONENT_RECIPE_R3),
    true,
  );
  assert.equal(
    serializeDyeComponentRecipe(EDGE_DYE_COMPONENT_RECIPE_R3),
    "{\"componentModelVersion\":\"dye-component-js-r3\",\"componentRecipeSchemaVersion\":2,\"edgeEnrichmentThreshold\":0.02,\"edgeMassGain\":200,\"id\":\"edge-dye-study\",\"massFraction\":0.32,\"mobilityMultiplier\":1.45,\"retentionMultiplier\":0.62,\"revision\":3}",
  );
});

test("registered dye component identity rejects silent retuning", () => {
  const impostor = {
    ...EDGE_DYE_COMPONENT_RECIPE_R3,
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
  const accessor = { ...EDGE_DYE_COMPONENT_RECIPE_R3 };
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
    ["edgeEnrichmentThreshold", 1.01],
    ["edgeMassGain", Number.POSITIVE_INFINITY],
  ]) {
    assert.throws(
      () => validateDyeComponentRecipe({
        ...EDGE_DYE_COMPONENT_RECIPE_R3,
        [key]: value,
      }),
      new RegExp(key),
    );
  }
});
