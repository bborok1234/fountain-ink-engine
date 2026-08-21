export {
  ACTIVE_CONTACT_CATALOG_ID,
  M_RADIUS,
  M_STROKE_EM,
  NIB_IDS,
  NIB_PROFILES,
  ROUND_NIB_RATIOS,
  SUPPORTED_CONTACT_CATALOG_IDS,
  getNibGeometry,
  getNibProfile,
  getPhysicalNibGeometry,
  getRoundMorphDelta,
  shapeNibDensityVariation,
} from "./nib-profiles.js";
export {
  geometryExpansion,
  getScaledNibGeometry,
  morphAlpha,
  morphologyPass,
  scaleNibGeometry,
} from "./morphology.js";
export {
  GLYPH_CONTACT_VARIATION_CALIBRATION,
  getGlyphContactGeometry,
} from "./glyph-contact.js";
export { analyzeContactAlpha } from "./mask-metrics.js";
