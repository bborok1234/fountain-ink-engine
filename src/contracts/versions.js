/** Calculation identity. Bump when numeric behavior or interpretation changes. */
export const engineModelVersion = "ordinary-js-r10";

/** Serialized material recipe shape. */
export const recipeSchemaVersion = 6;

/** Experiment/checkpoint metadata shape. */
export const fixtureManifestVersion = 2;

export const ENGINE_VERSIONS = Object.freeze({
  engineModelVersion,
  recipeSchemaVersion,
  fixtureManifestVersion,
});
