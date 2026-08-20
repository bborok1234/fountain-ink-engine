import { freezeInkRecipe } from "./ink-recipe.js";

// A muted burgundy ordinary dye: low Density opens into dusty mauve and high
// Density settles into plum-wine. It intentionally owns no dual-shading edge.
export const ORDINARY_BURGUNDY_RECIPE_R1 = freezeInkRecipe({
  id: "ordinary-burgundy",
  revision: 1,
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
        redBase: 76, redWetGain: 50,
        greenBase: 43, greenWetGain: 48, greenDensityLoss: 18,
        blueBase: 58, blueWetGain: 52, blueDensityLoss: 18,
        alphaGain: 1.08, maximumAlpha: 0.96,
      },
    },
  },
  optical: {
    densityColorCurve: [
      { density: 0, rgb: { red: 132, green: 87, blue: 104 } },
      { density: 0.5, rgb: { red: 101, green: 48, blue: 70 } },
      { density: 1, rgb: { red: 62, green: 24, blue: 42 } },
    ],
    minimumAlpha: 0.68,
    maximumAlpha: 0.96,
  },
});
