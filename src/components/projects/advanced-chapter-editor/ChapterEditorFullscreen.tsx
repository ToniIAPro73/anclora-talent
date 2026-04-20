'use client';

import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2, Save, ArrowDown, ArrowUp, ZoomIn, ZoomOut } from 'lucide-react';
import { AdvancedRichTextEditor } from '../AdvancedRichTextEditor';
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
  const { preferences } = useEditorPreferences();
  const [zoom, setZoom] = useState(100);

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
  }, [editor, onSave, onClose]);

  const handleSave = useCallback(async () => {
    await editor.saveChapter();
    onSave?.();
  }, [editor, onSave]);

  const handleZoomChange = useCallback((nextZoom: number) => {
    setZoom(Math.max(50, Math.min(150, nextZoom)));
  }, []);

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
      className="ac-editor-shell"
      onClick={(e) => e.stopPropagation()}
    >
      <header className="ac-editor-shell__header">
        <div className="ac-editor-shell__titles">
          <h2 className="ac-editor-shell__title">
            Capítulo {editor.currentIndex + 1}/{editor.totalChapters}
          </h2>
          <p className="ac-editor-shell__summary">{editor.currentChapter.title}</p>
        </div>

        <div className="ac-editor-shell__controls">
          <div className="ac-preview-control-group">
          <button
            onClick={editor.goToPrevChapter}
            disabled={!editor.canNavigatePrev || editor.isSaving}
            className="ac-button ac-button--ghost ac-button--sm disabled:opacity-50"
            title="Capítulo anterior (Ctrl+←)"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <button
            onClick={editor.goToNextChapter}
            disabled={!editor.canNavigateNext || editor.isSaving}
            className="ac-button ac-button--ghost ac-button--sm disabled:opacity-50"
            title="Siguiente capítulo (Ctrl+→)"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          </div>

          {editor.totalPages > 1 && (
            <div className="ac-preview-pagination">
              <button
                onClick={editor.goToPagePrev}
                disabled={!editor.canNavigatePagePrev || editor.isSaving}
                className="ac-button ac-button--ghost ac-button--sm disabled:opacity-50"
                title="Página anterior (Alt+↑ o Page Up)"
              >
                <ArrowUp className="h-4 w-4" />
              </button>

              <span className="ac-preview-control-value">
                P.{editor.currentPage + 1}
              </span>

              <button
                onClick={editor.goToPageNext}
                disabled={!editor.canNavigatePageNext || editor.isSaving}
                className="ac-button ac-button--ghost ac-button--sm disabled:opacity-50"
                title="Siguiente página (Alt+↓ o Page Down)"
              >
                <ArrowDown className="h-4 w-4" />
              </button>
            </div>
          )}

          <div className="ac-preview-control-group">
          <button
            type="button"
            onClick={() => handleZoomChange(zoom - 10)}
            className="ac-button ac-button--ghost ac-button--sm"
            title="Reducir zoom"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <span className="ac-preview-control-value">
            {zoom}%
          </span>
          <button
            type="button"
            onClick={() => handleZoomChange(zoom + 10)}
            className="ac-button ac-button--ghost ac-button--sm"
            title="Aumentar zoom"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          </div>
        </div>

        <div className="ac-editor-shell__actions">
          {editor.lastSaved && (
            <span className="ac-editor-shell__status">
              ✓ Guardado
            </span>
          )}
          <button
            onClick={handleClose}
            disabled={editor.isSaving}
            className="ac-button ac-button--secondary"
            title="Cerrar editor (Esc)"
          >
            CERRAR
          </button>
        </div>
      </header>

      <div className="ac-editor-shell__main">
        {editor.error && (
          <div className="rounded-[8px] border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400 flex-shrink-0">
            {editor.error}
          </div>
        )}

        <div className="ac-editor-shell__surface flex-1 overflow-auto overflow-x-hidden">
          <AdvancedRichTextEditor
            defaultContent={editor.htmlContent}
            onUpdate={editor.setHtmlContent}
            currentPage={editor.currentPage}
            totalPages={editor.totalPages}
            onPageCountChange={editor.setMeasuredTotalPages}
            contentZoom={zoom}
          />
        </div>
      </div>

      <footer className="ac-editor-shell__footer">
        <button
          onClick={handleClose}
          disabled={editor.isSaving}
          className="ac-button ac-button--secondary"
        >
          Cancelar
        </button>

        <button
          onClick={handleSave}
          disabled={editor.isSaving || (!editor.hasChanges && editor.lastSaved !== null)}
          className="ac-button ac-button--primary"
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
