/**
 * U6: composition model — typography size, line-height and margins that shape
 * how a document is composed for preview/export, resolvable at two scopes:
 *
 * - per-project overrides live in `project_documents.metadata.composition`
 *   (jsonb, no migration required);
 * - per-user defaults live in
 *   `user_preferences.editor_preferences.compositionDefaults`.
 *
 * Resolution hierarchy (strict): project > user defaults > system defaults.
 * Brand resolution hierarchy: explicit per-project id (including the explicit
 * "no brand" marker stored as `metadata.brandChoice: 'none'`) > active
 * default profile > null.
 *
 * Everything in this module is pure and safe to run on client and server.
 */

import type { BrandProfile } from '@/lib/brand/brand-profile';

/** Margin box in px — same unit space as `MARGIN_PRESETS` and the export query. */
export interface CompositionMargins {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface CompositionSettings {
  fontFamily?: string;
  /** Body font size in pt (step 0.5, range 6–72). */
  fontSizePt?: number;
  /** Unitless line-height multiplier (step 0.05). */
  lineHeight?: number;
  margins?: CompositionMargins;
}

export type ResolvedComposition = Required<CompositionSettings>;

/** Provenance of an extracted composition (drives the modal source badge). */
export type CompositionSource = 'docx-styles' | 'not-extracted';

export const SYSTEM_COMPOSITION_DEFAULTS: ResolvedComposition = {
  fontFamily: 'Georgia',
  fontSizePt: 12,
  lineHeight: 1.5,
  // Mirrors MARGIN_PRESETS.normal (kept inline so this module stays pure and
  // dependency-free).
  margins: { top: 24, bottom: 24, left: 24, right: 24 },
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function parseMargins(value: unknown): CompositionMargins | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const raw = value as Record<string, unknown>;
  if (
    isFiniteNumber(raw.top) &&
    isFiniteNumber(raw.bottom) &&
    isFiniteNumber(raw.left) &&
    isFiniteNumber(raw.right)
  ) {
    return { top: raw.top, bottom: raw.bottom, left: raw.left, right: raw.right };
  }
  return undefined;
}

/**
 * Safe jsonb parser: accepts any unknown payload (DB jsonb, form JSON) and
 * returns a sanitized CompositionSettings, or null when nothing valid is
 * present. Never throws.
 */
export function parseCompositionSettings(value: unknown): CompositionSettings | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Record<string, unknown>;
  const settings: CompositionSettings = {};

  if (typeof raw.fontFamily === 'string' && raw.fontFamily.trim()) {
    settings.fontFamily = raw.fontFamily.trim();
  }
  if (isFiniteNumber(raw.fontSizePt) && raw.fontSizePt > 0) {
    settings.fontSizePt = raw.fontSizePt;
  }
  if (isFiniteNumber(raw.lineHeight) && raw.lineHeight > 0) {
    settings.lineHeight = raw.lineHeight;
  }
  const margins = parseMargins(raw.margins);
  if (margins) {
    settings.margins = margins;
  }

  return Object.keys(settings).length > 0 ? settings : null;
}

/** Serializes settings to a JSON string after sanitization (form payloads). */
export function serializeCompositionSettings(settings: CompositionSettings | null): string {
  return JSON.stringify(parseCompositionSettings(settings) ?? null);
}

/**
 * Field-wise merge: project composition wins over user defaults; unset fields
 * stay unset (callers decide whether to fall back to system defaults).
 */
export function mergeCompositionSettings(
  projectComposition?: CompositionSettings | null,
  userDefaults?: CompositionSettings | null,
): CompositionSettings {
  const merged: CompositionSettings = {};
  const fontFamily = projectComposition?.fontFamily ?? userDefaults?.fontFamily;
  const fontSizePt = projectComposition?.fontSizePt ?? userDefaults?.fontSizePt;
  const lineHeight = projectComposition?.lineHeight ?? userDefaults?.lineHeight;
  const margins = projectComposition?.margins ?? userDefaults?.margins;
  if (fontFamily) merged.fontFamily = fontFamily;
  if (fontSizePt !== undefined) merged.fontSizePt = fontSizePt;
  if (lineHeight !== undefined) merged.lineHeight = lineHeight;
  if (margins) merged.margins = margins;
  return merged;
}

/**
 * Full resolution with the strict hierarchy project > user > system. Always
 * returns a complete settings object.
 */
export function resolveComposition(
  projectComposition?: CompositionSettings | null,
  userDefaults?: CompositionSettings | null,
): ResolvedComposition {
  const merged = mergeCompositionSettings(projectComposition, userDefaults);
  return {
    fontFamily: merged.fontFamily ?? SYSTEM_COMPOSITION_DEFAULTS.fontFamily,
    fontSizePt: merged.fontSizePt ?? SYSTEM_COMPOSITION_DEFAULTS.fontSizePt,
    lineHeight: merged.lineHeight ?? SYSTEM_COMPOSITION_DEFAULTS.lineHeight,
    margins: merged.margins ?? SYSTEM_COMPOSITION_DEFAULTS.margins,
  };
}

/**
 * Brand resolution: an explicit per-project choice always wins — including
 * the explicit "no brand" marker (`brandChoiceNone`) — then the active
 * default profile, then null.
 */
export function resolveBrandProfileId(
  explicitId: string | null | undefined,
  brandChoiceNone: boolean,
  profiles: BrandProfile[],
): string | null {
  if (brandChoiceNone) return null;
  if (explicitId) return explicitId;
  return profiles.find((profile) => profile.status === 'active')?.id ?? null;
}
