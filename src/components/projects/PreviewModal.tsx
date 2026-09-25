'use client';

/**
 * Preview Modal - Anclora Talent Premium Edition
 * Full-screen modal for professional book preview with multiple device views
 */

import * as React from 'react';
import { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import {
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
import {
  type PreviewPage,
} from '@/lib/preview/preview-builder';
import {
  buildComposedFlowHtml,
  composeProjectPreview,
} from '@/lib/compose/preview-adapter';
import { createCanvasMeasurer } from '@/lib/compose/measure';
import {
  FORMAT_PRESETS,
  buildPaginationConfig,
  type PreviewFormat,
  type PaginationConfig,
} from '@/lib/preview/device-configs';
import { MultipageFlow } from '@/components/projects/MultipageFlow';

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
  const { preferences, setPreferences } = useEditorPreferences();
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

  const [prevPreferredFormat, setPrevPreferredFormat] = useState(preferredFormat);
  if (preferredFormat !== prevPreferredFormat) {
    setPrevPreferredFormat(preferredFormat);
    setFormat(preferredFormat || 'laptop');
  }

  // Generate pages based on selected format
  const paginationConfig = useMemo(
    () =>
      buildPaginationConfig(format, {
        fontSize: preferences.fontSize,
        margins: preferences.margins,
      }),
    [format, preferences.fontSize, preferences.margins],
  );

  // FASE C: the composition engine is the single source for both the
  // cover/back-cover meta pages and the paginated content flow. Canvas
  // measurement gives real font metrics in the browser.
  const measurer = useMemo(() => createCanvasMeasurer(), []);
  const composed = useMemo(() => {
    return composeProjectPreview(project, paginationConfig, measurer);
  }, [paginationConfig, project, measurer]);

  const metaPages = composed.pages;
  const cover = useMemo(() => metaPages.find(p => p.type === 'cover'), [metaPages]);
  const backCover = useMemo(() => metaPages.find(p => p.type === 'back-cover'), [metaPages]);

  const contentHtml = useMemo(
    () => buildComposedFlowHtml(composed.pages),
    [composed],
  );

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

  const [prevCurrentPage, setPrevCurrentPage] = useState(currentPage);
  if (currentPage !== prevCurrentPage) {
    setPrevCurrentPage(currentPage);
    setPageInput(String(currentPage + 1));
  }

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
      className="ac-preview-overlay talent-preview-overlay"
      onKeyDown={handleKeyDown} tabIndex={0}
    >
      <div className="ac-preview-overlay__shell talent-preview-shell mx-auto flex w-full flex-col overflow-hidden rounded-none">
        <header className="ac-preview-overlay__header talent-preview-header shrink-0 px-3 py-1.5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="ac-preview-overlay__title min-w-0 truncate text-white">
              <span className="inline-flex items-center gap-2">
                <Eye className="h-4 w-4" />
                {project.document.title || 'Vista Previa'}
              </span>
            </h2>

            <div className="ac-preview-overlay__toolbar flex shrink-0 items-center gap-1">
              <div className="ac-preview-overlay__toolbar-group talent-preview-toolbar">
                <button
                  data-testid="preview-modal-single-view-button"
                  aria-label={copy.previewModalSingleView}
                  aria-pressed={viewMode === 'single'}
                  onClick={() => setViewMode('single')}
                  className={viewMode === 'single' ? 'ac-button ac-button--primary ac-button--sm' : 'ac-button ac-button--ghost ac-button--sm'}
                >
                  <Eye className="h-4 w-4" />
                </button>
                <button
                  data-testid="preview-modal-spread-view-button"
                  aria-label={copy.previewModalSpreadView}
                  aria-pressed={viewMode === 'spread'}
                  onClick={() => setViewMode('spread')}
                  className={viewMode === 'spread' ? 'ac-button ac-button--primary ac-button--sm' : 'ac-button ac-button--ghost ac-button--sm'}
                >
                  <BookOpen className="h-4 w-4" />
                </button>
                <div className="ac-preview-control-divider" />
                {(['mobile', 'tablet', 'laptop'] as const).map(fmt => (
                  <button
                    key={fmt}
                    data-testid={`preview-modal-format-${fmt}-button`}
                    aria-label={fmt === 'mobile' ? copy.previewModalMobile : fmt === 'tablet' ? copy.previewModalTablet : copy.previewModalLaptop}
                    aria-pressed={format === fmt}
                    onClick={() => {
                      setFormat(fmt);
                      // U6: the preview format doubles as the preferred
                      // device, persisted across sessions.
                      setPreferences({ device: fmt === 'laptop' ? 'desktop' : fmt });
                    }}
                    className={format === fmt ? 'ac-button ac-button--primary ac-button--sm' : 'ac-button ac-button--ghost ac-button--sm'}
                  >
                    {fmt === 'mobile' ? <Smartphone className="h-4 w-4" /> : fmt === 'tablet' ? <Tablet className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}
                  </button>
                ))}
                <div className="ac-preview-control-divider" />
                <button
                  data-testid="preview-modal-zoom-out-button"
                  aria-label={copy.previewModalZoomOut}
                  onClick={() => handleZoomChange(zoom - 10)}
                  className="ac-button ac-button--ghost ac-button--sm"
                >
                  <ZoomOut className="h-4 w-4" />
                </button>
                <span className="ac-preview-control-value">{zoom}%</span>
                <button
                  data-testid="preview-modal-zoom-in-button"
                  aria-label={copy.previewModalZoomIn}
                  onClick={() => handleZoomChange(zoom + 10)}
                  className="ac-button ac-button--ghost ac-button--sm"
                >
                  <ZoomIn className="h-4 w-4" />
                </button>
              </div>
              <button
                data-testid="preview-modal-close-button"
                aria-label={copy.previewModalClose}
                onClick={onClose}
                className="ac-button ac-button--secondary flex-shrink-0"
                title={copy.previewModalClose}
              >
                {copy.previewModalClose}
              </button>
            </div>
          </div>
        </header>

        <main className="ac-preview-overlay__stage talent-preview-stage relative flex min-h-0 flex-1 overflow-hidden">
          <section
            data-testid="preview-modal-stage"
            data-preview-viewport="true"
            ref={viewportRef}
            className="ac-preview-overlay__viewport flex flex-1 flex-col items-center justify-center overflow-auto p-2 custom-scrollbar"
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
                    showPageNumbers
                    pageNumberOffset={2}
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

          <footer data-testid="preview-modal-footer" className="ac-preview-overlay__footer-bar talent-preview-footer">
            <div className="ac-preview-overlay__footer-grid">
              <div />
              <div className="ac-preview-overlay__footer ac-preview-pagination talent-preview-pagination">
                <button
                  data-testid="preview-modal-prev-page-button"
                  aria-label={copy.previewModalPrevious}
                  onClick={prevPage}
                  disabled={currentPage === 0}
                  className="ac-button ac-button--ghost ac-button--compact px-2 text-white disabled:opacity-50"
                >
                  {copy.previewModalPrevious}
                </button>
                <label className="flex items-center gap-2 px-1 text-sm font-medium text-white">
                  <span className="sr-only">{copy.previewModalPage}</span>
                  <span className="text-white/75">{copy.previewModalPage}</span>
                  <input
                    data-testid="preview-modal-page-input"
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
                    className="ac-preview-page-field talent-preview-page-input"
                  />
                  <span className="text-white/55">de {logicalTotalPages}</span>
                </label>
                <button
                  data-testid="preview-modal-next-page-button"
                  aria-label={copy.previewModalNext}
                  onClick={nextPage}
                  disabled={currentPage >= logicalTotalPages - 1}
                  className="ac-button ac-button--ghost ac-button--compact px-2 text-white disabled:opacity-50"
                >
                  {copy.previewModalNext}
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
import { isDesignSurfaceV2, isLegacySurfaceState } from '@/lib/projects/design-surface';
import { getBackCoverDesign, getCoverDesign } from '@/lib/projects/design-surface-repository';
import { DesignSurfaceRenderer } from './design-surface/DesignSurfaceRenderer';

export function PageRenderer({
  page,
  format,
  copy,
  config,
  project,
  renderScale = 1,
}: {
  page: PreviewPage;
  format: PreviewFormat;
  copy: AppMessages['project'];
  config: PaginationConfig;
  project: ProjectRecord;
  renderScale?: number;
}) {
  const preset = FORMAT_PRESETS[format];
  const pageStyle = {
    width: `${preset.viewportWidth * renderScale}px`,
    height: `${preset.pagePixelHeight * renderScale}px`,
    padding: `${config.marginTop * renderScale}px ${config.marginRight * renderScale}px ${config.marginBottom * renderScale}px ${config.marginLeft * renderScale}px`,
  };

  if (page.type === 'cover' && page.coverData) {
    // 1. If we have a rendered image (from Canvas/Advanced editor), show it
    if (page.coverData.renderedImageUrl && !isDesignSurfaceV2(project.cover.surfaceState)) {
      return (
        <div style={pageStyle} className="relative overflow-hidden bg-[#070c14] rounded-[8px] shadow-[var(--shadow-strong)] border border-white/10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            src={page.coverData.renderedImageUrl} 
            alt={copy.previewModalCoverAlt}
            className="w-full h-full object-cover"
          />
        </div>
      );
    }

    // 2. Cover Studio v2: a design authored in the new layered editor renders
    // through the same canonical model the editor and export use (mission
    // §45-47's "one engine" requirement) instead of the legacy field-map
    // preview, which cannot represent arbitrary layers.
    if (isDesignSurfaceV2(project.cover.surfaceState)) {
      return (
        <div style={pageStyle} className="rounded-[8px] overflow-hidden shadow-[var(--shadow-strong)] border border-white/10">
          <DesignSurfaceRenderer surface={getCoverDesign(project)} className="h-full w-full" />
        </div>
      );
    }

    // 3. Otherwise, use the standard CoverPreview component for coherence with basic editor
    const baseSurface = normalizeSurfaceState(
      (isLegacySurfaceState(project.cover.surfaceState) ? project.cover.surfaceState : null) ?? {
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
      <div style={pageStyle} className="rounded-[8px] overflow-hidden shadow-[var(--shadow-strong)] border border-white/10">
        <CoverPreview
          surface={surface}
          palette={project.cover.palette}
          backgroundImageUrl={project.cover.backgroundImageUrl}
          eyebrow={copy.coverEyebrow}
          defaultTitle={copy.coverDefaultTitle}
        />
      </div>
    );
  }

  if (page.type === 'back-cover' && page.backCoverData) {
    // 1. If we have a rendered image (from Advanced back cover editor), show it
    if (page.backCoverData.renderedImageUrl && !isDesignSurfaceV2(project.backCover.surfaceState)) {
      return (
        <div style={pageStyle} className="relative overflow-hidden bg-[#070c14] rounded-[8px] shadow-[var(--shadow-strong)] border border-white/10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            src={page.backCoverData.renderedImageUrl} 
            alt={copy.previewModalBackCoverAlt}
            className="w-full h-full object-cover"
          />
        </div>
      );
    }

    if (isDesignSurfaceV2(project.backCover.surfaceState)) {
      return (
        <div style={pageStyle} className="rounded-[8px] overflow-hidden shadow-[var(--shadow-strong)] border border-white/10">
          <DesignSurfaceRenderer surface={getBackCoverDesign(project)} className="h-full w-full" />
        </div>
      );
    }

    const baseSurface = normalizeSurfaceState(
      (isLegacySurfaceState(project.backCover.surfaceState) ? project.backCover.surfaceState : null) ?? {
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
      <div style={pageStyle} className="rounded-[8px] overflow-hidden shadow-[var(--shadow-strong)] border border-white/10">
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
