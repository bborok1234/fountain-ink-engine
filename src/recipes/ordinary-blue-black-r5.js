import { freezeInkRecipe } from "./ink-recipe.js";

export const ORDINARY_BLUE_BLACK_RECIPE_R5 = freezeInkRecipe({
  id: "ordinary-blue-black", revision: 5,
  engineModelVersion: "ordinary-js-r12", recipeSchemaVersion: 6,
  contact: { catalogId: "standard-nib-ladder-r1" },
  density: { meanMinimum: 0.08, meanMaximum: 0.9, meanBase: 0.18, flowGain: 0.7, rangeMaximum: 1.04 },
  keyboardDeposit: { waterLoad: 0.377, pigmentLoad: 0.291 },
  direct: {
    waterBase: 0.085, waterFlowGain: 0.24, pigmentBase: 0.055, pigmentFlowGain: 0.17,
    optical: {
      fixedWeight: 0.92, mobileWeight: 0.68, pigmentMaximum: 1.35, densityExponent: 1.72, wetLift: 0.07,
      redBase: 22, redWetGain: 48, greenBase: 54, greenWetGain: 58, greenDensityLoss: 16,
      blueBase: 76, blueWetGain: 50, blueDensityLoss: 20, alphaGain: 1.08, maximumAlpha: 0.96,
    },
  },
  optical: {
    densityColorCurve: [
      { density: 0, rgb: { red: 76, green: 94, blue: 108 } },
      { density: 0.5, rgb: { red: 43, green: 65, blue: 84 } },
      { density: 1, rgb: { red: 20, green: 37, blue: 55 } },
    ],
    minimumAlpha: 0.68, maximumAlpha: 0.96,
  },
});
