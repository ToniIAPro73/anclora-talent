/**
 * The folio is page chrome, not manuscript content. Keep the multi-column
 * body out of its band so normal-flow content can never paint underneath it.
 */
export const PAGE_NUMBER_SAFE_BAND = 48;

export function getPageContentHeight(
  pageHeight: number,
  margins: { top: number; bottom: number },
): number {
  const reservedBottom = Math.max(margins.bottom, PAGE_NUMBER_SAFE_BAND);
  return Math.max(120, pageHeight - margins.top - reservedBottom);
}
