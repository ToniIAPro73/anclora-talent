'use client';

/**
 * Preview Modal - Anclora Talent Premium Edition
 * Complete book preview with paginated view, device selector, and view modes
 *
 * Respects:
 * - ANCLORA_PREMIUM_APP_CONTRACT.md (editorial framing, premium motion)
 * - MODAL_CONTRACT.md (clear layout, visible actions)
 * - UI_MOTION_CONTRACT.md (smooth elevations, no bounce)
 * - LOCALIZATION_CONTRACT.md (full i18n coverage)
 */

import { useMemo, useState, useCallback } from 'react';
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
import { paginateContent } from '@/lib/preview/content-paginator';
import {
  DEVICE_PAGINATION_CONFIGS,
  FORMAT_PRESETS,
  type PreviewFormat,
} from '@/lib/preview/device-configs';
import { premiumPrimaryDarkButton, premiumSecondaryLightButton } from '@/components/ui/button-styles';
import { Slider } from '@/components/ui/slider';

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
  const [zoom, setZoom] = useState(75);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Generate pages based on selected format
  const pages = useMemo(() => {
    const config = DEVICE_PAGINATION_CONFIGS[format];
    const initialPages = buildPreviewPages(project, config);

    // Expand content pages into multiple paginated pages
    const expandedPages: PreviewPage[] = [];

    for (const page of initialPages) {
      if (page.type === 'content' && page.content) {
        // Paginate content page into multiple pages
        const contentPages = paginateContent(page.content, config);
        expandedPages.push(
          ...contentPages.map((cp, idx) => ({
            type: 'content' as const,
            content: cp.html,
            chapterTitle: cp.chapterTitle,
            pageNumber: expandedPages.length + idx,
          })),
        );
      } else {
        // Keep cover, TOC and back-cover pages as-is
        expandedPages.push({
          ...page,
          pageNumber: expandedPages.length,
        });
      }
    }

    return expandedPages;
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
        prevPage();
      } else if (e.key === 'ArrowRight') {
        nextPage();
      } else if (e.key === 'Home') {
        goToPage(0);
      } else if (e.key === 'End') {
        goToPage(totalPages - 1);
      } else if (e.key === 'Escape') {
        onClose();
      }
    },
    [prevPage, nextPage, goToPage, totalPages, onClose],
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

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-[var(--background)] overflow-hidden"
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* ═══════════════════════ HEADER ═══════════════════════ */}
      <header className="shrink-0 flex items-center justify-between border-b border-[var(--border-subtle)] px-6 py-4 bg-[var(--page-surface)]">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={`${premiumSecondaryLightButton} p-3 text-xs`}
            title="Toggle índice"
          >
            <List className="h-4 w-4" />
          </button>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--text-tertiary)]">
              {copy.previewEyebrow}
            </p>
            <h2 className="text-lg font-black flex items-center gap-2 text-[var(--text-primary)]">
              <Eye className="w-4 h-4" />
              {project.document.title || 'Proyecto sin título'}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className={`${premiumSecondaryLightButton} p-3 text-xs`}
            title="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* ═══════════════════════ TOOLBAR ═══════════════════════ */}
      <div className="shrink-0 flex items-center justify-between border-b border-[var(--border-subtle)] px-6 py-3 bg-[var(--page-surface-muted)]">
        {/* Zoom controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setZoom(Math.max(50, zoom - 10))}
            disabled={zoom <= 50}
            className={`${premiumSecondaryLightButton} p-2 text-xs disabled:opacity-50`}
            title="Reducir zoom"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <Slider
            value={[zoom]}
            onValueChange={([v]) => setZoom(v)}
            min={50}
            max={150}
            step={5}
            className="w-28"
          />
          <button
            onClick={() => setZoom(Math.min(150, zoom + 10))}
            disabled={zoom >= 150}
            className={`${premiumSecondaryLightButton} p-2 text-xs disabled:opacity-50`}
            title="Aumentar zoom"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <span className="text-xs text-[var(--text-tertiary)] w-10 text-center">
            {zoom}%
          </span>
        </div>

        {/* Separator */}
        <div className="h-6 border-l border-[var(--border-subtle)]" />

        {/* View mode toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('single')}
            className={`${
              viewMode === 'single'
                ? premiumPrimaryDarkButton
                : premiumSecondaryLightButton
            } p-2 text-xs`}
            title="Vista de 1 página"
          >
            <Eye className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode('spread')}
            className={`${
              viewMode === 'spread'
                ? premiumPrimaryDarkButton
                : premiumSecondaryLightButton
            } p-2 text-xs`}
            title="Vista de 2 páginas"
          >
            <BookOpen className="h-4 w-4" />
          </button>
        </div>

        {/* Separator */}
        <div className="h-6 border-l border-[var(--border-subtle)]" />

        {/* Device selector */}
        <div className="flex items-center gap-2">
          {(
            [
              { format: 'laptop' as const, icon: Monitor },
              { format: 'tablet' as const, icon: Tablet },
              { format: 'mobile' as const, icon: Smartphone },
            ] as const
          ).map(({ format: fmt, icon: Icon }) => (
            <button
              key={fmt}
              onClick={() => setFormat(fmt)}
              className={`${
                format === fmt
                  ? premiumPrimaryDarkButton
                  : premiumSecondaryLightButton
              } p-2 text-xs`}
              title={FORMAT_PRESETS[fmt].label}
            >
              <Icon className="h-4 w-4" />
            </button>
          ))}
        </div>
      </div>

      {/* ═══════════════════════ MAIN CONTENT ═══════════════════════ */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Preview area */}
        <main className="flex-1 flex items-center justify-center bg-[var(--page-surface-muted)] p-4 overflow-auto">
          <div
            className="flex transition-all duration-300"
            style={{
              gap: viewMode === 'spread' ? '1rem' : '0',
              transform: `scale(${zoom / 100})`,
              transformOrigin: 'center center',
            }}
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
              <div className="flex items-center justify-center text-[var(--text-tertiary)]">
                <p>No hay contenido para mostrar</p>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* ═══════════════════════ PAGINATION BAR ═══════════════════════ */}
      <footer className="shrink-0 flex items-center justify-center gap-6 border-t border-[var(--border-subtle)] px-6 py-4 bg-[var(--page-surface)]">
        <button
          onClick={prevPage}
          disabled={currentPage === 0}
          className={`${premiumSecondaryLightButton} px-4 py-2 text-xs disabled:opacity-50`}
        >
          <ChevronLeft className="h-4 w-4 mr-1 inline" />
          Anterior
        </button>

        <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
          <span>Página</span>
          <input
            type="number"
            min={1}
            max={totalPages}
            value={currentPage + 1}
            onChange={(e) => goToPage(Number(e.target.value) - 1)}
            className="w-16 text-center border border-[var(--border-subtle)] rounded-full px-2 py-1 bg-[var(--surface-soft)] text-[var(--text-primary)]"
          />
          <span>de {totalPages}</span>
        </div>

        <button
          onClick={nextPage}
          disabled={currentPage >= totalPages - 1}
          className={`${premiumSecondaryLightButton} px-4 py-2 text-xs disabled:opacity-50`}
        >
          Siguiente
          <ChevronRight className="h-4 w-4 ml-1 inline" />
        </button>
      </footer>
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
          p. {page.pageNumber + 1}
        </div>
      )}
    </div>
  );
}
