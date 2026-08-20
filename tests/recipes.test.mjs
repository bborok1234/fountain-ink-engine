import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import {
  ORDINARY_GREEN_RECIPE_R1,
  ORDINARY_GREEN_RECIPE_R2,
  ORDINARY_GREEN_RECIPE_R3,
  ORDINARY_GREEN_RECIPE_R4,
  ORDINARY_GREEN_RECIPE_R5,
  ORDINARY_GREEN_RECIPE_R6,
  ORDINARY_GREEN_RECIPE_R7,
  ORDINARY_BLUE_BLACK_RECIPE_R1,
  ORDINARY_BURGUNDY_RECIPE_R1,
  ORDINARY_TEAL_RECIPE_R1,
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
    ORDINARY_GREEN_RECIPE_R5,
    ORDINARY_GREEN_RECIPE_R6,
    ORDINARY_GREEN_RECIPE_R7,
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
  assert.equal(ORDINARY_GREEN_RECIPE_R5.revision, 5);
  assert.equal(ORDINARY_GREEN_RECIPE_R6.revision, 6);
  assert.equal(ORDINARY_GREEN_RECIPE_R7.revision, 7);
});

test("recipe serialization is canonical and round-trips without reinterpretation", () => {
  for (const recipe of [
    ORDINARY_GREEN_RECIPE_R1,
    ORDINARY_GREEN_RECIPE_R2,
    ORDINARY_GREEN_RECIPE_R3,
    ORDINARY_GREEN_RECIPE_R4,
    ORDINARY_GREEN_RECIPE_R5,
    ORDINARY_GREEN_RECIPE_R6,
    ORDINARY_GREEN_RECIPE_R7,
    ORDINARY_BLUE_BLACK_RECIPE_R1,
    ORDINARY_BURGUNDY_RECIPE_R1,
    ORDINARY_TEAL_RECIPE_R1,
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

test("ordinary-green@5 has an independent canonical fingerprint", () => {
  const canonical = serializeInkRecipe(ORDINARY_GREEN_RECIPE_R5);
  const fingerprint = createHash("sha256")
    .update(canonical, "utf8")
    .digest("hex");

  assert.equal(
    fingerprint,
    "703e870f3914316df3b15259763af3cb007de6f7c28e2cbe6ca84955077391bb",
    "changing ordinary-green@5 parameters requires a new recipe revision",
  );
  assert.equal(assertRegisteredInkRecipeIdentity(ORDINARY_GREEN_RECIPE_R5), true);
});

test("ordinary-green@6 has an independent canonical fingerprint", () => {
  const canonical = serializeInkRecipe(ORDINARY_GREEN_RECIPE_R6);
  const fingerprint = createHash("sha256")
    .update(canonical, "utf8")
    .digest("hex");

  assert.equal(
    fingerprint,
    "a36ac417bc1a5bf1acf66603aa69bccf9ca5719b4e51e01458ba5e4a3b015545",
    "changing ordinary-green@6 parameters requires a new recipe revision",
  );
  assert.equal(assertRegisteredInkRecipeIdentity(ORDINARY_GREEN_RECIPE_R6), true);
});

const ACTIVE_RECIPE_FINGERPRINTS = Object.freeze([
  [ORDINARY_GREEN_RECIPE_R7, "79284c918ace8577255bab777ab9653a5e094e0446f727a67b3b8e7b04a8d802"],
  [ORDINARY_BLUE_BLACK_RECIPE_R1, "d1ac19baef54a1797e65d206a327f5d51572dbae198209cb47679cff53185aac"],
  [ORDINARY_BURGUNDY_RECIPE_R1, "8c7446cd28a18415183aaea8cb59abc9b27236667776627c1a1afd552e8cad85"],
  [ORDINARY_TEAL_RECIPE_R1, "f23970ca354d591c41452cf69b49186ae1c7007586e3afc4f811592c1239f28e"],
]);

test("r8 ordinary color recipes have independent canonical fingerprints", () => {
  for (const [recipe, expectedFingerprint] of ACTIVE_RECIPE_FINGERPRINTS) {
    const fingerprint = createHash("sha256")
      .update(serializeInkRecipe(recipe), "utf8")
      .digest("hex");
    assert.equal(fingerprint, expectedFingerprint);
    assert.equal(assertRegisteredInkRecipeIdentity(recipe), true);
  }
});

test("archived coefficients stay exact and r6 adds only Contact retention", () => {
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
  assert.deepEqual(ORDINARY_GREEN_RECIPE_R5.contact, ORDINARY_GREEN_RECIPE_R4.contact);
  assert.deepEqual(ORDINARY_GREEN_RECIPE_R5.density, ORDINARY_GREEN_RECIPE_R4.density);
  assert.deepEqual(ORDINARY_GREEN_RECIPE_R5.surface, ORDINARY_GREEN_RECIPE_R4.surface);
  assert.deepEqual(ORDINARY_GREEN_RECIPE_R5.optical, ORDINARY_GREEN_RECIPE_R4.optical);
  assert.deepEqual(ORDINARY_GREEN_RECIPE_R6.contact, ORDINARY_GREEN_RECIPE_R5.contact);
  assert.deepEqual(ORDINARY_GREEN_RECIPE_R6.density, ORDINARY_GREEN_RECIPE_R5.density);
  assert.deepEqual(ORDINARY_GREEN_RECIPE_R6.surface.direct, ORDINARY_GREEN_RECIPE_R5.surface.direct);
  assert.deepEqual(ORDINARY_GREEN_RECIPE_R6.optical, ORDINARY_GREEN_RECIPE_R5.optical);
  const { minimumContactRetention, ...r6Keyboard } =
    ORDINARY_GREEN_RECIPE_R6.surface.keyboard;
  assert.equal(minimumContactRetention, 0.54);
  assert.deepEqual(r6Keyboard, ORDINARY_GREEN_RECIPE_R5.surface.keyboard);
  assert.deepEqual(ORDINARY_GREEN_RECIPE_R7.contact, ORDINARY_GREEN_RECIPE_R6.contact);
  assert.deepEqual(ORDINARY_GREEN_RECIPE_R7.density, ORDINARY_GREEN_RECIPE_R6.density);
  assert.deepEqual(ORDINARY_GREEN_RECIPE_R7.surface, ORDINARY_GREEN_RECIPE_R6.surface);
  assert.equal(ORDINARY_GREEN_RECIPE_R7.optical.minimumAlpha, ORDINARY_GREEN_RECIPE_R6.optical.minimumAlpha);
  assert.equal(ORDINARY_GREEN_RECIPE_R7.optical.maximumAlpha, ORDINARY_GREEN_RECIPE_R6.optical.maximumAlpha);
  assert.deepEqual(
    ORDINARY_GREEN_RECIPE_R7.optical.densityColorCurve.map((point) => point.rgb),
    Array.from({ length: 3 }, () => ORDINARY_GREEN_RECIPE_R6.optical.rgb),
  );
});

test("invalid and mismatched recipes fail closed", () => {
  const invalid = JSON.parse(JSON.stringify(ORDINARY_GREEN_RECIPE_R7));
  invalid.optical.maximumAlpha = 2;
  assert.throws(() => validateInkRecipe(invalid), /maximumAlpha/);

  const wrongSchema = JSON.parse(JSON.stringify(ORDINARY_GREEN_RECIPE_R7));
  wrongSchema.recipeSchemaVersion = 1;
  assert.throws(() => validateInkRecipe(wrongSchema), /recipeSchemaVersion/);

  const unknown = JSON.parse(JSON.stringify(ORDINARY_GREEN_RECIPE_R7));
  unknown.unrecognized = undefined;
  assert.throws(() => validateInkRecipe(unknown), /invalid keys/);

  const wrongCatalog = JSON.parse(JSON.stringify(ORDINARY_GREEN_RECIPE_R7));
  wrongCatalog.contact.catalogId = "not-a-real-catalog";
  assert.throws(() => validateInkRecipe(wrongCatalog), /standard-nib-ladder-r1/);

  const notFinite = JSON.parse(JSON.stringify(ORDINARY_GREEN_RECIPE_R7));
  notFinite.density.rangeMaximum = Number.NaN;
  assert.throws(() => validateInkRecipe(notFinite), /finite number/);

  const infinite = JSON.parse(JSON.stringify(ORDINARY_GREEN_RECIPE_R7));
  infinite.density.rangeSmoothGain = Number.POSITIVE_INFINITY;
  assert.throws(() => validateInkRecipe(infinite), /finite number/);

  const reversedRange = JSON.parse(JSON.stringify(ORDINARY_GREEN_RECIPE_R7));
  reversedRange.density.rangeMinimum = 1.5;
  reversedRange.density.rangeMaximum = 0.5;
  assert.throws(() => validateInkRecipe(reversedRange), /range bounds are reversed/);

  const excessiveSteps = JSON.parse(JSON.stringify(ORDINARY_GREEN_RECIPE_R7));
  excessiveSteps.surface.keyboard.stepBase = 64;
  excessiveSteps.surface.keyboard.stepAbsorptionGain = 1;
  assert.throws(() => validateInkRecipe(excessiveSteps), /step budget/);

  const schema2Extra = JSON.parse(JSON.stringify(ORDINARY_GREEN_RECIPE_R3));
  schema2Extra.surface.keyboard.normalizationReferenceAlpha = 100;
  assert.throws(() => validateInkRecipe(schema2Extra), /invalid keys/);

  const schema3Missing = JSON.parse(JSON.stringify(ORDINARY_GREEN_RECIPE_R5));
  delete schema3Missing.surface.keyboard.normalizationReferenceAlpha;
  assert.throws(() => validateInkRecipe(schema3Missing), /invalid keys/);

  for (const value of [0, 256, Number.NaN, 1.5]) {
    const invalidReference = JSON.parse(JSON.stringify(ORDINARY_GREEN_RECIPE_R5));
    invalidReference.surface.keyboard.normalizationReferenceAlpha = value;
    assert.throws(
      () => validateInkRecipe(invalidReference),
      /normalizationReferenceAlpha must be an integer in 1\.\.\.255/,
    );
  }
  const schema4Missing = JSON.parse(JSON.stringify(ORDINARY_GREEN_RECIPE_R6));
  delete schema4Missing.surface.keyboard.minimumContactRetention;
  assert.throws(() => validateInkRecipe(schema4Missing), /invalid keys/);
  for (const value of [-0.01, 1.01, Number.NaN]) {
    const invalidRetention = JSON.parse(JSON.stringify(ORDINARY_GREEN_RECIPE_R6));
    invalidRetention.surface.keyboard.minimumContactRetention = value;
    assert.throws(
      () => validateInkRecipe(invalidRetention),
      /minimumContactRetention must be a finite number in 0\.\.\.1/,
    );
  }
  const missingCurve = JSON.parse(JSON.stringify(ORDINARY_GREEN_RECIPE_R7));
  delete missingCurve.optical.densityColorCurve;
  assert.throws(() => validateInkRecipe(missingCurve), /invalid keys/);
  const shortCurve = JSON.parse(JSON.stringify(ORDINARY_GREEN_RECIPE_R7));
  shortCurve.optical.densityColorCurve.pop();
  assert.throws(() => validateInkRecipe(shortCurve), /3\.\.\.5 points/);
  const reversedCurve = JSON.parse(JSON.stringify(ORDINARY_GREEN_RECIPE_R7));
  reversedCurve.optical.densityColorCurve[1].density = 0;
  assert.throws(() => validateInkRecipe(reversedCurve), /strictly increasing/);
  const incompleteCurve = JSON.parse(JSON.stringify(ORDINARY_GREEN_RECIPE_R7));
  incompleteCurve.optical.densityColorCurve[2].density = 0.9;
  assert.throws(() => validateInkRecipe(incompleteCurve), /begin at 0 and end at 1/);
  assert.throws(() => parseInkRecipe("{broken"), SyntaxError);
});

test("registered recipe identity cannot be reused for different calculations", () => {
  const impostor = JSON.parse(JSON.stringify(ORDINARY_GREEN_RECIPE_R7));
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

  const unknownRevision = JSON.parse(JSON.stringify(ORDINARY_GREEN_RECIPE_R7));
  unknownRevision.revision = 8;
  assert.throws(
    () => assertRegisteredInkRecipeIdentity(unknownRevision),
    /reserved but not registered/,
  );
});

test("r1 through r6 stay archival while r7 and color recipes are compatible", () => {
  for (const archivedRecipe of [
    ORDINARY_GREEN_RECIPE_R1,
    ORDINARY_GREEN_RECIPE_R2,
    ORDINARY_GREEN_RECIPE_R3,
    ORDINARY_GREEN_RECIPE_R4,
    ORDINARY_GREEN_RECIPE_R5,
    ORDINARY_GREEN_RECIPE_R6,
  ]) {
    assert.equal(validateInkRecipe(archivedRecipe), true);
    const archived = parseInkRecipe(serializeInkRecipe(archivedRecipe));
    assert.deepEqual(archived, archivedRecipe);
    assert.throws(() => assertInkRecipeCompatible(archived), /incompatible/);
  }
  for (const recipe of [
    ORDINARY_GREEN_RECIPE_R7,
    ORDINARY_BLUE_BLACK_RECIPE_R1,
    ORDINARY_BURGUNDY_RECIPE_R1,
    ORDINARY_TEAL_RECIPE_R1,
  ]) {
    assert.equal(assertInkRecipeCompatible(recipe), true);
  }
});

test("deep freezing traverses children even when the root is already frozen", () => {
  const clone = JSON.parse(JSON.stringify(ORDINARY_GREEN_RECIPE_R7));
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
  const accessorRecipe = JSON.parse(JSON.stringify(ORDINARY_GREEN_RECIPE_R7));
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

  const referenceAccessor = JSON.parse(JSON.stringify(ORDINARY_GREEN_RECIPE_R7));
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

  const retentionAccessor = JSON.parse(JSON.stringify(ORDINARY_GREEN_RECIPE_R7));
  Object.defineProperty(
    retentionAccessor.surface.keyboard,
    "minimumContactRetention",
    {
      enumerable: true,
      get: () => 0.54,
    },
  );
  assert.throws(
    () => freezeInkRecipe(retentionAccessor),
    /minimumContactRetention must be an enumerable own data property/,
  );

  const curveAccessor = JSON.parse(JSON.stringify(ORDINARY_GREEN_RECIPE_R7));
  Object.defineProperty(curveAccessor.optical.densityColorCurve[1], "density", {
    enumerable: true,
    get: () => 0.5,
  });
  assert.throws(
    () => freezeInkRecipe(curveAccessor),
    /density must be an enumerable own data property/,
  );
});
