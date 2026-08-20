import { assertSurfaceRecipeCompatible } from "../surface-recipes/index.js";

/** Surface-owned base range retained after paper absorption. */
export function getSurfaceDensityRange(surfaceRecipe) {
  assertSurfaceRecipeCompatible(surfaceRecipe);
  return 0.045 + surfaceRecipe.axes.filmPreservation * 0.635;
}
