import assert from "node:assert/strict";
import test from "node:test";
import { makeGlyphMask } from "../src/canvas2d/index.js";
import { getNibGeometry } from "../src/contact/index.js";

function createCountingLayer(width, height) {
  let pixels = new Uint8ClampedArray(width * height * 4);
  const calls = { fillText: 0, strokeText: 0 };
  const context = {
    setTransform() {},
    fillText() {
      calls.fillText += 1;
      const center = Math.floor(height / 2) * width + Math.floor(width / 2);
      pixels[center * 4 + 3] = 255;
    },
    strokeText() {
      calls.strokeText += 1;
    },
    getImageData() {
      return { data: new Uint8ClampedArray(pixels), width, height };
    },
    putImageData(image) {
      pixels = new Uint8ClampedArray(image.data);
    },
  };
  return {
    width,
    height,
    calls,
    getContext: () => context,
  };
}

test("special nibs morph one glyph mask without duplicate text or shadow passes", () => {
  for (const nibId of ["SU", "CM"]) {
    let layer;
    const result = makeGlyphMask({
      character: "미",
      metrics: {
        width: 20,
        actualBoundingBoxLeft: 1,
        actualBoundingBoxRight: 19,
        actualBoundingBoxAscent: 20,
        actualBoundingBoxDescent: 5,
      },
      font: '400 28px "Nanum Pen Script"',
      fontSize: 28,
      scale: 1,
      geometry: getNibGeometry(nibId, 28),
      createLayer(width, height) {
        layer = createCountingLayer(width, height);
        return layer;
      },
    });
    assert.equal(result.canvas, layer);
    assert.equal(layer.calls.fillText, 1);
    assert.equal(layer.calls.strokeText, 0);
  }
});
