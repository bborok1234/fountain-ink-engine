export const surfaceModelVersion = "paper-surface-js-r2";
export const surfaceRecipeSchemaVersion = 2;

export const SUPPORTED_SURFACE_RUNTIME_VERSIONS = Object.freeze([
  Object.freeze({
    surfaceModelVersion: "paper-surface-js-r1",
    surfaceRecipeSchemaVersion: 1,
  }),
  Object.freeze({
    surfaceModelVersion,
    surfaceRecipeSchemaVersion,
  }),
]);

export const SURFACE_VERSIONS = Object.freeze({
  surfaceModelVersion,
  surfaceRecipeSchemaVersion,
});
