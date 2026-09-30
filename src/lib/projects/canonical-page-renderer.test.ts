import { describe, expect, test } from 'vitest';
import { sliceRichHtml, renderCanonicalPageSlices } from './canonical-page-renderer';

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
  });
});
