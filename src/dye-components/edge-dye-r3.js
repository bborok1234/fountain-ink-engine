import { freezeDyeComponentRecipe } from "./dye-component-recipe.js";

// R3 turns positive relative enrichment plus local mass exposure into a
// discontinuous diagnostic candidate. It still owns no Optical color.
export const EDGE_DYE_COMPONENT_RECIPE_R3 = freezeDyeComponentRecipe({
  id: "edge-dye-study",
  revision: 3,
  componentModelVersion: "dye-component-js-r3",
  componentRecipeSchemaVersion: 2,
  massFraction: 0.32,
  mobilityMultiplier: 1.45,
  retentionMultiplier: 0.62,
  edgeEnrichmentThreshold: 0.02,
  edgeMassGain: 200,
});
