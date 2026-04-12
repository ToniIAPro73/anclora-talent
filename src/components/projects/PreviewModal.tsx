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
import { normalizeHtmlContent } from '@/lib/preview/html-normalize';
import { reconcileOverflowBreaks } from '@/lib/preview/editor-page-layout';

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
  const [pageInput, setPageInput] = useState('1');
  
  // CONTENT FLOW STATE
  const [totalContentPages, setTotalContentPages] = useState(1);
  const viewportRef = useRef<HTMLDivElement | null>(null);

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
    const rawHtml = chapterBlocksToHtml(chapter.blocks);
    const normalized = normalizeHtmlContent(rawHtml);
    return reconcileOverflowBreaks(normalized, paginationConfig);
  });

  // Separar capítulos con un salto manual, igual que antes
  return fragments.join('<hr data-page-break="manual">');
}, [project.document.chapters, paginationConfig]);

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
    setZoom(Math.max(50, Math.min(150, nextZoom)));
  };

  useEffect(() => {
    setPageInput(String(currentPage + 1));
  }, [currentPage]);

  const commitPageInput = useCallback(() => {
    const parsed = Number.parseInt(pageInput, 10);
    if (Number.isNaN(parsed)) {
      setPageInput(String(currentPage + 1));
      return;
    }

    const clamped = Math.min(logicalTotalPages, Math.max(1, parsed));
    setPageInput(String(clamped));
    goToPage(clamped - 1);
  }, [currentPage, goToPage, logicalTotalPages, pageInput]);

  return (
    <div
      aria-label={project.document.title || 'Vista previa'}
      role="dialog" aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-[rgba(4,6,12,0.78)] backdrop-blur-md px-0 md:px-4"
      onKeyDown={handleKeyDown} tabIndex={0}
    >
      <div className="mx-auto flex h-[100dvh] w-full max-w-[1800px] flex-col overflow-hidden border border-white/10 bg-[#111c28] shadow-[0_30px_120px_rgba(0,0,0,0.45)] md:mt-4 md:h-[calc(100dvh-32px)] md:rounded-[28px]">
        <header className="shrink-0 border-b border-white/10 bg-[rgba(255,255,255,0.02)] px-4 py-2.5 md:px-5 md:py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="min-w-0 text-base font-black flex items-center gap-2 truncate text-[var(--text-primary)] text-white md:text-lg">
            <Eye className="w-4 h-4" /> {project.document.title || 'Vista Previa'}
            </h2>

            <div className="flex flex-wrap items-center justify-end gap-2">
              <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-[rgba(255,255,255,0.03)] p-1">
                <button
                  aria-label={copy.previewModalSingleView}
                  aria-pressed={viewMode === 'single'}
                  onClick={() => setViewMode('single')}
                  className={`${viewMode === 'single' ? premiumPrimaryDarkButton : premiumSecondaryLightButton} px-2 py-1.5 text-xs`}
                >
                  <Eye className="h-4 w-4" />
                </button>
                <button
                  aria-label={copy.previewModalSpreadView}
                  aria-pressed={viewMode === 'spread'}
                  onClick={() => setViewMode('spread')}
                  className={`${viewMode === 'spread' ? premiumPrimaryDarkButton : premiumSecondaryLightButton} px-2 py-1.5 text-xs`}
                >
                  <BookOpen className="h-4 w-4" />
                </button>
              </div>
              <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-[rgba(255,255,255,0.03)] p-1">
                {(['mobile', 'tablet', 'laptop'] as const).map(fmt => (
                  <button
                    key={fmt}
                    aria-label={fmt === 'mobile' ? copy.previewModalMobile : fmt === 'tablet' ? copy.previewModalTablet : copy.previewModalLaptop}
                    aria-pressed={format === fmt}
                    onClick={() => setFormat(fmt)}
                    className={`${format === fmt ? premiumPrimaryDarkButton : premiumSecondaryLightButton} px-2 py-1.5 text-xs`}
                  >
                    {fmt === 'mobile' ? <Smartphone className="h-4 w-4" /> : fmt === 'tablet' ? <Tablet className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-[rgba(255,255,255,0.03)] px-2 py-1">
                <button
                  aria-label={copy.previewModalZoomOut}
                  onClick={() => handleZoomChange(zoom - 10)}
                  className={`${premiumSecondaryLightButton} p-2`}
                >
                  <ZoomOut className="h-4 w-4" />
                </button>
                <span className="text-xs text-white w-10 text-center">{zoom}%</span>
                <button
                  aria-label={copy.previewModalZoomIn}
                  onClick={() => handleZoomChange(zoom + 10)}
                  className={`${premiumSecondaryLightButton} p-2`}
                >
                  <ZoomIn className="h-4 w-4" />
                </button>
              </div>
              <button
                aria-label={copy.previewModalClose}
                onClick={onClose}
                className={`${premiumSecondaryLightButton} px-4 py-1.5 flex-shrink-0 text-sm font-semibold min-w-[120px]`}
                title={copy.previewModalClose}
              >
                CERRAR
              </button>
            </div>
          </div>
        </header>

        <main className="relative flex min-h-0 flex-1 overflow-hidden bg-[#070c14]">
          <section
            data-testid="preview-modal-stage"
            data-preview-viewport="true"
            ref={viewportRef}
            className="flex-1 flex flex-col items-center justify-center p-3 overflow-auto custom-scrollbar"
          >
            <div 
              data-testid="preview-spread-frame"
              style={{ width: `${spreadWidth * zoomScale}px`, height: `${spreadHeight * zoomScale}px` }} 
              className="relative transition-all duration-300"
            >
              <div className="absolute inset-0" style={{ transform: `scale(${zoomScale})`, transformOrigin: 'top left' }}>
                {/* 2. CONTENT FLOW - ALWAYS MOUNTED FOR MEASUREMENT */}
                <div 
                  className={currentPage >= firstContentIndex && currentPage <= lastContentIndex ? 'visible opacity-100' : 'invisible opacity-0 pointer-events-none absolute inset-0'}
                >
                  <MultipageFlow
                    html={contentHtml}
                    config={paginationConfig}
                    currentPage={currentPage >= firstContentIndex && currentPage <= lastContentIndex ? currentPage - firstContentIndex : 0}
                    viewMode={viewMode}
                    margins={preferences.margins!}
                    onPageCountChange={setTotalContentPages}
                  />
                </div>

                {/* 1. COVER */}
                {currentPage === 0 && cover && (
                  <PageRenderer page={cover} format={format} copy={copy} config={paginationConfig} project={project} />
                )}

                {/* 3. BACK COVER */}
                {backCover && currentPage === backCoverIndex && (
                  <PageRenderer page={backCover} format={format} copy={copy} config={paginationConfig} project={project} />
                )}
              </div>
            </div>
          </section>

          <footer data-testid="preview-modal-footer" className="absolute bottom-0 inset-x-0 h-14 border-t border-white/10 bg-[rgba(7,12,20,0.92)] px-4 backdrop-blur-md">
            <div className="grid h-full grid-cols-[1fr_auto_1fr] items-center">
              <div />
              <div className="flex items-center gap-2 rounded-full border border-white/10 bg-[rgba(255,255,255,0.03)] px-2 py-1">
                <button
                  aria-label={copy.previewModalPrevious}
                  onClick={prevPage}
                  disabled={currentPage === 0}
                  className={`${premiumSecondaryLightButton} h-10 w-10 p-0 disabled:opacity-30`}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <label className="flex items-center gap-2 px-1 text-sm font-medium text-white">
                  <span className="sr-only">{copy.previewModalPage}</span>
                  <span className="text-white/75">Página</span>
                  <input
                    aria-label={copy.previewModalPage}
                    type="number"
                    min={1}
                    max={logicalTotalPages}
                    value={pageInput}
                    onChange={(e) => setPageInput(e.target.value)}
                    onFocus={(e) => e.currentTarget.select()}
                    onBlur={commitPageInput}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        commitPageInput();
                      } else if (e.key === 'Escape') {
                        setPageInput(String(currentPage + 1));
                      }
                    }}
                    className="w-16 rounded-[12px] border border-white/10 bg-[#0f1825] px-2 py-1.5 text-center text-sm font-semibold text-white outline-none transition focus:border-[var(--accent-mint)]"
                  />
                  <span className="text-white/55">de {logicalTotalPages}</span>
                </label>
                <button
                  aria-label={copy.previewModalNext}
                  onClick={nextPage}
                  disabled={currentPage >= logicalTotalPages - 1}
                  className={`${premiumSecondaryLightButton} h-10 w-10 p-0 disabled:opacity-30`}
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              <div />
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}

import { CoverPreview } from './CoverPreview';
import { BackCoverPreview } from './BackCoverPreview';
import { createDefaultSurfaceState, normalizeSurfaceState } from '@/lib/projects/cover-surface';
import { resolveBackCoverSurfaceFields } from '@/lib/projects/back-cover-surface-resolver';
import { resolveCoverSurfaceFields } from '@/lib/projects/cover-surface-resolver';

function PageRenderer({ page, format, copy, config, project }: { page: PreviewPage, format: PreviewFormat, copy: any, config: PaginationConfig, project: ProjectRecord }) {
  const preset = FORMAT_PRESETS[format];
  const pageStyle = {
    width: `${preset.viewportWidth}px`,
    height: `${preset.pagePixelHeight}px`,
    padding: `${config.marginTop}px ${config.marginRight}px ${config.marginBottom}px ${config.marginLeft}px`,
  };

  if (page.type === 'cover' && page.coverData) {
    // 1. If we have a rendered image (from Canvas/Advanced editor), show it
    if (page.coverData.renderedImageUrl) {
      return (
        <div style={pageStyle} className="relative overflow-hidden bg-[#070c14] rounded-[8px] shadow-[var(--shadow-strong)] border border-white/10">
          <img 
            src={page.coverData.renderedImageUrl} 
            alt={copy.previewModalCoverAlt}
            className="w-full h-full object-cover"
          />
        </div>
      );
    }

    // 2. Otherwise, use the standard CoverPreview component for coherence with basic editor
    const baseSurface = normalizeSurfaceState(
      project.cover.surfaceState ?? {
        ...createDefaultSurfaceState('cover'),
      },
    );
    const surface = {
      ...baseSurface,
      fields: {
        ...baseSurface.fields,
        ...resolveCoverSurfaceFields(project, baseSurface),
      },
    };

    return (
      <div style={{ width: preset.viewportWidth, height: preset.pagePixelHeight }} className="rounded-[8px] overflow-hidden shadow-[var(--shadow-strong)] border border-white/10">
        <CoverPreview
          surface={surface}
          palette={project.cover.palette}
          backgroundImageUrl={project.cover.backgroundImageUrl}
          eyebrow={copy.coverEyebrow}
        />
      </div>
    );
  }

  if (page.type === 'back-cover' && page.backCoverData) {
    // 1. If we have a rendered image (from Advanced back cover editor), show it
    if (page.backCoverData.renderedImageUrl) {
      return (
        <div style={pageStyle} className="relative overflow-hidden bg-[#070c14] rounded-[8px] shadow-[var(--shadow-strong)] border border-white/10">
          <img 
            src={page.backCoverData.renderedImageUrl} 
            alt={copy.previewModalBackCoverAlt}
            className="w-full h-full object-cover"
          />
        </div>
      );
    }

    const baseSurface = normalizeSurfaceState(
      project.backCover.surfaceState ?? {
        ...createDefaultSurfaceState('back-cover'),
      },
    );
    const surface = {
      ...baseSurface,
      fields: {
        ...baseSurface.fields,
        ...resolveBackCoverSurfaceFields(project, baseSurface),
      },
    };

    return (
      <div style={{ width: preset.viewportWidth, height: preset.pagePixelHeight }} className="rounded-[8px] overflow-hidden shadow-[var(--shadow-strong)] border border-white/10">
        <BackCoverPreview
          surface={surface}
          backgroundImageUrl={project.backCover.backgroundImageUrl}
          accentColor={project.backCover.accentColor}
          eyebrow={copy.backCoverEyebrow}
        />
      </div>
    );
  }

  return null;
}
