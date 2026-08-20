/** Calculation identity. Bump when numeric behavior or interpretation changes. */
export const engineModelVersion = "ordinary-js-r6";

/** Serialized material recipe shape. */
export const recipeSchemaVersion = 3;

/** Experiment/checkpoint metadata shape. */
export const fixtureManifestVersion = 1;

export const ENGINE_VERSIONS = Object.freeze({
  engineModelVersion,
  recipeSchemaVersion,
  fixtureManifestVersion,
});
