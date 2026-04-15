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
    if (!multipageFlowRef.current || !onPageCountChange) return;

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
    onPageCountChange(pages);
  }, [columnGap, contentWidth, onPageCountChange]);

  useEffect(() => {
    const timeoutId = setTimeout(measureRenderablePages, 50);
    window.addEventListener('resize', measureRenderablePages);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('resize', measureRenderablePages);
    };
  }, [measureRenderablePages, html, config]);

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
          color: var(--text-primary);
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
        }
        .flow-content-root.ProseMirror p + p {
          margin-top: 0.8rem;
        }
        .flow-content-root.ProseMirror p[data-toc-entry="true"] {
          display: flex;
          align-items: baseline;
          margin: 0 0 0.55rem 0;
          white-space: nowrap;
        }
        .flow-content-root.ProseMirror [data-toc-title="true"] {
          flex: 0 0 auto;
          margin-right: 0.5rem;
        }
        .flow-content-root.ProseMirror [data-toc-leader="true"] {
          flex: 1 1 auto;
          min-width: 0.5rem;
          overflow: hidden;
          color: var(--text-tertiary);
          letter-spacing: 0.08em;
          line-height: 1;
          transform: translateY(-0.02em);
          white-space: nowrap;
        }
        .flow-content-root.ProseMirror [data-toc-page="true"] {
          flex: 0 0 auto;
          margin-left: 0.5rem;
          min-width: 1.5rem;
          text-align: right;
          font-weight: 700;
        }
        .flow-content-root.ProseMirror h1 {
          font-size: 2rem;
          line-height: 1.1;
          font-weight: 800;
          margin: 0 0 1rem 0;
          color: var(--text-primary);
        }
        .flow-content-root.ProseMirror h2 {
          font-size: 1.5rem;
          line-height: 1.2;
          font-weight: 750;
          margin: 0 0 0.85rem 0;
          color: var(--text-primary);
        }
        .flow-content-root.ProseMirror h3 {
          font-size: 1.2rem;
          line-height: 1.3;
          font-weight: 700;
          margin: 0 0 0.75rem 0;
          color: var(--text-primary);
        }
        .flow-content-root.ProseMirror h4 {
          font-size: 1.05rem;
          line-height: 1.35;
          font-weight: 700;
          margin: 0 0 0.65rem 0;
          color: var(--text-primary);
        }
        .flow-content-root.ProseMirror h5,
        .flow-content-root.ProseMirror h6 {
          font-size: 0.95rem;
          line-height: 1.4;
          font-weight: 700;
          margin: 0 0 0.6rem 0;
          color: var(--text-primary);
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
                <span className="rounded-full bg-[rgba(7,12,20,0.05)] px-3 py-1 text-[11px] font-semibold tracking-[0.18em] text-[var(--text-tertiary)]">
                  {idx + pageNumberOffset}
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
