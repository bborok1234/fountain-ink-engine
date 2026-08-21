const clamp = (value, minimum, maximum) =>
  Math.min(maximum, Math.max(minimum, value));

export const M_RADIUS = 3.35;

// Nanum Pen Script's median M-like core stroke at the 26–28px reference anchor.
export const M_STROKE_EM = 0.09;

export const ACTIVE_CONTACT_CATALOG_ID = "fountain-nib-catalog-r2";
export const SUPPORTED_CONTACT_CATALOG_IDS = Object.freeze([
  "standard-nib-ladder-r1",
  ACTIVE_CONTACT_CATALOG_ID,
]);

export const ROUND_NIB_RATIOS = Object.freeze({
  UEF: 0.54,
  EF: 0.67,
  F: 0.79,
  M: 1,
  B: 1.26,
  EB: 1.95,
});

const ROUND_CONTACT_ASPECT = 0.62;
const DEFAULT_PHYSICAL_NIB_ANGLE = -Math.PI * 0.22;

export const NIB_PROFILES = Object.freeze({
  UEF: Object.freeze({
    id: "UEF",
    ratio: ROUND_NIB_RATIOS.UEF,
    geometry: "round",
    flowOffset: -0.11,
    shadingMultiplier: 0.5,
    shadingExponent: 1,
    widthVariation: 0,
  }),
  EF: Object.freeze({
    id: "EF",
    ratio: ROUND_NIB_RATIOS.EF,
    geometry: "round",
    flowOffset: -0.09,
    shadingMultiplier: 0.62,
    shadingExponent: 1,
    widthVariation: 0,
  }),
  F: Object.freeze({
    id: "F",
    ratio: ROUND_NIB_RATIOS.F,
    geometry: "round",
    flowOffset: -0.045,
    shadingMultiplier: 0.8,
    shadingExponent: 1,
    widthVariation: 0.015,
  }),
  M: Object.freeze({
    id: "M",
    ratio: ROUND_NIB_RATIOS.M,
    geometry: "round",
    flowOffset: 0,
    shadingMultiplier: 1.02,
    shadingExponent: 1,
    widthVariation: 0.04,
  }),
  B: Object.freeze({
    id: "B",
    ratio: ROUND_NIB_RATIOS.B,
    geometry: "round",
    flowOffset: 0.07,
    shadingMultiplier: 1.48,
    shadingExponent: 0.92,
    widthVariation: 0.07,
  }),
  EB: Object.freeze({
    id: "EB",
    ratio: ROUND_NIB_RATIOS.EB,
    geometry: "round",
    flowOffset: 0.11,
    shadingMultiplier: 1.78,
    shadingExponent: 0.84,
    widthVariation: 0.08,
  }),
  SU: Object.freeze({
    id: "SU",
    geometry: "stub",
    flowOffset: 0.045,
    shadingMultiplier: 1.2,
    shadingExponent: 0.92,
    widthVariation: 0.025,
    horizontalRatio: ROUND_NIB_RATIOS.EB,
    verticalRatio: ROUND_NIB_RATIOS.F,
    physicalRatio: 1.45,
    physicalAspect: 0.28,
    physicalAngle: DEFAULT_PHYSICAL_NIB_ANGLE,
  }),
  CM: Object.freeze({
    id: "CM",
    geometry: "cross-music-inspired",
    flowOffset: 0.065,
    shadingMultiplier: 1.3,
    shadingExponent: 0.9,
    widthVariation: 0.025,
    horizontalRatio: ROUND_NIB_RATIOS.F,
    verticalRatio: ROUND_NIB_RATIOS.EB,
    physicalRatio: 1.55,
    physicalAspect: 0.28,
    physicalAngle: DEFAULT_PHYSICAL_NIB_ANGLE + Math.PI / 2,
  }),
});

export const NIB_IDS = Object.freeze(Object.keys(NIB_PROFILES));

/** @param {string} nibId */
export function getNibProfile(nibId) {
  if (typeof nibId !== "string" || !Object.hasOwn(NIB_PROFILES, nibId)) {
    throw new TypeError(`Unknown nibId: ${String(nibId)}.`);
  }
  return NIB_PROFILES[nibId];
}

/**
 * @param {string} nibId
 * @param {number} normalizedAbsorption
 * @param {Record<string, unknown>} recipe
 */
/** @param {string} nibId @param {number} value */
export function shapeNibDensityVariation(nibId, value) {
  const variation = clamp(Number(value) || 0, -1, 1);
  if (variation === 0) return 0;
  const exponent = getNibProfile(nibId).shadingExponent;
  return Math.sign(variation) * Math.pow(Math.abs(variation), exponent);
}

/** @param {number} fontSize @param {number} ratio */
export function getRoundMorphDelta(fontSize, ratio) {
  const mStroke = fontSize * M_STROKE_EM;
  return mStroke * (ratio - ROUND_NIB_RATIOS.M);
}

/** @param {string} nibId @param {number} fontSize */
export function getNibGeometry(nibId, fontSize) {
  const profile = getNibProfile(nibId);
  const mStroke = fontSize * M_STROKE_EM;
  if (profile.geometry === "round") {
    return Object.freeze({
      kind: "round",
      mStroke,
      morphDelta: getRoundMorphDelta(fontSize, profile.ratio),
    });
  }

  const rawHorizontal = getRoundMorphDelta(fontSize, profile.horizontalRatio);
  return Object.freeze({
    kind: "anisotropic",
    mStroke,
    horizontalMorphDelta: rawHorizontal,
    verticalMorphDelta: getRoundMorphDelta(fontSize, profile.verticalRatio),
  });
}

/** @param {string} nibId */
export function getPhysicalNibGeometry(nibId) {
  const profile = getNibProfile(nibId);
  if (profile.geometry === "stub" || profile.geometry === "cross-music-inspired") {
    return Object.freeze({
      radius: M_RADIUS * profile.physicalRatio,
      aspect: profile.physicalAspect,
      angle: profile.physicalAngle,
    });
  }
  return Object.freeze({
    radius: M_RADIUS * profile.ratio,
    aspect: ROUND_CONTACT_ASPECT,
    angle: DEFAULT_PHYSICAL_NIB_ANGLE,
  });
}
