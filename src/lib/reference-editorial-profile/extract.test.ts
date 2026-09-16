import { describe, expect, test } from 'vitest';
import { extractEditorialProfileFromFragments, type EditorialTextFragment } from './extract';

function body(pageNumber: number, y: number, text = 'neutral sample'): EditorialTextFragment {
  return {
    pageNumber,
    text,
    fontName: 'ABCDEE+GaramondPro-Regular',
    fontSize: 11,
    fontWeight: 'normal',
    italic: false,
    color: '#222222',
    x: 72,
    y,
    width: 260,
    height: 13,
  };
}

describe('editorial profile extraction from layout fragments', () => {
  test('detects body, headings, margins, repeated footer and chapter opening without storing text', () => {
    const fragments: EditorialTextFragment[] = [];
    for (let page = 1; page <= 6; page += 1) {
      fragments.push(body(page, 760));
      fragments.push(body(page, 710));
      fragments.push(body(page, 690));
      fragments.push({
        pageNumber: page,
        text: page === 1 ? 'Chapter label' : 'Chapter label',
        fontName: 'BBBBBB+Montserrat-Bold',
        fontSize: 24,
        fontWeight: 'bold',
        italic: false,
        color: '#0d1b2a',
        x: 180,
        y: 700,
        width: 240,
        height: 28,
      });
      fragments.push(body(page, 80));
      fragments.push({
        pageNumber: page,
        text: String(page),
        fontName: 'ABCDEE+GaramondPro-Regular',
        fontSize: 9,
        fontWeight: 'normal',
        italic: false,
        color: '#222222',
        x: 292,
        y: 810,
        width: 10,
        height: 11,
      });
    }

    const result = extractEditorialProfileFromFragments(
      { width: 595, height: 842, unit: 'pt' },
      fragments,
      { filename: 'reference.pdf', format: 'pdf' },
    );

    expect(result.body.fontSize).toBe(11);
    expect(result.body.fontFamily).toBe('Garamond Pro');
    expect(result.body.resolvedFontFamily).toBeTruthy();
    expect(result.headings.h1?.fontSize).toBeGreaterThan(result.body.fontSize ?? 0);
    expect(result.page.margins.left).toBeGreaterThan(0);
    expect(result.footer.enabled).toBe(true);
    expect(result.pageNumber.enabled).toBe(true);
    expect(result.confidence.bodyTypography).not.toBe('unknown');
    expect(JSON.stringify(result)).not.toContain('neutral sample');
    expect(JSON.stringify(result)).not.toContain('Chapter label');
  });
});
