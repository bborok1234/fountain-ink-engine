import assert from "node:assert/strict";
import test from "node:test";
import {
  EDGE_DYE_COMPONENT_RECIPE_R1,
  EDGE_DYE_COMPONENT_RECIPE_R2,
  EDGE_DYE_COMPONENT_RECIPE_R3,
  EDGE_DYE_COMPONENT_RECIPE_R4,
  EDGE_DYE_COMPONENT_RECIPE_R5,
  assertDyeComponentRecipeCompatible,
  dyeComponentModelVersion,
  dyeComponentRecipeSchemaVersion,
  parseDyeComponentRecipe,
  serializeDyeComponentRecipe,
  validateDyeComponentRecipe,
} from "../src/dye-components/index.js";

test("edge dye component revisions have independent canonical identities", () => {
  assert.equal(dyeComponentModelVersion, "dye-component-js-r5");
  assert.equal(dyeComponentRecipeSchemaVersion, 4);
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
    /incompatible with dye-component-js-r5/,
  );
  assert.equal(
    serializeDyeComponentRecipe(EDGE_DYE_COMPONENT_RECIPE_R2),
    "{\"componentModelVersion\":\"dye-component-js-r2\",\"componentRecipeSchemaVersion\":1,\"id\":\"edge-dye-study\",\"massFraction\":0.32,\"mobilityMultiplier\":1.45,\"retentionMultiplier\":0.62,\"revision\":2}",
  );
  assert.throws(
    () => assertDyeComponentRecipeCompatible(EDGE_DYE_COMPONENT_RECIPE_R2),
    /incompatible with dye-component-js-r5/,
  );
  assert.equal(EDGE_DYE_COMPONENT_RECIPE_R3.revision, 3);
  assert.equal(
    serializeDyeComponentRecipe(EDGE_DYE_COMPONENT_RECIPE_R3),
    "{\"componentModelVersion\":\"dye-component-js-r3\",\"componentRecipeSchemaVersion\":2,\"edgeEnrichmentThreshold\":0.02,\"edgeMassGain\":200,\"id\":\"edge-dye-study\",\"massFraction\":0.32,\"mobilityMultiplier\":1.45,\"retentionMultiplier\":0.62,\"revision\":3}",
  );
  assert.throws(
    () => assertDyeComponentRecipeCompatible(EDGE_DYE_COMPONENT_RECIPE_R3),
    /incompatible with dye-component-js-r5/,
  );
  assert.equal(EDGE_DYE_COMPONENT_RECIPE_R4.revision, 4);
  assert.throws(
    () => assertDyeComponentRecipeCompatible(EDGE_DYE_COMPONENT_RECIPE_R4),
    /incompatible with dye-component-js-r5/,
  );
  assert.equal(
    serializeDyeComponentRecipe(EDGE_DYE_COMPONENT_RECIPE_R4),
    "{\"componentModelVersion\":\"dye-component-js-r4\",\"componentRecipeSchemaVersion\":3,\"edgeBlue\":78,\"edgeEnrichmentThreshold\":0.02,\"edgeGreen\":46,\"edgeMassGain\":200,\"edgeMixGain\":12,\"edgeMixMaximum\":0.72,\"edgeRed\":138,\"id\":\"edge-dye-study\",\"massFraction\":0.32,\"mobilityMultiplier\":1.45,\"retentionMultiplier\":0.62,\"revision\":4}",
  );
  assert.equal(EDGE_DYE_COMPONENT_RECIPE_R5.revision, 5);
  assert.equal(
    assertDyeComponentRecipeCompatible(EDGE_DYE_COMPONENT_RECIPE_R5),
    true,
  );
  assert.equal(
    serializeDyeComponentRecipe(EDGE_DYE_COMPONENT_RECIPE_R5),
    "{\"componentModelVersion\":\"dye-component-js-r5\",\"componentRecipeSchemaVersion\":4,\"edgeBlue\":116,\"edgeEnrichmentThreshold\":0.02,\"edgeGreen\":26,\"edgeMassGain\":200,\"edgeMixGain\":2,\"edgeMixMaximum\":0.86,\"edgeRed\":152,\"edgeZoneMinimumStrength\":0.38,\"edgeZonePeakThreshold\":0.003,\"edgeZoneRadius\":1,\"id\":\"edge-dye-study\",\"massFraction\":0.32,\"mobilityMultiplier\":1.45,\"retentionMultiplier\":0.62,\"revision\":5}",
  );
});

test("registered dye component identity rejects silent retuning", () => {
  const impostor = {
    ...EDGE_DYE_COMPONENT_RECIPE_R5,
    mobilityMultiplier: 1.8,
  };
  assert.equal(validateDyeComponentRecipe(impostor), true);
  assert.throws(
    () => assertDyeComponentRecipeCompatible(impostor),
    /does not match its registered definition/,
  );
});

test("current-schema experiment recipes are accepted without weakening built-in identity", () => {
  const experimentRecipe = Object.freeze({
    ...EDGE_DYE_COMPONENT_RECIPE_R5,
    id: "workbench-edge-dye",
    revision: 1,
    edgeRed: 174,
    edgeGreen: 37,
    edgeBlue: 128,
    edgeMixMaximum: 0.74,
  });

  assert.equal(validateDyeComponentRecipe(experimentRecipe), true);
  assert.equal(assertDyeComponentRecipeCompatible(experimentRecipe), true);
  assert.match(
    serializeDyeComponentRecipe(experimentRecipe),
    /"id":"workbench-edge-dye"/,
  );
  assert.throws(
    () => assertDyeComponentRecipeCompatible({
      ...EDGE_DYE_COMPONENT_RECIPE_R5,
      revision: 999,
    }),
    /edge-dye-study@999 is not registered/,
  );
});

test("dye component recipes reject accessors and invalid transport values", () => {
  let reads = 0;
  const accessor = { ...EDGE_DYE_COMPONENT_RECIPE_R5 };
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
    ["edgeRed", 256],
    ["edgeMixGain", 0],
    ["edgeMixMaximum", 1.01],
    ["edgeZoneRadius", 5],
    ["edgeZoneMinimumStrength", -0.01],
    ["edgeZonePeakThreshold", Number.NaN],
  ]) {
    assert.throws(
      () => validateDyeComponentRecipe({
        ...EDGE_DYE_COMPONENT_RECIPE_R5,
        [key]: value,
      }),
      new RegExp(key),
    );
  }
});
