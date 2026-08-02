/**
 * Logical canvas geometry shared by the DOM cover studio, the client-side
 * `html-to-image` render and the server-side export renderer. Every surface
 * (cover / back-cover) is composed in this coordinate space and only scaled
 * with CSS for display, so what the user sees is exactly what gets exported.
 */
export const COVER_SURFACE_CANVAS = {
  width: 400,
  height: 600,
} as const;

/**
 * Print geometry for full-cover (portada + lomo + contraportada) exports.
 * Centralized here so a later phase can compute the final PDF trim size
 * without touching the editor. All values in millimeters unless noted.
 */
export const COVER_PRINT_GEOMETRY = {
  /** Trim size of a single page (matches the 2:3 canvas aspect ratio). */
  trimWidthMm: 140,
  trimHeightMm: 210,
  /** Standard bleed added on every outer edge for print. */
  bleedMm: 3,
  /** Safety margin that keeps text away from trim and fold lines. */
  safeMarginMm: 10,
  /** Paper thickness per page used for spine estimation (90 g/m² offset). */
  paperThicknessMmPerPage: 0.09,
} as const;

/**
 * Estimated spine width for a given interior page count. Phase posterior:
 * use this to lay out portada + lomo + contraportada in a single spread.
 */
export function computeSpineWidthMm(pageCount: number): number {
  const pages = Math.max(0, Math.trunc(pageCount));
  return Number((pages * COVER_PRINT_GEOMETRY.paperThicknessMmPerPage).toFixed(2));
}

/** Full spread width (back + spine + front) including bleed on both sides. */
export function computeFullCoverSpreadWidthMm(pageCount: number): number {
  const spine = computeSpineWidthMm(pageCount);
  const { trimWidthMm, bleedMm } = COVER_PRINT_GEOMETRY;
  return Number((trimWidthMm * 2 + spine + bleedMm * 2).toFixed(2));
}

export const COVER_TEXT_LAYOUT = {
  titleTop: 0.28,
  subtitleTop: 0.5,
  authorTop: 0.72,
  titleWidth: 0.88,
  subtitleWidth: 0.82,
  authorWidth: 0.82,
  titleFontSize: 32,
  subtitleFontSize: 16,
  authorFontSize: 15,
  titleLineHeight: 1.1,
} as const;

export const BACK_COVER_TEXT_LAYOUT = {
  titleTop: 0.18,
  bodyTop: 0.36,
  authorBioTop: 0.78,
  titleWidth: 0.72,
  bodyWidth: 0.72,
  authorBioWidth: 0.62,
  titleLeft: 0.16,
  bodyLeft: 0.16,
  authorBioLeft: 0.16,
  titleFontSize: 28,
  bodyFontSize: 16,
  authorBioFontSize: 13,
  titleLineHeight: 1.1,
  bodyLineHeight: 1.45,
  authorBioLineHeight: 1.35,
} as const;
