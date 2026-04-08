/**
 * Content Paginator - Anclora Talent Edition
 * Splits HTML content into pages based on device dimensions
 *
 * Respects UI_MOTION_CONTRACT.md for smooth transitions
 */

import { PaginationConfig } from './device-configs';
import { isPageBreakElement } from './page-breaks';

export interface ContentPage {
  type: 'content';
  html: string;
  chapterTitle?: string;
  pageNumber: number;
}

export function hasRenderablePageContent(html: string): boolean {
  const normalized = html
    .replace(/<hr\s+data-page-break="(?:true|manual|auto)"\s*\/?>/gi, '')
    .replace(/&nbsp;/gi, ' ')
    .trim();

  if (!normalized) {
    return false;
  }

  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') {
    return normalized.replace(/<[^>]+>/g, '').trim().length > 0;
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${normalized}</div>`, 'text/html');
  const container = doc.body.firstElementChild;
  if (!container) {
    return false;
  }

  const textContent = container.textContent?.replace(/\s+/g, ' ').trim() ?? '';
  if (textContent.length > 0) {
    return true;
  }

  return Boolean(
    container.querySelector(
      'img, video, canvas, svg, table, ul li, ol li, blockquote, pre, code',
    ),
  );
}

export function countRenderablePages(pages: ContentPage[]): number {
  const renderablePages = pages.filter((page) => hasRenderablePageContent(page.html));
  return Math.max(renderablePages.length, 1);
}

/**
 * Paginate HTML content into discrete pages
 */
export function paginateContent(
  htmlContent: string,
  config: PaginationConfig,
): ContentPage[] {
  if (!htmlContent || !htmlContent.trim()) {
    return [
      {
        type: 'content',
        html: '<p style="color: var(--text-tertiary); font-style: italic;">No hay contenido disponible</p>',
        pageNumber: 1,
      },
    ];
  }

  // Calculate available height for content
  const availableHeight =
    config.pageHeight - config.marginTop - config.marginBottom;
  const lineHeightPx = config.fontSize * config.lineHeight;

  // Apply 0.75 factor to account for visual spacing, margins between elements, etc.
  // This is more conservative and prevents content overflow
  const approxLinesPerPage = Math.floor(
    (availableHeight / lineHeightPx) * 0.75,
  );

  // Parse HTML into DOM nodes
  // Check if we're in browser environment
  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') {
    // Server-side: use character-based pagination fallback
    return paginateByCharacters(htmlContent, config);
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${htmlContent}</div>`, 'text/html');
  const container = doc.body.firstElementChild;

  if (!container) {
    return [
      {
        type: 'content',
        html: htmlContent,
        pageNumber: 1,
      },
    ];
  }

  const nodes = Array.from(container.childNodes);

  const pages: ContentPage[] = [];
  let currentPageNodes: Node[] = [];
  let currentLines = 0;
  let currentChapter = '';

  for (const node of nodes) {
    // Skip empty text nodes and lone br tags
    if (node.nodeType === Node.TEXT_NODE && !node.textContent?.trim()) {
      continue;
    }

    // Handle BR tags - treat as paragraph break
    if (
      node.nodeType === Node.ELEMENT_NODE &&
      (node as Element).tagName === 'BR'
    ) {
      currentLines += 1.5; // BR adds some vertical space
      continue;
    }

    // Handle manual page break markers (Commit 4)
    if (
      node.nodeType === Node.ELEMENT_NODE &&
      isPageBreakElement(node as Element)
    ) {
      // Force page break: save current page if it has content
      if (currentPageNodes.length > 0) {
        const pageDiv = document.createElement('div');
        pageDiv.className = 'preview-page-content';
        currentPageNodes.forEach((n) =>
          pageDiv.appendChild(n.cloneNode(true)),
        );

        pages.push({
          type: 'content',
          html: pageDiv.innerHTML,
          chapterTitle: currentChapter,
          pageNumber: pages.length + 1,
        });

        // Start new page
        currentPageNodes = [];
        currentLines = 0;
      }
      // Don't include the page break marker itself in the output
      continue;
    }

    // Detect chapter headings (H1, H2)
    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as Element;
      if (element.tagName === 'H1' || element.tagName === 'H2') {
        currentChapter = element.textContent || '';

        // Force page break before major headings (except at page start)
        if (currentPageNodes.length > 0 && currentLines > 3) {
          // Create page with current content
          const pageDiv = document.createElement('div');
          pageDiv.className = 'preview-page-content';
          currentPageNodes.forEach((n) =>
            pageDiv.appendChild(n.cloneNode(true)),
          );

          pages.push({
            type: 'content',
            html: pageDiv.innerHTML,
            chapterTitle: currentChapter,
            pageNumber: pages.length + 1,
          });

          // Start new page with the heading
          currentPageNodes = [];
          currentLines = 0;
        }
      }
    }

    // Estimate lines for this node
    const nodeLines = estimateNodeLines(node, config);

    // Check if adding this node would exceed page capacity
    if (
      currentLines + nodeLines > approxLinesPerPage &&
      currentPageNodes.length > 0
    ) {
      // Create a new page with current nodes
      const pageDiv = document.createElement('div');
      pageDiv.className = 'preview-page-content';
      currentPageNodes.forEach((n) => pageDiv.appendChild(n.cloneNode(true)));

      pages.push({
        type: 'content',
        html: pageDiv.innerHTML,
        chapterTitle: currentChapter,
        pageNumber: pages.length + 1,
      });

      // Start new page
      currentPageNodes = [node.cloneNode(true)];
      currentLines = nodeLines;
    } else {
      currentPageNodes.push(node.cloneNode(true));
      currentLines += nodeLines;
    }
  }

  // Add remaining nodes as final page
  if (currentPageNodes.length > 0) {
    const pageDiv = document.createElement('div');
    pageDiv.className = 'preview-page-content';
    currentPageNodes.forEach((n) => pageDiv.appendChild(n.cloneNode(true)));

    pages.push({
      type: 'content',
      html: pageDiv.innerHTML,
      chapterTitle: currentChapter,
      pageNumber: pages.length + 1,
    });
  }

  return pages.length > 0
    ? pages
    : [
        {
          type: 'content',
          html: htmlContent,
          pageNumber: 1,
        },
      ];
}

/**
 * Estimate number of lines a DOM node will take
 * More accurate estimations with spacing
 */
function estimateNodeLines(node: Node, config: PaginationConfig): number {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent || '';
    if (!text.trim()) return 0;

    const contentWidth =
      config.pageWidth - config.marginLeft - config.marginRight;
    // More accurate character width estimate (0.5 instead of 0.6)
    const charsPerLine = Math.floor(contentWidth / (config.fontSize * 0.5));
    const textLines = Math.ceil(text.trim().length / charsPerLine);
    return Math.max(1, textLines);
  }

  if (node.nodeType === Node.ELEMENT_NODE) {
    const element = node as Element;
    const tagName = element.tagName;

    // Headings take more space
    if (/^H[1-6]$/.test(tagName)) {
      const level = parseInt(tagName[1]);
      // H1 = 4 lines, H2 = 3.5 lines, H3 = 3 lines, etc.
      const headingLines = 4.5 - level * 0.5;
      return Math.max(2, headingLines);
    }

    // Images
    if (tagName === 'IMG') {
      return 15; // Images take ~15 lines
    }

    // Lists
    if (tagName === 'UL' || tagName === 'OL') {
      const items = element.querySelectorAll('li');
      let totalLines = 1; // List start margin
      items.forEach((item) => {
        const text = item.textContent || '';
        const contentWidth =
          config.pageWidth - config.marginLeft - config.marginRight - 24; // Indent
        const charsPerLine = Math.floor(contentWidth / (config.fontSize * 0.5));
        const itemLines = Math.max(1, Math.ceil(text.length / charsPerLine));
        totalLines += itemLines + 0.5; // Extra half line between items
      });
      return totalLines + 1; // List end margin
    }

    // Paragraphs
    if (tagName === 'P') {
      const text = element.textContent || '';
      if (!text.trim()) return 1; // Empty paragraph still takes space

      const contentWidth =
        config.pageWidth - config.marginLeft - config.marginRight;
      const charsPerLine = Math.floor(contentWidth / (config.fontSize * 0.5));
      const textLines = Math.ceil(text.length / charsPerLine);
      // Add 1.5 lines for paragraph spacing (top + bottom margin)
      return Math.max(1, textLines) + 1.5;
    }

    // Blockquotes
    if (tagName === 'BLOCKQUOTE') {
      const text = element.textContent || '';
      const contentWidth =
        config.pageWidth - config.marginLeft - config.marginRight - 60; // More indent
      const charsPerLine = Math.floor(contentWidth / (config.fontSize * 0.5));
      const textLines = Math.ceil(text.length / charsPerLine);
      return Math.max(2, textLines) + 2; // Top and bottom margin
    }

    // Horizontal rules
    if (tagName === 'HR') {
      return 3; // HR with top/bottom spacing
    }

    // Pre/Code blocks
    if (tagName === 'PRE' || tagName === 'CODE') {
      const text = element.textContent || '';
      const lines = text.split('\n').length;
      return lines + 2; // Padding
    }

    // Default: count child nodes recursively
    let totalLines = 0;
    element.childNodes.forEach((child) => {
      totalLines += estimateNodeLines(child, config);
    });
    return totalLines || 1;
  }

  return 0; // Unknown node types take no space
}

/**
 * Fallback pagination for server-side rendering
 * Uses character counting instead of DOM parsing
 */
function paginateByCharacters(
  htmlContent: string,
  config: PaginationConfig,
): ContentPage[] {
  // Calculate approximate characters per page
  const contentWidth =
    config.pageWidth - config.marginLeft - config.marginRight;
  const availableHeight =
    config.pageHeight - config.marginTop - config.marginBottom;
  const lineHeightPx = config.fontSize * config.lineHeight;

  const charsPerLine = Math.floor(contentWidth / (config.fontSize * 0.5));
  const linesPerPage = Math.floor((availableHeight / lineHeightPx) * 0.7);
  const charsPerPage = charsPerLine * linesPerPage;

  const pages: ContentPage[] = [];
  let currentChapter = '';
  const hardSegments = htmlContent
    .split(/<hr\s+data-page-break="(?:true|manual|auto)"\s*\/?>/i)
    .map((segment) => segment.trim())
    .filter(Boolean);

  for (const segment of hardSegments) {
    const paragraphs = segment
      .split(/(<\/p>|<\/h[1-6]>|<br\s*\/?>)/i)
      .filter((p) => p.trim());

    let currentPageHtml = '';
    let currentChars = 0;

    for (let i = 0; i < paragraphs.length; i++) {
      const para = paragraphs[i];

      const chapterMatch = para.match(/<h[12][^>]*>([^<]+)/i);
      if (chapterMatch) {
        currentChapter = chapterMatch[1];
      }

      const textContent = para.replace(/<[^>]+>/g, '');
      const paraChars = textContent.length;

      if (currentChars + paraChars > charsPerPage && currentPageHtml) {
        pages.push({
          type: 'content',
          html: currentPageHtml,
          chapterTitle: currentChapter,
          pageNumber: pages.length + 1,
        });

        currentPageHtml = para;
        currentChars = paraChars;
      } else {
        currentPageHtml += para;
        currentChars += paraChars;
      }
    }

    if (currentPageHtml) {
      pages.push({
        type: 'content',
        html: currentPageHtml,
        chapterTitle: currentChapter,
        pageNumber: pages.length + 1,
      });
    }
  }

  return pages.length > 0 ? pages : [{ type: 'content', html: htmlContent, pageNumber: 1 }];
}
