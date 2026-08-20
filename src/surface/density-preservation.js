import { assertFiniteRange } from "../contracts/numeric.js";
import { assertInkRecipeCompatible } from "../recipes/compatibility.js";

/** Surface-owned base range retained after paper absorption. */
export function getSurfaceDensityRange(normalizedAbsorption, recipe) {
  assertInkRecipeCompatible(recipe);
  const absorption = assertFiniteRange(
    normalizedAbsorption,
    "normalizedAbsorption",
    0,
    1,
  );
  return recipe.density.rangeMinimum
    + (1 - absorption) * recipe.density.rangeSmoothGain;
}
