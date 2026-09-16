import { describe, expect, test } from 'vitest';
import { normalizePdfFontName, resolveEditorialFont } from './font-normalization';

describe('PDF font normalization', () => {
  test('removes subset prefixes and resolves common variants', () => {
    expect(normalizePdfFontName('ABCDEE+GaramondPro-Regular')).toEqual({
      family: 'Garamond Pro',
      variant: 'regular',
      weight: 'normal',
      italic: false,
    });
    expect(normalizePdfFontName('BBBBBB+Montserrat-BoldItalic')).toEqual({
      family: 'Montserrat',
      variant: 'bold italic',
      weight: 'bold',
      italic: true,
    });
  });

  test('distinguishes exact Talent font from editorial fallback', () => {
    expect(resolveEditorialFont('Garamond Pro', ['Inter', 'EB Garamond'])).toEqual({
      detectedFontFamily: 'Garamond Pro',
      resolvedFontFamily: 'EB Garamond',
      exactAvailable: false,
    });
    expect(resolveEditorialFont('Inter', ['Inter'])).toEqual({
      detectedFontFamily: 'Inter',
      resolvedFontFamily: 'Inter',
      exactAvailable: true,
    });
  });
});
