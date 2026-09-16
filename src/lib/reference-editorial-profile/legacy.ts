import type { InferredStructureSchema, StructureProfile } from '@/lib/structure-profile/model';
import type { ReferenceEditorialProfile } from './model';

export function isReferenceEditorialProfile(value: unknown): value is ReferenceEditorialProfile {
  return Boolean(value && typeof value === 'object' && (value as { profileType?: unknown }).profileType === 'editorial');
}

/** Keeps old saved structure profiles readable without treating them as visual rules. */
export function adaptLegacyStructureProfile(profile: StructureProfile): ReferenceEditorialProfile {
  const schema = profile.schema as InferredStructureSchema;
  const now = profile.updatedAt;
  return {
    version: 1,
    profileType: 'editorial',
    source: { sourceAssetId: null, format: 'unknown', filename: profile.sourceFileName ?? profile.name, hash: null, analysedAt: now, parserVersion: 'legacy-adapter' },
    metrics: { totalHeadings: schema.metrics.totalHeadings, desglose: schema.metrics.desglose, tablas: schema.metrics.tablas, imagenes: schema.metrics.imagenes },
    page: { width: null, height: null, unit: 'unknown', orientation: 'unknown', margins: { top: null, right: null, bottom: null, left: null }, contentWidth: null, contentHeight: null, columns: null, gutter: null },
    body: { fontFamily: null, resolvedFontFamily: null, fontSize: null, fontWeight: 'unknown', fontStyle: 'unknown', color: null, lineHeight: null, textAlign: 'unknown', firstLineIndent: null, paragraphSpacingBefore: null, paragraphSpacingAfter: null },
    headings: { h1: null, h2: null, h3: null, h4: null },
    chapterOpening: { detected: false, labelStyle: null, titleStyle: null, subtitleStyle: null, alignment: 'unknown', spacingBefore: null, spacingAfter: null, pageBreakBefore: null, startOnOddPage: null },
    quote: null, lists: { unordered: null, ordered: null }, captions: null,
    header: { enabled: false, position: 'top', style: null, alignment: 'unknown' }, footer: { enabled: false, position: 'bottom', style: null, alignment: 'unknown' }, pageNumber: { enabled: false, position: 'unknown', style: null, alignment: 'unknown' }, toc: { detected: false, titleStyle: null, entryStyle: null, pageNumberStyle: null, leaderStyle: null }, separators: null, palette: [],
    confidence: { overall: 'unknown', pageGeometry: 'unknown', bodyTypography: 'unknown', headings: 'unknown', chapterOpening: 'unknown', headers: 'unknown', footers: 'unknown', toc: 'unknown' },
    observedStructure: { optional: true, frontMatter: false, chapterCount: schema.metrics?.desglose?.h2Capitulos ?? null, headingDepth: schema.hierarchy?.maxObservedDepth ?? null, backMatter: false },
  };
}
