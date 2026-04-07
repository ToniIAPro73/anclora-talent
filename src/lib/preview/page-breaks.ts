/**
 * Page Break Utilities
 * Handle manual page break markers in editor content
 *
 * Page breaks are marked with HR elements with data-page-break="true" attribute:
 * <hr data-page-break="true" />
 */

export const PAGE_BREAK_HTML = '<hr data-page-break="true" />';

const PAGE_BREAK_PATTERN = /^<hr\s+data-page-break="true"\s*\/?>$/i;
const PAGE_BREAK_GLOBAL = /<hr\s+data-page-break="true"\s*\/?>/gi;

/**
 * Check if a string contains a page break marker
 */
export function isPageBreakMarker(value: string): boolean {
  return PAGE_BREAK_PATTERN.test(value.trim());
}

/**
 * Check if an HTML element is a page break marker
 */
export function isPageBreakElement(element: Element): boolean {
  return (
    element.tagName === 'HR' &&
    element.getAttribute('data-page-break') === 'true'
  );
}

/**
 * Replace all page break markers with a replacement string
 */
export function replacePageBreakMarkers(
  value: string,
  replacement: string,
): string {
  return value.replace(PAGE_BREAK_GLOBAL, replacement);
}

/**
 * Count page breaks in content
 */
export function countPageBreaks(htmlContent: string): number {
  const matches = htmlContent.match(PAGE_BREAK_GLOBAL);
  return matches ? matches.length : 0;
}

/**
 * Remove all page break markers from content
 */
export function removePageBreakMarkers(htmlContent: string): string {
  return htmlContent.replace(PAGE_BREAK_GLOBAL, '');
}
