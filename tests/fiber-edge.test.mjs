import assert from "node:assert/strict";
import test from "node:test";

import {
  createPaperFiberEdge,
  resolveKeyboardSurfaceCoverage,
} from "../src/surface/index.js";
import {
  PAPER_SURFACE_ABSORBENT_R3,
  PAPER_SURFACE_ABSORBENT_R4,
  PAPER_SURFACE_BALANCED_R1,
} from "../src/surface-recipes/index.js";

const SURFACE_SEED = 0x13579bdf;

function makeRing(width = 40, height = 28) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 8; y <= 19; y += 1) {
    for (let x = 12; x <= 27; x += 1) {
      if (x >= 16 && x <= 23 && y >= 11 && y <= 16) continue;
      data[(y * width + x) * 4 + 3] = 255;
    }
  }
  return { width, height, data };
}

function makeScaledRing(scale) {
  const width = 40 * scale;
  const height = 28 * scale;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 8 * scale; y < 20 * scale; y += 1) {
    for (let x = 12 * scale; x < 28 * scale; x += 1) {
      if (
        x >= 16 * scale
        && x < 24 * scale
        && y >= 11 * scale
        && y < 17 * scale
      ) continue;
      data[(y * width + x) * 4 + 3] = 255;
    }
  }
  return { width, height, data };
}

function reachesContact(mask, fiber, startIndex) {
  const seen = new Uint8Array(fiber.width * fiber.height);
  const queue = [startIndex];
  seen[startIndex] = 1;
  while (queue.length > 0) {
    const index = queue.shift();
    const x = index % fiber.width;
    const y = Math.floor(index / fiber.width);
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        if (dx === 0 && dy === 0) continue;
        const nextX = x + dx;
        const nextY = y + dy;
        if (
          nextX < 0
          || nextY < 0
          || nextX >= fiber.width
          || nextY >= fiber.height
        ) continue;
        const next = nextY * fiber.width + nextX;
        if (mask.data[next * 4 + 3] >= 64) return true;
        if (fiber.data[next] === 0 || seen[next] !== 0) continue;
        seen[next] = 1;
        queue.push(next);
      }
    }
  }
  return false;
}

test("absorbent r3 creates sparse connected fibres without entering counters", () => {
  const contactMask = makeRing();
  const options = {
    width: contactMask.width,
    height: contactMask.height,
    contactMask: contactMask.data,
    scale: 2,
    surfaceSeed: SURFACE_SEED,
    surfaceRecipe: PAPER_SURFACE_ABSORBENT_R3,
  };
  const first = createPaperFiberEdge(options);
  const repeated = createPaperFiberEdge(options);
  assert.deepEqual(repeated.data, first.data);

  const occupied = [];
  let maximumReach = 0;
  for (let index = 0; index < first.data.length; index += 1) {
    if (first.data[index] === 0) continue;
    occupied.push(index);
    const x = index % first.width;
    const y = Math.floor(index / first.width);
    assert.equal(x >= 16 && x <= 23 && y >= 11 && y <= 16, false);
    maximumReach = Math.max(
      maximumReach,
      Math.max(12 - x, x - 27, 8 - y, y - 19, 0),
    );
    assert.equal(reachesContact(contactMask, first, index), true);
  }
  assert.ok(occupied.length >= 20);
  assert.ok(occupied.length < 80);
  assert.ok(maximumReach >= 3);

  const changedSeed = createPaperFiberEdge({
    ...options,
    surfaceSeed: (SURFACE_SEED + 1) >>> 0,
  });
  assert.notDeepEqual(changedSeed.data, first.data);
});

test("legacy paper recipes do not invent a high-resolution fibre field", () => {
  const contactMask = makeRing();
  assert.equal(createPaperFiberEdge({
    width: contactMask.width,
    height: contactMask.height,
    contactMask: contactMask.data,
    scale: 2,
    surfaceSeed: SURFACE_SEED,
    surfaceRecipe: PAPER_SURFACE_BALANCED_R1,
  }), null);
});

test("historical absorbent r3 keeps its device-pixel fibre calibration", () => {
  const metrics = [1, 2, 3].map((scale) => {
    const contactMask = makeScaledRing(scale);
    const fiber = createPaperFiberEdge({
      width: contactMask.width,
      height: contactMask.height,
      contactMask: contactMask.data,
      scale,
      surfaceSeed: SURFACE_SEED,
      surfaceRecipe: PAPER_SURFACE_ABSORBENT_R3,
    });
    return {
      maximumAlpha: Math.max(...fiber.data),
      alphaSum: fiber.data.reduce((sum, alpha) => sum + alpha, 0),
      occupied: fiber.data.filter((alpha) => alpha > 0).length,
    };
  });
  assert.deepEqual(metrics, [
    { maximumAlpha: 158, alphaSum: 5153, occupied: 41 },
    { maximumAlpha: 157, alphaSum: 9645, occupied: 84 },
    { maximumAlpha: 158, alphaSum: 15138, occupied: 148 },
  ]);
});

test("DPR 1, 2, and 3 preserve CSS fibre reach and integrated coverage", () => {
  const metrics = [1, 2, 3].map((scale) => {
    const contactMask = makeScaledRing(scale);
    const fiber = createPaperFiberEdge({
      width: contactMask.width,
      height: contactMask.height,
      contactMask: contactMask.data,
      scale,
      surfaceSeed: SURFACE_SEED,
      surfaceRecipe: PAPER_SURFACE_ABSORBENT_R4,
    });
    let alphaSum = 0;
    let maximumAlpha = 0;
    let maximumReach = 0;
    for (let index = 0; index < fiber.data.length; index += 1) {
      const alpha = fiber.data[index];
      if (alpha === 0) continue;
      alphaSum += alpha;
      maximumAlpha = Math.max(maximumAlpha, alpha);
      const x = index % fiber.width;
      const y = Math.floor(index / fiber.width);
      maximumReach = Math.max(
        maximumReach,
        12 * scale - x,
        x - (28 * scale - 1),
        8 * scale - y,
        y - (20 * scale - 1),
        0,
      );
    }
    return {
      scale,
      cssAlphaArea: alphaSum / (255 * scale * scale),
      cssReach: maximumReach / scale,
      maximumAlpha,
    };
  });
  const referenceArea = metrics[1].cssAlphaArea;
  for (const metric of metrics) {
    assert.ok(metric.cssReach >= 1.5 && metric.cssReach <= 2.1);
    assert.ok(Math.abs(metric.cssAlphaArea / referenceArea - 1) <= 0.12);
  }
  assert.ok(metrics[0].maximumAlpha < metrics[1].maximumAlpha);
  assert.ok(metrics[1].maximumAlpha < metrics[2].maximumAlpha);
});

test("Surface resolution adds only the authored sparse fibre alpha", () => {
  const contactMask = makeRing();
  const fiberEdgeCoverage = createPaperFiberEdge({
    width: contactMask.width,
    height: contactMask.height,
    contactMask: contactMask.data,
    scale: 2,
    surfaceSeed: SURFACE_SEED,
    surfaceRecipe: PAPER_SURFACE_ABSORBENT_R3,
  });
  const resolved = resolveKeyboardSurfaceCoverage({
    width: contactMask.width,
    height: contactMask.height,
    contactMask: contactMask.data,
    materialCoverageCandidate: null,
    fiberEdgeCoverage,
    surfaceRecipe: PAPER_SURFACE_ABSORBENT_R3,
  });
  for (let index = 0; index < fiberEdgeCoverage.data.length; index += 1) {
    const contact = contactMask.data[index * 4 + 3] / 255;
    const fiber = fiberEdgeCoverage.data[index] / 255;
    assert.ok(resolved.data[index] + 1e-7 >= fiber);
    if (contact > 0) {
      assert.ok(
        resolved.data[index] + 1e-7
          >= contact * PAPER_SURFACE_ABSORBENT_R3.keyboard.contactRetentionFloor,
      );
    }
  }
});

test("fiber inputs fail closed before a malformed mask can be traversed", () => {
  assert.throws(() => createPaperFiberEdge({
    width: 4,
    height: 4,
    contactMask: new Uint8ClampedArray(3),
    scale: 2,
    surfaceSeed: SURFACE_SEED,
    surfaceRecipe: PAPER_SURFACE_ABSORBENT_R3,
  }), /length/);
  assert.throws(() => createPaperFiberEdge({
    width: 4,
    height: 4,
    contactMask: new Uint8ClampedArray(4 * 4 * 4),
    scale: Number.NaN,
    surfaceSeed: SURFACE_SEED,
    surfaceRecipe: PAPER_SURFACE_ABSORBENT_R3,
  }), /scale/);
});
