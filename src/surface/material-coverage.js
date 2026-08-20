import { WetInkSimulation } from "./wet-ink-simulation.js";

export const DEFAULT_SURFACE_SEED = 0x13579bdf;

/**
 * Run the exact accepted deposit/step/alpha-normalization material calculation
 * on an already-resampled mask. Canvas allocation and resizing stay with the
 * caller; the returned object is ImageData-compatible structural RGBA.
 *
 * @param {{width:number,height:number,data:Uint8ClampedArray}} deposit
 * @param {number} absorption normalized 0...1
 * @param {number} surfaceSeed
 */
export function createMaterialCoverage(
  deposit,
  absorption,
  surfaceSeed,
) {
  if (!Number.isInteger(surfaceSeed) || surfaceSeed < 0) {
    throw new TypeError("surfaceSeed must be an explicit non-negative integer.");
  }
  const simulation = new WetInkSimulation(
    deposit.width,
    deposit.height,
    surfaceSeed,
  );
  simulation.depositMask(deposit, {
    waterLoad: 0.377,
    pigmentLoad: 0.291,
    seed: surfaceSeed ^ 0x85ebca6b,
  });
  const steps = Math.round(6 + absorption * 12);
  for (let index = 0; index < steps; index += 1) {
    simulation.step(16.667, absorption);
  }

  const material = {
    width: deposit.width,
    height: deposit.height,
    data: new Uint8ClampedArray(deposit.width * deposit.height * 4),
  };
  simulation.render(material);
  let strongest = 1;
  for (let index = 3; index < material.data.length; index += 4) {
    strongest = Math.max(strongest, material.data[index]);
  }
  for (let index = 0; index < material.data.length; index += 4) {
    const normalized = Math.min(
      1,
      material.data[index + 3] / (strongest * 0.9),
    );
    material.data[index] = 255;
    material.data[index + 1] = 255;
    material.data[index + 2] = 255;
    material.data[index + 3] = Math.round(normalized * 255);
  }
  return material;
}
