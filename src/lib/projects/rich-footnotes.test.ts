import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import { normalizeFootnoteReferenceMarkup, parseDocxFootnotes } from './rich-footnotes';

describe('canonical rich footnotes', () => {
  it('parses OOXML definitions without importing the Word marker as body text', async () => {
    const zip = new JSZip();
    zip.file(
      'word/footnotes.xml',
      '<w:footnotes>' +
        '<w:footnote w:id="-1" w:type="separator"><w:p><w:r><w:separator/></w:r></w:p></w:footnote>' +
        '<w:footnote w:id="2"><w:p><w:r><w:footnoteRef/></w:r><w:r><w:rPr><w:i/></w:rPr><w:t xml:space="preserve"> Daniel Kahneman</w:t></w:r></w:p></w:footnote>' +
      '</w:footnotes>',
    );

    const parsed = await parseDocxFootnotes(await zip.generateAsync({ type: 'nodebuffer' }));
    expect(parsed.hasSeparator).toBe(true);
    expect(parsed.definitions).toEqual([{ id: '2', displayNumber: '2', html: '<em> Daniel Kahneman</em>' }]);
  });

  it('projects a single numeric superscript reference without brackets', () => {
    expect(normalizeFootnoteReferenceMarkup('<p>Texto<sup><a href="#footnote-2">[2]</a></sup></p>'))
      .toBe('<p>Texto<sup data-footnote-reference="2">2</sup></p>');
    expect(normalizeFootnoteReferenceMarkup('<p>Texto<sup><a id="footnote-ref-2" href="#footnote-2">[2]</a></sup></p>'))
      .toBe('<p>Texto<sup data-footnote-reference="2">2</sup></p>');
  });
});
