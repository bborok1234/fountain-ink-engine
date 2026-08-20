import { freezeInkRecipe } from "./ink-recipe.js";

// A cool blue-black ordinary dye: dilute areas lift toward slate blue while
// concentrated areas settle into a quiet navy-black. No sheen or edge halo.
export const ORDINARY_BLUE_BLACK_RECIPE_R1 = freezeInkRecipe({
  id: "ordinary-blue-black",
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
        redBase: 22, redWetGain: 48,
        greenBase: 54, greenWetGain: 58, greenDensityLoss: 16,
        blueBase: 76, blueWetGain: 50, blueDensityLoss: 20,
        alphaGain: 1.08, maximumAlpha: 0.96,
      },
    },
  },
  optical: {
    densityColorCurve: [
      { density: 0, rgb: { red: 76, green: 94, blue: 108 } },
      { density: 0.5, rgb: { red: 43, green: 65, blue: 84 } },
      { density: 1, rgb: { red: 20, green: 37, blue: 55 } },
    ],
    minimumAlpha: 0.68,
    maximumAlpha: 0.96,
  },
});
