'use client';

import { ChapterEditorFullscreen } from './advanced-chapter-editor/ChapterEditorFullscreen';
import type { DocumentChapter } from '@/lib/projects/types';

interface ChapterEditorModalProps {
  chapters: DocumentChapter[];
  currentChapterIndex: number;
  isOpen: boolean;
  projectId: string;
  onClose: () => void;
  onSave?: () => void;
  effectiveFontFamily?: string;
  composition?: import('@/lib/projects/composition').CompositionSettings | null;
  documentStyleMap?: import('@/lib/style-engine/model').DocumentStyleMap | null;
  compiledCssVariables?: Record<string, string> | null;
}

/**
 * ChapterEditorModal - Wrapper component for fullscreen chapter editing
 * Delegates to ChapterEditorFullscreen for fullscreen UI with navigation support
 */
export function ChapterEditorModal({
  chapters,
  currentChapterIndex,
  isOpen,
  projectId,
  onClose,
  onSave,
  effectiveFontFamily,
  composition,
  documentStyleMap,
  compiledCssVariables,
}: ChapterEditorModalProps) {
  if (!isOpen) return null;

  return (
    <div
      // Fase 6: no overflow rule here meant a canvas taller than the
      // viewport had nowhere defined to scroll (sometimes the browser page
      // scrolled instead of the editor). This wrapper now only clips —
      // AdvancedRichTextEditor's own content area is the single scroll
      // region.
      className="fixed inset-0 z-[200] overflow-hidden bg-black/85 backdrop-blur-md"
      onClick={onClose}
    >
      <ChapterEditorFullscreen
        chapters={chapters}
        initialChapterIndex={currentChapterIndex}
        projectId={projectId}
        onClose={onClose}
        onSave={onSave}
        effectiveFontFamily={effectiveFontFamily}
        composition={composition}
        documentStyleMap={documentStyleMap}
        compiledCssVariables={compiledCssVariables}
      />
    </div>
  );
}
