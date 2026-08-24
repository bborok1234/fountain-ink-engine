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
import * as oxidationComponents from "fountain-ink-engine/oxidation-components";
import * as pigmentComponents from "fountain-ink-engine/pigment-components";
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
    engine.EDGE_DYE_COMPONENT_RECIPE_R16,
    dyeComponents.EDGE_DYE_COMPONENT_RECIPE_R16,
  );
  assert.equal(
    engine.KEYBOARD_DYE_AREAL_LOAD_CONTRACT_VERSION,
    "keyboard-dye-areal-load-v1",
  );
  assert.equal(
    engine.assertKeyboardDyeArealLoad,
    contracts.assertKeyboardDyeArealLoad,
  );
  assert.equal(
    engine.createKeyboardDyeArealLoad,
    canvas2d.createKeyboardDyeArealLoad,
  );
  assert.equal(
    engine.getKeyboardDyeArealLoadScale,
    canvas2d.getKeyboardDyeArealLoadScale,
  );
  assert.equal(
    engine.EDGE_DYE_COMPONENT_RECIPE_R4,
    dyeComponents.EDGE_DYE_COMPONENT_RECIPE_R4,
  );
  assert.equal(
    engine.EDGE_DYE_COMPONENT_RECIPE_R5,
    dyeComponents.EDGE_DYE_COMPONENT_RECIPE_R5,
  );
  assert.equal(
    engine.EDGE_DYE_COMPONENT_RECIPE_R6,
    dyeComponents.EDGE_DYE_COMPONENT_RECIPE_R6,
  );
  assert.equal(
    engine.EDGE_DYE_COMPONENT_RECIPE_R7,
    dyeComponents.EDGE_DYE_COMPONENT_RECIPE_R7,
  );
  assert.equal(
    engine.EDGE_DYE_COMPONENT_RECIPE_R8,
    dyeComponents.EDGE_DYE_COMPONENT_RECIPE_R8,
  );
  assert.equal(
    engine.EDGE_DYE_COMPONENT_RECIPE_R9,
    dyeComponents.EDGE_DYE_COMPONENT_RECIPE_R9,
  );
  assert.equal(
    engine.EDGE_DYE_COMPONENT_RECIPE_R10,
    dyeComponents.EDGE_DYE_COMPONENT_RECIPE_R10,
  );
  assert.equal(
    engine.EDGE_DYE_COMPONENT_RECIPE_R11,
    dyeComponents.EDGE_DYE_COMPONENT_RECIPE_R11,
  );
  assert.equal(
    engine.EDGE_DYE_COMPONENT_RECIPE_R12,
    dyeComponents.EDGE_DYE_COMPONENT_RECIPE_R12,
  );
  assert.equal(
    engine.EDGE_DYE_COMPONENT_RECIPE_R13,
    dyeComponents.EDGE_DYE_COMPONENT_RECIPE_R13,
  );
  assert.equal(
    engine.EDGE_DYE_COMPONENT_RECIPE_R14,
    dyeComponents.EDGE_DYE_COMPONENT_RECIPE_R14,
  );
  assert.equal(
    engine.EDGE_DYE_COMPONENT_RECIPE_R15,
    dyeComponents.EDGE_DYE_COMPONENT_RECIPE_R15,
  );
  assert.equal(
    engine.dyeComponentStateModelVersion,
    dyeComponents.dyeComponentStateModelVersion,
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
    engine.compositeDyeWellMixedControlOptical,
    optical.compositeDyeWellMixedControlOptical,
  );
  assert.equal(
    engine.compositeDyeFiniteLoadingTransportedOptical,
    optical.compositeDyeFiniteLoadingTransportedOptical,
  );
  assert.equal(
    engine.compositeDyeFiniteLoadingWellMixedControlOptical,
    optical.compositeDyeFiniteLoadingWellMixedControlOptical,
  );
  assert.equal(
    engine.DYE_OPTICAL_COMPARISON_FINITE_LOADING_WELL_MIXED_VS_TRANSPORTED_V1,
    canvas2d.DYE_OPTICAL_COMPARISON_FINITE_LOADING_WELL_MIXED_VS_TRANSPORTED_V1,
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
  assert.equal(
    engine.PIGMENT_COMPONENT_RECIPE_R1,
    pigmentComponents.PIGMENT_COMPONENT_RECIPE_R1,
  );
  assert.equal(
    engine.assertPigmentComponentRecipeCompatible,
    pigmentComponents.assertPigmentComponentRecipeCompatible,
  );
  assert.equal(
    engine.OXIDATION_COMPONENT_RECIPE_R1,
    oxidationComponents.OXIDATION_COMPONENT_RECIPE_R1,
  );
  assert.equal(
    engine.createOxidationState,
    oxidationComponents.createOxidationState,
  );
  assert.equal(
    engine.compositeOxidationOptical,
    optical.compositeOxidationOptical,
  );
  assert.equal(engine.MAX_GLYPH_CONTACTS, density.MAX_GLYPH_CONTACTS);
  assert.equal(engine.MAX_GLYPH_CONTACTS, 0xffff);
  assert.equal(engine.engineModelVersion, contracts.engineModelVersion);
  assert.equal(engine.freezeComponentInputs, contracts.freezeComponentInputs);
  assert.equal(engine.validateComponentInputs, contracts.validateComponentInputs);
  assert.equal(engine.freezeRenderContext, contracts.freezeRenderContext);
  assert.equal(engine.validateRenderContext, contracts.validateRenderContext);
  assert.equal(engine.createFieldSignature, contracts.createFieldSignature);
  assert.equal(
    engine.createStableOutputContract,
    contracts.createStableOutputContract,
  );
  assert.equal(
    engine.compareStableOutputContracts,
    contracts.compareStableOutputContracts,
  );
  assert.equal(
    engine.validateStableOutputContract,
    contracts.validateStableOutputContract,
  );
  assert.equal(
    engine.createOrdinaryStageSignatures,
    canvas2d.createOrdinaryStageSignatures,
  );
  assert.equal(
    engine.DYE_OPTICAL_COMPARISON_WELL_MIXED_VS_TRANSPORTED_V1,
    canvas2d.DYE_OPTICAL_COMPARISON_WELL_MIXED_VS_TRANSPORTED_V1,
  );
  assert.equal(
    engine.DYE_OPTICAL_COMPARISON_WELL_MIXED_VS_TRANSPORTED_V1,
    "dye-optical-comparison-well-mixed-vs-transported-v1",
  );
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
