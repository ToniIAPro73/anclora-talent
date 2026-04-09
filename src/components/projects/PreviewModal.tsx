'use client';

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
  
  const [currentPage, setCurrentPage] = useState(0);
  const [viewMode, setViewMode] = useState<'single' | 'spread'>('spread');
  const [format, setFormat] = useState<PreviewFormat>(preferredFormat || 'laptop');
  const [zoom, setZoom] = useState(100);
  const [hasManualZoom, setHasManualZoom] = useState(false);
  const [showTableOfContents, setShowTableOfContents] = useState(true);
  const [isDesktopViewport, setIsDesktopViewport] = useState(true);
  
  // MEASUREMENT STATE
  const [chapterPageCounts, setChapterPageCounts] = useState<Record<string, number>>({});
  const measurerRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setIsDesktopViewport(window.matchMedia('(min-width: 768px)').matches);
  }, []);

  const paginationConfig = useMemo(
    () => buildPaginationConfig(format, {
      fontSize: preferences.fontSize,
      margins: preferences.margins,
    }),
    [format, preferences.fontSize, preferences.margins],
  );

  // We get one "page" per chapter/cover from the builder
  const rawChapters = useMemo(() => buildPreviewPages(project, paginationConfig), [paginationConfig, project]);

  // EFFECT: Measure actual pages for each chapter using browser's CSS columns
  useEffect(() => {
    if (!measurerRef.current) return;
    
    const pageGap = 32;
    const contentWidth = paginationConfig.pageWidth - paginationConfig.marginLeft - paginationConfig.marginRight;
    const columnGap = pageGap + paginationConfig.marginLeft + paginationConfig.marginRight;
    const pageWidthWithGap = contentWidth + columnGap;

    const counts: Record<string, number> = {};
    const flows = measurerRef.current.querySelectorAll('[data-measurement-chapter-id]');
    
    flows.forEach((flow) => {
      const id = flow.getAttribute('data-measurement-chapter-id');
      if (id) {
        const measuredWidth = flow.scrollWidth;
        const pages = Math.max(1, Math.ceil((measuredWidth + 1) / pageWidthWithGap));
        counts[id] = pages;
      }
    });

    setChapterPageCounts(counts);
  }, [rawChapters, paginationConfig]);

  // EXPAND: Transform raw chapters into discrete virtual pages based on measurements
  const pages = useMemo(() => {
    const result: Array<PreviewPage & { subPageIndex?: number }> = [];
    
    rawChapters.forEach((chapter) => {
      if (chapter.type !== 'content' || !chapter.chapterId) {
        result.push(chapter);
        return;
      }

      const count = chapterPageCounts[chapter.chapterId] || 1;
      for (let i = 0; i < count; i++) {
        result.push({
          ...chapter,
          subPageIndex: i,
          pageNumber: result.length + 1,
        });
      }
    });

    return result;
  }, [rawChapters, chapterPageCounts]);

  const totalPages = pages.length;

  const goToPage = useCallback((page: number) => {
    setCurrentPage(Math.max(0, Math.min(page, totalPages - 1)));
  }, [totalPages]);

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

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') { prevPage(); }
    else if (e.key === 'ArrowRight') { nextPage(); }
  }, [prevPage, nextPage]);

  const visiblePages = useMemo(() => {
    if (viewMode === 'single') return pages[currentPage] ? [pages[currentPage]] : [];
    if (currentPage === 0) return [pages[0]].filter(Boolean);
    return [pages[currentPage], pages[currentPage + 1]].filter(Boolean);
  }, [pages, currentPage, viewMode]);

  const pagePreset = FORMAT_PRESETS[format];
  const spreadWidth = viewMode === 'spread' 
    ? pagePreset.viewportWidth * visiblePages.length + 24 * Math.max(visiblePages.length - 1, 0)
    : pagePreset.viewportWidth;
  const spreadHeight = pagePreset.pagePixelHeight;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(4,6,12,0.78)] backdrop-blur-md" onKeyDown={handleKeyDown} tabIndex={0}>
      <div className="mx-auto flex h-[100dvh] w-full max-w-[1800px] flex-col overflow-hidden bg-[#111c28] md:h-[calc(100dvh-32px)] md:rounded-[28px] border border-white/10">
        
        <header className="shrink-0 border-b border-white/10 px-6 py-4 flex justify-between items-center">
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            <Eye className="w-4 h-4" /> {project.document.title || 'Vista Previa'}
          </h2>
          <button onClick={onClose} className={`${premiumSecondaryLightButton} p-2`}><X className="w-5 h-5" /></button>
        </header>

        {/* CONTROLS */}
        <div className="shrink-0 border-b border-white/10 px-6 py-3 flex gap-4 items-center flex-wrap">
          <div className="flex gap-1 bg-white/5 p-1 rounded-lg">
            <button onClick={() => setViewMode('single')} className={`${viewMode === 'single' ? premiumPrimaryDarkButton : premiumSecondaryLightButton} px-3 py-1.5`}><Eye className="w-4 h-4" /></button>
            <button onClick={() => setViewMode('spread')} className={`${viewMode === 'spread' ? premiumPrimaryDarkButton : premiumSecondaryLightButton} px-3 py-1.5`}><BookOpen className="w-4 h-4" /></button>
          </div>
          <div className="flex gap-1 bg-white/5 p-1 rounded-lg">
            {(['mobile', 'tablet', 'laptop'] as const).map(f => (
              <button key={f} onClick={() => setFormat(f)} className={`${format === f ? premiumPrimaryDarkButton : premiumSecondaryLightButton} px-3 py-1.5`}>
                {f === 'mobile' ? <Smartphone className="w-4 h-4" /> : f === 'tablet' ? <Tablet className="w-4 h-4" /> : <Monitor className="w-4 h-4" />}
              </button>
            ))}
          </div>
        </div>

        <main className="relative flex-1 overflow-hidden flex">
          {/* MEASUREMENT LAYER (Hidden) */}
          <div ref={measurerRef} className="pointer-events-none absolute inset-0 -z-50 opacity-0 overflow-hidden" aria-hidden="true">
            {rawChapters.map((chapter) => chapter.type === 'content' && (
              <div 
                key={chapter.chapterId} 
                data-measurement-chapter-id={chapter.chapterId}
                style={{
                  columnWidth: `${paginationConfig.pageWidth - paginationConfig.marginLeft - paginationConfig.marginRight}px`,
                  columnGap: `${32 + paginationConfig.marginLeft + paginationConfig.marginRight}px`,
                  height: `${paginationConfig.pageHeight - paginationConfig.marginTop - paginationConfig.marginBottom}px`,
                }}
              >
                <div dangerouslySetInnerHTML={{ __html: chapter.content || '' }} />
              </div>
            ))}
          </div>

          {/* MAIN STAGE */}
          <section className="flex-1 flex flex-col p-4">
            <div className="flex-1 relative flex items-center justify-center overflow-auto">
              <div style={{ width: `${spreadWidth * (zoom/100)}px`, height: `${spreadHeight * (zoom/100)}px` }} className="relative flex gap-6 transition-all duration-300">
                <div className="flex gap-[24px]" style={{ transform: `scale(${zoom/100})`, transformOrigin: 'top left' }}>
                  {visiblePages.map((p, i) => (
                    <PageRenderer key={`${p.pageNumber}-${i}`} page={p} format={format} copy={copy} config={paginationConfig} subPageIndex={p.subPageIndex} />
                  ))}
                </div>
              </div>
            </div>

            {/* FOOTER PAGINATION */}
            <footer className="mt-4 flex justify-between items-center bg-black/20 p-4 rounded-xl border border-white/5">
              <button onClick={prevPage} disabled={currentPage === 0} className={`${premiumSecondaryLightButton} px-4 py-2 disabled:opacity-30`}><ChevronLeft /></button>
              <span className="text-white text-sm font-medium">Página {currentPage + 1} de {totalPages}</span>
              <button onClick={nextPage} disabled={currentPage >= totalPages - 1} className={`${premiumSecondaryLightButton} px-4 py-2 disabled:opacity-30`}><ChevronRight /></button>
            </footer>
          </section>
        </main>
      </div>
    </div>
  );
}

function PageRenderer({ page, format, copy, config, subPageIndex = 0 }: { page: PreviewPage & { subPageIndex?: number }, format: PreviewFormat, copy: any, config: any, subPageIndex?: number }) {
  const preset = FORMAT_PRESETS[format];
  const pageGap = 32;
  const contentWidth = config.pageWidth - config.marginLeft - config.marginRight;
  const contentHeight = config.pageHeight - config.marginTop - config.marginBottom;
  const columnGap = pageGap + config.marginLeft + config.marginRight;

  const pageStyle = {
    width: `${preset.viewportWidth}px`,
    height: `${preset.pagePixelHeight}px`,
    padding: `${config.marginTop}px ${config.marginRight}px ${config.marginBottom}px ${config.marginLeft}px`,
  };

  if (page.type === 'cover' && page.coverData) {
    return (
      <div style={pageStyle} className="bg-slate-800 rounded-lg overflow-hidden flex items-center justify-center text-white p-12 text-center border border-white/10 shadow-2xl">
        <div>
          <h1 className="text-4xl font-bold mb-4">{page.coverData.title}</h1>
          <p className="text-xl opacity-80">{page.coverData.author}</p>
        </div>
      </div>
    );
  }

  if (page.type === 'back-cover') {
    return <div style={pageStyle} className="bg-slate-900 rounded-lg border border-white/10 shadow-2xl" />;
  }

  const flowOffset = subPageIndex * (contentWidth + columnGap);

  return (
    <div style={pageStyle} className="bg-white rounded-lg shadow-2xl overflow-hidden relative">
      <style>{`
        .flow-track {
          width: 10000px;
          transform: translateX(-${flowOffset}px);
          transition: transform 0.2s ease-out;
        }
        .content-flow {
          column-width: ${contentWidth}px;
          column-gap: ${columnGap}px;
          column-fill: auto;
          height: ${contentHeight}px;
        }
        .content-flow p { margin-bottom: 1em; line-height: ${config.lineHeight}; font-size: ${config.fontSize}px; }
        .content-flow h1, .content-flow h2 { margin-top: 1.5em; margin-bottom: 0.5em; break-after: avoid; }
        .content-flow ul { padding-left: 1.5rem; margin-bottom: 1em; }
        .content-flow li { margin-bottom: 0.5em; }
      `}</style>
      <div className="flow-track">
        <div className="content-flow">
          <div dangerouslySetInnerHTML={{ __html: page.content || '' }} />
        </div>
      </div>
    </div>
  );
}
