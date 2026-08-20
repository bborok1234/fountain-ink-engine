import { freezeInkRecipe } from "./ink-recipe.js";

export const ORDINARY_GREEN_RECIPE_R8 = freezeInkRecipe({
  id: "ordinary-green",
  revision: 8,
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
      redBase: 18, redWetGain: 48,
      greenBase: 74, greenWetGain: 64, greenDensityLoss: 18,
      blueBase: 52, blueWetGain: 52, blueDensityLoss: 16,
      alphaGain: 1.08, maximumAlpha: 0.96,
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
