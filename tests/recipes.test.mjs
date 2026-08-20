import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import {
  ORDINARY_GREEN_RECIPE_R1,
  assertInkRecipeCompatible,
  assertRegisteredInkRecipeIdentity,
  freezeInkRecipe,
  parseInkRecipe,
  serializeInkRecipe,
  validateInkRecipe,
} from "../src/recipes/index.js";

test("ordinary-green-r1 is deeply immutable and schema-valid", () => {
  assert.equal(validateInkRecipe(ORDINARY_GREEN_RECIPE_R1), true);
  assert.equal(ORDINARY_GREEN_RECIPE_R1.id, "ordinary-green");
  assert.equal(ORDINARY_GREEN_RECIPE_R1.revision, 1);
  assert.ok(Object.isFrozen(ORDINARY_GREEN_RECIPE_R1));
  assert.ok(Object.isFrozen(ORDINARY_GREEN_RECIPE_R1.surface.direct.optical));
});

test("recipe serialization is canonical and round-trips without reinterpretation", () => {
  const serialized = serializeInkRecipe(ORDINARY_GREEN_RECIPE_R1);
  const parsed = parseInkRecipe(serialized);
  assert.deepEqual(parsed, ORDINARY_GREEN_RECIPE_R1);
  assert.equal(serializeInkRecipe(parsed), serialized);
  assert.ok(Object.isFrozen(parsed));
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

test("invalid and mismatched recipes fail closed", () => {
  const invalid = JSON.parse(JSON.stringify(ORDINARY_GREEN_RECIPE_R1));
  invalid.optical.maximumAlpha = 2;
  assert.throws(() => validateInkRecipe(invalid), /maximumAlpha/);

  const wrongSchema = JSON.parse(JSON.stringify(ORDINARY_GREEN_RECIPE_R1));
  wrongSchema.recipeSchemaVersion = 1;
  assert.throws(() => validateInkRecipe(wrongSchema), /recipeSchemaVersion/);

  const unknown = JSON.parse(JSON.stringify(ORDINARY_GREEN_RECIPE_R1));
  unknown.unrecognized = undefined;
  assert.throws(() => validateInkRecipe(unknown), /invalid keys/);

  const wrongCatalog = JSON.parse(JSON.stringify(ORDINARY_GREEN_RECIPE_R1));
  wrongCatalog.contact.catalogId = "not-a-real-catalog";
  assert.throws(() => validateInkRecipe(wrongCatalog), /standard-nib-ladder-r1/);

  const notFinite = JSON.parse(JSON.stringify(ORDINARY_GREEN_RECIPE_R1));
  notFinite.density.rangeMaximum = Number.NaN;
  assert.throws(() => validateInkRecipe(notFinite), /finite number/);

  const infinite = JSON.parse(JSON.stringify(ORDINARY_GREEN_RECIPE_R1));
  infinite.density.rangeSmoothGain = Number.POSITIVE_INFINITY;
  assert.throws(() => validateInkRecipe(infinite), /finite number/);

  const reversedRange = JSON.parse(JSON.stringify(ORDINARY_GREEN_RECIPE_R1));
  reversedRange.density.rangeMinimum = 1.5;
  reversedRange.density.rangeMaximum = 0.5;
  assert.throws(() => validateInkRecipe(reversedRange), /range bounds are reversed/);

  const excessiveSteps = JSON.parse(JSON.stringify(ORDINARY_GREEN_RECIPE_R1));
  excessiveSteps.surface.keyboard.stepBase = 64;
  excessiveSteps.surface.keyboard.stepAbsorptionGain = 1;
  assert.throws(() => validateInkRecipe(excessiveSteps), /step budget/);
  assert.throws(() => parseInkRecipe("{broken"), SyntaxError);
});

test("registered recipe identity cannot be reused for different calculations", () => {
  const impostor = JSON.parse(JSON.stringify(ORDINARY_GREEN_RECIPE_R1));
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

  const unknownRevision = JSON.parse(JSON.stringify(ORDINARY_GREEN_RECIPE_R1));
  unknownRevision.revision = 2;
  assert.throws(
    () => assertRegisteredInkRecipeIdentity(unknownRevision),
    /reserved but not registered/,
  );
});

test("historical model recipes remain structurally readable but cannot render", () => {
  const historical = JSON.parse(JSON.stringify(ORDINARY_GREEN_RECIPE_R1));
  historical.engineModelVersion = "ordinary-js-r1";
  assert.equal(validateInkRecipe(historical), true);
  const parsed = parseInkRecipe(serializeInkRecipe(historical));
  assert.equal(parsed.engineModelVersion, "ordinary-js-r1");
  assert.throws(() => assertInkRecipeCompatible(parsed), /incompatible/);
});

test("deep freezing traverses children even when the root is already frozen", () => {
  const clone = JSON.parse(JSON.stringify(ORDINARY_GREEN_RECIPE_R1));
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
  const accessorRecipe = JSON.parse(JSON.stringify(ORDINARY_GREEN_RECIPE_R1));
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
