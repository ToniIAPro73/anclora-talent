import { readFile } from 'node:fs/promises';
import path from 'node:path';
import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import { extractOriginalDocumentStyleProfile } from './docx-styles';

async function buildDocx(files: Record<string, string>): Promise<Buffer> {
  const zip = new JSZip();
  for (const [name, content] of Object.entries(files)) {
    zip.file(name, content);
  }
  return zip.generateAsync({ type: 'nodebuffer' });
}

describe('extractOriginalDocumentStyleProfile', () => {
  it('extracts family, size, alignment and margins from OOXML', async () => {
    const buffer = await buildDocx({
      'word/styles.xml': `<?xml version="1.0"?>
        <w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
          <w:docDefaults>
            <w:rPrDefault><w:rPr><w:rFonts w:ascii="Liberation Serif"/><w:sz w:val="24"/></w:rPr></w:rPrDefault>
            <w:pPrDefault><w:pPr><w:jc w:val="both"/><w:spacing w:line="360" w:lineRule="auto"/></w:pPr></w:pPrDefault>
          </w:docDefaults>
          <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
            <w:name w:val="Normal"/>
          </w:style>
          <w:style w:type="paragraph" w:styleId="Heading1">
            <w:name w:val="heading 1"/>
            <w:rPr><w:rFonts w:ascii="Cinzel"/><w:sz w:val="40"/><w:b/></w:rPr>
            <w:pPr><w:jc w:val="center"/><w:spacing w:before="480" w:after="240"/></w:pPr>
          </w:style>
        </w:styles>`,
      'word/document.xml': `<?xml version="1.0"?>
        <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
          <w:body>
            <w:p><w:pPr><w:jc w:val="both"/></w:pPr><w:r><w:t>Texto justificado</w:t></w:r></w:p>
            <w:sectPr>
              <w:pgSz w:w="12240" w:h="15840" w:orient="portrait"/>
              <w:pgMar w:top="1440" w:bottom="1440" w:left="1440" w:right="1440" w:gutter="0"/>
            </w:sectPr>
          </w:body>
        </w:document>`,
    });

    const profile = await extractOriginalDocumentStyleProfile(buffer);

    expect(profile.body.fontFamily).toBe('Liberation Serif');
    expect(profile.body.fontSizePt).toBe(12);
    expect(profile.body.textAlign).toBe('justify');
    expect(profile.body.lineHeight).toBe(1.5);
    expect(profile.page.widthPt).toBe(612); // 12240 / 20 = 612 pt (8.5 in)
    expect(profile.page.heightPt).toBe(792); // 15840 / 20 = 792 pt (11 in)
    expect(profile.page.marginsPt).toEqual({ top: 72, bottom: 72, left: 72, right: 72 });
    expect(profile.headings?.h1).toEqual({
      fontFamily: 'Cinzel',
      fontSizePt: 20,
      fontWeight: 'bold',
      lineHeight: 1.5,
      textAlign: 'center',
      spacingBeforePt: 24,
      spacingAfterPt: 12,
    });
  });

  it('extracts styles from ANCLORA_TALENT_TEST_MANUSCRIPT.docx', async () => {
    const fixturePath = path.join(process.cwd(), 'src/lib/test-fixtures/corpus/ANCLORA_TALENT_TEST_MANUSCRIPT.docx');
    const buffer = await readFile(fixturePath);
    const profile = await extractOriginalDocumentStyleProfile(buffer);

    expect(profile.body.fontFamily).toBe('Liberation Serif');
    expect(profile.body.fontSizePt).toBe(12);
    expect(profile.body.textAlign).toBe('justify');
    expect(profile.page.widthPt).toBeGreaterThan(0);
    expect(profile.page.marginsPt?.top).toBeGreaterThan(0);
  });

  it('handles style inheritance with basedOn chain', async () => {
    const buffer = await buildDocx({
      'word/styles.xml': `<?xml version="1.0"?>
        <w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
          <w:style w:type="paragraph" w:styleId="BaseStyle">
            <w:rPr><w:rFonts w:ascii="EB Garamond"/><w:sz w:val="22"/><w:color w:val="333333"/></w:rPr>
            <w:pPr><w:jc w:val="left"/></w:pPr>
          </w:style>
          <w:style w:type="paragraph" w:styleId="Normal">
            <w:basedOn w:val="BaseStyle"/>
            <w:pPr><w:jc w:val="both"/></w:pPr>
          </w:style>
        </w:styles>`,
    });

    const profile = await extractOriginalDocumentStyleProfile(buffer);
    expect(profile.body.fontFamily).toBe('EB Garamond');
    expect(profile.body.fontSizePt).toBe(11);
    expect(profile.body.color).toBe('#333333');
    expect(profile.body.textAlign).toBe('justify');
  });

  it('returns empty profile gracefully for corrupted files', async () => {
    const corrupt = Buffer.from('not a zip file');
    const profile = await extractOriginalDocumentStyleProfile(corrupt);
    expect(profile.version).toBe(1);
    expect(profile.body).toEqual({});
  });
});
