import { describe, expect, test } from 'vitest';
import JSZip from 'jszip';
import { extractEditorialProfileFromDocx } from './docx';

describe('editorial profile DOCX extraction', () => {
  test('reads OOXML styles, inheritance signals and section geometry', async () => {
    const zip = new JSZip();
    zip.file('word/styles.xml', `<w:styles xmlns:w="x"><w:style w:type="paragraph" w:styleId="Normal"><w:rPr><w:rFonts w:ascii="Garamond Pro"/><w:sz w:val="22"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading1" w:basedOn="Normal"><w:rPr><w:rFonts w:ascii="Montserrat"/><w:b/><w:sz w:val="48"/></w:rPr><w:pPr><w:jc w:val="center"/></w:pPr></w:style><w:style w:type="paragraph" w:styleId="Quote"><w:rPr><w:i/><w:sz w:val="20"/></w:rPr></w:style></w:styles>`);
    zip.file('word/document.xml', `<w:document xmlns:w="x"><w:body><w:p><w:pPr><w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr></w:pPr></w:p></w:body></w:document>`);
    zip.file('word/header1.xml', '<w:hdr xmlns:w="x"/>');
    zip.file('word/footer1.xml', '<w:ftr xmlns:w="x"><w:fldSimple w:instr="PAGE"/></w:ftr>');
    const result = await extractEditorialProfileFromDocx(await zip.generateAsync({ type: 'nodebuffer' }), { filename: 'reference.docx' });
    expect(result.profile.body.fontSize).toBe(11);
    expect(result.profile.headings.h1?.fontSize).toBe(24);
    expect(result.profile.page.width).toBeCloseTo(595.3, 0);
    expect(result.profile.page.margins.top).toBe(72);
    expect(result.profile.header.enabled).toBe(true);
    expect(result.profile.pageNumber.enabled).toBe(true);
  });
});
