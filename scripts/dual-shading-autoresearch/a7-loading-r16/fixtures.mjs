import {
  DEFAULT_SURFACE_SEED,
  EDGE_DYE_COMPONENT_RECIPE_R16,
  ORDINARY_GREEN_RECIPE_R12,
  PAPER_SURFACE_ABSORBENT_R4,
  PAPER_SURFACE_BALANCED_R2,
  PAPER_SURFACE_SMOOTH_R1,
  WetInkSimulation,
  createKeyboardDyeArealLoad,
  getGlyphContactGeometry,
  morphAlpha,
} from "fountain-ink-engine";

export const SOURCE_WIDTH = 112;
export const SOURCE_HEIGHT = 80;
export const SURFACE_WIDTH = 56;
export const SURFACE_HEIGHT = 40;
export const FONT_SIZE = 28;
export const DEVICE_PIXEL_RATIO = 2;
export const FIXED_GLYPH_SEED = 0x6d2b79f5;
export const FIXED_SURFACE_SEED = DEFAULT_SURFACE_SEED;

export const NIB_IDS = Object.freeze(["UEF", "M", "B"]);
export const FLOWS = Object.freeze([30, 58, 85]);
export const PRIMARY_SHAPES = Object.freeze(["single", "double", "cross"]);
export const PAPERS = Object.freeze([
  Object.freeze({ id: "smooth", recipe: PAPER_SURFACE_SMOOTH_R1 }),
  Object.freeze({ id: "balanced", recipe: PAPER_SURFACE_BALANCED_R2 }),
  Object.freeze({ id: "absorbent", recipe: PAPER_SURFACE_ABSORBENT_R4 }),
]);

const STANDARD_LENGTH = 40;
const CENTER_X = 56;
const CENTER_Y = 40;
const M_STROKE_SOURCE_RADIUS = FONT_SIZE * 0.09 * DEVICE_PIXEL_RATIO / 2;

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function roundedLineAlpha({ length, vertical = false }) {
  const alpha = new Uint8ClampedArray(SOURCE_WIDTH * SOURCE_HEIGHT);
  const half = length / 2;
  const start = vertical
    ? { x: CENTER_X, y: CENTER_Y - half }
    : { x: CENTER_X - half, y: CENTER_Y };
  const end = vertical
    ? { x: CENTER_X, y: CENTER_Y + half }
    : { x: CENTER_X + half, y: CENTER_Y };
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  for (let y = 0; y < SOURCE_HEIGHT; y += 1) {
    for (let x = 0; x < SOURCE_WIDTH; x += 1) {
      const projection = lengthSquared === 0
        ? 0
        : ((x - start.x) * dx + (y - start.y) * dy) / lengthSquared;
      const t = clamp01(projection);
      const nearestX = start.x + t * dx;
      const nearestY = start.y + t * dy;
      const distance = Math.hypot(x - nearestX, y - nearestY);
      const coverage = clamp01(M_STROKE_SOURCE_RADIUS + 0.5 - distance);
      alpha[y * SOURCE_WIDTH + x] = Math.round(255 * coverage);
    }
  }
  return alpha;
}

function applyNib(alpha, nibId) {
  const geometry = getGlyphContactGeometry(
    nibId,
    FONT_SIZE,
    FIXED_GLYPH_SEED,
  );
  if (geometry.kind !== "round") {
    throw new TypeError(`R16 evaluator requires round nib ${nibId}.`);
  }
  const radius = Math.abs(geometry.morphDelta)
    * DEVICE_PIXEL_RATIO / 2;
  if (radius === 0) return new Uint8ClampedArray(alpha);
  return morphAlpha(
    alpha,
    SOURCE_WIDTH,
    SOURCE_HEIGHT,
    radius,
    radius,
    geometry.morphDelta >= 0 ? "dilate" : "erode",
  );
}

function rgbaFromAlpha(alpha) {
  const data = new Uint8ClampedArray(alpha.length * 4);
  for (let index = 0; index < alpha.length; index += 1) {
    const offset = index * 4;
    data[offset] = 255;
    data[offset + 1] = 255;
    data[offset + 2] = 255;
    data[offset + 3] = alpha[index];
  }
  return Object.freeze({
    width: SOURCE_WIDTH,
    height: SOURCE_HEIGHT,
    data,
  });
}

function makePass(nibId, length, vertical = false, seedOffset = 0) {
  const alpha = applyNib(roundedLineAlpha({ length, vertical }), nibId);
  return Object.freeze({
    alpha,
    glyphContact: Object.freeze({
      rgbaMask: rgbaFromAlpha(alpha),
      destinationX: 0,
      destinationY: 0,
      x: 0,
      baseline: 0,
      seed: (FIXED_GLYPH_SEED ^ Math.imul(seedOffset + 1, 0x85ebca6b)) >>> 0,
    }),
  });
}

function alphaArea(alpha) {
  let total = 0;
  for (const value of alpha) total += value / 255;
  return total;
}

function unionAlpha(passes) {
  const alpha = new Uint8ClampedArray(SOURCE_WIDTH * SOURCE_HEIGHT);
  for (const pass of passes) {
    for (let index = 0; index < alpha.length; index += 1) {
      alpha[index] = Math.max(alpha[index], pass.alpha[index]);
    }
  }
  return alpha;
}

function downsampleAlpha(alpha) {
  const data = new Uint8ClampedArray(SURFACE_WIDTH * SURFACE_HEIGHT * 4);
  for (let y = 0; y < SURFACE_HEIGHT; y += 1) {
    for (let x = 0; x < SURFACE_WIDTH; x += 1) {
      let total = 0;
      for (let dy = 0; dy < DEVICE_PIXEL_RATIO; dy += 1) {
        for (let dx = 0; dx < DEVICE_PIXEL_RATIO; dx += 1) {
          total += alpha[
            (y * DEVICE_PIXEL_RATIO + dy) * SOURCE_WIDTH
              + x * DEVICE_PIXEL_RATIO + dx
          ];
        }
      }
      const offset = (y * SURFACE_WIDTH + x) * 4;
      data[offset] = 255;
      data[offset + 1] = 255;
      data[offset + 2] = 255;
      data[offset + 3] = Math.round(total / 4);
    }
  }
  return Object.freeze({ width: SURFACE_WIDTH, height: SURFACE_HEIGHT, data });
}

function bestLengthForArea(nibId, targetArea) {
  let best = null;
  for (let length = 8; length <= 96; length += 0.25) {
    const pass = makePass(nibId, length);
    const area = alphaArea(pass.alpha);
    const relativeError = Math.abs(area - targetArea) / targetArea;
    if (best === null || relativeError < best.relativeError) {
      best = { length, area, relativeError };
    }
  }
  if (best.relativeError > 0.01) {
    throw new Error(
      `unable to area-match ${nibId}; relative error ${best.relativeError}`,
    );
  }
  return Object.freeze(best);
}

const STANDARD_AREAS = Object.freeze(Object.fromEntries(NIB_IDS.map((nibId) => {
  const pass = makePass(nibId, STANDARD_LENGTH);
  return [nibId, alphaArea(pass.alpha)];
})));
const M_LENGTH_MATCHES = Object.freeze(Object.fromEntries(NIB_IDS.map((nibId) => [
  nibId,
  bestLengthForArea("M", STANDARD_AREAS[nibId]),
])));
const EQUAL_AREA_LENGTHS = Object.freeze(Object.fromEntries(NIB_IDS.map((nibId) => [
  nibId,
  bestLengthForArea(nibId, STANDARD_AREAS.M),
])));

function passSet({ nibId, shape, length }) {
  const horizontal = makePass(nibId, length, false, 0);
  if (shape === "single") return Object.freeze([horizontal]);
  if (shape === "double") return Object.freeze([horizontal, horizontal]);
  if (shape === "cross") {
    return Object.freeze([
      horizontal,
      makePass(nibId, Math.min(length, 52), true, 1),
    ]);
  }
  throw new TypeError(`unknown R16 fixture shape ${shape}`);
}

function makeImageData() {
  return {
    width: SURFACE_WIDTH,
    height: SURFACE_HEIGHT,
    data: new Uint8ClampedArray(SURFACE_WIDTH * SURFACE_HEIGHT * 4),
  };
}

function makeConcentration(baseRgba) {
  const data = new Float32Array(SURFACE_WIDTH * SURFACE_HEIGHT);
  for (let index = 0; index < data.length; index += 1) {
    data[index] = baseRgba.data[index * 4 + 3] / 255;
  }
  return Object.freeze({ width: SURFACE_WIDTH, height: SURFACE_HEIGHT, data });
}

function stepCountFor(surfaceRecipe) {
  const response = surfaceRecipe.surfaceRecipeSchemaVersion === 1
    ? surfaceRecipe.axes.verticalUptake * surfaceRecipe.keyboard.stepUptakeGain
    : surfaceRecipe.axes.lateralMobility * surfaceRecipe.keyboard.stepMobilityGain;
  return Math.round(surfaceRecipe.keyboard.stepBase + response);
}

function contactMask(deposit) {
  const mask = new Uint8Array(SURFACE_WIDTH * SURFACE_HEIGHT);
  for (let index = 0; index < mask.length; index += 1) {
    if (deposit.data[index * 4 + 3] > 0) mask[index] = 1;
  }
  return mask;
}

function clampStats(simulation, contact) {
  let cells = 0;
  let clamped = 0;
  for (let index = 0; index < contact.length; index += 1) {
    if (contact[index] === 0) continue;
    cells += 1;
    if (simulation.water[index] >= 1.4 || simulation.mobile[index] >= 1.8) {
      clamped += 1;
    }
  }
  return Object.freeze({
    cells,
    clamped,
    share: cells === 0 ? 0 : clamped / cells,
  });
}

function depositAcceptance(simulation, initialState) {
  let waterMaximum = 0;
  let mobileMaximum = 0;
  let dyeAcceptedMassMaximumError = 0;
  let residualMaximum = 0;
  for (let index = 0; index < simulation.length; index += 1) {
    waterMaximum = Math.max(waterMaximum, simulation.water[index]);
    mobileMaximum = Math.max(mobileMaximum, simulation.mobile[index]);
    dyeAcceptedMassMaximumError = Math.max(
      dyeAcceptedMassMaximumError,
      Math.abs(initialState.mobileTotalMass[index] - simulation.mobile[index]),
    );
    residualMaximum = Math.max(
      residualMaximum,
      Math.abs(initialState.mobileSecondaryResidualMass[index]),
      Math.abs(initialState.adsorbedSecondaryResidualMass[index]),
      Math.abs(initialState.depthSecondaryResidualMass[index]),
    );
  }
  return Object.freeze({
    waterMaximum,
    mobileMaximum,
    dyeAcceptedMassMaximumError,
    residualMaximum,
  });
}

function loadInterior(load, contact) {
  const values = [];
  for (let y = 1; y < SURFACE_HEIGHT - 1; y += 1) {
    for (let x = 1; x < SURFACE_WIDTH - 1; x += 1) {
      const index = y * SURFACE_WIDTH + x;
      if (
        contact[index] === 1
        && contact[index - 1] === 1
        && contact[index + 1] === 1
        && contact[index - SURFACE_WIDTH] === 1
        && contact[index + SURFACE_WIDTH] === 1
      ) values.push(load.data[index]);
    }
  }
  return values;
}

export function fixtureDefinitions() {
  const primary = [];
  for (const nibId of NIB_IDS) {
    for (const flow of FLOWS) {
      for (const paper of PAPERS) {
        for (const shape of PRIMARY_SHAPES) {
          primary.push(Object.freeze({
            id: `main/${nibId}/${flow}/${paper.id}/${shape}`,
            family: "main",
            nibId,
            flow,
            paper,
            shape,
            length: STANDARD_LENGTH,
            areaTarget: STANDARD_AREAS[nibId],
          }));
        }
      }
    }
  }
  const controls = [];
  for (const paper of PAPERS) {
    for (const targetNib of NIB_IDS) {
      const matched = M_LENGTH_MATCHES[targetNib];
      controls.push(Object.freeze({
        id: `control/m-length/${targetNib}/${paper.id}`,
        family: "m-length",
        nibId: "M",
        targetNib,
        flow: 58,
        paper,
        shape: "single",
        length: matched.length,
        areaTarget: STANDARD_AREAS[targetNib],
      }));
    }
    for (const nibId of NIB_IDS) {
      const matched = EQUAL_AREA_LENGTHS[nibId];
      controls.push(Object.freeze({
        id: `control/equal-area/${nibId}/${paper.id}`,
        family: "equal-area",
        nibId,
        targetNib: "M",
        flow: 58,
        paper,
        shape: "single",
        length: matched.length,
        areaTarget: STANDARD_AREAS.M,
      }));
    }
  }
  return Object.freeze([...primary, ...controls]);
}

export function runFixture(definition) {
  const passes = passSet(definition);
  const sourceContactAlpha = unionAlpha(passes);
  const surfaceDeposit = downsampleAlpha(sourceContactAlpha);
  const glyphContacts = Object.freeze(passes.map((pass) => pass.glyphContact));
  const arealLoad = createKeyboardDyeArealLoad({
    pixelWidth: SOURCE_WIDTH,
    pixelHeight: SOURCE_HEIGHT,
    targetWidth: SURFACE_WIDTH,
    targetHeight: SURFACE_HEIGHT,
    scale: DEVICE_PIXEL_RATIO,
    fontSize: FONT_SIZE,
    glyphContacts,
    nibId: definition.nibId,
    flow: definition.flow,
  });
  const repeatLoad = createKeyboardDyeArealLoad({
    pixelWidth: SOURCE_WIDTH,
    pixelHeight: SOURCE_HEIGHT,
    targetWidth: SURFACE_WIDTH,
    targetHeight: SURFACE_HEIGHT,
    scale: DEVICE_PIXEL_RATIO,
    fontSize: FONT_SIZE,
    glyphContacts,
    nibId: definition.nibId,
    flow: definition.flow,
  });
  const contact = contactMask(surfaceDeposit);
  const simulation = new WetInkSimulation(
    SURFACE_WIDTH,
    SURFACE_HEIGHT,
    FIXED_SURFACE_SEED,
  );
  simulation.depositMask(surfaceDeposit, {
    waterLoad: ORDINARY_GREEN_RECIPE_R12.keyboardDeposit.waterLoad,
    pigmentLoad: ORDINARY_GREEN_RECIPE_R12.keyboardDeposit.pigmentLoad,
    seed: (FIXED_SURFACE_SEED ^ 0x85ebca6b) >>> 0,
    dyeComponentRecipe: EDGE_DYE_COMPONENT_RECIPE_R16,
    keyboardDyeArealLoad: arealLoad,
  });
  const clamp = clampStats(simulation, contact);
  const initialState = simulation.createDyeComponentState();
  const acceptedDeposit = depositAcceptance(simulation, initialState);
  const steps = stepCountFor(definition.paper.recipe);
  for (let index = 0; index < steps; index += 1) {
    simulation.stepSurface(
      definition.paper.recipe.keyboard.stepMilliseconds,
      definition.paper.recipe,
    );
  }
  const baseRgba = makeImageData();
  simulation.render(baseRgba, ORDINARY_GREEN_RECIPE_R12);
  const finalState = simulation.createDyeComponentState();
  const integratedAlphaArea = alphaArea(sourceContactAlpha);
  return Object.freeze({
    ...definition,
    paperId: definition.paper.id,
    paper: undefined,
    steps,
    sourceContactAlpha,
    surfaceDeposit,
    contactMask: contact,
    integratedAlphaArea,
    areaMismatch: Math.abs(integratedAlphaArea - definition.areaTarget)
      / definition.areaTarget,
    arealLoad,
    repeatLoad,
    interiorLoad: Object.freeze(loadInterior(arealLoad, contact)),
    clamp,
    acceptedDeposit,
    initialState,
    state: finalState,
    baseRgba: Object.freeze(baseRgba),
    concentration: makeConcentration(baseRgba),
  });
}

export const FIXTURE_CASE_COUNT = fixtureDefinitions().length;
export const STANDARD_INTEGRATED_ALPHA_AREAS = STANDARD_AREAS;
