import assert from "node:assert/strict";
import test from "node:test";
import * as engine from "fountain-ink-engine";
import * as canvas2d from "fountain-ink-engine/canvas2d";
import * as contact from "fountain-ink-engine/contact";
import * as contracts from "fountain-ink-engine/contracts";
import * as density from "fountain-ink-engine/density";
import * as deterministic from "fountain-ink-engine/deterministic";
import * as recipes from "fountain-ink-engine/recipes";
import * as surface from "fountain-ink-engine/surface";

test("self-referenced package barrels expose the stable API", () => {
  assert.equal(engine.getNibGeometry, contact.getNibGeometry);
  assert.equal(
    engine.getGlyphContactGeometry,
    contact.getGlyphContactGeometry,
  );
  assert.equal(engine.WetInkSimulation, surface.WetInkSimulation);
  assert.equal(engine.hashString, deterministic.hashString);
  assert.equal(engine.compositeOrdinaryInk, density.compositeOrdinaryInk);
  assert.equal(engine.MAX_GLYPH_CONTACTS, density.MAX_GLYPH_CONTACTS);
  assert.equal(engine.MAX_GLYPH_CONTACTS, 0xffff);
  assert.equal(engine.engineModelVersion, contracts.engineModelVersion);
  assert.equal(engine.makeGlyphMask, canvas2d.makeGlyphMask);
  assert.equal(
    engine.renderOrdinaryInkMaterial,
    canvas2d.renderOrdinaryInkMaterial,
  );
  assert.equal(
    engine.ORDINARY_GREEN_RECIPE_R1,
    recipes.ORDINARY_GREEN_RECIPE_R1,
  );
  assert.equal(
    engine.ORDINARY_GREEN_RECIPE_R2,
    recipes.ORDINARY_GREEN_RECIPE_R2,
  );
  assert.equal(
    engine.ORDINARY_GREEN_RECIPE_R3,
    recipes.ORDINARY_GREEN_RECIPE_R3,
  );
  assert.equal(
    engine.ORDINARY_GREEN_RECIPE_R4,
    recipes.ORDINARY_GREEN_RECIPE_R4,
  );
  assert.equal(typeof canvas2d.renderOrdinaryInkMaterial, "function");
});

test("importing the Canvas adapter does not touch browser globals", () => {
  assert.equal(typeof canvas2d.makeLayer, "function");
  assert.throws(() => canvas2d.makeLayer(1, 1), /browser document/);
});

test("Canvas material adapters reject invalid units before browser allocation", () => {
  assert.throws(() => canvas2d.makeMaterialCoverage({
    recipe: recipes.ORDINARY_GREEN_RECIPE_R4,
    absorption: 2,
    surfaceSeed: 0,
  }), /absorption must be a finite number in 0\.\.\.1/);
  assert.throws(() => canvas2d.renderOrdinaryInkMaterial({
    recipe: recipes.ORDINARY_GREEN_RECIPE_R4,
    flow: 58,
    absorption: 101,
    surfaceSeed: 0,
  }), /absorption must be a finite number in 0\.\.\.100/);
});
