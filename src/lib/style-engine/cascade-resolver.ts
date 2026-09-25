import type { BrandProfile } from '@/lib/brand/brand-profile';
import { getBrandColor } from '@/lib/brand/brand-profile';
import type { ReferenceEditorialProfile, EditorialTextStyle } from '@/lib/reference-editorial-profile/model';
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
};

function resolveTextStyle(
  role: EditorialRole,
  fallback: ResolvedTextStyle,
  referenceStyle?: EditorialTextStyle | null,
  brandFamily?: string | null,
  brandColor?: string | null,
  userOverride?: Partial<ResolvedTextStyle> | null,
): ResolvedTextStyle {
  const result: ResolvedTextStyle = { ...fallback };

  // 1. Reference Style Layer (overrides typography & scale & layout)
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

  // 2. Brand Layer (infuses brand theme tokens: colors, or fonts when not specified by reference)
  if (brandFamily && (!referenceStyle || (!referenceStyle.resolvedFontFamily && !referenceStyle.fontFamily))) {
    result.fontFamily = brandFamily;
  }
  if (brandColor) {
    result.color = brandColor;
  }

  // 3. User Override Layer (highest priority)
  if (userOverride) {
    Object.assign(result, userOverride);
  }

  return result;
}

export function resolveDocumentStyles({
  referenceProfile,
  brandProfile,
  userOverrides = [],
}: {
  referenceProfile?: ReferenceEditorialProfile | null;
  brandProfile?: BrandProfile | null;
  userOverrides?: UserStyleOverride[];
}): DocumentStyleMap {
  // Extract Brand Tokens
  const brandInk = brandProfile ? getBrandColor(brandProfile, 'ink')?.hex ?? null : null;
  const brandAccent = brandProfile ? getBrandColor(brandProfile, 'accent')?.hex ?? null : null;
  const brandDisplayFont = brandProfile?.typography.display?.family ?? null;
  const brandBodyFont = brandProfile?.typography.body?.family ?? null;

  // Index User Overrides by role
  const roleOverrides = new Map<EditorialRole, Partial<ResolvedTextStyle>>();
  for (const override of userOverrides) {
    if (override.scope === 'role' && override.targetRole) {
      roleOverrides.set(override.targetRole, override.styles);
    }
  }

  // 1. Page Geometry
  const page: ResolvedPageGeometry = { ...SYSTEM_DEFAULTS.page };
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

  // 2. Body Text
  const body = resolveTextStyle(
    'body',
    SYSTEM_DEFAULTS.body,
    referenceProfile?.body,
    brandBodyFont,
    brandInk,
    roleOverrides.get('body'),
  );

  // 3. Headings
  const h1 = resolveTextStyle(
    'h1',
    SYSTEM_DEFAULTS.h1,
    referenceProfile?.headings?.h1,
    brandDisplayFont,
    brandAccent ?? brandInk,
    roleOverrides.get('h1'),
  );

  const h2 = resolveTextStyle(
    'h2',
    SYSTEM_DEFAULTS.h2,
    referenceProfile?.headings?.h2,
    brandDisplayFont,
    brandAccent ?? brandInk,
    roleOverrides.get('h2'),
  );

  const h3 = resolveTextStyle(
    'h3',
    SYSTEM_DEFAULTS.h3,
    referenceProfile?.headings?.h3,
    brandDisplayFont,
    brandInk,
    roleOverrides.get('h3'),
  );

  const h4 = resolveTextStyle(
    'h4',
    SYSTEM_DEFAULTS.h4,
    referenceProfile?.headings?.h4,
    brandDisplayFont,
    brandInk,
    roleOverrides.get('h4'),
  );

  // 4. Quotes & Callouts
  const baseQuote = resolveTextStyle(
    'quote',
    SYSTEM_DEFAULTS.quote,
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
    header,
    footer,
    decorations,
  };
}
