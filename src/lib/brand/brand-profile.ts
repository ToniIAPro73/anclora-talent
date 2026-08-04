/**
 * BrandProfile — canonical brand model (FASE 2, dual-profiles addendum).
 *
 * A BrandProfile is a *theme pack*: palette with roles, typographic pair and
 * usage proportions, versioned per user (unique id + version + status). It
 * NEVER captures document hierarchy (G3) and is applied to the composition
 * engine exclusively as `templateOverrides` over the composer template (R3:
 * one canonical model, no parallel representation) — see
 * `brand-template-overrides.ts`.
 *
 * Brand and structure profiles are fully decoupled (G1): a project may use
 * one, the other, both or neither.
 */

export type BrandProfileStatus = 'draft' | 'active' | 'deprecated';

/** Per-field extraction confidence, mirroring the structural profile contract. */
export type BrandConfidence = 'high' | 'medium' | 'low';

/** Palette roles, in canonical proportion order (55 · 30 · 10 · 5). */
export const BRAND_COLOR_ROLES = ['ink', 'paper', 'accent', 'accentMuted'] as const;
export type BrandColorRole = (typeof BRAND_COLOR_ROLES)[number];

export interface BrandPaletteColor {
  role: BrandColorRole;
  /** Normalized `#RRGGBB` (uppercase). */
  hex: string;
  /** Declared name in the source manual (e.g. "Negro Tinta"), when found. */
  name: string | null;
  /** Declared usage share of the piece (e.g. 55), when found. */
  usagePercent: number | null;
  confidence: BrandConfidence;
}

export interface BrandTypeface {
  family: string;
  confidence: BrandConfidence;
}

/** Typographic pair: display (headings/quotes) and body (text/data). */
export interface BrandTypography {
  display: BrandTypeface | null;
  body: BrandTypeface | null;
}

/** Declared usage proportions per palette role (e.g. 55/30/10/5). */
export type BrandUsageProportions = Record<BrandColorRole, number>;

/** Few-shot voice contrast pair, stored for F3 (not consumed yet). */
export interface BrandVoicePair {
  soundsLike: string;
  doesntSoundLike: string;
}

export interface BrandProfile {
  id: string;
  userId: string;
  name: string;
  version: number;
  status: BrandProfileStatus;
  palette: BrandPaletteColor[];
  typography: BrandTypography;
  usageProportions: BrandUsageProportions | null;
  /** Governance rules captured from the manual (jsonb in DB). */
  governanceRules: string[];
  /** Voice contrast pairs captured for F3 (jsonb in DB). */
  voicePairs: BrandVoicePair[];
  sourceFileName: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Normalizes a hex color to `#RRGGBB` uppercase; returns null when invalid. */
export function normalizeHexColor(value: string): string | null {
  const match = value.trim().match(/^#?([0-9a-fA-F]{6})$/);
  if (!match) return null;
  return `#${match[1].toUpperCase()}`;
}

/** Looks up a palette color by role. */
export function getBrandColor(
  profile: Pick<BrandProfile, 'palette'>,
  role: BrandColorRole,
): BrandPaletteColor | null {
  return profile.palette.find((color) => color.role === role) ?? null;
}

export interface CreateBrandProfileInput {
  name: string;
  version?: number;
  status?: BrandProfileStatus;
  palette: BrandPaletteColor[];
  typography: BrandTypography;
  usageProportions?: BrandUsageProportions | null;
  governanceRules?: string[];
  voicePairs?: BrandVoicePair[];
  sourceFileName?: string | null;
}

/** Builds a canonical BrandProfile record (new draft by default). */
export function createBrandProfileRecord(
  userId: string,
  input: CreateBrandProfileInput,
  id: string = crypto.randomUUID(),
  now: string = new Date().toISOString(),
): BrandProfile {
  return {
    id,
    userId,
    name: input.name,
    version: input.version ?? 1,
    status: input.status ?? 'draft',
    palette: input.palette,
    typography: input.typography,
    usageProportions: input.usageProportions ?? null,
    governanceRules: input.governanceRules ?? [],
    voicePairs: input.voicePairs ?? [],
    sourceFileName: input.sourceFileName ?? null,
    createdAt: now,
    updatedAt: now,
  };
}
