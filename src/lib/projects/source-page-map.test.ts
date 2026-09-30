import { describe, expect, test } from 'vitest';
import type { DocumentChapter } from './types';
import {
  buildSourcePageMapFromChapters,
  buildSourcePageMapFromRenderedPages,
  certifyCanonicalCoverage,
  certifySourcePageMembership,
  invalidateSourcePageMap,
  normalizedPageTextHash,
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

  test('CERTIFY-01..05 require content, sections, footnotes and anchors', () => {
    const sourcePageMap = buildSourcePageMapFromChapters({ sourceFormat: 'docx', sourcePageCount: 2, chapters: chapters() })!;
    const canonicalPages = projectCanonicalDocumentToPages(chapters(), sourcePageMap);

    const wrongContent = structuredClone(sourcePageMap);
    wrongContent.pages[0].normalizedTextHash = 'wrong-content';
    expect(certifySourcePageMembership({ sourcePageMap: wrongContent, canonicalPages })[0].result).toBe(false);

    const wrongSections = structuredClone(sourcePageMap);
    wrongSections.pages[0].sectionIds = ['other-section'];
    expect(certifySourcePageMembership({ sourcePageMap: wrongSections, canonicalPages })[0].result).toBe(false);

    const wrongFootnotes = structuredClone(sourcePageMap);
    wrongFootnotes.pages[0].footnoteIds = ['missing-footnote'];
    expect(certifySourcePageMembership({ sourcePageMap: wrongFootnotes, canonicalPages })[0].result).toBe(false);

    const missingEvidence = structuredClone(sourcePageMap);
    missingEvidence.pages[0].normalizedTextHash = undefined;
    expect(certifySourcePageMembership({ sourcePageMap: missingEvidence, canonicalPages })[0].result).toBe(false);

    const wrongAnchorProjection = canonicalPages.map((page, index) => index === 0
      ? { ...page, contentSlices: page.contentSlices.map((slice, sliceIndex) => sliceIndex === 0 ? { ...slice, fromOffset: 1 } : slice) }
      : page);
    expect(certifySourcePageMembership({ sourcePageMap, canonicalPages: wrongAnchorProjection })[0].result).toBe(false);
  });

  test('BOUNDARY-01..02 keep a chapter kicker and title on the certified page', () => {
    const sourceChapters: DocumentChapter[] = [
      { id: 'previous', order: 1, title: 'Anterior', blocks: [{ id: 'previous-body', type: 'paragraph', order: 1, content: 'Último contenido de la sección anterior.' }] },
      { id: 'chapter-1', order: 2, title: 'Capítulo 1. Título', blocks: [
        { id: 'chapter-1-kicker', type: 'paragraph', order: 1, content: '<p class="editorial-kicker">CAPÍTULO 1</p>' },
        { id: 'chapter-1-title', type: 'heading', order: 2, content: '<h1>Título</h1>' },
      ] },
    ];
    const map = {
      version: 1 as const,
      sourceFormat: 'odt' as const,
      sourcePageCount: 2,
      status: 'VALID' as const,
      pages: [
        { pageNumber: 1, startAnchor: { blockId: 'previous-body', textOffset: 0 }, endAnchor: { blockId: 'previous-body', textOffset: 42 }, sectionIds: ['previous'], footnoteIds: [], normalizedTextHash: normalizedPageTextHash('<p>Último contenido de la sección anterior.</p>'), mappingStatus: 'EXACT' as const },
        { pageNumber: 2, startAnchor: { blockId: 'chapter-1-kicker', textOffset: 0 }, endAnchor: { blockId: 'chapter-1-title', textOffset: 14 }, sectionIds: ['chapter-1'], footnoteIds: [], normalizedTextHash: normalizedPageTextHash('<p class="editorial-kicker">CAPÍTULO 1</p>\n<h1>Título</h1>'), mappingStatus: 'EXACT' as const },
      ],
      provenance: { kind: 'authoritative-pdf' as const, createdAt: new Date().toISOString() },
    };
    const pages = projectCanonicalDocumentToPages(sourceChapters, map);
    expect(pages[0].contentSlices.map((slice) => slice.blockId)).toEqual(['previous-body']);
    expect(pages[1].contentSlices.map((slice) => slice.blockId)).toEqual(['chapter-1-kicker', 'chapter-1-title']);
  });

  test('PHYSICAL-PAGE-01..05 classify cover and positively verified blank pages', () => {
    const sourceChapters: DocumentChapter[] = [{
      id: 'note', order: 1, title: 'Nota editorial', blocks: [
        { id: 'note-body', type: 'paragraph', order: 1, content: 'Una nota editorial suficientemente larga para alinear.' },
      ],
    }];
    const map = buildSourcePageMapFromRenderedPages({
      sourceFormat: 'odt',
      pageTexts: ['La atención deliberada\nDocumento de prueba', 'Nota editorial\nUna nota editorial suficientemente larga para alinear.', '— 3 —'],
      chapters: sourceChapters,
    });
    expect(map.pages.map((page) => page.pageKind)).toEqual(['cover', 'content-start', 'blank']);
    expect(map.pages[0].surfaceKind).toBe('project-cover');
    expect(map.pages[2].sourceBlankConfirmed).toBe(true);
    const pages = projectCanonicalDocumentToPages(sourceChapters, map);
    const report = certifySourcePageMembership({
      sourcePageMap: map,
      canonicalPages: pages,
      chapters: sourceChapters,
      coverSurface: { pageNumber: 1, exists: true, semanticMatch: true },
      blankSurfaces: { 3: true },
    });
    expect(report.map((page) => page.result)).toEqual([true, true, true]);
  });

  test('CONTINUATION-01..05 preserve ownership and reject gaps/overlaps', () => {
    const sourceChapters: DocumentChapter[] = [{
      id: 'chapter', order: 1, title: 'Capítulo 1', blocks: [
        { id: 'body', type: 'paragraph', order: 1, content: 'abcdefghij' },
      ],
    }];
    const map = {
      version: 1 as const, sourceFormat: 'docx' as const, sourcePageCount: 2, status: 'VALID' as const,
      pages: [
        { pageNumber: 1, pageKind: 'content-start' as const, surfaceKind: 'canonical-content' as const, startAnchor: { blockId: 'body', textOffset: 0 }, endAnchor: { blockId: 'body', textOffset: 5 }, sectionIds: ['chapter'], footnoteIds: [], normalizedTextHash: normalizedPageTextHash('abcde'), mappingStatus: 'EXACT' as const },
        { pageNumber: 2, pageKind: 'content-continuation' as const, surfaceKind: 'canonical-content' as const, startAnchor: { blockId: 'body', textOffset: 5 }, endAnchor: { blockId: 'body', textOffset: 10 }, sectionIds: ['chapter'], footnoteIds: [], normalizedTextHash: normalizedPageTextHash('fghij'), mappingStatus: 'EXACT' as const },
      ],
      provenance: { kind: 'authoritative-pdf' as const, createdAt: new Date().toISOString() },
    };
    const pages = projectCanonicalDocumentToPages(sourceChapters, map);
    expect(pages[0].contentSlices[0]).toEqual({ blockId: 'body', fromOffset: 0, toOffset: 5 });
    expect(pages[1].contentSlices[0]).toEqual({ blockId: 'body', fromOffset: 5, toOffset: 10 });
    expect(certifyCanonicalCoverage({ sourcePageMap: map, canonicalPages: pages, chapters: sourceChapters }).valid).toBe(true);
    const gapMap = structuredClone(map);
    gapMap.pages[1].startAnchor.textOffset = 7;
    expect(certifyCanonicalCoverage({ sourcePageMap: gapMap, canonicalPages: projectCanonicalDocumentToPages(sourceChapters, gapMap), chapters: sourceChapters }).gaps).toHaveLength(1);
    const overlapMap = structuredClone(map);
    overlapMap.pages[1].startAnchor.textOffset = 3;
    expect(certifyCanonicalCoverage({ sourcePageMap: overlapMap, canonicalPages: projectCanonicalDocumentToPages(sourceChapters, overlapMap), chapters: sourceChapters }).overlaps).toHaveLength(1);
  });
});
