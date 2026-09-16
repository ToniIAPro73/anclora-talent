import { describe, expect, test } from 'vitest';
import { resolveEditorialStyle } from './resolve';
import type { EditorialTextStyle } from './model';

const style = (fontSize: number): EditorialTextStyle => ({ fontFamily: 'A', resolvedFontFamily: 'A', fontSize, fontWeight: 'normal', fontStyle: 'normal', color: null, lineHeight: 1.4, textAlign: 'left', firstLineIndent: null, paragraphSpacingBefore: null, paragraphSpacingAfter: null });

describe('editorial style cascade', () => {
  test('manual > reference > template > default', () => {
    const profile = { body: style(11), headings: { h1: null, h2: null, h3: null, h4: null }, quote: null, header: { style: null }, footer: { style: null } } as never;
    expect(resolveEditorialStyle('body', style(18), profile, style(14), style(10)).fontSize).toBe(18);
    expect(resolveEditorialStyle('body', null, profile, style(14), style(10)).fontSize).toBe(11);
    expect(resolveEditorialStyle('body', null, null, style(14), style(10)).fontSize).toBe(14);
  });
});
