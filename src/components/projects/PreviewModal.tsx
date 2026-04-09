'use client';

/**
 * Preview Modal - Anclora Talent Premium Edition
 * Full-screen modal for professional book preview with multiple device views
 */

import * as React from 'react';
import { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  List,
  BookOpen,
  Monitor,
  Tablet,
  Smartphone,
  Eye,
} from 'lucide-react';
import type { ProjectRecord } from '@/lib/projects/types';
import type { AppMessages } from '@/lib/i18n/messages';
import { useEditorPreferences } from '@/hooks/use-editor-preferences';
import { buildPreviewPages, type PreviewPage } from '@/lib/preview/preview-builder';
import {
  FORMAT_PRESETS,
  buildPaginationConfig,
  type PreviewFormat,
  type PaginationConfig,
} from '@/lib/preview/device-configs';
import { premiumPrimaryDarkButton, premiumSecondaryLightButton } from '@/components/ui/button-styles';
import { MultipageFlow } from '@/components/projects/MultipageFlow';
import { chapterBlocksToHtml } from '@/lib/projects/chapter-html';
import { normalizeDocumentHtml } from '@/lib/preview/html-normalize';

interface PreviewModalProps {
  project: ProjectRecord;
  copy: AppMessages['project'];
  onClose: () => void;
}

export function PreviewModal({
  project,
  copy,
  onClose,
}: PreviewModalProps) {
  const { preferences } = useEditorPreferences();
  const preferredFormat = preferences.device === 'desktop' ? 'laptop' : preferences.device;
  
  // View state
  const [currentPage, setCurrentPage] = useState(0);
  const [viewMode, setViewMode] = useState<'single' | 'spread'>('spread');
  const [format, setFormat] = useState<PreviewFormat>(preferredFormat || 'laptop');
  const [zoom, setZoom] = useState(100);
  const [hasManualZoom, setHasManualZoom] = useState(false);
  const [showTableOfContents, setShowTableOfContents] = useState(true);
  const [isDesktopViewport, setIsDesktopViewport] = useState(true);
  
  // CONTENT FLOW STATE
  const [totalContentPages, setTotalContentPages] = useState(1);
  const viewportRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setIsDesktopViewport(window.matchMedia('(min-width: 768px)').matches);
  }, []);

  // Generate pages based on selected format
  const paginationConfig = useMemo(
    () =>
      buildPaginationConfig(format, {
        fontSize: preferences.fontSize,
        margins: preferences.margins,
      }),
    [format, preferences.fontSize, preferences.margins],
  );

  // We use the builder ONLY for cover and back-cover now
  const metaPages = useMemo(() => {
    return buildPreviewPages(project, paginationConfig);
  }, [paginationConfig, project]);

  const cover = useMemo(() => metaPages.find(p => p.type === 'cover'), [metaPages]);
  const backCover = useMemo(() => metaPages.find(p => p.type === 'back-cover'), [metaPages]);

  // COMBINED CONTENT HTML
  const contentHtml = useMemo(() => {
    if (!project.document.chapters?.length) return '';
    
    const sorted = [...project.document.chapters].sort((a, b) => a.order - b.order);
    const fragments = sorted.map((chapter) => {
      const html = chapterBlocksToHtml(chapter.blocks);
      return normalizeDocumentHtml(html);
    });

    // Join chapters with a manual page break to preserve chapter separation truth
    return fragments.join('<hr data-page-break="manual">');
  }, [project.document.chapters]);

  // LOGICAL PAGE INDEXING
  const firstContentIndex = 1;
  const lastContentIndex = firstContentIndex + totalContentPages - 1;
  const backCoverIndex = backCover ? lastContentIndex + 1 : -1;
  const logicalTotalPages = 1 + totalContentPages + (backCover ? 1 : 0);

  // Navigation handlers
  const goToPage = useCallback(
    (page: number) => {
      setCurrentPage(Math.max(0, Math.min(page, logicalTotalPages - 1)));
    },
    [logicalTotalPages],
  );

  const nextPage = useCallback(() => {
    if (viewMode === 'spread') {
      goToPage(currentPage === 0 ? 1 : currentPage + 2);
    } else {
      goToPage(currentPage + 1);
    }
  }, [currentPage, goToPage, viewMode]);

  const prevPage = useCallback(() => {
    if (viewMode === 'spread') {
      goToPage(currentPage <= 1 ? 0 : currentPage - 2);
    } else {
      goToPage(currentPage - 1);
    }
  }, [currentPage, goToPage, viewMode]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); prevPage(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); nextPage(); }
      else if (e.key === 'Home') { e.preventDefault(); goToPage(0); }
      else if (e.key === 'End') { e.preventDefault(); goToPage(logicalTotalPages - 1); }
    },
    [prevPage, nextPage, goToPage, logicalTotalPages],
  );

  const pagePreset = FORMAT_PRESETS[format];
  
  // Spread width logic
  const isSpreadContent = viewMode === 'spread' && currentPage >= firstContentIndex && currentPage <= lastContentIndex;
  const showSecondPage = isSpreadContent && (currentPage - firstContentIndex + 1) < totalContentPages;
  
  const spreadWidth = viewMode === 'spread' && (currentPage > 0 && currentPage < backCoverIndex)
      ? pagePreset.viewportWidth * 2 + 24
      : pagePreset.viewportWidth;
      
  const spreadHeight = pagePreset.pagePixelHeight;
  const zoomScale = zoom / 100;

  const applyAutoFitZoom = useCallback(() => {
    if (!viewportRef.current) return;
    const viewportRect = viewportRef.current.getBoundingClientRect();
    const widthRatio = (viewportRect.width - 32) / spreadWidth;
    const heightRatio = (viewportRect.height - 32) / spreadHeight;
    const fittedZoom = Math.floor(Math.min(widthRatio, heightRatio, 1) * 100);
    setZoom(Math.max(50, Math.min(150, fittedZoom)));
  }, [spreadHeight, spreadWidth]);

  useEffect(() => {
    if (!hasManualZoom) applyAutoFitZoom();
  }, [applyAutoFitZoom, hasManualZoom]);

  const handleZoomChange = (nextZoom: number) => {
    setHasManualZoom(true);
    setZoom(nextZoom);
  };

  return (
    <div
      role="dialog" aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-[rgba(4,6,12,0.78)] backdrop-blur-md px-0 md:px-4"
      onKeyDown={handleKeyDown} tabIndex={0}
    >
      <div className="mx-auto flex h-[100dvh] w-full max-w-[1800px] flex-col overflow-hidden border border-white/10 bg-[#111c28] shadow-[0_30px_120px_rgba(0,0,0,0.45)] md:mt-4 md:h-[calc(100dvh-32px)] md:rounded-[28px]">
        {/* HEADER */}
        <header className="shrink-0 border-b border-white/10 bg-[rgba(255,255,255,0.02)] px-5 py-3 md:px-6 md:py-4 flex justify-between items-center">
          <h2 className="text-lg font-black flex items-center gap-2 text-[var(--text-primary)] truncate text-white">
            <Eye className="w-4 h-4" /> {project.document.title || 'Vista Previa'}
          </h2>
          <button onClick={onClose} className={`${premiumSecondaryLightButton} p-3`}><X className="h-4 w-4" /></button>
        </header>

        {/* CONTROLS */}
        <div className="shrink-0 flex items-center justify-between gap-4 border-b border-white/10 bg-[rgba(255,255,255,0.03)] px-4 py-2.5 md:px-6 md:py-3 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-[rgba(255,255,255,0.03)] p-1">
              <button onClick={() => setViewMode('single')} className={`${viewMode === 'single' ? premiumPrimaryDarkButton : premiumSecondaryLightButton} px-2 py-1.5 text-xs`}><Eye className="h-4 w-4" /></button>
              <button onClick={() => setViewMode('spread')} className={`${viewMode === 'spread' ? premiumPrimaryDarkButton : premiumSecondaryLightButton} px-2 py-1.5 text-xs`}><BookOpen className="h-4 w-4" /></button>
            </div>
            <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-[rgba(255,255,255,0.03)] p-1">
              {(['mobile', 'tablet', 'laptop'] as const).map(fmt => (
                <button key={fmt} onClick={() => setFormat(fmt)} className={`${format === fmt ? premiumPrimaryDarkButton : premiumSecondaryLightButton} px-2 py-1.5 text-xs`}>
                  {fmt === 'mobile' ? <Smartphone className="h-4 w-4" /> : fmt === 'tablet' ? <Tablet className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => handleZoomChange(zoom - 10)} className={`${premiumSecondaryLightButton} p-2`}><ZoomOut className="h-4 w-4" /></button>
            <span className="text-xs text-white w-12 text-center">{zoom}%</span>
            <button onClick={() => handleZoomChange(zoom + 10)} className={`${premiumSecondaryLightButton} p-2`}><ZoomIn className="h-4 w-4" /></button>
          </div>
        </div>

        <main className="relative flex min-h-0 flex-1 overflow-hidden bg-[#070c14]">
          <section ref={viewportRef} className="flex-1 flex flex-col items-center justify-center p-4 overflow-auto custom-scrollbar">
            <div 
              style={{ width: `${spreadWidth * zoomScale}px`, height: `${spreadHeight * zoomScale}px` }} 
              className="relative transition-all duration-300"
            >
              <div className="absolute inset-0" style={{ transform: `scale(${zoomScale})`, transformOrigin: 'top left' }}>
                {/* 1. COVER */}
                {currentPage === 0 && cover && (
                  <PageRenderer page={cover} format={format} copy={copy} config={paginationConfig} />
                )}

                {/* 2. CONTENT FLOW */}
                {currentPage >= firstContentIndex && currentPage <= lastContentIndex && (
                  <MultipageFlow
                    html={contentHtml}
                    config={paginationConfig}
                    currentPage={currentPage - firstContentIndex}
                    viewMode={viewMode}
                    margins={preferences.margins!}
                    onPageCountChange={setTotalContentPages}
                  />
                )}

                {/* 3. BACK COVER */}
                {backCover && currentPage === backCoverIndex && (
                  <PageRenderer page={backCover} format={format} copy={copy} config={paginationConfig} />
                )}
              </div>
            </div>
          </section>

          {/* FOOTER */}
          <footer className="absolute bottom-0 inset-x-0 h-16 border-t border-white/10 bg-[rgba(7,12,20,0.92)] px-6 flex items-center justify-between backdrop-blur-md">
            <button onClick={prevPage} disabled={currentPage === 0} className={`${premiumSecondaryLightButton} px-4 py-2 disabled:opacity-30`}><ChevronLeft /></button>
            <div className="text-white text-sm font-medium flex items-center gap-4">
              <span>Página {currentPage + 1} de {logicalTotalPages}</span>
              {currentPage >= firstContentIndex && currentPage <= lastContentIndex && (
                <span className="text-[var(--text-tertiary)] opacity-60">| Contenido P.{currentPage - firstContentIndex + 1}</span>
              )}
            </div>
            <button onClick={nextPage} disabled={currentPage >= logicalTotalPages - 1} className={`${premiumSecondaryLightButton} px-4 py-2 disabled:opacity-30`}><ChevronRight /></button>
          </footer>
        </main>
      </div>
    </div>
  );
}

function PageRenderer({ page, format, copy, config }: { page: PreviewPage, format: PreviewFormat, copy: any, config: PaginationConfig }) {
  const preset = FORMAT_PRESETS[format];
  const pageStyle = {
    width: `${preset.viewportWidth}px`,
    height: `${preset.pagePixelHeight}px`,
    padding: `${config.marginTop}px ${config.marginRight}px ${config.marginBottom}px ${config.marginLeft}px`,
  };

  if (page.type === 'cover' && page.coverData) {
    const paletteMap: Record<string, string> = {
      obsidian: 'from-[#0b133f] via-[#0b233f] to-[#07252f] text-[#f2e3b3]',
      teal: 'from-[#124a50] via-[#0b313f] to-[#07252f] text-[#f2e3b3]',
      sand: 'from-[#f2e3b3] via-[#e7d4a0] to-[#d4af37] text-[#0b313f]',
    };
    return (
      <div style={pageStyle} className={`relative overflow-hidden bg-gradient-to-br ${paletteMap[page.coverData.palette]} rounded-[8px] shadow-[var(--shadow-strong)] flex flex-col justify-center border border-white/10`}>
        <div className="px-8 py-8">
          <h1 className="text-4xl font-black tracking-tight mb-4">{page.coverData.title}</h1>
          <p className="text-sm opacity-70">— {page.coverData.author}</p>
        </div>
      </div>
    );
  }

  if (page.type === 'back-cover' && page.backCoverData) {
    return (
      <div style={pageStyle} className="bg-[var(--preview-paper)] rounded-[8px] shadow-[var(--shadow-strong)] border border-[var(--preview-paper-border)] flex flex-col justify-between p-8">
        <div>
          <h2 className="text-2xl font-black text-[var(--text-primary)] mb-4">{page.backCoverData.title}</h2>
          <p className="text-[var(--text-secondary)] leading-7">{page.backCoverData.body}</p>
        </div>
      </div>
    );
  }

  return null;
}
