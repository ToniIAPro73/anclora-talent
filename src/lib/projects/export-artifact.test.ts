import JSZip from 'jszip';
import { describe, expect, test } from 'vitest';
import { validateExportArtifact } from './export-artifact';

const enc = (text: string) => new TextEncoder().encode(text);
const failed = (validation: Awaited<ReturnType<typeof validateExportArtifact>>) => validation.checks.filter((check) => !check.ok).map((check) => check.id);

async function docx(text: string) {
  const zip = new JSZip();
  zip.file('[Content_Types].xml', '<Types/>');
  zip.file('word/document.xml', `<w:document><w:body><w:p><w:r><w:t>${text}</w:t></w:r></w:p></w:body></w:document>`);
  return zip.generateAsync({ type: 'uint8array' });
}

async function epub({ firstMimetype = true, chapters = 2, nav = true } = {}) {
  const zip = new JSZip();
  if (firstMimetype) zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });
  zip.file('META-INF/container.xml', '<container><rootfiles><rootfile full-path="OEBPS/content.opf"/></rootfiles></container>');
  const items = Array.from({ length: chapters }, (_, index) => `<itemref idref="c${index}"/>`).join('');
  zip.file('OEBPS/content.opf', `<package><manifest>${nav ? '<item id="nav" href="nav.xhtml" properties="nav"/>' : ''}</manifest><spine>${items}</spine></package>`);
  if (!firstMimetype) zip.file('mimetype', 'application/epub+zip');
  return zip.generateAsync({ type: 'uint8array' });
}

describe('validateExportArtifact', () => {
  test('an empty body is never a passing export, whatever the status was', async () => {
    const validation = await validateExportArtifact('pdf', new Uint8Array(), 'application/pdf');
    expect(validation.ok).toBe(false);
    expect(failed(validation)).toContain('nonEmpty');
  });

  test('PDF: header, trailer and at least one page object', async () => {
    const pdf = enc('%PDF-1.7\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R >>\nendobj\n%%EOF');
    expect((await validateExportArtifact('pdf', pdf, 'application/pdf')).ok).toBe(true);
    expect(failed(await validateExportArtifact('pdf', enc('<html>not a pdf</html>'), 'application/pdf'))).toEqual(expect.arrayContaining(['pdfHeader', 'pdfTrailer', 'pdfPages']));
    expect(failed(await validateExportArtifact('pdf', enc('%PDF-1.7\n/Type /Pages only\n%%EOF'), 'application/pdf'))).toEqual(['pdfPages']);
    expect(failed(await validateExportArtifact('pdf', pdf, 'text/html'))).toEqual(['contentType']);
  });

  test('DOCX: package, document part and real text', async () => {
    const type = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    expect((await validateExportArtifact('docx', await docx('Capítulo uno'), type)).ok).toBe(true);
    expect(failed(await validateExportArtifact('docx', await docx('  '), type))).toEqual(['docxText']);
    expect(failed(await validateExportArtifact('docx', enc('not a zip'), type))).toContain('zipPackage');
  });

  test('EPUB: mimetype first, container, package, navigation and chapters', async () => {
    expect((await validateExportArtifact('epub', await epub(), 'application/epub+zip')).ok).toBe(true);
    expect(failed(await validateExportArtifact('epub', await epub({ firstMimetype: false }), 'application/epub+zip'))).toEqual(['epubMimetype']);
    expect(failed(await validateExportArtifact('epub', await epub({ nav: false }), 'application/epub+zip'))).toEqual(['epubNavigation']);
    expect(failed(await validateExportArtifact('epub', await epub({ chapters: 1 }), 'application/epub+zip'))).toEqual(['epubChapters']);
  });

  test('HTML and Markdown: document shell and real content', async () => {
    const html = '<!DOCTYPE html><html><body><h1>Título</h1><p>Texto</p></body></html>';
    expect((await validateExportArtifact('html', enc(html), 'text/html; charset=utf-8')).ok).toBe(true);
    expect(failed(await validateExportArtifact('html', enc('<p>fragment</p>'), 'text/html'))).toEqual(expect.arrayContaining(['htmlDocument', 'htmlBody']));
    expect((await validateExportArtifact('markdown', enc('# Título\n\nTexto'), 'text/markdown; charset=utf-8')).ok).toBe(true);
    expect(failed(await validateExportArtifact('markdown', enc('   \n'), 'text/markdown'))).toEqual(['markdownText']);
  });
});
