import {
  assertDyeComponentRecipeCompatible,
  dyeComponentStateModelVersion,
} from "../dye-components/index.js";

export const finiteLoadingDyeOpticalModelVersion =
  "three-channel-effective-optical-density-v2";
export const paperOpticalProfileModelVersion =
  "paper-optical-profile-srgb-v1";
export const paperOpticalProfileSchemaVersion = 1;
export const finiteLoadingDyeOpticalReferenceVisibleMass = 0.14;

/**
 * Metadata for the opt-in paper-backed preview. This is a Beer-inspired,
 * three-channel effective optical-density operator. It is deliberately not
 * described as spectral Beer-Lambert or Kubelka-Munk scattering.
 */
export const FINITE_LOADING_DYE_OPTICAL_OUTPUT_METADATA = Object.freeze({
  opticalModelVersion: finiteLoadingDyeOpticalModelVersion,
  alphaMode: "opaque",
  colorSpace: "srgb",
  representation: "paper-backed-rgba",
  referenceVisibleMass: finiteLoadingDyeOpticalReferenceVisibleMass,
  calibration: "engine-visible-mass-reference-r1",
  spectral: false,
  scattering: false,
  visiblePhases: Object.freeze(["mobile", "adsorbed"]),
  excludedPhases: Object.freeze(["depth"]),
});

/** Frozen engine-owned paper endpoint for the first finite-loading study. */
export const WARM_WHITE_PAPER_OPTICAL_PROFILE_R1 = Object.freeze({
  id: "warm-white-paper-optical",
  revision: 1,
  profileModelVersion: paperOpticalProfileModelVersion,
  profileSchemaVersion: paperOpticalProfileSchemaVersion,
  colorSpace: "srgb",
  red: 255,
  green: 254,
  blue: 250,
});

function readOwnData(value, key, path) {
  if (value === null || typeof value !== "object") {
    throw new TypeError(`${path} must be an object.`);
  }
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  if (!descriptor?.enumerable || !("value" in descriptor)) {
    throw new TypeError(`${path}.${key} must be an enumerable own data property.`);
  }
  return descriptor.value;
}

function assertPositiveInteger(value, path) {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new TypeError(`${path} must be a positive integer.`);
  }
  return value;
}

function assertRgba(value, width, height, path) {
  const rgbaWidth = readOwnData(value, "width", path);
  const rgbaHeight = readOwnData(value, "height", path);
  const data = readOwnData(value, "data", path);
  if (
    rgbaWidth !== width
    || rgbaHeight !== height
    || !(data instanceof Uint8ClampedArray)
    || data.length !== width * height * 4
  ) {
    throw new TypeError(`${path} must expose width * height Uint8Clamped RGBA data.`);
  }
  return data;
}

function typedArrayRegionsOverlap(left, right) {
  if (left.buffer !== right.buffer) return false;
  const leftEnd = left.byteOffset + left.byteLength;
  const rightEnd = right.byteOffset + right.byteLength;
  return left.byteOffset < rightEnd && right.byteOffset < leftEnd;
}

function assertScalarPlane(value, width, height, path) {
  const planeWidth = readOwnData(value, "width", path);
  const planeHeight = readOwnData(value, "height", path);
  const data = readOwnData(value, "data", path);
  if (
    planeWidth !== width
    || planeHeight !== height
    || !(data instanceof Float32Array)
    || data.length !== width * height
  ) {
    throw new TypeError(`${path} must expose width * height Float32 data.`);
  }
  for (let index = 0; index < data.length; index += 1) {
    if (!Number.isFinite(data[index]) || data[index] < 0 || data[index] > 1) {
      throw new TypeError(`${path} data must be finite in 0...1.`);
    }
  }
  return data;
}

function assertDyeComponentState(value, recipe) {
  const width = assertPositiveInteger(
    readOwnData(value, "width", "dyeComponent"),
    "dyeComponent.width",
  );
  const height = assertPositiveInteger(
    readOwnData(value, "height", "dyeComponent"),
    "dyeComponent.height",
  );
  const id = readOwnData(value, "id", "dyeComponent");
  const revision = readOwnData(value, "revision", "dyeComponent");
  const componentModelVersion = readOwnData(
    value,
    "componentModelVersion",
    "dyeComponent",
  );
  const componentRecipeSchemaVersion = readOwnData(
    value,
    "componentRecipeSchemaVersion",
    "dyeComponent",
  );
  const stateModelVersion = readOwnData(
    value,
    "stateModelVersion",
    "dyeComponent",
  );
  const initialSecondaryFraction = readOwnData(
    value,
    "initialSecondaryFraction",
    "dyeComponent",
  );
  if (
    id !== recipe.id
    || revision !== recipe.revision
    || componentModelVersion !== recipe.componentModelVersion
    || componentRecipeSchemaVersion !== recipe.componentRecipeSchemaVersion
    || initialSecondaryFraction !== recipe.initialSecondaryFraction
  ) {
    throw new TypeError("dyeComponent identity must match dyeComponentRecipe.");
  }
  if (stateModelVersion !== dyeComponentStateModelVersion) {
    throw new TypeError(
      `dyeComponent.stateModelVersion must be ${dyeComponentStateModelVersion}.`,
    );
  }

  const phasePlanes = [
    [
      "mobile",
      readOwnData(value, "mobileTotalMass", "dyeComponent"),
      readOwnData(value, "mobileSecondaryResidualMass", "dyeComponent"),
    ],
    [
      "adsorbed",
      readOwnData(value, "adsorbedTotalMass", "dyeComponent"),
      readOwnData(value, "adsorbedSecondaryResidualMass", "dyeComponent"),
    ],
    [
      "depth",
      readOwnData(value, "depthTotalMass", "dyeComponent"),
      readOwnData(value, "depthSecondaryResidualMass", "dyeComponent"),
    ],
  ];
  for (const [phase, totalPlane, residualPlane] of phasePlanes) {
    if (
      !(totalPlane instanceof Float32Array)
      || totalPlane.length !== width * height
      || !(residualPlane instanceof Float32Array)
      || residualPlane.length !== width * height
    ) {
      throw new TypeError(
        `dyeComponent ${phase} total/residual must be width * height Float32Array planes.`,
      );
    }
    for (let index = 0; index < totalPlane.length; index += 1) {
      const total = totalPlane[index];
      const residual = residualPlane[index];
      if (!Number.isFinite(total) || total < 0) {
        throw new TypeError(
          `dyeComponent.${phase}TotalMass values must be finite and non-negative.`,
        );
      }
      if (!Number.isFinite(residual)) {
        throw new TypeError(
          `dyeComponent.${phase}SecondaryResidualMass values must be finite.`,
        );
      }
      const primary = (1 - initialSecondaryFraction) * total - residual;
      const secondary = initialSecondaryFraction * total + residual;
      const reconstructionTolerance = Math.max(1, total) * (2 ** -21);
      if (
        primary < -reconstructionTolerance
        || secondary < -reconstructionTolerance
      ) {
        throw new TypeError(
          `dyeComponent ${phase} total/residual must reconstruct non-negative primary and secondary mass.`,
        );
      }
    }
  }

  return {
    width,
    height,
    initialSecondaryFraction,
    mobileTotalMass: phasePlanes[0][1],
    mobileSecondaryResidualMass: phasePlanes[0][2],
    adsorbedTotalMass: phasePlanes[1][1],
    adsorbedSecondaryResidualMass: phasePlanes[1][2],
  };
}

function assertPaperOpticalProfile(value) {
  const id = readOwnData(value, "id", "paperOpticalProfile");
  const revision = readOwnData(value, "revision", "paperOpticalProfile");
  const profileModelVersion = readOwnData(
    value,
    "profileModelVersion",
    "paperOpticalProfile",
  );
  const profileSchemaVersion = readOwnData(
    value,
    "profileSchemaVersion",
    "paperOpticalProfile",
  );
  const colorSpace = readOwnData(
    value,
    "colorSpace",
    "paperOpticalProfile",
  );
  if (typeof id !== "string" || id.trim() === "") {
    throw new TypeError("paperOpticalProfile.id must be a non-empty string.");
  }
  assertPositiveInteger(revision, "paperOpticalProfile.revision");
  if (profileModelVersion !== paperOpticalProfileModelVersion) {
    throw new TypeError(
      `paperOpticalProfile.profileModelVersion must be ${paperOpticalProfileModelVersion}.`,
    );
  }
  if (profileSchemaVersion !== paperOpticalProfileSchemaVersion) {
    throw new TypeError(
      `paperOpticalProfile.profileSchemaVersion must be ${paperOpticalProfileSchemaVersion}.`,
    );
  }
  if (colorSpace !== "srgb") {
    throw new TypeError("paperOpticalProfile.colorSpace must be srgb.");
  }
  const channels = ["red", "green", "blue"].map((channel) => {
    const channelValue = readOwnData(
      value,
      channel,
      "paperOpticalProfile",
    );
    if (!Number.isInteger(channelValue) || channelValue < 1 || channelValue > 255) {
      throw new TypeError(
        `paperOpticalProfile.${channel} must be an integer in 1...255.`,
      );
    }
    return channelValue;
  });
  if (
    id === WARM_WHITE_PAPER_OPTICAL_PROFILE_R1.id
    && revision === WARM_WHITE_PAPER_OPTICAL_PROFILE_R1.revision
    && (
      profileModelVersion
        !== WARM_WHITE_PAPER_OPTICAL_PROFILE_R1.profileModelVersion
      || profileSchemaVersion
        !== WARM_WHITE_PAPER_OPTICAL_PROFILE_R1.profileSchemaVersion
      || colorSpace !== WARM_WHITE_PAPER_OPTICAL_PROFILE_R1.colorSpace
      || channels[0] !== WARM_WHITE_PAPER_OPTICAL_PROFILE_R1.red
      || channels[1] !== WARM_WHITE_PAPER_OPTICAL_PROFILE_R1.green
      || channels[2] !== WARM_WHITE_PAPER_OPTICAL_PROFILE_R1.blue
    )
  ) {
    throw new TypeError(
      "registered paperOpticalProfile identity cannot be reused with different values.",
    );
  }
  return channels;
}

function bilinearSample(plane, width, height, x, y) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = Math.min(width - 1, x0 + 1);
  const y1 = Math.min(height - 1, y0 + 1);
  const fractionX = x - x0;
  const fractionY = y - y0;
  const top = plane[y0 * width + x0] * (1 - fractionX)
    + plane[y0 * width + x1] * fractionX;
  const bottom = plane[y1 * width + x0] * (1 - fractionX)
    + plane[y1 * width + x1] * fractionX;
  return top * (1 - fractionY) + bottom * fractionY;
}

function sampleComponentBaseColor(concentration, recipe) {
  const highHalf = concentration > 0.5;
  const progress = highHalf
    ? (concentration - 0.5) * 2
    : concentration * 2;
  const lowerPrefix = highHalf ? "baseMid" : "baseLow";
  const upperPrefix = highHalf ? "baseHigh" : "baseMid";
  const sample = (channel) => Math.round(
    recipe[`${lowerPrefix}${channel}`]
      + (recipe[`${upperPrefix}${channel}`]
        - recipe[`${lowerPrefix}${channel}`]) * progress,
  );
  return [sample("Red"), sample("Green"), sample("Blue")];
}

function resolvePrimaryEndpoint(base, offset, concentration, recipe) {
  const componentBase = sampleComponentBaseColor(concentration, recipe);
  const ordinaryKeep = 1 - recipe.baseMix;
  return componentBase.map((componentChannel, channel) => Math.round(
    base[offset + channel] * ordinaryKeep
      + componentChannel * recipe.baseMix,
  ));
}

function srgbToLinear(channel) {
  const encoded = channel / 255;
  return encoded <= 0.04045
    ? encoded / 12.92
    : Math.pow((encoded + 0.055) / 1.055, 2.4);
}

function linearToSrgb(linear) {
  return linear <= 0.0031308
    ? linear * 12.92
    : 1.055 * Math.pow(linear, 1 / 2.4) - 0.055;
}

function inferEffectiveBeta(endpointChannel, paperLinear, path) {
  const endpointLinear = srgbToLinear(endpointChannel);
  if (!(endpointLinear > 0)) {
    throw new TypeError(
      `${path} must have positive paper-backed reflectance at the reference visible mass.`,
    );
  }
  if (endpointLinear > paperLinear) {
    throw new TypeError(`${path} must not be brighter than paperOpticalProfile.`);
  }
  const beta = -Math.log(endpointLinear / paperLinear);
  if (!Number.isFinite(beta) || beta < 0) {
    throw new TypeError(`${path} must infer a finite non-negative effective beta.`);
  }
  return beta;
}

function inferEndpointBetas(endpoint, paperLinear, path) {
  return endpoint.map((channel, index) => inferEffectiveBeta(
    channel,
    paperLinear[index],
    `${path}.${["red", "green", "blue"][index]}`,
  ));
}

function encodePaperBackedChannel(linear) {
  return Math.round(linearToSrgb(linear) * 255);
}

function sampleVisibleTotalResidual(component, mappedX, mappedY) {
  const total = bilinearSample(
    component.mobileTotalMass,
    component.width,
    component.height,
    mappedX,
    mappedY,
  ) + bilinearSample(
    component.adsorbedTotalMass,
    component.width,
    component.height,
    mappedX,
    mappedY,
  );
  const residual = bilinearSample(
    component.mobileSecondaryResidualMass,
    component.width,
    component.height,
    mappedX,
    mappedY,
  ) + bilinearSample(
    component.adsorbedSecondaryResidualMass,
    component.width,
    component.height,
    mappedX,
    mappedY,
  );
  return [total, residual];
}

function resolveTransportedSpecies(total, residual, initialSecondaryFraction) {
  const primary = (1 - initialSecondaryFraction) * total - residual;
  const secondary = initialSecondaryFraction * total + residual;
  // The state validator permits only Float32 reconstruction round-off below
  // this bound. Removing that numerical dust is not a material gain or cap.
  const tolerance = Math.max(1, total) * (2 ** -20);
  return [
    primary < 0 && primary >= -tolerance ? 0 : primary,
    secondary < 0 && secondary >= -tolerance ? 0 : secondary,
  ];
}

function resolveWellMixedSpecies(total, _residual, initialSecondaryFraction) {
  return [
    (1 - initialSecondaryFraction) * total,
    initialSecondaryFraction * total,
  ];
}

function compositeFiniteLoadingDyeOptical({
  pixelWidth,
  pixelHeight,
  baseRgba,
  concentration,
  dyeComponent,
  dyeComponentRecipe,
  paperOpticalProfile,
  output,
}, resolveSpecies) {
  const width = assertPositiveInteger(pixelWidth, "pixelWidth");
  const height = assertPositiveInteger(pixelHeight, "pixelHeight");
  assertDyeComponentRecipeCompatible(dyeComponentRecipe);
  const base = assertRgba(baseRgba, width, height, "baseRgba");
  const concentrationData = assertScalarPlane(
    concentration,
    width,
    height,
    "concentration",
  );
  const component = assertDyeComponentState(dyeComponent, dyeComponentRecipe);
  const paperSrgb = assertPaperOpticalProfile(paperOpticalProfile);
  const paperLinear = paperSrgb.map(srgbToLinear);
  const result = output ?? {
    width,
    height,
    data: new Uint8ClampedArray(width * height * 4),
  };
  const resultData = assertRgba(result, width, height, "output");
  if (
    result === baseRgba
    || resultData === base
    || typedArrayRegionsOverlap(resultData, base)
  ) {
    throw new TypeError(
      "output must be distinct from baseRgba for opaque paper-backed Optical.",
    );
  }

  const secondaryEndpoint = [
    dyeComponentRecipe.secondaryRed,
    dyeComponentRecipe.secondaryGreen,
    dyeComponentRecipe.secondaryBlue,
  ];
  const secondaryBetas = inferEndpointBetas(
    secondaryEndpoint,
    paperLinear,
    "dyeComponentRecipe secondary endpoint",
  );

  // Validate every spatially varying primary endpoint before touching a
  // caller-owned output. Transparent pixels have no ink endpoint to infer.
  for (let index = 0; index < width * height; index += 1) {
    const offset = index * 4;
    if (base[offset + 3] === 0) continue;
    inferEndpointBetas(
      resolvePrimaryEndpoint(
        base,
        offset,
        concentrationData[index],
        dyeComponentRecipe,
      ),
      paperLinear,
      "primary endpoint",
    );
  }

  for (let y = 0; y < height; y += 1) {
    const mappedY = Math.max(
      0,
      Math.min(
        component.height - 1,
        (y + 0.5) * component.height / height - 0.5,
      ),
    );
    for (let x = 0; x < width; x += 1) {
      const index = y * width + x;
      const offset = index * 4;
      const coverage = base[offset + 3] / 255;
      resultData[offset] = paperSrgb[0];
      resultData[offset + 1] = paperSrgb[1];
      resultData[offset + 2] = paperSrgb[2];
      resultData[offset + 3] = 255;
      if (coverage === 0) continue;

      const mappedX = Math.max(
        0,
        Math.min(
          component.width - 1,
          (x + 0.5) * component.width / width - 0.5,
        ),
      );
      const [visibleTotalMass, visibleResidualMass] =
        sampleVisibleTotalResidual(component, mappedX, mappedY);
      const [primaryMass, secondaryMass] = resolveSpecies(
        visibleTotalMass,
        visibleResidualMass,
        component.initialSecondaryFraction,
      );
      const primaryBetas = inferEndpointBetas(
        resolvePrimaryEndpoint(
          base,
          offset,
          concentrationData[index],
          dyeComponentRecipe,
        ),
        paperLinear,
        "primary endpoint",
      );
      for (let channel = 0; channel < 3; channel += 1) {
        const opticalDepth = primaryBetas[channel] * primaryMass
          + secondaryBetas[channel] * secondaryMass;
        const calibratedOpticalDepth = opticalDepth
          / finiteLoadingDyeOpticalReferenceVisibleMass;
        const paperBackedLinear = paperLinear[channel]
          * (1 + coverage * Math.expm1(-calibratedOpticalDepth));
        resultData[offset + channel] = encodePaperBackedChannel(
          paperBackedLinear,
        );
      }
    }
  }
  return result;
}

/** Paper-backed finite-loading preview of the transported two-dye state. */
export function compositeDyeFiniteLoadingTransportedOptical(options) {
  return compositeFiniteLoadingDyeOptical(
    options,
    resolveTransportedSpecies,
  );
}

/**
 * Paper-backed finite-loading counterfactual with the same visible total mass
 * held at the recipe's spatially uniform initial species ratio.
 */
export function compositeDyeFiniteLoadingWellMixedControlOptical(options) {
  return compositeFiniteLoadingDyeOptical(
    options,
    resolveWellMixedSpecies,
  );
}
