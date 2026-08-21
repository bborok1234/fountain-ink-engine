import { freezeDyeComponentRecipe } from "./dye-component-recipe.js";

// R2 keeps the authored A1 transport coefficients and adds a separately
// versioned relative-enrichment diagnostic to the returned component state.
export const EDGE_DYE_COMPONENT_RECIPE_R2 = freezeDyeComponentRecipe({
  id: "edge-dye-study",
  revision: 2,
  componentModelVersion: "dye-component-js-r2",
  componentRecipeSchemaVersion: 1,
  massFraction: 0.32,
  mobilityMultiplier: 1.45,
  retentionMultiplier: 0.62,
});
