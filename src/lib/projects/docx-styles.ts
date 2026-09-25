/**
 * Deep extraction of DOCX styles, page geometry, body typography, headings,
 * and layout properties from OOXML package (`word/styles.xml`, `word/document.xml`, etc.).
 *
 * Preserves explicit provenance and normalizes all measurements to Points (pt).
 */

import JSZip from 'jszip';
import type { OriginalDocumentStyleProfile } from './source-style-profile';
import { halfPointsToPoints, twipsToPoints } from './units';
import type { ResolvedTextStyle } from '@/lib/style-engine/model';

export interface DocxNormalStyle {
  fontFamily?: string;
  /** Font size in pt (`w:sz` values are half-points). */
  fontSizePt?: number;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  lineHeight?: number;
  firstLineIndentPt?: number;
  spacingBeforePt?: number;
  spacingAfterPt?: number;
}

interface ParsedXmlStyle {
  styleId: string;
  type: string;
  name?: string;
  basedOn?: string;
  fontFamily?: string;
  fontSizePt?: number;
  fontWeight?: 'normal' | 'medium' | 'semibold' | 'bold';
  fontStyle?: 'normal' | 'italic';
  color?: string;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  lineHeight?: number;
  firstLineIndentPt?: number;
  leftIndentPt?: number;
  rightIndentPt?: number;
  spacingBeforePt?: number;
  spacingAfterPt?: number;
}

function parseAlignment(val: string | null | undefined): 'left' | 'center' | 'right' | 'justify' | undefined {
  if (!val) return undefined;
  const lower = val.toLowerCase().trim();
  if (lower === 'both' || lower === 'distribute' || lower === 'justify') return 'justify';
  if (lower === 'center') return 'center';
  if (lower === 'right' || lower === 'end') return 'right';
  if (lower === 'left' || lower === 'start') return 'left';
  return undefined;
}

function parseLineSpacing(spacingTag: string): number | undefined {
  const lineMatch = spacingTag.match(/\bw:line="(\d+)"/);
  const ruleMatch = spacingTag.match(/\bw:lineRule="([^"]+)"/);
  if (!lineMatch) return undefined;

  const lineVal = Number.parseInt(lineMatch[1], 10);
  if (!Number.isFinite(lineVal) || lineVal <= 0) return undefined;

  const rule = (ruleMatch?.[1] || 'auto').toLowerCase();
  if (rule === 'auto') {
    // 240 is 1.0 (single line spacing in 240ths of a line)
    const multiplier = lineVal / 240;
    return Number.parseFloat(multiplier.toFixed(2));
  }
  // exact or atLeast (twips)
  return Number.parseFloat((twipsToPoints(lineVal) / 12).toFixed(2));
}

function parseFontFamily(rpr: string): string | undefined {
  const fontsMatch = rpr.match(/<w:rFonts\b([^>]*)\/?>/);
  if (!fontsMatch) return undefined;
  const attrs = fontsMatch[1];
  const ascii = attrs.match(/\bw:ascii="([^"]+)"/)?.[1];
  const hAnsi = attrs.match(/\bw:hAnsi="([^"]+)"/)?.[1];
  const cs = attrs.match(/\bw:cs="([^"]+)"/)?.[1];
  const family = ascii ?? hAnsi ?? cs;
  return family?.trim() || undefined;
}

function parseFontSizePt(rpr: string): number | undefined {
  const sizeMatch = rpr.match(/<w:sz\b[^>]*\bw:val="(\d+(?:\.\d+)?)"/);
  if (!sizeMatch) return undefined;
  const halfPoints = Number.parseFloat(sizeMatch[1]);
  if (!Number.isFinite(halfPoints) || halfPoints <= 0) return undefined;
  return halfPointsToPoints(halfPoints);
}

function parseColor(rpr: string): string | undefined {
  const colorMatch = rpr.match(/<w:color\b[^>]*\bw:val="([0-9a-fA-F]{6}|auto)"/);
  if (!colorMatch) return undefined;
  const val = colorMatch[1];
  if (val.toLowerCase() === 'auto') return undefined;
  return `#${val.toUpperCase()}`;
}

function parseFontWeight(rpr: string): 'normal' | 'bold' | undefined {
  const boldMatch = rpr.match(/<w:b\b([^>]*)\/?>/);
  if (!boldMatch) return undefined;
  const val = boldMatch[1]?.match(/\bw:val="([^"]+)"/)?.[1];
  if (val === '0' || val === 'false' || val === 'off') return 'normal';
  return 'bold';
}

function parseFontStyle(rpr: string): 'normal' | 'italic' | undefined {
  const italicMatch = rpr.match(/<w:i\b([^>]*)\/?>/);
  if (!italicMatch) return undefined;
  const val = italicMatch[1]?.match(/\bw:val="([^"]+)"/)?.[1];
  if (val === '0' || val === 'false' || val === 'off') return 'normal';
  return 'italic';
}

function parseParagraphProperties(ppr: string) {
  const result: Partial<ParsedXmlStyle> = {};

  const jcMatch = ppr.match(/<w:jc\b[^>]*\bw:val="([^"]+)"/);
  if (jcMatch) {
    const align = parseAlignment(jcMatch[1]);
    if (align) result.textAlign = align;
  }

  const spacingMatch = ppr.match(/<w:spacing\b([^>]*)\/?>/);
  if (spacingMatch) {
    const attrs = spacingMatch[1];
    const beforeMatch = attrs.match(/\bw:before="(\d+)"/);
    if (beforeMatch) result.spacingBeforePt = twipsToPoints(Number.parseInt(beforeMatch[1], 10));

    const afterMatch = attrs.match(/\bw:after="(\d+)"/);
    if (afterMatch) result.spacingAfterPt = twipsToPoints(Number.parseInt(afterMatch[1], 10));

    const lineHeight = parseLineSpacing(spacingMatch[0]);
    if (lineHeight) result.lineHeight = lineHeight;
  }

  const indMatch = ppr.match(/<w:ind\b([^>]*)\/?>/);
  if (indMatch) {
    const attrs = indMatch[1];
    const firstLine = attrs.match(/\bw:firstLine="(\d+)"/);
    if (firstLine) result.firstLineIndentPt = twipsToPoints(Number.parseInt(firstLine[1], 10));

    const left = attrs.match(/\bw:left="(\d+)"/);
    if (left) result.leftIndentPt = twipsToPoints(Number.parseInt(left[1], 10));

    const right = attrs.match(/\bw:right="(\d+)"/);
    if (right) result.rightIndentPt = twipsToPoints(Number.parseInt(right[1], 10));
  }

  return result;
}

function parseRunProperties(rpr: string) {
  const result: Partial<ParsedXmlStyle> = {};
  const family = parseFontFamily(rpr);
  if (family) result.fontFamily = family;

  const size = parseFontSizePt(rpr);
  if (size !== undefined) result.fontSizePt = size;

  const weight = parseFontWeight(rpr);
  if (weight) result.fontWeight = weight;

  const style = parseFontStyle(rpr);
  if (style) result.fontStyle = style;

  const color = parseColor(rpr);
  if (color) result.color = color;

  return result;
}

function parseAllStyles(xml: string): Map<string, ParsedXmlStyle> {
  const stylesMap = new Map<string, ParsedXmlStyle>();
  const styleTagPattern = /<w:style\b([^>]*)>([\s\S]*?)<\/w:style>/g;
  let match: RegExpExecArray | null;

  while ((match = styleTagPattern.exec(xml)) !== null) {
    const attrs = match[1];
    const body = match[2];

    const styleId = attrs.match(/\bw:styleId="([^"]+)"/)?.[1] || '';
    const type = attrs.match(/\bw:type="([^"]+)"/)?.[1] || 'paragraph';
    const name = body.match(/<w:name\b[^>]*\bw:val="([^"]+)"/)?.[1];
    const basedOn = body.match(/<w:basedOn\b[^>]*\bw:val="([^"]+)"/)?.[1];

    const styleObj: ParsedXmlStyle = {
      styleId,
      type,
      name,
      basedOn,
    };

    const ppr = body.match(/<w:pPr>([\s\S]*?)<\/w:pPr>/)?.[1];
    if (ppr) {
      Object.assign(styleObj, parseParagraphProperties(ppr));
    }

    const rpr = body.match(/<w:rPr>([\s\S]*?)<\/w:rPr>/)?.[1];
    if (rpr) {
      Object.assign(styleObj, parseRunProperties(rpr));
    }

    stylesMap.set(styleId, styleObj);
    if (name && name !== styleId) {
      stylesMap.set(name.toLowerCase(), styleObj);
    }
  }

  return stylesMap;
}

function parseDocDefaults(xml: string): ParsedXmlStyle {
  const defaults: ParsedXmlStyle = { styleId: 'docDefaults', type: 'paragraph' };
  const rprDefault = xml.match(/<w:rPrDefault>[\s\S]*?<w:rPr>([\s\S]*?)<\/w:rPr>[\s\S]*?<\/w:rPrDefault>/)?.[1];
  if (rprDefault) {
    Object.assign(defaults, parseRunProperties(rprDefault));
  }

  const pprDefault = xml.match(/<w:pPrDefault>[\s\S]*?<w:pPr>([\s\S]*?)<\/w:pPr>[\s\S]*?<\/w:pPrDefault>/)?.[1];
  if (pprDefault) {
    Object.assign(defaults, parseParagraphProperties(pprDefault));
  }

  return defaults;
}

function resolveInheritedStyle(
  styleIdOrName: string,
  stylesMap: Map<string, ParsedXmlStyle>,
  defaults: ParsedXmlStyle,
  visited = new Set<string>(),
): ParsedXmlStyle {
  const result: ParsedXmlStyle = { ...defaults };
  const style = stylesMap.get(styleIdOrName) || stylesMap.get(styleIdOrName.toLowerCase());
  if (!style) return result;

  if (style.basedOn && !visited.has(style.basedOn)) {
    visited.add(styleIdOrName);
    const parent = resolveInheritedStyle(style.basedOn, stylesMap, defaults, visited);
    Object.assign(result, parent);
  }

  Object.assign(result, style);
  return result;
}

export function extractPageGeometryFromDocumentXml(documentXml: string) {
  const page: OriginalDocumentStyleProfile['page'] = {};
  const sectPrMatch = documentXml.match(/<w:sectPr\b([^>]*)>([\s\S]*?)<\/w:sectPr>/) ||
    documentXml.match(/<w:sectPr\b([^>]*)\/?>/);

  if (!sectPrMatch) return page;

  const fullSect = sectPrMatch[0];

  const pgSzMatch = fullSect.match(/<w:pgSz\b([^>]*)\/?>/);
  if (pgSzMatch) {
    const attrs = pgSzMatch[1];
    const w = attrs.match(/\bw:w="(\d+)"/)?.[1];
    const h = attrs.match(/\bw:h="(\d+)"/)?.[1];
    const orient = attrs.match(/\bw:orient="([^"]+)"/)?.[1];

    if (w) page.widthPt = twipsToPoints(Number.parseInt(w, 10));
    if (h) page.heightPt = twipsToPoints(Number.parseInt(h, 10));
    if (orient === 'landscape') page.orientation = 'landscape';
    else if (orient) page.orientation = 'portrait';
  }

  const pgMarMatch = fullSect.match(/<w:pgMar\b([^>]*)\/?>/);
  if (pgMarMatch) {
    const attrs = pgMarMatch[1];
    const top = attrs.match(/\bw:top="(\d+)"/)?.[1];
    const bottom = attrs.match(/\bw:bottom="(\d+)"/)?.[1];
    const left = attrs.match(/\bw:left="(\d+)"/)?.[1];
    const right = attrs.match(/\bw:right="(\d+)"/)?.[1];
    const gutter = attrs.match(/\bw:gutter="(\d+)"/)?.[1];

    page.marginsPt = {
      top: top ? twipsToPoints(Number.parseInt(top, 10)) : 54,
      bottom: bottom ? twipsToPoints(Number.parseInt(bottom, 10)) : 54,
      left: left ? twipsToPoints(Number.parseInt(left, 10)) : 54,
      right: right ? twipsToPoints(Number.parseInt(right, 10)) : 54,
    };
    if (gutter) page.gutterPt = twipsToPoints(Number.parseInt(gutter, 10));
  }

  return page;
}

export function extractDominantDocumentAlignment(documentXml: string): 'left' | 'center' | 'right' | 'justify' | undefined {
  const jcMatches = Array.from(documentXml.matchAll(/<w:jc\b[^>]*\bw:val="([^"]+)"/g));
  if (jcMatches.length === 0) return undefined;

  const counts: Record<string, number> = {};
  for (const m of jcMatches) {
    const align = parseAlignment(m[1]);
    if (align) {
      counts[align] = (counts[align] || 0) + 1;
    }
  }

  let dominant: 'left' | 'center' | 'right' | 'justify' | undefined;
  let maxCount = 0;
  for (const [align, count] of Object.entries(counts)) {
    if (count > maxCount) {
      maxCount = count;
      dominant = align as 'left' | 'center' | 'right' | 'justify';
    }
  }
  return dominant;
}

/**
 * Deep extraction of the complete original document style profile from a DOCX buffer.
 */
export async function extractOriginalDocumentStyleProfile(
  buffer: Buffer | ArrayBuffer,
): Promise<OriginalDocumentStyleProfile> {
  const profile: OriginalDocumentStyleProfile = {
    version: 1,
    parserVersion: '2.0.0',
    extractedAt: new Date().toISOString(),
    page: {},
    body: {},
    headings: {},
    provenance: {},
  };

  try {
    const zip = await JSZip.loadAsync(buffer);

    let stylesXml = '';
    const stylesFile = zip.file('word/styles.xml');
    if (stylesFile) {
      stylesXml = await stylesFile.async('string');
    }

    let documentXml = '';
    const docFile = zip.file('word/document.xml');
    if (docFile) {
      documentXml = await docFile.async('string');
    }

    // 1. Page Geometry from document.xml
    if (documentXml) {
      profile.page = extractPageGeometryFromDocumentXml(documentXml);
      if (profile.page.widthPt) {
        profile.provenance!['page.widthPt'] = {
          source: 'docx-direct',
          confidence: 1.0,
          extractionMethod: 'sectPr.pgSz',
        };
      }
      if (profile.page.marginsPt) {
        profile.provenance!['page.marginsPt'] = {
          source: 'docx-direct',
          confidence: 1.0,
          extractionMethod: 'sectPr.pgMar',
        };
      }
    }

    // 2. Parse Styles and docDefaults
    const defaults = parseDocDefaults(stylesXml);
    const stylesMap = parseAllStyles(stylesXml);

    // 3. Resolve Normal Body Style
    const normalResolved = resolveInheritedStyle('Normal', stylesMap, defaults);

    // If dominant paragraph alignment in document.xml is distinct, respect it
    const dominantAlign = documentXml ? extractDominantDocumentAlignment(documentXml) : undefined;
    // A direct paragraph alignment is only a fallback when the Normal style
    // does not define one. A single heading or quoted paragraph must not
    // silently become the body alignment for the whole manuscript.
    const effectiveAlign = normalResolved.textAlign ?? dominantAlign ?? 'left';

    profile.body = {
      fontFamily: normalResolved.fontFamily,
      fontSizePt: normalResolved.fontSizePt,
      fontWeight: normalResolved.fontWeight,
      fontStyle: normalResolved.fontStyle,
      color: normalResolved.color,
      lineHeight: normalResolved.lineHeight,
      textAlign: effectiveAlign,
      firstLineIndentPt: normalResolved.firstLineIndentPt,
      leftIndentPt: normalResolved.leftIndentPt,
      rightIndentPt: normalResolved.rightIndentPt,
      spacingBeforePt: normalResolved.spacingBeforePt,
      spacingAfterPt: normalResolved.spacingAfterPt,
    };

    if (normalResolved.fontFamily) {
      profile.provenance!['body.fontFamily'] = {
        source: 'docx-styles',
        confidence: 1.0,
        rawOoxmlValue: normalResolved.fontFamily,
      };
    }
    if (normalResolved.fontSizePt !== undefined) {
      profile.provenance!['body.fontSizePt'] = {
        source: 'docx-styles',
        confidence: 1.0,
        rawOoxmlValue: String(normalResolved.fontSizePt),
      };
    }
    if (effectiveAlign) {
      profile.provenance!['body.textAlign'] = {
        source: dominantAlign ? 'docx-direct' : 'docx-styles',
        confidence: 1.0,
        rawOoxmlValue: effectiveAlign,
      };
    }

    // 4. Resolve Headings h1..h4
    const headingKeys: Array<[keyof NonNullable<OriginalDocumentStyleProfile['headings']>, string[]]> = [
      ['h1', ['heading 1', 'heading1', 'título 1', 'encabezado 1']],
      ['h2', ['heading 2', 'heading2', 'título 2', 'encabezado 2']],
      ['h3', ['heading 3', 'heading3', 'título 3', 'encabezado 3']],
      ['h4', ['heading 4', 'heading4', 'título 4', 'encabezado 4']],
    ];

    profile.headings = {};
    for (const [hKey, aliases] of headingKeys) {
      let resolvedH: ParsedXmlStyle | null = null;
      for (const alias of aliases) {
        if (stylesMap.has(alias) || stylesMap.has(alias.toLowerCase())) {
          resolvedH = resolveInheritedStyle(alias, stylesMap, defaults);
          break;
        }
      }
      if (resolvedH) {
        const headingStyle: Partial<ResolvedTextStyle> = {};
        if (resolvedH.fontFamily) headingStyle.fontFamily = resolvedH.fontFamily;
        if (resolvedH.fontSizePt !== undefined) headingStyle.fontSizePt = resolvedH.fontSizePt;
        if (resolvedH.fontWeight) headingStyle.fontWeight = resolvedH.fontWeight;
        if (resolvedH.fontStyle) headingStyle.fontStyle = resolvedH.fontStyle;
        if (resolvedH.color) headingStyle.color = resolvedH.color;
        if (resolvedH.lineHeight !== undefined) headingStyle.lineHeight = resolvedH.lineHeight;
        if (resolvedH.textAlign) headingStyle.textAlign = resolvedH.textAlign;
        if (resolvedH.spacingBeforePt !== undefined) headingStyle.spacingBeforePt = resolvedH.spacingBeforePt;
        if (resolvedH.spacingAfterPt !== undefined) headingStyle.spacingAfterPt = resolvedH.spacingAfterPt;

        if (Object.keys(headingStyle).length > 0) {
          profile.headings[hKey] = headingStyle;
          profile.provenance![`headings.${hKey}`] = {
            source: 'docx-styles',
            confidence: 0.95,
          };
        }
      }
    }

    return profile;
  } catch {
    return profile;
  }
}

/**
 * Legacy adapter for extractDocxNormalStyle.
 */
export async function extractDocxNormalStyle(
  buffer: Buffer | ArrayBuffer,
): Promise<DocxNormalStyle | null> {
  const profile = await extractOriginalDocumentStyleProfile(buffer);
  const result: DocxNormalStyle = {};
  if (profile.body.fontFamily) result.fontFamily = profile.body.fontFamily;
  if (profile.body.fontSizePt !== undefined) result.fontSizePt = profile.body.fontSizePt;
  if (profile.body.textAlign) result.textAlign = profile.body.textAlign;
  if (profile.body.lineHeight) result.lineHeight = profile.body.lineHeight;
  if (profile.body.firstLineIndentPt !== undefined) result.firstLineIndentPt = profile.body.firstLineIndentPt;
  if (profile.body.spacingBeforePt !== undefined) result.spacingBeforePt = profile.body.spacingBeforePt;
  if (profile.body.spacingAfterPt !== undefined) result.spacingAfterPt = profile.body.spacingAfterPt;

  return Object.keys(result).length > 0 ? result : null;
}
