'use client';

import { useCallback, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Loader2, Save, ArrowDown, ArrowUp } from 'lucide-react';
import { AdvancedRichTextEditor } from '../AdvancedRichTextEditor';
import { premiumPrimaryMintButton, premiumSecondaryLightButton } from '@/components/ui/button-styles';
import { useChapterEditor } from './useChapterEditor';
import { useEditorPreferences } from '@/hooks/use-editor-preferences';
import type { DocumentChapter } from '@/lib/projects/types';

interface ChapterEditorFullscreenProps {
  chapters: DocumentChapter[];
  initialChapterIndex: number;
  projectId: string;
  onClose: () => void;
  onSave?: () => void;
  defaultDevice?: 'mobile' | 'tablet' | 'desktop';
  defaultFontSize?: string;
  defaultMargins?: { top: number; bottom: number; left: number; right: number };
}

export function ChapterEditorFullscreen({
  chapters,
  initialChapterIndex,
  projectId,
  onClose,
  onSave,
  defaultDevice = 'desktop',
  defaultFontSize = '16px',
  defaultMargins = { top: 24, bottom: 24, left: 24, right: 24 },
}: ChapterEditorFullscreenProps) {
  const { preferences, isLoaded } = useEditorPreferences();

  // Use saved preferences if available, otherwise use passed defaults
  const device = (preferences.device as 'mobile' | 'tablet' | 'desktop') || defaultDevice;
  const fontSize = preferences.fontSize || defaultFontSize;
  const margins = preferences.margins || defaultMargins;

  const editor = useChapterEditor({
    chapters,
    initialChapterIndex,
    projectId,
    device,
    fontSize,
    margins,
  });

  // Handle close with unsaved changes check
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

      // Page navigation with Alt + arrows or Page Up/Down
      if ((e.altKey) && e.key === 'ArrowUp') {
        e.preventDefault();
        editor.goToPagePrev();
      }

      if ((e.altKey) && e.key === 'ArrowDown') {
        e.preventDefault();
        editor.goToPageNext();
      }

      if (e.key === 'PageUp') {
        e.preventDefault();
        editor.goToPagePrev();
      }

      if (e.key === 'PageDown') {
        e.preventDefault();
        editor.goToPageNext();
      }
    };

    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [editor, handleClose]);

  if (!editor.currentChapter) return null;

  return (
    <div
      className="flex flex-col h-screen w-full bg-[#111C28] rounded-none overflow-hidden"
      onClick={(e) => e.stopPropagation()}
    >
      {/* ═══════════════════════ HEADER ═══════════════════════ */}
      <header className="shrink-0 flex items-center justify-between border-b border-[var(--border-subtle)] px-4 py-3 gap-3">
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-black tracking-tight text-[var(--text-primary)]">
            Capítulo {editor.currentIndex + 1}/{editor.totalChapters}
          </h2>
        </div>

        {/* Chapter Navigation */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={editor.goToPrevChapter}
            disabled={!editor.canNavigatePrev || editor.isSaving}
            className={`${premiumSecondaryLightButton} p-1.5 disabled:opacity-50`}
            title="Capítulo anterior (Ctrl+←)"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <button
            onClick={editor.goToNextChapter}
            disabled={!editor.canNavigateNext || editor.isSaving}
            className={`${premiumSecondaryLightButton} p-1.5 disabled:opacity-50`}
            title="Siguiente capítulo (Ctrl+→)"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Page Navigation - only show if more than 2 pages */}
        {editor.totalPages > 2 && (
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={editor.goToPagePrev}
              disabled={!editor.canNavigatePagePrev || editor.isSaving}
              className={`${premiumSecondaryLightButton} p-1.5 disabled:opacity-50`}
              title="Página anterior (Alt+↑ o Page Up)"
            >
              <ArrowUp className="h-4 w-4" />
            </button>

            <span className="text-xs text-[var(--text-secondary)] px-2">
              P.{editor.currentPage + 1}
            </span>

            <button
              onClick={editor.goToPageNext}
              disabled={!editor.canNavigatePageNext || editor.isSaving}
              className={`${premiumSecondaryLightButton} p-1.5 disabled:opacity-50`}
              title="Siguiente página (Alt+↓ o Page Down)"
            >
              <ArrowDown className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Status and Close button */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {editor.lastSaved && (
            <span className="text-xs text-[var(--accent-mint)] opacity-70 px-2">
              ✓ Guardado
            </span>
          )}
          <button
            onClick={handleClose}
            disabled={editor.isSaving}
            className={`${premiumSecondaryLightButton} p-1.5 flex-shrink-0`}
            title="Cerrar editor (Esc)"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* ═══════════════════════ CONTENT AREA ═══════════════════════ */}
      <div className="flex-1 overflow-hidden flex flex-col gap-1 p-3">
        {/* Error message */}
        {editor.error && (
          <div className="rounded-[8px] border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400 flex-shrink-0">
            {editor.error}
          </div>
        )}

        {/* Content Editor - Fills available space - includes chapter title as first line */}
        <div className="flex-1 min-h-0 rounded-[8px] border border-[var(--border-subtle)] bg-[var(--surface-soft)] overflow-hidden">
          <AdvancedRichTextEditor
            defaultContent={editor.htmlContent}
            onUpdate={editor.setHtmlContent}
            currentPage={editor.currentPage}
          />
        </div>
      </div>

      {/* ═══════════════════════ FOOTER ═══════════════════════ */}
      <footer className="shrink-0 flex items-center gap-2 border-t border-[var(--border-subtle)] bg-[#111C28] px-3 py-2">
        <button
          onClick={handleClose}
          disabled={editor.isSaving}
          className={`flex-1 min-w-[100px] h-9 ${premiumSecondaryLightButton}`}
        >
          Cancelar
        </button>

        <button
          onClick={handleSave}
          disabled={editor.isSaving || (!editor.hasChanges && editor.lastSaved !== null)}
          className={`flex-1 min-w-[100px] h-9 flex items-center justify-center gap-1.5 ${premiumPrimaryMintButton}`}
        >
          {editor.isSaving ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              <span className="text-sm">Guardando...</span>
            </>
          ) : (
            <>
              <Save className="h-3 w-3" />
              <span className="text-sm">Guardar</span>
            </>
          )}
        </button>
      </footer>
    </div>
  );
}
