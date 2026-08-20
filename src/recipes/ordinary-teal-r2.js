import { freezeInkRecipe } from "./ink-recipe.js";

export const ORDINARY_TEAL_RECIPE_R2 = freezeInkRecipe({
  id: "ordinary-teal",
  revision: 2,
  engineModelVersion: "ordinary-js-r9",
  recipeSchemaVersion: 6,
  contact: { catalogId: "standard-nib-ladder-r1" },
  density: {
    meanMinimum: 0.08, meanMaximum: 0.9, meanBase: 0.18,
    flowGain: 0.7, rangeMaximum: 1.04,
  },
  keyboardDeposit: { waterLoad: 0.377, pigmentLoad: 0.291 },
  direct: {
    waterBase: 0.085, waterFlowGain: 0.24,
    pigmentBase: 0.055, pigmentFlowGain: 0.17,
    optical: {
      fixedWeight: 0.92, mobileWeight: 0.68, pigmentMaximum: 1.35,
      densityExponent: 1.72, wetLift: 0.07,
      redBase: 18, redWetGain: 45,
      greenBase: 83, greenWetGain: 62, greenDensityLoss: 20,
      blueBase: 86, blueWetGain: 58, blueDensityLoss: 18,
      alphaGain: 1.08, maximumAlpha: 0.96,
    },
  },
  optical: {
    densityColorCurve: [
      { density: 0, rgb: { red: 70, green: 119, blue: 114 } },
      { density: 0.5, rgb: { red: 29, green: 91, blue: 87 } },
      { density: 1, rgb: { red: 12, green: 55, blue: 57 } },
    ],
    minimumAlpha: 0.68,
    maximumAlpha: 0.96,
  },
});
