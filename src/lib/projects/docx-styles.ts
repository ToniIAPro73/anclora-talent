/**
 * U6: best-effort extraction of DOCX body typography (font family + size)
 * from `word/styles.xml`. It prefers the `Normal` paragraph style and falls
 * back to `docDefaults`. Used by the import flow to pre-fill the
 * document-data modal with values verified in the source file.
 *
 * The XML is scanned with simple regexes instead of a full XML parser: the
 * document is a zip part we control the read of, and a parse miss must simply
 * degrade to `null` (never block an import).
 */

import JSZip from 'jszip';

export interface DocxNormalStyle {
  fontFamily?: string;
  /** Font size in pt (`w:sz` values are half-points). */
  fontSizePt?: number;
}

function findNormalStyleBlock(xml: string): string | null {
  // Attribute order inside <w:style> is not guaranteed, so match the opening
  // tag loosely and require both w:type="paragraph" and w:styleId="Normal"
  // (falling back to w:default="1") anywhere within it.
  const styleTagPattern = /<w:style\b([^>]*)>([\s\S]*?)<\/w:style>/g;
  let match: RegExpExecArray | null;
  while ((match = styleTagPattern.exec(xml)) !== null) {
    const attrs = match[1];
    if (!/\bw:type="paragraph"/.test(attrs)) continue;
    if (/\bw:styleId="Normal"/.test(attrs) || /\bw:default="1"/.test(attrs)) {
      return match[2];
    }
  }
  return null;
}

function extractFontFamily(rpr: string): string | undefined {
  const fontsMatch = rpr.match(/<w:rFonts\b([^>]*)\/?>/);
  if (!fontsMatch) return undefined;
  const attrs = fontsMatch[1];
  const ascii = attrs.match(/\bw:ascii="([^"]+)"/)?.[1];
  const hAnsi = attrs.match(/\bw:hAnsi="([^"]+)"/)?.[1];
  const family = ascii ?? hAnsi;
  return family?.trim() || undefined;
}

function extractFontSizePt(rpr: string): number | undefined {
  const sizeMatch = rpr.match(/<w:sz\b[^>]*\bw:val="(\d+(?:\.\d+)?)"/);
  if (!sizeMatch) return undefined;
  const halfPoints = Number.parseFloat(sizeMatch[1]);
  if (!Number.isFinite(halfPoints) || halfPoints <= 0) return undefined;
  return halfPoints / 2;
}

function findDefaultRunProperties(xml: string): string | null {
  return xml.match(/<w:docDefaults\b[\s\S]*?<w:rPrDefault\b[\s\S]*?<w:rPr>([\s\S]*?)<\/w:rPr>/)?.[1] ?? null;
}

/**
 * Reads `word/styles.xml` from a .docx buffer and returns the body typography
 * from `Normal` or document defaults, or null when the file declares neither
 * family nor size.
 */
export async function extractDocxNormalStyle(
  buffer: Buffer | ArrayBuffer,
): Promise<DocxNormalStyle | null> {
  try {
    const zip = await JSZip.loadAsync(buffer);
    const stylesFile = zip.file('word/styles.xml');
    if (!stylesFile) return null;

    const xml = await stylesFile.async('string');
    const styleBlock = findNormalStyleBlock(xml);
    const rpr = styleBlock?.match(/<w:rPr>([\s\S]*?)<\/w:rPr>/)?.[1] ?? findDefaultRunProperties(xml);
    if (!rpr) return null;

    const result: DocxNormalStyle = {};
    const fontFamily = extractFontFamily(rpr);
    const fontSizePt = extractFontSizePt(rpr);
    if (fontFamily) result.fontFamily = fontFamily;
    if (fontSizePt !== undefined) result.fontSizePt = fontSizePt;

    return Object.keys(result).length > 0 ? result : null;
  } catch {
    return null;
  }
}
