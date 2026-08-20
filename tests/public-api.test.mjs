import assert from "node:assert/strict";
import test from "node:test";
import * as engine from "fountain-ink-engine";
import * as canvas2d from "fountain-ink-engine/canvas2d";
import * as contact from "fountain-ink-engine/contact";
import * as contracts from "fountain-ink-engine/contracts";
import * as density from "fountain-ink-engine/density";
import * as deterministic from "fountain-ink-engine/deterministic";
import * as surface from "fountain-ink-engine/surface";

test("self-referenced package barrels expose the stable API", () => {
  assert.equal(engine.getNibGeometry, contact.getNibGeometry);
  assert.equal(engine.WetInkSimulation, surface.WetInkSimulation);
  assert.equal(engine.hashString, deterministic.hashString);
  assert.equal(engine.compositeOrdinaryInk, density.compositeOrdinaryInk);
  assert.equal(engine.engineModelVersion, contracts.engineModelVersion);
  assert.equal(engine.makeGlyphMask, canvas2d.makeGlyphMask);
  assert.equal(typeof canvas2d.renderOrdinaryInkMaterial, "function");
});

test("importing the Canvas adapter does not touch browser globals", () => {
  assert.equal(typeof canvas2d.makeLayer, "function");
  assert.throws(() => canvas2d.makeLayer(1, 1), /browser document/);
});
