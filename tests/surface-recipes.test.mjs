import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import {
  PAPER_SURFACE_ABSORBENT_R1,
  PAPER_SURFACE_BALANCED_R1,
  PAPER_SURFACE_SMOOTH_R1,
  assertSurfaceRecipeCompatible,
  parseSurfaceRecipe,
  serializeSurfaceRecipe,
  validateSurfaceRecipe,
} from "../src/surface-recipes/index.js";

const SURFACES = [
  [PAPER_SURFACE_SMOOTH_R1, "a33fba2a677e213b247ca65ec1905b218ba3c582fe4900f37e0604881c15a612"],
  [PAPER_SURFACE_BALANCED_R1, "abdf381b4206322b9884b2a8643f3c0836a7d98934fdf1ec2da73064c617d9d2"],
  [PAPER_SURFACE_ABSORBENT_R1, "aa289f94e40264db2325459eeb8fcf29b7c805a093a14cde321c82cd34b7851f"],
];

test("paper Surface recipes are immutable, canonical, and independently pinned", () => {
  for (const [recipe, expectedFingerprint] of SURFACES) {
    assert.equal(validateSurfaceRecipe(recipe), true);
    assert.equal(assertSurfaceRecipeCompatible(recipe), true);
    assert.ok(Object.isFrozen(recipe));
    assert.ok(Object.isFrozen(recipe.axes));
    const serialized = serializeSurfaceRecipe(recipe);
    assert.deepEqual(parseSurfaceRecipe(serialized), recipe);
    assert.equal(
      createHash("sha256").update(serialized, "utf8").digest("hex"),
      expectedFingerprint,
    );
  }
});

test("paper axes encode uptake, lateral mobility, retention, and shading independently", () => {
  assert.equal(PAPER_SURFACE_SMOOTH_R1.axes.verticalUptake, 0);
  assert.ok(
    PAPER_SURFACE_SMOOTH_R1.axes.filmPreservation
      > PAPER_SURFACE_BALANCED_R1.axes.filmPreservation,
  );
  assert.ok(
    PAPER_SURFACE_BALANCED_R1.axes.filmPreservation
      > PAPER_SURFACE_ABSORBENT_R1.axes.filmPreservation,
  );
  assert.ok(
    PAPER_SURFACE_ABSORBENT_R1.axes.verticalUptake
      > PAPER_SURFACE_ABSORBENT_R1.axes.lateralMobility,
    "absorbent paper must not collapse into an isotropic blur control",
  );
  assert.ok(
    PAPER_SURFACE_SMOOTH_R1.keyboard.contactRetentionFloor
      > PAPER_SURFACE_ABSORBENT_R1.keyboard.contactRetentionFloor,
  );
});

test("registered Surface identities cannot be silently retuned", () => {
  const impostor = JSON.parse(JSON.stringify(PAPER_SURFACE_BALANCED_R1));
  impostor.axes.lateralMobility = 0.9;
  assert.equal(validateSurfaceRecipe(impostor), true);
  assert.throws(
    () => assertSurfaceRecipeCompatible(impostor),
    /does not match its registered definition/,
  );
});
