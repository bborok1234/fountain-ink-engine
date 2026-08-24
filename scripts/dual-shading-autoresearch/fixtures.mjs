import {
  DEFAULT_SURFACE_SEED,
  ORDINARY_GREEN_RECIPE_R12,
  PAPER_SURFACE_ABSORBENT_R4,
  PAPER_SURFACE_BALANCED_R2,
  PAPER_SURFACE_SMOOTH_R1,
  WetInkSimulation,
} from "fountain-ink-engine";

export const FIXTURE_WIDTH = 56;
export const FIXTURE_HEIGHT = 40;

export const SHAPE_PROFILES = Object.freeze([
  "constant",
  "start-stop",
  "loop",
  "cross",
  "double-pass",
]);

export const WIDTH_PROFILES = Object.freeze([
  Object.freeze({ id: "thin", radius: 1.2 }),
  Object.freeze({ id: "medium", radius: 2.8 }),
  Object.freeze({ id: "broad", radius: 4.8 }),
]);

export const PAPER_PROFILES = Object.freeze([
  Object.freeze({ id: "smooth", recipe: PAPER_SURFACE_SMOOTH_R1 }),
  Object.freeze({ id: "balanced", recipe: PAPER_SURFACE_BALANCED_R2 }),
  Object.freeze({ id: "absorbent", recipe: PAPER_SURFACE_ABSORBENT_R4 }),
]);

export function fixtureId(shape, widthProfile, paperProfile) {
  return `${shape}/${widthProfile.id}/${paperProfile.id}`;
}

function makeMask() {
  return {
    width: FIXTURE_WIDTH,
    height: FIXTURE_HEIGHT,
    data: new Uint8ClampedArray(FIXTURE_WIDTH * FIXTURE_HEIGHT * 4),
  };
}

function paintCapsule(mask, start, end, radius, profile = () => 1) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  for (let y = 0; y < mask.height; y += 1) {
    for (let x = 0; x < mask.width; x += 1) {
      const projection = lengthSquared === 0
        ? 0
        : ((x - start.x) * dx + (y - start.y) * dy) / lengthSquared;
      const progress = Math.max(0, Math.min(1, projection));
      const nearestX = start.x + progress * dx;
      const nearestY = start.y + progress * dy;
      const distance = Math.hypot(x - nearestX, y - nearestY);
      const coverage = Math.max(0, Math.min(1, radius + 0.5 - distance));
      if (coverage === 0) continue;
      const alpha = Math.round(
        255 * coverage * Math.max(0, Math.min(1, profile(progress))),
      );
      const offset = (y * mask.width + x) * 4;
      mask.data[offset + 3] = Math.max(mask.data[offset + 3], alpha);
    }
  }
  return mask;
}

function line(start, end, radius, profile) {
  return paintCapsule(makeMask(), start, end, radius, profile);
}

export function makeFixturePasses(shape, radius) {
  if (shape === "constant") {
    return [line(
      { x: 8, y: 20 },
      { x: 47, y: 20 },
      radius,
      () => 0.78,
    )];
  }
  if (shape === "start-stop") {
    return [line(
      { x: 8, y: 20 },
      { x: 47, y: 20 },
      radius,
      (progress) => 0.56
        + 0.31 * progress
        + 0.11 * Math.sin(Math.PI * progress) ** 2,
    )];
  }
  if (shape === "loop") {
    const points = [
      { x: 17, y: 11 },
      { x: 39, y: 11 },
      { x: 45, y: 20 },
      { x: 39, y: 29 },
      { x: 17, y: 29 },
      { x: 11, y: 20 },
      { x: 17, y: 11 },
    ];
    return points.slice(0, -1).map((start, index) => line(
      start,
      points[index + 1],
      radius,
      (progress) => 0.68 + 0.22 * ((index + progress) / 6),
    ));
  }
  if (shape === "cross") {
    return [
      line(
        { x: 8, y: 20 },
        { x: 47, y: 20 },
        radius,
        (progress) => 0.68 + 0.28 * progress,
      ),
      line(
        { x: 28, y: 7 },
        { x: 28, y: 33 },
        radius,
        (progress) => 0.92 - 0.24 * progress,
      ),
    ];
  }
  if (shape === "double-pass") {
    return [
      line(
        { x: 7, y: 18 },
        { x: 46, y: 20 },
        radius,
        (progress) => 0.62 + 0.3 * progress,
      ),
      line(
        { x: 48, y: 22 },
        { x: 11, y: 20 },
        radius,
        (progress) => 0.7 + 0.24 * progress,
      ),
    ];
  }
  throw new TypeError(`unknown dual-shading fixture shape ${shape}`);
}

function mergeContact(passes) {
  const alpha = new Uint8ClampedArray(FIXTURE_WIDTH * FIXTURE_HEIGHT);
  for (const pass of passes) {
    for (let index = 0; index < alpha.length; index += 1) {
      alpha[index] = Math.max(alpha[index], pass.data[index * 4 + 3]);
    }
  }
  const mask = new Uint8Array(alpha.length);
  for (let index = 0; index < alpha.length; index += 1) {
    if (alpha[index] > 0) mask[index] = 1;
  }
  return { alpha, mask };
}

function stepCountFor(surfaceRecipe) {
  const response = surfaceRecipe.surfaceRecipeSchemaVersion === 1
    ? surfaceRecipe.axes.verticalUptake
      * surfaceRecipe.keyboard.stepUptakeGain
    : surfaceRecipe.axes.lateralMobility
      * surfaceRecipe.keyboard.stepMobilityGain;
  return Math.round(surfaceRecipe.keyboard.stepBase + response);
}

function makeImageData() {
  return {
    width: FIXTURE_WIDTH,
    height: FIXTURE_HEIGHT,
    data: new Uint8ClampedArray(FIXTURE_WIDTH * FIXTURE_HEIGHT * 4),
  };
}

function makeConcentration(baseRgba) {
  const data = new Float32Array(FIXTURE_WIDTH * FIXTURE_HEIGHT);
  for (let index = 0; index < data.length; index += 1) {
    data[index] = baseRgba.data[index * 4 + 3] / 255;
  }
  return Object.freeze({
    width: FIXTURE_WIDTH,
    height: FIXTURE_HEIGHT,
    data,
  });
}

export function runFixture({
  shape,
  widthProfile,
  paperProfile,
  dyeComponentRecipe,
}) {
  const passes = makeFixturePasses(shape, widthProfile.radius);
  const contact = mergeContact(passes);
  const simulation = new WetInkSimulation(
    FIXTURE_WIDTH,
    FIXTURE_HEIGHT,
    DEFAULT_SURFACE_SEED,
  );
  for (let index = 0; index < passes.length; index += 1) {
    simulation.depositMask(passes[index], {
      waterLoad: ORDINARY_GREEN_RECIPE_R12.keyboardDeposit.waterLoad,
      pigmentLoad: ORDINARY_GREEN_RECIPE_R12.keyboardDeposit.pigmentLoad,
      seed: (
        DEFAULT_SURFACE_SEED ^ Math.imul(index + 1, 0x85ebca6b)
      ) >>> 0,
      dyeComponentRecipe,
    });
  }
  const initialState = simulation.createDyeComponentState();
  const steps = stepCountFor(paperProfile.recipe);
  for (let index = 0; index < steps; index += 1) {
    simulation.stepSurface(
      paperProfile.recipe.keyboard.stepMilliseconds,
      paperProfile.recipe,
    );
  }
  const baseRgba = makeImageData();
  simulation.render(baseRgba, ORDINARY_GREEN_RECIPE_R12);
  return Object.freeze({
    id: fixtureId(shape, widthProfile, paperProfile),
    shape,
    widthId: widthProfile.id,
    paperId: paperProfile.id,
    steps,
    contactAlpha: contact.alpha,
    contactMask: contact.mask,
    initialState,
    state: simulation.createDyeComponentState(),
    baseRgba,
    concentration: makeConcentration(baseRgba),
  });
}
