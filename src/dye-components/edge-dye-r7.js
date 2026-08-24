import { freezeDyeComponentRecipe } from "./dye-component-recipe.js";

// R7 preserves the R6 palette and transported discontinuous zones. Optical
// intersects those coarse zones with a scale-aware inner Contact band so the
// secondary dye reads as partial edging instead of recoloring whole strokes.
export const EDGE_DYE_COMPONENT_RECIPE_R7 = freezeDyeComponentRecipe({
  id: "edge-dye-study",
  revision: 7,
  componentModelVersion: "dye-component-js-r7",
  componentRecipeSchemaVersion: 6,
  massFraction: 0.32,
  mobilityMultiplier: 1.45,
  retentionMultiplier: 0.62,
  edgeEnrichmentThreshold: 0.02,
  edgeMassGain: 200,
  edgeRed: 15,
  edgeGreen: 145,
  edgeBlue: 104,
  // The transported zone peaks around 0.13 in the reference sentence. The
  // Contact-band intersection already confines the secondary dye spatially,
  // so this gain makes that narrow band legible without recoloring the stroke.
  edgeMixGain: 7,
  edgeMixMaximum: 0.86,
  edgeZoneRadius: 1,
  edgeZoneMinimumStrength: 0.38,
  edgeZonePeakThreshold: 0.003,
  baseLowRed: 136,
  baseLowGreen: 156,
  baseLowBlue: 202,
  baseMidRed: 101,
  baseMidGreen: 144,
  baseMidBlue: 173,
  baseHighRed: 105,
  baseHighGreen: 90,
  baseHighBlue: 158,
  baseMix: 0.86,
  edgeBandCssPixels: 1,
});
