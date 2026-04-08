'use client';

import { useCallback, useState, useMemo } from 'react';
import { saveChapterContentAction } from '@/lib/projects/actions';
import type { DocumentChapter } from '@/lib/projects/types';

export interface UseChapterEditorOptions {
  chapters: DocumentChapter[];
  initialChapterIndex: number;
  projectId: string;
  onChapterChange?: (index: number) => void;
}

// Estimate pages based on content length
// Rough heuristic: ~1000px per page with padding, ~350-400 words per page
const estimatePageCount = (htmlContent: string): number => {
  const wordCount = htmlContent.split(/\s+/).filter(w => w.length > 0).length;
  const pageCount = Math.ceil(wordCount / 375); // ~375 words per page
  return Math.max(1, pageCount);
};

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
  const [currentPage, setCurrentPage] = useState(0);

  const currentChapter = chapters[currentIndex];
  const canNavigatePrev = currentIndex > 0;
  const canNavigateNext = currentIndex < chapters.length - 1;

  // Memoized page calculation
  const totalPages = useMemo(() => estimatePageCount(htmlContent), [htmlContent]);
  const canNavigatePagePrev = currentPage > 0;
  const canNavigatePageNext = currentPage < totalPages - 2; // 2 pages visible at a time

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

      // Only prompt if there are actual changes
      if (hasChanges) {
        const confirmed = confirm(
          'Tienes cambios sin guardar. ¿Deseas cambiar de capítulo sin guardar?'
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
      setCurrentPage(0); // Reset to first page when changing chapters
      onChapterChange?.(newIndex);
    },
    [chapters, hasChanges, onChapterChange]
  );

  const goToPagePrev = useCallback(() => {
    if (canNavigatePagePrev) {
      setCurrentPage(p => Math.max(0, p - 1));
    }
  }, [canNavigatePagePrev]);

  const goToPageNext = useCallback(() => {
    if (canNavigatePageNext) {
      setCurrentPage(p => Math.min(totalPages - 2, p + 1));
    }
  }, [canNavigatePageNext, totalPages]);

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

    // Page state
    currentPage,
    totalPages,
    canNavigatePagePrev,
    canNavigatePageNext,

    // Setters
    setTitle: handleTitleChange,
    setHtmlContent: handleContentChange,

    // Navigation
    goToPrevChapter,
    goToNextChapter,
    goToPagePrev,
    goToPageNext,

    // Persistence
    saveChapter,
  };
}
