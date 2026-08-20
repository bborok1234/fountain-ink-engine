import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import {
  ORDINARY_GREEN_RECIPE_R1,
  ORDINARY_GREEN_RECIPE_R2,
  assertInkRecipeCompatible,
  assertRegisteredInkRecipeIdentity,
  freezeInkRecipe,
  parseInkRecipe,
  serializeInkRecipe,
  validateInkRecipe,
} from "../src/recipes/index.js";

test("ordinary-green revisions are deeply immutable and schema-valid", () => {
  for (const recipe of [ORDINARY_GREEN_RECIPE_R1, ORDINARY_GREEN_RECIPE_R2]) {
    assert.equal(validateInkRecipe(recipe), true);
    assert.equal(recipe.id, "ordinary-green");
    assert.ok(Object.isFrozen(recipe));
    assert.ok(Object.isFrozen(recipe.surface.direct.optical));
  }
  assert.equal(ORDINARY_GREEN_RECIPE_R1.revision, 1);
  assert.equal(ORDINARY_GREEN_RECIPE_R2.revision, 2);
});

test("recipe serialization is canonical and round-trips without reinterpretation", () => {
  for (const recipe of [ORDINARY_GREEN_RECIPE_R1, ORDINARY_GREEN_RECIPE_R2]) {
    const serialized = serializeInkRecipe(recipe);
    const parsed = parseInkRecipe(serialized);
    assert.deepEqual(parsed, recipe);
    assert.equal(serializeInkRecipe(parsed), serialized);
    assert.ok(Object.isFrozen(parsed));
  }
});

test("ordinary-green@1 has an independently pinned canonical fingerprint", () => {
  const canonical = serializeInkRecipe(ORDINARY_GREEN_RECIPE_R1);
  const fingerprint = createHash("sha256")
    .update(canonical, "utf8")
    .digest("hex");

  assert.equal(
    fingerprint,
    "09bf428c7da4c81936aced2ffd286abafaae2fae1719de8517df32f9ca1a5794",
    "changing ordinary-green@1 parameters requires a new recipe revision",
  );
  assert.equal(assertRegisteredInkRecipeIdentity(ORDINARY_GREEN_RECIPE_R1), true);
});

test("ordinary-green@2 has an independent canonical fingerprint", () => {
  const canonical = serializeInkRecipe(ORDINARY_GREEN_RECIPE_R2);
  const fingerprint = createHash("sha256")
    .update(canonical, "utf8")
    .digest("hex");

  assert.equal(
    fingerprint,
    "37922f83ba199afe9afd854531a500ce6ea6eb1c0ea8248699989cf57630e6cf",
    "changing ordinary-green@2 parameters requires a new recipe revision",
  );
  assert.equal(assertRegisteredInkRecipeIdentity(ORDINARY_GREEN_RECIPE_R2), true);
});

test("revision 2 preserves revision 1 material coefficients", () => {
  const materialFields = (recipe) => ({
    recipeSchemaVersion: recipe.recipeSchemaVersion,
    contact: recipe.contact,
    density: recipe.density,
    surface: recipe.surface,
    optical: recipe.optical,
  });
  assert.deepEqual(
    materialFields(ORDINARY_GREEN_RECIPE_R2),
    materialFields(ORDINARY_GREEN_RECIPE_R1),
  );
});

test("invalid and mismatched recipes fail closed", () => {
  const invalid = JSON.parse(JSON.stringify(ORDINARY_GREEN_RECIPE_R2));
  invalid.optical.maximumAlpha = 2;
  assert.throws(() => validateInkRecipe(invalid), /maximumAlpha/);

  const wrongSchema = JSON.parse(JSON.stringify(ORDINARY_GREEN_RECIPE_R2));
  wrongSchema.recipeSchemaVersion = 1;
  assert.throws(() => validateInkRecipe(wrongSchema), /recipeSchemaVersion/);

  const unknown = JSON.parse(JSON.stringify(ORDINARY_GREEN_RECIPE_R2));
  unknown.unrecognized = undefined;
  assert.throws(() => validateInkRecipe(unknown), /invalid keys/);

  const wrongCatalog = JSON.parse(JSON.stringify(ORDINARY_GREEN_RECIPE_R2));
  wrongCatalog.contact.catalogId = "not-a-real-catalog";
  assert.throws(() => validateInkRecipe(wrongCatalog), /standard-nib-ladder-r1/);

  const notFinite = JSON.parse(JSON.stringify(ORDINARY_GREEN_RECIPE_R2));
  notFinite.density.rangeMaximum = Number.NaN;
  assert.throws(() => validateInkRecipe(notFinite), /finite number/);

  const infinite = JSON.parse(JSON.stringify(ORDINARY_GREEN_RECIPE_R2));
  infinite.density.rangeSmoothGain = Number.POSITIVE_INFINITY;
  assert.throws(() => validateInkRecipe(infinite), /finite number/);

  const reversedRange = JSON.parse(JSON.stringify(ORDINARY_GREEN_RECIPE_R2));
  reversedRange.density.rangeMinimum = 1.5;
  reversedRange.density.rangeMaximum = 0.5;
  assert.throws(() => validateInkRecipe(reversedRange), /range bounds are reversed/);

  const excessiveSteps = JSON.parse(JSON.stringify(ORDINARY_GREEN_RECIPE_R2));
  excessiveSteps.surface.keyboard.stepBase = 64;
  excessiveSteps.surface.keyboard.stepAbsorptionGain = 1;
  assert.throws(() => validateInkRecipe(excessiveSteps), /step budget/);
  assert.throws(() => parseInkRecipe("{broken"), SyntaxError);
});

test("registered recipe identity cannot be reused for different calculations", () => {
  const impostor = JSON.parse(JSON.stringify(ORDINARY_GREEN_RECIPE_R2));
  impostor.density.meanBase = 0.75;
  assert.equal(validateInkRecipe(impostor), true);
  assert.throws(
    () => assertRegisteredInkRecipeIdentity(impostor),
    /does not match its registered definition/,
  );
  assert.throws(() => assertInkRecipeCompatible(impostor), /does not match/);

  const custom = JSON.parse(JSON.stringify(impostor));
  custom.id = "custom-green-study";
  assert.equal(assertInkRecipeCompatible(custom), true);

  const unknownRevision = JSON.parse(JSON.stringify(ORDINARY_GREEN_RECIPE_R2));
  unknownRevision.revision = 3;
  assert.throws(
    () => assertRegisteredInkRecipeIdentity(unknownRevision),
    /reserved but not registered/,
  );
});

test("r1 stays archival while r2 is the compatible active recipe", () => {
  assert.equal(validateInkRecipe(ORDINARY_GREEN_RECIPE_R1), true);
  const archived = parseInkRecipe(serializeInkRecipe(ORDINARY_GREEN_RECIPE_R1));
  assert.deepEqual(archived, ORDINARY_GREEN_RECIPE_R1);
  assert.throws(() => assertInkRecipeCompatible(archived), /incompatible/);
  assert.equal(assertInkRecipeCompatible(ORDINARY_GREEN_RECIPE_R2), true);
});

test("deep freezing traverses children even when the root is already frozen", () => {
  const clone = JSON.parse(JSON.stringify(ORDINARY_GREEN_RECIPE_R2));
  Object.freeze(clone);
  const frozen = freezeInkRecipe(clone);
  assert.ok(Object.isFrozen(frozen));
  assert.ok(Object.isFrozen(frozen.density));
  assert.throws(() => {
    frozen.density.meanBase = 0.77;
  }, TypeError);
  assert.equal(frozen.density.meanBase, 0.18);
});

test("recipe schemas reject accessors that could change after freezing", () => {
  let externalMean = 0.18;
  const accessorRecipe = JSON.parse(JSON.stringify(ORDINARY_GREEN_RECIPE_R2));
  Object.defineProperty(accessorRecipe.density, "meanBase", {
    enumerable: true,
    get: () => externalMean,
  });
  assert.throws(
    () => freezeInkRecipe(accessorRecipe),
    /meanBase must be an enumerable own data property/,
  );
  externalMean = 0.75;
  assert.equal(accessorRecipe.density.meanBase, 0.75);
});
