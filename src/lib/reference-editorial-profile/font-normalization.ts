import type { EditorialFontWeight } from './model';

export interface NormalizedPdfFont {
  family: string;
  variant: string;
  weight: EditorialFontWeight;
  italic: boolean;
}

export interface ResolvedEditorialFont {
  detectedFontFamily: string;
  resolvedFontFamily: string;
  exactAvailable: boolean;
}

const FALLBACKS: Array<{ pattern: RegExp; family: string }> = [
  { pattern: /garamond|caslon|baskerville|minion|palatino/i, family: 'EB Garamond' },
  { pattern: /montserrat|gotham|avenir|helvetica|arial|sans/i, family: 'Inter' },
  { pattern: /times|georgia|bemanist|serif/i, family: 'Georgia' },
];

function splitCamelCase(value: string): string {
  return value.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/\s+/g, ' ').trim();
}

function cleanFamily(value: string): string {
  return splitCamelCase(
    value
      .replace(/^\w{6}\+/, '')
      .replace(/[-_](?:regular|normal|book|roman|medium|semibold|demibold|bold|italic|oblique).*$/i, '')
      .replace(/[-_]+/g, ' '),
  ).trim();
}

function variantFromName(value: string): { variant: string; weight: EditorialFontWeight; italic: boolean } {
  const lower = value.toLowerCase();
  const italic = /italic|oblique/.test(lower);
  const weight: EditorialFontWeight = /bold|black|heavy/.test(lower)
    ? 'bold'
    : /semi.?bold|demi/.test(lower)
      ? 'semibold'
      : /medium/.test(lower)
        ? 'medium'
        : /light|thin/.test(lower)
          ? 'normal'
          : 'normal';
  const variant = [weight === 'normal' ? 'regular' : weight, italic ? 'italic' : ''].filter(Boolean).join(' ');
  return { variant, weight, italic };
}

export function normalizePdfFontName(rawName: string): NormalizedPdfFont {
  const raw = rawName.trim().replace(/^\w{6}\+/, '');
  const { variant, weight, italic } = variantFromName(raw);
  return { family: cleanFamily(raw), variant, weight, italic };
}

export function resolveEditorialFont(detectedFontFamily: string, availableFonts: string[]): ResolvedEditorialFont {
  const normalized = detectedFontFamily.trim();
  const exact = availableFonts.find((font) => font.toLowerCase() === normalized.toLowerCase());
  if (exact) {
    return { detectedFontFamily: normalized, resolvedFontFamily: exact, exactAvailable: true };
  }
  const fallback = FALLBACKS.find(({ pattern }) => pattern.test(normalized))?.family ?? availableFonts[0] ?? 'Georgia';
  return { detectedFontFamily: normalized, resolvedFontFamily: fallback, exactAvailable: false };
}
