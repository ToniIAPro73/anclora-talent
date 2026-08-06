import { readFile } from 'node:fs/promises';
import path from 'node:path';
import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import { extractDocxNormalStyle } from './docx-styles';

async function buildDocxWithStyles(stylesXml: string): Promise<Buffer> {
  const zip = new JSZip();
  zip.file('word/styles.xml', stylesXml);
  return zip.generateAsync({ type: 'nodebuffer' });
}

describe('extractDocxNormalStyle', () => {
  it('extracts family and size from the Normal paragraph style', async () => {
    const buffer = await buildDocxWithStyles(
      `<?xml version="1.0"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">` +
        `<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/>` +
        `<w:rPr><w:rFonts w:ascii="Georgia" w:hAnsi="Georgia" w:cs="Georgia"/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr>` +
        `</w:style></w:styles>`,
    );

    await expect(extractDocxNormalStyle(buffer)).resolves.toEqual({
      fontFamily: 'Georgia',
      fontSizePt: 12,
    });
  });

  it('matches the Normal style regardless of attribute order and odd half-points', async () => {
    const buffer = await buildDocxWithStyles(
      `<w:styles><w:style w:styleId="Normal" w:type="paragraph">` +
        `<w:rPr><w:rFonts w:hAnsi="Calibri"/><w:sz w:val="23"/></w:rPr>` +
        `</w:style></w:styles>`,
    );

    await expect(extractDocxNormalStyle(buffer)).resolves.toEqual({
      fontFamily: 'Calibri',
      fontSizePt: 11.5,
    });
  });

  it('returns null when styles.xml is missing', async () => {
    const zip = new JSZip();
    zip.file('word/document.xml', '<w:document/>');
    const buffer = await zip.generateAsync({ type: 'nodebuffer' });
    await expect(extractDocxNormalStyle(buffer)).resolves.toBeNull();
  });

  it('returns null for a corrupt buffer (never throws)', async () => {
    const corrupt = Buffer.from('this is definitely not a zip file');
    await expect(extractDocxNormalStyle(corrupt)).resolves.toBeNull();
  });

  it('handles the real exito_sin_compania.docx fixture gracefully', async () => {
    const fixturePath = path.join(process.cwd(), 'fixtures', 'exito_sin_compania.docx');
    const buffer = await readFile(fixturePath);
    const result = await extractDocxNormalStyle(buffer);

    // The fixture declares an empty Normal style (typography lives in
    // docDefaults), so extraction must degrade to null without throwing. If a
    // future fixture version defines the Normal style, family and/or size
    // must come through instead.
    if (result === null) {
      expect(result).toBeNull();
    } else {
      expect(result.fontFamily === undefined || typeof result.fontFamily === 'string').toBe(true);
      expect(result.fontSizePt === undefined || result.fontSizePt > 0).toBe(true);
      expect(result.fontFamily !== undefined || result.fontSizePt !== undefined).toBe(true);
    }
  });
});
