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
}

export function MultipageFlow({
  html,
  config,
  currentPage,
  viewMode,
  margins,
  onPageCountChange,
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
  );

  const measureRenderablePages = useCallback(() => {
    if (!multipageFlowRef.current || !onPageCountChange) return;

    const contentArea = multipageFlowRef.current.querySelector('.flow-content-root') as HTMLElement | null;
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
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .flow-content-root.ProseMirror {
          height: ${contentHeight}px;
          width: ${flowWidth}px;
          padding: 0;
          column-width: ${contentWidth}px;
          column-gap: ${columnGap}px;
          column-fill: auto;
          outline: none;
        }
        .flow-content-root.ProseMirror p { margin: 0; line-height: ${config.lineHeight}; font-size: ${config.fontSize}px; }
        .flow-content-root.ProseMirror p + p { margin-top: 0.8rem; }
        .flow-content-root.ProseMirror h1 { font-size: 2rem; line-height: 1.1; margin: 0 0 1rem 0; font-weight: 800; }
        .flow-content-root.ProseMirror h2 { font-size: 1.5rem; line-height: 1.2; margin: 0 0 0.85rem 0; font-weight: 750; }
        .flow-content-root.ProseMirror h3 { font-size: 1.2rem; line-height: 1.3; margin: 0 0 0.75rem 0; font-weight: 700; }
        .flow-content-root.ProseMirror ul, .flow-content-root.ProseMirror ol { margin: 0 0 1rem 1.5rem; padding: 0; }
        
        .flow-content-root.ProseMirror > *:not(hr) {
          break-inside: avoid;
          page-break-inside: avoid;
        }

        .flow-content-root.ProseMirror hr[data-page-break] { 
          display: block !important;
          clear: both !important;
          width: 100% !important;
          border: none !important;
          height: 1px !important;
          margin: 0 !important;
          padding: 0 !important;
          background: transparent !important;
          break-after: column !important; 
          -webkit-column-break-after: always !important; 
          page-break-after: always !important;
          visibility: visible !important;
          opacity: 0 !important;
        }
      `}</style>

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
            className="bg-[var(--preview-paper)] rounded-[8px] shadow-[var(--shadow-strong)] border border-[var(--preview-paper-border)]"
            style={{ height: `${pageHeight}px` }}
          >
            <div className="h-full w-full" style={pagePaddingStyle} />
          </div>
        ))}
      </div>

      <div ref={multipageFlowRef} className="multipage-flow-container prose prose-invert max-w-none">
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
