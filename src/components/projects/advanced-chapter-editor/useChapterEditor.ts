'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { saveChapterContentAction } from '@/lib/projects/actions';
import { estimateTotalPages, type PageCalculationConfig } from '@/lib/projects/page-calculator';
import { chapterBlocksToHtml } from '@/lib/projects/chapter-html';
import type { DocumentChapter } from '@/lib/projects/types';

export interface UseChapterEditorOptions {
  chapters: DocumentChapter[];
  initialChapterIndex: number;
  projectId: string;
  onChapterChange?: (index: number) => void;
  device?: 'mobile' | 'tablet' | 'desktop';
  fontSize?: string;
  margins?: { top: number; bottom: number; left: number; right: number };
}

function normalizeHtmlContent(content: string): string {
  const trimmed = content.trim();
  if (!trimmed) return '';

  if (typeof window !== 'undefined' && typeof DOMParser !== 'undefined') {
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<div>${trimmed}</div>`, 'text/html');
    return (
      doc.body.firstElementChild?.innerHTML
        .replace(/>\s+</g, '><')
        .replace(/<hr\s+data-page-break="true"\s*\/?>/gi, '<hr data-page-break="true">') ?? ''
    );
  }

  return trimmed
    .replace(/>\s+</g, '><')
    .replace(/<hr\s+data-page-break="true"\s*\/?>/gi, '<hr data-page-break="true">');
}

export function useChapterEditor({
  chapters,
  initialChapterIndex,
  projectId,
  onChapterChange,
  device = 'desktop',
  fontSize = '16px',
  margins = { top: 24, bottom: 24, left: 24, right: 24 },
}: UseChapterEditorOptions) {
  const initialChapter = chapters[initialChapterIndex];
  const initialHtmlContent = initialChapter ? chapterBlocksToHtml(initialChapter.blocks) : '';
  const [currentIndex, setCurrentIndex] = useState(initialChapterIndex);
  const [title, setTitle] = useState(initialChapter?.title || '');
  const [htmlContent, setHtmlContent] = useState(initialHtmlContent);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const savedBaselineRef = useRef(normalizeHtmlContent(initialHtmlContent));

  const currentChapter = chapters[currentIndex];
  const canNavigatePrev = currentIndex > 0;
  const canNavigateNext = currentIndex < chapters.length - 1;

  // Memoized page calculation with dynamic config
  const totalPages = useMemo(() => {
    const pageConfig: PageCalculationConfig = {
      device: device as 'mobile' | 'tablet' | 'desktop',
      fontSize,
      marginTop: margins.top,
      marginBottom: margins.bottom,
      marginLeft: margins.left,
      marginRight: margins.right,
    };
    return estimateTotalPages(htmlContent, pageConfig);
  }, [htmlContent, device, fontSize, margins]);

  const canNavigatePagePrev = currentPage > 0;
  const canNavigatePageNext = currentPage < totalPages - 2; // 2 pages visible at a time

  const handleTitleChange = useCallback((newTitle: string) => {
    setTitle(newTitle);
    setHasChanges(true);
    setError(null);
  }, []);

  const handleContentChange = useCallback((newContent: string) => {
    setHtmlContent(newContent);
    setHasChanges(
      normalizeHtmlContent(newContent) !== savedBaselineRef.current
    );
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
      const reconstructedHtml = chapterBlocksToHtml(newChapter.blocks);
      savedBaselineRef.current = normalizeHtmlContent(reconstructedHtml);
      setCurrentIndex(newIndex);
      setTitle(newChapter.title);
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
      savedBaselineRef.current = normalizeHtmlContent(htmlContent);
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
