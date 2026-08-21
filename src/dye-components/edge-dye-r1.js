import { freezeDyeComponentRecipe } from "./dye-component-recipe.js";

// A diagnostic-only second dye. It shares the ordinary wet footprint but
// moves farther and fixes more slowly. It has no Optical color in A1.
export const EDGE_DYE_COMPONENT_RECIPE_R1 = freezeDyeComponentRecipe({
  id: "edge-dye-study",
  revision: 1,
  componentModelVersion: "dye-component-js-r1",
  componentRecipeSchemaVersion: 1,
  massFraction: 0.32,
  mobilityMultiplier: 1.45,
  retentionMultiplier: 0.62,
});
