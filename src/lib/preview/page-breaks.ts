/**
 * Page Break Utilities
 * Handle manual and automatic page break markers in editor content.
 *
 * Supported break types:
 * - manual: explicit user break
 * - auto: overflow-generated break
 *
 * Legacy compatibility:
 * - data-page-break="true" is treated as manual
 */

export type PageBreakType = 'manual' | 'auto';

export const PAGE_BREAK_HTML = '<hr data-page-break="manual" />';

const PAGE_BREAK_PATTERN =
  /^<hr\s+data-page-break="(?:true|manual|auto)"\s*\/?>$/i;
const PAGE_BREAK_GLOBAL =
  /<hr\s+data-page-break="(?:true|manual|auto)"\s*\/?>/gi;
const AUTO_PAGE_BREAK_GLOBAL =
  /<hr\s+data-page-break="auto"\s*\/?>/gi;

/**
 * Return the typed page break value for a marker string.
 */
export function getPageBreakType(value: string): PageBreakType | null {
  const match = value.match(/data-page-break="([^"]+)"/i);
  if (!match) return null;

  if (match[1] === 'auto') return 'auto';
  if (match[1] === 'manual' || match[1] === 'true') return 'manual';

  return null;
}

/**
 * Check if a string contains a page break marker.
 */
export function isPageBreakMarker(value: string): boolean {
  return PAGE_BREAK_PATTERN.test(value.trim());
}

/**
 * Check if an HTML element is a page break marker.
 */
export function isPageBreakElement(element: Element): boolean {
  const breakType = element.getAttribute('data-page-break');
  return (
    element.tagName === 'HR' &&
    (breakType === 'true' || breakType === 'manual' || breakType === 'auto')
  );
}

/**
 * Replace all page break markers with a replacement string.
 */
export function replacePageBreakMarkers(
  value: string,
  replacement: string,
): string {
  return value.replace(PAGE_BREAK_GLOBAL, replacement);
}

/**
 * Count page breaks in content.
 */
export function countPageBreaks(htmlContent: string | null | undefined): number {
  if (!htmlContent) return 0;

  const matches = htmlContent.match(PAGE_BREAK_GLOBAL);
  return matches ? matches.length : 0;
}

/**
 * Remove all page break markers from content.
 */
export function removePageBreakMarkers(htmlContent: string): string {
  return htmlContent.replace(PAGE_BREAK_GLOBAL, '');
}

/**
 * Remove only auto page break markers from content.
 */
export function removeAutoPageBreakMarkers(htmlContent: string): string {
  return htmlContent.replace(AUTO_PAGE_BREAK_GLOBAL, '');
}
