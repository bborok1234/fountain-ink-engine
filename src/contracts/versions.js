/** Calculation identity. Bump when numeric behavior or interpretation changes. */
export const engineModelVersion = "ordinary-js-r7";

/** Serialized material recipe shape. */
export const recipeSchemaVersion = 4;

/** Experiment/checkpoint metadata shape. */
export const fixtureManifestVersion = 1;

export const ENGINE_VERSIONS = Object.freeze({
  engineModelVersion,
  recipeSchemaVersion,
  fixtureManifestVersion,
});
