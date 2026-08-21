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

const REGISTERED_RECIPES = Object.freeze({
  "edge-dye-study@1": "{\"componentModelVersion\":\"dye-component-js-r1\",\"componentRecipeSchemaVersion\":1,\"id\":\"edge-dye-study\",\"massFraction\":0.32,\"mobilityMultiplier\":1.45,\"retentionMultiplier\":0.62,\"revision\":1}",
  "edge-dye-study@2": "{\"componentModelVersion\":\"dye-component-js-r2\",\"componentRecipeSchemaVersion\":1,\"id\":\"edge-dye-study\",\"massFraction\":0.32,\"mobilityMultiplier\":1.45,\"retentionMultiplier\":0.62,\"revision\":2}",
  "edge-dye-study@3": "{\"componentModelVersion\":\"dye-component-js-r3\",\"componentRecipeSchemaVersion\":2,\"edgeEnrichmentThreshold\":0.02,\"edgeMassGain\":200,\"id\":\"edge-dye-study\",\"massFraction\":0.32,\"mobilityMultiplier\":1.45,\"retentionMultiplier\":0.62,\"revision\":3}",
  "edge-dye-study@4": "{\"componentModelVersion\":\"dye-component-js-r4\",\"componentRecipeSchemaVersion\":3,\"edgeBlue\":78,\"edgeEnrichmentThreshold\":0.02,\"edgeGreen\":46,\"edgeMassGain\":200,\"edgeMixGain\":12,\"edgeMixMaximum\":0.72,\"edgeRed\":138,\"id\":\"edge-dye-study\",\"massFraction\":0.32,\"mobilityMultiplier\":1.45,\"retentionMultiplier\":0.62,\"revision\":4}",
});

const keyFor = (recipe) => `${recipe.id}@${recipe.revision}`;

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
  serializeDyeComponentRecipe(EDGE_DYE_COMPONENT_RECIPE_R2)
    !== REGISTERED_RECIPES["edge-dye-study@2"]
) {
  throw new TypeError(
    "built-in dye component edge-dye-study@2 changed without a revision.",
  );
}
export function assertDyeComponentRecipeCompatible(recipe) {
  validateDyeComponentRecipe(recipe);
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
  const key = keyFor(recipe);
  const registered = REGISTERED_RECIPES[key];
  if (registered === undefined) {
    throw new TypeError(`dye component identity ${key} is not registered.`);
  }
  if (serializeDyeComponentRecipe(recipe) !== registered) {
    throw new TypeError(
      `dye component identity ${key} does not match its registered definition.`,
    );
  }
  return true;
}
