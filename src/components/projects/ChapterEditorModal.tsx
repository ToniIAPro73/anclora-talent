'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { X, Loader2, Save } from 'lucide-react';
import { AdvancedRichTextEditor } from './AdvancedRichTextEditor';
import { saveChapterContentAction } from '@/lib/projects/actions';
import { premiumPrimaryDarkButton, premiumSecondaryLightButton } from '@/components/ui/button-styles';
import { SubmitButton } from '@/components/ui/SubmitButton';
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
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const editorContentRef = useRef<string>('');
  const modalRef = useRef<HTMLDivElement>(null);

  // Convert blocks to HTML - ensures complete chapter content
  const blocksToHtml = useCallback((blocks: DocumentChapter['blocks']): string => {
    if (!blocks || blocks.length === 0) {
      return '<p>Sin contenido</p>';
    }

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
    setError(null);
  }, []);

  const handleSave = useCallback(async () => {
    if (!editorContentRef.current && initialContent === '') return;

    setIsSaving(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.set('projectId', projectId);
      formData.set('chapterId', chapter.id);
      formData.set('chapterTitle', title);
      formData.set('htmlContent', editorContentRef.current || initialContent);

      await saveChapterContentAction(formData);
      setHasChanges(false);
      setLastSaved(new Date());
      onSave?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar');
      console.error('Failed to save chapter:', err);
    } finally {
      setIsSaving(false);
    }
  }, [projectId, chapter.id, title, initialContent, onSave]);

  const handleClose = useCallback(() => {
    if (hasChanges) {
      const confirmed = confirm('Tienes cambios sin guardar. ¿Deseas salir de todas formas?');
      if (!confirmed) return;
    }
    setTitle(chapter.title);
    setHasChanges(false);
    setError(null);
    onClose();
  }, [hasChanges, chapter.title, onClose]);

  // Handle keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;

    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };

    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [isOpen, handleClose, handleSave]);

  if (!isOpen) return null;

  const isLastChapter = chapterIndex === totalChapters - 1;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 sm:p-6"
      onClick={handleClose}
    >
      {/* Modal - Contract Compliant */}
      <div
        ref={modalRef}
        className="flex w-full max-w-3xl flex-col rounded-[28px] border border-[var(--border-subtle)] bg-[var(--page-surface)] shadow-[var(--shadow-strong)] max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - MODAL_CONTRACT compliant */}
        <div className="flex items-start justify-between border-b border-[var(--border-subtle)] px-6 py-5 sm:px-8 sm:py-6 flex-shrink-0">
          <div className="flex-1">
            <h2 className="text-lg font-black tracking-tight text-[var(--text-primary)] sm:text-xl">
              Editar Capítulo
            </h2>
            <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-[var(--text-tertiary)]">
              Capítulo {chapterIndex + 1} de {totalChapters}: {chapter.title}
            </p>
          </div>

          {/* Close button - top right, always visible */}
          <button
            onClick={handleClose}
            disabled={isSaving}
            className="ml-4 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-[var(--border-subtle)] text-[var(--text-secondary)] transition hover:bg-[var(--surface-soft)] hover:text-[var(--text-primary)] disabled:opacity-50"
            title="Cerrar editor (Esc)"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Area - Dynamic height with internal scroll */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto px-6 py-5 sm:px-8 sm:py-6 space-y-4">
            {/* Chapter Title Input */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-widest text-[var(--text-tertiary)]">
                Título del Capítulo
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setHasChanges(true);
                }}
                disabled={isSaving}
                className="w-full rounded-[12px] border border-[var(--border-subtle)] bg-[var(--surface-soft)] px-4 py-3 text-sm font-semibold text-[var(--text-primary)] outline-none transition disabled:opacity-50 focus:border-[var(--accent-mint)]"
                placeholder="Título del capítulo"
              />
            </div>

            {/* Error message */}
            {error && (
              <div className="rounded-[12px] border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            {/* Content Editor - Fills available space */}
            <div className="flex-1 min-h-[400px] rounded-[12px] border border-[var(--border-subtle)] bg-[var(--surface-soft)] overflow-hidden">
              <AdvancedRichTextEditor
                defaultContent={initialContent}
                onUpdate={handleEditorUpdate}
              />
            </div>

            {/* Chapter Navigation Info */}
            <div className="text-xs text-[var(--text-tertiary)] space-y-1">
              <p>
                {chapter.blocks.length} bloques de contenido • {chapter.blocks.reduce((acc, b) => acc + (b.content?.length || 0), 0)} caracteres
              </p>
              {lastSaved && (
                <p className="text-[var(--accent-mint)] opacity-70">
                  ✓ Guardado a las {lastSaved.toLocaleTimeString()}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Footer - Always visible, MODAL_CONTRACT compliant */}
        <div className="flex items-center justify-between gap-3 border-t border-[var(--border-subtle)] bg-[var(--page-surface)] px-6 py-4 sm:px-8 flex-shrink-0">
          <button
            onClick={handleClose}
            disabled={isSaving}
            className={`${premiumSecondaryLightButton} px-5 py-2.5 text-sm`}
          >
            Cerrar
          </button>

          <div className="flex items-center gap-2">
            {!isLastChapter && (
              <span className="text-xs text-[var(--text-tertiary)]">
                Siguiente: Capítulo {chapterIndex + 2}
              </span>
            )}

            <button
              onClick={handleSave}
              disabled={isSaving || (!hasChanges && lastSaved !== null)}
              className={`${premiumPrimaryDarkButton} px-6 py-2.5 text-sm flex items-center gap-2`}
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Guardar
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
