import {
  dyeComponentModelVersion,
  dyeComponentRecipeSchemaVersion,
  serializeDyeComponentRecipe,
  validateDyeComponentRecipe,
} from "./dye-component-recipe.js";
import { EDGE_DYE_COMPONENT_RECIPE_R1 } from "./edge-dye-r1.js";
import { EDGE_DYE_COMPONENT_RECIPE_R2 } from "./edge-dye-r2.js";
import { EDGE_DYE_COMPONENT_RECIPE_R3 } from "./edge-dye-r3.js";
import { EDGE_DYE_COMPONENT_RECIPE_R4 } from "./edge-dye-r4.js";
import { EDGE_DYE_COMPONENT_RECIPE_R5 } from "./edge-dye-r5.js";
import { EDGE_DYE_COMPONENT_RECIPE_R6 } from "./edge-dye-r6.js";
import { EDGE_DYE_COMPONENT_RECIPE_R7 } from "./edge-dye-r7.js";
import { EDGE_DYE_COMPONENT_RECIPE_R8 } from "./edge-dye-r8.js";
import { EDGE_DYE_COMPONENT_RECIPE_R9 } from "./edge-dye-r9.js";
import { EDGE_DYE_COMPONENT_RECIPE_R10 } from "./edge-dye-r10.js";
import { EDGE_DYE_COMPONENT_RECIPE_R11 } from "./edge-dye-r11.js";
import { EDGE_DYE_COMPONENT_RECIPE_R12 } from "./edge-dye-r12.js";
import { EDGE_DYE_COMPONENT_RECIPE_R13 } from "./edge-dye-r13.js";
import { EDGE_DYE_COMPONENT_RECIPE_R14 } from "./edge-dye-r14.js";
import { EDGE_DYE_COMPONENT_RECIPE_R15 } from "./edge-dye-r15.js";
import { EDGE_DYE_COMPONENT_RECIPE_R16 } from "./edge-dye-r16.js";

const REGISTERED_RECIPES = Object.freeze({
  "edge-dye-study@1": "{\"componentModelVersion\":\"dye-component-js-r1\",\"componentRecipeSchemaVersion\":1,\"id\":\"edge-dye-study\",\"massFraction\":0.32,\"mobilityMultiplier\":1.45,\"retentionMultiplier\":0.62,\"revision\":1}",
  "edge-dye-study@2": "{\"componentModelVersion\":\"dye-component-js-r2\",\"componentRecipeSchemaVersion\":1,\"id\":\"edge-dye-study\",\"massFraction\":0.32,\"mobilityMultiplier\":1.45,\"retentionMultiplier\":0.62,\"revision\":2}",
  "edge-dye-study@3": "{\"componentModelVersion\":\"dye-component-js-r3\",\"componentRecipeSchemaVersion\":2,\"edgeEnrichmentThreshold\":0.02,\"edgeMassGain\":200,\"id\":\"edge-dye-study\",\"massFraction\":0.32,\"mobilityMultiplier\":1.45,\"retentionMultiplier\":0.62,\"revision\":3}",
  "edge-dye-study@4": "{\"componentModelVersion\":\"dye-component-js-r4\",\"componentRecipeSchemaVersion\":3,\"edgeBlue\":78,\"edgeEnrichmentThreshold\":0.02,\"edgeGreen\":46,\"edgeMassGain\":200,\"edgeMixGain\":12,\"edgeMixMaximum\":0.72,\"edgeRed\":138,\"id\":\"edge-dye-study\",\"massFraction\":0.32,\"mobilityMultiplier\":1.45,\"retentionMultiplier\":0.62,\"revision\":4}",
  "edge-dye-study@5": "{\"componentModelVersion\":\"dye-component-js-r5\",\"componentRecipeSchemaVersion\":4,\"edgeBlue\":116,\"edgeEnrichmentThreshold\":0.02,\"edgeGreen\":26,\"edgeMassGain\":200,\"edgeMixGain\":2,\"edgeMixMaximum\":0.86,\"edgeRed\":152,\"edgeZoneMinimumStrength\":0.38,\"edgeZonePeakThreshold\":0.003,\"edgeZoneRadius\":1,\"id\":\"edge-dye-study\",\"massFraction\":0.32,\"mobilityMultiplier\":1.45,\"retentionMultiplier\":0.62,\"revision\":5}",
  "edge-dye-study@6": "{\"baseHighBlue\":158,\"baseHighGreen\":90,\"baseHighRed\":105,\"baseLowBlue\":202,\"baseLowGreen\":156,\"baseLowRed\":136,\"baseMidBlue\":173,\"baseMidGreen\":144,\"baseMidRed\":101,\"baseMix\":0.86,\"componentModelVersion\":\"dye-component-js-r6\",\"componentRecipeSchemaVersion\":5,\"edgeBlue\":115,\"edgeEnrichmentThreshold\":0.02,\"edgeGreen\":136,\"edgeMassGain\":200,\"edgeMixGain\":2,\"edgeMixMaximum\":0.86,\"edgeRed\":44,\"edgeZoneMinimumStrength\":0.38,\"edgeZonePeakThreshold\":0.003,\"edgeZoneRadius\":1,\"id\":\"edge-dye-study\",\"massFraction\":0.32,\"mobilityMultiplier\":1.45,\"retentionMultiplier\":0.62,\"revision\":6}",
  "edge-dye-study@7": "{\"baseHighBlue\":158,\"baseHighGreen\":90,\"baseHighRed\":105,\"baseLowBlue\":202,\"baseLowGreen\":156,\"baseLowRed\":136,\"baseMidBlue\":173,\"baseMidGreen\":144,\"baseMidRed\":101,\"baseMix\":0.86,\"componentModelVersion\":\"dye-component-js-r7\",\"componentRecipeSchemaVersion\":6,\"edgeBandCssPixels\":1,\"edgeBlue\":104,\"edgeEnrichmentThreshold\":0.02,\"edgeGreen\":145,\"edgeMassGain\":200,\"edgeMixGain\":7,\"edgeMixMaximum\":0.86,\"edgeRed\":15,\"edgeZoneMinimumStrength\":0.38,\"edgeZonePeakThreshold\":0.003,\"edgeZoneRadius\":1,\"id\":\"edge-dye-study\",\"massFraction\":0.32,\"mobilityMultiplier\":1.45,\"retentionMultiplier\":0.62,\"revision\":7}",
  "edge-dye-study@8": "{\"baseHighBlue\":158,\"baseHighGreen\":90,\"baseHighRed\":105,\"baseLowBlue\":202,\"baseLowGreen\":156,\"baseLowRed\":136,\"baseMidBlue\":173,\"baseMidGreen\":144,\"baseMidRed\":101,\"baseMix\":0.86,\"componentModelVersion\":\"dye-component-js-r8\",\"componentRecipeSchemaVersion\":7,\"edgeBlue\":104,\"edgeEnrichmentThreshold\":0.02,\"edgeGreen\":145,\"edgeMassGain\":200,\"edgeMixGain\":7,\"edgeMixMaximum\":0.86,\"edgeRed\":15,\"id\":\"edge-dye-study\",\"massFraction\":0.32,\"mobilityMultiplier\":1.45,\"retentionMultiplier\":0.62,\"revision\":8}",
  "edge-dye-study@9": "{\"baseHighBlue\":158,\"baseHighGreen\":90,\"baseHighRed\":105,\"baseLowBlue\":202,\"baseLowGreen\":156,\"baseLowRed\":136,\"baseMidBlue\":173,\"baseMidGreen\":144,\"baseMidRed\":101,\"baseMix\":0.86,\"componentModelVersion\":\"dye-component-js-r9\",\"componentRecipeSchemaVersion\":8,\"edgeBlue\":104,\"edgeEnrichmentThreshold\":0.02,\"edgeGreen\":145,\"edgeMassGain\":200,\"edgeMixGain\":7,\"edgeMixMaximum\":0.86,\"edgeRed\":15,\"id\":\"edge-dye-study\",\"massFraction\":0.32,\"mobilityMultiplier\":1.45,\"paperAffinityMultiplier\":1.6,\"retardationHalfSaturation\":0.1,\"retardationMaximum\":0.82,\"retentionMultiplier\":0.62,\"revision\":9}",
  "edge-dye-study@10": "{\"baseHighBlue\":158,\"baseHighGreen\":90,\"baseHighRed\":105,\"baseLowBlue\":202,\"baseLowGreen\":156,\"baseLowRed\":136,\"baseMidBlue\":173,\"baseMidGreen\":144,\"baseMidRed\":101,\"baseMix\":0.86,\"componentMassVisibilityScale\":200,\"componentModelVersion\":\"dye-component-js-r10\",\"componentRecipeSchemaVersion\":9,\"id\":\"edge-dye-study\",\"massFraction\":0.32,\"mobilityMultiplier\":1.45,\"paperAffinityMultiplier\":1.6,\"retardationHalfSaturation\":0.1,\"retardationMaximum\":0.82,\"retentionMultiplier\":0.62,\"revision\":10,\"secondaryBlue\":104,\"secondaryGreen\":145,\"secondaryRed\":15,\"secondaryRelativeAbsorptivity\":4}",
  "edge-dye-study@11": "{\"baseHighBlue\":158,\"baseHighGreen\":90,\"baseHighRed\":105,\"baseLowBlue\":202,\"baseLowGreen\":156,\"baseLowRed\":136,\"baseMidBlue\":173,\"baseMidGreen\":144,\"baseMidRed\":101,\"baseMix\":0.86,\"componentModelVersion\":\"dye-component-js-r11\",\"componentRecipeSchemaVersion\":10,\"id\":\"edge-dye-study\",\"massFraction\":0.32,\"mobilityMultiplier\":1.45,\"paperAffinityMultiplier\":1.6,\"retardationHalfSaturation\":0.1,\"retardationMaximum\":0.82,\"retentionMultiplier\":0.62,\"revision\":11,\"secondaryBlue\":104,\"secondaryGreen\":145,\"secondaryRed\":15}",
  "edge-dye-study@12": "{\"baseHighBlue\":158,\"baseHighGreen\":90,\"baseHighRed\":105,\"baseLowBlue\":202,\"baseLowGreen\":156,\"baseLowRed\":136,\"baseMidBlue\":173,\"baseMidGreen\":144,\"baseMidRed\":101,\"baseMix\":0.86,\"componentModelVersion\":\"dye-component-js-r12\",\"componentRecipeSchemaVersion\":11,\"id\":\"edge-dye-study\",\"initialSecondaryFraction\":0.24242424242424243,\"revision\":12,\"secondaryBlue\":104,\"secondaryGreen\":145,\"secondaryRed\":15}",
  "edge-dye-study@13": "{\"baseHighBlue\":158,\"baseHighGreen\":90,\"baseHighRed\":105,\"baseLowBlue\":202,\"baseLowGreen\":156,\"baseLowRed\":136,\"baseMidBlue\":173,\"baseMidGreen\":144,\"baseMidRed\":101,\"baseMix\":0.86,\"componentModelVersion\":\"dye-component-js-r13\",\"componentRecipeSchemaVersion\":12,\"id\":\"edge-dye-study\",\"initialSecondaryFraction\":0.24242424242424243,\"primaryAdsorptionRate\":0.02,\"primaryDesorptionRate\":0.0002,\"primaryDiffusivity\":0.001,\"revision\":13,\"secondaryAdsorptionRate\":0.006,\"secondaryBlue\":104,\"secondaryDesorptionRate\":0.0003,\"secondaryDiffusivity\":0.003,\"secondaryGreen\":145,\"secondaryRed\":15}",
  "edge-dye-study@14": "{\"baseHighBlue\":158,\"baseHighGreen\":90,\"baseHighRed\":105,\"baseLowBlue\":202,\"baseLowGreen\":156,\"baseLowRed\":136,\"baseMidBlue\":173,\"baseMidGreen\":144,\"baseMidRed\":101,\"baseMix\":0.86,\"componentModelVersion\":\"dye-component-js-r13\",\"componentRecipeSchemaVersion\":12,\"id\":\"edge-dye-study\",\"initialSecondaryFraction\":0.24242424242424243,\"primaryAdsorptionRate\":0.06,\"primaryDesorptionRate\":0.000005,\"primaryDiffusivity\":0.00005,\"revision\":14,\"secondaryAdsorptionRate\":0.001,\"secondaryBlue\":104,\"secondaryDesorptionRate\":0.00002,\"secondaryDiffusivity\":0.0008,\"secondaryGreen\":145,\"secondaryRed\":15}",
  "edge-dye-study@15": "{\"baseHighBlue\":158,\"baseHighGreen\":90,\"baseHighRed\":105,\"baseLowBlue\":202,\"baseLowGreen\":156,\"baseLowRed\":136,\"baseMidBlue\":173,\"baseMidGreen\":144,\"baseMidRed\":101,\"baseMix\":0.86,\"componentModelVersion\":\"dye-component-js-r14\",\"componentRecipeSchemaVersion\":13,\"id\":\"edge-dye-study\",\"initialSecondaryFraction\":0.24242424242424243,\"primaryAdsorptionRate\":0.06,\"primaryDesorptionRate\":0.000005,\"primaryDiffusivity\":0.00005,\"revision\":15,\"secondaryAdsorptionRate\":0.001,\"secondaryBlue\":104,\"secondaryDesorptionRate\":0.00002,\"secondaryDiffusivity\":0.0008,\"secondaryGreen\":145,\"secondaryRed\":15,\"sharedAdsorptionCapacity\":0.075}",
  "edge-dye-study@16": "{\"arealLoadContractVersion\":\"keyboard-dye-areal-load-v1\",\"baseHighBlue\":158,\"baseHighGreen\":90,\"baseHighRed\":105,\"baseLowBlue\":202,\"baseLowGreen\":156,\"baseLowRed\":136,\"baseMidBlue\":173,\"baseMidGreen\":144,\"baseMidRed\":101,\"baseMix\":0.86,\"componentModelVersion\":\"dye-component-js-r15\",\"componentRecipeSchemaVersion\":14,\"id\":\"edge-dye-study\",\"initialSecondaryFraction\":0.24242424242424243,\"primaryAdsorptionRate\":0.06,\"primaryDesorptionRate\":0.000005,\"primaryDiffusivity\":0.00005,\"revision\":16,\"secondaryAdsorptionRate\":0.001,\"secondaryBlue\":104,\"secondaryDesorptionRate\":0.00002,\"secondaryDiffusivity\":0.0008,\"secondaryGreen\":145,\"secondaryRed\":15}",
});

const keyFor = (recipe) => `${recipe.id}@${recipe.revision}`;
const REGISTERED_RECIPE_IDS = new Set(
  Object.keys(REGISTERED_RECIPES).map((key) => key.split("@")[0]),
);
// Prior runtime operators remain executable only for exact fingerprint-pinned
// built-ins. Historical schemas are replay evidence, not authoring surfaces;
// current custom authoring uses R16/schema 14.
const isHistoricalRuntimeModel = (recipe) =>
  (
    recipe.componentModelVersion === "dye-component-js-r13"
    && recipe.componentRecipeSchemaVersion === 12
  ) || (
    recipe.componentModelVersion === "dye-component-js-r14"
    && recipe.componentRecipeSchemaVersion === 13
  );
const HISTORICAL_RUNTIME_KEYS = new Set([
  "edge-dye-study@13",
  "edge-dye-study@14",
  "edge-dye-study@15",
]);

if (
  serializeDyeComponentRecipe(EDGE_DYE_COMPONENT_RECIPE_R1)
    !== REGISTERED_RECIPES["edge-dye-study@1"]
) {
  throw new TypeError(
    "built-in dye component edge-dye-study@1 changed without a revision.",
  );
}

if (
  serializeDyeComponentRecipe(EDGE_DYE_COMPONENT_RECIPE_R3)
    !== REGISTERED_RECIPES["edge-dye-study@3"]
) {
  throw new TypeError(
    "built-in dye component edge-dye-study@3 changed without a revision.",
  );
}

if (
  serializeDyeComponentRecipe(EDGE_DYE_COMPONENT_RECIPE_R4)
    !== REGISTERED_RECIPES["edge-dye-study@4"]
) {
  throw new TypeError(
    "built-in dye component edge-dye-study@4 changed without a revision.",
  );
}

if (
  serializeDyeComponentRecipe(EDGE_DYE_COMPONENT_RECIPE_R5)
    !== REGISTERED_RECIPES["edge-dye-study@5"]
) {
  throw new TypeError(
    "built-in dye component edge-dye-study@5 changed without a revision.",
  );
}

if (
  serializeDyeComponentRecipe(EDGE_DYE_COMPONENT_RECIPE_R6)
    !== REGISTERED_RECIPES["edge-dye-study@6"]
) {
  throw new TypeError(
    "built-in dye component edge-dye-study@6 changed without a revision.",
  );
}

if (
  serializeDyeComponentRecipe(EDGE_DYE_COMPONENT_RECIPE_R7)
    !== REGISTERED_RECIPES["edge-dye-study@7"]
) {
  throw new TypeError(
    "built-in dye component edge-dye-study@7 changed without a revision.",
  );
}

if (
  serializeDyeComponentRecipe(EDGE_DYE_COMPONENT_RECIPE_R8)
    !== REGISTERED_RECIPES["edge-dye-study@8"]
) {
  throw new TypeError(
    "built-in dye component edge-dye-study@8 changed without a revision.",
  );
}

if (
  serializeDyeComponentRecipe(EDGE_DYE_COMPONENT_RECIPE_R9)
    !== REGISTERED_RECIPES["edge-dye-study@9"]
) {
  throw new TypeError(
    "built-in dye component edge-dye-study@9 changed without a revision.",
  );
}

if (
  serializeDyeComponentRecipe(EDGE_DYE_COMPONENT_RECIPE_R10)
    !== REGISTERED_RECIPES["edge-dye-study@10"]
) {
  throw new TypeError(
    "built-in dye component edge-dye-study@10 changed without a revision.",
  );
}

if (
  serializeDyeComponentRecipe(EDGE_DYE_COMPONENT_RECIPE_R11)
    !== REGISTERED_RECIPES["edge-dye-study@11"]
) {
  throw new TypeError(
    "built-in dye component edge-dye-study@11 changed without a revision.",
  );
}

if (
  serializeDyeComponentRecipe(EDGE_DYE_COMPONENT_RECIPE_R12)
    !== REGISTERED_RECIPES["edge-dye-study@12"]
) {
  throw new TypeError(
    "built-in dye component edge-dye-study@12 changed without a revision.",
  );
}

if (
  serializeDyeComponentRecipe(EDGE_DYE_COMPONENT_RECIPE_R13)
    !== REGISTERED_RECIPES["edge-dye-study@13"]
) {
  throw new TypeError(
    "built-in dye component edge-dye-study@13 changed without a revision.",
  );
}

if (
  serializeDyeComponentRecipe(EDGE_DYE_COMPONENT_RECIPE_R14)
    !== REGISTERED_RECIPES["edge-dye-study@14"]
) {
  throw new TypeError(
    "built-in dye component edge-dye-study@14 changed without a revision.",
  );
}

if (
  serializeDyeComponentRecipe(EDGE_DYE_COMPONENT_RECIPE_R15)
    !== REGISTERED_RECIPES["edge-dye-study@15"]
) {
  throw new TypeError(
    "built-in dye component edge-dye-study@15 changed without a revision.",
  );
}

if (
  serializeDyeComponentRecipe(EDGE_DYE_COMPONENT_RECIPE_R16)
    !== REGISTERED_RECIPES["edge-dye-study@16"]
) {
  throw new TypeError(
    "built-in dye component edge-dye-study@16 changed without a revision.",
  );
}

if (
  serializeDyeComponentRecipe(EDGE_DYE_COMPONENT_RECIPE_R2)
    !== REGISTERED_RECIPES["edge-dye-study@2"]
) {
  throw new TypeError(
    "built-in dye component edge-dye-study@2 changed without a revision.",
  );
}
export function assertDyeComponentRecipeCompatible(recipe) {
  validateDyeComponentRecipe(recipe);
  const key = keyFor(recipe);
  const registered = REGISTERED_RECIPES[key];
  if (
    registered !== undefined
    && serializeDyeComponentRecipe(recipe) !== registered
  ) {
    throw new TypeError(
      `dye component identity ${key} does not match its registered definition.`,
    );
  }
  const isCurrentModel =
    recipe.componentModelVersion === dyeComponentModelVersion
    && recipe.componentRecipeSchemaVersion
      === dyeComponentRecipeSchemaVersion;
  if (
    !isCurrentModel
    && isHistoricalRuntimeModel(recipe)
  ) {
    if (registered === undefined || !HISTORICAL_RUNTIME_KEYS.has(key)) {
      throw new TypeError(
        `historical dye component identity ${key} is not an exact registered recipe.`,
      );
    }
    return true;
  }
  if (recipe.componentModelVersion !== dyeComponentModelVersion) {
    throw new TypeError(
      `dyeComponentRecipe.componentModelVersion ${recipe.componentModelVersion} is incompatible with ${dyeComponentModelVersion}.`,
    );
  }
  if (
    recipe.componentRecipeSchemaVersion
      !== dyeComponentRecipeSchemaVersion
  ) {
    throw new TypeError(
      `dyeComponentRecipe.componentRecipeSchemaVersion ${recipe.componentRecipeSchemaVersion} is incompatible with ${dyeComponentRecipeSchemaVersion}.`,
    );
  }
  if (registered === undefined) {
    if (REGISTERED_RECIPE_IDS.has(recipe.id)) {
      throw new TypeError(`dye component identity ${key} is not registered.`);
    }
    return true;
  }
  return true;
}
