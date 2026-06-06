'use client';

import { ChevronDown, ChevronUp, Trash2, Edit2, Plus, Download, Hash, Loader2, Check } from 'lucide-react';
import { deleteChapterAction, moveChapterAction } from '@/lib/projects/actions';
import { calculateWordCount } from '@/lib/projects/document-stats';
import { formatChapterPageMetrics, type ChapterPageMetrics } from '@/lib/preview/metrics';
import type { DocumentChapter } from '@/lib/projects/types';

export function ChapterOrganizer({
  projectId,
  chapters,
  activeChapterId,
  onSelect,
  onEditChapter,
  onAddChapter,
  onImportChapter,
  onSyncPageNumbers,
  pageNumberSyncState = 'idle',
  pageNumberIsStale = false,
  syncPageNumbersLabel = 'Actualizar numeración',
  syncPageNumbersTitle = 'Recalcular la numeración del preview y la exportación',
  syncPageNumbersHelper = 'Sincroniza el índice y los pies de página con la maquetación actual.',
  metricsById = {},
}: {
  projectId: string;
  chapters: DocumentChapter[];
  activeChapterId: string;
  onSelect: (chapterId: string) => void;
  onEditChapter: (chapterId: string) => void;
  onAddChapter: () => void;
  onImportChapter: () => void;
  onSyncPageNumbers: () => void;
  pageNumberSyncState?: 'idle' | 'syncing' | 'synced';
  pageNumberIsStale?: boolean;
  syncPageNumbersLabel?: string;
  syncPageNumbersTitle?: string;
  syncPageNumbersHelper?: string;
  metricsById?: Record<string, ChapterPageMetrics>;
}) {
  return (
    <nav
      aria-label="Capítulos"
      data-testid="chapter-organizer"
      className="ac-chapter-rail"
    >
      <div className="ac-chapter-rail__header">
        <div className="ac-chapter-rail__titles">
          <p className="ac-chapter-rail__title">
            Capítulos ({chapters.length})
          </p>
          <p className="ac-chapter-rail__summary">
            {syncPageNumbersHelper}
          </p>
        </div>
        <div className="ac-chapter-rail__toolbar">
          <div className="relative">
            <button
              onClick={onSyncPageNumbers}
              className="ac-button ac-button--secondary ac-button--sm"
              title={syncPageNumbersTitle}
              data-testid="sync-page-numbers-button"
              data-sync-state={pageNumberSyncState}
              data-stale={pageNumberIsStale ? 'true' : 'false'}
            >
              {pageNumberSyncState === 'syncing' ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : pageNumberSyncState === 'synced' ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <Hash className="h-3.5 w-3.5" />
              )}
              <span>{syncPageNumbersLabel}</span>
            </button>
            {pageNumberIsStale && pageNumberSyncState === 'idle' && (
              <span
                className="pointer-events-none absolute -right-1 -top-1 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-amber-400"
                aria-label="Numeración desactualizada"
                data-testid="sync-stale-badge"
              />
            )}
          </div>
          <button
            onClick={onAddChapter}
            className="ac-button ac-button--ghost ac-button--sm"
            title="Agregar nuevo capítulo"
            data-testid="add-chapter-button"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onImportChapter}
            className="ac-button ac-button--ghost ac-button--sm"
            title="Importar capítulo"
            data-testid="import-chapter-button"
          >
            <Download className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      
      {chapters.map((chapter, index) => {
        const isActive = chapter.id === activeChapterId;
        const wordCount = chapter.blocks.reduce((total, block) => total + calculateWordCount(block.content), 0);

        return (
          <div
            key={chapter.id}
            className="ac-chapter-rail__item"
            data-active={isActive ? 'true' : 'false'}
          >
            <div className="ac-chapter-rail__item-shell">
              <button
                type="button"
                data-testid={`chapter-organizer-button-${index + 1}`}
                onClick={() => onSelect(chapter.id)}
                aria-current={isActive ? 'page' : undefined}
                className="ac-chapter-rail__trigger min-w-0 flex-1 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-mint)]"
              >
                <span className="ac-chapter-rail__index mt-0.5">
                  {index + 1}
                </span>
                <div className="ac-chapter-rail__body">
                  <div className="ac-chapter-rail__chapter-title line-clamp-2">
                    {chapter.title}
                  </div>
                  <div className="ac-chapter-rail__meta">
                    {wordCount} palabras
                  </div>
                  {metricsById[chapter.id] && (
                    <div className="ac-chapter-rail__metrics">
                      {formatChapterPageMetrics(metricsById[chapter.id])}
                    </div>
                  )}
                </div>
              </button>

              <div className="ac-chapter-rail__actions">
                <button
                  type="button"
                  onClick={() => onEditChapter(chapter.id)}
                  className="ac-button ac-button--ghost ac-button--sm"
                  title="Editar capítulo"
                  data-testid={`chapter-edit-button-${index + 1}`}
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </button>
                <form action={moveChapterAction}>
                  <input type="hidden" name="projectId" value={projectId} />
                  <input type="hidden" name="chapterId" value={chapter.id} />
                  <input type="hidden" name="direction" value="up" />
                  <button
                    type="submit"
                    data-testid={`chapter-move-up-button-${index + 1}`}
                    disabled={index === 0}
                    className="ac-button ac-button--ghost ac-button--sm disabled:opacity-30"
                  >
                    <ChevronUp className="h-3.5 w-3.5" />
                  </button>
                </form>
                <form action={moveChapterAction}>
                  <input type="hidden" name="projectId" value={projectId} />
                  <input type="hidden" name="chapterId" value={chapter.id} />
                  <input type="hidden" name="direction" value="down" />
                  <button
                    type="submit"
                    data-testid={`chapter-move-down-button-${index + 1}`}
                    disabled={index === chapters.length - 1}
                    className="ac-button ac-button--ghost ac-button--sm disabled:opacity-30"
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                </form>
                <form action={deleteChapterAction}>
                  <input type="hidden" name="projectId" value={projectId} />
                  <input type="hidden" name="chapterId" value={chapter.id} />
                  <button
                    type="submit"
                    data-testid={`chapter-delete-button-${index + 1}`}
                    disabled={chapters.length <= 1}
                    className="ac-button ac-button--destructive ac-button--sm disabled:opacity-30"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </form>
              </div>
            </div>
          </div>
        );
      })}
    </nav>
  );
}
