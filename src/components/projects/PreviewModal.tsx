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

import { useMemo, useState, useCallback, useEffect } from 'react';
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
  ChevronDown,
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
import { DeviceFrame } from './DeviceViewers';


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
  const [viewMode, setViewMode] = useState<'single' | 'spread'>('single');
  const [format, setFormat] = useState<PreviewFormat>('laptop');
  const [zoom, setZoom] = useState(100);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showTableOfContents, setShowTableOfContents] = useState(true);

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
    const increment = viewMode === 'spread' ? 2 : 1;
    goToPage(currentPage + increment);
  }, [currentPage, viewMode, goToPage]);

  const prevPage = useCallback(() => {
    const decrement = viewMode === 'spread' ? 2 : 1;
    goToPage(currentPage - decrement);
  }, [currentPage, viewMode, goToPage]);

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
    // Spread mode: show two pages side by side
    const leftIdx = currentPage % 2 === 0 ? currentPage : currentPage - 1;
    return [pages[leftIdx], pages[leftIdx + 1]].filter(Boolean);
  }, [pages, currentPage, viewMode]);

  const preset = FORMAT_PRESETS[format];

  // Generate table of contents from pages
  // Commit 2: TOC now uses first page of each chapter (from toc page or first content page of chapter)
  const tocEntries = useMemo(() => {
    const entries = [];
    const seenChapters = new Set<string>();

    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];

      // Add TOC page entry if present
      if (page.type === 'toc' && page.tocEntries) {
        page.tocEntries.forEach(entry => {
          entries.push({
            title: entry.title,
            pageIndex: i,
            pageNumber: entry.pageNumber,
          });
        });
      }

      // Add chapter entries (first page of each chapter)
      if (page.type === 'content' && page.chapterId && !seenChapters.has(page.chapterId)) {
        seenChapters.add(page.chapterId);
        entries.push({
          title: page.chapterTitle || `Capítulo sin título`,
          pageIndex: i,
          pageNumber: page.pageNumber,
        });
      }
    }

    return entries;
  }, [pages]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-[var(--background)] overflow-hidden"
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* ═══════════════════════ HEADER ═══════════════════════ */}
      <header className="shrink-0 flex items-center justify-between border-b border-[var(--border-subtle)] px-6 py-4 bg-[var(--page-surface)]">
        <div className="flex items-center gap-4 flex-1">
          <button
            onClick={() => setShowTableOfContents(!showTableOfContents)}
            className={`${premiumSecondaryLightButton} p-3 text-xs flex items-center gap-2 whitespace-nowrap`}
            title="Toggle table of contents"
          >
            <List className="h-4 w-4" />
            <span className="text-xs hidden sm:inline">{showTableOfContents ? 'Ocultar' : 'Índice'}</span>
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--text-tertiary)]">
              {copy.previewEyebrow}
            </p>
            <h2 className="text-lg font-black flex items-center gap-2 text-[var(--text-primary)] truncate">
              <Eye className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{project.document.title || 'Proyecto sin título'}</span>
            </h2>
          </div>
        </div>

        <button
          onClick={onClose}
          className={`${premiumSecondaryLightButton} p-3 text-xs ml-auto flex-shrink-0`}
          title="Close preview"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      {/* ═══════════════════════ TOOLBAR ═══════════════════════ */}
      <div className="shrink-0 flex items-center justify-between border-b border-[var(--border-subtle)] px-6 py-3 bg-[var(--page-surface-muted)] gap-4 flex-wrap">
        {/* View mode and device selection */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-soft)] p-1">
            <button
              onClick={() => setViewMode('single')}
              className={`${
                viewMode === 'single'
                  ? premiumPrimaryDarkButton
                  : premiumSecondaryLightButton
              } px-2 py-1.5 text-xs`}
              title="Single page view"
            >
              <Eye className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('spread')}
              className={`${
                viewMode === 'spread'
                  ? premiumPrimaryDarkButton
                  : premiumSecondaryLightButton
              } px-2 py-1.5 text-xs`}
              title="Two page spread"
            >
              <BookOpen className="h-4 w-4" />
            </button>
          </div>

          {/* Separator */}
          <div className="h-6 border-l border-[var(--border-subtle)]" />

          {/* Device selector */}
          <div className="flex items-center gap-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-soft)] p-1">
            {(
              [
                { format: 'mobile' as const, icon: Smartphone, label: 'Mobile' },
                { format: 'tablet' as const, icon: Tablet, label: 'Tablet' },
                { format: 'laptop' as const, icon: Monitor, label: 'Desktop' },
              ] as const
            ).map(({ format: fmt, icon: Icon, label }) => (
              <button
                key={fmt}
                onClick={() => setFormat(fmt)}
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

        {/* Zoom and pagination controls */}
        <div className="flex items-center gap-3 ml-auto">
          <button
            onClick={() => setZoom(Math.max(50, zoom - 10))}
            disabled={zoom <= 50}
            className={`${premiumSecondaryLightButton} p-2 text-xs disabled:opacity-50`}
            title="Zoom out"
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
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-24 accent-[var(--button-primary-bg)] cursor-pointer"
            />
            <span className="text-xs text-[var(--text-tertiary)] w-12 text-center">
              {zoom}%
            </span>
          </div>
          <button
            onClick={() => setZoom(Math.min(150, zoom + 10))}
            disabled={zoom >= 150}
            className={`${premiumSecondaryLightButton} p-2 text-xs disabled:opacity-50`}
            title="Zoom in"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ═══════════════════════ MAIN CONTENT AREA ═══════════════════════ */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Table of Contents Sidebar */}
        {showTableOfContents && (
          <aside className="w-64 border-r border-[var(--border-subtle)] bg-[var(--page-surface)] flex flex-col flex-shrink-0 overflow-hidden">
            <div className="p-4 border-b border-[var(--border-subtle)] flex-shrink-0">
              <h3 className="text-sm font-bold uppercase tracking-wider text-[var(--text-primary)]">
                Table of Contents
              </h3>
            </div>
            <ul className="space-y-1 overflow-y-auto flex-1 p-4">
              {tocEntries.map((entry, idx) => (
                <li key={idx}>
                  <button
                    onClick={() => setCurrentPage(entry.pageIndex)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs transition line-clamp-2 ${
                      currentPage === entry.pageIndex
                        ? 'bg-[var(--accent)] text-white font-semibold'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--surface-soft)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <span className="text-[10px] opacity-70 block">p. {entry.pageNumber}</span>
                    <span className="block">{entry.title}</span>
                  </button>
                </li>
              ))}
            </ul>
          </aside>
        )}

        {/* Preview Area */}
        <main className="flex-1 flex flex-col bg-[var(--page-surface-muted)] overflow-hidden">
          {/* Content scrollable area */}
          <div className="flex-1 flex items-center justify-center overflow-auto p-4">
            <div
              className="flex transition-all duration-300"
              style={{
                gap: viewMode === 'spread' ? '1.5rem' : '0',
                transform: `scale(${zoom / 100})`,
                transformOrigin: 'center center',
              }}
              onKeyDown={handleKeyDown}
            >
              {visiblePages.length > 0 ? (
                visiblePages.map((page, idx) => (
                  <PageRenderer
                    key={`page-${currentPage}-${idx}`}
                    page={page}
                    format={format}
                    project={project}
                  />
                ))
              ) : (
                <div className="flex items-center justify-center text-[var(--text-tertiary)] text-center px-6">
                  <p>No content to display</p>
                </div>
              )}
            </div>
          </div>

          {/* Pagination Bar */}
          <footer className="shrink-0 flex items-center justify-center gap-4 border-t border-[var(--border-subtle)] px-6 py-3 bg-[var(--page-surface)] flex-wrap">
            <button
              onClick={prevPage}
              disabled={currentPage === 0}
              className={`${premiumSecondaryLightButton} px-3 py-2 text-xs disabled:opacity-50 flex items-center gap-1`}
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Previous</span>
            </button>

            <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
              <span className="hidden sm:inline">Page</span>
              <input
                type="number"
                min={1}
                max={totalPages}
                value={currentPage + 1}
                onChange={(e) => goToPage(Number(e.target.value) - 1)}
                className="w-12 text-center border border-[var(--border-subtle)] rounded-lg px-2 py-1 bg-[var(--surface-soft)] text-[var(--text-primary)]"
              />
              <span className="text-xs">/ {totalPages}</span>
            </div>

            <button
              onClick={nextPage}
              disabled={currentPage >= totalPages - 1}
              className={`${premiumSecondaryLightButton} px-3 py-2 text-xs disabled:opacity-50 flex items-center gap-1`}
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </footer>
        </main>
      </div>
    </div>
  );
}

// ==================== PAGE RENDERER ====================

interface PageRendererProps {
  page: PreviewPage;
  format: PreviewFormat;
  project: ProjectRecord;
}

function PageRenderer({ page, format, project }: PageRendererProps) {
  const config = DEVICE_PAGINATION_CONFIGS[format];
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
      <div
        style={pageStyle}
        className={`bg-gradient-to-br ${paletteMap[page.coverData.palette]} rounded-[8px] shadow-[var(--shadow-strong)] flex flex-col justify-center border border-white/10`}
      >
        <div className="px-8 py-8">
          <h1 className="text-4xl font-black tracking-tight mb-4">
            {page.coverData.title}
          </h1>
          {page.coverData.subtitle && (
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
    return (
      <div
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
      style={pageStyle}
      className="bg-[var(--preview-paper)] rounded-[8px] shadow-[var(--shadow-strong)] border border-[var(--preview-paper-border)] overflow-hidden flex flex-col"
    >
      <div className="flex-1 overflow-y-auto">
        <div
          className="max-w-none text-[var(--text-secondary)] [&_blockquote]:my-5 [&_blockquote]:rounded-[12px] [&_blockquote]:border-l-4 [&_blockquote]:border-[var(--preview-quote-border)] [&_blockquote]:bg-[var(--preview-quote-bg)] [&_blockquote]:px-5 [&_blockquote]:py-4 [&_h1]:mt-8 [&_h1]:text-3xl [&_h1]:font-black [&_h1]:tracking-tight [&_h1]:text-[var(--text-primary)] [&_h2]:mt-7 [&_h2]:text-2xl [&_h2]:font-black [&_h2]:tracking-tight [&_h2]:text-[var(--text-primary)] [&_h3]:mt-6 [&_h3]:text-xl [&_h3]:font-bold [&_h3]:tracking-tight [&_h3]:text-[var(--text-primary)] [&_hr]:my-8 [&_hr]:border-0 [&_hr]:border-t [&_hr]:border-[var(--border-subtle)] [&_li]:mb-2 [&_li]:leading-7 [&_ol]:my-4 [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-6 [&_p]:leading-8 [&_strong]:font-semibold [&_strong]:text-[var(--text-primary)] [&_ul]:my-4 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-6"
          dangerouslySetInnerHTML={{ __html: page.content || '' }}
        />
      </div>
      {page.pageNumber !== undefined && (
        <div className="border-t border-[var(--border-subtle)] pt-3 text-center text-xs text-[var(--text-tertiary)]">
          p. {page.pageNumber}
        </div>
      )}
    </div>
  );
}
