import {
  assertDyeComponentRecipeCompatible,
  dyeComponentStateModelVersion,
} from "../dye-components/index.js";

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
    || componentRecipeSchemaVersion
      !== recipe.componentRecipeSchemaVersion
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
      readOwnData(
        value,
        "mobileSecondaryResidualMass",
        "dyeComponent",
      ),
    ],
    [
      "adsorbed",
      readOwnData(value, "adsorbedTotalMass", "dyeComponent"),
      readOwnData(
        value,
        "adsorbedSecondaryResidualMass",
        "dyeComponent",
      ),
    ],
    [
      "depth",
      readOwnData(value, "depthTotalMass", "dyeComponent"),
      readOwnData(
        value,
        "depthSecondaryResidualMass",
        "dyeComponent",
      ),
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
      // The total/residual representation is invertible:
      // P=(1-f0)T-R and S=f0T+R. Reject states that imply negative species.
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
  return {
    red: sample("Red"),
    green: sample("Green"),
    blue: sample("Blue"),
  };
}

const MINIMUM_LINEAR_CHANNEL = 1 / 65535;
const MAXIMUM_NORMALIZED_REFLECTANCE = 1 - MINIMUM_LINEAR_CHANNEL;

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

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function assertPaperDiffuseReflectance(value) {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new TypeError(
      "paperDiffuseReflectance must be a finite number in 0...1.",
    );
  }
  return value;
}

function kubelkaMunkAbsorptionScatteringRatio(reflectance) {
  return ((1 - reflectance) * (1 - reflectance)) / (2 * reflectance);
}

function kubelkaMunkInfiniteReflectance(absorptionScatteringRatio) {
  return 1 / (
    1
    + absorptionScatteringRatio
    + Math.sqrt(
      absorptionScatteringRatio * (absorptionScatteringRatio + 2),
    )
  );
}

function mixKubelkaMunkChannel({
  baseChannel,
  secondaryChannel,
  secondaryWeight,
  paperDiffuseReflectance,
}) {
  const paperReflectance = clamp(
    paperDiffuseReflectance,
    MINIMUM_LINEAR_CHANNEL,
    1,
  );
  const normalizedBase = clamp(
    srgbToLinear(baseChannel) / paperReflectance,
    MINIMUM_LINEAR_CHANNEL,
    MAXIMUM_NORMALIZED_REFLECTANCE,
  );
  const normalizedSecondary = clamp(
    srgbToLinear(secondaryChannel) / paperReflectance,
    MINIMUM_LINEAR_CHANNEL,
    MAXIMUM_NORMALIZED_REFLECTANCE,
  );
  const baseRatio = kubelkaMunkAbsorptionScatteringRatio(normalizedBase);
  const secondaryRatio = kubelkaMunkAbsorptionScatteringRatio(
    normalizedSecondary,
  );
  const mixedRatio = baseRatio * (1 - secondaryWeight)
    + secondaryRatio * secondaryWeight;
  const mixedLinear = clamp(
    paperReflectance * kubelkaMunkInfiniteReflectance(mixedRatio),
    0,
    1,
  );
  return Math.min(
    255,
    Math.max(0, Math.round(linearToSrgb(mixedLinear) * 255)),
  );
}

function resolveTransportedSecondaryMassWeight(
  visibleTotalMass,
  visibleSecondaryResidualMass,
  recipe,
) {
  return visibleTotalMass > 0
    ? clamp(
        recipe.initialSecondaryFraction
          + visibleSecondaryResidualMass / visibleTotalMass,
        0,
        1,
      )
    : 0;
}

function resolveWellMixedSecondaryMassWeight(
  visibleTotalMass,
  _visibleSecondaryResidualMass,
  recipe,
) {
  return visibleTotalMass > 0
    ? recipe.initialSecondaryFraction
    : 0;
}

/**
 * Resolve the visible primary/secondary transported mass ratio through a
 * three-band, semi-infinite single-constant Kubelka-Munk approximation.
 * Existing alpha is copied exactly, so this operator cannot add coverage,
 * halos, shadows, or a duplicate glyph pass.
 */
function compositeDyeOptical({
  pixelWidth,
  pixelHeight,
  baseRgba,
  concentration,
  dyeComponent,
  dyeComponentRecipe,
  paperDiffuseReflectance,
  output = baseRgba,
}, resolveSecondaryWeight) {
  const width = assertPositiveInteger(pixelWidth, "pixelWidth");
  const height = assertPositiveInteger(pixelHeight, "pixelHeight");
  assertDyeComponentRecipeCompatible(dyeComponentRecipe);
  const base = assertRgba(baseRgba, width, height, "baseRgba");
  const result = assertRgba(output, width, height, "output");
  const concentrationData = assertScalarPlane(
    concentration,
    width,
    height,
    "concentration",
  );
  const component = assertDyeComponentState(
    dyeComponent,
    dyeComponentRecipe,
  );
  const paperReflectance = assertPaperDiffuseReflectance(
    paperDiffuseReflectance,
  );
  if (result !== base) result.set(base);

  for (let y = 0; y < height; y += 1) {
    const mappedY = Math.max(
      0,
      Math.min(
        component.height - 1,
        (y + 0.5) * component.height / height - 0.5,
      ),
    );
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      if (base[offset + 3] === 0) continue;
      const componentBase = sampleComponentBaseColor(
        concentrationData[y * width + x],
        dyeComponentRecipe,
      );
      const ordinaryKeep = 1 - dyeComponentRecipe.baseMix;
      result[offset] = Math.round(
        base[offset] * ordinaryKeep
          + componentBase.red * dyeComponentRecipe.baseMix,
      );
      result[offset + 1] = Math.round(
        base[offset + 1] * ordinaryKeep
          + componentBase.green * dyeComponentRecipe.baseMix,
      );
      result[offset + 2] = Math.round(
        base[offset + 2] * ordinaryKeep
          + componentBase.blue * dyeComponentRecipe.baseMix,
      );
      result[offset + 3] = base[offset + 3];
      const mappedX = Math.max(
        0,
        Math.min(
          component.width - 1,
          (x + 0.5) * component.width / width - 0.5,
        ),
      );
      const visibleTotalMass = bilinearSample(
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
      const visibleSecondaryResidualMass = bilinearSample(
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
      const secondaryWeight = resolveSecondaryWeight(
        visibleTotalMass,
        visibleSecondaryResidualMass,
        dyeComponentRecipe,
      );
      if (!(secondaryWeight > 0)) continue;
      result[offset] = mixKubelkaMunkChannel({
        baseChannel: result[offset],
        secondaryChannel: dyeComponentRecipe.secondaryRed,
        secondaryWeight,
        paperDiffuseReflectance: paperReflectance,
      });
      result[offset + 1] = mixKubelkaMunkChannel({
        baseChannel: result[offset + 1],
        secondaryChannel: dyeComponentRecipe.secondaryGreen,
        secondaryWeight,
        paperDiffuseReflectance: paperReflectance,
      });
      result[offset + 2] = mixKubelkaMunkChannel({
        baseChannel: result[offset + 2],
        secondaryChannel: dyeComponentRecipe.secondaryBlue,
        secondaryWeight,
        paperDiffuseReflectance: paperReflectance,
      });
      result[offset + 3] = base[offset + 3];
    }
  }
  return output;
}

/**
 * Resolve the transported visible primary/secondary mass ratio. This remains
 * the default production Optical path.
 */
export function compositeDyeEdgeOptical(options) {
  return compositeDyeOptical(options, resolveTransportedSecondaryMassWeight);
}

/**
 * Resolve the same sampled visible total mass with the recipe's authored,
 * spatially uniform two-dye ratio. This is a counterfactual control for
 * comparing transport against a well-mixed state; alpha and support remain
 * byte-exact with the supplied base RGBA.
 */
export function compositeDyeWellMixedControlOptical(options) {
  return compositeDyeOptical(
    options,
    resolveWellMixedSecondaryMassWeight,
  );
}
