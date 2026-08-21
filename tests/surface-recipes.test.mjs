import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import {
  PAPER_SURFACE_ABSORBENT_R1,
  PAPER_SURFACE_ABSORBENT_R2,
  PAPER_SURFACE_ABSORBENT_R3,
  PAPER_SURFACE_BALANCED_R1,
  PAPER_SURFACE_BALANCED_R2,
  PAPER_SURFACE_SMOOTH_R1,
  assertSurfaceRecipeCompatible,
  parseSurfaceRecipe,
  serializeSurfaceRecipe,
  validateSurfaceRecipe,
} from "../src/surface-recipes/index.js";

const SURFACES = [
  [PAPER_SURFACE_SMOOTH_R1, "a33fba2a677e213b247ca65ec1905b218ba3c582fe4900f37e0604881c15a612"],
  [PAPER_SURFACE_BALANCED_R1, "abdf381b4206322b9884b2a8643f3c0836a7d98934fdf1ec2da73064c617d9d2"],
  [PAPER_SURFACE_BALANCED_R2, "835845deffad7aae3efceb5a850c8c9d1cc706bf94c07927507a875c073cac49"],
  [PAPER_SURFACE_ABSORBENT_R1, "aa289f94e40264db2325459eeb8fcf29b7c805a093a14cde321c82cd34b7851f"],
  [PAPER_SURFACE_ABSORBENT_R2, "8f4297d3bd38d8598fd0e05d675a2f8cb6c50e8114e7e9c3e2170a66264c862b"],
  [PAPER_SURFACE_ABSORBENT_R3, "d0f6a04bbb584df1a5ae7eb0c05bc450b2e4fe77b2db85347be7c8d481814893"],
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

test("absorbent r2 separates paper depth from page-plane mobility", () => {
  assert.equal(PAPER_SURFACE_ABSORBENT_R2.surfaceRecipeSchemaVersion, 2);
  assert.equal(PAPER_SURFACE_ABSORBENT_R2.surfaceModelVersion, "paper-surface-js-r2");
  assert.ok(
    PAPER_SURFACE_ABSORBENT_R2.axes.depthUptake
      > PAPER_SURFACE_ABSORBENT_R2.axes.lateralMobility,
  );
  assert.equal("verticalUptake" in PAPER_SURFACE_ABSORBENT_R2.axes, false);
  assert.equal("stepUptakeGain" in PAPER_SURFACE_ABSORBENT_R2.keyboard, false);
  assert.ok(
    PAPER_SURFACE_ABSORBENT_R2.keyboard.contactRetentionFloor
      > PAPER_SURFACE_ABSORBENT_R1.keyboard.contactRetentionFloor,
  );
});

test("balanced r2 preserves its solver while reducing visible coarse coverage", () => {
  assert.equal(PAPER_SURFACE_BALANCED_R2.surfaceRecipeSchemaVersion, 1);
  assert.deepEqual(PAPER_SURFACE_BALANCED_R2.axes, PAPER_SURFACE_BALANCED_R1.axes);
  assert.equal(
    PAPER_SURFACE_BALANCED_R2.keyboard.stepUptakeGain,
    PAPER_SURFACE_BALANCED_R1.keyboard.stepUptakeGain,
  );
  assert.ok(
    PAPER_SURFACE_BALANCED_R2.keyboard.coverageMixExponent
      > PAPER_SURFACE_BALANCED_R1.keyboard.coverageMixExponent,
  );
  assert.ok(
    PAPER_SURFACE_BALANCED_R2.keyboard.contactRetentionFloor
      < PAPER_SURFACE_ABSORBENT_R3.keyboard.contactRetentionFloor,
  );
});

test("absorbent r3 authors a sparse high-resolution fibre edge", () => {
  assert.equal(PAPER_SURFACE_ABSORBENT_R3.surfaceRecipeSchemaVersion, 3);
  assert.equal(PAPER_SURFACE_ABSORBENT_R3.surfaceModelVersion, "paper-surface-js-r3");
  assert.deepEqual(PAPER_SURFACE_ABSORBENT_R3.axes, PAPER_SURFACE_ABSORBENT_R2.axes);
  assert.ok(PAPER_SURFACE_ABSORBENT_R3.keyboard.fiberEdgeReachCssPixels > 1);
  assert.ok(PAPER_SURFACE_ABSORBENT_R3.keyboard.fiberEdgeOccupancy < 0.5);
  assert.ok(PAPER_SURFACE_ABSORBENT_R3.keyboard.fiberEdgeStrength < 0.7);
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
