import { describe, expect, it } from 'vitest';
import { CONTROLLED_FONT_CATALOG, resolveFont } from './font-registry';

describe('controlled font registry and resolver', () => {
  it('keeps a controlled catalog instead of treating arbitrary CSS names as available', () => {
    expect(CONTROLLED_FONT_CATALOG.some((font) => font.family === 'Carlito')).toBe(true);
    expect(resolveFont('Definitely Missing Anclora QA Font')).toMatchObject({
      sourceFamily: 'Definitely Missing Anclora QA Font',
      resolvedFamily: 'Georgia',
      status: 'fallback',
      available: false,
    });
  });

  it('resolves a bundled family exactly', () => {
    expect(resolveFont('Inter')).toMatchObject({
      sourceFamily: 'Inter',
      resolvedFamily: 'Inter',
      status: 'exact',
      available: true,
    });
  });

  it('uses the controlled compatible substitute without losing the source name', () => {
    expect(resolveFont('Cambria')).toMatchObject({
      sourceFamily: 'Cambria',
      resolvedFamily: 'Caladea',
      status: 'compatible-substitute',
      available: false,
    });
  });

  it('treats Aptos as a category fallback, not as a metric-compatible mapping', () => {
    expect(resolveFont('Aptos')).toMatchObject({
      sourceFamily: 'Aptos',
      resolvedFamily: 'Inter',
      status: 'fallback',
      available: false,
    });
  });
});
