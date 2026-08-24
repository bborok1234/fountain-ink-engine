import assert from "node:assert/strict";
import test from "node:test";
import {
  EDGE_DYE_COMPONENT_RECIPE_R1,
  EDGE_DYE_COMPONENT_RECIPE_R2,
  EDGE_DYE_COMPONENT_RECIPE_R3,
  EDGE_DYE_COMPONENT_RECIPE_R4,
  EDGE_DYE_COMPONENT_RECIPE_R5,
  EDGE_DYE_COMPONENT_RECIPE_R6,
  EDGE_DYE_COMPONENT_RECIPE_R7,
  EDGE_DYE_COMPONENT_RECIPE_R8,
  EDGE_DYE_COMPONENT_RECIPE_R9,
  EDGE_DYE_COMPONENT_RECIPE_R10,
  EDGE_DYE_COMPONENT_RECIPE_R11,
  EDGE_DYE_COMPONENT_RECIPE_R12,
  EDGE_DYE_COMPONENT_RECIPE_R13,
  EDGE_DYE_COMPONENT_RECIPE_R14,
  assertDyeComponentRecipeCompatible,
  dyeComponentModelVersion,
  dyeComponentRecipeSchemaVersion,
  parseDyeComponentRecipe,
  serializeDyeComponentRecipe,
  validateDyeComponentRecipe,
} from "../src/dye-components/index.js";

test("edge dye component revisions have independent canonical identities", () => {
  assert.equal(dyeComponentModelVersion, "dye-component-js-r13");
  assert.equal(dyeComponentRecipeSchemaVersion, 12);
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
    /incompatible with dye-component-js-r13/,
  );
  assert.equal(
    serializeDyeComponentRecipe(EDGE_DYE_COMPONENT_RECIPE_R2),
    "{\"componentModelVersion\":\"dye-component-js-r2\",\"componentRecipeSchemaVersion\":1,\"id\":\"edge-dye-study\",\"massFraction\":0.32,\"mobilityMultiplier\":1.45,\"retentionMultiplier\":0.62,\"revision\":2}",
  );
  assert.throws(
    () => assertDyeComponentRecipeCompatible(EDGE_DYE_COMPONENT_RECIPE_R2),
    /incompatible with dye-component-js-r13/,
  );
  assert.equal(EDGE_DYE_COMPONENT_RECIPE_R3.revision, 3);
  assert.equal(
    serializeDyeComponentRecipe(EDGE_DYE_COMPONENT_RECIPE_R3),
    "{\"componentModelVersion\":\"dye-component-js-r3\",\"componentRecipeSchemaVersion\":2,\"edgeEnrichmentThreshold\":0.02,\"edgeMassGain\":200,\"id\":\"edge-dye-study\",\"massFraction\":0.32,\"mobilityMultiplier\":1.45,\"retentionMultiplier\":0.62,\"revision\":3}",
  );
  assert.throws(
    () => assertDyeComponentRecipeCompatible(EDGE_DYE_COMPONENT_RECIPE_R3),
    /incompatible with dye-component-js-r13/,
  );
  assert.equal(EDGE_DYE_COMPONENT_RECIPE_R4.revision, 4);
  assert.throws(
    () => assertDyeComponentRecipeCompatible(EDGE_DYE_COMPONENT_RECIPE_R4),
    /incompatible with dye-component-js-r13/,
  );
  assert.equal(
    serializeDyeComponentRecipe(EDGE_DYE_COMPONENT_RECIPE_R4),
    "{\"componentModelVersion\":\"dye-component-js-r4\",\"componentRecipeSchemaVersion\":3,\"edgeBlue\":78,\"edgeEnrichmentThreshold\":0.02,\"edgeGreen\":46,\"edgeMassGain\":200,\"edgeMixGain\":12,\"edgeMixMaximum\":0.72,\"edgeRed\":138,\"id\":\"edge-dye-study\",\"massFraction\":0.32,\"mobilityMultiplier\":1.45,\"retentionMultiplier\":0.62,\"revision\":4}",
  );
  assert.equal(EDGE_DYE_COMPONENT_RECIPE_R5.revision, 5);
  assert.equal(
    serializeDyeComponentRecipe(EDGE_DYE_COMPONENT_RECIPE_R5),
    "{\"componentModelVersion\":\"dye-component-js-r5\",\"componentRecipeSchemaVersion\":4,\"edgeBlue\":116,\"edgeEnrichmentThreshold\":0.02,\"edgeGreen\":26,\"edgeMassGain\":200,\"edgeMixGain\":2,\"edgeMixMaximum\":0.86,\"edgeRed\":152,\"edgeZoneMinimumStrength\":0.38,\"edgeZonePeakThreshold\":0.003,\"edgeZoneRadius\":1,\"id\":\"edge-dye-study\",\"massFraction\":0.32,\"mobilityMultiplier\":1.45,\"retentionMultiplier\":0.62,\"revision\":5}",
  );
  assert.throws(
    () => assertDyeComponentRecipeCompatible(EDGE_DYE_COMPONENT_RECIPE_R5),
    /incompatible with dye-component-js-r13/,
  );
  assert.equal(EDGE_DYE_COMPONENT_RECIPE_R6.revision, 6);
  assert.equal(
    serializeDyeComponentRecipe(EDGE_DYE_COMPONENT_RECIPE_R6),
    "{\"baseHighBlue\":158,\"baseHighGreen\":90,\"baseHighRed\":105,\"baseLowBlue\":202,\"baseLowGreen\":156,\"baseLowRed\":136,\"baseMidBlue\":173,\"baseMidGreen\":144,\"baseMidRed\":101,\"baseMix\":0.86,\"componentModelVersion\":\"dye-component-js-r6\",\"componentRecipeSchemaVersion\":5,\"edgeBlue\":115,\"edgeEnrichmentThreshold\":0.02,\"edgeGreen\":136,\"edgeMassGain\":200,\"edgeMixGain\":2,\"edgeMixMaximum\":0.86,\"edgeRed\":44,\"edgeZoneMinimumStrength\":0.38,\"edgeZonePeakThreshold\":0.003,\"edgeZoneRadius\":1,\"id\":\"edge-dye-study\",\"massFraction\":0.32,\"mobilityMultiplier\":1.45,\"retentionMultiplier\":0.62,\"revision\":6}",
  );
  assert.throws(
    () => assertDyeComponentRecipeCompatible(EDGE_DYE_COMPONENT_RECIPE_R6),
    /incompatible with dye-component-js-r13/,
  );
  assert.equal(EDGE_DYE_COMPONENT_RECIPE_R7.revision, 7);
  assert.throws(
    () => assertDyeComponentRecipeCompatible(EDGE_DYE_COMPONENT_RECIPE_R7),
    /incompatible with dye-component-js-r13/,
  );
  assert.equal(
    serializeDyeComponentRecipe(EDGE_DYE_COMPONENT_RECIPE_R7),
    "{\"baseHighBlue\":158,\"baseHighGreen\":90,\"baseHighRed\":105,\"baseLowBlue\":202,\"baseLowGreen\":156,\"baseLowRed\":136,\"baseMidBlue\":173,\"baseMidGreen\":144,\"baseMidRed\":101,\"baseMix\":0.86,\"componentModelVersion\":\"dye-component-js-r7\",\"componentRecipeSchemaVersion\":6,\"edgeBandCssPixels\":1,\"edgeBlue\":104,\"edgeEnrichmentThreshold\":0.02,\"edgeGreen\":145,\"edgeMassGain\":200,\"edgeMixGain\":7,\"edgeMixMaximum\":0.86,\"edgeRed\":15,\"edgeZoneMinimumStrength\":0.38,\"edgeZonePeakThreshold\":0.003,\"edgeZoneRadius\":1,\"id\":\"edge-dye-study\",\"massFraction\":0.32,\"mobilityMultiplier\":1.45,\"retentionMultiplier\":0.62,\"revision\":7}",
  );
  assert.equal(EDGE_DYE_COMPONENT_RECIPE_R8.revision, 8);
  assert.throws(
    () => assertDyeComponentRecipeCompatible(EDGE_DYE_COMPONENT_RECIPE_R8),
    /incompatible with dye-component-js-r13/,
  );
  assert.equal(
    validateDyeComponentRecipe(EDGE_DYE_COMPONENT_RECIPE_R8),
    true,
  );
  assert.equal(
    serializeDyeComponentRecipe(EDGE_DYE_COMPONENT_RECIPE_R8),
    "{\"baseHighBlue\":158,\"baseHighGreen\":90,\"baseHighRed\":105,\"baseLowBlue\":202,\"baseLowGreen\":156,\"baseLowRed\":136,\"baseMidBlue\":173,\"baseMidGreen\":144,\"baseMidRed\":101,\"baseMix\":0.86,\"componentModelVersion\":\"dye-component-js-r8\",\"componentRecipeSchemaVersion\":7,\"edgeBlue\":104,\"edgeEnrichmentThreshold\":0.02,\"edgeGreen\":145,\"edgeMassGain\":200,\"edgeMixGain\":7,\"edgeMixMaximum\":0.86,\"edgeRed\":15,\"id\":\"edge-dye-study\",\"massFraction\":0.32,\"mobilityMultiplier\":1.45,\"retentionMultiplier\":0.62,\"revision\":8}",
  );
  assert.equal(EDGE_DYE_COMPONENT_RECIPE_R9.revision, 9);
  assert.throws(
    () => assertDyeComponentRecipeCompatible(EDGE_DYE_COMPONENT_RECIPE_R9),
    /incompatible with dye-component-js-r13/,
  );
  assert.equal(
    validateDyeComponentRecipe(EDGE_DYE_COMPONENT_RECIPE_R9),
    true,
  );
  assert.equal(
    serializeDyeComponentRecipe(EDGE_DYE_COMPONENT_RECIPE_R9),
    "{\"baseHighBlue\":158,\"baseHighGreen\":90,\"baseHighRed\":105,\"baseLowBlue\":202,\"baseLowGreen\":156,\"baseLowRed\":136,\"baseMidBlue\":173,\"baseMidGreen\":144,\"baseMidRed\":101,\"baseMix\":0.86,\"componentModelVersion\":\"dye-component-js-r9\",\"componentRecipeSchemaVersion\":8,\"edgeBlue\":104,\"edgeEnrichmentThreshold\":0.02,\"edgeGreen\":145,\"edgeMassGain\":200,\"edgeMixGain\":7,\"edgeMixMaximum\":0.86,\"edgeRed\":15,\"id\":\"edge-dye-study\",\"massFraction\":0.32,\"mobilityMultiplier\":1.45,\"paperAffinityMultiplier\":1.6,\"retardationHalfSaturation\":0.1,\"retardationMaximum\":0.82,\"retentionMultiplier\":0.62,\"revision\":9}",
  );
  assert.equal(EDGE_DYE_COMPONENT_RECIPE_R10.revision, 10);
  assert.throws(
    () => assertDyeComponentRecipeCompatible(EDGE_DYE_COMPONENT_RECIPE_R10),
    /incompatible with dye-component-js-r13/,
  );
  assert.equal(
    serializeDyeComponentRecipe(EDGE_DYE_COMPONENT_RECIPE_R10),
    "{\"baseHighBlue\":158,\"baseHighGreen\":90,\"baseHighRed\":105,\"baseLowBlue\":202,\"baseLowGreen\":156,\"baseLowRed\":136,\"baseMidBlue\":173,\"baseMidGreen\":144,\"baseMidRed\":101,\"baseMix\":0.86,\"componentMassVisibilityScale\":200,\"componentModelVersion\":\"dye-component-js-r10\",\"componentRecipeSchemaVersion\":9,\"id\":\"edge-dye-study\",\"massFraction\":0.32,\"mobilityMultiplier\":1.45,\"paperAffinityMultiplier\":1.6,\"retardationHalfSaturation\":0.1,\"retardationMaximum\":0.82,\"retentionMultiplier\":0.62,\"revision\":10,\"secondaryBlue\":104,\"secondaryGreen\":145,\"secondaryRed\":15,\"secondaryRelativeAbsorptivity\":4}",
  );
  assert.equal(EDGE_DYE_COMPONENT_RECIPE_R11.revision, 11);
  assert.throws(
    () => assertDyeComponentRecipeCompatible(EDGE_DYE_COMPONENT_RECIPE_R11),
    /incompatible with dye-component-js-r13/,
  );
  assert.equal(
    serializeDyeComponentRecipe(EDGE_DYE_COMPONENT_RECIPE_R11),
    "{\"baseHighBlue\":158,\"baseHighGreen\":90,\"baseHighRed\":105,\"baseLowBlue\":202,\"baseLowGreen\":156,\"baseLowRed\":136,\"baseMidBlue\":173,\"baseMidGreen\":144,\"baseMidRed\":101,\"baseMix\":0.86,\"componentModelVersion\":\"dye-component-js-r11\",\"componentRecipeSchemaVersion\":10,\"id\":\"edge-dye-study\",\"massFraction\":0.32,\"mobilityMultiplier\":1.45,\"paperAffinityMultiplier\":1.6,\"retardationHalfSaturation\":0.1,\"retardationMaximum\":0.82,\"retentionMultiplier\":0.62,\"revision\":11,\"secondaryBlue\":104,\"secondaryGreen\":145,\"secondaryRed\":15}",
  );
  assert.equal(EDGE_DYE_COMPONENT_RECIPE_R12.revision, 12);
  assert.throws(
    () => assertDyeComponentRecipeCompatible(EDGE_DYE_COMPONENT_RECIPE_R12),
    /incompatible with dye-component-js-r13/,
  );
  assert.equal(
    serializeDyeComponentRecipe(EDGE_DYE_COMPONENT_RECIPE_R12),
    "{\"baseHighBlue\":158,\"baseHighGreen\":90,\"baseHighRed\":105,\"baseLowBlue\":202,\"baseLowGreen\":156,\"baseLowRed\":136,\"baseMidBlue\":173,\"baseMidGreen\":144,\"baseMidRed\":101,\"baseMix\":0.86,\"componentModelVersion\":\"dye-component-js-r12\",\"componentRecipeSchemaVersion\":11,\"id\":\"edge-dye-study\",\"initialSecondaryFraction\":0.24242424242424243,\"revision\":12,\"secondaryBlue\":104,\"secondaryGreen\":145,\"secondaryRed\":15}",
  );
  assert.deepEqual(
    parseDyeComponentRecipe(
      serializeDyeComponentRecipe(EDGE_DYE_COMPONENT_RECIPE_R12),
    ),
    EDGE_DYE_COMPONENT_RECIPE_R12,
  );
  assert.equal(EDGE_DYE_COMPONENT_RECIPE_R13.revision, 13);
  assert.equal(
    assertDyeComponentRecipeCompatible(EDGE_DYE_COMPONENT_RECIPE_R13),
    true,
  );
  assert.equal(
    serializeDyeComponentRecipe(EDGE_DYE_COMPONENT_RECIPE_R13),
    "{\"baseHighBlue\":158,\"baseHighGreen\":90,\"baseHighRed\":105,\"baseLowBlue\":202,\"baseLowGreen\":156,\"baseLowRed\":136,\"baseMidBlue\":173,\"baseMidGreen\":144,\"baseMidRed\":101,\"baseMix\":0.86,\"componentModelVersion\":\"dye-component-js-r13\",\"componentRecipeSchemaVersion\":12,\"id\":\"edge-dye-study\",\"initialSecondaryFraction\":0.24242424242424243,\"primaryAdsorptionRate\":0.02,\"primaryDesorptionRate\":0.0002,\"primaryDiffusivity\":0.001,\"revision\":13,\"secondaryAdsorptionRate\":0.006,\"secondaryBlue\":104,\"secondaryDesorptionRate\":0.0003,\"secondaryDiffusivity\":0.003,\"secondaryGreen\":145,\"secondaryRed\":15}",
  );
  assert.deepEqual(
    parseDyeComponentRecipe(
      serializeDyeComponentRecipe(EDGE_DYE_COMPONENT_RECIPE_R13),
    ),
    EDGE_DYE_COMPONENT_RECIPE_R13,
  );
  assert.equal(EDGE_DYE_COMPONENT_RECIPE_R14.revision, 14);
  assert.equal(
    assertDyeComponentRecipeCompatible(EDGE_DYE_COMPONENT_RECIPE_R14),
    true,
  );
  assert.equal(
    serializeDyeComponentRecipe(EDGE_DYE_COMPONENT_RECIPE_R14),
    "{\"baseHighBlue\":158,\"baseHighGreen\":90,\"baseHighRed\":105,\"baseLowBlue\":202,\"baseLowGreen\":156,\"baseLowRed\":136,\"baseMidBlue\":173,\"baseMidGreen\":144,\"baseMidRed\":101,\"baseMix\":0.86,\"componentModelVersion\":\"dye-component-js-r13\",\"componentRecipeSchemaVersion\":12,\"id\":\"edge-dye-study\",\"initialSecondaryFraction\":0.24242424242424243,\"primaryAdsorptionRate\":0.06,\"primaryDesorptionRate\":0.000005,\"primaryDiffusivity\":0.00005,\"revision\":14,\"secondaryAdsorptionRate\":0.001,\"secondaryBlue\":104,\"secondaryDesorptionRate\":0.00002,\"secondaryDiffusivity\":0.0008,\"secondaryGreen\":145,\"secondaryRed\":15}",
  );
  assert.deepEqual(
    parseDyeComponentRecipe(
      serializeDyeComponentRecipe(EDGE_DYE_COMPONENT_RECIPE_R14),
    ),
    EDGE_DYE_COMPONENT_RECIPE_R14,
  );
});

test("registered dye component identity rejects silent retuning", () => {
  const r13Impostor = {
    ...EDGE_DYE_COMPONENT_RECIPE_R13,
    initialSecondaryFraction: 0.3,
  };
  assert.equal(validateDyeComponentRecipe(r13Impostor), true);
  assert.throws(
    () => assertDyeComponentRecipeCompatible(r13Impostor),
    /does not match its registered definition/,
  );

  const r14Impostor = {
    ...EDGE_DYE_COMPONENT_RECIPE_R14,
    primaryAdsorptionRate: 0.061,
  };
  assert.equal(validateDyeComponentRecipe(r14Impostor), true);
  assert.throws(
    () => assertDyeComponentRecipeCompatible(r14Impostor),
    /does not match its registered definition/,
  );
});

test("r10 preserves r9 transport and base palette while renaming secondary RGB", () => {
  for (const key of [
    "massFraction",
    "mobilityMultiplier",
    "retentionMultiplier",
    "paperAffinityMultiplier",
    "retardationHalfSaturation",
    "retardationMaximum",
    "baseLowRed",
    "baseLowGreen",
    "baseLowBlue",
    "baseMidRed",
    "baseMidGreen",
    "baseMidBlue",
    "baseHighRed",
    "baseHighGreen",
    "baseHighBlue",
    "baseMix",
  ]) {
    assert.equal(EDGE_DYE_COMPONENT_RECIPE_R10[key], EDGE_DYE_COMPONENT_RECIPE_R9[key]);
  }
  assert.equal(EDGE_DYE_COMPONENT_RECIPE_R10.secondaryRed, EDGE_DYE_COMPONENT_RECIPE_R9.edgeRed);
  assert.equal(EDGE_DYE_COMPONENT_RECIPE_R10.secondaryGreen, EDGE_DYE_COMPONENT_RECIPE_R9.edgeGreen);
  assert.equal(EDGE_DYE_COMPONENT_RECIPE_R10.secondaryBlue, EDGE_DYE_COMPONENT_RECIPE_R9.edgeBlue);
});

test("r11 preserves r10 transport and endpoints while retiring A5 optical gains", () => {
  for (const key of [
    "massFraction",
    "mobilityMultiplier",
    "retentionMultiplier",
    "paperAffinityMultiplier",
    "retardationHalfSaturation",
    "retardationMaximum",
    "baseLowRed",
    "baseLowGreen",
    "baseLowBlue",
    "baseMidRed",
    "baseMidGreen",
    "baseMidBlue",
    "baseHighRed",
    "baseHighGreen",
    "baseHighBlue",
    "baseMix",
    "secondaryRed",
    "secondaryGreen",
    "secondaryBlue",
  ]) {
    assert.equal(EDGE_DYE_COMPONENT_RECIPE_R11[key], EDGE_DYE_COMPONENT_RECIPE_R10[key]);
  }
  assert.equal(Object.hasOwn(EDGE_DYE_COMPONENT_RECIPE_R11, "componentMassVisibilityScale"), false);
  assert.equal(Object.hasOwn(EDGE_DYE_COMPONENT_RECIPE_R11, "secondaryRelativeAbsorptivity"), false);
});

test("r12 preserves the palette while retiring every asymmetric A6 transport knob", () => {
  for (const key of [
    "baseLowRed",
    "baseLowGreen",
    "baseLowBlue",
    "baseMidRed",
    "baseMidGreen",
    "baseMidBlue",
    "baseHighRed",
    "baseHighGreen",
    "baseHighBlue",
    "baseMix",
    "secondaryRed",
    "secondaryGreen",
    "secondaryBlue",
  ]) {
    assert.equal(EDGE_DYE_COMPONENT_RECIPE_R12[key], EDGE_DYE_COMPONENT_RECIPE_R11[key]);
  }
  assert.equal(EDGE_DYE_COMPONENT_RECIPE_R12.initialSecondaryFraction, 8 / 33);
  for (const key of [
    "massFraction",
    "mobilityMultiplier",
    "retentionMultiplier",
    "paperAffinityMultiplier",
    "retardationHalfSaturation",
    "retardationMaximum",
  ]) {
    assert.equal(Object.hasOwn(EDGE_DYE_COMPONENT_RECIPE_R12, key), false);
  }
});

test("r13 adds only shared-flow species transport rates with research-ordered defaults", () => {
  for (const key of [
    "initialSecondaryFraction",
    "baseLowRed",
    "baseLowGreen",
    "baseLowBlue",
    "baseMidRed",
    "baseMidGreen",
    "baseMidBlue",
    "baseHighRed",
    "baseHighGreen",
    "baseHighBlue",
    "baseMix",
    "secondaryRed",
    "secondaryGreen",
    "secondaryBlue",
  ]) {
    assert.equal(EDGE_DYE_COMPONENT_RECIPE_R13[key], EDGE_DYE_COMPONENT_RECIPE_R12[key]);
  }
  assert.ok(
    EDGE_DYE_COMPONENT_RECIPE_R13.primaryAdsorptionRate
      > EDGE_DYE_COMPONENT_RECIPE_R13.secondaryDiffusivity,
  );
  assert.ok(
    EDGE_DYE_COMPONENT_RECIPE_R13.secondaryAdsorptionRate
      > EDGE_DYE_COMPONENT_RECIPE_R13.primaryDiffusivity,
  );
  assert.ok(
    EDGE_DYE_COMPONENT_RECIPE_R13.primaryDiffusivity
      > EDGE_DYE_COMPONENT_RECIPE_R13.primaryDesorptionRate,
  );
  assert.ok(
    EDGE_DYE_COMPONENT_RECIPE_R13.secondaryDiffusivity
      > EDGE_DYE_COMPONENT_RECIPE_R13.secondaryDesorptionRate,
  );
  assert.ok(
    EDGE_DYE_COMPONENT_RECIPE_R13.secondaryDiffusivity
      > EDGE_DYE_COMPONENT_RECIPE_R13.primaryDiffusivity,
  );
  assert.ok(
    EDGE_DYE_COMPONENT_RECIPE_R13.primaryAdsorptionRate
      > EDGE_DYE_COMPONENT_RECIPE_R13.secondaryAdsorptionRate,
  );
});

test("r14 changes only the versioned transport-rate calibration", () => {
  for (const key of [
    "componentModelVersion",
    "componentRecipeSchemaVersion",
    "initialSecondaryFraction",
    "baseLowRed",
    "baseLowGreen",
    "baseLowBlue",
    "baseMidRed",
    "baseMidGreen",
    "baseMidBlue",
    "baseHighRed",
    "baseHighGreen",
    "baseHighBlue",
    "baseMix",
    "secondaryRed",
    "secondaryGreen",
    "secondaryBlue",
  ]) {
    assert.equal(EDGE_DYE_COMPONENT_RECIPE_R14[key], EDGE_DYE_COMPONENT_RECIPE_R13[key]);
  }
  assert.deepEqual(
    {
      primaryDiffusivity: EDGE_DYE_COMPONENT_RECIPE_R14.primaryDiffusivity,
      secondaryDiffusivity: EDGE_DYE_COMPONENT_RECIPE_R14.secondaryDiffusivity,
      primaryAdsorptionRate: EDGE_DYE_COMPONENT_RECIPE_R14.primaryAdsorptionRate,
      secondaryAdsorptionRate: EDGE_DYE_COMPONENT_RECIPE_R14.secondaryAdsorptionRate,
      primaryDesorptionRate: EDGE_DYE_COMPONENT_RECIPE_R14.primaryDesorptionRate,
      secondaryDesorptionRate: EDGE_DYE_COMPONENT_RECIPE_R14.secondaryDesorptionRate,
    },
    {
      primaryDiffusivity: 0.00005,
      secondaryDiffusivity: 0.0008,
      primaryAdsorptionRate: 0.06,
      secondaryAdsorptionRate: 0.001,
      primaryDesorptionRate: 0.000005,
      secondaryDesorptionRate: 0.00002,
    },
  );
});

test("current-schema experiment recipes are accepted without weakening built-in identity", () => {
  const experimentRecipe = Object.freeze({
    ...EDGE_DYE_COMPONENT_RECIPE_R13,
    id: "workbench-edge-dye",
    revision: 1,
    secondaryRed: 174,
    secondaryGreen: 37,
    secondaryBlue: 128,
  });

  assert.equal(validateDyeComponentRecipe(experimentRecipe), true);
  assert.equal(assertDyeComponentRecipeCompatible(experimentRecipe), true);
  assert.match(
    serializeDyeComponentRecipe(experimentRecipe),
    /"id":"workbench-edge-dye"/,
  );
  assert.throws(
    () => assertDyeComponentRecipeCompatible({
      ...EDGE_DYE_COMPONENT_RECIPE_R13,
      revision: 999,
    }),
    /edge-dye-study@999 is not registered/,
  );
});

test("r13 recipes reject accessors, invalid rates, and retired A6 knobs", () => {
  let reads = 0;
  const accessor = { ...EDGE_DYE_COMPONENT_RECIPE_R13 };
  Object.defineProperty(accessor, "initialSecondaryFraction", {
    enumerable: true,
    get() {
      reads += 1;
      return 8 / 33;
    },
  });
  assert.throws(
    () => validateDyeComponentRecipe(accessor),
    /enumerable own data property/,
  );
  assert.equal(reads, 0);

  for (const [key, value] of [
    ["initialSecondaryFraction", -0.01],
    ["baseLowRed", 256],
    ["baseMidGreen", -1],
    ["baseHighBlue", 1.5],
    ["baseMix", 1.01],
    ["secondaryRed", 256],
    ["primaryDiffusivity", -0.01],
    ["secondaryDiffusivity", 1.01],
    ["primaryAdsorptionRate", Number.NaN],
    ["secondaryAdsorptionRate", 1.01],
    ["primaryDesorptionRate", -0.01],
    ["secondaryDesorptionRate", 1.01],
  ]) {
    assert.throws(
      () => validateDyeComponentRecipe({
        ...EDGE_DYE_COMPONENT_RECIPE_R13,
        [key]: value,
      }),
      new RegExp(key),
    );
  }

  for (const obsoleteKey of [
    "edgeZoneRadius",
    "edgeZoneMinimumStrength",
    "edgeZonePeakThreshold",
    "edgeBandCssPixels",
    "edgeEnrichmentThreshold",
    "edgeMassGain",
    "edgeMixGain",
    "edgeMixMaximum",
    "edgeRed",
    "edgeGreen",
    "edgeBlue",
    "componentMassVisibilityScale",
    "secondaryRelativeAbsorptivity",
    "massFraction",
    "mobilityMultiplier",
    "retentionMultiplier",
    "paperAffinityMultiplier",
    "retardationHalfSaturation",
    "retardationMaximum",
  ]) {
    assert.throws(
      () => validateDyeComponentRecipe({
        ...EDGE_DYE_COMPONENT_RECIPE_R13,
        [obsoleteKey]: 1,
      }),
      new RegExp(`unexpected=${obsoleteKey}`),
    );
  }
});
