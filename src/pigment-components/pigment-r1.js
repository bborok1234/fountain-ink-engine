import { freezePigmentComponentRecipe } from "./pigment-component-recipe.js";

// A1 establishes a non-reflective solid colorant carrier. The coefficients are
// authored experiment values, not measurements of one commercial formula.
export const PIGMENT_COMPONENT_RECIPE_R1 = freezePigmentComponentRecipe({
  id: "pigment-study",
  revision: 1,
  componentModelVersion: "pigment-component-js-r1",
  componentRecipeSchemaVersion: 1,
  massFraction: 0.85,
  mobilityMultiplier: 0.35,
  retentionMultiplier: 1.8,
});
