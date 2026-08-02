import { describe, expect, it } from 'vitest';
import { htmlToBlocks, htmlToDocument } from './from-html';
import { blocksToHtml, documentToHtml } from './to-html';

describe('htmlToBlocks', () => {
  it('maps headings, paragraphs, lists and page breaks', () => {
    const blocks = htmlToBlocks(
      '<h1>Title</h1><p>Hello <strong>bold</strong> world</p>' +
        '<ul><li>one</li><li>two</li></ul><hr data-page-break="manual"/><p>After</p>',
    );
    expect(blocks.map((b) => b.type)).toEqual([
      'heading',
      'paragraph',
      'list',
      'pageBreak',
      'paragraph',
    ]);
    const paragraph = blocks[1];
    if (paragraph.type !== 'paragraph') throw new Error('expected paragraph');
    const bold = paragraph.content.find(
      (n) => n.type === 'text' && n.marks?.some((m) => m.type === 'bold'),
    );
    expect(bold).toBeDefined();
  });

  it('parses tables with header and caption', () => {
    const blocks = htmlToBlocks(
      '<table><caption>Data</caption><tr><th>A</th></tr><tr><td>1</td></tr></table>',
    );
    const table = blocks[0];
    if (table.type !== 'table') throw new Error('expected table');
    expect(table.hasHeader).toBe(true);
    expect(table.caption).toBe('Data');
    expect(table.rows).toHaveLength(2);
  });

  it('parses figure images with captions', () => {
    const blocks = htmlToBlocks(
      '<figure><img src="https://example.test/a.png" alt="A"/><figcaption>Fig A</figcaption></figure>',
    );
    const image = blocks[0];
    if (image.type !== 'image') throw new Error('expected image');
    expect(image.caption).toBe('Fig A');
  });

  it('parses live cross-reference tokens instead of plain text', () => {
    const blocks = htmlToBlocks(
      '<p>See <span data-ref-kind="figure" data-ref-target="fig-1">1.1</span> for details.</p>',
    );
    const paragraph = blocks[0];
    if (paragraph.type !== 'paragraph') throw new Error('expected paragraph');
    const ref = paragraph.content.find((n) => n.type === 'ref');
    expect(ref).toMatchObject({ type: 'ref', refKind: 'figure', targetId: 'fig-1' });
  });

  it('assigns stable unique ids', () => {
    const blocks = htmlToBlocks('<p>a</p><p>a</p>');
    expect(new Set(blocks.map((b) => b.id)).size).toBe(2);
  });
});

describe('documentToHtml round-trip', () => {
  it('serializes blocks back to the HTML dialect of the existing pipeline', () => {
    const document = htmlToDocument(
      ['<h2>Intro</h2><p>Text</p><ol><li>first</li></ol><hr data-page-break="manual"/>'],
      { title: 'Book', author: 'Anon' },
    );
    const html = documentToHtml(document);
    expect(html).toContain('<h2>Intro</h2>');
    expect(html).toContain('<ol><li>first</li></ol>');
    expect(html).toContain('<hr data-page-break="manual"/>');
  });

  it('materializes ref tokens with resolved labels from the composition', () => {
    const blocks = htmlToBlocks(
      '<p>See <span data-ref-kind="table" data-ref-target="t-9">?</span>.</p>',
    );
    const html = blocksToHtml(blocks, { 't-9': '2.3' });
    expect(html).toContain('data-ref-target="t-9"');
    expect(html).toContain('>2.3</span>');
  });
});
