import { assertOxidationComponentRecipeCompatible } from "./compatibility.js";
import { readOxidationObservation } from "./oxidation-component-recipe.js";

export function createOxidationState({
  oxidationComponentRecipe,
  oxidationObservation,
}) {
  assertOxidationComponentRecipeCompatible(oxidationComponentRecipe);
  const observation = readOxidationObservation(oxidationObservation);
  const halfLives = observation.elapsedMilliseconds
    / oxidationComponentRecipe.reactionHalfLifeMilliseconds;
  const baseProgress = 1 - (2 ** -halfLives);
  const progress = Math.pow(
    Math.min(1, Math.max(0, baseProgress)),
    oxidationComponentRecipe.progressExponent,
  );
  return Object.freeze({
    ...observation,
    progress,
  });
}
