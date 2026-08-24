import assert from "node:assert/strict";
import test from "node:test";
import {
  FINITE_LOADING_DYE_OPTICAL_OUTPUT_METADATA,
  WARM_WHITE_PAPER_OPTICAL_PROFILE_R1,
  compositeDyeEdgeOptical,
  compositeDyeFiniteLoadingTransportedOptical,
  compositeDyeFiniteLoadingWellMixedControlOptical,
  compositeDyeWellMixedControlOptical,
  compositeOrdinaryOptical,
  finiteLoadingDyeOpticalModelVersion,
  finiteLoadingDyeOpticalReferenceVisibleMass,
  paperOpticalProfileModelVersion,
  paperOpticalProfileSchemaVersion,
} from "../src/optical/index.js";
import {
  EDGE_DYE_COMPONENT_RECIPE_R13,
  EDGE_DYE_COMPONENT_RECIPE_R15,
  EDGE_DYE_COMPONENT_RECIPE_R16,
  dyeComponentStateModelVersion,
  freezeDyeComponentRecipe,
} from "../src/dye-components/index.js";
import {
  ORDINARY_BLUE_BLACK_RECIPE_R6,
  ORDINARY_BURGUNDY_RECIPE_R6,
  ORDINARY_GREEN_RECIPE_R12,
  ORDINARY_TEAL_RECIPE_R6,
} from "../src/recipes/index.js";

test("Optical maps only normalized concentration and resolved coverage", () => {
  const output = {
    width: 2,
    height: 1,
    data: new Uint8ClampedArray([9, 8, 7, 6, 9, 8, 7, 6]),
  };
  const result = compositeOrdinaryOptical({
    pixelWidth: 2,
    pixelHeight: 1,
    concentration: { width: 2, height: 1, data: new Float32Array([0.5, 1]) },
    resolvedCoverage: { width: 2, height: 1, data: new Float32Array([1, 0]) },
    recipe: ORDINARY_GREEN_RECIPE_R12,
    output,
  });
  assert.equal(result, output);
  assert.deepEqual(Array.from(result.data.slice(0, 3)), [29, 55, 40]);
  assert.ok(result.data[3] > 0);
  assert.deepEqual(Array.from(result.data.slice(4)), [0, 0, 0, 0]);
});

test("r8 color curves map low, middle, and high Density without changing alpha", () => {
  const recipes = [
    ORDINARY_GREEN_RECIPE_R12,
    ORDINARY_BLUE_BLACK_RECIPE_R6,
    ORDINARY_BURGUNDY_RECIPE_R6,
    ORDINARY_TEAL_RECIPE_R6,
  ];
  const concentration = {
    width: 3,
    height: 1,
    data: new Float32Array([0, 0.5, 1]),
  };
  const coverage = {
    width: 3,
    height: 1,
    data: new Float32Array([1, 1, 1]),
  };
  const alphaSignatures = [];
  for (const recipe of recipes) {
    const result = compositeOrdinaryOptical({
      pixelWidth: 3,
      pixelHeight: 1,
      concentration,
      resolvedCoverage: coverage,
      recipe,
    });
    const rgb = [0, 1, 2].map((index) =>
      Array.from(result.data.slice(index * 4, index * 4 + 3)));
    assert.deepEqual(
      rgb,
      recipe.optical.densityColorCurve.map((point) => [
        point.rgb.red,
        point.rgb.green,
        point.rgb.blue,
      ]),
    );
    alphaSignatures.push([result.data[3], result.data[7], result.data[11]]);
  }
  for (const signature of alphaSignatures.slice(1)) {
    assert.deepEqual(signature, alphaSignatures[0]);
  }
});

test("density color curves interpolate channels rather than applying a hue skin", () => {
  const result = compositeOrdinaryOptical({
    pixelWidth: 2,
    pixelHeight: 1,
    concentration: { width: 2, height: 1, data: new Float32Array([0.25, 0.75]) },
    resolvedCoverage: { width: 2, height: 1, data: new Float32Array([1, 1]) },
    recipe: ORDINARY_BLUE_BLACK_RECIPE_R6,
  });
  assert.deepEqual(Array.from(result.data.slice(0, 3)), [60, 80, 96]);
  assert.deepEqual(Array.from(result.data.slice(4, 7)), [32, 51, 70]);
});

test("Optical rejects malformed scalar planes before mutating output", () => {
  const output = {
    width: 1,
    height: 1,
    data: new Uint8ClampedArray([9, 8, 7, 6]),
  };
  assert.throws(() => compositeOrdinaryOptical({
    pixelWidth: 1,
    pixelHeight: 1,
    concentration: { width: 1, height: 1, data: new Float32Array([NaN]) },
    resolvedCoverage: { width: 1, height: 1, data: new Float32Array([1]) },
    recipe: ORDINARY_GREEN_RECIPE_R12,
    output,
  }), /concentration data must be finite/);
  assert.deepEqual(Array.from(output.data), [9, 8, 7, 6]);
});

const makeDyeState = ({
  width = 1,
  height = 1,
  mobileTotal = [1],
  mobileResidual = [0],
  adsorbedTotal = [0],
  adsorbedResidual = [0],
  depthTotal = new Array(width * height).fill(0),
  depthResidual = new Array(width * height).fill(0),
  recipe = EDGE_DYE_COMPONENT_RECIPE_R13,
  overrides = {},
} = {}) => ({
  id: recipe.id,
  revision: recipe.revision,
  componentModelVersion: recipe.componentModelVersion,
  componentRecipeSchemaVersion: recipe.componentRecipeSchemaVersion,
  stateModelVersion: dyeComponentStateModelVersion,
  width,
  height,
  initialSecondaryFraction: recipe.initialSecondaryFraction,
  mobileTotalMass: new Float32Array(mobileTotal),
  mobileSecondaryResidualMass: new Float32Array(mobileResidual),
  adsorbedTotalMass: new Float32Array(adsorbedTotal),
  adsorbedSecondaryResidualMass: new Float32Array(adsorbedResidual),
  depthTotalMass: new Float32Array(depthTotal),
  depthSecondaryResidualMass: new Float32Array(depthResidual),
  ...overrides,
});

const srgbToLinearForTest = (channel) => {
  const encoded = channel / 255;
  return encoded <= 0.04045
    ? encoded / 12.92
    : ((encoded + 0.055) / 1.055) ** 2.4;
};

const linearToSrgbForTest = (linear) => linear <= 0.0031308
  ? linear * 12.92
  : 1.055 * linear ** (1 / 2.4) - 0.055;

const expectedKubelkaMunkRgb = (
  baseRgb,
  secondaryWeight,
  recipe,
  paperDiffuseReflectance,
) => {
  if (secondaryWeight === 0) return baseRgb;
  const epsilon = 1 / 65535;
  const paper = Math.min(1, Math.max(epsilon, paperDiffuseReflectance));
  const kmRatio = (reflectance) => ((1 - reflectance) ** 2) / (2 * reflectance);
  const inverseKm = (ratio) => 1 / (1 + ratio + Math.sqrt(ratio * (ratio + 2)));
  return baseRgb.map((channel, index) => {
    const secondary = [
      recipe.secondaryRed,
      recipe.secondaryGreen,
      recipe.secondaryBlue,
    ][index];
    const baseReflectance = Math.min(
      1 - epsilon,
      Math.max(epsilon, srgbToLinearForTest(channel) / paper),
    );
    const secondaryReflectance = Math.min(
      1 - epsilon,
      Math.max(epsilon, srgbToLinearForTest(secondary) / paper),
    );
    const mixedRatio = kmRatio(baseReflectance) * (1 - secondaryWeight)
      + kmRatio(secondaryReflectance) * secondaryWeight;
    const mixedLinear = Math.min(1, Math.max(0, paper * inverseKm(mixedRatio)));
    return Math.min(
      255,
      Math.max(0, Math.round(linearToSrgbForTest(mixedLinear) * 255)),
    );
  });
};

function renderOneDyePixel({
  composite = compositeDyeEdgeOptical,
  state = makeDyeState(),
  recipe = EDGE_DYE_COMPONENT_RECIPE_R13,
  alpha = 200,
  rgb = [29, 55, 40],
  paperDiffuseReflectance = 0.98,
  output,
} = {}) {
  const base = {
    width: 1,
    height: 1,
    data: new Uint8ClampedArray([...rgb, alpha]),
  };
  const target = output ?? base;
  composite({
    pixelWidth: 1,
    pixelHeight: 1,
    baseRgba: base,
    concentration: {
      width: 1,
      height: 1,
      data: new Float32Array([0.5]),
    },
    dyeComponent: state,
    dyeComponentRecipe: recipe,
    paperDiffuseReflectance,
    output: target,
  });
  return Array.from(target.data);
}

test("A7-2 zero residual makes transported and well-mixed RGBA byte-exact", () => {
  for (const state of [
    makeDyeState({ mobileTotal: [1], adsorbedTotal: [0] }),
    makeDyeState({ mobileTotal: [0.25], adsorbedTotal: [0.75] }),
    makeDyeState({ mobileTotal: [0], adsorbedTotal: [0] }),
  ]) {
    const transported = renderOneDyePixel({ state });
    const wellMixed = renderOneDyePixel({
      composite: compositeDyeWellMixedControlOptical,
      state,
    });
    assert.deepEqual(transported, wellMixed);
    assert.equal(transported[3], 200);
  }
});

test("neutral r13 mixture follows authored f0 and three-band K-M exactly", () => {
  const actual = renderOneDyePixel();
  assert.deepEqual(actual, [
    ...expectedKubelkaMunkRgb(
      [91, 132, 154],
      EDGE_DYE_COMPONENT_RECIPE_R13.initialSecondaryFraction,
      EDGE_DYE_COMPONENT_RECIPE_R13,
      0.98,
    ),
    200,
  ]);
});

test("transported weight is f0 plus visible residual over visible total", () => {
  const f0 = EDGE_DYE_COMPONENT_RECIPE_R13.initialSecondaryFraction;
  const residual = 0.2;
  const state = makeDyeState({
    mobileTotal: [0.4],
    mobileResidual: [0.08],
    adsorbedTotal: [0.6],
    adsorbedResidual: [0.12],
  });
  const transported = renderOneDyePixel({ state });
  const wellMixed = renderOneDyePixel({
    composite: compositeDyeWellMixedControlOptical,
    state,
  });
  assert.deepEqual(transported.slice(0, 3), expectedKubelkaMunkRgb(
    [91, 132, 154],
    f0 + residual,
    EDGE_DYE_COMPONENT_RECIPE_R13,
    0.98,
  ));
  assert.notDeepEqual(transported, wellMixed);
  assert.equal(transported[3], wellMixed[3]);
});

test("Optical interpolates visible total and residual before taking their ratio", () => {
  const state = makeDyeState({
    width: 2,
    mobileTotal: [9, 1],
    mobileResidual: [0.9, 0.5],
    adsorbedTotal: [0, 0],
    adsorbedResidual: [0, 0],
  });
  const base = {
    width: 1,
    height: 1,
    data: new Uint8ClampedArray([29, 55, 40, 200]),
  };
  compositeDyeEdgeOptical({
    pixelWidth: 1,
    pixelHeight: 1,
    baseRgba: base,
    concentration: { width: 1, height: 1, data: new Float32Array([0.5]) },
    dyeComponent: state,
    dyeComponentRecipe: EDGE_DYE_COMPONENT_RECIPE_R13,
    paperDiffuseReflectance: 0.98,
  });
  const expectedWeight = EDGE_DYE_COMPONENT_RECIPE_R13.initialSecondaryFraction
    + 0.7 / 5;
  assert.deepEqual(Array.from(base.data.slice(0, 3)), expectedKubelkaMunkRgb(
    [91, 132, 154],
    expectedWeight,
    EDGE_DYE_COMPONENT_RECIPE_R13,
    0.98,
  ));
});

test("equal residual ratios are invariant to common visible-mass scale", () => {
  const outputs = [0.01, 0.1, 1].map((total) => renderOneDyePixel({
    state: makeDyeState({
      mobileTotal: [total],
      mobileResidual: [total * 0.1],
    }),
  }));
  assert.deepEqual(outputs[0], outputs[1]);
  assert.deepEqual(outputs[1], outputs[2]);
});

test("zero initial fraction and zero residual apply no secondary color", () => {
  const recipe = freezeDyeComponentRecipe({
    ...EDGE_DYE_COMPONENT_RECIPE_R16,
    id: "zero-secondary-neutral-test",
    revision: 1,
    initialSecondaryFraction: 0,
  });
  const state = makeDyeState({ recipe });
  const expectedBase = [91, 132, 154, 200];
  assert.deepEqual(renderOneDyePixel({ state, recipe }), expectedBase);
  assert.deepEqual(renderOneDyePixel({
    composite: compositeDyeWellMixedControlOptical,
    state,
    recipe,
  }), expectedBase);
});

test("maximum valid residual approaches the authored secondary endpoint", () => {
  const f0 = EDGE_DYE_COMPONENT_RECIPE_R13.initialSecondaryFraction;
  const actual = renderOneDyePixel({
    state: makeDyeState({
      mobileTotal: [1],
      mobileResidual: [(1 - f0) * (1 - 2 ** -20)],
    }),
  });
  assert.ok(Math.abs(actual[0] - EDGE_DYE_COMPONENT_RECIPE_R13.secondaryRed) <= 1);
  assert.ok(Math.abs(actual[1] - EDGE_DYE_COMPONENT_RECIPE_R13.secondaryGreen) <= 1);
  assert.ok(Math.abs(actual[2] - EDGE_DYE_COMPONENT_RECIPE_R13.secondaryBlue) <= 1);
  assert.equal(actual[3], 200);
});

test("paper diffuse reflectance participates in the K-M mixture", () => {
  const bright = renderOneDyePixel({ paperDiffuseReflectance: 1 });
  const dim = renderOneDyePixel({ paperDiffuseReflectance: 0.72 });
  assert.notDeepEqual(bright.slice(0, 3), dim.slice(0, 3));
  assert.equal(bright[3], dim[3]);
});

test("dye Optical rejects every malformed total/residual plane before mutation", () => {
  const cases = [
    ["mobileTotalMass", [Number.NaN], /mobileTotalMass values/],
    ["mobileSecondaryResidualMass", [Number.POSITIVE_INFINITY], /mobileSecondaryResidualMass values/],
    ["adsorbedTotalMass", [-0.1], /adsorbedTotalMass values/],
    ["adsorbedSecondaryResidualMass", [1], /reconstruct non-negative/],
    ["depthTotalMass", [Number.NaN], /depthTotalMass values/],
    ["depthSecondaryResidualMass", [-1], /reconstruct non-negative/],
  ];
  for (const [field, values, pattern] of cases) {
    const state = makeDyeState({
      overrides: { [field]: new Float32Array(values) },
    });
    const output = {
      width: 1,
      height: 1,
      data: new Uint8ClampedArray([9, 8, 7, 6]),
    };
    assert.throws(() => renderOneDyePixel({ state, output }), pattern);
    assert.deepEqual(Array.from(output.data), [9, 8, 7, 6]);
  }
});

test("dye Optical rejects state version or recipe mismatch before mutation", () => {
  for (const overrides of [
    { stateModelVersion: "legacy-state" },
    { revision: 11 },
    { componentModelVersion: "dye-component-js-r11" },
    { componentRecipeSchemaVersion: 10 },
    { initialSecondaryFraction: 0.5 },
  ]) {
    const output = {
      width: 1,
      height: 1,
      data: new Uint8ClampedArray([9, 8, 7, 6]),
    };
    assert.throws(() => renderOneDyePixel({
      state: makeDyeState({ overrides }),
      output,
    }), /stateModelVersion|identity must match/);
    assert.deepEqual(Array.from(output.data), [9, 8, 7, 6]);
  }
});

test("dye Optical validates paper and concentration before output mutation", () => {
  for (const paperDiffuseReflectance of [-0.1, 1.1, Number.NaN]) {
    const output = {
      width: 1,
      height: 1,
      data: new Uint8ClampedArray([9, 8, 7, 6]),
    };
    assert.throws(() => renderOneDyePixel({
      paperDiffuseReflectance,
      output,
    }), /paperDiffuseReflectance/);
    assert.deepEqual(Array.from(output.data), [9, 8, 7, 6]);
  }

  const output = {
    width: 1,
    height: 1,
    data: new Uint8ClampedArray([9, 8, 7, 6]),
  };
  assert.throws(() => compositeDyeEdgeOptical({
    pixelWidth: 1,
    pixelHeight: 1,
    baseRgba: { width: 1, height: 1, data: new Uint8ClampedArray([1, 2, 3, 4]) },
    concentration: { width: 1, height: 1, data: new Float32Array([NaN]) },
    dyeComponent: makeDyeState(),
    dyeComponentRecipe: EDGE_DYE_COMPONENT_RECIPE_R13,
    paperDiffuseReflectance: 0.98,
    output,
  }), /concentration data must be finite/);
  assert.deepEqual(Array.from(output.data), [9, 8, 7, 6]);
});

test("dual-shading Optical does not read deprecated Contact or raster inputs", () => {
  const options = {
    pixelWidth: 1,
    pixelHeight: 1,
    baseRgba: {
      width: 1,
      height: 1,
      data: new Uint8ClampedArray([29, 55, 40, 200]),
    },
    concentration: { width: 1, height: 1, data: new Float32Array([0.5]) },
    dyeComponent: makeDyeState(),
    dyeComponentRecipe: EDGE_DYE_COMPONENT_RECIPE_R13,
    paperDiffuseReflectance: 0.98,
  };
  for (const key of ["contactAlpha", "rasterScale", "edgeBandCssPixels"]) {
    Object.defineProperty(options, key, {
      enumerable: true,
      get() {
        throw new Error(`deprecated ${key} must not be read`);
      },
    });
  }
  assert.doesNotThrow(() => compositeDyeEdgeOptical(options));
  assert.equal(options.baseRgba.data[3], 200);
});

function renderOneFiniteLoadingPixel({
  composite = compositeDyeFiniteLoadingTransportedOptical,
  state = makeDyeState(),
  recipe = EDGE_DYE_COMPONENT_RECIPE_R13,
  alpha = 255,
  rgb = [29, 55, 40],
  density = 0.5,
  paperOpticalProfile = WARM_WHITE_PAPER_OPTICAL_PROFILE_R1,
  output,
} = {}) {
  const base = {
    width: 1,
    height: 1,
    data: new Uint8ClampedArray([...rgb, alpha]),
  };
  const before = Array.from(base.data);
  const result = composite({
    pixelWidth: 1,
    pixelHeight: 1,
    baseRgba: base,
    concentration: {
      width: 1,
      height: 1,
      data: new Float32Array([density]),
    },
    dyeComponent: state,
    dyeComponentRecipe: recipe,
    paperOpticalProfile,
    output,
  });
  assert.deepEqual(Array.from(base.data), before);
  return { result, rgba: Array.from(result.data), base };
}

test("finite-loading Optical publishes honest frozen model and output metadata", () => {
  assert.equal(
    finiteLoadingDyeOpticalModelVersion,
    "three-channel-effective-optical-density-v2",
  );
  assert.equal(
    paperOpticalProfileModelVersion,
    "paper-optical-profile-srgb-v1",
  );
  assert.equal(paperOpticalProfileSchemaVersion, 1);
  assert.equal(
    FINITE_LOADING_DYE_OPTICAL_OUTPUT_METADATA.opticalModelVersion,
    finiteLoadingDyeOpticalModelVersion,
  );
  assert.equal(FINITE_LOADING_DYE_OPTICAL_OUTPUT_METADATA.alphaMode, "opaque");
  assert.equal(FINITE_LOADING_DYE_OPTICAL_OUTPUT_METADATA.colorSpace, "srgb");
  assert.equal(FINITE_LOADING_DYE_OPTICAL_OUTPUT_METADATA.spectral, false);
  assert.equal(FINITE_LOADING_DYE_OPTICAL_OUTPUT_METADATA.scattering, false);
  assert.equal(finiteLoadingDyeOpticalReferenceVisibleMass, 0.14);
  assert.equal(
    FINITE_LOADING_DYE_OPTICAL_OUTPUT_METADATA.referenceVisibleMass,
    finiteLoadingDyeOpticalReferenceVisibleMass,
  );
  assert.equal(
    FINITE_LOADING_DYE_OPTICAL_OUTPUT_METADATA.calibration,
    "engine-visible-mass-reference-r1",
  );
  assert.deepEqual(
    FINITE_LOADING_DYE_OPTICAL_OUTPUT_METADATA.visiblePhases,
    ["mobile", "adsorbed"],
  );
  assert.deepEqual(
    FINITE_LOADING_DYE_OPTICAL_OUTPUT_METADATA.excludedPhases,
    ["depth"],
  );
  assert.ok(Object.isFrozen(FINITE_LOADING_DYE_OPTICAL_OUTPUT_METADATA));
  assert.ok(Object.isFrozen(
    FINITE_LOADING_DYE_OPTICAL_OUTPUT_METADATA.visiblePhases,
  ));
  assert.ok(Object.isFrozen(WARM_WHITE_PAPER_OPTICAL_PROFILE_R1));
  assert.deepEqual(
    [
      WARM_WHITE_PAPER_OPTICAL_PROFILE_R1.red,
      WARM_WHITE_PAPER_OPTICAL_PROFILE_R1.green,
      WARM_WHITE_PAPER_OPTICAL_PROFILE_R1.blue,
    ],
    [255, 254, 250],
  );
});

test("finite-loading Optical returns opaque paper support and excludes depth mass", () => {
  const paper = [255, 254, 250, 255];
  assert.deepEqual(renderOneFiniteLoadingPixel({
    alpha: 0,
    state: makeDyeState({
      mobileTotal: [1],
      depthTotal: [100],
    }),
  }).rgba, paper);
  assert.deepEqual(renderOneFiniteLoadingPixel({
    alpha: 255,
    state: makeDyeState({
      mobileTotal: [0],
      adsorbedTotal: [0],
      depthTotal: [100],
    }),
  }).rgba, paper);
});

test("finite-loading transported and well-mixed outputs are byte-exact when residual is zero", () => {
  for (const state of [
    makeDyeState({ mobileTotal: [0.25], adsorbedTotal: [0] }),
    makeDyeState({ mobileTotal: [0.25], adsorbedTotal: [0.75] }),
    makeDyeState({ mobileTotal: [0], adsorbedTotal: [0] }),
  ]) {
    const transported = renderOneFiniteLoadingPixel({ state }).rgba;
    const wellMixed = renderOneFiniteLoadingPixel({
      composite: compositeDyeFiniteLoadingWellMixedControlOptical,
      state,
    }).rgba;
    assert.deepEqual(transported, wellMixed);
    assert.equal(transported[3], 255);
  }
});

test("finite-loading Optical responds monotonically to absolute visible mass", () => {
  const reference = finiteLoadingDyeOpticalReferenceVisibleMass;
  const outputs = [reference / 8, reference / 2, reference, reference * 2].map((mass) =>
    renderOneFiniteLoadingPixel({
      state: makeDyeState({ mobileTotal: [mass] }),
    }).rgba);
  assert.notDeepEqual(outputs[0], outputs[1]);
  assert.notDeepEqual(outputs[1], outputs[2]);
  assert.notDeepEqual(outputs[2], outputs[3]);
  for (let index = 1; index < outputs.length; index += 1) {
    for (let channel = 0; channel < 3; channel += 1) {
      assert.ok(outputs[index][channel] <= outputs[index - 1][channel]);
    }
    assert.equal(outputs[index][3], 255);
  }
});

test("finite-loading reference-mass pure species recover authored paper-backed endpoints", () => {
  const f0 = EDGE_DYE_COMPONENT_RECIPE_R13.initialSecondaryFraction;
  const reference = finiteLoadingDyeOpticalReferenceVisibleMass;
  const primary = renderOneFiniteLoadingPixel({
    state: makeDyeState({
      mobileTotal: [reference],
      mobileResidual: [-f0 * reference],
    }),
  }).rgba;
  const secondary = renderOneFiniteLoadingPixel({
    state: makeDyeState({
      mobileTotal: [reference],
      mobileResidual: [(1 - f0) * reference],
    }),
  }).rgba;
  assert.deepEqual(primary, [91, 132, 154, 255]);
  assert.deepEqual(secondary, [
    EDGE_DYE_COMPONENT_RECIPE_R13.secondaryRed,
    EDGE_DYE_COMPONENT_RECIPE_R13.secondaryGreen,
    EDGE_DYE_COMPONENT_RECIPE_R13.secondaryBlue,
    255,
  ]);
});

test("finite-loading Optical applies base alpha as paper-backed coverage", () => {
  const f0 = EDGE_DYE_COMPONENT_RECIPE_R13.initialSecondaryFraction;
  const reference = finiteLoadingDyeOpticalReferenceVisibleMass;
  const coverageByte = 128;
  const result = renderOneFiniteLoadingPixel({
    alpha: coverageByte,
    state: makeDyeState({
      mobileTotal: [reference],
      mobileResidual: [-f0 * reference],
    }),
  }).rgba;
  const paper = [255, 254, 250];
  const endpoint = [91, 132, 154];
  const coverage = coverageByte / 255;
  const expected = paper.map((paperChannel, channel) => {
    const paperLinear = srgbToLinearForTest(paperChannel);
    const endpointLinear = srgbToLinearForTest(endpoint[channel]);
    return Math.round(linearToSrgbForTest(
      paperLinear * (1 - coverage) + endpointLinear * coverage,
    ) * 255);
  });
  assert.deepEqual(result, [...expected, 255]);
});

test("finite-loading transported output responds to residual while preserving total loading", () => {
  const total = finiteLoadingDyeOpticalReferenceVisibleMass * 0.8;
  const state = makeDyeState({
    mobileTotal: [total],
    mobileResidual: [total * 0.2],
  });
  const transported = renderOneFiniteLoadingPixel({ state }).rgba;
  const wellMixed = renderOneFiniteLoadingPixel({
    composite: compositeDyeFiniteLoadingWellMixedControlOptical,
    state,
  }).rgba;
  assert.notDeepEqual(transported, wellMixed);
  assert.equal(transported[3], 255);
  assert.equal(wellMixed[3], 255);
});

test("finite-loading Optical pins non-square dye-state width, height, and row stride", () => {
  const sixZeros = () => new Array(6).fill(0);
  const reference = finiteLoadingDyeOpticalReferenceVisibleMass;
  const actual = renderOneFiniteLoadingPixel({
    state: makeDyeState({
      width: 2,
      height: 3,
      mobileTotal: new Array(6).fill(reference),
      mobileResidual: [-0.2, -0.1, 0.4, 0.6, -0.22, 0.72]
        .map((residual) => residual * reference),
      adsorbedTotal: sixZeros(),
      adsorbedResidual: sixZeros(),
    }),
  }).rgba;
  // One output pixel maps to component coordinate (0.5, 1.0), so the middle
  // 2-wide row contributes the exact 0.5 average of residuals 0.4 and 0.6.
  const expected = renderOneFiniteLoadingPixel({
    state: makeDyeState({
      mobileTotal: [reference],
      mobileResidual: [0.5 * reference],
    }),
  }).rgba;
  const swappedAxisCandidate = renderOneFiniteLoadingPixel({
    state: makeDyeState({
      mobileTotal: [reference],
      mobileResidual: [0.25 * reference],
    }),
  }).rgba;
  const swappedStrideCandidate = renderOneFiniteLoadingPixel({
    state: makeDyeState({
      mobileTotal: [reference],
      mobileResidual: [0.19 * reference],
    }),
  }).rgba;
  assert.deepEqual(actual, expected);
  assert.notDeepEqual(actual, swappedAxisCandidate);
  assert.notDeepEqual(actual, swappedStrideCandidate);
});

test("finite-loading Optical validates state, profile, endpoint, and distinct output before mutation", () => {
  const sentinel = () => ({
    width: 1,
    height: 1,
    data: new Uint8ClampedArray([9, 8, 7, 6]),
  });
  const malformedStateOutput = sentinel();
  assert.throws(() => renderOneFiniteLoadingPixel({
    state: makeDyeState({
      overrides: { mobileTotalMass: new Float32Array([Number.NaN]) },
    }),
    output: malformedStateOutput,
  }), /mobileTotalMass values/);
  assert.deepEqual(Array.from(malformedStateOutput.data), [9, 8, 7, 6]);

  const malformedProfileOutput = sentinel();
  assert.throws(() => renderOneFiniteLoadingPixel({
    paperOpticalProfile: {
      ...WARM_WHITE_PAPER_OPTICAL_PROFILE_R1,
      profileModelVersion: "unknown-paper-profile",
    },
    output: malformedProfileOutput,
  }), /profileModelVersion/);
  assert.deepEqual(Array.from(malformedProfileOutput.data), [9, 8, 7, 6]);

  const brightEndpointOutput = sentinel();
  assert.throws(() => renderOneFiniteLoadingPixel({
    paperOpticalProfile: {
      ...WARM_WHITE_PAPER_OPTICAL_PROFILE_R1,
      id: "dim-blue-paper-test",
      blue: 110,
    },
    output: brightEndpointOutput,
  }), /primary endpoint\.blue must not be brighter/);
  assert.deepEqual(Array.from(brightEndpointOutput.data), [9, 8, 7, 6]);

  const base = {
    width: 1,
    height: 1,
    data: new Uint8ClampedArray([29, 55, 40, 255]),
  };
  const before = Array.from(base.data);
  assert.throws(() => compositeDyeFiniteLoadingTransportedOptical({
    pixelWidth: 1,
    pixelHeight: 1,
    baseRgba: base,
    concentration: { width: 1, height: 1, data: new Float32Array([0.5]) },
    dyeComponent: makeDyeState(),
    dyeComponentRecipe: EDGE_DYE_COMPONENT_RECIPE_R13,
    paperOpticalProfile: WARM_WHITE_PAPER_OPTICAL_PROFILE_R1,
    output: base,
  }), /output must be distinct/);
  assert.deepEqual(Array.from(base.data), before);

  const aliasedView = {
    width: 1,
    height: 1,
    data: new Uint8ClampedArray(base.data.buffer),
  };
  assert.throws(() => compositeDyeFiniteLoadingTransportedOptical({
    pixelWidth: 1,
    pixelHeight: 1,
    baseRgba: base,
    concentration: { width: 1, height: 1, data: new Float32Array([0.5]) },
    dyeComponent: makeDyeState(),
    dyeComponentRecipe: EDGE_DYE_COMPONENT_RECIPE_R13,
    paperOpticalProfile: WARM_WHITE_PAPER_OPTICAL_PROFILE_R1,
    output: aliasedView,
  }), /output must be distinct/);
  assert.deepEqual(Array.from(base.data), before);
});

test("warm-white paper id and revision cannot be silently retuned", () => {
  const sentinel = () => ({
    width: 1,
    height: 1,
    data: new Uint8ClampedArray([9, 8, 7, 6]),
  });
  const cases = [
    {
      ...WARM_WHITE_PAPER_OPTICAL_PROFILE_R1,
      red: 254,
    },
    {
      ...WARM_WHITE_PAPER_OPTICAL_PROFILE_R1,
      profileModelVersion: "paper-optical-profile-srgb-retuned",
    },
    {
      ...WARM_WHITE_PAPER_OPTICAL_PROFILE_R1,
      profileSchemaVersion: 2,
    },
  ];
  for (const paperOpticalProfile of cases) {
    const output = sentinel();
    assert.throws(() => renderOneFiniteLoadingPixel({
      paperOpticalProfile,
      output,
    }), /registered paperOpticalProfile identity|profileModelVersion|profileSchemaVersion/);
    assert.deepEqual(Array.from(output.data), [9, 8, 7, 6]);
  }

  const custom = renderOneFiniteLoadingPixel({
    paperOpticalProfile: {
      ...WARM_WHITE_PAPER_OPTICAL_PROFILE_R1,
      id: "explicit-custom-warm-paper",
      red: 254,
    },
  });
  assert.equal(custom.rgba[3], 255);
});

test("finite-loading opt-in leaves the legacy K-M byte path unchanged", () => {
  const legacyBefore = renderOneDyePixel();
  renderOneFiniteLoadingPixel();
  const legacyAfter = renderOneDyePixel();
  assert.deepEqual(legacyAfter, legacyBefore);
  assert.equal(legacyAfter[3], 200);
});
