'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Loader2, Save, ArrowDown, ArrowUp, ZoomIn, ZoomOut, ArrowLeft, Maximize2, FileText, Clock3 } from 'lucide-react';
import { AdvancedRichTextEditor } from '../AdvancedRichTextEditor';
import { Stepper, type Step } from '@/components/ui/Stepper';
import { useChapterEditor } from './useChapterEditor';
import { useEditorPreferences } from '@/hooks/use-editor-preferences';
import { useUiPreferences } from '@/components/providers/UiPreferencesProvider';
import { resolveLocaleMessages } from '@/lib/i18n/messages';
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
  const { locale } = useUiPreferences();
  const copy = resolveLocaleMessages(locale).editor;
  const { preferences } = useEditorPreferences();
  const [zoom, setZoom] = useState(100);
  const editorSteps: Step[] = (locale === 'es'
    ? ['Contenido', 'Capítulos', 'Portada', 'Contraportada', 'Vista previa', 'Colaborar', 'Asistente IA', 'Exportar']
    : ['Content', 'Chapters', 'Cover', 'Back cover', 'Preview', 'Collaborate', 'AI assistant', 'Export'])
    .map((title, index) => ({ id: index + 1, title, status: index === 0 ? 'completed' : index === 1 ? 'active' : 'pending' }));

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
        `⚠️ ${copy.unsavedChanges}`
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
  }, [copy, editor, onSave, onClose]);

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
          <span className="chapter-editor-brand">Anclora Talent</span>
          <button type="button" className="ac-editor-back ac-button ac-button--secondary ac-button--sm" onClick={handleClose} disabled={editor.isSaving} data-testid="chapter-editor-back-button"><ArrowLeft className="h-4 w-4" />{locale === 'es' ? 'Volver a Capítulos' : 'Back to Chapters'}</button>
          <h2 className="ac-editor-shell__title">
            {locale === 'es' ? 'Capítulo' : 'Chapter'} {editor.currentIndex + 1}/{editor.totalChapters}
          </h2>
          <p className="ac-editor-shell__summary">{editor.currentChapter.title}</p>
        </div>

        <div className="ac-editor-shell__controls">
          <div className="ac-preview-control-group">
          <button
            data-testid="chapter-editor-prev-chapter-button"
            onClick={editor.goToPrevChapter}
            disabled={!editor.canNavigatePrev || editor.isSaving}
            className="ac-button ac-button--ghost ac-button--sm disabled:opacity-50"
            title={copy.chapterPrevious}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <button
            data-testid="chapter-editor-next-chapter-button"
            onClick={editor.goToNextChapter}
            disabled={!editor.canNavigateNext || editor.isSaving}
            className="ac-button ac-button--ghost ac-button--sm disabled:opacity-50"
            title={copy.chapterNext}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          </div>

          {editor.totalPages > 1 && (
            <div className="ac-preview-pagination">
              <button
                data-testid="chapter-editor-prev-page-button"
                onClick={editor.goToPagePrev}
                disabled={!editor.canNavigatePagePrev || editor.isSaving}
                className="ac-button ac-button--ghost ac-button--sm disabled:opacity-50"
                title={copy.pagePrevious}
              >
                <ArrowUp className="h-4 w-4" />
              </button>

              <span className="ac-preview-control-value">
                P.{editor.currentPage + 1}
              </span>

              <button
                data-testid="chapter-editor-next-page-button"
                onClick={editor.goToPageNext}
                disabled={!editor.canNavigatePageNext || editor.isSaving}
                className="ac-button ac-button--ghost ac-button--sm disabled:opacity-50"
                title={copy.pageNext}
              >
                <ArrowDown className="h-4 w-4" />
              </button>
            </div>
          )}

          <div className="ac-preview-control-group">
          <button
            type="button"
            data-testid="chapter-editor-zoom-out-button"
            onClick={() => handleZoomChange(zoom - 10)}
            className="ac-button ac-button--ghost ac-button--sm"
            title={copy.zoomOut}
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <span className="ac-preview-control-value">
            {zoom}%
          </span>
          <button
            type="button"
            data-testid="chapter-editor-zoom-in-button"
            onClick={() => handleZoomChange(zoom + 10)}
            className="ac-button ac-button--ghost ac-button--sm"
            title={copy.zoomIn}
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          </div>
        </div>

        <div className="ac-editor-shell__actions">
          {editor.lastSaved && (
            <span className="ac-editor-shell__status">
              ✓ {copy.saved}
            </span>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={editor.isSaving || (!editor.hasChanges && editor.lastSaved !== null)}
            className="ac-button ac-button--primary ac-button--sm"
            data-testid="chapter-editor-header-save-button"
          >
            {editor.isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            {copy.save}
          </button>
          <button
            data-testid="chapter-editor-close-button"
            onClick={handleClose}
            disabled={editor.isSaving}
            className="ac-button ac-button--secondary"
            title={copy.closeEditor}
          >
            {copy.close}
          </button>
          <button type="button" className="ac-button ac-button--ghost ac-button--icon" aria-label={locale === 'es' ? 'Modo enfoque' : 'Focus mode'} title={locale === 'es' ? 'Modo enfoque' : 'Focus mode'} data-testid="chapter-editor-focus-button"><Maximize2 className="h-4 w-4" /></button>
        </div>
      </header>

      <div className="chapter-editor-stepper talent-content-stepper-bar">
        <Stepper steps={editorSteps} activeStep={2} />
      </div>

      <div className="chapter-editor-contextbar">
        <div className="chapter-editor-contextbar__nav"><button type="button" className="ac-button ac-button--secondary ac-button--sm" onClick={editor.goToPrevChapter} disabled={!editor.canNavigatePrev || editor.isSaving} data-testid="chapter-editor-context-prev-button"><ChevronLeft className="h-4 w-4" />{locale === 'es' ? 'Capítulo anterior' : 'Previous chapter'}</button><button type="button" className="ac-button ac-button--secondary ac-button--sm" onClick={editor.goToNextChapter} disabled={!editor.canNavigateNext || editor.isSaving} data-testid="chapter-editor-context-next-button">{locale === 'es' ? 'Capítulo siguiente' : 'Next chapter'}<ChevronRight className="h-4 w-4" /></button></div>
        <span className="chapter-editor-contextbar__save"><span className="chapters-workspace__status-dot is-good" />{editor.isSaving ? copy.saving : editor.lastSaved ? copy.saved : (locale === 'es' ? 'Listo para editar' : 'Ready to edit')}</span>
      </div>

      <div className="ac-editor-shell__main">
        {editor.error && (
          <div className="rounded-[8px] border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400 flex-shrink-0">
            {editor.error}
          </div>
        )}

        {/* Fase 6: this must clip, not scroll — .ac-text-editor__content--scroll
            below is the one intended scroll region. Two independent
            `overflow-auto` ancestors produced competing scrollbars. */}
        <div className="chapter-editor-layout">
          <aside className="chapter-editor-outline"><div className="chapter-editor-outline__heading"><strong>{locale === 'es' ? 'Esquema' : 'Outline'}</strong><span>{editor.currentChapter.blocks.length}</span></div>{editor.currentChapter.blocks.slice(0, 8).map((block, index) => <button type="button" key={block.id} className="chapter-editor-outline__item" onClick={() => undefined} data-testid={`chapter-outline-item-${index + 1}`}><span>{index + 1}</span>{block.content.replace(/<[^>]+>/g, ' ').slice(0, 34) || (locale === 'es' ? 'Bloque sin título' : 'Untitled block')}</button>)}</aside>
          <div className="ac-editor-shell__surface min-h-0 overflow-hidden"><AdvancedRichTextEditor defaultContent={editor.htmlContent} onUpdate={editor.setHtmlContent} currentPage={editor.currentPage} totalPages={editor.totalPages} onPageCountChange={editor.setMeasuredTotalPages} contentZoom={zoom} /></div>
          <aside className="chapter-editor-inspector"><h3>{locale === 'es' ? 'Capítulo' : 'Chapter'}</h3><label htmlFor="editor-chapter-title">{locale === 'es' ? 'Título del capítulo' : 'Chapter title'}</label><input id="editor-chapter-title" value={editor.title} onChange={(event) => editor.setTitle(event.target.value)} data-testid="chapter-editor-title-input" /><div className="chapter-editor-inspector__stats"><p><FileText />{editor.htmlContent.replace(/<[^>]+>/g, ' ').trim().split(/\s+/).filter(Boolean).length.toLocaleString()} {locale === 'es' ? 'palabras' : 'words'}</p><p><Clock3 />{editor.totalPages} {locale === 'es' ? 'páginas (aprox.)' : 'pages (approx.)'}</p></div><section className="chapter-editor-inspector__health"><div><strong>{locale === 'es' ? 'Salud del capítulo' : 'Chapter health'}</strong><span className="chapter-editor-health-good">● {locale === 'es' ? 'Disponible' : 'Available'}</span></div><div className="chapter-editor-health-bar"><i /><i /><i /><i /></div><p><Check /> {locale === 'es' ? 'Contenido disponible' : 'Content available'}</p><p><Check /> {locale === 'es' ? 'Estructura detectada' : 'Structure detected'}</p><p><Check /> {locale === 'es' ? 'Listo para editar' : 'Ready to edit'}</p></section><details><summary>{locale === 'es' ? 'Notas' : 'Notes'}</summary><p>{locale === 'es' ? 'Las notas del capítulo se gestionan desde el proyecto.' : 'Chapter notes are managed from the project.'}</p></details></aside>
        </div>
      </div>

      <footer className="ac-editor-shell__footer">
        <button
          data-testid="chapter-editor-cancel-button"
          onClick={handleClose}
          disabled={editor.isSaving}
          className="ac-button ac-button--secondary"
        >
          {copy.cancel}
        </button>

        <button
          data-testid="chapter-editor-save-button"
          onClick={handleSave}
          disabled={editor.isSaving || (!editor.hasChanges && editor.lastSaved !== null)}
          className="ac-button ac-button--primary"
        >
          {editor.isSaving ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              <span className="text-sm">{copy.saving}</span>
            </>
          ) : (
            <>
              <Save className="h-3 w-3" />
              <span className="text-sm">{copy.save}</span>
            </>
          )}
        </button>
      </footer>
    </div>
  );
}
