import {
  emptyEditorialTextStyle,
  type EditorialConfidence,
  type EditorialFontWeight,
  type EditorialTextAlign,
  type EditorialTextStyle,
  type ReferenceEditorialProfile,
} from './model';
import { normalizePdfFontName, resolveEditorialFont } from './font-normalization';

export interface EditorialTextFragment {
  pageNumber: number;
  text: string;
  fontName?: string | null;
  fontSize?: number | null;
  fontWeight?: EditorialFontWeight | null;
  italic?: boolean | null;
  color?: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
  align?: EditorialTextAlign | null;
}

export interface EditorialPageEvidence {
  width: number;
  height: number;
  unit: 'pt' | 'px' | 'mm' | 'in' | 'unknown';
}

export interface EditorialSourceIdentity {
  sourceAssetId?: string | null;
  filename: string;
  format: ReferenceEditorialProfile['source']['format'];
  hash?: string | null;
  parserVersion?: string;
  analysedAt?: string;
}

interface StyleCluster {
  family: string | null;
  resolvedFamily: string | null;
  size: number | null;
  weight: EditorialFontWeight;
  italic: boolean;
  color: string | null;
  fragments: EditorialTextFragment[];
}

const AVAILABLE_FONTS = ['Inter', 'EB Garamond', 'Georgia', 'Montserrat', 'Arial'];
const PARSER_VERSION = 'reference-editorial-profile-v1';

function confidenceFromCount(count: number, total: number): EditorialConfidence {
  if (count >= 4 && count / Math.max(total, 1) >= 0.2) return 'high';
  if (count >= 2) return 'medium';
  if (count > 0) return 'low';
  return 'unknown';
}

function round(value: number, decimals = 1): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

function mode<T>(values: T[]): T | null {
  if (values.length === 0) return null;
  const counts = new Map<T, number>();
  values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
}

function styleKey(fragment: EditorialTextFragment): string {
  const font = fragment.fontName ? normalizePdfFontName(fragment.fontName) : null;
  return [
    font?.family ?? 'unknown',
    round(fragment.fontSize ?? 0, 1),
    fragment.fontWeight ?? font?.weight ?? 'unknown',
    Boolean(fragment.italic ?? font?.italic),
    fragment.color ?? 'unknown',
  ].join('|');
}

function clusterFragments(fragments: EditorialTextFragment[]): StyleCluster[] {
  const groups = new Map<string, EditorialTextFragment[]>();
  for (const fragment of fragments) {
    const list = groups.get(styleKey(fragment)) ?? [];
    list.push(fragment);
    groups.set(styleKey(fragment), list);
  }
  return [...groups.values()]
    .map((items) => {
      const first = items[0];
      const normalized = first.fontName ? normalizePdfFontName(first.fontName) : null;
      const resolved = normalized ? resolveEditorialFont(normalized.family, AVAILABLE_FONTS) : null;
      return {
        family: normalized?.family ?? null,
        resolvedFamily: resolved?.resolvedFontFamily ?? null,
        size: median(items.map((item) => item.fontSize ?? 0).filter((size) => size > 0)),
        weight: first.fontWeight ?? normalized?.weight ?? 'unknown',
        italic: Boolean(first.italic ?? normalized?.italic),
        color: mode(items.map((item) => item.color).filter((color): color is string => Boolean(color))),
        fragments: items,
      };
    })
    .sort((a, b) => b.fragments.length - a.fragments.length);
}

function inferAlignment(cluster: StyleCluster, pageWidth: number): EditorialTextAlign {
  const alignments = cluster.fragments.map((fragment) => {
    if (fragment.align && fragment.align !== 'unknown') return fragment.align;
    const center = fragment.x + fragment.width / 2;
    if (Math.abs(center - pageWidth / 2) <= pageWidth * 0.04) return 'center';
    if (fragment.x + fragment.width >= pageWidth * 0.84) return 'right';
    return 'left';
  });
  return mode(alignments) ?? 'unknown';
}

function toTextStyle(cluster: StyleCluster | null, pageWidth: number): EditorialTextStyle | null {
  if (!cluster) return null;
  const sizes = cluster.fragments.map((fragment) => fragment.fontSize ?? 0).filter((size) => size > 0);
  const lineRatios = cluster.fragments
    .filter((fragment) => (fragment.fontSize ?? 0) > 0 && fragment.height > 0)
    .map((fragment) => fragment.height / (fragment.fontSize ?? 1));
  return {
    fontFamily: cluster.family,
    resolvedFontFamily: cluster.resolvedFamily,
    fontSize: median(sizes),
    fontWeight: cluster.weight,
    fontStyle: cluster.italic ? 'italic' : 'normal',
    color: cluster.color,
    lineHeight: median(lineRatios),
    textAlign: inferAlignment(cluster, pageWidth),
    firstLineIndent: null,
    paragraphSpacingBefore: null,
    paragraphSpacingAfter: null,
  };
}

function repeatedBoundaryFragments(
  fragments: EditorialTextFragment[],
  pageHeight: number,
  edge: 'top' | 'bottom',
): EditorialTextFragment[] {
  const threshold = pageHeight * 0.14;
  const candidates = fragments.filter((fragment) =>
    edge === 'top' ? fragment.y <= threshold : fragment.y >= pageHeight - threshold,
  );
  const pageCount = new Set(fragments.map((fragment) => fragment.pageNumber)).size;
  const positions = new Map<string, Set<number>>();
  for (const fragment of candidates) {
    const key = `${round(fragment.y, 0)}|${styleKey(fragment)}`;
    const pages = positions.get(key) ?? new Set<number>();
    pages.add(fragment.pageNumber);
    positions.set(key, pages);
  }
  const repeatedKeys = new Set(
    [...positions.entries()]
      .filter(([, pages]) => pages.size >= Math.max(2, Math.ceil(pageCount * 0.5)))
      .map(([key]) => key),
  );
  return candidates.filter((fragment) => repeatedKeys.has(`${round(fragment.y, 0)}|${styleKey(fragment)}`));
}

function styleWithSpacing(style: EditorialTextStyle | null, fragments: EditorialTextFragment[]): EditorialTextStyle | null {
  if (!style) return null;
  const byPage = new Map<number, EditorialTextFragment[]>();
  fragments.forEach((fragment) => {
    const list = byPage.get(fragment.pageNumber) ?? [];
    list.push(fragment);
    byPage.set(fragment.pageNumber, list);
  });
  const gaps: number[] = [];
  for (const pageFragments of byPage.values()) {
    const sorted = [...pageFragments].sort((a, b) => a.y - b.y);
    for (let index = 1; index < sorted.length; index += 1) {
      const previous = sorted[index - 1];
      const current = sorted[index];
      if (current.y > previous.y + previous.height) gaps.push(current.y - (previous.y + previous.height));
    }
  }
  const lineHeight = style.lineHeight;
  return {
    ...style,
    paragraphSpacingAfter: median(gaps),
    firstLineIndent: null,
    lineHeight: lineHeight && lineHeight > 0 ? round(lineHeight, 2) : null,
  };
}

function createEmptyProfile(source: EditorialSourceIdentity, page: EditorialPageEvidence): ReferenceEditorialProfile {
  const empty = emptyEditorialTextStyle();
  const orientation = page.width === page.height ? 'unknown' : page.width > page.height ? 'landscape' : 'portrait';
  return {
    version: 1,
    profileType: 'editorial',
    source: {
      sourceAssetId: source.sourceAssetId ?? null,
      format: source.format,
      filename: source.filename,
      hash: source.hash ?? null,
      analysedAt: source.analysedAt ?? new Date().toISOString(),
      parserVersion: source.parserVersion ?? PARSER_VERSION,
    },
    page: {
      width: page.width,
      height: page.height,
      unit: page.unit,
      orientation,
      margins: { top: null, right: null, bottom: null, left: null },
      contentWidth: null,
      contentHeight: null,
      columns: null,
      gutter: null,
    },
    body: empty,
    headings: { h1: null, h2: null, h3: null, h4: null },
    chapterOpening: {
      detected: false,
      labelStyle: null,
      titleStyle: null,
      subtitleStyle: null,
      alignment: 'unknown',
      spacingBefore: null,
      spacingAfter: null,
      pageBreakBefore: null,
      startOnOddPage: null,
    },
    quote: null,
    lists: { unordered: null, ordered: null },
    captions: null,
    header: { enabled: false, position: 'top', style: null, alignment: 'unknown' },
    footer: { enabled: false, position: 'bottom', style: null, alignment: 'unknown' },
    pageNumber: { enabled: false, position: 'footer', style: null, alignment: 'unknown' },
    toc: { detected: false, titleStyle: null, entryStyle: null, pageNumberStyle: null, leaderStyle: null },
    separators: null,
    palette: [],
    confidence: {
      overall: 'unknown',
      pageGeometry: 'unknown',
      bodyTypography: 'unknown',
      headings: 'unknown',
      chapterOpening: 'unknown',
      headers: 'unknown',
      footers: 'unknown',
      toc: 'unknown',
    },
    observedStructure: { optional: true, frontMatter: false, chapterCount: null, headingDepth: null, backMatter: false },
  };
}

/** Deterministic layout/style extraction. Fragment text is used transiently and never returned. */
export function extractEditorialProfileFromFragments(
  page: EditorialPageEvidence,
  fragments: EditorialTextFragment[],
  source: EditorialSourceIdentity,
): ReferenceEditorialProfile {
  const result = createEmptyProfile(source, page);
  if (fragments.length === 0) return result;

  const pages = new Set(fragments.map((fragment) => fragment.pageNumber));
  const headerFragments = repeatedBoundaryFragments(fragments, page.height, 'top');
  const footerFragments = repeatedBoundaryFragments(fragments, page.height, 'bottom');
  const excluded = new Set([...headerFragments, ...footerFragments]);
  const interior = fragments.filter((fragment) => !excluded.has(fragment));
  const clusters = clusterFragments(interior.length > 0 ? interior : fragments);
  const bodyCluster = clusters[0] ?? null;
  const bodyStyle = styleWithSpacing(toTextStyle(bodyCluster, page.width), bodyCluster?.fragments ?? []);
  const headingClusters = clusters
    .filter((cluster) => cluster !== bodyCluster && (cluster.size ?? 0) > (bodyCluster?.size ?? 0) * 1.15)
    .sort((a, b) => (b.size ?? 0) - (a.size ?? 0));
  const h1 = toTextStyle(headingClusters[0] ?? null, page.width);
  const h2 = toTextStyle(headingClusters[1] ?? null, page.width);
  const h3 = toTextStyle(headingClusters[2] ?? null, page.width);
  const left = Math.min(...interior.map((fragment) => fragment.x));
  const top = Math.min(...interior.map((fragment) => fragment.y));
  const right = Math.max(...interior.map((fragment) => fragment.x + fragment.width));
  const bottom = Math.max(...interior.map((fragment) => fragment.y + fragment.height));
  result.page.margins = {
    top,
    right: Math.max(0, page.width - right),
    bottom: Math.max(0, page.height - bottom),
    left,
  };
  result.page.contentWidth = Math.max(0, right - left);
  result.page.contentHeight = Math.max(0, bottom - top);
  result.page.columns = 1;
  result.page.gutter = 0;
  result.body = bodyStyle ?? emptyEditorialTextStyle();
  result.headings = { h1, h2, h3, h4: null };

  const headerStyle = toTextStyle(clusterFragments(headerFragments)[0] ?? null, page.width);
  const footerStyle = toTextStyle(clusterFragments(footerFragments)[0] ?? null, page.width);
  result.header = { enabled: headerFragments.length > 0, position: 'top', style: headerStyle, alignment: headerStyle?.textAlign ?? 'unknown' };
  result.footer = { enabled: footerFragments.length > 0, position: 'bottom', style: footerStyle, alignment: footerStyle?.textAlign ?? 'unknown' };
  const folio = footerFragments.find((fragment) => /^(?:\d+|[ivxlcdm]+)$/i.test(fragment.text.trim()));
  result.pageNumber = {
    enabled: Boolean(folio),
    position: 'footer',
    style: folio ? toTextStyle(clusterFragments([folio])[0] ?? null, page.width) : footerStyle,
    alignment: folio ? inferAlignment(clusterFragments([folio])[0], page.width) : footerStyle?.textAlign ?? 'unknown',
  };

  const chapterFragments = interior.filter((fragment) => /^(?:chapter|cap[ií]tulo)\b/i.test(fragment.text.trim()));
  result.chapterOpening = {
    detected: chapterFragments.length >= Math.max(2, Math.ceil(pages.size * 0.2)),
    labelStyle: chapterFragments.length > 0 ? toTextStyle(clusterFragments(chapterFragments)[0], page.width) : null,
    titleStyle: h1 ?? h2,
    subtitleStyle: null,
    alignment: chapterFragments.length > 0 ? inferAlignment(clusterFragments(chapterFragments)[0], page.width) : 'unknown',
    spacingBefore: null,
    spacingAfter: null,
    pageBreakBefore: chapterFragments.length > 0,
    startOnOddPage: null,
  };

  const tocFragments = fragments.filter((fragment) => /table\s+of\s+contents|[íi]ndice/i.test(fragment.text));
  result.toc = {
    detected: tocFragments.length > 0,
    titleStyle: tocFragments.length > 0 ? toTextStyle(clusterFragments(tocFragments)[0], page.width) : null,
    entryStyle: null,
    pageNumberStyle: null,
    leaderStyle: fragments.some((fragment) => /\.{2,}/.test(fragment.text)) ? 'dots' : 'unknown',
  };

  result.palette = [...new Set(fragments.map((fragment) => fragment.color).filter((color): color is string => Boolean(color)))].slice(0, 6);
  const chapterCount = new Set(chapterFragments.map((fragment) => fragment.pageNumber)).size;
  result.observedStructure = {
    optional: true,
    frontMatter: fragments.some((fragment) => /contents|[íi]ndice|dedication|copyright/i.test(fragment.text)),
    chapterCount: chapterCount > 0 ? chapterCount : null,
    headingDepth: Math.min(4, 1 + headingClusters.length),
    backMatter: fragments.some((fragment) => /appendix|ap[eé]ndice|bibliography|bibliograf[ií]a/i.test(fragment.text)),
  };
  result.confidence = {
    overall: bodyStyle && (h1 || result.page.width) ? 'medium' : 'low',
    pageGeometry: confidenceFromCount(interior.length, fragments.length),
    bodyTypography: confidenceFromCount(bodyCluster?.fragments.length ?? 0, interior.length),
    headings: confidenceFromCount(headingClusters.reduce((sum, cluster) => sum + cluster.fragments.length, 0), interior.length),
    chapterOpening: result.chapterOpening.detected ? 'medium' : 'unknown',
    headers: headerFragments.length > 0 ? 'medium' : 'unknown',
    footers: footerFragments.length > 0 ? 'medium' : 'unknown',
    toc: result.toc.detected ? 'medium' : 'unknown',
  };
  return result;
}
