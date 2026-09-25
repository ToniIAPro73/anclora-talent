import { describe, expect, it } from 'vitest';
import { extractSourcePaginationBaseline, isSourcePaginationBaselineValid } from './source-pagination';
import JSZip from 'jszip';

async function docxWithManualBreak(): Promise<Buffer> {
  const zip = new JSZip();
  zip.file('word/document.xml', `<w:document xmlns:w="x"><w:body>
    <w:p><w:r><w:t>Primera página</w:t></w:r><w:r><w:br w:type="page"/></w:r></w:p>
    <w:p><w:r><w:t>Segunda página</w:t></w:r></w:p>
  </w:body></w:document>`);
  return zip.generateAsync({ type: 'nodebuffer' });
}

describe('source pagination baseline', () => {
  it('persists manual OOXML page boundaries as editable anchors', async () => {
    const blocks = [
      { type: 'paragraph', content: 'Primera página' },
      { type: 'paragraph', content: 'Segunda página' },
    ];
    const baseline = await extractSourcePaginationBaseline(await docxWithManualBreak(), blocks, 'source-hash');

    expect(baseline?.exactness).toBe('proven_ooxml_breaks');
    expect(baseline?.pageCount).toBe(2);
    expect(baseline?.pages[0].endAnchor.blockIndex).toBe(0);
    expect(baseline?.pages[1].startAnchor.blockIndex).toBe(0);
    expect(isSourcePaginationBaselineValid(baseline, blocks, 'source-hash')).toBe(true);
    expect(isSourcePaginationBaselineValid(baseline, [{ ...blocks[0], content: 'editado' }, blocks[1]], 'source-hash')).toBe(false);
  });

  it('does not claim a baseline when OOXML has no page marker', async () => {
    const zip = new JSZip();
    zip.file('word/document.xml', '<w:document xmlns:w="x"><w:body><w:p><w:r><w:t>Texto</w:t></w:r></w:p></w:body></w:document>');
    const baseline = await extractSourcePaginationBaseline(await zip.generateAsync({ type: 'nodebuffer' }), [{ type: 'paragraph', content: 'Texto' }], 'hash');
    expect(baseline).toBeNull();
  });
});
