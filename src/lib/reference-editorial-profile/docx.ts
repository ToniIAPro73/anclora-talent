import JSZip from 'jszip';
import { normalizePdfFontName, resolveEditorialFont } from './font-normalization';
import type { EditorialTextStyle, ReferenceEditorialProfile } from './model';

export interface DocxEditorialAnalysis {
  profile: ReferenceEditorialProfile;
  analysis: { partsAnalysed: string[]; warnings: string[] };
}

interface DocxSourceInput { filename: string; sourceAssetId?: string | null; hash?: string | null; }

const emptyStyle = (): EditorialTextStyle => ({ fontFamily: null, resolvedFontFamily: null, fontSize: null, fontWeight: 'unknown', fontStyle: 'unknown', color: null, lineHeight: null, textAlign: 'unknown', firstLineIndent: null, paragraphSpacingBefore: null, paragraphSpacingAfter: null });
const attr = (xml: string, name: string) => xml.match(new RegExp(`\\bw:${name}="([^"]+)"`))?.[1];
const points = (value: string | undefined) => { const n = value ? Number(value) : NaN; return Number.isFinite(n) && n > 0 ? n / 2 : null; };
const twips = (value: string | undefined) => { const n = value ? Number(value) : NaN; return Number.isFinite(n) && n > 0 ? n / 20 : null; };

function styleFromBlock(block: string, availableFonts: string[]): EditorialTextStyle {
  const style = emptyStyle();
  const rpr = block.match(/<w:rPr>([\s\S]*?)<\/w:rPr>/)?.[1] ?? block;
  const rawFont = rpr.match(/<w:rFonts\b([^>]*)\/?>(?:<\/w:rFonts>)?/)?.[1];
  const detected = rawFont?.match(/\bw:(?:ascii|hAnsi)="([^"]+)"/)?.[1];
  if (detected) { const normalized = normalizePdfFontName(detected); style.fontFamily = normalized.family; style.resolvedFontFamily = resolveEditorialFont(normalized.family, availableFonts).resolvedFontFamily; }
  style.fontSize = points(rpr.match(/<w:sz\b[^>]*\bw:val="([^"]+)"/)?.[1]);
  style.fontWeight = /<w:b(?:\s[^>]*)?\/>/.test(rpr) ? 'bold' : 'normal';
  style.fontStyle = /<w:i(?:\s[^>]*)?\/>/.test(rpr) ? 'italic' : 'normal';
  const color = rpr.match(/<w:color\b[^>]*\bw:val="([0-9A-Fa-f]{6})"/)?.[1];
  style.color = color ? `#${color}` : null;
  const ppr = block.match(/<w:pPr>([\s\S]*?)<\/w:pPr>/)?.[1] ?? '';
  const align = attr(ppr, 'val');
  style.textAlign = align === 'both' ? 'justify' : align === 'left' || align === 'center' || align === 'right' ? align : 'unknown';
  style.firstLineIndent = twips(ppr.match(/<w:ind\b[^>]*\bw:firstLine="([^"]+)"/)?.[1]);
  style.paragraphSpacingAfter = twips(ppr.match(/<w:spacing\b[^>]*\bw:after="([^"]+)"/)?.[1]);
  const line = Number(ppr.match(/<w:spacing\b[^>]*\bw:line="([^"]+)"/)?.[1] ?? '');
  style.lineHeight = Number.isFinite(line) && style.fontSize ? (line / 240) : null;
  return style;
}

function styleBlock(styles: string, id: string): string | null {
  return [...styles.matchAll(/<w:style\b([^>]*)>([\s\S]*?)<\/w:style>/g)].find((match) => attr(match[1], 'styleId') === id)?.[0] ?? null;
}

function fallbackStyle(styles: string): string | null { return styleBlock(styles, 'Normal') ?? styles.match(/<w:docDefaults[\s\S]*?<w:rPr>([\s\S]*?)<\/w:rPr>/)?.[0] ?? null; }

/** Reads OOXML styles and section geometry into the shared editorial profile model. */
export async function extractEditorialProfileFromDocx(buffer: Buffer | ArrayBuffer, source: DocxSourceInput): Promise<DocxEditorialAnalysis> {
  const zip = await JSZip.loadAsync(buffer);
  const warnings: string[] = [];
  const stylesFile = zip.file('word/styles.xml');
  const documentFile = zip.file('word/document.xml');
  if (!stylesFile || !documentFile) throw new Error('Invalid DOCX package');
  const styles = await stylesFile.async('string');
  const document = await documentFile.async('string');
  const availableFonts = ['EB Garamond', 'Inter', 'Georgia'];
  const body = styleFromBlock(fallbackStyle(styles) ?? '', availableFonts);
  const h1 = styleBlock(styles, 'Heading1') ? styleFromBlock(styleBlock(styles, 'Heading1')!, availableFonts) : null;
  const h2 = styleBlock(styles, 'Heading2') ? styleFromBlock(styleBlock(styles, 'Heading2')!, availableFonts) : null;
  const h3 = styleBlock(styles, 'Heading3') ? styleFromBlock(styleBlock(styles, 'Heading3')!, availableFonts) : null;
  const quoteBlock = styleBlock(styles, 'Quote');
  const quote = quoteBlock ? styleFromBlock(quoteBlock, availableFonts) : null;
  const listStyle = (id: string, marker: 'bullet' | 'decimal') => { const block = styleBlock(styles, id); return block ? { style: styleFromBlock(block, availableFonts), indent: twips(block.match(/w:left="([^"]+)"/)?.[1]), marker, spacing: null } : null; };
  const section = document.match(/<w:sectPr[\s\S]*?<\/w:sectPr>/)?.[0] ?? '';
  const pageWidth = twips(section.match(/<w:pgSz\b[^>]*\bw:w="([^"]+)"/)?.[1]);
  const pageHeight = twips(section.match(/<w:pgSz\b[^>]*\bw:h="([^"]+)"/)?.[1]);
  const margins = { top: twips(section.match(/<w:pgMar\b[^>]*\bw:top="([^"]+)"/)?.[1]), right: twips(section.match(/<w:pgMar\b[^>]*\bw:right="([^"]+)"/)?.[1]), bottom: twips(section.match(/<w:pgMar\b[^>]*\bw:bottom="([^"]+)"/)?.[1]), left: twips(section.match(/<w:pgMar\b[^>]*\bw:left="([^"]+)"/)?.[1]) };
  if (!body.fontFamily && !body.fontSize) warnings.push('No Normal style typography was found.');
  const hasHeader = Object.keys(zip.files).some((name) => /^word\/header\d+\.xml$/.test(name));
  const hasFooter = Object.keys(zip.files).some((name) => /^word\/footer\d+\.xml$/.test(name));
  const profile: ReferenceEditorialProfile = {
    version: 1, profileType: 'editorial',
    source: { sourceAssetId: source.sourceAssetId ?? null, format: 'docx', filename: source.filename, hash: source.hash ?? null, analysedAt: new Date().toISOString(), parserVersion: 'docx-ooxml-v1' },
    metrics: { totalHeadings: 0, desglose: { h1Partes: 0, h2Capitulos: 0, h3Subsecciones: 0 }, tablas: 0, imagenes: 0 },
    page: { width: pageWidth, height: pageHeight, unit: 'pt', orientation: pageWidth && pageHeight ? (pageWidth > pageHeight ? 'landscape' : 'portrait') : 'unknown', margins, contentWidth: pageWidth && margins.left !== null && margins.right !== null ? pageWidth - margins.left - margins.right : null, contentHeight: pageHeight && margins.top !== null && margins.bottom !== null ? pageHeight - margins.top - margins.bottom : null, columns: 1, gutter: 0 },
    body, headings: { h1, h2, h3, h4: null }, chapterOpening: { detected: Boolean(h1), labelStyle: null, titleStyle: h1, subtitleStyle: h2, alignment: h1?.textAlign ?? 'unknown', spacingBefore: h1?.paragraphSpacingBefore ?? null, spacingAfter: h1?.paragraphSpacingAfter ?? null, pageBreakBefore: null, startOnOddPage: null }, quote, lists: { unordered: listStyle('ListBullet', 'bullet'), ordered: listStyle('ListNumber', 'decimal') }, captions: null,
    header: { enabled: hasHeader, position: 'top', style: null, alignment: 'unknown' }, footer: { enabled: hasFooter, position: 'bottom', style: null, alignment: 'unknown' }, pageNumber: { enabled: hasFooter && /PAGE|PAGE\s+/.test((await zip.file('word/footer1.xml')?.async('string')) ?? ''), position: 'footer', style: null, alignment: 'unknown' }, toc: { detected: /TOC|TOA/.test(document), titleStyle: null, entryStyle: null, pageNumberStyle: null, leaderStyle: 'unknown' }, separators: null, palette: [], confidence: { overall: body.fontFamily || body.fontSize ? 'medium' : 'low', pageGeometry: pageWidth && pageHeight ? 'high' : 'unknown', bodyTypography: body.fontFamily || body.fontSize ? 'high' : 'unknown', headings: h1 || h2 || h3 ? 'medium' : 'unknown', chapterOpening: h1 ? 'medium' : 'unknown', headers: hasHeader ? 'medium' : 'unknown', footers: hasFooter ? 'medium' : 'unknown', toc: /TOC|TOA/.test(document) ? 'low' : 'unknown' }, observedStructure: { optional: true, frontMatter: false, chapterCount: null, headingDepth: h3 ? 3 : h2 ? 2 : h1 ? 1 : null, backMatter: false },
  };
  return { profile, analysis: { partsAnalysed: ['word/styles.xml', 'word/document.xml', 'word/section properties'], warnings } };
}
