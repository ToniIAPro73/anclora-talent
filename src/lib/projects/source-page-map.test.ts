import { describe, expect, test } from 'vitest';
import type { DocumentChapter } from './types';
import {
  buildSourcePageMapFromChapters,
  buildSourcePageMapFromRenderedPages,
  certifySourcePageMembership,
  invalidateSourcePageMap,
  projectCanonicalDocumentToPages,
} from './source-page-map';

function chapters(): DocumentChapter[] {
  return [{
    id: 'section-1',
    order: 1,
    title: 'Capítulo 1',
    blocks: [
      { id: 'paragraph-1', type: 'paragraph', order: 1, content: 'Texto que continúa.' },
      { id: 'break-1', type: 'pageBreak', order: 2, content: '' },
      { id: 'paragraph-2', type: 'paragraph', order: 3, content: 'Texto de la página siguiente.' },
    ],
  }];
}

describe('canonical source page map', () => {
  test('PAGE-MAP-01 uses persisted stable block ids and supports offsets', () => {
    const map = buildSourcePageMapFromChapters({ sourceFormat: 'docx', sourcePageCount: 2, chapters: chapters() });
    expect(map?.pages[0].startAnchor).toEqual({ blockId: 'paragraph-1', textOffset: 0 });
    expect(map?.pages[0].endAnchor).toEqual({ blockId: 'paragraph-1', textOffset: 'Texto que continúa.'.length });
  });

  test('PAGE-MAP-02 projects a page boundary without splitting canonical blocks', () => {
    const map = buildSourcePageMapFromChapters({ sourceFormat: 'odt', sourcePageCount: 2, chapters: chapters() });
    const pages = projectCanonicalDocumentToPages(chapters(), map!);
    expect(pages).toHaveLength(2);
    expect(pages[1].contentSlices).toEqual([{ blockId: 'paragraph-2', fromOffset: 0, toOffset: 'Texto de la página siguiente.'.length }]);
  });

  test('PAGE-MAP-13 keeps inverted Office anchors inside certified section membership', () => {
    const sourceChapters: DocumentChapter[] = [
      { id: 'note', order: 0, title: 'Nota editorial', blocks: [{ id: 'note-1', type: 'paragraph', order: 0, content: 'Nota' }] },
      { id: 'toc', order: 1, title: 'Índice', blocks: [
        { id: 'toc-1', type: 'paragraph', order: 0, content: 'Índice' },
        { id: 'toc-2', type: 'paragraph', order: 1, content: 'Prólogo' },
      ] },
      { id: 'prologue', order: 2, title: 'Prólogo', blocks: [{ id: 'prologue-1', type: 'paragraph', order: 0, content: 'Contenido del prólogo' }] },
    ];
    const map = {
      version: 1 as const, sourceFormat: 'odt' as const, sourcePageCount: 1,
      status: 'VALID' as const, pages: [{
        pageNumber: 3, startAnchor: { blockId: 'toc-2', textOffset: 0 },
        endAnchor: { blockId: 'prologue-1', textOffset: 0 }, sectionIds: ['toc'], footnoteIds: [], mappingStatus: 'EXACT' as const,
      }], provenance: { kind: 'authoritative-pdf' as const, createdAt: new Date().toISOString() },
    };
    const page = projectCanonicalDocumentToPages(sourceChapters, map)[0];
    expect(page.contentSlices.map((slice) => slice.blockId)).toEqual(['toc-1', 'toc-2']);
  });

  test('PAGE-MAP-07 and CERTIFY-01..03 certify every explicit page', () => {
    const map = buildSourcePageMapFromChapters({ sourceFormat: 'doc', sourcePageCount: 2, chapters: chapters() });
    const report = certifySourcePageMembership({ sourcePageMap: map!, canonicalPages: projectCanonicalDocumentToPages(chapters(), map!) });
    expect(map?.status).toBe('VALID');
    expect(report).toHaveLength(2);
    expect(report.every((page) => page.result && page.content && page.sections && page.footnotes)).toBe(true);
  });

  test('PAGE-MAP-12 invalidates source certification after a layout-changing edit', () => {
    const map = buildSourcePageMapFromChapters({ sourceFormat: 'docx', sourcePageCount: 2, chapters: chapters() });
    expect(invalidateSourcePageMap(map)?.status).toBe('INVALIDATED');
  });

  test('metadata-only source counts remain unverified instead of being certified', () => {
    const map = buildSourcePageMapFromChapters({ sourceFormat: 'docx', sourcePageCount: 3, chapters: chapters() });
    expect(map?.status).toBe('UNVERIFIED');
    expect(map?.pages[2].mappingStatus).toBe('FAILED');
  });

  test('PAGE-MAP-03, 06 and 09 align rendered pages and assign footnotes', () => {
    const sourceChapters = [{
      ...chapters()[0],
      blocks: [
        { id: 'import-block-0', type: 'paragraph' as const, order: 1, content: '<p>Primera página con nota <sup data-footnote-ref="1">1</sup>.</p>' },
        { id: 'import-block-1', type: 'paragraph' as const, order: 2, content: '<p>Segunda página.</p>' },
      ],
    }];
    const map = buildSourcePageMapFromRenderedPages({
      sourceFormat: 'docx',
      pageTexts: ['Primera página con nota 1.', 'Segunda página.'],
      chapters: sourceChapters,
    });
    expect(map.status).toBe('VALID');
    expect(map.pages).toHaveLength(2);
    expect(map.pages[0].footnoteIds).toEqual(['1']);
    expect(map.pages[1].startAnchor.textOffset).toBe(0);
  });
});
