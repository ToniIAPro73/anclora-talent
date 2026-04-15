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

type DomRuntime = {
  DOMParser: typeof globalThis.DOMParser;
  document: Document;
  Node: typeof globalThis.Node;
};

let cachedServerDomRuntime: DomRuntime | null | undefined;

function getDomRuntime(): DomRuntime | null {
  if (
    typeof DOMParser !== 'undefined' &&
    typeof document !== 'undefined' &&
    typeof Node !== 'undefined'
  ) {
    return { DOMParser, document, Node };
  }

  if (typeof window !== 'undefined') {
    return null;
  }

  if (cachedServerDomRuntime !== undefined) {
    return cachedServerDomRuntime;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { JSDOM } = require('jsdom') as { JSDOM: new (html?: string) => { window: Window & typeof globalThis } };
    const runtimeWindow = new JSDOM('<!DOCTYPE html><html><body></body></html>').window;
    cachedServerDomRuntime = {
      DOMParser: runtimeWindow.DOMParser,
      document: runtimeWindow.document,
      Node: runtimeWindow.Node,
    };
    return cachedServerDomRuntime;
  } catch {
    cachedServerDomRuntime = null;
    return null;
  }
}

export function hasRenderablePageContent(html: string): boolean {
  const normalized = html
    .replace(/<hr\s+data-page-break="(?:true|manual|auto)"\s*\/?>/gi, '')
    .replace(/&nbsp;/gi, ' ')
    .trim();

  if (!normalized) {
    return false;
  }

  const runtime = getDomRuntime();
  if (!runtime) {
    return normalized.replace(/<[^>]+>/g, '').trim().length > 0;
  }

  const parser = new runtime.DOMParser();
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

export function getPaginationDomRuntime() {
  return getDomRuntime();
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

  // Apply 0.98 factor to match the editor's behavior while keeping a small safety margin.
  const approxLinesPerPage = Math.floor(
    (availableHeight / lineHeightPx) * 0.98,
  );

  // Parse HTML into DOM nodes
  const runtime = getDomRuntime();
  if (!runtime) {
    return paginateByCharacters(htmlContent, config);
  }

  const parser = new runtime.DOMParser();
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
    if (node.nodeType === runtime.Node.TEXT_NODE && !node.textContent?.trim()) {
      continue;
    }

    // Handle BR tags - treat as single line
    if (
      node.nodeType === runtime.Node.ELEMENT_NODE &&
      (node as Element).tagName === 'BR'
    ) {
      currentLines += 1.0;
      continue;
    }

    // Handle manual page break markers
    if (
      node.nodeType === runtime.Node.ELEMENT_NODE &&
      isPageBreakElement(node as Element)
    ) {
      if (currentPageNodes.length > 0) {
        const pageDiv = runtime.document.createElement('div');
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

        currentPageNodes = [];
        currentLines = 0;
      }
      continue;
    }

    if (node.nodeType === runtime.Node.ELEMENT_NODE) {
      const element = node as Element;
      if (element.tagName === 'H1' || element.tagName === 'H2') {
        currentChapter = element.textContent || '';
      }
    }

    const nodeLines = estimateNodeLines(node, config, runtime);

    if (
      currentLines + nodeLines > approxLinesPerPage &&
      currentPageNodes.length > 0
    ) {
      const pageDiv = runtime.document.createElement('div');
      pageDiv.className = 'preview-page-content';
      currentPageNodes.forEach((n) => pageDiv.appendChild(n.cloneNode(true)));

      pages.push({
        type: 'content',
        html: pageDiv.innerHTML,
        chapterTitle: currentChapter,
        pageNumber: pages.length + 1,
      });

      currentPageNodes = [node.cloneNode(true)];
      currentLines = nodeLines;
    } else {
      currentPageNodes.push(node.cloneNode(true));
      currentLines += nodeLines;
    }
  }

  if (currentPageNodes.length > 0) {
    const pageDiv = runtime.document.createElement('div');
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
function estimateNodeLines(
  node: Node,
  config: PaginationConfig,
  runtime: DomRuntime,
): number {
  if (node.nodeType === runtime.Node.TEXT_NODE) {
    const text = node.textContent || '';
    if (!text.trim()) return 0;

    const contentWidth =
      config.pageWidth - config.marginLeft - config.marginRight;
    // Accurate character width estimate (0.45 for premium editorial fonts)
    const charsPerLine = Math.floor(contentWidth / (config.fontSize * 0.45));
    const textLines = Math.ceil(text.trim().length / charsPerLine);
    return Math.max(1, textLines);
  }

  if (node.nodeType === runtime.Node.ELEMENT_NODE) {
    const element = node as Element;
    const tagName = element.tagName;

    // Headings — use actual CSS values from .preview-page h1-h6
    if (/^H[1-6]$/.test(tagName)) {
      const level = parseInt(tagName[1]);
      const text = element.textContent || '';
      const headingProps = [
        { fontMul: 2.0,  lhFactor: 1.1,  mbEm: 1.0  }, // H1
        { fontMul: 1.5,  lhFactor: 1.2,  mbEm: 0.85 }, // H2
        { fontMul: 1.2,  lhFactor: 1.3,  mbEm: 0.75 }, // H3
        { fontMul: 1.05, lhFactor: 1.35, mbEm: 0.65 }, // H4
        { fontMul: 0.95, lhFactor: 1.4,  mbEm: 0.6  }, // H5/H6
      ];
      const { fontMul, lhFactor, mbEm } = headingProps[Math.min(level - 1, 4)];
      const headingFontPx = config.fontSize * fontMul;
      const contentWidth = config.pageWidth - config.marginLeft - config.marginRight;
      const charsPerLine = Math.floor(contentWidth / (headingFontPx * 0.45));
      const textLines = text.trim().length > 0
        ? Math.max(1, Math.ceil(text.trim().length / charsPerLine))
        : 1;
      const heightPx = textLines * headingFontPx * lhFactor + config.fontSize * mbEm;
      return heightPx / (config.fontSize * config.lineHeight);
    }

    // Images
    if (tagName === 'IMG') {
      return 15;
    }

    // Lists — CSS: ul/ol{margin:0 0 1rem 1.5rem}, li{margin:0.35rem 0}
    if (tagName === 'UL' || tagName === 'OL') {
      const items = element.querySelectorAll('li');
      let totalLines = 0; 
      items.forEach((item) => {
        const text = item.textContent || '';
        const contentWidth =
          config.pageWidth - config.marginLeft - config.marginRight - 24; // 1.5rem indent
        const charsPerLine = Math.floor(contentWidth / (config.fontSize * 0.45));
        const itemLines = Math.max(1, Math.ceil(text.length / charsPerLine));
        // li margin: 0.35rem total between items (collapsed)
        totalLines += itemLines + 0.35 / config.lineHeight;
      });
      return totalLines + 0.5 / config.lineHeight; // list bottom margin
    }

    // Paragraphs — CSS: p{margin:0}, p+p{margin-top:0.8rem}
    if (tagName === 'P') {
      const text = element.textContent || '';
      if (!text.trim()) return 0.4 / config.lineHeight; 

      const contentWidth =
        config.pageWidth - config.marginLeft - config.marginRight;
      const charsPerLine = Math.floor(contentWidth / (config.fontSize * 0.45));
      const textLines = Math.ceil(text.length / charsPerLine);
      // P+P margin simulation (collapsed)
      return Math.max(1, textLines) + 0.4 / config.lineHeight;
    }

    // Blockquotes
    if (tagName === 'BLOCKQUOTE') {
      const text = element.textContent || '';
      const contentWidth =
        config.pageWidth - config.marginLeft - config.marginRight - 60;
      const charsPerLine = Math.floor(contentWidth / (config.fontSize * 0.5));
      const textLines = Math.ceil(text.length / charsPerLine);
      return Math.max(2, textLines) + 2;
    }

    // Horizontal rules
    if (tagName === 'HR') {
      return 3;
    }

    // Pre/Code blocks
    if (tagName === 'PRE' || tagName === 'CODE') {
      const text = element.textContent || '';
      const lines = text.split('\n').length;
      return lines + 2;
    }

    // Default: count child nodes recursively
    let totalLines = 0;
    element.childNodes.forEach((child) => {
      totalLines += estimateNodeLines(child, config, runtime);
    });
    return totalLines || 1;
  }

  return 0;
}

/**
 * Fallback pagination for server-side rendering
 */
function paginateByCharacters(
  htmlContent: string,
  config: PaginationConfig,
): ContentPage[] {
  const contentWidth =
    config.pageWidth - config.marginLeft - config.marginRight;
  const availableHeight =
    config.pageHeight - config.marginTop - config.marginBottom;
  const lineHeightPx = config.fontSize * config.lineHeight;

  const charsPerLine = Math.floor(contentWidth / (config.fontSize * 0.45));
  const linesPerPage = Math.floor((availableHeight / lineHeightPx) * 0.98);
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
