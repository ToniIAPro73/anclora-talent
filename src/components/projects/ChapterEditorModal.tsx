'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { AdvancedRichTextEditor } from './AdvancedRichTextEditor';
import { saveChapterContentAction } from '@/lib/projects/actions';
import { premiumPrimaryDarkButton, premiumSecondaryLightButton } from '@/components/ui/button-styles';
import type { DocumentChapter } from '@/lib/projects/types';

interface ChapterEditorModalProps {
  chapter: DocumentChapter;
  chapterIndex: number;
  totalChapters: number;
  isOpen: boolean;
  projectId: string;
  onClose: () => void;
  onSave?: () => void;
}

export function ChapterEditorModal({
  chapter,
  chapterIndex,
  totalChapters,
  isOpen,
  projectId,
  onClose,
  onSave,
}: ChapterEditorModalProps) {
  const [title, setTitle] = useState(chapter.title);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const editorContentRef = useRef<string>('');

  // Convert blocks to HTML
  const blocksToHtml = useCallback((blocks: DocumentChapter['blocks']): string => {
    return blocks
      .filter((block) => block.content.trim())
      .map((block) => {
        if (block.content.trimStart().startsWith('<')) {
          return block.content;
        }

        const escaped = block.content
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
        if (block.type === 'heading') return `<h2>${escaped}</h2>`;
        if (block.type === 'quote') return `<blockquote><p>${escaped}</p></blockquote>`;
        return `<p>${escaped}</p>`;
      })
      .join('');
  }, []);

  const initialContent = blocksToHtml(chapter.blocks);

  const handleEditorUpdate = useCallback((html: string) => {
    editorContentRef.current = html;
    setHasChanges(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!editorContentRef.current && initialContent === '') return;

    setIsSaving(true);
    try {
      const formData = new FormData();
      formData.set('projectId', projectId);
      formData.set('chapterId', chapter.id);
      formData.set('chapterTitle', title);
      formData.set('htmlContent', editorContentRef.current || initialContent);

      await saveChapterContentAction(formData);
      setHasChanges(false);
      onSave?.();
      onClose();
    } catch (error) {
      console.error('Failed to save chapter:', error);
    } finally {
      setIsSaving(false);
    }
  }, [projectId, chapter.id, title, initialContent, onClose, onSave]);

  const handleClose = useCallback(() => {
    if (hasChanges) {
      if (confirm('¿Descartar cambios?')) {
        onClose();
      }
    } else {
      onClose();
    }
  }, [hasChanges, onClose]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      // Escape to close
      if (e.key === 'Escape') {
        handleClose();
      }

      // Ctrl+S or Cmd+S to save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };

    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [isOpen, handleClose, handleSave]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 sm:p-6" onClick={handleClose}>
      <div
        className="flex h-full max-h-[95vh] w-full max-w-[95vw] flex-col overflow-hidden rounded-[24px] bg-[var(--page-surface)] shadow-[var(--shadow-strong)] sm:rounded-[32px] md:max-h-[90vh] md:max-w-[90vw]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-6 py-4 md:py-6">
          <div className="flex-1">
            <h2 className="text-lg font-black text-[var(--text-primary)] md:text-2xl" data-testid="chapter-editor-title">
              Editar: {chapter.title}
            </h2>
            <p className="text-xs text-[var(--text-tertiary)]">
              Capítulo {chapterIndex + 1} de {totalChapters}
            </p>
          </div>

          <button
            onClick={handleClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-[12px] text-[var(--text-secondary)] transition hover:bg-[var(--surface-soft)] hover:text-[var(--text-primary)]"
            title="Cerrar (Esc)"
            data-testid="chapter-editor-close-button"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-hidden">
          <div className="flex h-full flex-col gap-4 overflow-y-auto px-4 py-4 md:px-6 md:py-6">
            {/* Chapter title input */}
            <div className="flex-shrink-0">
              <label className="block space-y-2">
                <span className="text-sm font-semibold text-[var(--text-primary)]">Título del capítulo</span>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    setHasChanges(true);
                  }}
                  className="w-full rounded-[18px] border border-[var(--border-subtle)] bg-[var(--surface-soft)] px-4 py-3 text-[var(--text-primary)] outline-none transition focus:border-[var(--accent-mint)]"
                  data-testid="chapter-title-input"
                />
              </label>
            </div>

            {/* Advanced Rich text editor */}
            <div className="flex-1 overflow-hidden">
              <div className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--text-tertiary)]">
                Contenido
              </div>
              <div className="mt-2 h-full overflow-hidden">
                <AdvancedRichTextEditor
                  defaultContent={initialContent}
                  onUpdate={handleEditorUpdate}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-[var(--border-subtle)] px-6 py-4 md:py-6">
          <button
            onClick={handleClose}
            disabled={isSaving}
            className={`${premiumSecondaryLightButton} disabled:opacity-50 disabled:cursor-not-allowed px-5`}
            data-testid="chapter-editor-cancel-button"
          >
            Cancelar
          </button>

          <button
            onClick={handleSave}
            disabled={isSaving || (!hasChanges && initialContent !== '')}
            className={`${premiumPrimaryDarkButton} inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed px-5`}
            data-testid="chapter-editor-save-button"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              'Guardar cambios'
            )}
          </button>
        </div>

        {/* Info text */}
        <div className="border-t border-[var(--border-subtle)] px-6 py-3 text-center text-xs text-[var(--text-tertiary)]">
          <p>
            Presiona <kbd className="rounded bg-[var(--surface-soft)] px-2 py-1 font-mono">Ctrl+S</kbd> para guardar o{' '}
            <kbd className="rounded bg-[var(--surface-soft)] px-2 py-1 font-mono">Esc</kbd> para cerrar
          </p>
        </div>
      </div>
    </div>
  );
}
