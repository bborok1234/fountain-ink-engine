import assert from "node:assert/strict";
import test from "node:test";
import {
  coordinateNoise,
  hashString,
  randomFrom,
  splitGraphemes,
} from "../src/deterministic/index.js";

test("hash and PRNG repeat for literal text and explicit seed", () => {
  assert.equal(hashString("만년필:M"), hashString("만년필:M"));
  assert.notEqual(hashString("만년필:M"), hashString("만년필:B"));
  const first = randomFrom(0x12345678);
  const second = randomFrom(0x12345678);
  assert.deepEqual(
    Array.from({ length: 8 }, first),
    Array.from({ length: 8 }, second),
  );
  assert.notDeepEqual(
    Array.from({ length: 8 }, randomFrom(0)),
    Array.from({ length: 8 }, randomFrom(1)),
  );
});

test("coordinate noise is page anchored and bounded", () => {
  const samples = [
    coordinateNoise(0, 0, 7),
    coordinateNoise(10, 20, 7),
    coordinateNoise(10, 20, 8),
  ];
  assert.deepEqual(samples, [
    coordinateNoise(0, 0, 7),
    coordinateNoise(10, 20, 7),
    coordinateNoise(10, 20, 8),
  ]);
  assert.ok(samples.every((sample) => sample >= 0 && sample <= 1));
  assert.notEqual(samples[1], samples[2]);
});

test("grapheme segmentation preserves Korean composition clusters", () => {
  assert.deepEqual(splitGraphemes("가A🙂"), ["가", "A", "🙂"]);
  assert.equal(splitGraphemes("가").length, 1);
});
