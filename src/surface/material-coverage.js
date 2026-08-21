import { WetInkSimulation } from "./wet-ink-simulation.js";
import { assertInkRecipeCompatible } from "../recipes/compatibility.js";
import { assertUint32 } from "../contracts/numeric.js";
import { assertSurfaceDensityTransportGrid } from "./density-transport.js";
import {
  MAX_PAPER_SURFACE_STEPS,
  assertSurfaceRecipeCompatible,
} from "../surface-recipes/index.js";

export const DEFAULT_SURFACE_SEED = 0x13579bdf;

/**
 * Run the exact accepted deposit/step/fixed-reference material calculation
 * on an already-resampled mask. Canvas allocation and resizing stay with the
 * caller. Coverage is ImageData-compatible structural RGBA; optional density
 * transport remains a compact Float32 solver grid.
 *
 * @param {{width:number,height:number,data:Uint8ClampedArray}} deposit
 * @param {Record<string, unknown>} surfaceRecipe
 * @param {number} surfaceSeed
 * @param {Record<string, unknown>} recipe
 * @param {{width:number,height:number,signedNumerator:Float32Array,
 *   pigmentWeight:Float32Array}|null} densityTransport
 */
export function createKeyboardSurfaceState(
  deposit,
  surfaceRecipe,
  surfaceSeed,
  inkRecipe,
  densityTransport = null,
) {
  assertInkRecipeCompatible(inkRecipe);
  assertSurfaceRecipeCompatible(surfaceRecipe);
  assertUint32(surfaceSeed, "surfaceSeed");
  const validatedDensityTransport = densityTransport === null
    ? null
    : assertSurfaceDensityTransportGrid(densityTransport);
  if (
    validatedDensityTransport !== null
    && (
      validatedDensityTransport.width !== deposit.width
      || validatedDensityTransport.height !== deposit.height
    )
  ) {
    throw new TypeError(
      "densityTransport dimensions must match the deposit grid.",
    );
  }
  const simulation = new WetInkSimulation(
    deposit.width,
    deposit.height,
    surfaceSeed,
  );
  simulation.depositMask(deposit, {
    waterLoad: inkRecipe.keyboardDeposit.waterLoad,
    pigmentLoad: inkRecipe.keyboardDeposit.pigmentLoad,
    seed: (surfaceSeed ^ 0x85ebca6b) >>> 0,
    ...(validatedDensityTransport === null
      ? {}
      : { densityTransport: validatedDensityTransport }),
  });
  const stepResponse = surfaceRecipe.surfaceRecipeSchemaVersion === 1
    ? surfaceRecipe.axes.verticalUptake
      * surfaceRecipe.keyboard.stepUptakeGain
    : surfaceRecipe.axes.lateralMobility
      * surfaceRecipe.keyboard.stepMobilityGain;
  const steps = Math.round(
    surfaceRecipe.keyboard.stepBase + stepResponse,
  );
  if (steps < 0 || steps > MAX_PAPER_SURFACE_STEPS) {
    throw new RangeError(
      `calculated keyboard Surface steps must be in 0...${MAX_PAPER_SURFACE_STEPS}.`,
    );
  }
  for (let index = 0; index < steps; index += 1) {
    simulation.stepSurface(surfaceRecipe.keyboard.stepMilliseconds, surfaceRecipe);
  }

  const material = {
    width: deposit.width,
    height: deposit.height,
    data: new Uint8ClampedArray(deposit.width * deposit.height * 4),
  };
  simulation.render(material, inkRecipe);
  for (let index = 0; index < material.data.length; index += 4) {
    const normalized = Math.min(
      1,
      material.data[index + 3]
        / (
          surfaceRecipe.keyboard.normalizationReferenceAlpha
          * surfaceRecipe.keyboard.normalizationScale
        ),
    );
    material.data[index] = 255;
    material.data[index + 1] = 255;
    material.data[index + 2] = 255;
    material.data[index + 3] = Math.round(normalized * 255);
  }
  return Object.freeze({
    coverage: material,
    densityTransport: simulation.createDensityTransport(inkRecipe),
    paperDepth: simulation.createPaperDepthState(),
  });
}

/**
 * Backwards-compatible coverage-only entry point. It deliberately does not
 * allocate keyboard density transport planes.
 */
export function createMaterialCoverage(
  deposit,
  surfaceRecipe,
  surfaceSeed,
  inkRecipe,
) {
  return createKeyboardSurfaceState(
    deposit,
    surfaceRecipe,
    surfaceSeed,
    inkRecipe,
  ).coverage;
}
