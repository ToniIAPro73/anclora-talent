'use client';

import { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, Trash2, Edit2, Plus, Download } from 'lucide-react';
import { deleteChapterAction, moveChapterAction } from '@/lib/projects/actions';
import { ChapterEditorModal } from './ChapterEditorModal';
import { AddChapterDialog } from './AddChapterDialog';
import { ImportChapterDialog } from './ImportChapterDialog';
import { calculateWordCount } from '@/lib/projects/document-stats';
import type { DocumentChapter } from '@/lib/projects/types';

export function ChapterOrganizer({
  projectId,
  chapters,
  activeChapterId,
  onSelect,
}: {
  projectId: string;
  chapters: DocumentChapter[];
  activeChapterId: string;
  onSelect: (chapterId: string) => void;
}) {
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);

  const editingChapterIndex = useMemo(
    () => chapters.findIndex((ch) => ch.id === editingChapterId),
    [chapters, editingChapterId],
  );

  const editingChapter = editingChapterId ? chapters.find((ch) => ch.id === editingChapterId) : null;

  return (
    <>
      <nav
        aria-label="Capítulos"
        data-testid="chapter-organizer"
        className="flex flex-col gap-1 rounded-[28px] border border-[var(--border-subtle)] bg-[var(--page-surface)] p-4 shadow-[var(--shadow-strong)]"
      >
        {/* Header with action buttons */}
        <div className="mb-4 flex items-center justify-between px-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--text-tertiary)]">
            Capítulos ({chapters.length})
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setIsAddDialogOpen(true)}
              className="inline-flex items-center gap-1 rounded-[8px] bg-[var(--surface-soft)] p-1.5 text-[var(--text-secondary)] transition hover:bg-[var(--surface-highlight)] hover:text-[var(--text-primary)]"
              title="Agregar nuevo capítulo"
              data-testid="add-chapter-button"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setIsImportDialogOpen(true)}
              className="inline-flex items-center gap-1 rounded-[8px] bg-[var(--surface-soft)] p-1.5 text-[var(--text-secondary)] transition hover:bg-[var(--surface-highlight)] hover:text-[var(--text-primary)]"
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
              className={`rounded-[18px] transition ${
                isActive
                  ? 'bg-[var(--button-highlight-bg)] text-[var(--button-highlight-fg)]'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--surface-soft)] hover:text-[var(--text-primary)]'
              }`}
            >
              <div className="flex items-start gap-2 px-2 py-2">
                <button
                  type="button"
                  data-testid={`chapter-organizer-button-${index + 1}`}
                  onClick={() => onSelect(chapter.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className="flex min-w-0 flex-1 items-start gap-3 rounded-[14px] px-1 py-1 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-mint)]"
                >
                  <span
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-black ${
                      isActive
                        ? 'bg-white/20 text-inherit'
                        : 'bg-[var(--surface-highlight)] text-[var(--text-tertiary)]'
                    }`}
                  >
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="line-clamp-2 text-xs font-semibold leading-5">
                      {chapter.title}
                    </div>
                    <div className="text-[10px] opacity-75">
                      {wordCount} palabras
                    </div>
                  </div>
                </button>

                <div className="flex shrink-0 gap-1 pt-1">
                  <button
                    type="button"
                    onClick={() => setEditingChapterId(chapter.id)}
                    className="rounded-[10px] border border-[var(--border-subtle)] p-1.5 transition hover:bg-[var(--surface-highlight)]"
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
                      className="rounded-[10px] border border-[var(--border-subtle)] p-1.5 disabled:opacity-30"
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
                      className="rounded-[10px] border border-[var(--border-subtle)] p-1.5 disabled:opacity-30"
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
                      className="rounded-[10px] border border-[var(--border-subtle)] p-1.5 text-red-300 disabled:opacity-30"
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

      {/* Chapter Editor Modal */}
      {editingChapter && editingChapterIndex >= 0 && (
        <ChapterEditorModal
          chapter={editingChapter}
          chapterIndex={editingChapterIndex}
          totalChapters={chapters.length}
          isOpen={editingChapterId !== null}
          projectId={projectId}
          onClose={() => setEditingChapterId(null)}
        />
      )}

      {/* Add Chapter Dialog */}
      <AddChapterDialog
        isOpen={isAddDialogOpen}
        projectId={projectId}
        chapters={chapters}
        onClose={() => setIsAddDialogOpen(false)}
      />

      {/* Import Chapter Dialog */}
      <ImportChapterDialog
        isOpen={isImportDialogOpen}
        projectId={projectId}
        chapters={chapters}
        onClose={() => setIsImportDialogOpen(false)}
      />
    </>
  );
}
