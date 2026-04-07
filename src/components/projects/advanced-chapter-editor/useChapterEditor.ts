'use client';

import { useCallback, useState } from 'react';
import { saveChapterContentAction } from '@/lib/projects/actions';
import type { DocumentChapter } from '@/lib/projects/types';

export interface UseChapterEditorOptions {
  chapters: DocumentChapter[];
  initialChapterIndex: number;
  projectId: string;
  onChapterChange?: (index: number) => void;
}

export function useChapterEditor({
  chapters,
  initialChapterIndex,
  projectId,
  onChapterChange,
}: UseChapterEditorOptions) {
  const initialChapter = chapters[initialChapterIndex];
  const [currentIndex, setCurrentIndex] = useState(initialChapterIndex);
  const [title, setTitle] = useState(initialChapter?.title || '');
  const [htmlContent, setHtmlContent] = useState(
    initialChapter?.blocks.map((block) => block.content).join('') || ''
  );
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const currentChapter = chapters[currentIndex];
  const canNavigatePrev = currentIndex > 0;
  const canNavigateNext = currentIndex < chapters.length - 1;

  const handleTitleChange = useCallback((newTitle: string) => {
    setTitle(newTitle);
    setHasChanges(true);
    setError(null);
  }, []);

  const handleContentChange = useCallback((newContent: string) => {
    setHtmlContent(newContent);
    setHasChanges(true);
    setError(null);
  }, []);

  const navigateToChapter = useCallback(
    async (newIndex: number) => {
      if (newIndex < 0 || newIndex >= chapters.length) return;

      if (hasChanges) {
        const confirmed = confirm(
          'Tienes cambios sin guardar. ¿Deseas cambiar de capítulo?'
        );
        if (!confirmed) return;
      }

      const newChapter = chapters[newIndex];
      setCurrentIndex(newIndex);
      setTitle(newChapter.title);
      // Reconstruct HTML content from blocks (includes images embedded as HTML)
      const reconstructedHtml = newChapter.blocks
        .map((block) => block.content)
        .join('');
      setHtmlContent(reconstructedHtml);
      setHasChanges(false);
      setError(null);
      onChapterChange?.(newIndex);
    },
    [chapters, hasChanges, onChapterChange]
  );

  const goToPrevChapter = useCallback(() => {
    navigateToChapter(currentIndex - 1);
  }, [currentIndex, navigateToChapter]);

  const goToNextChapter = useCallback(() => {
    navigateToChapter(currentIndex + 1);
  }, [currentIndex, navigateToChapter]);

  const saveChapter = useCallback(async () => {
    if (!currentChapter) return;

    setIsSaving(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.set('projectId', projectId);
      formData.set('chapterId', currentChapter.id);
      formData.set('chapterTitle', title);
      formData.set('htmlContent', htmlContent);

      await saveChapterContentAction(formData);
      setHasChanges(false);
      setLastSaved(new Date());
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Error al guardar el capítulo'
      );
      console.error('Failed to save chapter:', err);
    } finally {
      setIsSaving(false);
    }
  }, [projectId, currentChapter, title, htmlContent]);

  return {
    // Current state
    currentIndex,
    currentChapter,
    totalChapters: chapters.length,
    title,
    htmlContent,
    hasChanges,
    isSaving,
    error,
    lastSaved,
    canNavigatePrev,
    canNavigateNext,

    // Setters
    setTitle: handleTitleChange,
    setHtmlContent: handleContentChange,

    // Navigation
    goToPrevChapter,
    goToNextChapter,

    // Persistence
    saveChapter,
  };
}
