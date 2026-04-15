'use client';

import { ChapterEditorFullscreen } from './advanced-chapter-editor/ChapterEditorFullscreen';
import type { DocumentChapter } from '@/lib/projects/types';

interface ChapterEditorModalProps {
  chapters: DocumentChapter[];
  derivedChapterHtmlById?: Map<string, string>;
  currentChapterIndex: number;
  isOpen: boolean;
  projectId: string;
  onClose: () => void;
  onSave?: () => void;
}

/**
 * ChapterEditorModal - Wrapper component for fullscreen chapter editing
 * Delegates to ChapterEditorFullscreen for fullscreen UI with navigation support
 */
export function ChapterEditorModal({
  chapters,
  derivedChapterHtmlById,
  currentChapterIndex,
  isOpen,
  projectId,
  onClose,
  onSave,
}: ChapterEditorModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[200] bg-black/85 backdrop-blur-md"
      onClick={onClose}
    >
      <ChapterEditorFullscreen
        chapters={chapters}
        derivedChapterHtmlById={derivedChapterHtmlById}
        initialChapterIndex={currentChapterIndex}
        projectId={projectId}
        onClose={onClose}
        onSave={onSave}
      />
    </div>
  );
}
