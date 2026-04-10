'use client';

import { normalizeHtmlContent } from '@/lib/preview/html-normalize';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { saveChapterContentAction } from '@/lib/projects/actions';
import { estimateTotalPages, type PageCalculationConfig } from '@/lib/projects/page-calculator';
import { chapterBlocksToHtml } from '@/lib/projects/chapter-html';
import { countRenderablePages, paginateContent } from '@/lib/preview/content-paginator';
import { buildPaginationConfig } from '@/lib/preview/device-configs';
import { reconcileOverflowBreaks } from '@/lib/preview/editor-page-layout';
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

function buildPreviewConfig(
  device: 'mobile' | 'tablet' | 'desktop',
  fontSize: string,
  margins: { top: number; bottom: number; left: number; right: number },
) {
  const previewFormat = device === 'desktop' ? 'laptop' : device;
  return buildPaginationConfig(previewFormat, { fontSize, margins });
}

function normalizeLoadedChapterHtml(
  content: string,
  device: 'mobile' | 'tablet' | 'desktop',
  fontSize: string,
  margins: { top: number; bottom: number; left: number; right: number },
) {
  return normalizeHtmlContent(
    reconcileOverflowBreaks(content, buildPreviewConfig(device, fontSize, margins)),
  );
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
  const router = useRouter();
  const initialChapter = chapters[initialChapterIndex];
  const initialHtmlContent = initialChapter
    ? normalizeLoadedChapterHtml(
        chapterBlocksToHtml(initialChapter.blocks),
        device,
        fontSize,
        margins,
      )
    : '';
  const [localChapters, setLocalChapters] = useState(chapters);
  const [currentIndex, setCurrentIndex] = useState(initialChapterIndex);
  const [title, setTitle] = useState(initialChapter?.title || '');
  const [htmlContent, setHtmlContent] = useState(initialHtmlContent);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [measuredTotalPages, setMeasuredTotalPages] = useState<number | null>(null);
  const savedBaselineRef = useRef(normalizeHtmlContent(initialHtmlContent));

  const currentChapter = localChapters[currentIndex];
  const canNavigatePrev = currentIndex > 0;
  const canNavigateNext = currentIndex < localChapters.length - 1;
  const previewConfig = useMemo(
    () => buildPreviewConfig(device, fontSize, margins),
    [device, fontSize, margins],
  );

  // Memoized page calculation with dynamic config
  const estimatedTotalPages = useMemo(() => {
    const reconciledContent = reconcileOverflowBreaks(htmlContent, previewConfig);

    if (typeof window !== 'undefined' && typeof DOMParser !== 'undefined') {
      return countRenderablePages(paginateContent(reconciledContent, previewConfig));
    }

    const pageConfig: PageCalculationConfig = {
      device: device as 'mobile' | 'tablet' | 'desktop',
      fontSize,
      marginTop: margins.top,
      marginBottom: margins.bottom,
      marginLeft: margins.left,
      marginRight: margins.right,
    };
    return estimateTotalPages(reconciledContent, pageConfig);
  }, [htmlContent, device, fontSize, margins, previewConfig]);

  const totalPages = Math.max(1, estimatedTotalPages);

  useEffect(() => {
    setMeasuredTotalPages(null);
  }, [currentIndex, htmlContent, device, fontSize, margins.bottom, margins.left, margins.right, margins.top]);

  useEffect(() => {
    setLocalChapters(chapters);
  }, [chapters]);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, Math.max(totalPages - 1, 0)));
  }, [totalPages]);

  const canNavigatePagePrev = currentPage > 0;
  const canNavigatePageNext = currentPage < totalPages - 1;

  const handleTitleChange = useCallback((newTitle: string) => {
    setTitle(newTitle);
    setHasChanges(true);
    setError(null);
  }, []);

  const handleContentChange = useCallback((newContent: string) => {
    const normalizedIncomingContent = normalizeHtmlContent(
      reconcileOverflowBreaks(newContent, previewConfig),
    );
    setHtmlContent(newContent);
    setHasChanges(
      normalizedIncomingContent !== savedBaselineRef.current
    );
    setError(null);
  }, [previewConfig]);

  const persistCurrentChapter = useCallback(async () => {
    if (!currentChapter) return false;

    setIsSaving(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.set('projectId', projectId);
      formData.set('chapterId', currentChapter.id);
      formData.set('chapterTitle', title);
      formData.set('htmlContent', htmlContent);

      await saveChapterContentAction(formData);
      setLocalChapters((current) =>
        current.map((chapter, index) =>
          index === currentIndex
            ? {
                ...chapter,
                title,
                blocks: [
                  {
                    id: chapter.blocks[0]?.id ?? `${chapter.id}-content`,
                    order: 0,
                    type: 'paragraph',
                    content: htmlContent,
                  },
                ],
              }
            : chapter,
        ),
      );
      savedBaselineRef.current = normalizeHtmlContent(htmlContent);
      setHasChanges(false);
      setLastSaved(new Date());
      router.refresh();
      return true;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Error al guardar el capítulo'
      );
      console.error('Failed to save chapter:', err);
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [currentChapter, currentIndex, htmlContent, projectId, router, title]);

  const navigateToChapter = useCallback(
    async (newIndex: number) => {
      if (newIndex < 0 || newIndex >= localChapters.length) return;

      if (hasChanges) {
        const confirmed = confirm(
          'Tienes cambios sin guardar. ¿Deseas guardarlos antes de cambiar de capítulo?'
        );
        if (!confirmed) return;

        const saved = await persistCurrentChapter();
        if (!saved) return;
      }

      const newChapter = localChapters[newIndex];
      const reconstructedHtml = normalizeLoadedChapterHtml(
        chapterBlocksToHtml(newChapter.blocks),
        device,
        fontSize,
        margins,
      );
      savedBaselineRef.current = normalizeHtmlContent(reconstructedHtml);
      setCurrentIndex(newIndex);
      setTitle(newChapter.title);
      setHtmlContent(reconstructedHtml);
      setHasChanges(false);
      setError(null);
      setCurrentPage(0); // Reset to first page when changing chapters
      onChapterChange?.(newIndex);
    },
    [device, fontSize, hasChanges, localChapters, margins, onChapterChange, persistCurrentChapter]
  );

  const goToPagePrev = useCallback(() => {
    if (canNavigatePagePrev) {
      setCurrentPage(p => Math.max(0, p - 1));
    }
  }, [canNavigatePagePrev]);

  const goToPageNext = useCallback(() => {
    if (canNavigatePageNext) {
      setCurrentPage(p => Math.min(totalPages - 1, p + 1));
    }
  }, [canNavigatePageNext, totalPages]);

  const goToPrevChapter = useCallback(() => {
    navigateToChapter(currentIndex - 1);
  }, [currentIndex, navigateToChapter]);

  const goToNextChapter = useCallback(() => {
    navigateToChapter(currentIndex + 1);
  }, [currentIndex, navigateToChapter]);

  const saveChapter = useCallback(async () => {
    await persistCurrentChapter();
  }, [persistCurrentChapter]);

  return {
    // Current state
    currentIndex,
    currentChapter,
    totalChapters: localChapters.length,
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
    setMeasuredTotalPages,

    // Navigation
    goToPrevChapter,
    goToNextChapter,
    goToPagePrev,
    goToPageNext,

    // Persistence
    saveChapter,
  };
}
