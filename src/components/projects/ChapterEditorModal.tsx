'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { X, Loader2, Save } from 'lucide-react';
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
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
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
      setLastSaved(new Date());
      onSave?.();
      // No cerramos el modal aquí, el usuario debe decidir cuándo salir
    } catch (error) {
      console.error('Failed to save chapter:', error);
    } finally {
      setIsSaving(false);
    }
  }, [projectId, chapter.id, title, initialContent, onSave]);

  const handleClose = useCallback(() => {
    if (hasChanges) {
      if (confirm('Tienes cambios sin guardar. ¿Deseas salir de todas formas?')) {
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

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 sm:p-6" onClick={handleClose}>
      <div
        className="flex h-full max-h-[98vh] w-full max-w-[98vw] flex-col overflow-hidden rounded-[32px] border border-white/10 bg-[#0C141E] shadow-[0_0_100px_rgba(0,0,0,0.8)] animate-in fade-in zoom-in duration-300 md:max-h-[95vh] md:max-w-[95vw]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Premium Header */}
        <div className="flex items-center justify-between border-b border-white/5 bg-[#0E1825] px-8 py-5">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-mint)]/10 text-[var(--accent-mint)]">
                <Save className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-xl font-black tracking-tight text-white md:text-2xl">
                  Editor de Contenido
                </h2>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">
                  Capítulo {chapterIndex + 1}: {chapter.title}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {lastSaved && (
              <span className="text-[10px] font-medium text-[var(--accent-mint)] opacity-70">
                Guardado a las {lastSaved.toLocaleTimeString()}
              </span>
            )}
            <button
              onClick={handleClose}
              className="group flex h-10 w-10 items-center justify-center rounded-full border border-white/5 bg-white/5 transition-all hover:bg-white/10 hover:scale-110 active:scale-95"
              title="Cerrar Editor"
            >
              <X className="h-5 w-5 text-white transition-colors group-hover:text-[var(--accent-mint)]" />
            </button>
          </div>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-hidden bg-[var(--background)]">
          <div className="flex h-full flex-col gap-6 overflow-y-auto px-8 py-8 custom-scrollbar">
            {/* Chapter title input - Styled as Premium Input */}
            <div className="mx-auto w-full max-w-4xl space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-tertiary)]">Título del capítulo</label>
              <input
                type="text"
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  setHasChanges(true);
                }}
                className="w-full bg-transparent border-b-2 border-white/10 py-3 text-3xl font-black text-white outline-none transition-all focus:border-[var(--accent-mint)] focus:placeholder:opacity-0"
                placeholder="Escribe el título..."
              />
            </div>

            {/* Advanced Rich text editor */}
            <div className="flex-1 min-h-[600px]">
              <AdvancedRichTextEditor
                defaultContent={initialContent}
                onUpdate={handleEditorUpdate}
              />
            </div>
          </div>
        </div>

        {/* Premium Footer - Aligned with CONTRACTS */}
        <div className="flex items-center justify-between border-t border-white/5 bg-[#0E1825] px-10 py-6">
          <button
            onClick={handleClose}
            disabled={isSaving}
            className={`${premiumSecondaryLightButton} min-w-[140px] border-white/10 hover:bg-white/5`}
          >
            Cerrar
          </button>

          <button
            onClick={handleSave}
            disabled={isSaving || (!hasChanges && lastSaved !== null)}
            className={`${premiumPrimaryDarkButton} min-w-[180px] shadow-[0_10px_30px_rgba(196,154,36,0.2)]`}
          >
            {isSaving ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Guardando...
              </div>
            ) : (
              'Guardar Cambios'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
