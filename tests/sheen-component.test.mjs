import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import {
  SHEEN_COMPONENT_RECIPE_R1,
  assertSheenComponentRecipeCompatible,
  createSheenSurfaceFilm,
  freezeSheenComponentRecipe,
  parseSheenComponentRecipe,
  serializeSheenComponentRecipe,
} from "fountain-ink-engine/sheen-components";
import { compositeSheenOptical } from "fountain-ink-engine/optical";
import {
  PAPER_SURFACE_ABSORBENT_R4,
  PAPER_SURFACE_BALANCED_R2,
  PAPER_SURFACE_SMOOTH_R1,
} from "fountain-ink-engine/surface-recipes";

const makePlane = (data) => Object.freeze({
  width: data.length,
  height: 1,
  data: new Float32Array(data),
});

test("the registered sheen recipe is canonical, frozen, and independently pinned", () => {
  const serialized = serializeSheenComponentRecipe(
    SHEEN_COMPONENT_RECIPE_R1,
  );
  assert.equal(Object.isFrozen(SHEEN_COMPONENT_RECIPE_R1), true);
  assert.equal(
    createHash("sha256").update(serialized).digest("hex"),
    "1f45b8b5728fe8511923d5235276c19f8d51efd41c1202f77e64a5fcc1107c9e",
  );
  assert.deepEqual(parseSheenComponentRecipe(serialized), SHEEN_COMPONENT_RECIPE_R1);
  assert.equal(
    assertSheenComponentRecipeCompatible(SHEEN_COMPONENT_RECIPE_R1),
    true,
  );
});

test("custom sheen recipes are explicit while registered identities reject retuning", () => {
  const custom = freezeSheenComponentRecipe({
    ...SHEEN_COMPONENT_RECIPE_R1,
    id: "workbench-sheen",
    activationThreshold: 0.68,
  });
  assert.equal(assertSheenComponentRecipeCompatible(custom), true);
  assert.throws(
    () => assertSheenComponentRecipeCompatible({
      ...SHEEN_COMPONENT_RECIPE_R1,
      filmGain: 5,
    }),
    /registered definition/,
  );
  assert.throws(
    () => freezeSheenComponentRecipe({
      ...SHEEN_COMPONENT_RECIPE_R1,
      get filmGain() {
        return 3;
      },
    }),
    /enumerable own data property/,
  );
});

test("surface film activates only above threshold and follows paper film preservation", () => {
  const concentration = makePlane([0.2, 0.72, 0.8, 0.9, 1]);
  const resolvedCoverage = makePlane([1, 1, 1, 1, 1]);
  const render = (surfaceRecipe) => createSheenSurfaceFilm({
    pixelWidth: 5,
    pixelHeight: 1,
    concentration,
    resolvedCoverage,
    surfaceRecipe,
    sheenComponentRecipe: SHEEN_COMPONENT_RECIPE_R1,
  });
  const smooth = render(PAPER_SURFACE_SMOOTH_R1);
  const balanced = render(PAPER_SURFACE_BALANCED_R2);
  const absorbent = render(PAPER_SURFACE_ABSORBENT_R4);
  assert.deepEqual(Array.from(smooth.data.slice(0, 2)), [0, 0]);
  assert.ok(smooth.data[2] > 0);
  assert.ok(smooth.data[2] < smooth.data[3]);
  assert.ok(smooth.data[3] <= smooth.data[4]);
  for (const index of [2, 3]) {
    assert.ok(smooth.data[index] > balanced.data[index]);
    assert.ok(balanced.data[index] > absorbent.data[index]);
  }
  assert.ok(smooth.data[4] >= balanced.data[4]);
  assert.ok(balanced.data[4] > absorbent.data[4]);
});

test("static fallback preserves base RGBA and specular view changes only film RGB", () => {
  const baseRgba = {
    width: 4,
    height: 1,
    data: new Uint8ClampedArray([
      25, 45, 70, 210,
      25, 45, 70, 220,
      25, 45, 70, 230,
      25, 45, 70, 0,
    ]),
  };
  const sheenFilm = {
    width: 4,
    height: 1,
    data: new Float32Array([0, 0.4, 1, 1]),
  };
  const fallback = {
    width: 4,
    height: 1,
    data: new Uint8ClampedArray(16),
  };
  compositeSheenOptical({
    pixelWidth: 4,
    pixelHeight: 1,
    baseRgba,
    sheenFilm,
    sheenComponentRecipe: SHEEN_COMPONENT_RECIPE_R1,
    sheenObservation: { specularAlignment: 0 },
    output: fallback,
  });
  assert.deepEqual(fallback.data, baseRgba.data);

  const specular = {
    width: 4,
    height: 1,
    data: new Uint8ClampedArray(16),
  };
  compositeSheenOptical({
    pixelWidth: 4,
    pixelHeight: 1,
    baseRgba,
    sheenFilm,
    sheenComponentRecipe: SHEEN_COMPONENT_RECIPE_R1,
    sheenObservation: { specularAlignment: 1 },
    output: specular,
  });
  assert.deepEqual(specular.data.slice(0, 4), baseRgba.data.slice(0, 4));
  assert.notDeepEqual(specular.data.slice(4, 12), baseRgba.data.slice(4, 12));
  assert.deepEqual(specular.data.slice(12, 16), baseRgba.data.slice(12, 16));
  for (let offset = 3; offset < specular.data.length; offset += 4) {
    assert.equal(specular.data[offset], baseRgba.data[offset]);
  }
});
