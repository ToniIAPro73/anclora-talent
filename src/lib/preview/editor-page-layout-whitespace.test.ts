import { describe, expect, it } from 'vitest';
import { DEVICE_PAGINATION_CONFIGS } from './device-configs';
import { normalizeHtmlContent, stripBlockWhitespace } from './html-normalize';
import { reconcileOverflowBreaks, splitHtmlIntoPageSegments, stripAutoBreaks } from './editor-page-layout';

describe('inline whitespace survives the editor page layout', () => {
  const spaced = '<p><span style="font-size:11pt">No es la del</span><span style="font-size:11pt"> </span><span style="font-size:11pt">personaje</span></p>';

  it('keeps the space that a source puts between two inline elements', () => {
    expect(stripAutoBreaks(spaced)).toBe(spaced);
    expect(stripAutoBreaks('<p><strong>uno</strong> <em>dos</em></p>')).toBe('<p><strong>uno</strong> <em>dos</em></p>');
    expect(splitHtmlIntoPageSegments(spaced)).toEqual([spaced]);
  });

  it('reconciling the breaks does not glue words together', () => {
    const out = reconcileOverflowBreaks(spaced, DEVICE_PAGINATION_CONFIGS.laptop);
    expect(out).toContain('<span style="font-size:11pt"> </span>');
    expect(out.replace(/<[^>]+>/g, '')).toBe('No es la del personaje');
  });

  it('still removes formatting whitespace between block tags', () => {
    expect(stripAutoBreaks('<p>a</p>\n  <p>b</p>\n<ul>\n <li>x</li>\n</ul>')).toBe('<p>a</p><p>b</p><ul><li>x</li></ul>');
    expect(stripAutoBreaks('<p> <span>a</span> </p>')).toBe('<p><span>a</span></p>');
  });

  it('the content normaliser used on save and load keeps inline spaces too', () => {
    expect(normalizeHtmlContent(spaced)).toContain('<span style="font-size:11pt"> </span>');
    expect(stripBlockWhitespace('<p><b>a</b> <i>b</i></p>\n<p>c</p>')).toBe('<p><b>a</b> <i>b</i></p><p>c</p>');
  });
});
