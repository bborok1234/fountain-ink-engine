import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import {
  ORDINARY_GREEN_RECIPE_R1,
  ORDINARY_GREEN_RECIPE_R2,
  ORDINARY_GREEN_RECIPE_R3,
  ORDINARY_GREEN_RECIPE_R4,
  assertInkRecipeCompatible,
  assertRegisteredInkRecipeIdentity,
  freezeInkRecipe,
  parseInkRecipe,
  serializeInkRecipe,
  validateInkRecipe,
} from "../src/recipes/index.js";

test("ordinary-green revisions are deeply immutable and schema-valid", () => {
  for (const recipe of [
    ORDINARY_GREEN_RECIPE_R1,
    ORDINARY_GREEN_RECIPE_R2,
    ORDINARY_GREEN_RECIPE_R3,
    ORDINARY_GREEN_RECIPE_R4,
  ]) {
    assert.equal(validateInkRecipe(recipe), true);
    assert.equal(recipe.id, "ordinary-green");
    assert.ok(Object.isFrozen(recipe));
    assert.ok(Object.isFrozen(recipe.surface.direct.optical));
  }
  assert.equal(ORDINARY_GREEN_RECIPE_R1.revision, 1);
  assert.equal(ORDINARY_GREEN_RECIPE_R2.revision, 2);
  assert.equal(ORDINARY_GREEN_RECIPE_R3.revision, 3);
  assert.equal(ORDINARY_GREEN_RECIPE_R4.revision, 4);
});

test("recipe serialization is canonical and round-trips without reinterpretation", () => {
  for (const recipe of [
    ORDINARY_GREEN_RECIPE_R1,
    ORDINARY_GREEN_RECIPE_R2,
    ORDINARY_GREEN_RECIPE_R3,
    ORDINARY_GREEN_RECIPE_R4,
  ]) {
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

test("ordinary-green@3 has an independent canonical fingerprint", () => {
  const canonical = serializeInkRecipe(ORDINARY_GREEN_RECIPE_R3);
  const fingerprint = createHash("sha256")
    .update(canonical, "utf8")
    .digest("hex");

  assert.equal(
    fingerprint,
    "e5f70f500ac989d27901d41c6d3780f83fcf157cbd9fc8d2b534c43e8d4777c1",
    "changing ordinary-green@3 parameters requires a new recipe revision",
  );
  assert.equal(assertRegisteredInkRecipeIdentity(ORDINARY_GREEN_RECIPE_R3), true);
});

test("ordinary-green@4 has an independent canonical fingerprint", () => {
  const canonical = serializeInkRecipe(ORDINARY_GREEN_RECIPE_R4);
  const fingerprint = createHash("sha256")
    .update(canonical, "utf8")
    .digest("hex");

  assert.equal(
    fingerprint,
    "231c9a24196d12022a0b7cfe19da0c8c7699d5c439d96a3e137627a11abe328f",
    "changing ordinary-green@4 parameters requires a new recipe revision",
  );
  assert.equal(assertRegisteredInkRecipeIdentity(ORDINARY_GREEN_RECIPE_R4), true);
});

test("archived coefficients stay exact and r4 adds only its fixed reference", () => {
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
  assert.deepEqual(
    materialFields(ORDINARY_GREEN_RECIPE_R3),
    materialFields(ORDINARY_GREEN_RECIPE_R1),
  );
  assert.deepEqual(ORDINARY_GREEN_RECIPE_R4.contact, ORDINARY_GREEN_RECIPE_R3.contact);
  assert.deepEqual(ORDINARY_GREEN_RECIPE_R4.density, ORDINARY_GREEN_RECIPE_R3.density);
  assert.deepEqual(ORDINARY_GREEN_RECIPE_R4.surface.direct, ORDINARY_GREEN_RECIPE_R3.surface.direct);
  assert.deepEqual(ORDINARY_GREEN_RECIPE_R4.optical, ORDINARY_GREEN_RECIPE_R3.optical);
  const { normalizationReferenceAlpha, ...r4Keyboard } =
    ORDINARY_GREEN_RECIPE_R4.surface.keyboard;
  assert.equal(normalizationReferenceAlpha, 107);
  assert.deepEqual(r4Keyboard, ORDINARY_GREEN_RECIPE_R3.surface.keyboard);
});

test("invalid and mismatched recipes fail closed", () => {
  const invalid = JSON.parse(JSON.stringify(ORDINARY_GREEN_RECIPE_R4));
  invalid.optical.maximumAlpha = 2;
  assert.throws(() => validateInkRecipe(invalid), /maximumAlpha/);

  const wrongSchema = JSON.parse(JSON.stringify(ORDINARY_GREEN_RECIPE_R4));
  wrongSchema.recipeSchemaVersion = 1;
  assert.throws(() => validateInkRecipe(wrongSchema), /recipeSchemaVersion/);

  const unknown = JSON.parse(JSON.stringify(ORDINARY_GREEN_RECIPE_R4));
  unknown.unrecognized = undefined;
  assert.throws(() => validateInkRecipe(unknown), /invalid keys/);

  const wrongCatalog = JSON.parse(JSON.stringify(ORDINARY_GREEN_RECIPE_R4));
  wrongCatalog.contact.catalogId = "not-a-real-catalog";
  assert.throws(() => validateInkRecipe(wrongCatalog), /standard-nib-ladder-r1/);

  const notFinite = JSON.parse(JSON.stringify(ORDINARY_GREEN_RECIPE_R4));
  notFinite.density.rangeMaximum = Number.NaN;
  assert.throws(() => validateInkRecipe(notFinite), /finite number/);

  const infinite = JSON.parse(JSON.stringify(ORDINARY_GREEN_RECIPE_R4));
  infinite.density.rangeSmoothGain = Number.POSITIVE_INFINITY;
  assert.throws(() => validateInkRecipe(infinite), /finite number/);

  const reversedRange = JSON.parse(JSON.stringify(ORDINARY_GREEN_RECIPE_R4));
  reversedRange.density.rangeMinimum = 1.5;
  reversedRange.density.rangeMaximum = 0.5;
  assert.throws(() => validateInkRecipe(reversedRange), /range bounds are reversed/);

  const excessiveSteps = JSON.parse(JSON.stringify(ORDINARY_GREEN_RECIPE_R4));
  excessiveSteps.surface.keyboard.stepBase = 64;
  excessiveSteps.surface.keyboard.stepAbsorptionGain = 1;
  assert.throws(() => validateInkRecipe(excessiveSteps), /step budget/);

  const schema2Extra = JSON.parse(JSON.stringify(ORDINARY_GREEN_RECIPE_R3));
  schema2Extra.surface.keyboard.normalizationReferenceAlpha = 100;
  assert.throws(() => validateInkRecipe(schema2Extra), /invalid keys/);

  const schema3Missing = JSON.parse(JSON.stringify(ORDINARY_GREEN_RECIPE_R4));
  delete schema3Missing.surface.keyboard.normalizationReferenceAlpha;
  assert.throws(() => validateInkRecipe(schema3Missing), /invalid keys/);

  for (const value of [0, 256, Number.NaN, 1.5]) {
    const invalidReference = JSON.parse(JSON.stringify(ORDINARY_GREEN_RECIPE_R4));
    invalidReference.surface.keyboard.normalizationReferenceAlpha = value;
    assert.throws(
      () => validateInkRecipe(invalidReference),
      /normalizationReferenceAlpha must be an integer in 1\.\.\.255/,
    );
  }
  assert.throws(() => parseInkRecipe("{broken"), SyntaxError);
});

test("registered recipe identity cannot be reused for different calculations", () => {
  const impostor = JSON.parse(JSON.stringify(ORDINARY_GREEN_RECIPE_R4));
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

  const unknownRevision = JSON.parse(JSON.stringify(ORDINARY_GREEN_RECIPE_R4));
  unknownRevision.revision = 5;
  assert.throws(
    () => assertRegisteredInkRecipeIdentity(unknownRevision),
    /reserved but not registered/,
  );
});

test("r1 through r3 stay archival while r4 is the compatible active recipe", () => {
  for (const archivedRecipe of [
    ORDINARY_GREEN_RECIPE_R1,
    ORDINARY_GREEN_RECIPE_R2,
    ORDINARY_GREEN_RECIPE_R3,
  ]) {
    assert.equal(validateInkRecipe(archivedRecipe), true);
    const archived = parseInkRecipe(serializeInkRecipe(archivedRecipe));
    assert.deepEqual(archived, archivedRecipe);
    assert.throws(() => assertInkRecipeCompatible(archived), /incompatible/);
  }
  assert.equal(assertInkRecipeCompatible(ORDINARY_GREEN_RECIPE_R4), true);
});

test("deep freezing traverses children even when the root is already frozen", () => {
  const clone = JSON.parse(JSON.stringify(ORDINARY_GREEN_RECIPE_R4));
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
  const accessorRecipe = JSON.parse(JSON.stringify(ORDINARY_GREEN_RECIPE_R4));
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

  const referenceAccessor = JSON.parse(JSON.stringify(ORDINARY_GREEN_RECIPE_R4));
  Object.defineProperty(
    referenceAccessor.surface.keyboard,
    "normalizationReferenceAlpha",
    {
      enumerable: true,
      get: () => 107,
    },
  );
  assert.throws(
    () => freezeInkRecipe(referenceAccessor),
    /normalizationReferenceAlpha must be an enumerable own data property/,
  );
});
