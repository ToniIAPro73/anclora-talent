/**
 * Font family substitution for fonts extracted from source documents that
 * are not available as web fonts (e.g. LibreOffice's Liberation family,
 * bundled with every ODF/DOCX export from Linux, or MS Office's Calibri/
 * Cambria on machines without the proprietary font files installed).
 *
 * These are metric-compatible substitutes: the original font's designer
 * built it to share the exact glyph widths of the target, so substituting
 * one for the other never reflows text.
 */
const METRIC_COMPATIBLE_FALLBACKS: Record<string, string[]> = {
  'liberation serif': ['Times New Roman', 'Times', 'serif'],
  'liberation sans': ['Arial', 'Helvetica', 'sans-serif'],
  'liberation sans narrow': ['Arial Narrow', 'Arial', 'sans-serif'],
  'liberation mono': ['Courier New', 'Courier', 'monospace'],
  'dejavu serif': ['Georgia', 'serif'],
  'dejavu sans': ['Verdana', 'sans-serif'],
  'dejavu sans mono': ['Courier New', 'monospace'],
  calibri: ['Carlito', 'Arial', 'sans-serif'],
  cambria: ['Caladea', 'Georgia', 'serif'],
};

function quoteIfNeeded(fontFamily: string): string {
  return /\s/.test(fontFamily) ? `"${fontFamily}"` : fontFamily;
}

/**
 * Builds a CSS font-family stack: the extracted font first (so it is used
 * whenever it happens to be installed), followed by its metric-compatible
 * substitutes when known, so the browser never falls through to an
 * unrelated default font.
 */
export function buildFontFamilyStack(fontFamily: string | undefined | null): string {
  const trimmed = fontFamily?.trim();
  if (!trimmed) return 'Georgia, "Times New Roman", serif';

  const fallbacks = METRIC_COMPATIBLE_FALLBACKS[trimmed.toLowerCase()];
  const quoted = quoteIfNeeded(trimmed);
  if (!fallbacks || fallbacks.length === 0) return quoted;

  return [quoted, ...fallbacks.map(quoteIfNeeded)].join(', ');
}

/**
 * True when `fontFamily` is a known non-web font we substitute locally —
 * callers should skip requesting it from a web font service (e.g. Google
 * Fonts, which does not host the Liberation family at all).
 */
export function isLocallySubstitutedFont(fontFamily: string | undefined | null): boolean {
  const trimmed = fontFamily?.trim().toLowerCase();
  if (!trimmed) return false;
  return trimmed in METRIC_COMPATIBLE_FALLBACKS;
}
