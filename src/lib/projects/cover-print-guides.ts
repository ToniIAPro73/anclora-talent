/**
 * Cover Studio v2 — print guides (08C): bleed and safe area. They are view-only overlays derived from the
 * surface width and never change object positions or the exported image.
 *
 * The surface does not carry a physical trim size, so the guides assume the 6in (152.4mm) trim the cover
 * canvas is drawn for: 1mm = width / 152.4 surface px. The surface edge is the outer (bleed) edge; the trim
 * line sits `BLEED_MM` inside it and the safe area `SAFE_MARGIN_MM` further inside the trim.
 */

import type { SafeAreaSpec } from './design-surface';

export const ASSUMED_TRIM_WIDTH_MM = 152.4;
export const BLEED_MM = 3;
export const SAFE_MARGIN_MM = 5;

const round = (value: number) => Math.round(value * 10) / 10;

export function pxPerMm(surfaceWidth: number): number {
  return surfaceWidth / ASSUMED_TRIM_WIDTH_MM;
}

/** Distance from the surface edge to the trim line. */
export function bleedInset(surfaceWidth: number): number {
  return round(BLEED_MM * pxPerMm(surfaceWidth));
}

/** The user's own safe area when the surface defines one, otherwise the default derived from bleed + margin. */
export function resolveSafeArea(surface: { width: number; safeArea?: SafeAreaSpec }): SafeAreaSpec {
  if (surface.safeArea) return surface.safeArea;
  const inset = round((BLEED_MM + SAFE_MARGIN_MM) * pxPerMm(surface.width));
  return { top: inset, right: inset, bottom: inset, left: inset };
}
