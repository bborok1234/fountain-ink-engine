import { coordinateNoiseUnchecked as coordinateNoise } from "../deterministic/random.js";
import { assertInkRecipeCompatible } from "../recipes/compatibility.js";
import { assertFiniteRange, assertUint32 } from "../contracts/numeric.js";
import { assertSurfaceDensityTransportGrid } from "./density-transport.js";
import { assertSurfaceRecipeCompatible } from "../surface-recipes/index.js";
import {
  assertDyeComponentRecipeCompatible,
  dyeComponentStateModelVersion,
  serializeDyeComponentRecipe,
} from "../dye-components/index.js";
import { assertPigmentComponentRecipeCompatible } from "../pigment-components/index.js";
import { assertKeyboardDyeArealLoad } from "../contracts/keyboard-dye-areal-load.js";

const clamp = (value, minimum = 0, maximum = 1) =>
  Math.min(maximum, Math.max(minimum, value));

const DYE_WATER_EPSILON = 1e-9;

function isExactZeroPlane(plane) {
  for (let index = 0; index < plane.length; index += 1) {
    if (plane[index] !== 0) return false;
  }
  return true;
}

function prepareDyeNextMobile(simulation) {
  if (simulation.materialComponentKind !== "dye") return;
  // Copying before local phase transfers preserves the numerical ghost ring as
  // a no-flux boundary. A7 face transport itself traverses interior faces only.
  simulation.nextMaterialComponentMobile.set(
    simulation.materialComponentMobile,
  );
  simulation.nextMaterialComponentMobileResidual.set(
    simulation.materialComponentMobileResidual,
  );
}

function transferDyeMobileToDepth(
  simulation,
  index,
  depthFraction,
) {
  const boundedDepthFraction = clamp(depthFraction);
  const mobileTotal = simulation.materialComponentMobile[index];
  const mobileResidual = simulation.materialComponentMobileResidual[index];

  // Canonical state is total plus secondary residual:
  //   P = (1 - f0)T - R, S = f0T + R.
  // Applying the same bounded donor fraction to T and R preserves both species
  // and makes the depth transfer equal/opposite without a post-hoc clamp.
  const depthTotal = mobileTotal * boundedDepthFraction;
  const depthResidual = mobileResidual * boundedDepthFraction;
  simulation.nextMaterialComponentMobile[index] = mobileTotal - depthTotal;
  simulation.nextMaterialComponentMobileResidual[index] = mobileResidual === 0
    ? 0
    : mobileResidual - depthResidual;
  if (simulation.materialComponentSubsurface !== null) {
    simulation.materialComponentSubsurface[index] += depthTotal;
    if (mobileResidual !== 0) {
      simulation.materialComponentSubsurfaceResidual[index] += depthResidual;
    }
  }
}

function forEachInteriorFace(
  simulation,
  horizontalWaterCoefficient,
  verticalWaterCoefficient,
  roughness,
  visit,
) {
  for (let y = 1; y < simulation.height - 1; y += 1) {
    for (let x = 1; x < simulation.width - 1; x += 1) {
      const index = y * simulation.width + x;
      if (x + 1 < simulation.width - 1) {
        const neighbor = index + 1;
        const factorA = 1 - roughness * 0.28
          + Math.abs(simulation.fiberX[index]) * 0.7 * roughness;
        const factorB = 1 - roughness * 0.28
          + Math.abs(simulation.fiberX[neighbor]) * 0.7 * roughness;
        visit(
          index,
          neighbor,
          horizontalWaterCoefficient * (factorA + factorB) * 0.5,
        );
      }
      if (y + 1 < simulation.height - 1) {
        const neighbor = index + simulation.width;
        const factorA = 1 - roughness * 0.28
          + Math.abs(simulation.fiberY[index]) * 0.7 * roughness;
        const factorB = 1 - roughness * 0.28
          + Math.abs(simulation.fiberY[neighbor]) * 0.7 * roughness;
        visit(
          index,
          neighbor,
          verticalWaterCoefficient * (factorA + factorB) * 0.5,
        );
      }
    }
  }
}

function donorScale(available, outgoing) {
  if (!(outgoing > available) || !(outgoing > 0)) return 1;
  // Bias the limiter inward by four machine epsilons. This is part of the
  // bounded donor transfer, not a post-hoc clamp, and prevents summation order
  // from making a fully drained donor microscopically negative.
  return (available / outgoing) * (1 - Number.EPSILON * 4);
}

function resolveLimitedWaterFlux(
  simulation,
  outgoingWater,
  first,
  second,
  faceCoefficient,
) {
  const raw = faceCoefficient
    * (simulation.water[first] - simulation.water[second]);
  if (raw === 0) return 0;
  const donor = raw > 0 ? first : second;
  return raw * donorScale(
    simulation.water[donor],
    outgoingWater[donor],
  );
}

function resolveDyeFaceFlux(
  simulation,
  recipe,
  frame,
  outgoingWater,
  first,
  second,
  faceCoefficient,
) {
  const waterFirst = simulation.water[first];
  const waterSecond = simulation.water[second];
  const totalFirst = simulation.materialComponentMobile[first];
  const totalSecond = simulation.materialComponentMobile[second];
  const residualFirst = simulation.materialComponentMobileResidual[first];
  const residualSecond = simulation.materialComponentMobileResidual[second];
  const concentrationTotalFirst = totalFirst
    / Math.max(waterFirst, DYE_WATER_EPSILON);
  const concentrationTotalSecond = totalSecond
    / Math.max(waterSecond, DYE_WATER_EPSILON);
  const concentrationResidualFirst = residualFirst
    / Math.max(waterFirst, DYE_WATER_EPSILON);
  const concentrationResidualSecond = residualSecond
    / Math.max(waterSecond, DYE_WATER_EPSILON);
  const waterFlux = resolveLimitedWaterFlux(
    simulation,
    outgoingWater,
    first,
    second,
    faceCoefficient,
  );
  const upwindTotal = waterFlux >= 0
    ? concentrationTotalFirst
    : concentrationTotalSecond;
  const upwindResidual = waterFlux >= 0
    ? concentrationResidualFirst
    : concentrationResidualSecond;
  const gradientTotal = concentrationTotalFirst - concentrationTotalSecond;
  const gradientResidual =
    concentrationResidualFirst - concentrationResidualSecond;
  const harmonicWetness = waterFirst > 0 && waterSecond > 0
    ? (2 * waterFirst * waterSecond) / (waterFirst + waterSecond)
    : 0;
  // A7-2 treats this as an aqueous molecular/dispersion pilot. Paper fibre
  // anisotropy belongs to the shared water flux above; applying the face
  // factor again here would double-count the current paper hypothesis.
  const fraction = recipe.initialSecondaryFraction;
  const primaryShare = 1 - fraction;
  const primaryDiffusivity = recipe.primaryDiffusivity * frame;
  const secondaryDiffusivity = recipe.secondaryDiffusivity * frame;
  const totalDiffusion = harmonicWetness * (
    (primaryShare * primaryDiffusivity
      + fraction * secondaryDiffusivity) * gradientTotal
    + (secondaryDiffusivity - primaryDiffusivity) * gradientResidual
  );
  const residualDiffusion = harmonicWetness * (
    fraction * primaryShare
      * (secondaryDiffusivity - primaryDiffusivity) * gradientTotal
    + (primaryShare * secondaryDiffusivity
      + fraction * primaryDiffusivity) * gradientResidual
  );
  const totalFlux = waterFlux * upwindTotal + totalDiffusion;
  const residualFlux = waterFlux * upwindResidual + residualDiffusion;
  return {
    primary: primaryShare * totalFlux - residualFlux,
    secondary: fraction * totalFlux + residualFlux,
  };
}

function getDyeTransportScratch(simulation) {
  if (simulation.dyeTransportScratch === null) {
    simulation.dyeTransportScratch = {
      outgoingWater: new Float64Array(simulation.length),
      outgoingPrimary: new Float64Array(simulation.length),
      outgoingSecondary: new Float64Array(simulation.length),
      primaryDelta: new Float64Array(simulation.length),
      secondaryDelta: new Float64Array(simulation.length),
    };
  }
  for (const plane of Object.values(simulation.dyeTransportScratch)) {
    plane.fill(0);
  }
  return simulation.dyeTransportScratch;
}

function transportNeutralTotalWithSharedWaterFlux(
  simulation,
  recipe,
  frame,
  outgoingWater,
  horizontalWaterCoefficient,
  verticalWaterCoefficient,
  roughness,
  scratch,
) {
  const outgoingTotal = scratch.outgoingPrimary;
  const totalDelta = scratch.primaryDelta;
  const resolveTotalFlux = (first, second, faceCoefficient) => {
    const waterFirst = simulation.water[first];
    const waterSecond = simulation.water[second];
    const concentrationFirst = simulation.materialComponentMobile[first]
      / Math.max(waterFirst, DYE_WATER_EPSILON);
    const concentrationSecond = simulation.materialComponentMobile[second]
      / Math.max(waterSecond, DYE_WATER_EPSILON);
    const waterFlux = resolveLimitedWaterFlux(
      simulation,
      outgoingWater,
      first,
      second,
      faceCoefficient,
    );
    const upwind = waterFlux >= 0
      ? concentrationFirst
      : concentrationSecond;
    const harmonicWetness = waterFirst > 0 && waterSecond > 0
      ? (2 * waterFirst * waterSecond) / (waterFirst + waterSecond)
      : 0;
    return waterFlux * upwind
      + harmonicWetness * recipe.primaryDiffusivity * frame
        * (concentrationFirst - concentrationSecond);
  };
  forEachInteriorFace(
    simulation,
    horizontalWaterCoefficient,
    verticalWaterCoefficient,
    roughness,
    (first, second, faceCoefficient) => {
      const flux = resolveTotalFlux(first, second, faceCoefficient);
      if (flux > 0) outgoingTotal[first] += flux;
      else outgoingTotal[second] -= flux;
    },
  );
  forEachInteriorFace(
    simulation,
    horizontalWaterCoefficient,
    verticalWaterCoefficient,
    roughness,
    (first, second, faceCoefficient) => {
      const flux = resolveTotalFlux(first, second, faceCoefficient);
      const donor = flux > 0 ? first : second;
      const limited = flux * donorScale(
        simulation.materialComponentMobile[donor],
        outgoingTotal[donor],
      );
      totalDelta[first] -= limited;
      totalDelta[second] += limited;
    },
  );
  for (let index = 0; index < simulation.length; index += 1) {
    simulation.materialComponentMobile[index] += totalDelta[index];
    simulation.materialComponentMobileResidual[index] = 0;
  }
}

function transportDyeWithSharedWaterFlux(
  simulation,
  recipe,
  frame,
  horizontalWaterCoefficient,
  verticalWaterCoefficient,
  roughness,
) {
  if (simulation.materialComponentKind !== "dye") return;
  const scratch = getDyeTransportScratch(simulation);
  const outgoingWater = scratch.outgoingWater;
  forEachInteriorFace(
    simulation,
    horizontalWaterCoefficient,
    verticalWaterCoefficient,
    roughness,
    (first, second, faceCoefficient) => {
      const raw = faceCoefficient
        * (simulation.water[first] - simulation.water[second]);
      if (raw > 0) outgoingWater[first] += raw;
      else outgoingWater[second] -= raw;
    },
  );

  if (
    recipe.primaryDiffusivity === recipe.secondaryDiffusivity
    && isExactZeroPlane(simulation.materialComponentMobileResidual)
  ) {
    transportNeutralTotalWithSharedWaterFlux(
      simulation,
      recipe,
      frame,
      outgoingWater,
      horizontalWaterCoefficient,
      verticalWaterCoefficient,
      roughness,
      scratch,
    );
    return;
  }

  const fraction = recipe.initialSecondaryFraction;
  const primaryShare = 1 - fraction;
  const outgoingPrimary = scratch.outgoingPrimary;
  const outgoingSecondary = scratch.outgoingSecondary;
  const primaryDelta = scratch.primaryDelta;
  const secondaryDelta = scratch.secondaryDelta;
  forEachInteriorFace(
    simulation,
    horizontalWaterCoefficient,
    verticalWaterCoefficient,
    roughness,
    (first, second, faceCoefficient) => {
      const flux = resolveDyeFaceFlux(
        simulation,
        recipe,
        frame,
        outgoingWater,
        first,
        second,
        faceCoefficient,
      );
      if (flux.primary > 0) outgoingPrimary[first] += flux.primary;
      else outgoingPrimary[second] -= flux.primary;
      if (flux.secondary > 0) outgoingSecondary[first] += flux.secondary;
      else outgoingSecondary[second] -= flux.secondary;
    },
  );
  forEachInteriorFace(
    simulation,
    horizontalWaterCoefficient,
    verticalWaterCoefficient,
    roughness,
    (first, second, faceCoefficient) => {
      const flux = resolveDyeFaceFlux(
        simulation,
        recipe,
        frame,
        outgoingWater,
        first,
        second,
        faceCoefficient,
      );
      const primaryDonor = flux.primary > 0 ? first : second;
      const secondaryDonor = flux.secondary > 0 ? first : second;
      const primaryAvailable = primaryShare
        * simulation.materialComponentMobile[primaryDonor]
        - simulation.materialComponentMobileResidual[primaryDonor];
      const secondaryAvailable = fraction
        * simulation.materialComponentMobile[secondaryDonor]
        + simulation.materialComponentMobileResidual[secondaryDonor];
      const primaryFlux = flux.primary * donorScale(
        primaryAvailable,
        outgoingPrimary[primaryDonor],
      );
      const secondaryFlux = flux.secondary * donorScale(
        secondaryAvailable,
        outgoingSecondary[secondaryDonor],
      );
      primaryDelta[first] -= primaryFlux;
      primaryDelta[second] += primaryFlux;
      secondaryDelta[first] -= secondaryFlux;
      secondaryDelta[second] += secondaryFlux;
    },
  );
  for (let index = 0; index < simulation.length; index += 1) {
    const total = simulation.materialComponentMobile[index];
    const residual = simulation.materialComponentMobileResidual[index];
    const primary = primaryShare * total - residual + primaryDelta[index];
    const secondary = fraction * total + residual + secondaryDelta[index];
    const nextTotal = primary + secondary;
    simulation.materialComponentMobile[index] = nextTotal;
    simulation.materialComponentMobileResidual[index] =
      secondary - fraction * nextTotal;
  }
}

function resolveLinearMobileAdsorbed(
  mobile,
  adsorbed,
  adsorptionRate,
  desorptionRate,
  frame,
) {
  const rate = adsorptionRate + desorptionRate;
  if (!(rate > 0)) return { mobile, adsorbed };
  const total = mobile + adsorbed;
  const reactionFraction = 1 - Math.exp(-rate * frame);
  const mobileEquilibriumShare = desorptionRate / rate;
  const nextMobile = mobile * (1 - reactionFraction)
    + total * mobileEquilibriumShare * reactionFraction;
  return {
    mobile: nextMobile,
    adsorbed: total - nextMobile,
  };
}

function reconstructNonnegativeDyeSpecies(total, residual, fraction) {
  const boundedTotal = Math.max(0, total);
  const secondary = clamp(
    fraction * boundedTotal + residual,
    0,
    boundedTotal,
  );
  return {
    primary: boundedTotal - secondary,
    secondary,
  };
}

function storeCanonicalDyeSpecies(
  totalPlane,
  residualPlane,
  index,
  primary,
  secondary,
  fraction,
) {
  const boundedPrimary = Math.max(0, primary);
  const boundedSecondary = Math.max(0, secondary);
  const total = boundedPrimary + boundedSecondary;
  if (!(total > 0)) {
    totalPlane[index] = 0;
    residualPlane[index] = 0;
    return;
  }
  const storedTotal = Math.fround(total);
  if (
    (fraction === 0 && boundedSecondary === 0)
    || (fraction === 1 && boundedPrimary === 0)
  ) {
    totalPlane[index] = storedTotal;
    residualPlane[index] = 0;
    return;
  }
  let storedResidual = Math.fround(
    boundedSecondary - fraction * storedTotal,
  );
  // T and R are stored in separate Float32 planes. Nudge only an endpoint
  // rounding violation inward so P=(1-f0)T-R and S=f0T+R cannot reconstruct
  // negative even when one species is almost exhausted.
  const inward = Math.max(
    Math.abs(storedTotal) * 2 ** -24,
    2 ** -149,
  );
  if (fraction * storedTotal + storedResidual < 0) {
    storedResidual = Math.fround(storedResidual + inward);
  }
  if ((1 - fraction) * storedTotal - storedResidual < 0) {
    storedResidual = Math.fround(storedResidual - inward);
  }
  totalPlane[index] = storedTotal;
  residualPlane[index] = storedResidual === 0 ? 0 : storedResidual;
}

function analyticDesorbedMass(adsorbed, rate, wetness, frame) {
  if (!(adsorbed > 0) || !(rate > 0) || !(wetness > 0)) return 0;
  return Math.min(
    adsorbed,
    adsorbed * -Math.expm1(-rate * wetness * frame),
  );
}

function adsorptionOpportunity(
  mobile,
  rate,
  dyeAffinity,
  paperTooth,
  vacancyFraction,
  frame,
) {
  if (!(mobile > 0) || !(rate > 0) || !(vacancyFraction > 0)) return 0;
  return Math.min(
    mobile,
    mobile * -Math.expm1(
      -rate * dyeAffinity * paperTooth * vacancyFraction * frame,
    ),
  );
}

function reactDyeMobileAdsorbedSharedCapacity(
  simulation,
  recipe,
  frame,
  dyeAffinity,
  roughness,
) {
  const capacity = recipe.sharedAdsorptionCapacity;
  const fraction = recipe.initialSecondaryFraction;
  const exactNeutralRates =
    recipe.primaryAdsorptionRate === recipe.secondaryAdsorptionRate
    && recipe.primaryDesorptionRate === recipe.secondaryDesorptionRate
    && isExactZeroPlane(simulation.nextMaterialComponentMobileResidual)
    && isExactZeroPlane(simulation.materialComponentFixedResidual);

  for (let y = 1; y < simulation.height - 1; y += 1) {
    for (let x = 1; x < simulation.width - 1; x += 1) {
      const index = y * simulation.width + x;
      const paperTooth = 1 - roughness * 0.28
        + coordinateNoise(x, y, simulation.seed ^ 0xa511e9b3)
          * 0.56 * roughness;
      const wetness = clamp(simulation.nextWater[index], 0, 1);

      // Equal coefficients and an exact neutral input are evolved as one
      // total species. This avoids two independently rounded species paths and
      // keeps every canonical residual bitwise +0.
      if (exactNeutralRates) {
        const mobile = Math.max(
          0,
          simulation.nextMaterialComponentMobile[index],
        );
        const adsorbed = Math.max(
          0,
          simulation.materialComponentFixed[index],
        );
        const desorbed = analyticDesorbedMass(
          adsorbed,
          recipe.primaryDesorptionRate,
          wetness,
          frame,
        );
        const mobileAfterDesorption = mobile + desorbed;
        const adsorbedAfterDesorption = adsorbed - desorbed;
        const vacancy = Math.max(
          0,
          capacity - adsorbedAfterDesorption,
        );
        const opportunity = adsorptionOpportunity(
          mobileAfterDesorption,
          recipe.primaryAdsorptionRate,
          dyeAffinity,
          paperTooth,
          vacancy / capacity,
          frame,
        );
        const adsorbedNow = Math.min(opportunity, vacancy);
        simulation.nextMaterialComponentMobile[index] =
          mobileAfterDesorption - adsorbedNow;
        simulation.materialComponentFixed[index] =
          adsorbedAfterDesorption + adsorbedNow;
        simulation.nextMaterialComponentMobileResidual[index] = 0;
        simulation.materialComponentFixedResidual[index] = 0;
        continue;
      }

      const mobile = reconstructNonnegativeDyeSpecies(
        simulation.nextMaterialComponentMobile[index],
        simulation.nextMaterialComponentMobileResidual[index],
        fraction,
      );
      const adsorbed = reconstructNonnegativeDyeSpecies(
        simulation.materialComponentFixed[index],
        simulation.materialComponentFixedResidual[index],
        fraction,
      );

      // Desorption is solved analytically before either species sees the one
      // shared vacancy pool.
      const primaryDesorbed = analyticDesorbedMass(
        adsorbed.primary,
        recipe.primaryDesorptionRate,
        wetness,
        frame,
      );
      const secondaryDesorbed = analyticDesorbedMass(
        adsorbed.secondary,
        recipe.secondaryDesorptionRate,
        wetness,
        frame,
      );
      const primaryMobile = mobile.primary + primaryDesorbed;
      const secondaryMobile = mobile.secondary + secondaryDesorbed;
      const primaryAdsorbed = adsorbed.primary - primaryDesorbed;
      const secondaryAdsorbed = adsorbed.secondary - secondaryDesorbed;
      const vacancy = Math.max(
        0,
        capacity - primaryAdsorbed - secondaryAdsorbed,
      );
      const vacancyFraction = vacancy / capacity;
      const primaryOpportunity = adsorptionOpportunity(
        primaryMobile,
        recipe.primaryAdsorptionRate,
        dyeAffinity,
        paperTooth,
        vacancyFraction,
        frame,
      );
      const secondaryOpportunity = adsorptionOpportunity(
        secondaryMobile,
        recipe.secondaryAdsorptionRate,
        dyeAffinity,
        paperTooth,
        vacancyFraction,
        frame,
      );
      const totalOpportunity = primaryOpportunity + secondaryOpportunity;
      const lambda = totalOpportunity > vacancy && totalOpportunity > 0
        ? vacancy / totalOpportunity
        : 1;
      const primaryAdsorbedNow = primaryOpportunity * lambda;
      const secondaryAdsorbedNow = secondaryOpportunity * lambda;

      storeCanonicalDyeSpecies(
        simulation.nextMaterialComponentMobile,
        simulation.nextMaterialComponentMobileResidual,
        index,
        primaryMobile - primaryAdsorbedNow,
        secondaryMobile - secondaryAdsorbedNow,
        fraction,
      );
      storeCanonicalDyeSpecies(
        simulation.materialComponentFixed,
        simulation.materialComponentFixedResidual,
        index,
        primaryAdsorbed + primaryAdsorbedNow,
        secondaryAdsorbed + secondaryAdsorbedNow,
        fraction,
      );
    }
  }
}

function reactDyeMobileAdsorbed(
  simulation,
  recipe,
  frame,
  dyeAffinity,
  roughness,
) {
  if (simulation.materialComponentKind !== "dye") return;
  if (recipe.componentRecipeSchemaVersion === 13) {
    reactDyeMobileAdsorbedSharedCapacity(
      simulation,
      recipe,
      frame,
      dyeAffinity,
      roughness,
    );
    return;
  }
  const exactNeutralRates =
    recipe.primaryAdsorptionRate === recipe.secondaryAdsorptionRate
    && recipe.primaryDesorptionRate === recipe.secondaryDesorptionRate
    && isExactZeroPlane(simulation.nextMaterialComponentMobileResidual)
    && isExactZeroPlane(simulation.materialComponentFixedResidual);
  const fraction = recipe.initialSecondaryFraction;
  const primaryShare = 1 - fraction;
  for (let y = 1; y < simulation.height - 1; y += 1) {
    for (let x = 1; x < simulation.width - 1; x += 1) {
      const index = y * simulation.width + x;
      const paperTooth = 1 - roughness * 0.28
        + coordinateNoise(x, y, simulation.seed ^ 0xa511e9b3)
          * 0.56 * roughness;
      const wetness = clamp(simulation.nextWater[index], 0, 1);
      const primaryAdsorptionRate = recipe.primaryAdsorptionRate
        * dyeAffinity * paperTooth;
      const secondaryAdsorptionRate = recipe.secondaryAdsorptionRate
        * dyeAffinity * paperTooth;
      const primaryDesorptionRate = recipe.primaryDesorptionRate * wetness;
      const secondaryDesorptionRate = recipe.secondaryDesorptionRate * wetness;
      if (exactNeutralRates) {
        const neutral = resolveLinearMobileAdsorbed(
          simulation.nextMaterialComponentMobile[index],
          simulation.materialComponentFixed[index],
          primaryAdsorptionRate,
          primaryDesorptionRate,
          frame,
        );
        simulation.nextMaterialComponentMobile[index] = neutral.mobile;
        simulation.materialComponentFixed[index] = neutral.adsorbed;
        simulation.nextMaterialComponentMobileResidual[index] = 0;
        simulation.materialComponentFixedResidual[index] = 0;
        continue;
      }
      const mobileTotal = simulation.nextMaterialComponentMobile[index];
      const mobileResidual =
        simulation.nextMaterialComponentMobileResidual[index];
      const adsorbedTotal = simulation.materialComponentFixed[index];
      const adsorbedResidual = simulation.materialComponentFixedResidual[index];
      const primary = resolveLinearMobileAdsorbed(
        primaryShare * mobileTotal - mobileResidual,
        primaryShare * adsorbedTotal - adsorbedResidual,
        primaryAdsorptionRate,
        primaryDesorptionRate,
        frame,
      );
      const secondary = resolveLinearMobileAdsorbed(
        fraction * mobileTotal + mobileResidual,
        fraction * adsorbedTotal + adsorbedResidual,
        secondaryAdsorptionRate,
        secondaryDesorptionRate,
        frame,
      );
      const nextMobileTotal = primary.mobile + secondary.mobile;
      const nextAdsorbedTotal = primary.adsorbed + secondary.adsorbed;
      simulation.nextMaterialComponentMobile[index] = nextMobileTotal;
      simulation.nextMaterialComponentMobileResidual[index] =
        secondary.mobile - fraction * nextMobileTotal;
      simulation.materialComponentFixed[index] = nextAdsorbedTotal;
      simulation.materialComponentFixedResidual[index] =
        secondary.adsorbed - fraction * nextAdsorbedTotal;
    }
  }
}

function assertSeed(value, path) {
  return assertUint32(value, path);
}

function readOptionalOwnDataProperty(value, name, path) {
  if (value === null || typeof value !== "object") return undefined;
  const descriptor = Object.getOwnPropertyDescriptor(value, name);
  if (descriptor === undefined) {
    if (name in value) {
      throw new TypeError(`${path} must be an own property.`);
    }
    return undefined;
  }
  if (!descriptor.enumerable || !("value" in descriptor)) {
    throw new TypeError(`${path} must be an enumerable own data property.`);
  }
  return descriptor.value;
}

/**
 * Deterministic water/mobile-pigment/fixed-pigment grid from the accepted HTML
 * direct-input study. The formulas are intentionally unchanged in extraction.
 */
export class WetInkSimulation {
  constructor(width, height, seed) {
    assertSeed(seed, "seed");
    this.width = width;
    this.height = height;
    this.seed = seed;
    this.length = width * height;
    this.water = new Float32Array(this.length);
    this.mobile = new Float32Array(this.length);
    this.fixed = new Float32Array(this.length);
    this.nextWater = new Float32Array(this.length);
    this.nextMobile = new Float32Array(this.length);
    this.fiberX = new Float32Array(this.length);
    this.fiberY = new Float32Array(this.length);
    // Keyboard-only signed density mass. Direct writing never allocates these
    // planes, preserving its existing state, arithmetic, and memory path.
    this.mobileSignedMass = null;
    this.fixedSignedMass = null;
    this.nextMobileSignedMass = null;
    // R2 paper-depth state is allocated only for an explicit depth-uptake
    // Surface. Legacy R1 surfaces and the scalar direct-input compatibility
    // path keep their exact seven-plane allocation and arithmetic.
    this.subsurfacePigment = null;
    this.subsurfaceSignedMass = null;
    // One optional transported P5 material component. These planes are absent
    // from ordinary/direct paths. Dye and pigment reuse the same slot because
    // A1 workbench modes are exclusive; public state snapshots stay distinct.
    this.materialComponentRecipe = null;
    // A validated canonical snapshot makes a simulation's component choice
    // sticky across deposits. The caller may pass an equivalent recipe object,
    // but cannot retune an existing identity or omit the dye partition later.
    this.materialComponentRecipeCanonical = null;
    this.materialComponentKind = null;
    this.materialComponentMobile = null;
    this.materialComponentFixed = null;
    this.nextMaterialComponentMobile = null;
    this.materialComponentSubsurface = null;
    // A7 dye-only signed residual planes. Pigment keeps the earlier four-plane
    // slot exactly and never allocates these arrays.
    this.materialComponentMobileResidual = null;
    this.materialComponentFixedResidual = null;
    this.nextMaterialComponentMobileResidual = null;
    this.materialComponentSubsurfaceResidual = null;
    // Lazy A7-only cell accumulators. They are reused per step and never
    // exposed as a public or retained face-flux plane. Component-off stays null.
    this.dyeTransportScratch = null;
    this.activity = 0;
    this.makeFiberField();
  }

  makeFiberField() {
    for (let y = 0; y < this.height; y += 1) {
      for (let x = 0; x < this.width; x += 1) {
        const index = y * this.width + x;
        const broad = coordinateNoise(
          Math.floor(x / 17),
          Math.floor(y / 13),
          this.seed,
        );
        const tooth = coordinateNoise(x, y, this.seed ^ 0x9e3779b9);
        const angle = (broad * 0.72 + tooth * 0.28 - 0.5) * Math.PI;
        this.fiberX[index] = Math.cos(angle);
        this.fiberY[index] = Math.sin(angle);
      }
    }
  }

  clear() {
    this.water.fill(0);
    this.mobile.fill(0);
    this.fixed.fill(0);
    this.nextWater.fill(0);
    this.nextMobile.fill(0);
    this.mobileSignedMass?.fill(0);
    this.fixedSignedMass?.fill(0);
    this.nextMobileSignedMass?.fill(0);
    this.subsurfacePigment?.fill(0);
    this.subsurfaceSignedMass?.fill(0);
    this.materialComponentMobile?.fill(0);
    this.materialComponentFixed?.fill(0);
    this.nextMaterialComponentMobile?.fill(0);
    this.materialComponentSubsurface?.fill(0);
    this.materialComponentMobileResidual?.fill(0);
    this.materialComponentFixedResidual?.fill(0);
    this.nextMaterialComponentMobileResidual?.fill(0);
    this.materialComponentSubsurfaceResidual?.fill(0);
    if (this.dyeTransportScratch !== null) {
      for (const plane of Object.values(this.dyeTransportScratch)) plane.fill(0);
    }
    this.activity = 0;
  }

  depositMask(imageData, options) {
    assertSeed(options?.seed, "options.seed");
    if (imageData.width !== this.width || imageData.height !== this.height) {
      throw new Error("Mask dimensions must match the simulation grid.");
    }
    const densityTransportValue = readOptionalOwnDataProperty(
      options,
      "densityTransport",
      "options.densityTransport",
    );
    const densityTransport = densityTransportValue === undefined
      ? null
      : assertSurfaceDensityTransportGrid(
        densityTransportValue,
        "options.densityTransport",
      );
    if (
      densityTransport !== null
      && (
        densityTransport.width !== this.width
        || densityTransport.height !== this.height
      )
    ) {
      throw new TypeError(
        "options.densityTransport dimensions must match the simulation grid.",
      );
    }
    const dyeComponentRecipe = readOptionalOwnDataProperty(
      options,
      "dyeComponentRecipe",
      "options.dyeComponentRecipe",
    ) ?? null;
    const pigmentComponentRecipe = readOptionalOwnDataProperty(
      options,
      "pigmentComponentRecipe",
      "options.pigmentComponentRecipe",
    ) ?? null;
    const keyboardDyeArealLoadValue = readOptionalOwnDataProperty(
      options,
      "keyboardDyeArealLoad",
      "options.keyboardDyeArealLoad",
    );
    const keyboardDyeArealLoad = keyboardDyeArealLoadValue === undefined
      ? null
      : assertKeyboardDyeArealLoad(
        keyboardDyeArealLoadValue,
        "options.keyboardDyeArealLoad",
      );
    if (dyeComponentRecipe !== null && pigmentComponentRecipe !== null) {
      throw new TypeError(
        "Only one transported dye or pigment component may be active per solve.",
      );
    }
    if (dyeComponentRecipe !== null) {
      assertDyeComponentRecipeCompatible(dyeComponentRecipe);
    }
    if (pigmentComponentRecipe !== null) {
      assertPigmentComponentRecipeCompatible(pigmentComponentRecipe);
    }
    const r16ArealLoadRequired = dyeComponentRecipe !== null
      && dyeComponentRecipe.componentRecipeSchemaVersion === 14;
    if (r16ArealLoadRequired && keyboardDyeArealLoad === null) {
      throw new TypeError(
        "options.keyboardDyeArealLoad is required for a schema 14 dye component.",
      );
    }
    if (!r16ArealLoadRequired && keyboardDyeArealLoad !== null) {
      throw new TypeError(
        "options.keyboardDyeArealLoad is only valid for a schema 14 dye component.",
      );
    }
    if (
      keyboardDyeArealLoad !== null
      && (
        keyboardDyeArealLoad.width !== this.width
        || keyboardDyeArealLoad.height !== this.height
      )
    ) {
      throw new TypeError(
        "options.keyboardDyeArealLoad dimensions must match the simulation grid.",
      );
    }
    const materialComponentRecipe = dyeComponentRecipe ?? pigmentComponentRecipe;
    const materialComponentKind = dyeComponentRecipe !== null
      ? "dye"
      : pigmentComponentRecipe !== null
        ? "pigment"
        : null;
    const dyeComponentRecipeCanonical = dyeComponentRecipe === null
      ? null
      : serializeDyeComponentRecipe(dyeComponentRecipe);
    if (this.materialComponentKind === "dye") {
      if (dyeComponentRecipeCanonical === null) {
        throw new TypeError(
          "Every deposit after dye activation requires the same canonical dye component recipe.",
        );
      }
      if (
        dyeComponentRecipeCanonical !== this.materialComponentRecipeCanonical
      ) {
        throw new TypeError(
          "A WetInkSimulation cannot mix different canonical dye component recipes.",
        );
      }
    }
    if (materialComponentRecipe !== null) {
      if (
        this.materialComponentRecipe !== null
        && (
          this.materialComponentKind !== materialComponentKind
          || this.materialComponentRecipe.id !== materialComponentRecipe.id
          || this.materialComponentRecipe.revision !== materialComponentRecipe.revision
        )
      ) {
        throw new TypeError(
          "A WetInkSimulation cannot mix different material component recipes.",
        );
      }
    }
    // Allocate only after the complete payload has been validated and before
    // the first scalar deposit mutation.
    if (densityTransport !== null && this.mobileSignedMass === null) {
      this.mobileSignedMass = new Float32Array(this.length);
      this.fixedSignedMass = new Float32Array(this.length);
      this.nextMobileSignedMass = new Float32Array(this.length);
    }
    if (materialComponentRecipe !== null && this.materialComponentMobile === null) {
      this.materialComponentKind = materialComponentKind;
      this.materialComponentRecipe = materialComponentKind === "dye"
        ? Object.freeze({ ...materialComponentRecipe })
        : materialComponentRecipe;
      this.materialComponentRecipeCanonical = dyeComponentRecipeCanonical;
      this.materialComponentMobile = new Float32Array(this.length);
      this.materialComponentFixed = new Float32Array(this.length);
      this.nextMaterialComponentMobile = new Float32Array(this.length);
      if (materialComponentKind === "dye") {
        this.materialComponentMobileResidual = new Float32Array(this.length);
        this.materialComponentFixedResidual = new Float32Array(this.length);
        this.nextMaterialComponentMobileResidual = new Float32Array(this.length);
      }
    }

    if (keyboardDyeArealLoad !== null) {
      for (let y = 0; y < this.height; y += 1) {
        for (let x = 0; x < this.width; x += 1) {
          const index = y * this.width + x;
          const arealLoad = keyboardDyeArealLoad.data[index];
          if (!(arealLoad > 0)) continue;
          const broad = coordinateNoise(
            Math.floor(x / 9),
            Math.floor(y / 8),
            this.seed ^ options.seed,
          );
          const tooth = coordinateNoise(
            x,
            y,
            this.seed ^ options.seed ^ 0x85ebca6b,
          );
          const contact = 0.82 + broad * 0.28 + (tooth - 0.5) * 0.12;
          this.water[index] = clamp(
            this.water[index] + arealLoad * options.waterLoad * contact,
            0,
            1.4,
          );
          const previousMobile = this.mobile[index];
          const nextMobile = clamp(
            previousMobile + arealLoad * options.pigmentLoad * contact,
            0,
            1.8,
          );
          this.mobile[index] = nextMobile;
          if (densityTransport !== null) {
            const carrier = densityTransport.pigmentWeight[index];
            const ratio = carrier > 0
              ? clamp(densityTransport.signedNumerator[index] / carrier, -1, 1)
              : 0;
            const nextSigned = this.mobileSignedMass[index]
              + (nextMobile - previousMobile) * ratio;
            this.mobileSignedMass[index] = clamp(
              nextSigned,
              -nextMobile,
              nextMobile,
            );
          }
          // Schema 14 is dye-only by validation. Total deposited dye equals
          // the accepted ordinary base-mass delta; the authored f0 partition
          // adds exact +0 to the canonical secondary residual plane.
          this.materialComponentMobile[index] += nextMobile - previousMobile;
        }
      }
      this.activity = 1;
      return;
    }

    for (let y = 0; y < this.height; y += 1) {
      for (let x = 0; x < this.width; x += 1) {
        const index = y * this.width + x;
        const alpha = imageData.data[index * 4 + 3] / 255;
        if (alpha <= 0.002) continue;
        const broad = coordinateNoise(
          Math.floor(x / 9),
          Math.floor(y / 8),
          this.seed ^ options.seed,
        );
        const tooth = coordinateNoise(
          x,
          y,
          this.seed ^ options.seed ^ 0x85ebca6b,
        );
        const contact = 0.82 + broad * 0.28 + (tooth - 0.5) * 0.12;
        this.water[index] = clamp(
          this.water[index] + alpha * options.waterLoad * contact,
          0,
          1.4,
        );
        const previousMobile = this.mobile[index];
        if (densityTransport === null) {
          this.mobile[index] = clamp(
            previousMobile + alpha * options.pigmentLoad * contact,
            0,
            1.8,
          );
        } else {
          const nextMobile = clamp(
            previousMobile + alpha * options.pigmentLoad * contact,
            0,
            1.8,
          );
          this.mobile[index] = nextMobile;
          const carrier = densityTransport.pigmentWeight[index];
          const ratio = carrier > 0
            ? clamp(densityTransport.signedNumerator[index] / carrier, -1, 1)
            : 0;
          const nextSigned = this.mobileSignedMass[index]
            + (nextMobile - previousMobile) * ratio;
          this.mobileSignedMass[index] = clamp(
            nextSigned,
            -nextMobile,
            nextMobile,
          );
        }
        if (materialComponentRecipe !== null) {
          const depositedBaseMass = this.mobile[index] - previousMobile;
          if (materialComponentKind === "dye") {
            // This is a partition of the ordinary deposited dye, not extra
            // material. R=0 encodes the authored f0 well-mixed composition.
            this.materialComponentMobile[index] += depositedBaseMass;
          } else {
            this.materialComponentMobile[index] = clamp(
              this.materialComponentMobile[index]
                + depositedBaseMass * materialComponentRecipe.massFraction,
              0,
              1.8,
            );
          }
        }
      }
    }
    this.activity = 1;
  }

  depositStroke(from, to, options) {
    assertSeed(options?.strokeSeed, "options.strokeSeed");
    const distance = Math.hypot(to.x - from.x, to.y - from.y);
    const spacing = Math.max(0.55, options.radius * 0.22);
    const steps = Math.max(1, Math.ceil(distance / spacing));

    for (let step = 0; step <= steps; step += 1) {
      const progress = step / steps;
      const x = from.x + (to.x - from.x) * progress;
      const y = from.y + (to.y - from.y) * progress;
      this.depositDab(x, y, options);
    }
    this.activity = 1;
  }

  depositDab(centerX, centerY, options) {
    assertSeed(options?.strokeSeed, "options.strokeSeed");
    const nibAngle = options.nibAngle === undefined
      ? -Math.PI * 0.22
      : options.nibAngle;
    if (!Number.isFinite(nibAngle)) {
      throw new TypeError("options.nibAngle must be a finite number when provided.");
    }
    const cosine = Math.cos(nibAngle);
    const sine = Math.sin(nibAngle);
    const pressure = clamp(options.pressure, 0.08, 1);
    const major = options.radius * (0.72 + pressure * 0.72);
    const minor = major * options.aspect;
    const reach = Math.ceil(major + 2);
    const minimumX = Math.max(1, Math.floor(centerX - reach));
    const maximumX = Math.min(this.width - 2, Math.ceil(centerX + reach));
    const minimumY = Math.max(1, Math.floor(centerY - reach));
    const maximumY = Math.min(this.height - 2, Math.ceil(centerY + reach));

    for (let y = minimumY; y <= maximumY; y += 1) {
      for (let x = minimumX; x <= maximumX; x += 1) {
        const dx = x - centerX;
        const dy = y - centerY;
        const localX = dx * cosine + dy * sine;
        const localY = -dx * sine + dy * cosine;
        const normalized = (localX * localX) / (major * major)
          + (localY * localY) / (minor * minor);
        if (normalized > 1) continue;

        const index = y * this.width + x;
        const edge = Math.pow(1 - normalized, 0.38);
        const tooth = 0.82
          + coordinateNoise(x, y, this.seed ^ options.strokeSeed) * 0.26;
        const dwell = 0.7 + pressure * 0.74;
        const water = edge * tooth * options.waterLoad * dwell;
        const pigment = edge * tooth * options.pigmentLoad * dwell;
        this.water[index] = clamp(this.water[index] + water, 0, 1.4);
        this.mobile[index] = clamp(this.mobile[index] + pigment, 0, 1.8);
      }
    }
  }

  step(deltaMilliseconds, absorption) {
    assertFiniteRange(
      deltaMilliseconds,
      "deltaMilliseconds",
      0,
      Number.MAX_VALUE,
    );
    assertFiniteRange(absorption, "absorption", 0, 1);
    return this.#stepWithSurface(deltaMilliseconds, {
      verticalUptake: absorption,
      lateralMobility: absorption,
      dyeAffinity: absorption,
      roughness: 1,
    });
  }

  stepSurface(deltaMilliseconds, surfaceRecipe) {
    assertSurfaceRecipeCompatible(surfaceRecipe);
    if (surfaceRecipe.surfaceRecipeSchemaVersion >= 2) {
      return this.#stepDepthSurface(deltaMilliseconds, surfaceRecipe.axes);
    }
    return this.#stepWithSurface(deltaMilliseconds, surfaceRecipe.axes);
  }

  #stepDepthSurface(deltaMilliseconds, axes) {
    assertFiniteRange(
      deltaMilliseconds,
      "deltaMilliseconds",
      0,
      Number.MAX_VALUE,
    );
    const frame = clamp(deltaMilliseconds / 16.667, 0.25, 2.5);
    const depthUptake = clamp(axes.depthUptake);
    const lateralMobility = clamp(axes.lateralMobility);
    const dyeAffinity = clamp(axes.dyeAffinity);
    const roughness = clamp(axes.roughness);
    const horizontalDiffusion = (0.038 + lateralMobility * 0.102) * frame;
    const verticalDiffusion = (0.034 + lateralMobility * 0.088) * frame;
    const pigmentMobility = (0.008 + lateralMobility * 0.032) * frame;
    const evaporation = (0.0028 + depthUptake * 0.0032) * frame;
    if (this.subsurfacePigment === null) {
      this.subsurfacePigment = new Float32Array(this.length);
    }
    if (
      this.mobileSignedMass !== null
      && this.subsurfaceSignedMass === null
    ) {
      this.subsurfaceSignedMass = new Float32Array(this.length);
    }
    if (
      this.materialComponentMobile !== null
      && this.materialComponentSubsurface === null
    ) {
      this.materialComponentSubsurface = new Float32Array(this.length);
      if (this.materialComponentKind === "dye") {
        this.materialComponentSubsurfaceResidual = new Float32Array(this.length);
      }
    }
    transportDyeWithSharedWaterFlux(
      this,
      this.materialComponentRecipe,
      frame,
      horizontalDiffusion,
      verticalDiffusion,
      roughness,
    );
    prepareDyeNextMobile(this);
    let activeWater = 0;

    for (let y = 1; y < this.height - 1; y += 1) {
      for (let x = 1; x < this.width - 1; x += 1) {
        const index = y * this.width + x;
        const left = index - 1;
        const right = index + 1;
        const above = index - this.width;
        const below = index + this.width;
        const water = this.water[index];
        const mobile = this.mobile[index];
        const fiberHorizontal = 1 - roughness * 0.28
          + Math.abs(this.fiberX[index]) * 0.7 * roughness;
        const fiberVertical = 1 - roughness * 0.28
          + Math.abs(this.fiberY[index]) * 0.7 * roughness;
        const waterLaplacian =
          (this.water[left] + this.water[right] - water * 2)
            * horizontalDiffusion * fiberHorizontal
          + (this.water[above] + this.water[below] - water * 2)
            * verticalDiffusion * fiberVertical;
        const paperTooth = 1 - roughness * 0.28
          + coordinateNoise(x, y, this.seed ^ 0xa511e9b3)
            * 0.56 * roughness;
        const waterAfterSpread = clamp(water + waterLaplacian, 0, 1.4);
        const depthWaterSink = Math.min(
          waterAfterSpread,
          (0.002 + depthUptake * 0.009) * paperTooth * frame,
        );
        const nextWater = clamp(
          waterAfterSpread - depthWaterSink - evaporation,
          0,
          1.4,
        );

        const mobileLaplacian =
          (this.mobile[left] + this.mobile[right]
            + this.mobile[above] + this.mobile[below] - mobile * 4)
          * pigmentMobility * clamp(water * 1.35, 0, 1);
        const mobileAfterSpread = Math.max(0, mobile + mobileLaplacian);
        const depthFraction = clamp(
          depthUptake * 0.018 * paperTooth * frame,
          0,
          0.2,
        );
        const depthPigment = mobileAfterSpread * depthFraction;
        const surfaceMobile = Math.max(0, mobileAfterSpread - depthPigment);
        const edgeDryness = clamp(1 - nextWater * 1.15, 0, 1);
        const fixing = Math.min(
          surfaceMobile,
          (0.0035 + edgeDryness * 0.026 + dyeAffinity * 0.004)
            * paperTooth * frame,
        );
        const nextMobile = Math.max(0, surfaceMobile - fixing);
        const previousFixed = this.fixed[index];
        const nextFixed = clamp(previousFixed + fixing, 0, 2.1);
        const previousSubsurface = this.subsurfacePigment[index];
        const nextSubsurface = clamp(
          previousSubsurface + depthPigment,
          0,
          2.1,
        );

        this.nextWater[index] = nextWater;
        this.nextMobile[index] = nextMobile;
        this.fixed[index] = nextFixed;
        this.subsurfacePigment[index] = nextSubsurface;

        if (this.mobileSignedMass !== null) {
          const signedMobile = this.mobileSignedMass[index];
          const signedMobileLaplacian =
            (this.mobileSignedMass[left] + this.mobileSignedMass[right]
              + this.mobileSignedMass[above]
              + this.mobileSignedMass[below] - signedMobile * 4)
            * pigmentMobility * clamp(water * 1.35, 0, 1);
          const signedAfterSpread = clamp(
            signedMobile + signedMobileLaplacian,
            -mobileAfterSpread,
            mobileAfterSpread,
          );
          const signedDepth = signedAfterSpread * depthFraction;
          const signedSurface = signedAfterSpread - signedDepth;
          const removedFraction = surfaceMobile > 0
            ? clamp(fixing / surfaceMobile)
            : 0;
          const storedFixedFraction = surfaceMobile > 0
            ? clamp((nextFixed - previousFixed) / surfaceMobile)
            : 0;
          this.nextMobileSignedMass[index] = clamp(
            signedSurface * (1 - removedFraction),
            -nextMobile,
            nextMobile,
          );
          this.fixedSignedMass[index] = clamp(
            this.fixedSignedMass[index]
              + signedSurface * storedFixedFraction,
            -nextFixed,
            nextFixed,
          );
          this.subsurfaceSignedMass[index] = clamp(
            this.subsurfaceSignedMass[index] + signedDepth,
            -nextSubsurface,
            nextSubsurface,
          );
        }
        if (this.materialComponentKind === "dye") {
          const storedDepthFraction = mobileAfterSpread > 0
            ? (nextSubsurface - previousSubsurface) / mobileAfterSpread
            : 0;
          transferDyeMobileToDepth(
            this,
            index,
            storedDepthFraction,
          );
        } else if (this.materialComponentMobile !== null) {
          const componentMobile = this.materialComponentMobile[index];
          const componentMobility = pigmentMobility
            * this.materialComponentRecipe.mobilityMultiplier;
          const componentLaplacian = (
            this.materialComponentMobile[left]
              + this.materialComponentMobile[right]
              + this.materialComponentMobile[above]
              + this.materialComponentMobile[below]
              - componentMobile * 4
          ) * componentMobility * clamp(water * 1.35, 0, 1);
          const componentAfterSpread = Math.max(
            0,
            componentMobile + componentLaplacian,
          );
          const componentDepth = componentAfterSpread * depthFraction;
          const componentSurface = componentAfterSpread - componentDepth;
          const baseFixingFraction = surfaceMobile > 0
            ? clamp(fixing / surfaceMobile)
            : 0;
          const componentFixingFraction = clamp(
            baseFixingFraction
              * this.materialComponentRecipe.retentionMultiplier,
          );
          const componentFixing = componentSurface
            * componentFixingFraction;
          this.nextMaterialComponentMobile[index] = Math.max(
            0,
            componentSurface - componentFixing,
          );
          this.materialComponentFixed[index] = clamp(
            this.materialComponentFixed[index] + componentFixing,
            0,
            2.1,
          );
          this.materialComponentSubsurface[index] = clamp(
            this.materialComponentSubsurface[index] + componentDepth,
            0,
            2.1,
          );
        }
        activeWater += nextWater;
      }
    }

    reactDyeMobileAdsorbed(
      this,
      this.materialComponentRecipe,
      frame,
      dyeAffinity,
      roughness,
    );

    [this.water, this.nextWater] = [this.nextWater, this.water];
    [this.mobile, this.nextMobile] = [this.nextMobile, this.mobile];
    if (this.mobileSignedMass !== null) {
      [this.mobileSignedMass, this.nextMobileSignedMass] = [
        this.nextMobileSignedMass,
        this.mobileSignedMass,
      ];
    }
    if (this.materialComponentMobile !== null) {
      [this.materialComponentMobile, this.nextMaterialComponentMobile] = [
        this.nextMaterialComponentMobile,
        this.materialComponentMobile,
      ];
      if (this.materialComponentKind === "dye") {
        [
          this.materialComponentMobileResidual,
          this.nextMaterialComponentMobileResidual,
        ] = [
          this.nextMaterialComponentMobileResidual,
          this.materialComponentMobileResidual,
        ];
      }
    }
    this.nextWater.fill(0);
    this.nextMobile.fill(0);
    this.nextMobileSignedMass?.fill(0);
    this.nextMaterialComponentMobile?.fill(0);
    this.nextMaterialComponentMobileResidual?.fill(0);
    this.activity = activeWater / this.length;
  }

  #stepWithSurface(deltaMilliseconds, axes) {
    assertFiniteRange(
      deltaMilliseconds,
      "deltaMilliseconds",
      0,
      Number.MAX_VALUE,
    );
    const frame = clamp(deltaMilliseconds / 16.667, 0.25, 2.5);
    const verticalUptake = clamp(axes.verticalUptake);
    const lateralMobility = clamp(axes.lateralMobility);
    const dyeAffinity = clamp(axes.dyeAffinity);
    const roughness = clamp(axes.roughness);
    const horizontalDiffusion = (0.038 + lateralMobility * 0.102) * frame;
    const verticalDiffusion = (0.034 + verticalUptake * 0.088) * frame;
    const pigmentMobility = (0.008 + lateralMobility * 0.032) * frame;
    const evaporation = (0.0028 + verticalUptake * 0.0032) * frame;
    transportDyeWithSharedWaterFlux(
      this,
      this.materialComponentRecipe,
      frame,
      horizontalDiffusion,
      verticalDiffusion,
      roughness,
    );
    prepareDyeNextMobile(this);
    let activeWater = 0;

    for (let y = 1; y < this.height - 1; y += 1) {
      for (let x = 1; x < this.width - 1; x += 1) {
        const index = y * this.width + x;
        const left = index - 1;
        const right = index + 1;
        const above = index - this.width;
        const below = index + this.width;
        const water = this.water[index];
        const mobile = this.mobile[index];
        const fiberHorizontal = 1 - roughness * 0.28
          + Math.abs(this.fiberX[index]) * 0.7 * roughness;
        const fiberVertical = 1 - roughness * 0.28
          + Math.abs(this.fiberY[index]) * 0.7 * roughness;
        const waterLaplacian =
          (this.water[left] + this.water[right] - water * 2)
            * horizontalDiffusion * fiberHorizontal
          + (this.water[above] + this.water[below] - water * 2)
            * verticalDiffusion * fiberVertical;
        const nextWater = clamp(water + waterLaplacian - evaporation, 0, 1.4);

        const mobileLaplacian =
          (this.mobile[left] + this.mobile[right]
            + this.mobile[above] + this.mobile[below] - mobile * 4)
          * pigmentMobility * clamp(water * 1.35, 0, 1);
        const edgeDryness = clamp(1 - nextWater * 1.15, 0, 1);
        const paperTooth = 1 - roughness * 0.28
          + coordinateNoise(x, y, this.seed ^ 0xa511e9b3)
            * 0.56 * roughness;
        const fixing = Math.min(
          mobile + mobileLaplacian,
          (0.0035 + edgeDryness * 0.026 + dyeAffinity * 0.004)
            * paperTooth * frame,
        );
        this.nextWater[index] = nextWater;
        if (this.mobileSignedMass === null) {
          this.nextMobile[index] = Math.max(0, mobile + mobileLaplacian - fixing);
          this.fixed[index] = clamp(this.fixed[index] + fixing, 0, 2.1);
        } else {
          const signedMobile = this.mobileSignedMass[index];
          const signedMobileLaplacian =
            (this.mobileSignedMass[left] + this.mobileSignedMass[right]
              + this.mobileSignedMass[above] + this.mobileSignedMass[below]
              - signedMobile * 4)
            * pigmentMobility * clamp(water * 1.35, 0, 1);
          const mobileAfterDiffusion = mobile + mobileLaplacian;
          const mobileBeforeFixing = Math.max(0, mobileAfterDiffusion);
          const signedBeforeFixing = clamp(
            signedMobile + signedMobileLaplacian,
            -mobileBeforeFixing,
            mobileBeforeFixing,
          );
          const nextMobile = Math.max(0, mobileAfterDiffusion - fixing);
          const previousFixed = this.fixed[index];
          const nextFixed = clamp(previousFixed + fixing, 0, 2.1);
          const removedFraction = mobileBeforeFixing > 0
            ? clamp(fixing / mobileBeforeFixing)
            : 0;
          const storedFixedFraction = mobileBeforeFixing > 0
            ? clamp((nextFixed - previousFixed) / mobileBeforeFixing)
            : 0;
          const nextMobileSigned = signedBeforeFixing * (1 - removedFraction);
          const nextFixedSigned = this.fixedSignedMass[index]
            + signedBeforeFixing * storedFixedFraction;
          this.nextMobile[index] = nextMobile;
          this.fixed[index] = nextFixed;
          this.nextMobileSignedMass[index] = clamp(
            nextMobileSigned,
            -nextMobile,
            nextMobile,
          );
          this.fixedSignedMass[index] = clamp(
            nextFixedSigned,
            -nextFixed,
            nextFixed,
          );
        }
        if (this.materialComponentKind === "dye") {
          // Face transport already populated the copied mobile plane. The
          // recipe-versioned dye reaction runs once below, after evaporation:
          // historical R13/R14 stay linear and R15 uses shared capacity.
        } else if (this.materialComponentMobile !== null) {
          const componentMobile = this.materialComponentMobile[index];
          const componentMobility = pigmentMobility
            * this.materialComponentRecipe.mobilityMultiplier;
          const componentLaplacian = (
            this.materialComponentMobile[left]
              + this.materialComponentMobile[right]
              + this.materialComponentMobile[above]
              + this.materialComponentMobile[below]
              - componentMobile * 4
          ) * componentMobility * clamp(water * 1.35, 0, 1);
          const componentAfterDiffusion = Math.max(
            0,
            componentMobile + componentLaplacian,
          );
          const mobileBeforeFixing = Math.max(0, mobile + mobileLaplacian);
          const baseFixingFraction = mobileBeforeFixing > 0
            ? clamp(fixing / mobileBeforeFixing)
            : 0;
          const componentFixingFraction = clamp(
            baseFixingFraction
              * this.materialComponentRecipe.retentionMultiplier,
          );
          const componentFixing = componentAfterDiffusion
            * componentFixingFraction;
          this.nextMaterialComponentMobile[index] = Math.max(
            0,
            componentAfterDiffusion - componentFixing,
          );
          this.materialComponentFixed[index] = clamp(
            this.materialComponentFixed[index] + componentFixing,
            0,
            2.1,
          );
        }
        activeWater += nextWater;
      }
    }

    reactDyeMobileAdsorbed(
      this,
      this.materialComponentRecipe,
      frame,
      dyeAffinity,
      roughness,
    );

    [this.water, this.nextWater] = [this.nextWater, this.water];
    [this.mobile, this.nextMobile] = [this.nextMobile, this.mobile];
    if (this.mobileSignedMass !== null) {
      [this.mobileSignedMass, this.nextMobileSignedMass] = [
        this.nextMobileSignedMass,
        this.mobileSignedMass,
      ];
    }
    if (this.materialComponentMobile !== null) {
      [this.materialComponentMobile, this.nextMaterialComponentMobile] = [
        this.nextMaterialComponentMobile,
        this.materialComponentMobile,
      ];
      if (this.materialComponentKind === "dye") {
        [
          this.materialComponentMobileResidual,
          this.nextMaterialComponentMobileResidual,
        ] = [
          this.nextMaterialComponentMobileResidual,
          this.materialComponentMobileResidual,
        ];
      }
    }
    this.nextWater.fill(0);
    this.nextMobile.fill(0);
    this.nextMobileSignedMass?.fill(0);
    this.nextMaterialComponentMobile?.fill(0);
    this.nextMaterialComponentMobileResidual?.fill(0);
    this.activity = activeWater / this.length;
  }

  /**
   * Project transported raw density mass with the same positive optical
   * weights as ordinary pigment. Color, mean density, flow, and nib shaping do
   * not enter this transport field.
   */
  createDensityTransport(recipe) {
    assertInkRecipeCompatible(recipe);
    if (this.mobileSignedMass === null) return null;
    const signedNumerator = new Float32Array(this.length);
    const pigmentWeight = new Float32Array(this.length);
    const optical = recipe.direct.optical;
    for (let index = 0; index < this.length; index += 1) {
      const weight = Math.fround(
        this.fixed[index] * optical.fixedWeight
          + this.mobile[index] * optical.mobileWeight,
      );
      const numerator = Math.fround(
        this.fixedSignedMass[index] * optical.fixedWeight
          + this.mobileSignedMass[index] * optical.mobileWeight,
      );
      pigmentWeight[index] = weight;
      signedNumerator[index] = clamp(numerator, -weight, weight);
    }
    return Object.freeze({
      width: this.width,
      height: this.height,
      signedNumerator,
      pigmentWeight,
    });
  }

  createPaperDepthState() {
    if (this.subsurfacePigment === null) return null;
    return Object.freeze({
      width: this.width,
      height: this.height,
      pigment: new Float32Array(this.subsurfacePigment),
      signedNumerator: this.subsurfaceSignedMass === null
        ? null
        : new Float32Array(this.subsurfaceSignedMass),
    });
  }

  createDyeComponentState() {
    if (
      this.materialComponentMobile === null
      || this.materialComponentKind !== "dye"
    ) return null;
    const mobileTotalMass = new Float32Array(this.materialComponentMobile);
    const mobileSecondaryResidualMass = new Float32Array(
      this.materialComponentMobileResidual,
    );
    const adsorbedTotalMass = new Float32Array(this.materialComponentFixed);
    const adsorbedSecondaryResidualMass = new Float32Array(
      this.materialComponentFixedResidual,
    );
    // A7 state shape is stable across paper families. A paper without a depth
    // operator exposes explicit zero planes instead of null.
    const depthTotalMass = this.materialComponentSubsurface === null
      ? new Float32Array(this.length)
      : new Float32Array(this.materialComponentSubsurface);
    const depthSecondaryResidualMass =
      this.materialComponentSubsurfaceResidual === null
        ? new Float32Array(this.length)
        : new Float32Array(this.materialComponentSubsurfaceResidual);
    let mobileTotal = 0;
    let adsorbedTotal = 0;
    let depthTotal = 0;
    for (let index = 0; index < this.length; index += 1) {
      mobileTotal += mobileTotalMass[index];
      adsorbedTotal += adsorbedTotalMass[index];
      depthTotal += depthTotalMass[index];
    }
    return Object.freeze({
      id: this.materialComponentRecipe.id,
      revision: this.materialComponentRecipe.revision,
      componentModelVersion:
        this.materialComponentRecipe.componentModelVersion,
      componentRecipeSchemaVersion:
        this.materialComponentRecipe.componentRecipeSchemaVersion,
      stateModelVersion: dyeComponentStateModelVersion,
      width: this.width,
      height: this.height,
      initialSecondaryFraction:
        this.materialComponentRecipe.initialSecondaryFraction,
      mobileTotalMass,
      mobileSecondaryResidualMass,
      adsorbedTotalMass,
      adsorbedSecondaryResidualMass,
      depthTotalMass,
      depthSecondaryResidualMass,
      mobileTotal,
      adsorbedTotal,
      depthTotal,
      totalMass: mobileTotal + adsorbedTotal + depthTotal,
    });
  }

  createPigmentComponentState() {
    if (
      this.materialComponentMobile === null
      || this.materialComponentKind !== "pigment"
    ) return null;
    const mobileMass = new Float32Array(this.materialComponentMobile);
    const fixedMass = new Float32Array(this.materialComponentFixed);
    const subsurfaceMass = this.materialComponentSubsurface === null
      ? null
      : new Float32Array(this.materialComponentSubsurface);
    let mobileTotal = 0;
    let fixedTotal = 0;
    let subsurfaceTotal = 0;
    for (let index = 0; index < this.length; index += 1) {
      mobileTotal += mobileMass[index];
      fixedTotal += fixedMass[index];
      subsurfaceTotal += subsurfaceMass?.[index] ?? 0;
    }
    const visibleTotal = mobileTotal + fixedTotal;
    return Object.freeze({
      id: this.materialComponentRecipe.id,
      revision: this.materialComponentRecipe.revision,
      width: this.width,
      height: this.height,
      mobileMass,
      fixedMass,
      subsurfaceMass,
      mobileTotal,
      fixedTotal,
      subsurfaceTotal,
      fixedFraction: visibleTotal > 0 ? fixedTotal / visibleTotal : 0,
    });
  }

  // Compatibility views for callers that inspected the earlier dye-specific
  // solver fields. Pigment has separate names and never appears as dye state.
  get dyeComponentRecipe() {
    return this.materialComponentKind === "dye"
      ? this.materialComponentRecipe
      : null;
  }

  get dyeComponentMobile() {
    return this.materialComponentKind === "dye"
      ? this.materialComponentMobile
      : null;
  }

  get dyeComponentFixed() {
    return this.materialComponentKind === "dye"
      ? this.materialComponentFixed
      : null;
  }

  get nextDyeComponentMobile() {
    return this.materialComponentKind === "dye"
      ? this.nextMaterialComponentMobile
      : null;
  }

  get dyeComponentSubsurface() {
    return this.materialComponentKind === "dye"
      ? this.materialComponentSubsurface
      : null;
  }

  get dyeComponentMobileResidual() {
    return this.materialComponentKind === "dye"
      ? this.materialComponentMobileResidual
      : null;
  }

  get dyeComponentFixedResidual() {
    return this.materialComponentKind === "dye"
      ? this.materialComponentFixedResidual
      : null;
  }

  get nextDyeComponentMobileResidual() {
    return this.materialComponentKind === "dye"
      ? this.nextMaterialComponentMobileResidual
      : null;
  }

  get dyeComponentSubsurfaceResidual() {
    return this.materialComponentKind === "dye"
      ? this.materialComponentSubsurfaceResidual
      : null;
  }

  get pigmentComponentRecipe() {
    return this.materialComponentKind === "pigment"
      ? this.materialComponentRecipe
      : null;
  }

  get pigmentComponentMobile() {
    return this.materialComponentKind === "pigment"
      ? this.materialComponentMobile
      : null;
  }

  get pigmentComponentFixed() {
    return this.materialComponentKind === "pigment"
      ? this.materialComponentFixed
      : null;
  }

  get nextPigmentComponentMobile() {
    return this.materialComponentKind === "pigment"
      ? this.nextMaterialComponentMobile
      : null;
  }

  get pigmentComponentSubsurface() {
    return this.materialComponentKind === "pigment"
      ? this.materialComponentSubsurface
      : null;
  }

  render(imageData, recipe, opticalGain = 1) {
    assertInkRecipeCompatible(recipe);
    const optical = recipe.direct.optical;
    const pixels = imageData.data;
    for (let index = 0; index < this.length; index += 1) {
      const fixed = this.fixed[index];
      const mobile = this.mobile[index];
      const water = this.water[index];
      const pigment = clamp(
        fixed * optical.fixedWeight + mobile * optical.mobileWeight,
        0,
        optical.pigmentMaximum,
      );
      const density = 1 - Math.exp(-pigment * optical.densityExponent);
      const wetLift = clamp(water, 0, 1) * optical.wetLift;
      const offset = index * 4;
      pixels[offset] = Math.round(optical.redBase + wetLift * optical.redWetGain);
      pixels[offset + 1] = Math.round(
        optical.greenBase + wetLift * optical.greenWetGain
          - density * optical.greenDensityLoss,
      );
      pixels[offset + 2] = Math.round(
        optical.blueBase + wetLift * optical.blueWetGain
          - density * optical.blueDensityLoss,
      );
      pixels[offset + 3] = Math.round(
        clamp(
          density * optical.alphaGain * opticalGain,
          0,
          optical.maximumAlpha,
        ) * 255,
      );
    }
  }
}
