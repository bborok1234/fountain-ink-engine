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
  ORDINARY_GREEN_RECIPE_R8,
  ORDINARY_BLUE_BLACK_RECIPE_R2,
  ORDINARY_BURGUNDY_RECIPE_R2,
  ORDINARY_TEAL_RECIPE_R2,
  ORDINARY_GREEN_RECIPE_R9,
  ORDINARY_BLUE_BLACK_RECIPE_R3,
  ORDINARY_BURGUNDY_RECIPE_R3,
  ORDINARY_TEAL_RECIPE_R3,
  ORDINARY_GREEN_RECIPE_R10,
  ORDINARY_BLUE_BLACK_RECIPE_R4,
  ORDINARY_BURGUNDY_RECIPE_R4,
  ORDINARY_TEAL_RECIPE_R4,
  ORDINARY_GREEN_RECIPE_R11,
  ORDINARY_BLUE_BLACK_RECIPE_R5,
  ORDINARY_BURGUNDY_RECIPE_R5,
  ORDINARY_TEAL_RECIPE_R5,
  ORDINARY_GREEN_RECIPE_R12,
  ORDINARY_BLUE_BLACK_RECIPE_R6,
  ORDINARY_BURGUNDY_RECIPE_R6,
  ORDINARY_TEAL_RECIPE_R6,
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
    ORDINARY_GREEN_RECIPE_R8,
    ORDINARY_GREEN_RECIPE_R9,
    ORDINARY_GREEN_RECIPE_R10,
    ORDINARY_GREEN_RECIPE_R11,
    ORDINARY_GREEN_RECIPE_R12,
  ]) {
    assert.equal(validateInkRecipe(recipe), true);
    assert.equal(recipe.id, "ordinary-green");
    assert.ok(Object.isFrozen(recipe));
    assert.ok(Object.isFrozen(
      recipe.recipeSchemaVersion === 6
        ? recipe.direct.optical
        : recipe.surface.direct.optical,
    ));
  }
  assert.equal(ORDINARY_GREEN_RECIPE_R1.revision, 1);
  assert.equal(ORDINARY_GREEN_RECIPE_R2.revision, 2);
  assert.equal(ORDINARY_GREEN_RECIPE_R3.revision, 3);
  assert.equal(ORDINARY_GREEN_RECIPE_R4.revision, 4);
  assert.equal(ORDINARY_GREEN_RECIPE_R5.revision, 5);
  assert.equal(ORDINARY_GREEN_RECIPE_R6.revision, 6);
  assert.equal(ORDINARY_GREEN_RECIPE_R7.revision, 7);
  assert.equal(ORDINARY_GREEN_RECIPE_R8.revision, 8);
  assert.equal(ORDINARY_GREEN_RECIPE_R9.revision, 9);
  assert.equal(ORDINARY_GREEN_RECIPE_R10.revision, 10);
  assert.equal(ORDINARY_GREEN_RECIPE_R11.revision, 11);
  assert.equal(ORDINARY_GREEN_RECIPE_R12.revision, 12);
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
    ORDINARY_GREEN_RECIPE_R8,
    ORDINARY_BLUE_BLACK_RECIPE_R2,
    ORDINARY_BURGUNDY_RECIPE_R2,
    ORDINARY_TEAL_RECIPE_R2,
    ORDINARY_GREEN_RECIPE_R9,
    ORDINARY_BLUE_BLACK_RECIPE_R3,
    ORDINARY_BURGUNDY_RECIPE_R3,
    ORDINARY_TEAL_RECIPE_R3,
    ORDINARY_GREEN_RECIPE_R10,
    ORDINARY_BLUE_BLACK_RECIPE_R4,
    ORDINARY_BURGUNDY_RECIPE_R4,
    ORDINARY_TEAL_RECIPE_R4,
    ORDINARY_GREEN_RECIPE_R11,
    ORDINARY_BLUE_BLACK_RECIPE_R5,
    ORDINARY_BURGUNDY_RECIPE_R5,
    ORDINARY_TEAL_RECIPE_R5,
    ORDINARY_GREEN_RECIPE_R12,
    ORDINARY_BLUE_BLACK_RECIPE_R6,
    ORDINARY_BURGUNDY_RECIPE_R6,
    ORDINARY_TEAL_RECIPE_R6,
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

const R10_RECIPE_FINGERPRINTS = Object.freeze([
  [ORDINARY_GREEN_RECIPE_R9, "e936f12bb8f0990648f2b00127e57f178e7fe0ee53cee2ccaf35c4f7648bb5cd"],
  [ORDINARY_BLUE_BLACK_RECIPE_R3, "ce6e1ab3bf00d3b26d8fe6361b09a05f030c6adefc6dc756379b476f5a11c400"],
  [ORDINARY_BURGUNDY_RECIPE_R3, "d4f241f2e2889517a7af46a5423b7370bb502f27caffadd15bcd80008e64b845"],
  [ORDINARY_TEAL_RECIPE_R3, "f7cd94bfca90c3bd0b9791f193433556fe913084e63b19e68a17dbb6067f1872"],
]);

const R11_RECIPE_FINGERPRINTS = Object.freeze([
  [ORDINARY_GREEN_RECIPE_R10, "70a73cef2d0506ac392d3899034cbc549b04285ede2f38bdbb18d387fb952f2a"],
  [ORDINARY_BLUE_BLACK_RECIPE_R4, "131e76dcc72bbc49668941a17d0b2ec86acbf22a8fa971a8cda0f4a6b56bcdb3"],
  [ORDINARY_BURGUNDY_RECIPE_R4, "938660a45465e9135d8926b08192977b1403c773c6ffabd637f95231d02c279f"],
  [ORDINARY_TEAL_RECIPE_R4, "4caaa1b2650f17710db1a7286d4da2071f495fdf7a777fae56b47b29c6dc75e4"],
]);

const ACTIVE_RECIPE_FINGERPRINTS = Object.freeze([
  [ORDINARY_GREEN_RECIPE_R12, "7ac183d3fa4ba85dcef2974eb6e01641085f33222c1ff8b6394d13cf96e3839b"],
  [ORDINARY_BLUE_BLACK_RECIPE_R6, "c2007bbbff0c94e7afc26c07b8768e36611a51ec7be1769e7a539aa309d047c1"],
  [ORDINARY_BURGUNDY_RECIPE_R6, "89fedfc605d7e3af3ffecdfe3f8d98caa7891ec7152d1025354bc1d1e7482c5d"],
  [ORDINARY_TEAL_RECIPE_R6, "279d09921a005ab7b1150eac74e276f5d22010a777fcdc2ce4b1af0fb14282e9"],
]);

const R12_RECIPE_FINGERPRINTS = Object.freeze([
  [ORDINARY_GREEN_RECIPE_R11, "4af1c6f4b9853baf927b06a958eab4cd344c8743a7c4901d19825041e5d88b6f"],
  [ORDINARY_BLUE_BLACK_RECIPE_R5, "2621c4b73a00844f85e65622e17b191ebf5ade7908c5f0fb5cb7008640ca27f3"],
  [ORDINARY_BURGUNDY_RECIPE_R5, "13c1515f233014d1fb37876d65588bf23be1a6304be7bfa02bdca10c2c5cdde5"],
  [ORDINARY_TEAL_RECIPE_R5, "540d888b82d6b26ddb8baacdb0b7ed62651890f2f16f5cb7aa0e372233aad65c"],
]);

test("r11 through r13 ordinary color recipes have independent canonical fingerprints", () => {
  for (const [recipe, expectedFingerprint] of [
    ...R10_RECIPE_FINGERPRINTS,
    ...R11_RECIPE_FINGERPRINTS,
    ...R12_RECIPE_FINGERPRINTS,
    ...ACTIVE_RECIPE_FINGERPRINTS,
  ]) {
    const fingerprint = createHash("sha256")
      .update(serializeInkRecipe(recipe), "utf8")
      .digest("hex");
    assert.equal(fingerprint, expectedFingerprint);
    assert.equal(assertRegisteredInkRecipeIdentity(recipe), true);
  }
});

test("r13 recipes preserve material coefficients and adopt contact catalog r2", () => {
  for (const [active, previous] of [
    [ORDINARY_GREEN_RECIPE_R12, ORDINARY_GREEN_RECIPE_R11],
    [ORDINARY_BLUE_BLACK_RECIPE_R6, ORDINARY_BLUE_BLACK_RECIPE_R5],
    [ORDINARY_BURGUNDY_RECIPE_R6, ORDINARY_BURGUNDY_RECIPE_R5],
    [ORDINARY_TEAL_RECIPE_R6, ORDINARY_TEAL_RECIPE_R5],
  ]) {
    const {
      revision: activeRevision,
      engineModelVersion: activeModel,
      contact: activeContact,
      ...activeMaterial
    } = active;
    const {
      revision: previousRevision,
      engineModelVersion: previousModel,
      contact: previousContact,
      ...previousMaterial
    } = previous;
    assert.equal(activeRevision, previousRevision + 1);
    assert.equal(activeModel, "ordinary-js-r13");
    assert.equal(previousModel, "ordinary-js-r12");
    assert.equal(activeContact.catalogId, "fountain-nib-catalog-r2");
    assert.equal(previousContact.catalogId, "standard-nib-ladder-r1");
    assert.deepEqual(activeMaterial, previousMaterial);
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
  assert.equal(ORDINARY_GREEN_RECIPE_R8.density.meanBase, ORDINARY_GREEN_RECIPE_R7.density.meanBase);
  assert.equal(ORDINARY_GREEN_RECIPE_R8.direct.waterBase, ORDINARY_GREEN_RECIPE_R7.surface.direct.waterBase);
  assert.equal(ORDINARY_GREEN_RECIPE_R8.optical.minimumAlpha, ORDINARY_GREEN_RECIPE_R7.optical.minimumAlpha);
  assert.equal(ORDINARY_GREEN_RECIPE_R8.optical.maximumAlpha, ORDINARY_GREEN_RECIPE_R7.optical.maximumAlpha);
  assert.deepEqual(
    ORDINARY_GREEN_RECIPE_R8.optical.densityColorCurve.map((point) => point.rgb),
    ORDINARY_GREEN_RECIPE_R7.optical.densityColorCurve.map((point) => point.rgb),
  );
});

test("invalid and mismatched recipes fail closed", () => {
  const invalid = JSON.parse(JSON.stringify(ORDINARY_GREEN_RECIPE_R12));
  invalid.optical.maximumAlpha = 2;
  assert.throws(() => validateInkRecipe(invalid), /maximumAlpha/);

  const wrongSchema = JSON.parse(JSON.stringify(ORDINARY_GREEN_RECIPE_R12));
  wrongSchema.recipeSchemaVersion = 1;
  assert.throws(() => validateInkRecipe(wrongSchema), /invalid keys/);

  const unknown = JSON.parse(JSON.stringify(ORDINARY_GREEN_RECIPE_R12));
  unknown.unrecognized = undefined;
  assert.throws(() => validateInkRecipe(unknown), /invalid keys/);

  const wrongCatalog = JSON.parse(JSON.stringify(ORDINARY_GREEN_RECIPE_R12));
  wrongCatalog.contact.catalogId = "not-a-real-catalog";
  assert.throws(() => validateInkRecipe(wrongCatalog), /fountain-nib-catalog-r2/);

  const notFinite = JSON.parse(JSON.stringify(ORDINARY_GREEN_RECIPE_R12));
  notFinite.density.rangeMaximum = Number.NaN;
  assert.throws(() => validateInkRecipe(notFinite), /finite number/);

  const infinite = JSON.parse(JSON.stringify(ORDINARY_GREEN_RECIPE_R12));
  infinite.density.flowGain = Number.POSITIVE_INFINITY;
  assert.throws(() => validateInkRecipe(infinite), /finite number/);

  const reversedRange = JSON.parse(JSON.stringify(ORDINARY_GREEN_RECIPE_R12));
  reversedRange.density.meanMinimum = 0.8;
  reversedRange.density.meanMaximum = 0.5;
  assert.throws(() => validateInkRecipe(reversedRange), /mean bounds are reversed/);

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
  const missingCurve = JSON.parse(JSON.stringify(ORDINARY_GREEN_RECIPE_R12));
  delete missingCurve.optical.densityColorCurve;
  assert.throws(() => validateInkRecipe(missingCurve), /invalid keys/);
  const shortCurve = JSON.parse(JSON.stringify(ORDINARY_GREEN_RECIPE_R12));
  shortCurve.optical.densityColorCurve.pop();
  assert.throws(() => validateInkRecipe(shortCurve), /3\.\.\.5 points/);
  const reversedCurve = JSON.parse(JSON.stringify(ORDINARY_GREEN_RECIPE_R12));
  reversedCurve.optical.densityColorCurve[1].density = 0;
  assert.throws(() => validateInkRecipe(reversedCurve), /strictly increasing/);
  const incompleteCurve = JSON.parse(JSON.stringify(ORDINARY_GREEN_RECIPE_R12));
  incompleteCurve.optical.densityColorCurve[2].density = 0.9;
  assert.throws(() => validateInkRecipe(incompleteCurve), /begin at 0 and end at 1/);
  assert.throws(() => parseInkRecipe("{broken"), SyntaxError);
});

test("registered recipe identity cannot be reused for different calculations", () => {
  const impostor = JSON.parse(JSON.stringify(ORDINARY_GREEN_RECIPE_R12));
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

  const unknownRevision = JSON.parse(JSON.stringify(ORDINARY_GREEN_RECIPE_R12));
  unknownRevision.revision = 13;
  assert.throws(
    () => assertRegisteredInkRecipeIdentity(unknownRevision),
    /reserved but not registered/,
  );
});

test("r1 through r12 predecessors stay archival while r13 recipes are compatible", () => {
  for (const archivedRecipe of [
    ORDINARY_GREEN_RECIPE_R1,
    ORDINARY_GREEN_RECIPE_R2,
    ORDINARY_GREEN_RECIPE_R3,
    ORDINARY_GREEN_RECIPE_R4,
    ORDINARY_GREEN_RECIPE_R5,
    ORDINARY_GREEN_RECIPE_R6,
    ORDINARY_GREEN_RECIPE_R7,
    ORDINARY_GREEN_RECIPE_R8,
    ORDINARY_BLUE_BLACK_RECIPE_R2,
    ORDINARY_BURGUNDY_RECIPE_R2,
    ORDINARY_TEAL_RECIPE_R2,
    ORDINARY_GREEN_RECIPE_R9,
    ORDINARY_BLUE_BLACK_RECIPE_R3,
    ORDINARY_BURGUNDY_RECIPE_R3,
    ORDINARY_TEAL_RECIPE_R3,
    ORDINARY_GREEN_RECIPE_R10,
    ORDINARY_BLUE_BLACK_RECIPE_R4,
    ORDINARY_BURGUNDY_RECIPE_R4,
    ORDINARY_TEAL_RECIPE_R4,
    ORDINARY_GREEN_RECIPE_R11,
    ORDINARY_BLUE_BLACK_RECIPE_R5,
    ORDINARY_BURGUNDY_RECIPE_R5,
    ORDINARY_TEAL_RECIPE_R5,
  ]) {
    assert.equal(validateInkRecipe(archivedRecipe), true);
    const archived = parseInkRecipe(serializeInkRecipe(archivedRecipe));
    assert.deepEqual(archived, archivedRecipe);
    assert.throws(() => assertInkRecipeCompatible(archived), /incompatible/);
  }
  for (const recipe of [
    ORDINARY_GREEN_RECIPE_R12,
    ORDINARY_BLUE_BLACK_RECIPE_R6,
    ORDINARY_BURGUNDY_RECIPE_R6,
    ORDINARY_TEAL_RECIPE_R6,
  ]) {
    assert.equal(assertInkRecipeCompatible(recipe), true);
  }
});

test("deep freezing traverses children even when the root is already frozen", () => {
  const clone = JSON.parse(JSON.stringify(ORDINARY_GREEN_RECIPE_R12));
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
  const accessorRecipe = JSON.parse(JSON.stringify(ORDINARY_GREEN_RECIPE_R12));
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

  const retentionAccessor = JSON.parse(JSON.stringify(ORDINARY_GREEN_RECIPE_R12));
  Object.defineProperty(
    retentionAccessor.direct.optical,
    "fixedWeight",
    {
      enumerable: true,
      get: () => 0.92,
    },
  );
  assert.throws(
    () => freezeInkRecipe(retentionAccessor),
    /fixedWeight must be an enumerable own data property/,
  );

  const curveAccessor = JSON.parse(JSON.stringify(ORDINARY_GREEN_RECIPE_R12));
  Object.defineProperty(curveAccessor.optical.densityColorCurve[1], "density", {
    enumerable: true,
    get: () => 0.5,
  });
  assert.throws(
    () => freezeInkRecipe(curveAccessor),
    /density must be an enumerable own data property/,
  );
});
