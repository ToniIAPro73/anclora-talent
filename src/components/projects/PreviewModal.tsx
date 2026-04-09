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
import { buildPreviewPages, type PreviewPage } from '@/lib/preview/preview-builder';
import {
  DEVICE_PAGINATION_CONFIGS,
  FORMAT_PRESETS,
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
  // View state
  const [currentPage, setCurrentPage] = useState(0);
  const [viewMode, setViewMode] = useState<'single' | 'spread'>('spread');
  const [format, setFormat] = useState<PreviewFormat>('laptop');
  const [zoom, setZoom] = useState(100);
  const [hasManualZoom, setHasManualZoom] = useState(false);
  const [showTableOfContents, setShowTableOfContents] = useState(true);
  const [isDesktopViewport, setIsDesktopViewport] = useState(() => {
    if (typeof window === 'undefined') {
      return false;
    }

    if (typeof window.matchMedia !== 'function') {
      return true;
    }

    return window.matchMedia('(min-width: 768px)').matches;
  });
  const viewportRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') {
      return;
    }

    const mediaQuery = window.matchMedia('(min-width: 768px)');
    const handleChange = (event: MediaQueryListEvent | MediaQueryList) => {
      setIsDesktopViewport(event.matches);
    };

    handleChange(mediaQuery);
    mediaQuery.addEventListener('change', handleChange);

    return () => mediaQuery.removeEventListener('change', handleChange);
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
  // Commit 2: buildPreviewPages now returns fully paginated pages (per-chapter pagination with global numbering)
  // No need for duplicate pagination here - use pages directly
  const pages = useMemo(() => {
    const config = DEVICE_PAGINATION_CONFIGS[format];
    return buildPreviewPages(project, config);
  }, [project, format]);

  const totalPages = pages.length;

  // Navigation handlers
  const goToPage = useCallback(
    (page: number) => {
      setCurrentPage(Math.max(0, Math.min(page, totalPages - 1)));
    },
    [totalPages],
  );

  const nextPage = useCallback(() => {
    goToPage(currentPage + 1);
  }, [currentPage, goToPage]);

  const prevPage = useCallback(() => {
    goToPage(currentPage - 1);
  }, [currentPage, goToPage]);

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
    const spreadWidth =
      viewMode === 'spread'
        ? pagePreset.viewportWidth * visiblePages.length + 24 * Math.max(visiblePages.length - 1, 0)
        : pagePreset.viewportWidth;
    const spreadHeight = pagePreset.pagePixelHeight;

    const availableWidth = Math.max(viewportRect.width - 32, 200);
    const availableHeight = Math.max(viewportRect.height - 32, 200);
    const widthRatio = availableWidth / spreadWidth;
    const heightRatio = availableHeight / spreadHeight;
    const fittedZoom = Math.floor(Math.min(widthRatio, heightRatio, 1) * 100);
    const nextZoom = Math.max(50, Math.min(150, fittedZoom));

    setZoom(nextZoom);
  }, [pagePreset.pagePixelHeight, pagePreset.viewportWidth, viewMode, visiblePages.length]);

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
        {/* ═══════════════════════ HEADER ═══════════════════════ */}
        <header
          data-testid="preview-modal-header"
          className="shrink-0 border-b border-white/10 bg-[rgba(255,255,255,0.02)] px-6 py-4"
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
              aria-label={copy.previewModalClose}
              className={`${premiumSecondaryLightButton} p-3 text-xs ml-auto flex-shrink-0`}
              title={copy.previewModalClose}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* ═══════════════════════ CONTROLS BAND ═══════════════════════ */}
        <div
          data-testid="preview-modal-controls"
          className="shrink-0 flex items-center justify-between gap-4 border-b border-white/10 bg-[rgba(255,255,255,0.03)] px-6 py-3 flex-wrap"
        >
          <div data-testid="preview-modal-view-controls" className="flex items-center gap-2">
            <button
              onClick={() => setShowTableOfContents(!showTableOfContents)}
              aria-label={showTableOfContents ? copy.previewModalTocHide : copy.previewModalTocShow}
              aria-pressed={showTableOfContents}
              aria-expanded={showTableOfContents}
              aria-controls="preview-modal-sidebar"
              className={`${premiumSecondaryLightButton} p-3 text-xs flex items-center gap-2 whitespace-nowrap`}
              title={showTableOfContents ? copy.previewModalTocHide : copy.previewModalTocShow}
            >
              <List className="h-4 w-4" />
              <span className="text-xs hidden sm:inline">
                {showTableOfContents ? copy.previewModalTocHide : copy.previewModalTocShow}
              </span>
            </button>

            <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-[rgba(255,255,255,0.03)] p-1">
              <button
                onClick={() => setViewMode('single')}
                data-state={viewMode === 'single' ? 'active' : 'inactive'}
                aria-label={copy.previewModalSingleView}
                aria-pressed={viewMode === 'single'}
                className={`${
                  viewMode === 'single'
                    ? premiumPrimaryDarkButton
                    : premiumSecondaryLightButton
                } px-2 py-1.5 text-xs`}
                title={copy.previewModalSingleView}
              >
                <Eye className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('spread')}
                data-state={viewMode === 'spread' ? 'active' : 'inactive'}
                aria-label={copy.previewModalSpreadView}
                aria-pressed={viewMode === 'spread'}
                className={`${
                  viewMode === 'spread'
                    ? premiumPrimaryDarkButton
                    : premiumSecondaryLightButton
                } px-2 py-1.5 text-xs`}
                title={copy.previewModalSpreadView}
              >
                <BookOpen className="h-4 w-4" />
              </button>
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
                  data-state={format === fmt ? 'active' : 'inactive'}
                  aria-label={label}
                  aria-pressed={format === fmt}
                  className={`${
                    format === fmt
                      ? premiumPrimaryDarkButton
                      : premiumSecondaryLightButton
                  } px-2 py-1.5 text-xs`}
                  title={label}
                >
                  <Icon className="h-4 w-4" />
                </button>
              ))}
            </div>
          </div>

          <div data-testid="preview-modal-zoom-controls" className="flex items-center gap-3 ml-auto">
            <button
              onClick={() => handleZoomChange(Math.max(50, zoom - 10))}
              disabled={zoom <= 50}
              aria-label={copy.previewModalZoomOut}
              className={`${premiumSecondaryLightButton} p-2 text-xs disabled:opacity-50`}
              title={copy.previewModalZoomOut}
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={50}
                max={150}
                step={5}
                value={zoom}
                onChange={(e) => handleZoomChange(Number(e.target.value))}
                aria-label={copy.previewModalZoomSlider}
                className="w-24 accent-[var(--button-primary-bg)] cursor-pointer"
              />
              <span className="text-xs text-[var(--text-tertiary)] w-12 text-center">
                {zoom}%
              </span>
            </div>
            <button
              onClick={() => handleZoomChange(Math.min(150, zoom + 10))}
              disabled={zoom >= 150}
              aria-label={copy.previewModalZoomIn}
              className={`${premiumSecondaryLightButton} p-2 text-xs disabled:opacity-50`}
              title={copy.previewModalZoomIn}
            >
              <ZoomIn className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ═══════════════════════ MAIN CONTENT AREA ═══════════════════════ */}
        <main
          data-testid="preview-modal-stage"
          className="relative flex min-h-0 flex-1 overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.08),_transparent_42%),linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))]"
        >
          {/* Table of Contents Sidebar */}
          {isDesktopViewport && showTableOfContents && (
            <aside
              id="preview-modal-sidebar"
              aria-label={copy.previewModalTocHeading}
              data-testid="preview-modal-sidebar"
              className="w-72 flex-shrink-0 overflow-hidden border-r border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))]"
            >
              {tableOfContentsPanel}
            </aside>
          )}

          {/* Preview Area */}
          <section className="flex flex-1 flex-col overflow-hidden px-3 py-3 md:px-6 md:py-6">
            {/* Content scrollable area */}
            <div className="relative flex-1 min-h-0">
              {!isDesktopViewport && showTableOfContents && (
                <aside
                  id="preview-modal-sidebar"
                  aria-label={copy.previewModalTocHeading}
                  data-testid="preview-modal-sidebar"
                  className="absolute inset-0 z-20 flex flex-col overflow-hidden rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(18,30,45,0.98),rgba(10,16,25,0.98))] shadow-[0_28px_80px_rgba(0,0,0,0.38)]"
                >
                  {tableOfContentsPanel}
                </aside>
              )}
              <div
                ref={viewportRef}
                data-preview-viewport="true"
                data-testid="preview-document-scroll"
                className="flex-1 h-full overflow-auto rounded-[24px] border border-white/10 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.08),_transparent_35%),linear-gradient(180deg,rgba(17,28,40,0.92),rgba(10,16,25,0.96))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] md:p-6"
              >
                <div
                  data-testid="preview-stage-surface"
                  className="min-h-full flex items-center justify-center"
                >
                  <div
                    data-testid="preview-spread-frame"
                    className="relative mx-auto transition-all duration-300"
                    style={{
                      width: `${scaledSpreadWidth}px`,
                      height: `${scaledSpreadHeight}px`,
                    }}
                  >
                    <div
                      className="absolute left-0 top-0 flex transition-all duration-300"
                      style={{
                        gap: viewMode === 'spread' ? '1.5rem' : '0',
                        transform: `scale(${zoom / 100})`,
                        transformOrigin: 'top left',
                        width: `${spreadWidth}px`,
                        height: `${spreadHeight}px`,
                      }}
                      onKeyDown={handleKeyDown}
                    >
                      {visiblePages.length > 0 ? (
                        visiblePages.map((page, idx) => (
                          <PageRenderer
                            key={`page-${currentPage}-${idx}`}
                            page={page}
                            format={format}
                            copy={copy}
                          />
                        ))
                      ) : (
                        <div className="flex items-center justify-center text-[var(--text-tertiary)] text-center px-6">
                          <p>{copy.previewModalEmptyState}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Pagination Bar */}
            <footer
              data-testid="preview-modal-footer"
              className="shrink-0 border-t border-white/10 bg-[rgba(7,12,20,0.92)] px-4 py-3 backdrop-blur-sm md:px-6"
            >
              <div className="flex w-full items-center justify-between gap-3">
                <button
                  onClick={prevPage}
                  disabled={currentPage === 0}
                  className={`${premiumSecondaryLightButton} min-w-[96px] px-3 py-2 text-xs disabled:opacity-50 flex items-center justify-center gap-1`}
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">{copy.previewModalPrevious}</span>
                </button>

                <div className="flex items-center justify-center gap-2 text-sm text-[var(--text-secondary)]">
                  <span className="hidden sm:inline">{copy.previewModalPage}</span>
                  <input
                    type="number"
                    min={1}
                    max={totalPages}
                    value={currentPage + 1}
                    onChange={(e) => goToPage(Number(e.target.value) - 1)}
                    aria-label={copy.previewModalPage}
                    className="w-12 text-center border border-[var(--border-subtle)] rounded-lg px-2 py-1 bg-[var(--surface-soft)] text-[var(--text-primary)]"
                  />
                  <span className="text-xs whitespace-nowrap">
                    {copy.previewModalOf} {totalPages}
                  </span>
                </div>

                <button
                  onClick={nextPage}
                  disabled={currentPage >= totalPages - 1}
                  className={`${premiumSecondaryLightButton} min-w-[96px] px-3 py-2 text-xs disabled:opacity-50 flex items-center justify-center gap-1`}
                >
                  <span className="hidden sm:inline">{copy.previewModalNext}</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </footer>
          </section>
        </main>
      </div>
    </div>
  );
}

// ==================== PAGE RENDERER ====================

interface PageRendererProps {
  page: PreviewPage;
  format: PreviewFormat;
  copy: AppMessages['project'];
}

function PageRenderer({ page, format, copy }: PageRendererProps) {
  const config = DEVICE_PAGINATION_CONFIGS[format];
  const preset = FORMAT_PRESETS[format];

  const pageStyle = {
    width: `${preset.viewportWidth}px`,
    height: `${preset.pagePixelHeight}px`,
    padding: `${config.marginTop}px ${config.marginRight}px ${config.marginBottom}px ${config.marginLeft}px`,
  };

  if (page.type === 'cover' && page.coverData) {
    if (page.coverData.renderedImageUrl) {
      return (
        <div
          data-testid="preview-page-shell"
          style={pageStyle}
          className="overflow-hidden rounded-[8px] border border-[var(--preview-paper-border)] shadow-[var(--shadow-strong)]"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={page.coverData.renderedImageUrl}
            alt={copy.previewModalCoverAlt}
            className="h-full w-full object-cover"
          />
        </div>
      );
    }

    const paletteMap: Record<string, string> = {
      obsidian: 'from-[#0b133f] via-[#0b233f] to-[#07252f] text-[#f2e3b3]',
      teal: 'from-[#124a50] via-[#0b313f] to-[#07252f] text-[#f2e3b3]',
      sand: 'from-[#f2e3b3] via-[#e7d4a0] to-[#d4af37] text-[#0b313f]',
    };

    return (
      <div
        data-testid="preview-page-shell"
        style={pageStyle}
        className={`relative overflow-hidden bg-gradient-to-br ${paletteMap[page.coverData.palette]} rounded-[8px] shadow-[var(--shadow-strong)] flex flex-col justify-center border border-white/10`}
      >
        {page.coverData.backgroundImageUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={page.coverData.backgroundImageUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-30"
          />
        )}
        <div className="px-8 py-8">
          <h1 className="text-4xl font-black tracking-tight mb-4">
            {page.coverData.title}
          </h1>
          {page.coverData.subtitle && page.coverData.showSubtitle !== false && (
            <p className="text-lg leading-7 opacity-80 mb-8">
              {page.coverData.subtitle}
            </p>
          )}
          <p className="text-sm opacity-70">— {page.coverData.author}</p>
        </div>
      </div>
    );
  }

  if (page.type === 'back-cover' && page.backCoverData) {
    if (page.backCoverData.renderedImageUrl) {
      return (
        <div
          data-testid="preview-page-shell"
          style={pageStyle}
          className="overflow-hidden rounded-[8px] border border-[var(--preview-paper-border)] shadow-[var(--shadow-strong)]"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={page.backCoverData.renderedImageUrl}
            alt={copy.previewModalBackCoverAlt}
            className="h-full w-full object-cover"
          />
        </div>
      );
    }

    return (
      <div
        data-testid="preview-page-shell"
        style={pageStyle}
        className="bg-[var(--preview-paper)] rounded-[8px] shadow-[var(--shadow-strong)] border border-[var(--preview-paper-border)] flex flex-col justify-between p-8"
      >
        <div>
          <h2 className="text-2xl font-black text-[var(--text-primary)] mb-4">
            {page.backCoverData.title}
          </h2>
          <p className="text-[var(--text-secondary)] leading-7 mb-6">
            {page.backCoverData.body}
          </p>
        </div>
        <div className="border-t border-[var(--border-subtle)] pt-4">
          <p className="text-sm text-[var(--text-tertiary)]">
            {page.backCoverData.authorBio}
          </p>
        </div>
      </div>
    );
  }

  // TOC or Content page
  return (
    <div
      data-testid="preview-page-shell"
      style={pageStyle}
      className="bg-[var(--preview-paper)] rounded-[8px] shadow-[var(--shadow-strong)] border border-[var(--preview-paper-border)] overflow-hidden flex flex-col"
    >
      <div className="flex-1 min-h-0">
        <div
          data-testid="preview-page-content"
          className="max-w-none text-[var(--text-secondary)] [&_blockquote]:my-5 [&_blockquote]:rounded-[12px] [&_blockquote]:border-l-4 [&_blockquote]:border-[var(--preview-quote-border)] [&_blockquote]:bg-[var(--preview-quote-bg)] [&_blockquote]:px-5 [&_blockquote]:py-4 [&_h1]:m-0 [&_h1]:mb-4 [&_h1]:text-[2rem] [&_h1]:font-black [&_h1]:leading-[1.1] [&_h1]:text-[var(--text-primary)] [&_h2]:m-0 [&_h2]:mb-[0.85rem] [&_h2]:text-[1.5rem] [&_h2]:font-[750] [&_h2]:leading-[1.2] [&_h2]:text-[var(--text-primary)] [&_h3]:m-0 [&_h3]:mb-[0.75rem] [&_h3]:text-[1.2rem] [&_h3]:font-bold [&_h3]:leading-[1.3] [&_h3]:text-[var(--text-primary)] [&_h4]:m-0 [&_h4]:mb-[0.65rem] [&_h4]:text-[1.05rem] [&_h4]:font-bold [&_h4]:leading-[1.35] [&_h4]:text-[var(--text-primary)] [&_h5]:m-0 [&_h5]:mb-[0.6rem] [&_h5]:text-[0.95rem] [&_h5]:font-bold [&_h5]:leading-[1.4] [&_h5]:text-[var(--text-primary)] [&_h6]:m-0 [&_h6]:mb-[0.6rem] [&_h6]:text-[0.95rem] [&_h6]:font-bold [&_h6]:leading-[1.4] [&_h6]:text-[var(--text-primary)] [&_hr]:hidden [&_li]:my-[0.35rem] [&_ol]:my-0 [&_ol]:mb-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:m-0 [&_p]:leading-[1.65] [&_p+p]:mt-[0.9rem] [&_strong]:font-semibold [&_strong]:text-[var(--text-primary)] [&_ul]:my-0 [&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-6"
          dangerouslySetInnerHTML={{ __html: page.content || '' }}
        />
      </div>
      {page.pageNumber !== undefined && (
        <div className="border-t border-[var(--border-subtle)] pt-3 text-center text-xs text-[var(--text-tertiary)]">
          {copy.previewModalPage} {page.pageNumber}
        </div>
      )}
    </div>
  );
}
