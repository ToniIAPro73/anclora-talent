'use client';

import * as React from 'react';
import { useCallback, useEffect, useRef } from 'react';
import type { PaginationConfig } from '@/lib/preview/device-configs';

interface MultipageFlowProps {
  html: string;
  config: PaginationConfig;
  currentPage: number;              // 0-based index within content
  viewMode: 'single' | 'spread';
  margins: { top: number; bottom: number; left: number; right: number };
  onPageCountChange?: (pages: number) => void;
  showPageNumbers?: boolean;
  pageNumberOffset?: number;
  styleVariables?: Record<string, string>;
  lang?: string;
}

export function MultipageFlow({
  html,
  config,
  currentPage,
  viewMode,
  margins,
  onPageCountChange,
  showPageNumbers = false,
  pageNumberOffset = 1,
  styleVariables = {},
  lang = 'es',
}: MultipageFlowProps) {
  const multipageFlowRef = useRef<HTMLDivElement>(null);

  const pageWidth = config.pageWidth;
  const pageHeight = config.pageHeight;
  const pageGap = 32;
  const contentWidth = Math.max(120, pageWidth - margins.left - margins.right);
  const contentHeight = Math.max(120, pageHeight - margins.top - margins.bottom);
  const columnGap = pageGap + margins.left + margins.right;

  const [measuredTotalPages, setMeasuredTotalPages] = React.useState(1);

  const spreadStartPage =
    viewMode === 'spread' ? Math.max(0, currentPage - (currentPage % 2)) : currentPage;

  const showSecondPage = viewMode === 'spread' && spreadStartPage + 1 < measuredTotalPages;
  const viewportWidth = showSecondPage ? pageWidth * 2 + pageGap : pageWidth;

  const flowWidth =
    contentWidth * measuredTotalPages +
    columnGap * Math.max(measuredTotalPages - 1, 0);

  const flowOffset = spreadStartPage * (pageWidth + pageGap);

  const visiblePageIndices = Array.from(
    { length: showSecondPage ? 2 : 1 },
    (_, index) => spreadStartPage + index,
  ).filter((pageIndex) => pageIndex < measuredTotalPages);

  const measureRenderablePages = useCallback(() => {
    if (!multipageFlowRef.current) return;

    const contentArea = multipageFlowRef.current.querySelector(
      '.flow-content-root',
    ) as HTMLElement | null;
    if (!contentArea) return;

    const measuredWidth = contentArea.scrollWidth;
    const pages = Math.max(
      1,
      Math.ceil((measuredWidth + 1) / (contentWidth + columnGap)),
    );

    setMeasuredTotalPages(pages);
    onPageCountChange?.(pages);
  }, [columnGap, contentWidth, onPageCountChange]);

  // See the identical helper in AdvancedRichTextEditor.tsx for the full
  // rationale: footnote paragraphs left in normal CSS-column flow consume
  // page height the source document never spent on them (Word keeps
  // footnotes in the footer band, outside the body flow), so every footnote
  // pushes later content onto a later page than the source. This removes
  // each footnote from flow and re-anchors it near the bottom of whichever
  // page it naturally falls on, reclaiming that height. Single-pass
  // approximation, not real per-page pagination — see the sibling component
  // for the known limitations.
  const positionFootnotes = useCallback(() => {
    const contentArea = multipageFlowRef.current?.querySelector(
      '.flow-content-root',
    ) as HTMLElement | null;
    if (!contentArea) return;

    const footnotes = Array.from(
      contentArea.querySelectorAll<HTMLElement>('p.editorial-footnote'),
    );
    if (footnotes.length === 0) return;

    footnotes.forEach((el) => {
      el.style.position = '';
      el.style.top = '';
      el.style.left = '';
      el.style.width = '';
    });
    void contentArea.offsetHeight;

    const contentAreaRect = contentArea.getBoundingClientRect();
    const columnStride = contentWidth + columnGap;
    const stackedHeightByPage = new Map<number, number>();

    footnotes.forEach((el) => {
      const rect = el.getBoundingClientRect();
      const pageIndex = Math.max(
        0,
        Math.floor((rect.left - contentAreaRect.left + 1) / columnStride),
      );
      const stacked = stackedHeightByPage.get(pageIndex) ?? 0;
      const height = rect.height;

      el.style.position = 'absolute';
      el.style.left = `${pageIndex * columnStride}px`;
      el.style.width = `${contentWidth}px`;
      el.style.top = `${Math.max(0, contentHeight - stacked - height)}px`;

      stackedHeightByPage.set(pageIndex, stacked + height + 8);
    });
  }, [columnGap, contentHeight, contentWidth]);

  useEffect(() => {
    const runLayoutPass = () => {
      positionFootnotes();
      requestAnimationFrame(() => {
        positionFootnotes();
        measureRenderablePages();
      });
    };

    const timeoutId = setTimeout(runLayoutPass, 50);
    window.addEventListener('resize', runLayoutPass);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', runLayoutPass);
    };
  }, [measureRenderablePages, positionFootnotes, html, config]);

  const pagePaddingStyle = {
    paddingTop: `${margins.top}px`,
    paddingBottom: `${margins.bottom}px`,
    paddingLeft: `${margins.left}px`,
    paddingRight: `${margins.right}px`,
  };

  return (
    <div
      className="relative mx-auto"
      style={{ width: `${viewportWidth}px`, height: `${pageHeight}px` }}
    >
      <style>{`
        /* Contenedor de columnas: réplica del editor */
        .multipage-flow-container {
          position: absolute;
          top: ${margins.top}px;
          left: ${margins.left}px;
          width: calc(100% - ${margins.left + margins.right}px);
          height: ${contentHeight}px;
          overflow: hidden;
        }
        .multipage-flow-track {
          height: ${contentHeight}px;
          transition: transform 0.25s ease;
        }
        .flow-content-root.ProseMirror {
          position: relative;
          height: ${contentHeight}px;
          width: ${flowWidth}px;
          padding: 0;
          column-width: ${contentWidth}px;
          column-gap: ${columnGap}px;
          column-fill: auto;
          outline: none;
          font-size: ${config.fontSize}px;
          line-height: ${config.lineHeight};
          word-wrap: break-word;
          overflow-wrap: break-word;
          font-family: var(--talent-body-font, Georgia, 'Times New Roman', serif);
          color: var(--talent-body-color, var(--text-primary));
          text-align: var(--talent-body-align, left);
        }
        .flow-content-root.ProseMirror > * {
          break-inside: avoid;
          page-break-inside: avoid;
        }

        /* Tipografía y bloques: copia 1:1 del editor */
        .flow-content-root.ProseMirror img {
          max-width: 100%;
          height: auto;
          object-fit: cover;
        }
        .flow-content-root.ProseMirror p {
          margin: 0;
          overflow-wrap: break-word;
          word-break: break-word;
          font-family: var(--talent-body-font, Georgia, 'Times New Roman', serif) !important;
          font-size: var(--talent-body-size, inherit) !important;
          line-height: var(--talent-body-line-height, inherit) !important;
          text-align: var(--talent-body-align, left) !important;
          text-indent: var(--talent-body-indent, 0);
          -webkit-hyphens: auto;
          -ms-hyphens: auto;
          hyphens: auto;
        }
        .flow-content-root.ProseMirror p + p {
          margin-top: var(--talent-body-spacing-after, 0.8rem);
        }
        .flow-content-root.ProseMirror [data-toc-entry="true"] {
          display: flex;
          align-items: baseline;
          gap: 0;
          margin: 0;
          padding: 0;
          white-space: nowrap;
          list-style: none;
          line-height: 1.5;
        }
        .flow-content-root.ProseMirror [data-toc-entry="true"][data-toc-page]::before {
          content: "······································································································";
          order: 1;
          flex: 1 1 auto;
          overflow: hidden;
          margin: 0 0.35em;
          letter-spacing: 0.15em;
          color: inherit;
          white-space: nowrap;
          font-variant-numeric: tabular-nums;
        }
        .flow-content-root.ProseMirror [data-toc-entry="true"][data-toc-page]::after {
          content: attr(data-toc-page);
          order: 2;
          flex: 0 0 auto;
          font-variant-numeric: tabular-nums;
        }
        .flow-content-root.ProseMirror li[data-toc-entry="true"] {
          list-style: none;
          margin-left: 0;
          padding-left: 0;
        }
        .flow-content-root.ProseMirror ul.toc-list {
          list-style: none;
          margin: 0;
          padding: 0;
        }
        .flow-content-root.ProseMirror h1 {
          font-family: var(--talent-h1-font, inherit);
          font-size: var(--talent-h1-size, 2rem);
          line-height: var(--talent-h1-line-height, 1.1);
          font-weight: var(--talent-h1-weight, 800);
          text-align: var(--talent-h1-align, left);
          margin: var(--talent-h1-spacing-before, 0) 0 var(--talent-h1-spacing-after, 1rem);
          color: var(--talent-h1-color, var(--text-primary));
        }
        .flow-content-root.ProseMirror h2 {
          font-family: var(--talent-h2-font, inherit);
          font-size: var(--talent-h2-size, 1.5rem);
          line-height: var(--talent-h2-line-height, 1.2);
          font-weight: var(--talent-h2-weight, 750);
          text-align: var(--talent-h2-align, left);
          margin: var(--talent-h2-spacing-before, 0) 0 var(--talent-h2-spacing-after, 0.85rem);
          color: var(--talent-h2-color, var(--text-primary));
        }
        .flow-content-root.ProseMirror h3 {
          font-family: var(--talent-h3-font, inherit);
          font-size: var(--talent-h3-size, 1.2rem);
          line-height: var(--talent-h3-line-height, 1.3);
          font-weight: var(--talent-h3-weight, 700);
          text-align: var(--talent-h3-align, left);
          margin: var(--talent-h3-spacing-before, 0) 0 var(--talent-h3-spacing-after, 0.75rem);
          color: var(--talent-h3-color, var(--text-primary));
        }
        .flow-content-root.ProseMirror h4 {
          font-family: var(--talent-h4-font, inherit);
          font-size: var(--talent-h4-size, 1.05rem);
          line-height: var(--talent-h4-line-height, 1.35);
          font-weight: var(--talent-h4-weight, 700);
          text-align: var(--talent-h4-align, left);
          margin: var(--talent-h4-spacing-before, 0) 0 var(--talent-h4-spacing-after, 0.65rem);
          color: var(--talent-h4-color, var(--text-primary));
        }
        .flow-content-root.ProseMirror p.editorial-kicker {
          font-family: var(--talent-kicker-font, inherit);
          font-size: var(--talent-kicker-size, 0.8rem);
          font-weight: var(--talent-kicker-weight, 700);
          color: var(--talent-kicker-color, var(--text-secondary));
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin: 0 0 0.25rem 0;
        }
        .flow-content-root.ProseMirror p.editorial-footnote {
          font-family: var(--talent-footnote-font, inherit);
          font-size: var(--talent-footnote-size, 0.8rem) !important;
          color: var(--talent-footnote-color, var(--text-tertiary));
          line-height: 1.3 !important;
          margin: 0.85rem 0 1rem 0 !important;
          padding-top: 0.5rem;
          border-top: 1px solid var(--talent-footnote-color, var(--border-strong, rgba(0,0,0,0.3)));
          max-width: 45%;
        }
        .flow-content-root.ProseMirror blockquote {
          font-family: var(--talent-quote-font, inherit);
          font-size: var(--talent-quote-size, inherit);
          color: var(--talent-quote-color, inherit);
          border-left-style: solid;
          border-left-color: var(--talent-quote-border-color, #d97706);
          border-left-width: var(--talent-quote-border-width, 3px);
          margin: 1rem 1.5rem 1rem 0;
          padding: 0.15rem 0 0.15rem 1rem;
        }
        .flow-content-root.ProseMirror h5,
        .flow-content-root.ProseMirror h6 {
          font-size: 0.95rem;
          line-height: 1.4;
          font-weight: 700;
          margin: 0 0 0.6rem 0;
          color: var(--text-primary);
        }

        .flow-content-root.ProseMirror table {
          /* !important: imported .docx tables carry an inline width (from the
             source Word column widths) that otherwise wins by specificity and
             lets the table bleed past the column edge. */
          width: var(--column-width) !important;
          max-width: var(--column-width) !important;
          table-layout: fixed;
          border-collapse: collapse;
          margin: 0 0 1rem 0;
          /* Tables taller than the remaining column space must move whole to
             the next column — a mid-table split makes Chromium bleed the
             tail past the column's right edge instead of wrapping it. */
          break-inside: avoid-column;
          -webkit-column-break-inside: avoid;
        }
        .flow-content-root.ProseMirror td,
        .flow-content-root.ProseMirror th {
          word-wrap: break-word;
          overflow-wrap: break-word;
          vertical-align: top;
        }

        .flow-content-root.ProseMirror ul,
        .flow-content-root.ProseMirror ol {
          margin: 0 0 1rem 1.5rem;
          padding: 0;
        }
        .flow-content-root.ProseMirror ul:not([data-bullet-style]) {
          list-style-type: disc;
        }
        .flow-content-root.ProseMirror ol:not([data-list-style]) {
          list-style-type: decimal;
        }
        .flow-content-root.ProseMirror li {
          margin: 0.35rem 0;
        }

        .flow-content-root.ProseMirror ul[data-bullet-style="disc"] {
          list-style-type: disc;
        }
        .flow-content-root.ProseMirror ul[data-bullet-style="circle"] {
          list-style-type: circle;
        }
        .flow-content-root.ProseMirror ul[data-bullet-style="square"] {
          list-style-type: square;
        }

        .flow-content-root.ProseMirror ul[data-bullet-style="diamond"],
        .flow-content-root.ProseMirror ul[data-bullet-style="arrow"],
        .flow-content-root.ProseMirror ul[data-bullet-style="check"] {
          list-style: none;
          padding-left: 0;
        }
        .flow-content-root.ProseMirror ul[data-bullet-style="diamond"] > li,
        .flow-content-root.ProseMirror ul[data-bullet-style="arrow"] > li,
        .flow-content-root.ProseMirror ul[data-bullet-style="check"] > li {
          position: relative;
          padding-left: 1.5rem;
        }
        .flow-content-root.ProseMirror ul[data-bullet-style="diamond"] > li::before {
          content: "◆";
        }
        .flow-content-root.ProseMirror ul[data-bullet-style="arrow"] > li::before {
          content: "➤";
        }
        .flow-content-root.ProseMirror ul[data-bullet-style="check"] > li::before {
          content: "✓";
        }
        .flow-content-root.ProseMirror ul[data-bullet-style="diamond"] > li::before,
        .flow-content-root.ProseMirror ul[data-bullet-style="arrow"] > li::before,
        .flow-content-root.ProseMirror ul[data-bullet-style="check"] > li::before {
          position: absolute;
          left: 0;
          color: var(--text-primary);
          font-weight: 700;
        }

        .flow-content-root.ProseMirror ol[data-list-style="decimal"] {
          list-style-type: decimal;
        }
        .flow-content-root.ProseMirror ol[data-list-style="upper-alpha"] {
          list-style-type: upper-alpha;
        }
        .flow-content-root.ProseMirror ol[data-list-style="lower-alpha"] {
          list-style-type: lower-alpha;
        }
        .flow-content-root.ProseMirror ol[data-list-style="upper-roman"] {
          list-style-type: upper-roman;
        }
        .flow-content-root.ProseMirror ol[data-list-style="lower-roman"] {
          list-style-type: lower-roman;
        }

        .flow-content-root.ProseMirror ol[data-list-style="decimal-parentheses"],
        .flow-content-root.ProseMirror ol[data-list-style="lower-alpha-parentheses"] {
          list-style: none;
          counter-reset: custom-list;
          padding-left: 0;
        }
        .flow-content-root.ProseMirror ol[data-list-style="decimal-parentheses"] > li,
        .flow-content-root.ProseMirror ol[data-list-style="lower-alpha-parentheses"] > li {
          position: relative;
          padding-left: 2rem;
          counter-increment: custom-list;
        }
        .flow-content-root.ProseMirror ol[data-list-style="decimal-parentheses"] > li::before {
          content: counter(custom-list) ") ";
        }
        .flow-content-root.ProseMirror ol[data-list-style="lower-alpha-parentheses"] > li::before {
          content: counter(custom-list, lower-alpha) ") ";
        }
        .flow-content-root.ProseMirror ol[data-list-style="decimal-parentheses"] > li::before,
        .flow-content-root.ProseMirror ol[data-list-style="lower-alpha-parentheses"] > li::before {
          position: absolute;
          left: 0;
          color: var(--text-primary);
          font-weight: 600;
        }

        /* Page breaks: manuales sí cortan, autos no fuerzan salto */
        .flow-content-root.ProseMirror hr[data-page-break="manual"],
        .flow-content-root.ProseMirror hr[data-page-break="true"] {
          border: 0;
          height: 0;
          margin: 0;
          opacity: 0;
          pointer-events: none;
          break-after: column;
          page-break-after: always;
          -webkit-column-break-after: always;
        }

        .flow-content-root.ProseMirror hr[data-page-break="auto"] {
          border: 0;
          height: 0;
          margin: 0;
          opacity: 0;
          pointer-events: none;
          /* sin break-after: permiten que el flujo natural de columnas decida */
        }

        /* Por seguridad, cualquier <hr> sin data-page-break se oculta completamente */
        .flow-content-root.ProseMirror hr:not([data-page-break]) {
          display: none;
        }
      `}</style>

      {/* Marcos de página (idénticos al editor) */}
      <div
        className="grid absolute inset-0 pointer-events-none"
        style={{
          gridTemplateColumns: `repeat(${visiblePageIndices.length}, minmax(0, 1fr))`,
          gap: `${pageGap}px`,
        }}
      >
        {visiblePageIndices.map((idx) => (
          <div
            key={`frame-${idx}`}
            className="relative bg-[var(--preview-paper)] rounded-[8px] shadow-[var(--shadow-strong)] border border-[var(--preview-paper-border)]"
            style={{ height: `${pageHeight}px` }}
          >
            <div className="h-full w-full" style={pagePaddingStyle} />
            {showPageNumbers ? (
              <div className="pointer-events-none absolute inset-x-0 bottom-7 flex justify-center">
                <span className="inline-flex items-center gap-2 rounded-full bg-[rgba(7,12,20,0.05)] px-3 py-1 text-[11px] font-semibold tracking-[0.16em] text-[var(--text-tertiary)]">
                  <span aria-hidden="true" className="text-[10px] tracking-[0.08em] opacity-70">∿∿</span>
                  <span>{idx + pageNumberOffset}</span>
                  <span aria-hidden="true" className="text-[10px] tracking-[0.08em] opacity-70">∿∿</span>
                </span>
              </div>
            ) : null}
          </div>
        ))}
      </div>

      {/* Flujo de columnas real */}
      <div
        ref={multipageFlowRef}
        className="multipage-flow-container prose prose-invert max-w-none prose-img:rounded-lg prose-img:shadow-md"
        style={{ ['--column-width' as string]: `${contentWidth}px`, ...styleVariables }}
        lang={lang}
      >
        <div
          className="multipage-flow-track"
          style={{ transform: `translateX(-${flowOffset}px)` }}
        >
          <div
            className="flow-content-root ProseMirror"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
      </div>
    </div>
  );
}
