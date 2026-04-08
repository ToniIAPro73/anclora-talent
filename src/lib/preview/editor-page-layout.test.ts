import {
  reconcileAutoBreakMarkup,
  splitHtmlIntoPageSegments,
  stripAutoBreaks,
} from './editor-page-layout';

describe('editor-page-layout', () => {
  it('segments html into pages using manual breaks as hard boundaries', () => {
    const html = '<p>A</p><hr data-page-break="manual" /><p>B</p>';
    const pages = splitHtmlIntoPageSegments(html);

    expect(pages).toEqual(['<p>A</p>', '<p>B</p>']);
  });

  it('drops auto breaks before recalculating layout', () => {
    const html = '<p>A</p><hr data-page-break="auto" /><p>B</p>';
    expect(stripAutoBreaks(html)).toBe('<p>A</p><p>B</p>');
  });

  it('preserves manual breaks while replacing auto breaks', () => {
    const html = '<p>A</p><hr data-page-break="manual" /><p>B</p><p>C</p>';
    const result = reconcileAutoBreakMarkup(html, ['<p>A</p>', '<p>B</p>', '<p>C</p>']);

    expect(result).toContain('data-page-break="manual"');
    expect(result).toContain('data-page-break="auto"');
  });
});
