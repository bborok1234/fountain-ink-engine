import assert from "node:assert/strict";
import test from "node:test";
import * as engine from "fountain-ink-engine";
import * as canvas2d from "fountain-ink-engine/canvas2d";
import * as contact from "fountain-ink-engine/contact";
import * as contracts from "fountain-ink-engine/contracts";
import * as density from "fountain-ink-engine/density";
import * as dyeComponents from "fountain-ink-engine/dye-components";
import * as deterministic from "fountain-ink-engine/deterministic";
import * as optical from "fountain-ink-engine/optical";
import * as recipes from "fountain-ink-engine/recipes";
import * as sheenComponents from "fountain-ink-engine/sheen-components";
import * as shimmerComponents from "fountain-ink-engine/shimmer-components";
import * as surface from "fountain-ink-engine/surface";
import * as surfaceRecipes from "fountain-ink-engine/surface-recipes";

test("self-referenced package barrels expose the stable API", () => {
  assert.equal(engine.getNibGeometry, contact.getNibGeometry);
  assert.equal(engine.ACTIVE_CONTACT_CATALOG_ID, "fountain-nib-catalog-r2");
  assert.equal(
    engine.getGlyphContactGeometry,
    contact.getGlyphContactGeometry,
  );
  assert.equal(engine.WetInkSimulation, surface.WetInkSimulation);
  assert.equal(
    engine.EDGE_DYE_COMPONENT_RECIPE_R4,
    dyeComponents.EDGE_DYE_COMPONENT_RECIPE_R4,
  );
  assert.equal(
    engine.EDGE_DYE_COMPONENT_RECIPE_R5,
    dyeComponents.EDGE_DYE_COMPONENT_RECIPE_R5,
  );
  assert.equal(engine.hashString, deterministic.hashString);
  assert.equal(engine.compositeOrdinaryInk, optical.compositeOrdinaryInk);
  assert.equal(
    engine.createOrdinaryConcentrationField,
    density.createOrdinaryConcentrationField,
  );
  assert.equal(engine.getNibDensityRange, density.getNibDensityRange);
  assert.equal(contact.getNibDensityRange, undefined);
  assert.equal(
    engine.getSurfaceDensityRange,
    surface.getSurfaceDensityRange,
  );
  assert.equal(
    engine.compositeOrdinaryOptical,
    optical.compositeOrdinaryOptical,
  );
  assert.equal(
    engine.compositeDyeEdgeOptical,
    optical.compositeDyeEdgeOptical,
  );
  assert.equal(
    engine.compositeSheenOptical,
    optical.compositeSheenOptical,
  );
  assert.equal(
    engine.SHEEN_COMPONENT_RECIPE_R1,
    sheenComponents.SHEEN_COMPONENT_RECIPE_R1,
  );
  assert.equal(
    engine.createSheenSurfaceFilm,
    sheenComponents.createSheenSurfaceFilm,
  );
  assert.equal(
    engine.SHIMMER_COMPONENT_RECIPE_R1,
    shimmerComponents.SHIMMER_COMPONENT_RECIPE_R1,
  );
  assert.equal(
    engine.createShimmerParticleState,
    shimmerComponents.createShimmerParticleState,
  );
  assert.equal(
    engine.compositeShimmerOptical,
    optical.compositeShimmerOptical,
  );
  assert.equal(engine.MAX_GLYPH_CONTACTS, density.MAX_GLYPH_CONTACTS);
  assert.equal(engine.MAX_GLYPH_CONTACTS, 0xffff);
  assert.equal(engine.engineModelVersion, contracts.engineModelVersion);
  assert.equal(engine.createFieldSignature, contracts.createFieldSignature);
  assert.equal(engine.makeGlyphMask, canvas2d.makeGlyphMask);
  assert.equal(
    engine.renderOrdinaryInkMaterial,
    canvas2d.renderOrdinaryInkMaterial,
  );
  assert.equal(
    engine.beginOrdinaryInkMaterial,
    canvas2d.beginOrdinaryInkMaterial,
  );
  assert.equal(
    engine.completeOrdinaryInkMaterial,
    canvas2d.completeOrdinaryInkMaterial,
  );
  assert.equal(
    engine.prepareOrdinaryInkCanvasInput,
    canvas2d.prepareOrdinaryInkCanvasInput,
  );
  assert.equal(
    engine.upsampleKeyboardSurfaceCoverage,
    canvas2d.upsampleKeyboardSurfaceCoverage,
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
  assert.equal(
    engine.ORDINARY_GREEN_RECIPE_R5,
    recipes.ORDINARY_GREEN_RECIPE_R5,
  );
  assert.equal(
    engine.ORDINARY_GREEN_RECIPE_R6,
    recipes.ORDINARY_GREEN_RECIPE_R6,
  );
  assert.equal(
    engine.ORDINARY_GREEN_RECIPE_R9,
    recipes.ORDINARY_GREEN_RECIPE_R9,
  );
  assert.equal(
    engine.ORDINARY_BLUE_BLACK_RECIPE_R3,
    recipes.ORDINARY_BLUE_BLACK_RECIPE_R3,
  );
  assert.equal(
    engine.ORDINARY_BURGUNDY_RECIPE_R3,
    recipes.ORDINARY_BURGUNDY_RECIPE_R3,
  );
  assert.equal(
    engine.ORDINARY_TEAL_RECIPE_R3,
    recipes.ORDINARY_TEAL_RECIPE_R3,
  );
  assert.equal(engine.ORDINARY_GREEN_RECIPE_R10, recipes.ORDINARY_GREEN_RECIPE_R10);
  assert.equal(engine.ORDINARY_BLUE_BLACK_RECIPE_R4, recipes.ORDINARY_BLUE_BLACK_RECIPE_R4);
  assert.equal(engine.ORDINARY_BURGUNDY_RECIPE_R4, recipes.ORDINARY_BURGUNDY_RECIPE_R4);
  assert.equal(engine.ORDINARY_TEAL_RECIPE_R4, recipes.ORDINARY_TEAL_RECIPE_R4);
  assert.equal(engine.ORDINARY_GREEN_RECIPE_R12, recipes.ORDINARY_GREEN_RECIPE_R12);
  assert.equal(engine.ORDINARY_BLUE_BLACK_RECIPE_R6, recipes.ORDINARY_BLUE_BLACK_RECIPE_R6);
  assert.equal(engine.ORDINARY_BURGUNDY_RECIPE_R6, recipes.ORDINARY_BURGUNDY_RECIPE_R6);
  assert.equal(engine.ORDINARY_TEAL_RECIPE_R6, recipes.ORDINARY_TEAL_RECIPE_R6);
  assert.equal(
    engine.createKeyboardSurfaceState,
    surface.createKeyboardSurfaceState,
  );
  assert.equal(
    engine.resolveKeyboardSurfaceCoverage,
    surface.resolveKeyboardSurfaceCoverage,
  );
  assert.equal(
    engine.PAPER_SURFACE_BALANCED_R1,
    surfaceRecipes.PAPER_SURFACE_BALANCED_R1,
  );
  assert.equal(
    engine.PAPER_SURFACE_BALANCED_R2,
    surfaceRecipes.PAPER_SURFACE_BALANCED_R2,
  );
  assert.equal(
    engine.PAPER_SURFACE_ABSORBENT_R2,
    surfaceRecipes.PAPER_SURFACE_ABSORBENT_R2,
  );
  assert.equal(
    engine.PAPER_SURFACE_ABSORBENT_R3,
    surfaceRecipes.PAPER_SURFACE_ABSORBENT_R3,
  );
  assert.equal(
    engine.PAPER_SURFACE_ABSORBENT_R4,
    surfaceRecipes.PAPER_SURFACE_ABSORBENT_R4,
  );
  assert.equal(engine.createPaperFiberEdge, surface.createPaperFiberEdge);
  assert.equal(canvas2d.makeKeyboardSurfaceState, undefined);
  assert.equal(typeof canvas2d.renderOrdinaryInkMaterial, "function");
});

test("importing the Canvas adapter does not touch browser globals", () => {
  assert.equal(typeof canvas2d.makeLayer, "function");
  assert.throws(() => canvas2d.makeLayer(1, 1), /browser document/);
});

test("Canvas material adapters reject invalid units before browser allocation", () => {
  assert.throws(() => canvas2d.makeMaterialCoverage({
    recipe: recipes.ORDINARY_GREEN_RECIPE_R12,
    surfaceSeed: 0,
  }), /surfaceRecipe/);
  assert.throws(() => canvas2d.renderOrdinaryInkMaterial({
    recipe: recipes.ORDINARY_GREEN_RECIPE_R12,
    flow: 58,
    surfaceSeed: 0,
  }), /surfaceRecipe/);
});
