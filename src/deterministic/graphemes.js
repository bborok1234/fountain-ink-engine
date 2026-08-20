/**
 * Split literal text into grapheme clusters with the HTML reference fallback.
 * Callers that persist results should also record their segmentation/runtime
 * context because `Intl.Segmenter` is supplied by the host.
 *
 * @param {string} value
 * @param {string} [locale]
 * @returns {string[]}
 */
export function splitGraphemes(value, locale = "ko") {
  if (typeof Intl !== "undefined" && Intl.Segmenter) {
    const segmenter = new Intl.Segmenter(locale, { granularity: "grapheme" });
    return Array.from(segmenter.segment(value), ({ segment }) => segment);
  }
  return Array.from(value);
}

export const graphemes = splitGraphemes;
