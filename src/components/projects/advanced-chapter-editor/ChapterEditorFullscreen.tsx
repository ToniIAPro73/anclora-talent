'use client';

import { useCallback, useEffect, useState } from 'react';
import { X, ChevronLeft, ChevronRight, Loader2, Save } from 'lucide-react';
import { AdvancedRichTextEditor } from '../AdvancedRichTextEditor';
import { ChapterImageCanvas } from './ChapterImageCanvas';
import { premiumPrimaryMintButton, premiumSecondaryLightButton } from '@/components/ui/button-styles';
import { useChapterEditor, type UseChapterEditorOptions } from './useChapterEditor';
import type { DocumentChapter } from '@/lib/projects/types';

interface ChapterEditorFullscreenProps {
  chapters: DocumentChapter[];
  initialChapterIndex: number;
  projectId: string;
  onClose: () => void;
  onSave?: () => void;
}

export function ChapterEditorFullscreen({
  chapters,
  initialChapterIndex,
  projectId,
  onClose,
  onSave,
}: ChapterEditorFullscreenProps) {
  const [showImageCanvas, setShowImageCanvas] = useState(true);

  const editor = useChapterEditor({
    chapters,
    initialChapterIndex,
    projectId,
  });

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        editor.saveChapter();
      }

      // Chapter navigation with Ctrl/Cmd + arrows
      if ((e.ctrlKey || e.metaKey) && e.key === 'ArrowLeft') {
        e.preventDefault();
        editor.goToPrevChapter();
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'ArrowRight') {
        e.preventDefault();
        editor.goToNextChapter();
      }
    };

    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [editor]);

  const handleClose = useCallback(async () => {
    if (editor.hasChanges) {
      const response = confirm(
        '⚠️ Tienes cambios sin guardar.\n\n¿Deseas guardarlos antes de cerrar?'
      );

      if (response) {
        // User clicked OK - save changes
        await editor.saveChapter();
        onSave?.();
        onClose();
      } else {
        // User clicked Cancel - just close without saving
        onClose();
      }
    } else {
      // No changes, just close
      onClose();
    }
  }, [editor.hasChanges, editor, onSave, onClose]);

  const handleSave = useCallback(async () => {
    await editor.saveChapter();
    onSave?.();
  }, [editor, onSave]);

  const handleCloseOrSave = handleClose;

  if (!editor.currentChapter) return null;

  return (
    <div
      className="flex flex-col h-screen w-full bg-[#111C28] rounded-none overflow-hidden"
      onClick={(e) => e.stopPropagation()}
    >
      {/* ═══════════════════════ HEADER ═══════════════════════ */}
      <header className="shrink-0 flex items-start justify-between border-b border-[var(--border-subtle)] px-6 py-4 sm:px-8 sm:py-5 gap-4">
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-black tracking-tight text-[var(--text-primary)] sm:text-xl">
            Editar Capítulo
          </h2>
          <p className="mt-0.5 text-xs font-semibold uppercase tracking-widest text-[var(--text-tertiary)] truncate">
            Capítulo {editor.currentIndex + 1} de {editor.totalChapters}: {editor.currentChapter.title}
          </p>
        </div>

        {/* Chapter Navigation */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={editor.goToPrevChapter}
            disabled={!editor.canNavigatePrev || editor.isSaving}
            className={`${premiumSecondaryLightButton} p-2 disabled:opacity-50`}
            title="Capítulo anterior (Ctrl+←)"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <div className="text-xs text-[var(--text-tertiary)] px-2 py-1 whitespace-nowrap">
            {editor.currentIndex + 1}/{editor.totalChapters}
          </div>

          <button
            onClick={editor.goToNextChapter}
            disabled={!editor.canNavigateNext || editor.isSaving}
            className={`${premiumSecondaryLightButton} p-2 disabled:opacity-50`}
            title="Siguiente capítulo (Ctrl+→)"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Close button */}
        <button
          onClick={handleClose}
          disabled={editor.isSaving}
          className={`${premiumSecondaryLightButton} p-2 flex-shrink-0`}
          title="Cerrar editor (Esc)"
        >
          <X className="h-4 w-4" />
        </button>
      </header>

      {/* ═══════════════════════ CONTENT AREA ═══════════════════════ */}
      <div className="flex-1 overflow-hidden flex flex-col lg:flex-row gap-4 p-4 sm:p-6">
        {/* Left Panel: Text Editor */}
        <div className="flex-1 min-h-0 flex flex-col gap-3">
          {/* Chapter Title Input */}
          <div className="space-y-1.5 flex-shrink-0">
            <label className="text-xs font-semibold uppercase tracking-widest text-[var(--text-tertiary)]">
              Título del Capítulo
            </label>
            <input
              type="text"
              value={editor.title}
              onChange={(e) => editor.setTitle(e.target.value)}
              disabled={editor.isSaving}
              className="w-full rounded-[12px] border border-[var(--border-subtle)] bg-[var(--surface-soft)] px-4 py-2.5 text-sm font-semibold text-[var(--text-primary)] outline-none transition disabled:opacity-50 focus:border-[var(--accent-mint)]"
              placeholder="Título del capítulo"
            />
          </div>

          {/* Error message */}
          {editor.error && (
            <div className="rounded-[12px] border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400 flex-shrink-0">
              {editor.error}
            </div>
          )}

          {/* Content Editor - Fills available space */}
          <div className="flex-1 min-h-0 rounded-[12px] border border-[var(--border-subtle)] bg-[var(--surface-soft)] overflow-hidden">
            <AdvancedRichTextEditor
              defaultContent={editor.htmlContent}
              onUpdate={editor.setHtmlContent}
            />
          </div>

          {/* Save Status */}
          {editor.lastSaved && (
            <div className="text-xs text-[var(--accent-mint)] opacity-70 flex-shrink-0">
              ✓ Guardado a las {editor.lastSaved.toLocaleTimeString()}
            </div>
          )}
        </div>

        {/* Right Panel: Image Canvas (desktop side-by-side) */}
        {showImageCanvas && (
          <div className="w-full lg:w-[450px] min-h-[400px] lg:min-h-0 flex-shrink-0 overflow-hidden">
            <ChapterImageCanvas
              images={editor.chapterImages}
              onImageAdd={editor.addImage}
              onImageDelete={editor.deleteImage}
              onImageUpdate={editor.updateImage}
              canvasWidth={400}
              canvasHeight={550}
            />
          </div>
        )}
      </div>

      {/* ═══════════════════════ FOOTER ═══════════════════════ */}
      <footer className="shrink-0 flex items-center gap-3 border-t border-[var(--border-subtle)] bg-[#111C28] px-6 py-4 sm:px-8 flex-wrap">
        {/* Buttons - Cancelar (outline) and Guardar (filled) */}
        <button
          onClick={handleCloseOrSave}
          disabled={editor.isSaving}
          className={`flex-1 min-w-[120px] ${premiumSecondaryLightButton}`}
        >
          Cancelar
        </button>

        <button
          onClick={handleSave}
          disabled={editor.isSaving || (!editor.hasChanges && editor.lastSaved !== null)}
          className={`flex-1 min-w-[120px] flex items-center justify-center gap-1.5 ${premiumPrimaryMintButton}`}
        >
          {editor.isSaving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Guardando...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Guardar Cambios
            </>
          )}
        </button>
      </footer>
    </div>
  );
}
