'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { saveChapterContentAction } from '@/lib/projects/actions';
import { estimateTotalPages, type PageCalculationConfig } from '@/lib/projects/page-calculator';
import { chapterBlocksToHtml } from '@/lib/projects/chapter-html';
import { countRenderablePages, paginateContent } from '@/lib/preview/content-paginator';
import { DEVICE_PAGINATION_CONFIGS } from '@/lib/preview/device-configs';
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
  const previewBaseConfig = DEVICE_PAGINATION_CONFIGS[previewFormat];
  const parsedFontSize = Number.parseInt(fontSize, 10);

  return {
    ...previewBaseConfig,
    fontSize: Number.isFinite(parsedFontSize) ? parsedFontSize : previewBaseConfig.fontSize,
    marginTop: margins.top,
    marginBottom: margins.bottom,
    marginLeft: margins.left,
    marginRight: margins.right,
  };
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

function normalizeHtmlContent(content: string): string {
  const trimmed = content.trim();
  if (!trimmed) return '';

  const normalizeBreakMarkup = (html: string) =>
    html
      .replace(
        /<p[^>]*>\s*(?:<[^>]+>\s*)*[─—–_=*·.\s]{5,}(?:\s*<\/[^>]+>)*\s*<\/p>/gi,
        '',
      )
      .replace(/<hr(?![^>]*data-page-break=)[^>]*\/?>/gi, '')
      .replace(/<hr\s+data-page-break="true"\s*\/?>/gi, '<hr data-page-break="manual">')
      .replace(/<hr\s+data-page-break="manual"\s*\/?>/gi, '<hr data-page-break="manual">')
      .replace(/<hr\s+data-page-break="auto"\s*\/?>/gi, '<hr data-page-break="auto">');

  if (typeof window !== 'undefined' && typeof DOMParser !== 'undefined') {
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<div>${trimmed}</div>`, 'text/html');
    const html = doc.body.firstElementChild?.innerHTML ?? '';
    return normalizeBreakMarkup(html.replace(/>\s+</g, '><').replace(/&nbsp;/g, ' '));
  }

  return normalizeBreakMarkup(trimmed.replace(/>\s+</g, '><').replace(/&nbsp;/g, ' '));
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
  const initialHtmlContent = initialChapter
    ? normalizeLoadedChapterHtml(
        chapterBlocksToHtml(initialChapter.blocks),
        device,
        fontSize,
        margins,
      )
    : '';
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

  const currentChapter = chapters[currentIndex];
  const canNavigatePrev = currentIndex > 0;
  const canNavigateNext = currentIndex < chapters.length - 1;
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

  const totalPages = Math.max(
    1,
    Math.min(measuredTotalPages ?? estimatedTotalPages, estimatedTotalPages),
  );

  useEffect(() => {
    setMeasuredTotalPages(null);
  }, [currentIndex, htmlContent, device, fontSize, margins.bottom, margins.left, margins.right, margins.top]);

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
    [chapters, device, fontSize, hasChanges, margins, onChapterChange]
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
