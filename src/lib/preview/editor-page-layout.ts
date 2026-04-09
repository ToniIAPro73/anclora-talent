import { paginateContent } from './content-paginator';
import { PaginationConfig } from './device-configs';
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

export function reconcileOverflowBreaks(
  html: string,
  config: PaginationConfig,
): string {
  const manualSegments = splitHtmlIntoPageSegments(html);

  if (manualSegments.length === 0) {
    return '';
  }

  const repaginatedSegments = manualSegments.map((segment) => {
    const pages = paginateSegmentWithOverflow(segment, config);

    if (pages.length === 0) {
      return segment.trim();
    }

    return pages.join('<hr data-page-break="auto" />');
  });

  return repaginatedSegments.join('<hr data-page-break="manual" />');
}

function paginateSegmentWithOverflow(
  html: string,
  config: PaginationConfig,
): string[] {
  const pages = paginateContent(html, config)
    .map((page) => page.html.trim())
    .filter(Boolean);

  if (pages.length > 1) {
    return pages;
  }

  if (!hasOversizedSingleBlock(html, config)) {
    return pages;
  }

  return splitOversizedBlockSegment(html, config);
}

function hasOversizedSingleBlock(
  html: string,
  config: PaginationConfig,
): boolean {
  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') {
    return false;
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html');
  const container = doc.body.firstElementChild;
  if (!container) {
    return false;
  }

  const meaningfulChildren = Array.from(container.childNodes).filter((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      return Boolean(node.textContent?.trim());
    }

    return node.nodeType === Node.ELEMENT_NODE;
  });

  if (meaningfulChildren.length !== 1) {
    return false;
  }

  const onlyChild = meaningfulChildren[0];
  const text = onlyChild.textContent?.trim() ?? '';
  if (!text) {
    return false;
  }

  const contentWidth =
    config.pageWidth - config.marginLeft - config.marginRight;
  const availableHeight =
    config.pageHeight - config.marginTop - config.marginBottom;
  const lineHeightPx = config.fontSize * config.lineHeight;
  const charsPerLine = Math.max(
    1,
    Math.floor(contentWidth / (config.fontSize * 0.44)),
  );
  const linesPerPage = Math.max(
    1,
    Math.floor((availableHeight / lineHeightPx) * 1.0),
  );
  const charsPerPage = Math.max(charsPerLine, charsPerLine * linesPerPage);

  return text.length > charsPerPage;
}

function splitOversizedBlockSegment(
  html: string,
  config: PaginationConfig,
): string[] {
  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') {
    return [html.trim()].filter(Boolean);
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html');
  const container = doc.body.firstElementChild;
  if (!container) {
    return [html.trim()].filter(Boolean);
  }

  const contentWidth = config.pageWidth - config.marginLeft - config.marginRight;
  const availableHeight = config.pageHeight - config.marginTop - config.marginBottom;
  const lineHeightPx = config.fontSize * config.lineHeight;
  const charsPerLine = Math.max(
    1,
    Math.floor(contentWidth / (config.fontSize * 0.44)),
  );
  const linesPerPage = Math.max(
    1,
    Math.floor((availableHeight / lineHeightPx) * 1.0),
  );
  const charsPerPage = Math.max(charsPerLine, charsPerLine * linesPerPage);

  const chunks: string[] = [];

  Array.from(container.childNodes).forEach((node) => {
    if (node.nodeType !== Node.ELEMENT_NODE) {
      const text = node.textContent?.trim();
      if (text) {
        chunks.push(...chunkTextIntoParagraphs(text, charsPerPage));
      }
      return;
    }

    const element = node as Element;
    const tagName = element.tagName.toLowerCase();
    const text = element.textContent?.trim() ?? '';

    if (!text) {
      const htmlChunk = element.outerHTML.trim();
      if (htmlChunk) {
        chunks.push(htmlChunk);
      }
      return;
    }

    // Special handling for lists to preserve structure
    if (tagName === 'ul' || tagName === 'ol') {
      const items = Array.from(element.children);
      let currentListItems: string[] = [];
      let currentListChars = 0;

      items.forEach((item) => {
        const itemText = item.textContent?.trim() ?? '';
        const itemHtml = item.outerHTML;

        if (
          currentListChars + itemText.length > charsPerPage &&
          currentListItems.length > 0
        ) {
          chunks.push(
            `<${tagName}>${currentListItems.join('')}</${tagName}>`,
          );
          currentListItems = [itemHtml];
          currentListChars = itemText.length;
        } else {
          currentListItems.push(itemHtml);
          currentListChars += itemText.length;
        }
      });

      if (currentListItems.length > 0) {
        chunks.push(
          `<${tagName}>${currentListItems.join('')}</${tagName}>`,
        );
      }
      return;
    }

    if (text.length <= charsPerPage) {
      chunks.push(element.outerHTML.trim());
      return;
    }

    chunks.push(...chunkTextIntoWrappedBlocks(text, charsPerPage, tagName));
  });

  return chunks.filter(Boolean);
}

function chunkTextIntoParagraphs(text: string, charsPerPage: number): string[] {
  return chunkTextIntoWrappedBlocks(text, charsPerPage, 'p');
}

function chunkTextIntoWrappedBlocks(
  text: string,
  charsPerPage: number,
  tagName: string,
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return [];
  }

  const chunks: string[] = [];
  let currentChunk = '';

  for (const word of words) {
    const candidate = currentChunk ? `${currentChunk} ${word}` : word;
    if (candidate.length > charsPerPage && currentChunk) {
      chunks.push(`<${tagName}>${currentChunk}</${tagName}>`);
      currentChunk = word;
      continue;
    }

    currentChunk = candidate;
  }

  if (currentChunk) {
    chunks.push(`<${tagName}>${currentChunk}</${tagName}>`);
  }

  return chunks;
}
