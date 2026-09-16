/**
 * Canonical reusable visual/composition profile extracted from a reference
 * document. It stores rules and anonymous observations, never source prose.
 */

export type EditorialConfidence = 'high' | 'medium' | 'low' | 'unknown';
export type EditorialTextAlign = 'left' | 'center' | 'right' | 'justify' | 'unknown';
export type EditorialFontWeight = 'normal' | 'medium' | 'semibold' | 'bold' | 'unknown';

export interface ReferenceProfileSource {
  sourceAssetId: string | null;
  format: 'pdf' | 'docx' | 'markdown' | 'txt' | 'unknown';
  filename: string;
  hash: string | null;
  analysedAt: string;
  parserVersion: string;
}

export interface EditorialMargins {
  top: number | null;
  right: number | null;
  bottom: number | null;
  left: number | null;
}

export interface ReferencePageProfile {
  width: number | null;
  height: number | null;
  unit: 'pt' | 'px' | 'mm' | 'in' | 'unknown';
  orientation: 'portrait' | 'landscape' | 'unknown';
  margins: EditorialMargins;
  contentWidth: number | null;
  contentHeight: number | null;
  columns: number | null;
  gutter: number | null;
}

export interface EditorialTextStyle {
  fontFamily: string | null;
  resolvedFontFamily: string | null;
  fontSize: number | null;
  fontWeight: EditorialFontWeight;
  fontStyle: 'normal' | 'italic' | 'unknown';
  color: string | null;
  lineHeight: number | null;
  textAlign: EditorialTextAlign;
  firstLineIndent: number | null;
  paragraphSpacingBefore: number | null;
  paragraphSpacingAfter: number | null;
}

export interface EditorialListStyle {
  style: EditorialTextStyle;
  indent: number | null;
  marker: 'bullet' | 'decimal' | 'unknown';
  spacing: number | null;
}

export interface EditorialHeaderFooterProfile {
  enabled: boolean;
  position: 'top' | 'bottom';
  style: EditorialTextStyle | null;
  alignment: EditorialTextAlign;
}

export interface EditorialPageNumberProfile {
  enabled: boolean;
  position: 'header' | 'footer' | 'unknown';
  style: EditorialTextStyle | null;
  alignment: EditorialTextAlign;
}

export interface EditorialTocProfile {
  detected: boolean;
  titleStyle: EditorialTextStyle | null;
  entryStyle: EditorialTextStyle | null;
  pageNumberStyle: EditorialTextStyle | null;
  leaderStyle: 'dots' | 'line' | 'none' | 'unknown' | null;
}

export interface EditorialChapterOpeningProfile {
  detected: boolean;
  labelStyle: EditorialTextStyle | null;
  titleStyle: EditorialTextStyle | null;
  subtitleStyle: EditorialTextStyle | null;
  alignment: EditorialTextAlign;
  spacingBefore: number | null;
  spacingAfter: number | null;
  pageBreakBefore: boolean | null;
  startOnOddPage: boolean | null;
}

export interface ObservedStructureProfile {
  optional: true;
  frontMatter: boolean;
  chapterCount: number | null;
  headingDepth: number | null;
  backMatter: boolean;
}

export interface EditorialProfileConfidence {
  overall: EditorialConfidence;
  pageGeometry: EditorialConfidence;
  bodyTypography: EditorialConfidence;
  headings: EditorialConfidence;
  chapterOpening: EditorialConfidence;
  headers: EditorialConfidence;
  footers: EditorialConfidence;
  toc: EditorialConfidence;
}

export interface ReferenceEditorialProfile {
  version: 1;
  profileType: 'editorial';
  source: ReferenceProfileSource;
  page: ReferencePageProfile;
  body: EditorialTextStyle;
  headings: {
    h1: EditorialTextStyle | null;
    h2: EditorialTextStyle | null;
    h3: EditorialTextStyle | null;
    h4: EditorialTextStyle | null;
  };
  chapterOpening: EditorialChapterOpeningProfile;
  quote: EditorialTextStyle | null;
  lists: { unordered: EditorialListStyle | null; ordered: EditorialListStyle | null };
  captions: EditorialTextStyle | null;
  header: EditorialHeaderFooterProfile;
  footer: EditorialHeaderFooterProfile;
  pageNumber: EditorialPageNumberProfile;
  toc: EditorialTocProfile;
  separators: { color: string | null; width: number | null; spacing: number | null } | null;
  palette: string[];
  confidence: EditorialProfileConfidence;
  observedStructure: ObservedStructureProfile;
}

export function hasUsableEditorialEvidence(profile: ReferenceEditorialProfile): boolean {
  const geometry =
    profile.page.width !== null &&
    profile.page.height !== null &&
    profile.page.contentWidth !== null &&
    profile.page.contentHeight !== null;
  const body =
    profile.body.fontSize !== null &&
    (profile.body.fontFamily !== null || profile.body.resolvedFontFamily !== null);
  const heading = Boolean(profile.headings.h1 || profile.headings.h2 || profile.headings.h3);
  return (geometry && body) || (body && heading) || (geometry && heading);
}

export function emptyEditorialTextStyle(): EditorialTextStyle {
  return {
    fontFamily: null,
    resolvedFontFamily: null,
    fontSize: null,
    fontWeight: 'unknown',
    fontStyle: 'unknown',
    color: null,
    lineHeight: null,
    textAlign: 'unknown',
    firstLineIndent: null,
    paragraphSpacingBefore: null,
    paragraphSpacingAfter: null,
  };
}
