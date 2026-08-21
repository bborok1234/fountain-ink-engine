import { freezeDyeComponentRecipe } from "./dye-component-recipe.js";

// R5 turns sparse discontinuous accumulation points into bounded color zones.
// A zone may grow only one Surface-grid cell from a real candidate and only
// through positively enriched, visibly deposited component mass. Optical then
// colors that authored zone without adding alpha or geometry.
export const EDGE_DYE_COMPONENT_RECIPE_R5 = freezeDyeComponentRecipe({
  id: "edge-dye-study",
  revision: 5,
  componentModelVersion: "dye-component-js-r5",
  componentRecipeSchemaVersion: 4,
  massFraction: 0.32,
  mobilityMultiplier: 1.45,
  retentionMultiplier: 0.62,
  edgeEnrichmentThreshold: 0.02,
  edgeMassGain: 200,
  edgeRed: 152,
  edgeGreen: 26,
  edgeBlue: 116,
  edgeMixGain: 2,
  edgeMixMaximum: 0.86,
  edgeZoneRadius: 1,
  edgeZoneMinimumStrength: 0.38,
  edgeZonePeakThreshold: 0.003,
});
