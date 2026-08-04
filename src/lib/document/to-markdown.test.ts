import { describe, expect, test } from 'vitest';

import type { SemanticDocument } from './model';
import { documentToMarkdown, inlineToMarkdown } from './to-markdown';

function doc(blocks: SemanticDocument['blocks'], metadata?: Partial<SemanticDocument['metadata']>): SemanticDocument {
  return {
    version: 1,
    metadata: { title: 'Mi libro', ...metadata },
    blocks,
  };
}

describe('documentToMarkdown', () => {
  test('opens with title, subtitle and author from the metadata', () => {
    const md = documentToMarkdown(doc([], { subtitle: 'Sub', author: 'Autora' }));
    expect(md.startsWith('# Mi libro\n\n*Sub*\n\nAutora\n')).toBe(true);
    expect(md.endsWith('\n')).toBe(true);
  });

  test('headings use their level; paragraphs stay inline', () => {
    const md = documentToMarkdown(
      doc([
        { id: 'h1', type: 'heading', level: 2, content: [{ type: 'text', text: 'Capítulo 1' }] },
        { id: 'p1', type: 'paragraph', content: [{ type: 'text', text: 'Texto plano.' }] },
      ]),
    );
    expect(md).toContain('## Capítulo 1\n\nTexto plano.');
  });

  test('inline marks: bold, italic, link; ref tokens use their fallback', () => {
    const flow = inlineToMarkdown([
      { type: 'text', text: 'negrita', marks: [{ type: 'bold' }] },
      { type: 'text', text: ' e ' },
      { type: 'text', text: 'itálica', marks: [{ type: 'italic' }] },
      { type: 'text', text: ' y ' },
      { type: 'text', text: 'enlace', marks: [{ type: 'link', href: 'https://x.dev' }] },
      { type: 'text', text: ' ver ' },
      { type: 'ref', refKind: 'chapter', targetId: 'h1', fallback: 'Capítulo 1' },
    ]);
    expect(flow).toBe('**negrita** e *itálica* y [enlace](https://x.dev) ver Capítulo 1');
  });

  test('lists: unordered with "-", ordered renumbered from 1', () => {
    const md = documentToMarkdown(
      doc([
        {
          id: 'l1',
          type: 'list',
          ordered: false,
          items: [[{ type: 'text', text: 'uno' }], [{ type: 'text', text: 'dos' }]],
        },
        {
          id: 'l2',
          type: 'list',
          ordered: true,
          items: [[{ type: 'text', text: 'primero' }], [{ type: 'text', text: 'segundo' }]],
        },
      ]),
    );
    expect(md).toContain('- uno\n- dos');
    expect(md).toContain('1. primero\n2. segundo');
  });

  test('tables: header row + separator when hasHeader, caption as italic', () => {
    const md = documentToMarkdown(
      doc([
        {
          id: 't1',
          type: 'table',
          hasHeader: true,
          caption: 'Tabla 2.1',
          rows: [
            [[{ type: 'text', text: 'A' }], [{ type: 'text', text: 'B' }]],
            [[{ type: 'text', text: '1' }], [{ type: 'text', text: '2' }]],
          ],
        },
      ]),
    );
    expect(md).toContain('| A | B |\n| --- | --- |\n| 1 | 2 |\n*Tabla 2.1*');
  });

  test('tables without header emit an empty header row and escape pipes', () => {
    const md = documentToMarkdown(
      doc([
        {
          id: 't2',
          type: 'table',
          hasHeader: false,
          rows: [[[{ type: 'text', text: 'a|b' }], [{ type: 'text', text: 'c' }]]],
        },
      ]),
    );
    expect(md).toContain('|  |  |\n| --- | --- |\n| a\\|b | c |');
  });

  test('images become markdown links with the caption below', () => {
    const md = documentToMarkdown(
      doc([
        { id: 'i1', type: 'image', src: 'https://img.dev/f.png', alt: 'Figura', caption: 'Figura 1' },
      ]),
    );
    expect(md).toContain('![Figura](https://img.dev/f.png)\n*Figura 1*');
  });

  test('quote, callout, code and pageBreak', () => {
    const md = documentToMarkdown(
      doc([
        { id: 'q1', type: 'quote', content: [{ type: 'text', text: 'Cita' }] },
        { id: 'c1', type: 'callout', kind: 'warning', content: [{ type: 'text', text: 'Ojo' }] },
        { id: 'k1', type: 'code', language: 'ts', code: 'const x = 1;' },
        { id: 'b1', type: 'pageBreak' },
      ]),
    );
    expect(md).toContain('> Cita');
    expect(md).toContain('> **warning:** Ojo');
    expect(md).toContain('```ts\nconst x = 1;\n```');
    expect(md).toContain('\n\n---\n');
  });
});
