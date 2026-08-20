import { freezeInkRecipe } from "./ink-recipe.js";

// Revision 3 preserves every authored material coefficient from revision 2.
// Only its engine-model identity changes because r4 restricts the keyboard
// density accident field to each final glyph Contact mask's actual support.
export const ORDINARY_GREEN_RECIPE_R3 = freezeInkRecipe({
  id: "ordinary-green",
  revision: 3,
  engineModelVersion: "ordinary-js-r4",
  recipeSchemaVersion: 2,
  contact: {
    catalogId: "standard-nib-ladder-r1",
  },
  density: {
    meanMinimum: 0.08,
    meanMaximum: 0.9,
    meanBase: 0.18,
    flowGain: 0.7,
    absorptionLoss: 0.08,
    rangeMinimum: 0.045,
    rangeSmoothGain: 0.635,
    rangeMaximum: 1.04,
  },
  surface: {
    keyboard: {
      waterLoad: 0.377,
      pigmentLoad: 0.291,
      stepBase: 6,
      stepAbsorptionGain: 12,
      stepMilliseconds: 16.667,
      normalizationScale: 0.9,
      coverageMixExponent: 0.92,
    },
    direct: {
      waterBase: 0.085,
      waterFlowGain: 0.24,
      pigmentBase: 0.055,
      pigmentFlowGain: 0.17,
      optical: {
        fixedWeight: 0.92,
        mobileWeight: 0.68,
        pigmentMaximum: 1.35,
        densityExponent: 1.72,
        wetLift: 0.07,
        redBase: 18,
        redWetGain: 48,
        greenBase: 74,
        greenWetGain: 64,
        greenDensityLoss: 18,
        blueBase: 52,
        blueWetGain: 52,
        blueDensityLoss: 16,
        alphaGain: 1.08,
        maximumAlpha: 0.96,
      },
    },
  },
  optical: {
    rgb: { red: 29, green: 55, blue: 40 },
    minimumAlpha: 0.68,
    maximumAlpha: 0.96,
  },
});
