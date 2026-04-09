'use client';

/**
 * Preview Modal - Anclora Talent Premium Edition
 * Full-screen modal for professional book preview with multiple device views
 *
 * Respects:
 * - ANCLORA_PREMIUM_APP_CONTRACT.md (editorial framing, premium motion)
 * - MODAL_CONTRACT.md (clear layout, visible actions)
 * - UI_MOTION_CONTRACT.md (smooth elevations, no bounce)
 * - LOCALIZATION_CONTRACT.md (full i18n coverage)
 */

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
} from '@/lib/preview/device-configs';
import { premiumPrimaryDarkButton, premiumSecondaryLightButton } from '@/components/ui/button-styles';


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
  const viewportRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setIsDesktopViewport(window.matchMedia('(min-width: 768px)').matches);
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Generate pages based on selected format
  const paginationConfig = useMemo(
    () =>
      buildPaginationConfig(format, {
        fontSize: preferences.fontSize,
        margins: preferences.margins,
      }),
    [format, preferences.fontSize, preferences.margins],
  );

  const pages = useMemo(() => {
    return buildPreviewPages(project, paginationConfig);
  }, [paginationConfig, project]);

  const totalPages = pages.length;

  // Navigation handlers
  const goToPage = useCallback(
    (page: number) => {
      setCurrentPage(Math.max(0, Math.min(page, totalPages - 1)));
    },
    [totalPages],
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

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prevPage();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        nextPage();
      } else if (e.key === 'Home') {
        e.preventDefault();
        goToPage(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        goToPage(totalPages - 1);
      }
    },
    [prevPage, nextPage, goToPage, totalPages],
  );

  // Visible pages based on view mode
  const visiblePages = useMemo(() => {
    if (viewMode === 'single') {
      return pages[currentPage] ? [pages[currentPage]] : [];
    }
    if (currentPage === 0) {
      return [pages[0]].filter(Boolean);
    }
    return [pages[currentPage], pages[currentPage + 1]].filter(Boolean);
  }, [pages, currentPage, viewMode]);

  const pagePreset = FORMAT_PRESETS[format];
  const spreadWidth =
    viewMode === 'spread'
      ? pagePreset.viewportWidth * visiblePages.length + 24 * Math.max(visiblePages.length - 1, 0)
      : pagePreset.viewportWidth;
  const spreadHeight = pagePreset.pagePixelHeight;
  const zoomScale = zoom / 100;
  const scaledSpreadWidth = spreadWidth * zoomScale;
  const scaledSpreadHeight = spreadHeight * zoomScale;

  const chapterEntries = useMemo(() => {
    const seenChapters = new Set<string>();

    return pages.flatMap((page, pageIndex) => {
      if (page.type !== 'content' || !page.chapterId || seenChapters.has(page.chapterId)) {
        return [];
      }

      seenChapters.add(page.chapterId);

      return [
        {
          title: page.chapterTitle || copy.previewModalUntitledChapter,
          pageIndex,
          pageNumber: page.pageNumber,
        },
      ];
    });
  }, [copy.previewModalUntitledChapter, pages]);

  const applyAutoFitZoom = useCallback(() => {
    if (!viewportRef.current) return;

    const viewportRect = viewportRef.current.getBoundingClientRect();
    const availableWidth = Math.max(viewportRect.width - 16, 200);
    const availableHeight = Math.max(viewportRect.height - 16, 200);
    const widthRatio = availableWidth / spreadWidth;
    const heightRatio = availableHeight / spreadHeight;
    const fittedZoom = Math.floor(Math.min(widthRatio, heightRatio, 1) * 100);
    const nextZoom = Math.max(50, Math.min(150, fittedZoom));

    setZoom(nextZoom);
  }, [spreadHeight, spreadWidth]);

  useEffect(() => {
    if (hasManualZoom) return;
    applyAutoFitZoom();
  }, [applyAutoFitZoom, hasManualZoom]);

  useEffect(() => {
    if (hasManualZoom) return;

    const handleResize = () => applyAutoFitZoom();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [applyAutoFitZoom, hasManualZoom]);

  const handleZoomChange = useCallback((nextZoom: number) => {
    setHasManualZoom(true);
    setZoom(nextZoom);
  }, []);

  const tableOfContentsPanel = (
    <>
      <div className="flex-shrink-0 border-b border-white/10 px-5 py-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--text-tertiary)]">
          {copy.previewEyebrow}
        </p>
        <h3 className="mt-2 text-sm font-bold uppercase tracking-[0.22em] text-[var(--text-primary)]">
          {copy.previewModalTocHeading}
        </h3>
      </div>
      <ul
        data-testid="preview-sidebar-toc"
        className="flex-1 space-y-1 overflow-y-auto px-4 py-4"
      >
        {chapterEntries.map((entry, idx) => (
          <li key={idx}>
            <button
              onClick={() => setCurrentPage(entry.pageIndex)}
              className={`w-full rounded-xl px-3 py-2.5 text-left text-xs transition line-clamp-2 ${
                currentPage === entry.pageIndex
                  ? 'bg-[rgba(255,255,255,0.12)] text-white font-semibold shadow-[0_8px_24px_rgba(0,0,0,0.18)]'
                  : 'text-[var(--text-secondary)] hover:bg-[rgba(255,255,255,0.06)] hover:text-[var(--text-primary)]'
              }`}
            >
              <span className="text-[10px] opacity-70 block">
                {copy.previewModalPage} {entry.pageNumber}
              </span>
              <span className="block">{entry.title}</span>
            </button>
          </li>
        ))}
      </ul>
    </>
  );
  const showSpreadSpine = viewMode === 'spread' && visiblePages.length > 1;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="preview-modal-header-title"
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-[rgba(4,6,12,0.78)] backdrop-blur-md px-0 md:px-4"
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <div
        data-testid="preview-modal-shell"
        className="mx-auto flex h-[100dvh] w-full max-w-[1800px] flex-col overflow-hidden border border-white/10 bg-[#111c28] shadow-[0_30px_120px_rgba(0,0,0,0.45)] md:mt-4 md:h-[calc(100dvh-32px)] md:rounded-[28px]"
      >
        {/* HEADER */}
        <header
          data-testid="preview-modal-header"
          className="shrink-0 border-b border-white/10 bg-[rgba(255,255,255,0.02)] px-5 py-3 md:px-6 md:py-4"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--text-tertiary)]">
                {copy.previewEyebrow}
              </p>
              <h2
                id="preview-modal-header-title"
                data-testid="preview-modal-header-title"
                className="mt-2 text-lg font-black flex items-center gap-2 text-[var(--text-primary)] truncate"
              >
                <Eye className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{project.document.title || copy.previewModalUntitledProject}</span>
              </h2>
            </div>

            <button
              data-testid="preview-modal-close"
              onClick={onClose}
              className={`${premiumSecondaryLightButton} p-3 text-xs ml-auto flex-shrink-0`}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* CONTROLS BAND */}
        <div
          data-testid="preview-modal-controls"
          className="shrink-0 flex items-center justify-between gap-4 border-b border-white/10 bg-[rgba(255,255,255,0.03)] px-4 py-2.5 md:px-6 md:py-3 flex-wrap"
        >
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowTableOfContents(!showTableOfContents)}
              className={`${premiumSecondaryLightButton} p-3 text-xs flex items-center gap-2 whitespace-nowrap`}
            >
              <List className="h-4 w-4" />
              <span className="text-xs hidden sm:inline">
                {showTableOfContents ? copy.previewModalTocHide : copy.previewModalTocShow}
              </span>
            </button>

            <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-[rgba(255,255,255,0.03)] p-1">
              <button onClick={() => setViewMode('single')} className={`${viewMode === 'single' ? premiumPrimaryDarkButton : premiumSecondaryLightButton} px-2 py-1.5 text-xs`}><Eye className="h-4 w-4" /></button>
              <button onClick={() => setViewMode('spread')} className={`${viewMode === 'spread' ? premiumPrimaryDarkButton : premiumSecondaryLightButton} px-2 py-1.5 text-xs`}><BookOpen className="h-4 w-4" /></button>
            </div>

            <div className="h-6 border-l border-white/10" />

            <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-[rgba(255,255,255,0.03)] p-1">
              {(
                [
                  { format: 'mobile' as const, icon: Smartphone, label: copy.previewModalMobile },
                  { format: 'tablet' as const, icon: Tablet, label: copy.previewModalTablet },
                  { format: 'laptop' as const, icon: Monitor, label: copy.previewModalLaptop },
                ] as const
              ).map(({ format: fmt, icon: Icon, label }) => (
                <button
                  key={fmt}
                  onClick={() => setFormat(fmt)}
                  className={`${format === fmt ? premiumPrimaryDarkButton : premiumSecondaryLightButton} px-2 py-1.5 text-xs`}
                  title={label}
                >
                  <Icon className="h-4 w-4" />
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 ml-auto">
            <button onClick={() => handleZoomChange(Math.max(50, zoom - 10))} disabled={zoom <= 50} className={`${premiumSecondaryLightButton} p-2 text-xs disabled:opacity-50`}><ZoomOut className="h-4 w-4" /></button>
            <div className="flex items-center gap-2">
              <input type="range" min={50} max={150} step={5} value={zoom} onChange={(e) => handleZoomChange(Number(e.target.value))} className="w-24 accent-[var(--button-primary-bg)] cursor-pointer" />
              <span className="text-xs text-[var(--text-tertiary)] w-12 text-center">{zoom}%</span>
            </div>
            <button onClick={() => handleZoomChange(Math.min(150, zoom + 10))} disabled={zoom >= 150} className={`${premiumSecondaryLightButton} p-2 text-xs disabled:opacity-50`}><ZoomIn className="h-4 w-4" /></button>
          </div>
        </div>

        {/* MAIN CONTENT AREA */}
        <main
          data-testid="preview-modal-stage"
          className="relative flex min-h-0 flex-1 overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.08),_transparent_42%),linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))]"
        >
          {isDesktopViewport && showTableOfContents && (
            <aside className="w-56 flex-shrink-0 overflow-hidden border-r border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] xl:w-60">
              {tableOfContentsPanel}
            </aside>
          )}

          <section className="flex flex-1 flex-col overflow-hidden px-1.5 py-1.5 md:px-2 md:py-2">
            <div className="relative flex-1 min-h-0">
              {!isDesktopViewport && showTableOfContents && (
                <aside className="absolute inset-0 z-20 flex flex-col overflow-hidden rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(18,30,45,0.98),rgba(10,16,25,0.98))] shadow-[0_28px_80px_rgba(0,0,0,0.38)]">
                  {tableOfContentsPanel}
                </aside>
              )}
              <div
                ref={viewportRef}
                className={`flex-1 h-full rounded-[24px] border border-white/10 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.08),_transparent_35%),linear-gradient(180deg,rgba(17,28,40,0.92),rgba(10,16,25,0.96))] p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] md:p-2.5 ${hasManualZoom ? 'overflow-auto' : 'overflow-hidden'}`}
              >
                <div className="min-h-full flex items-center justify-center">
                  <div
                    className="relative mx-auto transition-all duration-300"
                    style={{
                      width: `${scaledSpreadWidth}px`,
                      height: `${scaledSpreadHeight}px`,
                    }}
                  >
                    {showSpreadSpine && (
                      <div className="pointer-events-none absolute inset-y-4 left-1/2 z-20 hidden w-5 -translate-x-1/2 rounded-full bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.015),rgba(0,0,0,0.18))] shadow-[inset_0_0_12px_rgba(255,255,255,0.03),0_0_18px_rgba(0,0,0,0.12)] md:block">
                        <div className="absolute inset-y-2 left-1/2 w-px -translate-x-1/2 bg-white/10" />
                      </div>
                    )}
                    <div
                      className="absolute left-0 top-0 flex transition-all duration-300"
                      style={{
                        gap: viewMode === 'spread' ? '1.5rem' : '0',
                        transform: `scale(${zoom / 100})`,
                        transformOrigin: 'top left',
                        width: `${spreadWidth}px`,
                        height: `${spreadHeight}px`,
                      }}
                    >
                      {visiblePages.map((page, idx) => (
                        <div key={`page-${currentPage}-${idx}`} className="relative">
                          <PageRenderer
                            page={page}
                            format={format}
                            copy={copy}
                            config={paginationConfig}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <footer className="shrink-0 border-t border-white/10 bg-[rgba(7,12,20,0.92)] px-4 py-2.5 backdrop-blur-sm md:px-6 md:py-3">
              <div className="flex w-full items-center justify-between gap-3">
                <button onClick={prevPage} disabled={currentPage === 0} className={`${premiumSecondaryLightButton} min-w-[96px] px-3 py-2 text-xs disabled:opacity-50 flex items-center justify-center gap-1`}><ChevronLeft className="h-4 w-4" /><span className="hidden sm:inline">{copy.previewModalPrevious}</span></button>
                <div className="flex items-center justify-center gap-2 text-sm text-[var(--text-secondary)]">
                  <span className="hidden sm:inline">{copy.previewModalPage}</span>
                  <input type="number" min={1} max={totalPages} value={currentPage + 1} onChange={(e) => goToPage(Number(e.target.value) - 1)} className="w-12 text-center border border-[var(--border-subtle)] rounded-lg px-2 py-1 bg-[var(--surface-soft)] text-[var(--text-primary)]" />
                  <span className="text-xs whitespace-nowrap">{copy.previewModalOf} {totalPages}</span>
                </div>
                <button onClick={nextPage} disabled={currentPage >= totalPages - 1} className={`${premiumSecondaryLightButton} min-w-[96px] px-3 py-2 text-xs disabled:opacity-50 flex items-center justify-center gap-1`}><span className="hidden sm:inline">{copy.previewModalNext}</span><ChevronRight className="h-4 w-4" /></button>
              </div>
            </footer>
          </section>
        </main>
      </div>
    </div>
  );
}

function PageRenderer({ page, format, copy, config }: { page: PreviewPage, format: PreviewFormat, copy: any, config: any }) {
  const preset = FORMAT_PRESETS[format];
  const pageStyle = {
    width: `${preset.viewportWidth}px`,
    height: `${preset.pagePixelHeight}px`,
    padding: `${config.marginTop}px ${config.marginRight}px ${config.marginBottom}px ${config.marginLeft}px`,
  };

  if (page.type === 'cover' && page.coverData) {
    if (page.coverData.renderedImageUrl) {
      return (
        <div style={pageStyle} className="overflow-hidden rounded-[8px] border border-[var(--preview-paper-border)] shadow-[var(--shadow-strong)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={page.coverData.renderedImageUrl} alt={copy.previewModalCoverAlt} className="h-full w-full object-cover" />
        </div>
      );
    }
    const paletteMap: Record<string, string> = {
      obsidian: 'from-[#0b133f] via-[#0b233f] to-[#07252f] text-[#f2e3b3]',
      teal: 'from-[#124a50] via-[#0b313f] to-[#07252f] text-[#f2e3b3]',
      sand: 'from-[#f2e3b3] via-[#e7d4a0] to-[#d4af37] text-[#0b313f]',
    };
    return (
      <div style={pageStyle} className={`relative overflow-hidden bg-gradient-to-br ${paletteMap[page.coverData.palette]} rounded-[8px] shadow-[var(--shadow-strong)] flex flex-col justify-center border border-white/10`}>
        {page.coverData.backgroundImageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={page.coverData.backgroundImageUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-30" />
        )}
        <div className="px-8 py-8">
          <h1 className="text-4xl font-black tracking-tight mb-4">{page.coverData.title}</h1>
          {page.coverData.subtitle && page.coverData.showSubtitle !== false && <p className="text-lg leading-7 opacity-80 mb-8">{page.coverData.subtitle}</p>}
          <p className="text-sm opacity-70">— {page.coverData.author}</p>
        </div>
      </div>
    );
  }

  if (page.type === 'back-cover' && page.backCoverData) {
    if (page.backCoverData.renderedImageUrl) {
      return (
        <div style={pageStyle} className="overflow-hidden rounded-[8px] border border-[var(--preview-paper-border)] shadow-[var(--shadow-strong)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={page.backCoverData.renderedImageUrl} alt={copy.previewModalBackCoverAlt} className="h-full w-full object-cover" />
        </div>
      );
    }
    return (
      <div style={pageStyle} className="bg-[var(--preview-paper)] rounded-[8px] shadow-[var(--shadow-strong)] border border-[var(--preview-paper-border)] flex flex-col justify-between p-8">
        <div>
          <h2 className="text-2xl font-black text-[var(--text-primary)] mb-4">{page.backCoverData.title}</h2>
          <p className="text-[var(--text-secondary)] leading-7 mb-6">{page.backCoverData.body}</p>
        </div>
        <div className="border-t border-[var(--border-subtle)] pt-4">
          <p className="text-sm text-[var(--text-tertiary)]">{page.backCoverData.authorBio}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle} className="preview-page multipage-page-frame bg-[var(--preview-paper)] rounded-[8px] shadow-[var(--shadow-strong)] border border-[var(--preview-paper-border)] overflow-hidden flex flex-col">
      <style>{`
        .preview-page { font-size: ${config.fontSize}px; line-height: ${config.lineHeight}; }
        .preview-page p { margin: 0; overflow-wrap: break-word; word-break: break-word; }
        .preview-page p + p { margin-top: 0.8rem; }
        .preview-page h1 { font-size: 2rem; line-height: 1.1; font-weight: 800; margin: 0 0 1rem 0; color: var(--text-primary); }
        .preview-page h2 { font-size: 1.5rem; line-height: 1.2; font-weight: 750; margin: 0 0 0.85rem 0; color: var(--text-primary); }
        .preview-page h3 { font-size: 1.2rem; line-height: 1.3; font-weight: 700; margin: 0 0 0.75rem 0; color: var(--text-primary); }
        .preview-page ul, .preview-page ol { margin: 0 0 1rem 1.5rem; padding: 0; }
        .preview-page li { margin: 0.35rem 0; }
      `}</style>
      <div className="flex-1 min-h-0">
        <div className="max-w-none text-[var(--text-secondary)]" dangerouslySetInnerHTML={{ __html: page.content || '' }} />
      </div>
    </div>
  );
}
