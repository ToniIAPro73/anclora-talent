'use client';

import { useCallback, useState } from 'react';
import { saveChapterContentAction, uploadChapterImagesAction } from '@/lib/projects/actions';
import type { DocumentChapter } from '@/lib/projects/types';

export interface ChapterImage {
  id: string;
  url: string;
  alt: string;
  width: number;
  height: number;
  left: number;
  top: number;
  rotation: number;
  opacity: number;
  zIndex: number;
  createdAt: string;
}

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
  const [chapterImages, setChapterImages] = useState<ChapterImage[]>(
    initialChapter?.images || []
  );
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [fabricCanvas, setFabricCanvas] = useState<any>(null);

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
      // Reconstruct HTML content from blocks
      const reconstructedHtml = newChapter.blocks
        .map((block) => block.content)
        .join('');
      setHtmlContent(reconstructedHtml);
      // Load images from the chapter if they exist
      setChapterImages(newChapter.images || []);
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

  const addImage = useCallback((image: ChapterImage) => {
    setChapterImages((prev) => [...prev, image]);
    setHasChanges(true);
  }, []);

  const deleteImage = useCallback((id: string) => {
    setChapterImages((prev) => prev.filter((img) => img.id !== id));
    setHasChanges(true);
  }, []);

  const updateImage = useCallback((id: string, properties: Partial<ChapterImage>) => {
    setChapterImages((prev) =>
      prev.map((img) => (img.id === id ? { ...img, ...properties } : img))
    );
    setHasChanges(true);
  }, []);

  const saveChapter = useCallback(async () => {
    if (!currentChapter) return;

    setIsSaving(true);
    setError(null);

    try {
      // First, upload any images that have data URLs to blob storage
      let imagesToSave = chapterImages;
      const imageFormData = new FormData();
      imageFormData.set('projectId', projectId);
      imageFormData.set('chapterId', currentChapter.id);
      imageFormData.set('imageData', JSON.stringify(chapterImages));

      const uploadedImages = await uploadChapterImagesAction(imageFormData);
      if (uploadedImages) {
        imagesToSave = uploadedImages;
      }

      // Then save the chapter content with the blob URLs
      const formData = new FormData();
      formData.set('projectId', projectId);
      formData.set('chapterId', currentChapter.id);
      formData.set('chapterTitle', title);
      formData.set('htmlContent', htmlContent);
      formData.set('imageData', JSON.stringify(imagesToSave));

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
  }, [projectId, currentChapter, title, htmlContent, chapterImages]);

  return {
    // Current state
    currentIndex,
    currentChapter,
    totalChapters: chapters.length,
    title,
    htmlContent,
    chapterImages,
    hasChanges,
    isSaving,
    error,
    lastSaved,
    fabricCanvas,
    canNavigatePrev,
    canNavigateNext,

    // Setters
    setTitle: handleTitleChange,
    setHtmlContent: handleContentChange,
    setFabricCanvas,

    // Image operations
    addImage,
    deleteImage,
    updateImage,

    // Navigation
    goToPrevChapter,
    goToNextChapter,

    // Persistence
    saveChapter,
  };
}
