import type { BrandProfile } from '@/lib/brand/brand-profile';
import { getBrandColor } from '@/lib/brand/brand-profile';
import type { ReferenceEditorialProfile, EditorialTextStyle } from '@/lib/reference-editorial-profile/model';
import type { OriginalDocumentStyleProfile } from '@/lib/projects/source-style-profile';
import type {
  DocumentStyleMap,
  EditorialRole,
  ResolvedDecorationStyle,
  ResolvedPageGeometry,
  ResolvedTextStyle,
  UserStyleOverride,
} from './model';

export const SYSTEM_DEFAULTS = {
  page: {
    widthPt: 432, // 6 x 9 in standard trade paperback
    heightPt: 648,
    marginsPt: { top: 54, bottom: 54, left: 54, right: 54 },
    gutterPt: 0,
    columns: 1,
  } satisfies ResolvedPageGeometry,
  body: {
    fontFamily: 'Georgia',
    fontSizePt: 11,
    fontWeight: 'normal' as const,
    fontStyle: 'normal' as const,
    color: '#1A1A1A',
    lineHeight: 1.45,
    textAlign: 'justify' as const,
    firstLineIndentPt: 0,
    spacingBeforePt: 0,
    spacingAfterPt: 6,
  } satisfies ResolvedTextStyle,
  h1: {
    fontFamily: 'Georgia',
    fontSizePt: 22,
    fontWeight: 'bold' as const,
    fontStyle: 'normal' as const,
    color: '#111827',
    lineHeight: 1.2,
    textAlign: 'left' as const,
    spacingBeforePt: 24,
    spacingAfterPt: 12,
  } satisfies ResolvedTextStyle,
  h2: {
    fontFamily: 'Georgia',
    fontSizePt: 16,
    fontWeight: 'bold' as const,
    fontStyle: 'normal' as const,
    color: '#1F2937',
    lineHeight: 1.25,
    textAlign: 'left' as const,
    spacingBeforePt: 18,
    spacingAfterPt: 8,
  } satisfies ResolvedTextStyle,
  h3: {
    fontFamily: 'Georgia',
    fontSizePt: 13,
    fontWeight: 'semibold' as const,
    fontStyle: 'normal' as const,
    color: '#374151',
    lineHeight: 1.3,
    textAlign: 'left' as const,
    spacingBeforePt: 14,
    spacingAfterPt: 6,
  } satisfies ResolvedTextStyle,
  h4: {
    fontFamily: 'Georgia',
    fontSizePt: 11,
    fontWeight: 'semibold' as const,
    fontStyle: 'normal' as const,
    color: '#4B5563',
    lineHeight: 1.35,
    textAlign: 'left' as const,
    spacingBeforePt: 10,
    spacingAfterPt: 4,
  } satisfies ResolvedTextStyle,
  quote: {
    fontFamily: 'Georgia',
    fontSizePt: 10.5,
    fontWeight: 'normal' as const,
    fontStyle: 'italic' as const,
    color: '#374151',
    lineHeight: 1.4,
    textAlign: 'left' as const,
    spacingBeforePt: 10,
    spacingAfterPt: 10,
    borderLeftWidthPt: 3,
    borderLeftColor: '#D4AF37',
  },
  decorations: {
    dividerColor: '#E5E7EB',
    dividerWidthPt: 1,
    accentColor: '#D4AF37',
    quoteBorderColor: '#D4AF37',
    quoteBorderWidthPt: 3,
  } satisfies ResolvedDecorationStyle,
  palette: {
    ink: '#1A1A1A',
    paper: '#FFFFFF',
    accent: '#D4AF37',
    accentMuted: '#5F6B7A',
  },
};

function resolveTextStyle(
  role: EditorialRole,
  fallback: ResolvedTextStyle,
  sourceStyle?: Partial<ResolvedTextStyle> | null,
  referenceStyle?: EditorialTextStyle | null,
  brandFamily?: string | null,
  brandColor?: string | null,
  userOverride?: Partial<ResolvedTextStyle> | null,
): ResolvedTextStyle {
  const result: ResolvedTextStyle = { ...fallback };

  // 1. Source Manuscript Layer (baseline for imported documents)
  if (sourceStyle) {
    if (sourceStyle.fontFamily) result.fontFamily = sourceStyle.fontFamily;
    if (sourceStyle.fontSizePt !== undefined) result.fontSizePt = sourceStyle.fontSizePt;
    if (sourceStyle.fontWeight) result.fontWeight = sourceStyle.fontWeight;
    if (sourceStyle.fontStyle) result.fontStyle = sourceStyle.fontStyle;
    if (sourceStyle.color) result.color = sourceStyle.color;
    if (sourceStyle.lineHeight !== undefined) result.lineHeight = sourceStyle.lineHeight;
    if (sourceStyle.textAlign) result.textAlign = sourceStyle.textAlign;
    if (sourceStyle.firstLineIndentPt !== undefined) result.firstLineIndentPt = sourceStyle.firstLineIndentPt;
    if (sourceStyle.spacingBeforePt !== undefined) result.spacingBeforePt = sourceStyle.spacingBeforePt;
    if (sourceStyle.spacingAfterPt !== undefined) result.spacingAfterPt = sourceStyle.spacingAfterPt;
  }

  // 2. Brand Layer (infuses brand theme tokens: colors, or fonts when not specified by reference)
  if (brandFamily && (!referenceStyle || (!referenceStyle.resolvedFontFamily && !referenceStyle.fontFamily))) {
    result.fontFamily = brandFamily;
  }
  if (brandColor) {
    result.color = brandColor;
  }

  // 3. Reference Style Layer (explicit reference overrides typography & layout)
  if (referenceStyle) {
    const refFont = referenceStyle.resolvedFontFamily || referenceStyle.fontFamily;
    if (refFont) result.fontFamily = refFont;
    if (referenceStyle.fontSize) result.fontSizePt = referenceStyle.fontSize;
    if (referenceStyle.fontWeight !== 'unknown') result.fontWeight = referenceStyle.fontWeight;
    if (referenceStyle.fontStyle !== 'unknown') result.fontStyle = referenceStyle.fontStyle;
    if (referenceStyle.color) result.color = referenceStyle.color;
    if (referenceStyle.lineHeight) result.lineHeight = referenceStyle.lineHeight;
    if (referenceStyle.textAlign !== 'unknown') result.textAlign = referenceStyle.textAlign;
    if (referenceStyle.firstLineIndent !== null && referenceStyle.firstLineIndent !== undefined) {
      result.firstLineIndentPt = referenceStyle.firstLineIndent;
    }
    if (referenceStyle.paragraphSpacingBefore !== null && referenceStyle.paragraphSpacingBefore !== undefined) {
      result.spacingBeforePt = referenceStyle.paragraphSpacingBefore;
    }
    if (referenceStyle.paragraphSpacingAfter !== null && referenceStyle.paragraphSpacingAfter !== undefined) {
      result.spacingAfterPt = referenceStyle.paragraphSpacingAfter;
    }
  }

  // 4. User Override Layer (highest priority)
  if (userOverride) {
    Object.assign(result, userOverride);
  }

  return result;
}

export interface LegacyCompositionSettings {
  bodyFontFamily?: string;
  fontFamily?: string;
  displayFontFamily?: string;
  fontSizePt?: number;
  lineHeight?: number;
  headingColor?: string;
  bodyColor?: string;
  paperColor?: string;
  accentColor?: string;
  accentMutedColor?: string;
  margins?: {
    top?: number | null;
    bottom?: number | null;
    left?: number | null;
    right?: number | null;
  };
}

export function resolveDocumentStyles({
  sourceStyleProfile,
  referenceProfile,
  brandProfile,
  userOverrides = [],
  composition,
}: {
  sourceStyleProfile?: OriginalDocumentStyleProfile | null;
  referenceProfile?: ReferenceEditorialProfile | null;
  brandProfile?: BrandProfile | null;
  userOverrides?: UserStyleOverride[];
  composition?: LegacyCompositionSettings | null;
}): DocumentStyleMap {
  // Extract Legacy Composition fallbacks
  const legacyBodyFont = composition?.bodyFontFamily || composition?.fontFamily || null;
  const legacyDisplayFont = composition?.displayFontFamily || null;
  const legacyLineHeight = composition?.lineHeight || null;
  const legacyHeadingColor = composition?.headingColor || null;
  const legacyBodyColor = composition?.bodyColor || null;
  const legacyPaperColor = composition?.paperColor || null;
  const legacyAccentColor = composition?.accentColor || null;
  const legacyAccentMuted = composition?.accentMutedColor || null;

  // Extract Brand Tokens (only applied when brandProfile is explicitly provided)
  const brandInk = brandProfile ? (getBrandColor(brandProfile, 'ink')?.hex ?? null) : (sourceStyleProfile ? null : legacyBodyColor);
  const brandAccent = brandProfile ? (getBrandColor(brandProfile, 'accent')?.hex ?? null) : (sourceStyleProfile ? null : (legacyAccentColor ?? legacyHeadingColor));
  const brandDisplayFont = brandProfile?.typography.display?.family ?? (sourceStyleProfile ? null : legacyDisplayFont);
  const brandBodyFont = brandProfile?.typography.body?.family ?? (sourceStyleProfile ? null : legacyBodyFont);
  const compositionBodyOverride: Partial<ResolvedTextStyle> = sourceStyleProfile && composition
    ? {
        ...(composition.fontFamily ? { fontFamily: composition.fontFamily } : {}),
        ...(composition.fontSizePt !== undefined ? { fontSizePt: composition.fontSizePt } : {}),
        ...(composition.lineHeight !== undefined ? { lineHeight: composition.lineHeight } : {}),
      }
    : {};

  // Index User Overrides by role
  const roleOverrides = new Map<EditorialRole, Partial<ResolvedTextStyle>>();
  for (const override of userOverrides) {
    if (override.scope === 'role' && override.targetRole) {
      roleOverrides.set(override.targetRole, override.styles);
    }
  }

  // 1. Page Geometry (Cascade: System -> Source -> Reference -> Overrides)
  const page: ResolvedPageGeometry = { ...SYSTEM_DEFAULTS.page };

  // Source page geometry
  if (sourceStyleProfile?.page) {
    const srcPage = sourceStyleProfile.page;
    if (srcPage.widthPt) page.widthPt = srcPage.widthPt;
    if (srcPage.heightPt) page.heightPt = srcPage.heightPt;
    if (srcPage.marginsPt) {
      if (srcPage.marginsPt.top !== undefined) page.marginsPt.top = srcPage.marginsPt.top;
      if (srcPage.marginsPt.bottom !== undefined) page.marginsPt.bottom = srcPage.marginsPt.bottom;
      if (srcPage.marginsPt.left !== undefined) page.marginsPt.left = srcPage.marginsPt.left;
      if (srcPage.marginsPt.right !== undefined) page.marginsPt.right = srcPage.marginsPt.right;
    }
    if (srcPage.gutterPt !== undefined) page.gutterPt = srcPage.gutterPt;
  } else if (composition?.margins) {
    const m = composition.margins;
    if (m.top !== undefined && m.top !== null) page.marginsPt.top = m.top;
    if (m.bottom !== undefined && m.bottom !== null) page.marginsPt.bottom = m.bottom;
    if (m.left !== undefined && m.left !== null) page.marginsPt.left = m.left;
    if (m.right !== undefined && m.right !== null) page.marginsPt.right = m.right;
  }

  // Reference page geometry overrides source
  if (referenceProfile?.page) {
    const refPage = referenceProfile.page;
    if (refPage.width) page.widthPt = refPage.width;
    if (refPage.height) page.heightPt = refPage.height;
    if (refPage.margins) {
      if (refPage.margins.top !== null) page.marginsPt.top = refPage.margins.top;
      if (refPage.margins.bottom !== null) page.marginsPt.bottom = refPage.margins.bottom;
      if (refPage.margins.left !== null) page.marginsPt.left = refPage.margins.left;
      if (refPage.margins.right !== null) page.marginsPt.right = refPage.margins.right;
    }
  }

  // 2. Body Text (Cascade: System -> Source -> Brand -> Reference -> User Override)
  const defaultBody = !sourceStyleProfile && legacyLineHeight
    ? { ...SYSTEM_DEFAULTS.body, lineHeight: legacyLineHeight }
    : SYSTEM_DEFAULTS.body;

  const sourceBody: Partial<ResolvedTextStyle> | null = sourceStyleProfile?.body
    ? {
        fontFamily: sourceStyleProfile.body.fontFamily,
        fontSizePt: sourceStyleProfile.body.fontSizePt,
        fontWeight: sourceStyleProfile.body.fontWeight,
        fontStyle: sourceStyleProfile.body.fontStyle,
        color: sourceStyleProfile.body.color,
        lineHeight: sourceStyleProfile.body.lineHeight,
        textAlign: sourceStyleProfile.body.textAlign,
        firstLineIndentPt: sourceStyleProfile.body.firstLineIndentPt,
        spacingBeforePt: sourceStyleProfile.body.spacingBeforePt,
        spacingAfterPt: sourceStyleProfile.body.spacingAfterPt,
      }
    : null;

  const body = resolveTextStyle(
    'body',
    defaultBody,
    sourceBody,
    referenceProfile?.body,
    brandBodyFont,
    brandInk,
    { ...compositionBodyOverride, ...roleOverrides.get('body') },
  );

  if (sourceStyleProfile && composition?.margins) {
    page.marginsPt = {
      ...page.marginsPt,
      ...(composition.margins.top != null ? { top: composition.margins.top } : {}),
      ...(composition.margins.bottom != null ? { bottom: composition.margins.bottom } : {}),
      ...(composition.margins.left != null ? { left: composition.margins.left } : {}),
      ...(composition.margins.right != null ? { right: composition.margins.right } : {}),
    };
  }

  // 3. Headings (Cascade: System -> Source -> Brand -> Reference -> User Override)
  const headingColor = brandAccent ?? (sourceStyleProfile ? null : legacyHeadingColor) ?? brandInk;

  const h1 = resolveTextStyle(
    'h1',
    SYSTEM_DEFAULTS.h1,
    sourceStyleProfile?.headings?.h1,
    referenceProfile?.headings?.h1,
    brandDisplayFont,
    headingColor,
    roleOverrides.get('h1'),
  );

  const h2 = resolveTextStyle(
    'h2',
    SYSTEM_DEFAULTS.h2,
    sourceStyleProfile?.headings?.h2,
    referenceProfile?.headings?.h2,
    brandDisplayFont,
    brandAccent ?? brandInk,
    roleOverrides.get('h2'),
  );

  const h3 = resolveTextStyle(
    'h3',
    SYSTEM_DEFAULTS.h3,
    sourceStyleProfile?.headings?.h3,
    referenceProfile?.headings?.h3,
    brandDisplayFont,
    brandInk,
    roleOverrides.get('h3'),
  );

  const h4 = resolveTextStyle(
    'h4',
    SYSTEM_DEFAULTS.h4,
    sourceStyleProfile?.headings?.h4,
    referenceProfile?.headings?.h4,
    brandDisplayFont,
    brandInk,
    roleOverrides.get('h4'),
  );

  // 4. Quotes & Callouts
  const baseQuote = resolveTextStyle(
    'quote',
    SYSTEM_DEFAULTS.quote,
    null,
    referenceProfile?.quote,
    brandBodyFont,
    brandInk,
    roleOverrides.get('quote'),
  );
  const quote = {
    ...baseQuote,
    borderLeftWidthPt: 3,
    borderLeftColor: brandAccent ?? referenceProfile?.quote?.color ?? SYSTEM_DEFAULTS.quote.borderLeftColor,
  };

  // 5. Lists
  const list = {
    ...body,
    itemSpacingPt: referenceProfile?.lists?.unordered?.spacing ?? 3,
    markerColor: brandAccent ?? body.color,
  };

  // 6. Tables
  const table = {
    header: {
      ...body,
      fontWeight: 'semibold' as const,
      backgroundColor: brandProfile ? getBrandColor(brandProfile, 'paper')?.hex ?? '#F9FAFB' : '#F9FAFB',
    },
    cell: { ...body },
    borderColor: '#E5E7EB',
    borderWidthPt: 1,
  };

  // 7. Footnotes
  const footnote: ResolvedTextStyle = {
    ...body,
    fontSizePt: Math.max(8, body.fontSizePt - 2),
    lineHeight: 1.3,
  };

  // 7b. Editorial kicker (small label above a heading, e.g. "INTRODUCCIÓN")
  const kickerFallback: ResolvedTextStyle = {
    ...body,
    fontFamily: brandDisplayFont ?? body.fontFamily,
    fontWeight: 'bold',
    fontSizePt: Math.max(8, body.fontSizePt - 2),
    color: headingColor ?? body.color,
    textAlign: 'left',
  };
  const kicker = resolveTextStyle(
    'kicker',
    kickerFallback,
    sourceStyleProfile?.kicker,
    null,
    null,
    null,
    roleOverrides.get('kicker'),
  );

  // 8. Headers & Footers
  const header: ResolvedTextStyle & { borderBottom?: boolean } = {
    ...body,
    fontSizePt: 8.5,
    color: '#6B7280',
    borderBottom: referenceProfile?.header?.enabled,
  };

  const footer: ResolvedTextStyle & { borderTop?: boolean } = {
    ...body,
    fontSizePt: 8.5,
    color: '#6B7280',
    borderTop: referenceProfile?.footer?.enabled,
  };

  // 9. Decorations
  const decorations: ResolvedDecorationStyle = {
    dividerColor: brandAccent ?? SYSTEM_DEFAULTS.decorations.dividerColor,
    dividerWidthPt: 1,
    accentColor: brandAccent ?? SYSTEM_DEFAULTS.decorations.accentColor,
    quoteBorderColor: brandAccent ?? SYSTEM_DEFAULTS.decorations.quoteBorderColor,
    quoteBorderWidthPt: 3,
  };

  const brandPaper = brandProfile ? getBrandColor(brandProfile, 'paper')?.hex ?? null : null;
  const brandAccentMuted = brandProfile ? getBrandColor(brandProfile, 'accentMuted')?.hex ?? null : null;
  const palette = {
    ink: brandInk ?? body.color,
    paper: brandPaper ?? legacyPaperColor ?? SYSTEM_DEFAULTS.palette.paper,
    accent: brandAccent ?? decorations.accentColor,
    accentMuted: brandAccentMuted ?? legacyAccentMuted ?? decorations.dividerColor,
  };

  return {
    version: 1,
    compiledAt: new Date().toISOString(),
    page,
    body,
    headings: { h1, h2, h3, h4 },
    quote,
    list,
    table,
    footnote,
    kicker,
    header,
    footer,
    decorations,
    palette,
  };
}
