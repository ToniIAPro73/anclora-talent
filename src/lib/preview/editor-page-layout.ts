import { getPaginationDomRuntime, paginateContent } from './content-paginator';
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
    // 1. Pre-split oversized blocks in this segment (like giant <ul> or <p>)
    const preSplitHtml = splitOversizedBlocksInHtml(segment, config);

    // 2. Paginate the resulting HTML (which now has smaller siblings)
    const pages = paginateContent(preSplitHtml, config)
      .map((page) => page.html.trim())
      .filter(Boolean);

    if (pages.length === 0) {
      return segment.trim();
    }

    return pages.join('<hr data-page-break="auto" />');
  });

  return repaginatedSegments.join('<hr data-page-break="manual" />');
}

/**
 * Splits oversized blocks (UL, OL, P) within a segment into smaller siblings
 * so that paginateContent can distribute them across multiple pages.
 */
function splitOversizedBlocksInHtml(
  html: string,
  config: PaginationConfig,
): string {
  const runtime = getPaginationDomRuntime();
  if (!runtime) {
    return html;
  }

  const parser = new runtime.DOMParser();
  const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html');
  const container = doc.body.firstElementChild;
  if (!container) {
    return html;
  }

  const contentWidth = config.pageWidth - config.marginLeft - config.marginRight;
  const availableHeight = config.pageHeight - config.marginTop - config.marginBottom;
  const lineHeightPx = config.fontSize * config.lineHeight;
  const linesPerPage = Math.max(
    1,
    Math.floor((availableHeight / lineHeightPx) * 0.98),
  );
  const charsPerLine = Math.max(
    1,
    Math.floor(contentWidth / (config.fontSize * 0.45)),
  );
  const charsPerPage = Math.max(charsPerLine, charsPerLine * linesPerPage);

  const newNodes: string[] = [];

  Array.from(container.childNodes).forEach((node) => {
    if (node.nodeType !== runtime.Node.ELEMENT_NODE) {
      newNodes.push(node.textContent || '');
      return;
    }

    const element = node as Element;
    const tagName = element.tagName.toLowerCase();
    const text = element.textContent?.trim() ?? '';

    // Only attempt splitting for specific large blocks
    if (tagName === 'ul' || tagName === 'ol') {
      const items = Array.from(element.children);
      let currentListItems: string[] = [];
      let currentListLines = 0;

      items.forEach((item) => {
        const itemText = item.textContent?.trim() ?? '';
        const itemHtml = item.outerHTML;
        
        // Estimate lines for this item
        const itemCharsPerLine = Math.floor((contentWidth - 24) / (config.fontSize * 0.45));
        const itemLines = Math.max(1, Math.ceil(itemText.length / itemCharsPerLine)) + (0.35 / config.lineHeight);

        if (
          currentListLines + itemLines > linesPerPage &&
          currentListItems.length > 0
        ) {
          newNodes.push(`<${tagName}>${currentListItems.join('')}</${tagName}>`);
          currentListItems = [itemHtml];
          currentListLines = itemLines;
        } else {
          currentListItems.push(itemHtml);
          currentListLines += itemLines;
        }
      });

      if (currentListItems.length > 0) {
        newNodes.push(`<${tagName}>${currentListItems.join('')}</${tagName}>`);
      }
      return;
    }

    if (tagName === 'p' && text.length > charsPerPage) {
      const chunks = chunkTextIntoWrappedBlocks(text, charsPerPage, 'p');
      newNodes.push(...chunks);
      return;
    }

    // Default: keep as is
    newNodes.push(element.outerHTML);
  });

  return newNodes.join('');
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
