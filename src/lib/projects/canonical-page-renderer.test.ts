import { describe, expect, test } from 'vitest';
import { sliceRichHtml, renderCanonicalPageSlices } from './canonical-page-renderer';
import { certifyRenderedPageFrameCount, inspectRenderedSourcePage } from './rendered-page-oracle';

describe('canonical page renderer', () => {
  test('crops text offsets while retaining rich inline marks and paragraph attributes', () => {
    const html = '<p style="text-indent:18pt"><strong>Alpha</strong> beta gamma</p>';
    const page = sliceRichHtml(html, 0, 10);
    expect(page).toContain('text-indent:18pt');
    expect(page).toContain('<strong>Alpha</strong>');
    expect(page).toContain(' beta');
    expect(page).not.toContain('gamma');
  });

  test('renders only the blocks belonging to a certified page', () => {
    const chapters = [{
      id: 'chapter-a', title: 'Índice', order: 0,
      blocks: [
        { id: 'a', order: 0, type: 'paragraph' as const, content: '<p>Índice</p>' },
        { id: 'b', order: 1, type: 'paragraph' as const, content: '<p>PRÓLOGO</p>' },
      ],
    }];
    const rendered = renderCanonicalPageSlices(chapters, {
      globalPageNumber: 3,
      sourcePageNumber: 3,
      contentSlices: [{ blockId: 'a', fromOffset: 0, toOffset: 6 }],
      sectionIds: ['chapter-a'], footnoteIds: [], mappingStatus: 'EXACT',
    });
    expect(rendered.html).toContain('Índice');
    expect(rendered.html).not.toContain('PRÓLOGO');
    expect(rendered.html).toContain('data-block-id="a"');
  });

  test('VISUAL-ORACLE-01..02 rejects adjacent-page content and accepts separated slices', () => {
    const expected = {
      globalPageNumber: 3,
      sourcePageNumber: 3,
      contentSlices: [{ blockId: 'a', fromOffset: 0, toOffset: 6 }],
      sectionIds: ['chapter-a'], footnoteIds: [], mappingStatus: 'EXACT' as const,
    };
    const root = document.createElement('div');
    root.innerHTML = '<div data-canonical-page="true" data-source-page="3"><div class="flow-content-root"><p data-block-id="a" data-source-from-offset="0" data-source-to-offset="6">Índice</p><p data-block-id="b" data-source-from-offset="0" data-source-to-offset="8">PRÓLOGO</p></div></div>';
    expect(inspectRenderedSourcePage(root, expected, 0).result).toBe(false);
    root.innerHTML = '<div data-canonical-page="true" data-source-page="3"><div class="flow-content-root"><p data-block-id="a" data-source-from-offset="0" data-source-to-offset="6">Índice</p></div></div>';
    expect(inspectRenderedSourcePage(root, expected, 0).result).toBe(true);
  });

  test('PAGE-FRAME-01..04 keeps one physical frame per canonical page and separate global identity', () => {
    const root = document.createElement('div');
    root.innerHTML = '<div data-canonical-page="true" data-source-page="3"></div><div data-canonical-page="true" data-source-page="4"></div>';
    const pages = [
      { globalPageNumber: 3, contentSlices: [], sectionIds: [], footnoteIds: [], mappingStatus: 'EXACT' as const },
      { globalPageNumber: 4, contentSlices: [], sectionIds: [], footnoteIds: [], mappingStatus: 'EXACT' as const },
    ];
    expect(certifyRenderedPageFrameCount(root, pages).result).toBe(true);
    root.querySelector('[data-source-page="4"]')?.remove();
    expect(certifyRenderedPageFrameCount(root, pages).result).toBe(false);
  });

  test('RENDER-DOM-05..08 rejects intrinsic overflow and footer collisions', () => {
    const expected = {
      globalPageNumber: 3,
      contentSlices: [{ blockId: 'a', fromOffset: 0, toOffset: 6 }],
      sectionIds: [], footnoteIds: [], mappingStatus: 'EXACT' as const,
    };
    const root = document.createElement('div');
    root.innerHTML = '<div data-canonical-page="true" data-source-page="3"><div class="flow-content-root"><p data-block-id="a" data-source-from-offset="0" data-source-to-offset="6">Índice</p></div><span data-testid="source-footer">3</span></div>';
    const body = root.querySelector<HTMLElement>('.flow-content-root')!;
    Object.defineProperties(body, { clientWidth: { value: 100 }, scrollWidth: { value: 101 }, clientHeight: { value: 100 }, scrollHeight: { value: 120 } });
    expect(inspectRenderedSourcePage(root, expected, 0).result).toBe(false);
  });
});
