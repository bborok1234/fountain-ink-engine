import { freezeInkRecipe } from "./ink-recipe.js";

// Revision 7 preserves ordinary-green@6 geometry, Density, Surface, direct
// physics, alpha, and fixed RGB exactly while expressing keyboard color as a
// three-point curve. It is the r8 control recipe for color-ink comparisons.
export const ORDINARY_GREEN_RECIPE_R7 = freezeInkRecipe({
  id: "ordinary-green",
  revision: 7,
  engineModelVersion: "ordinary-js-r8",
  recipeSchemaVersion: 5,
  contact: { catalogId: "standard-nib-ladder-r1" },
  density: {
    meanMinimum: 0.08, meanMaximum: 0.9, meanBase: 0.18, flowGain: 0.7,
    absorptionLoss: 0.08, rangeMinimum: 0.045, rangeSmoothGain: 0.635,
    rangeMaximum: 1.04,
  },
  surface: {
    keyboard: {
      waterLoad: 0.377, pigmentLoad: 0.291, stepBase: 6,
      stepAbsorptionGain: 12, stepMilliseconds: 16.667,
      normalizationScale: 0.9, normalizationReferenceAlpha: 107,
      coverageMixExponent: 0.92, minimumContactRetention: 0.54,
    },
    direct: {
      waterBase: 0.085, waterFlowGain: 0.24,
      pigmentBase: 0.055, pigmentFlowGain: 0.17,
      optical: {
        fixedWeight: 0.92, mobileWeight: 0.68, pigmentMaximum: 1.35,
        densityExponent: 1.72, wetLift: 0.07,
        redBase: 18, redWetGain: 48,
        greenBase: 74, greenWetGain: 64, greenDensityLoss: 18,
        blueBase: 52, blueWetGain: 52, blueDensityLoss: 16,
        alphaGain: 1.08, maximumAlpha: 0.96,
      },
    },
  },
  optical: {
    densityColorCurve: [
      { density: 0, rgb: { red: 29, green: 55, blue: 40 } },
      { density: 0.5, rgb: { red: 29, green: 55, blue: 40 } },
      { density: 1, rgb: { red: 29, green: 55, blue: 40 } },
    ],
    minimumAlpha: 0.68,
    maximumAlpha: 0.96,
  },
});
