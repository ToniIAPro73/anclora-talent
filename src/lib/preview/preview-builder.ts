/**
 * Preview Builder - Anclora Talent Edition
 * Constructs pages for preview from project data
 *
 * Adapts Press preview architecture to Talent's ProjectRecord model
 * while maintaining premium UI contract compliance
 *
 * PAGINATION ARCHITECTURE:
 * - Each chapter is paginated independently using the chapter HTML as source of truth
 * - Global page numbering across all chapters (cover=1, content=2+)
 * - TOC reflects actual first-page numbers per chapter (not estimates)
 * - Back-cover numbered after all content pages
 */

import type { ProjectRecord } from '@/lib/projects/types';
import { createDefaultSurfaceState, normalizeSurfaceState } from '@/lib/projects/cover-surface';
import { resolveCoverSurfaceFields } from '@/lib/projects/cover-surface-resolver';
import { chapterBlocksToHtml } from '@/lib/projects/chapter-html';
import { PaginationConfig } from './device-configs';
import { hasRenderablePageContent, paginateContent } from './content-paginator';
import { reconcileOverflowBreaks } from './editor-page-layout';

// ==================== TYPES ====================

export interface PreviewPage {
  type: 'cover' | 'content' | 'back-cover';
  content: string | null;
  coverData?: {
    title: string;
    subtitle?: string;
    author: string;
    palette: string;
    renderedImageUrl?: string | null;
    backgroundImageUrl?: string | null;
    showSubtitle?: boolean;
  };
  backCoverData?: {
    title: string;
    body: string;
    authorBio: string;
    renderedImageUrl?: string | null;
    backgroundImageUrl?: string | null;
  };
  chapterTitle?: string;
  chapterId?: string;
  pageNumber: number;
}

// ==================== PAGE BUILDER ====================

/**
 * Build preview pages from project data
 *
 * PAGINATION FLOW:
 * 1. Cover (page 1)
 * 2+ Content pages - each chapter paginated independently with global page numbers
 * Last: Back-cover
 */
export function buildPreviewPages(
  project: ProjectRecord,
  config: PaginationConfig,
): PreviewPage[] {
  const pages: PreviewPage[] = [];
  const normalizedCover = normalizeCoverSurface(project);
  const normalizedBackCover = normalizeBackCoverSurface(project);

  // ─────────────────────────────────────────────────────────────
  // PAGE 1: COVER
  // ─────────────────────────────────────────────────────────────
  pages.push({
    type: 'cover',
    content: null,
    coverData: {
      title: normalizedCover.fields.title?.value || project.cover.title || 'Proyecto sin título',
      subtitle: normalizedCover.fields.subtitle?.value ?? '',
      author: normalizedCover.fields.author?.value || project.document.author || 'Autor desconocido',
      palette: project.cover.palette,
      renderedImageUrl: project.cover.renderedImageUrl ?? null,
      backgroundImageUrl: project.cover.backgroundImageUrl ?? null,
      showSubtitle: normalizedCover.fields.subtitle?.visible ?? false,
    },
    pageNumber: 1,
  });

  // ─────────────────────────────────────────────────────────────
  // BUILD CHAPTER SECTIONS (for pagination and TOC)
  // ─────────────────────────────────────────────────────────────

  interface ChapterSection {
    id: string;
    title: string;
    html: string;
    order: number;
  }

  const chapterSections: ChapterSection[] = [];

  if (project.document.chapters && project.document.chapters.length > 0) {
    const sortedChapters = [...project.document.chapters].sort(
      (a, b) => a.order - b.order,
    );

    sortedChapters.forEach((chapter, index) => {
      const chapterTitle = chapter.title?.trim() || `Capítulo ${index + 1}`;
      const chapterHtml = chapterBlocksToHtml(chapter.blocks);

      chapterSections.push({
        id: chapter.id,
        title: chapterTitle,
        html: chapterHtml || '<p><em>Contenido aún no disponible</em></p>',
        order: index,
      });
    });
  }

  // ─────────────────────────────────────────────────────────────
  // PAGINATE CHAPTERS
  // ─────────────────────────────────────────────────────────────

  let globalPageNumber = 2; // Content starts immediately after cover

  for (const chapter of chapterSections) {
    // Reconcile auto-breaks (strips stale auto-breaks, respects manual breaks, re-paginates)
    // then split into discrete page HTML strings.
    const reconciledChapterHtml = reconcileOverflowBreaks(chapter.html, config);
    const chapterPageHtmls = paginateContent(reconciledChapterHtml, config)
      .filter((page) => hasRenderablePageContent(page.html))
      .map((page) => page.html);

    // Add paginated pages with global numbering and chapter metadata
    for (const pageHtml of chapterPageHtmls) {
      pages.push({
        type: 'content',
        content: pageHtml,
        chapterTitle: chapter.title,
        chapterId: chapter.id,
        pageNumber: globalPageNumber,
      });
      globalPageNumber++;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // BACK COVER
  // ─────────────────────────────────────────────────────────────

  if (project.backCover) {
    pages.push({
      type: 'back-cover',
      content: null,
      backCoverData: {
        title: normalizedBackCover.fields.title?.value || project.backCover.title || project.document.title,
        body: normalizedBackCover.fields.body?.visible ? normalizedBackCover.fields.body.value : '',
        authorBio: normalizedBackCover.fields.authorBio?.visible ? normalizedBackCover.fields.authorBio.value : '',
        renderedImageUrl: project.backCover.renderedImageUrl ?? null,
        backgroundImageUrl: project.backCover.backgroundImageUrl ?? null,
      },
      pageNumber: globalPageNumber,
    });
  }

  return pages;
}

// ==================== HELPERS ====================

function normalizeCoverSurface(project: ProjectRecord) {
  const fallback = createDefaultSurfaceState('cover');
  const baseState = normalizeSurfaceState(project.cover.surfaceState ?? fallback);
  return {
    ...baseState,
    fields: {
      ...baseState.fields,
      ...resolveCoverSurfaceFields(project, baseState),
    },
  };
}

function normalizeBackCoverSurface(project: ProjectRecord) {
  const fallback = createDefaultSurfaceState('back-cover');
  fallback.fields.title = {
    value: project.backCover.title || project.document.title,
    visible: Boolean((project.backCover.title || project.document.title).trim()),
  };
  fallback.fields.body = {
    value: project.backCover.body || '',
    visible: Boolean(project.backCover.body.trim()),
  };
  fallback.fields.authorBio = {
    value: project.backCover.authorBio || '',
    visible: Boolean(project.backCover.authorBio.trim()),
  };

  return normalizeSurfaceState(project.backCover.surfaceState ?? fallback);
}
