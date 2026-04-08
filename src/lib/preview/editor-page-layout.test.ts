import {
  reconcileAutoBreakMarkup,
  reconcileOverflowBreaks,
  splitHtmlIntoPageSegments,
  stripAutoBreaks,
} from './editor-page-layout';
import { countRenderablePages, paginateContent } from './content-paginator';
import { DEVICE_PAGINATION_CONFIGS } from './device-configs';

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

  it('inserts auto page breaks when content overflows a page', () => {
    const html = '<p>' + 'Lorem ipsum '.repeat(500) + '</p>';
    const result = reconcileOverflowBreaks(html, DEVICE_PAGINATION_CONFIGS.mobile);

    expect(result).toContain('data-page-break="auto"');
  });

  it('does not fabricate an extra page when a multi-block segment already fits its real pagination', () => {
    const html = [
      '<h2>Introducción</h2>',
      `<p>${'Esto es lo que se siente. '.repeat(40)}</p>`,
      `<p>${'La buena noticia es que esto puede cambiar. '.repeat(28)}</p>`,
      '<h2>El Sistema PPP</h2>',
      `<p>${'Percepción, presencia y permanencia. '.repeat(22)}</p>`,
    ].join('');

    const rawPages = countRenderablePages(
      paginateContent(html, DEVICE_PAGINATION_CONFIGS.laptop),
    );
    const result = reconcileOverflowBreaks(html, DEVICE_PAGINATION_CONFIGS.laptop);
    const reconciledPages = countRenderablePages(
      paginateContent(result, DEVICE_PAGINATION_CONFIGS.laptop),
    );

    expect(rawPages).toBeGreaterThan(1);
    expect(reconciledPages).toBe(rawPages);
  });
});
