import { assertInkRecipeCompatible } from "../recipes/compatibility.js";
import { assertFiniteRange } from "../contracts/numeric.js";

/**
 * Resolve direct-pointer water and pigment load from an authored ink recipe.
 * @param {Record<string, unknown>} recipe
 * @param {number} normalizedFlow 0...1
 */
export function getDirectDepositLoads(recipe, normalizedFlow) {
  assertInkRecipeCompatible(recipe);
  const flow = assertFiniteRange(normalizedFlow, "normalizedFlow", 0, 1);
  return Object.freeze({
    waterLoad: recipe.direct.waterBase
      + flow * recipe.direct.waterFlowGain,
    pigmentLoad: recipe.direct.pigmentBase
      + flow * recipe.direct.pigmentFlowGain,
  });
}
