/**
 * Canonical unit conversion utilities for document layout and typography.
 *
 * Internal standard unit: POINTS (pt).
 *
 * Conversions:
 * - 20 twips = 1 pt (OOXML standard for margins, indents, spacing)
 * - 2 half-points = 1 pt (OOXML standard for w:sz font sizes)
 * - 72 pt = 1 inch
 * - 25.4 mm = 1 inch = 72 pt (1 mm ≈ 2.83465 pt)
 * - 1 pt = 96/72 px = 1.333333 px (CSS 96 DPI reference)
 * - 1 px = 72/96 pt = 0.75 pt
 */

export const TWIPS_PER_POINT = 20;
export const HALF_POINTS_PER_POINT = 2;
export const POINTS_PER_INCH = 72;
export const MM_PER_INCH = 25.4;
export const POINTS_PER_MM = POINTS_PER_INCH / MM_PER_INCH;
export const CSS_PX_PER_POINT = 96 / 72; // 4/3 ≈ 1.333333
export const POINTS_PER_CSS_PX = 72 / 96; // 3/4 = 0.75

export function twipsToPoints(twips: number): number {
  if (!Number.isFinite(twips)) return 0;
  return twips / TWIPS_PER_POINT;
}

export function pointsToTwips(pt: number): number {
  if (!Number.isFinite(pt)) return 0;
  return Math.round(pt * TWIPS_PER_POINT);
}

export function halfPointsToPoints(halfPt: number): number {
  if (!Number.isFinite(halfPt)) return 0;
  return halfPt / HALF_POINTS_PER_POINT;
}

export function pointsToHalfPoints(pt: number): number {
  if (!Number.isFinite(pt)) return 0;
  return Math.round(pt * HALF_POINTS_PER_POINT);
}

export function inchesToPoints(inches: number): number {
  if (!Number.isFinite(inches)) return 0;
  return inches * POINTS_PER_INCH;
}

export function pointsToInches(pt: number): number {
  if (!Number.isFinite(pt)) return 0;
  return pt / POINTS_PER_INCH;
}

export function mmToPoints(mm: number): number {
  if (!Number.isFinite(mm)) return 0;
  return mm * POINTS_PER_MM;
}

export function pointsToMm(pt: number): number {
  if (!Number.isFinite(pt)) return 0;
  return pt / POINTS_PER_MM;
}

export function pointsToCssPixels(pt: number): number {
  if (!Number.isFinite(pt)) return 0;
  return pt * CSS_PX_PER_POINT;
}

export function cssPixelsToPoints(px: number): number {
  if (!Number.isFinite(px)) return 0;
  return px * POINTS_PER_CSS_PX;
}
