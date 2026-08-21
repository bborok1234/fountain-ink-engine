import {
  pigmentComponentModelVersion,
  pigmentComponentRecipeSchemaVersion,
  serializePigmentComponentRecipe,
  validatePigmentComponentRecipe,
} from "./pigment-component-recipe.js";
import { PIGMENT_COMPONENT_RECIPE_R1 } from "./pigment-r1.js";

const REGISTERED_PIGMENT_RECIPES = new Map([
  [
    "pigment-study@1",
    "{\"componentModelVersion\":\"pigment-component-js-r1\",\"componentRecipeSchemaVersion\":1,\"id\":\"pigment-study\",\"massFraction\":0.85,\"mobilityMultiplier\":0.35,\"retentionMultiplier\":1.8,\"revision\":1}",
  ],
]);

if (
  serializePigmentComponentRecipe(PIGMENT_COMPONENT_RECIPE_R1)
  !== REGISTERED_PIGMENT_RECIPES.get("pigment-study@1")
) {
  throw new Error(
    "pigment-study@1 changed without a registered component revision.",
  );
}

export function assertPigmentComponentRecipeCompatible(recipe) {
  validatePigmentComponentRecipe(recipe);
  if (recipe.componentModelVersion !== pigmentComponentModelVersion) {
    throw new TypeError(
      `pigment component model ${recipe.componentModelVersion} is incompatible with ${pigmentComponentModelVersion}.`,
    );
  }
  if (
    recipe.componentRecipeSchemaVersion
    !== pigmentComponentRecipeSchemaVersion
  ) {
    throw new TypeError(
      `pigment component schema ${recipe.componentRecipeSchemaVersion} is incompatible with ${pigmentComponentRecipeSchemaVersion}.`,
    );
  }
  const key = `${recipe.id}@${recipe.revision}`;
  const registered = REGISTERED_PIGMENT_RECIPES.get(key);
  if (
    registered !== undefined
    && serializePigmentComponentRecipe(recipe) !== registered
  ) {
    throw new TypeError(`registered pigment component ${key} does not match its canonical recipe.`);
  }
  return true;
}
