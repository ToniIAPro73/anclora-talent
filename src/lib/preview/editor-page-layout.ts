import { removeAutoPageBreakMarkers } from './page-breaks';

const MANUAL_PAGE_BREAK_SPLIT =
  /<hr\s+data-page-break="(?:true|manual)"\s*\/?>/i;

export function stripAutoBreaks(html: string): string {
  return removeAutoPageBreakMarkers(html).replace(/>\s+</g, '><').trim();
}

export function splitHtmlIntoPageSegments(html: string): string[] {
  return stripAutoBreaks(html)
    .split(MANUAL_PAGE_BREAK_SPLIT)
    .map((segment) => segment.trim())
    .filter(Boolean);
}

export function reconcileAutoBreakMarkup(
  html: string,
  pageSegments: string[],
): string {
  const baseSegments = splitHtmlIntoPageSegments(html);
  if (pageSegments.length === 0) {
    return baseSegments.join('<hr data-page-break="manual" />');
  }

  const mergedPages = pageSegments.join('<hr data-page-break="auto" />');

  if (baseSegments.length <= 1) {
    return mergedPages;
  }

  const [firstPage, ...remainingPages] = pageSegments;
  if (!firstPage) {
    return baseSegments.join('<hr data-page-break="manual" />');
  }

  const trailingPages = remainingPages.join('<hr data-page-break="auto" />');
  if (!trailingPages) {
    return firstPage;
  }

  return `${firstPage}<hr data-page-break="manual" />${trailingPages}`;
}
