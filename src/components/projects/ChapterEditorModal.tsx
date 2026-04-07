'use client';

import { useState, useRef, useEffect } from 'react';
import { X, Save, AlertCircle, Check, Loader2 } from 'lucide-react';
import { EnhancedRichTextEditor } from './EnhancedRichTextEditor';
import { saveChapterContentAction } from '@/lib/projects/actions';
import type { DocumentChapter } from '@/lib/projects/types';

interface ChapterEditorModalProps {
  isOpen: boolean;
  projectId: string;
  chapter: DocumentChapter;
  chapterIndex: number;
  totalChapters: number;
  onClose: () => void;
  onSaved?: () => void;
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

function blocksToHtml(blocks: DocumentChapter['blocks']): string {
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
}

export function ChapterEditorModal({
  isOpen,
  projectId,
  chapter,
  chapterIndex,
  totalChapters,
  onClose,
  onSaved,
}: ChapterEditorModalProps) {
  const [editorContent, setEditorContent] = useState(blocksToHtml(chapter.blocks));
  const [chapterTitle, setChapterTitle] = useState(chapter.title);
  const [hasChanges, setHasChanges] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setHasChanges(false);
      setSaveState('idle');
      setErrorMessage('');
    }
  }, [isOpen]);

  const handleContentChange = (html: string) => {
    setEditorContent(html);
    setHasChanges(true);
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setChapterTitle(e.target.value);
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaveState('saving');
    setErrorMessage('');

    try {
      const formData = new FormData();
      formData.set('projectId', projectId);
      formData.set('chapterId', chapter.id);
      formData.set('chapterTitle', chapterTitle);
      formData.set('htmlContent', editorContent);

      await saveChapterContentAction(formData);

      setSaveState('saved');
      setHasChanges(false);
      onSaved?.();

      setTimeout(() => {
        setSaveState('idle');
      }, 2000);
    } catch (err) {
      setSaveState('error');
      setErrorMessage(err instanceof Error ? err.message : 'Error al guardar');
    }
  };

  const handleClose = () => {
    if (hasChanges) {
      const confirmed = confirm(
        'Tienes cambios sin guardar. ¿Estás seguro de que quieres salir?'
      );
      if (!confirmed) return;
    }
    onClose();
  };

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        handleClose();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, hasChanges, editorContent, chapterTitle]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-6xl h-[90vh] rounded-[32px] border border-[var(--border-subtle)] bg-[var(--page-surface)] shadow-[var(--shadow-strong)] flex flex-col">

        {/* Header */}
        <div className="flex items-start justify-between border-b border-[var(--border-subtle)] px-8 py-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <h2 className="text-2xl font-black text-[var(--text-primary)]">
                Editar capítulo
              </h2>
              <span className="text-sm px-3 py-1 rounded-full bg-[var(--accent-mint)]/15 text-[var(--accent-mint)] font-semibold">
                Capítulo {chapterIndex + 1} de {totalChapters}
              </span>
            </div>
            <p className="text-sm text-[var(--text-tertiary)]">
              Edita el título y contenido del capítulo. Usa Ctrl+S para guardar rápidamente.
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-[var(--surface-highlight)] rounded-lg transition text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            title="Cerrar (Esc)"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">

          {/* Title Input */}
          <div>
            <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
              Título del capítulo
            </label>
            <input
              type="text"
              value={chapterTitle}
              onChange={handleTitleChange}
              placeholder="Ej: Introducción"
              className="w-full px-4 py-3 rounded-[18px] border border-[var(--border-subtle)] bg-[var(--surface-soft)] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none transition focus:border-[var(--accent-mint)]"
            />
          </div>

          {/* Editor */}
          <div>
            <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">
              Contenido
            </label>
            <EnhancedRichTextEditor
              defaultContent={editorContent}
              onUpdate={handleContentChange}
            />
          </div>

          {/* Error Alert */}
          {saveState === 'error' && (
            <div className="flex gap-3 rounded-lg bg-red-50 border border-red-200 p-4">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-900">Error al guardar</p>
                <p className="text-sm text-red-700">{errorMessage}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="border-t border-[var(--border-subtle)] bg-[var(--surface-soft)] px-8 py-4 flex items-center justify-between rounded-b-[32px]">
          <div className="flex items-center gap-2">
            {saveState === 'saving' && (
              <span className="flex items-center gap-1.5 text-xs text-[var(--text-tertiary)]">
                <Loader2 className="h-3 w-3 animate-spin" />
                Guardando...
              </span>
            )}
            {saveState === 'saved' && (
              <span className="flex items-center gap-1.5 text-xs text-[var(--accent-mint)]">
                <Check className="h-3 w-3" />
                Cambios guardados
              </span>
            )}
            {hasChanges && saveState === 'idle' && (
              <span className="text-xs text-[var(--text-secondary)]">
                Cambios sin guardar
              </span>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleClose}
              className="px-6 py-2 rounded-[14px] border border-[var(--border-subtle)] text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-highlight)] transition"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={!hasChanges || saveState === 'saving'}
              className="inline-flex items-center gap-2 px-6 py-2 rounded-[14px] bg-[var(--accent-mint)] text-white text-sm font-semibold hover:brightness-110 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="h-4 w-4" />
              Guardar cambios
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
