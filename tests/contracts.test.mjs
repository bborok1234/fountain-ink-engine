import assert from "node:assert/strict";
import test from "node:test";
import {
  ENGINE_VERSIONS,
  createExperimentRecord,
  engineModelVersion,
  fixtureManifestVersion,
  freezeComponentInputs,
  freezeRenderContext,
  recipeSchemaVersion,
  validateExperimentRecord,
  validateComponentInputs,
  validateRenderContext,
} from "../src/contracts/index.js";
import {
  ORDINARY_GREEN_RECIPE_R3,
  ORDINARY_GREEN_RECIPE_R5,
  ORDINARY_GREEN_RECIPE_R6,
  ORDINARY_GREEN_RECIPE_R12,
  assertInkRecipeCompatible,
} from "../src/recipes/index.js";
import { PAPER_SURFACE_BALANCED_R1 } from "../src/surface-recipes/index.js";
import { OXIDATION_COMPONENT_RECIPE_R1 } from "../src/oxidation-components/index.js";

const CURRENT_RENDER_CONTEXT = Object.freeze({
  literalText: "오늘은",
  segmentationLocale: "ko",
  segmentationRuntime: "Intl.Segmenter",
  segmentationRuntimeVersion: "test-icu",
  graphemes: Object.freeze(["오", "늘", "은"]),
  glyphSeeds: Object.freeze([1, 2, 3]),
  glyphSeedDerivation: "fountain-cadence-seed-v1",
  surfaceSeed: 0x13579bdf,
  surfaceSeedDerivation: "explicit-surface-seed-v1",
  nibId: "M",
  flow: 58,
  fontSize: 28,
  textPosition: Object.freeze({ x: 0, y: 0.5 }),
  viewport: Object.freeze({ width: 390, height: 844 }),
  raster: Object.freeze({
    devicePixelRatio: 3,
    scale: 2,
    colorSpace: "srgb",
  }),
  font: Object.freeze({
    family: "Nanum Pen Script",
    weight: 400,
    style: "normal",
    packageName: "@fontsource/nanum-pen-script",
    packageVersion: "5.3.0",
    assetSha256: "a".repeat(64),
    loadState: "loaded",
  }),
  dependencies: Object.freeze({
    lockfileName: "package-lock.json",
    lockfileSha256: "b".repeat(64),
  }),
});

test("publishes three independent engine version axes", () => {
  assert.equal(engineModelVersion, "ordinary-js-r13");
  assert.equal(recipeSchemaVersion, 6);
  assert.equal(fixtureManifestVersion, 3);
  assert.deepEqual(ENGINE_VERSIONS, {
    engineModelVersion,
    recipeSchemaVersion,
    fixtureManifestVersion,
  });
  assert.ok(Object.isFrozen(ENGINE_VERSIONS));
});

test("creates explicit immutable experiment records without a wall clock", () => {
  const record = createExperimentRecord({
    id: "E-002-blue-ordinary",
    hypothesis: "A blue dye curve can reuse the same geometry.",
    seed: 42,
    recipe: ORDINARY_GREEN_RECIPE_R12,
    surfaceRecipe: PAPER_SURFACE_BALANCED_R1,
    renderContext: CURRENT_RENDER_CONTEXT,
    expected: "Geometry is unchanged.",
  });
  assert.equal(validateExperimentRecord(record), true);
  assert.equal(record.recordedAt, null);
  assert.equal(record.engineModelVersion, engineModelVersion);
  assert.ok(Object.isFrozen(record));
  assert.ok(Object.isFrozen(record.recipe));
  assert.equal(record.surfaceRecipe, PAPER_SURFACE_BALANCED_R1);
  assert.deepEqual(record.renderContext, CURRENT_RENDER_CONTEXT);
  assert.ok(Object.isFrozen(record.renderContext.font));
  assert.ok(Object.isFrozen(record.renderContext.glyphSeeds));
});

test("rejects implicit, invalid, or non-serializable experiment inputs", () => {
  assert.throws(() => createExperimentRecord({
    id: "",
    hypothesis: "missing id",
    seed: 1,
    recipe: ORDINARY_GREEN_RECIPE_R12,
    surfaceRecipe: PAPER_SURFACE_BALANCED_R1,
    renderContext: CURRENT_RENDER_CONTEXT,
  }));
  assert.throws(() => createExperimentRecord({
    id: "E-x",
    hypothesis: "aliased seed",
    seed: 0x1_0000_0000,
    recipe: ORDINARY_GREEN_RECIPE_R12,
    surfaceRecipe: PAPER_SURFACE_BALANCED_R1,
    renderContext: CURRENT_RENDER_CONTEXT,
  }), /unsigned 32-bit integer/);
  assert.throws(() => createExperimentRecord({
    id: "E-x",
    hypothesis: "invalid seed",
    seed: -1,
    recipe: ORDINARY_GREEN_RECIPE_R12,
    surfaceRecipe: PAPER_SURFACE_BALANCED_R1,
    renderContext: CURRENT_RENDER_CONTEXT,
  }));
  assert.throws(() => createExperimentRecord({
    id: "E-x",
    hypothesis: "invalid recipe",
    seed: 1,
    recipe: { amount: Number.NaN },
  }));
  assert.throws(() => createExperimentRecord({
    id: "E-x",
    hypothesis: "mismatched model",
    seed: 1,
    recipe: ORDINARY_GREEN_RECIPE_R12,
    surfaceRecipe: PAPER_SURFACE_BALANCED_R1,
    renderContext: CURRENT_RENDER_CONTEXT,
    engineModelVersion: "something-else",
  }), /must match/);
  assert.throws(() => createExperimentRecord({
    id: "E-x",
    hypothesis: "mismatched schema",
    seed: 1,
    recipe: ORDINARY_GREEN_RECIPE_R12,
    surfaceRecipe: PAPER_SURFACE_BALANCED_R1,
    recipeSchemaVersion: 999,
  }), /Unsupported experiment recipeSchemaVersion/);
  assert.throws(() => createExperimentRecord({
    id: "E-x",
    hypothesis: "unknown fixture schema",
    seed: 1,
    recipe: ORDINARY_GREEN_RECIPE_R12,
    surfaceRecipe: PAPER_SURFACE_BALANCED_R1,
    fixtureManifestVersion: 999,
  }), /Unsupported fixtureManifestVersion/);
});

test("experiment records deeply freeze a pre-frozen recipe root", () => {
  const clone = JSON.parse(JSON.stringify(ORDINARY_GREEN_RECIPE_R12));
  Object.freeze(clone);
  const record = createExperimentRecord({
    id: "E-deep-freeze",
    hypothesis: "Pre-frozen input cannot leave mutable recipe children.",
    seed: 7,
    recipe: clone,
    surfaceRecipe: PAPER_SURFACE_BALANCED_R1,
    renderContext: CURRENT_RENDER_CONTEXT,
  });
  assert.ok(Object.isFrozen(record.recipe.density));
  assert.throws(() => {
    record.recipe.density.meanBase = 0.77;
  }, TypeError);
});

test("experiment records reject a forged built-in recipe identity", () => {
  const impostor = JSON.parse(JSON.stringify(ORDINARY_GREEN_RECIPE_R12));
  impostor.density.meanBase = 0.75;
  assert.throws(() => createExperimentRecord({
    id: "E-forged-built-in",
    hypothesis: "A reserved identity cannot describe new calculations.",
    seed: 9,
    recipe: impostor,
    surfaceRecipe: PAPER_SURFACE_BALANCED_R1,
    renderContext: CURRENT_RENDER_CONTEXT,
  }), /does not match its registered definition/);
});

test("experiment metadata rejects accessors that outlive deep freezing", () => {
  let externalResult = "first";
  const observed = {};
  Object.defineProperty(observed, "result", {
    enumerable: true,
    get: () => externalResult,
  });
  assert.throws(() => createExperimentRecord({
    id: "E-accessor-observation",
    hypothesis: "Observation evidence must be immutable plain data.",
    seed: 10,
    recipe: ORDINARY_GREEN_RECIPE_R12,
    surfaceRecipe: PAPER_SURFACE_BALANCED_R1,
    renderContext: CURRENT_RENDER_CONTEXT,
    observed,
  }), /result must be an enumerable data property/);
  externalResult = "changed";
  assert.equal(observed.result, "changed");
});

test("experiment records require their complete schema as own data", () => {
  const valid = createExperimentRecord({
    id: "E-own-data",
    hypothesis: "Checkpoint fields cannot come from a polluted prototype.",
    seed: 11,
    recipe: ORDINARY_GREEN_RECIPE_R12,
    surfaceRecipe: PAPER_SURFACE_BALANCED_R1,
    renderContext: CURRENT_RENDER_CONTEXT,
  });
  const missingOwnFields = { recipe: ORDINARY_GREEN_RECIPE_R12 };
  assert.throws(
    () => validateExperimentRecord(missingOwnFields),
    /fixtureManifestVersion must be an enumerable own data property/,
  );

  const accessorRoot = { ...valid };
  Object.defineProperty(accessorRoot, "id", {
    enumerable: true,
    get: () => "E-accessor-root",
  });
  assert.throws(
    () => validateExperimentRecord(accessorRoot),
    /record\.id must be an enumerable own data property/,
  );
  assert.throws(
    () => validateExperimentRecord({
      ...valid,
      fixtureManifestVersion: 999,
    }),
    /Unsupported fixtureManifestVersion/,
  );
});

test("fixture manifest v3 records replay-critical text, seed, raster, font, and dependency facts", () => {
  const frozen = freezeRenderContext(CURRENT_RENDER_CONTEXT);
  assert.equal(validateRenderContext(frozen), true);
  assert.equal(frozen.graphemes.join(""), frozen.literalText);
  assert.deepEqual(frozen.glyphSeeds, [1, 2, 3]);
  assert.equal(frozen.surfaceSeed, 0x13579bdf);
  assert.equal(frozen.font.assetSha256, "a".repeat(64));
  assert.equal(frozen.dependencies.lockfileSha256, "b".repeat(64));
  assert.ok(Object.isFrozen(frozen.textPosition));
  assert.ok(Object.isFrozen(frozen.raster));

  const record = createExperimentRecord({
    id: "E-checkpoint-v3",
    hypothesis: "The rendering environment is explicit and JSON-safe.",
    seed: 0x12345678,
    recipe: ORDINARY_GREEN_RECIPE_R12,
    surfaceRecipe: PAPER_SURFACE_BALANCED_R1,
    renderContext: CURRENT_RENDER_CONTEXT,
  });
  assert.equal(record.fixtureManifestVersion, 3);
  assert.deepEqual(record.componentInputs, []);
  assert.equal(validateExperimentRecord(JSON.parse(JSON.stringify(record))), true);
});

test("fixture manifest v3 records specialty recipes and their explicit observations", () => {
  const componentInputs = freezeComponentInputs([{
    family: "oxidation",
    recipe: OXIDATION_COMPONENT_RECIPE_R1,
    observation: {
      committedAtMilliseconds: 20_000,
      observedAtMilliseconds: 110_000,
    },
    seed: null,
  }]);
  assert.equal(validateComponentInputs(componentInputs), true);
  const record = createExperimentRecord({
    id: "E-oxidation-checkpoint-v3",
    hypothesis: "The specialty recipe and explicit age remain replayable.",
    seed: 0x12345678,
    recipe: ORDINARY_GREEN_RECIPE_R12,
    surfaceRecipe: PAPER_SURFACE_BALANCED_R1,
    componentInputs,
    renderContext: CURRENT_RENDER_CONTEXT,
  });
  assert.equal(record.componentInputs[0].family, "oxidation");
  assert.equal(
    record.componentInputs[0].observation.observedAtMilliseconds
      - record.componentInputs[0].observation.committedAtMilliseconds,
    90_000,
  );
  assert.ok(Object.isFrozen(record.componentInputs[0].recipe));
  assert.equal(validateExperimentRecord(JSON.parse(JSON.stringify(record))), true);
});

test("fixture manifest v3 rejects ambiguous segmentation, seed, hash, and accessor inputs", () => {
  assert.throws(() => freezeRenderContext({
    ...CURRENT_RENDER_CONTEXT,
    graphemes: ["오", "늘"],
  }), /reconstruct literalText/);
  assert.throws(() => freezeRenderContext({
    ...CURRENT_RENDER_CONTEXT,
    glyphSeeds: [1, 2],
  }), /match grapheme count/);
  assert.throws(() => freezeRenderContext({
    ...CURRENT_RENDER_CONTEXT,
    font: {
      ...CURRENT_RENDER_CONTEXT.font,
      assetSha256: "not-a-hash",
    },
  }), /SHA-256/);
  let getterReads = 0;
  const accessor = { ...CURRENT_RENDER_CONTEXT };
  Object.defineProperty(accessor, "surfaceSeed", {
    enumerable: true,
    get() {
      getterReads += 1;
      return 1;
    },
  });
  assert.throws(() => freezeRenderContext(accessor), /own data property/);
  assert.equal(getterReads, 0);
  assert.throws(() => freezeComponentInputs([
    {
      family: "oxidation",
      recipe: OXIDATION_COMPONENT_RECIPE_R1,
      observation: {
        committedAtMilliseconds: 100,
        observedAtMilliseconds: 99,
      },
      seed: null,
    },
  ]), /at or after/);
});

test("fixture manifest v2 remains readable without inventing render context", () => {
  const historical = createExperimentRecord({
    id: "E-surface-recipe-v2",
    hypothesis: "The previous Surface-aware manifest remains archival.",
    seed: 0x13579bdf,
    recipe: ORDINARY_GREEN_RECIPE_R12,
    surfaceRecipe: PAPER_SURFACE_BALANCED_R1,
    fixtureManifestVersion: 2,
  });
  assert.equal(validateExperimentRecord(historical), true);
  assert.equal(historical.fixtureManifestVersion, 2);
  assert.equal(Object.hasOwn(historical, "renderContext"), false);
});

test("schema-2 experiment checkpoints remain readable without migration", () => {
  const historical = createExperimentRecord({
    id: "E-005-density-locality-r3",
    hypothesis: "A schema-2 checkpoint keeps its authored recipe unchanged.",
    seed: 0x13579bdf,
    recipe: ORDINARY_GREEN_RECIPE_R3,
    fixtureManifestVersion: 1,
  });
  assert.equal(validateExperimentRecord(historical), true);
  assert.equal(historical.recipeSchemaVersion, 2);
  assert.equal(historical.engineModelVersion, "ordinary-js-r4");
  assert.deepEqual(historical.recipe, ORDINARY_GREEN_RECIPE_R3);
  assert.throws(
    () => assertInkRecipeCompatible(historical.recipe),
    /incompatible/,
  );
});

test("schema-3 experiment checkpoints remain readable without migration", () => {
  const historical = createExperimentRecord({
    id: "E-007-surface-density-transport",
    hypothesis: "A schema-3 checkpoint keeps its authored recipe unchanged.",
    seed: 0x13579bdf,
    recipe: ORDINARY_GREEN_RECIPE_R5,
    fixtureManifestVersion: 1,
  });
  assert.equal(validateExperimentRecord(historical), true);
  assert.equal(historical.recipeSchemaVersion, 3);
  assert.equal(historical.engineModelVersion, "ordinary-js-r6");
  assert.deepEqual(historical.recipe, ORDINARY_GREEN_RECIPE_R5);
  assert.throws(
    () => assertInkRecipeCompatible(historical.recipe),
    /incompatible/,
  );
});

test("schema-4 experiment checkpoints remain readable without migration", () => {
  const historical = createExperimentRecord({
    id: "E-012-contact-contract",
    hypothesis: "A schema-4 checkpoint keeps its authored recipe unchanged.",
    seed: 0x13579bdf,
    recipe: ORDINARY_GREEN_RECIPE_R6,
    fixtureManifestVersion: 1,
  });
  assert.equal(validateExperimentRecord(historical), true);
  assert.equal(historical.recipeSchemaVersion, 4);
  assert.equal(historical.engineModelVersion, "ordinary-js-r7");
  assert.deepEqual(historical.recipe, ORDINARY_GREEN_RECIPE_R6);
  assert.throws(
    () => assertInkRecipeCompatible(historical.recipe),
    /incompatible/,
  );
});

test("schema-1 experiment checkpoints remain archival and non-renderable", () => {
  const legacyRecipe = {
    nib: "M",
    ink: "ordinary-blue",
    surface: "middle",
  };
  const legacy = createExperimentRecord({
    id: "E-001-public-schema-1",
    attempt: "A1",
    parentExperimentId: null,
    engineModelVersion: "ordinary-js-r1",
    recipeSchemaVersion: 1,
    fixtureManifestVersion: 1,
    status: "passed",
    hypothesis: "The first public checkpoint remains readable.",
    seed: 1_787_200_000_000,
    recipe: legacyRecipe,
    expected: "archival only",
    observed: "preserved",
    lesson: null,
    nextMethod: null,
    recordedAt: null,
  });
  assert.equal(validateExperimentRecord(legacy), true);
  assert.equal(legacy.seed, 1_787_200_000_000);
  assert.deepEqual(legacy.recipe, legacyRecipe);
  assert.ok(Object.isFrozen(legacy.recipe));
  assert.throws(
    () => assertInkRecipeCompatible(legacy.recipe),
    /recipeSchemaVersion must be an enumerable own data property/,
  );
});
