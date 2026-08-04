/**
 * BrandProfile → composer template mapping (FASE 2, R3).
 *
 * The brand theme pack is applied to the composition engine ONLY as
 * `templateOverrides` over the canonical `ComposeTemplate` — the same
 * pattern the EPUB writer uses to force `tocDepth: 3`. There is no parallel
 * brand representation: exports pass these overrides to
 * `composeProjectPreview` and read the same object to style their output.
 *
 * Pure and deterministic: same profile → same overrides.
 */

import type { ComposeTemplate } from '@/lib/compose/compose';
import { getBrandColor, type BrandProfile } from './brand-profile';

/**
 * Maps a BrandProfile to composer template overrides. Only fields declared by
 * the profile are overridden; everything else keeps the pagination-config
 * defaults (G1: a partial profile never breaks the base template).
 */
export function brandProfileToTemplateOverrides(
  profile: Pick<BrandProfile, 'palette' | 'typography'>,
): Partial<ComposeTemplate> {
  const overrides: Partial<ComposeTemplate> = {};

  if (profile.typography.display) {
    overrides.displayFontFamily = profile.typography.display.family;
  }
  if (profile.typography.body) {
    overrides.bodyFontFamily = profile.typography.body.family;
    // `fontFamily` is forwarded to canvas measurers; body is the text voice.
    overrides.fontFamily = profile.typography.body.family;
  }

  const ink = getBrandColor(profile, 'ink')?.hex;
  const paper = getBrandColor(profile, 'paper')?.hex;
  const accent = getBrandColor(profile, 'accent')?.hex;
  const accentMuted = getBrandColor(profile, 'accentMuted')?.hex;

  if (ink) {
    overrides.inkColor = ink;
    // Ink is the color of authority: headings and body text.
    overrides.headingColor = ink;
    overrides.bodyColor = ink;
  }
  if (paper) overrides.paperColor = paper;
  if (accent) overrides.accentColor = accent;
  if (accentMuted) overrides.accentMutedColor = accentMuted;

  return overrides;
}
