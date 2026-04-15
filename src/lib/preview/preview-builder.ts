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
import { resolveBackCoverSurfaceFields } from '@/lib/projects/back-cover-surface-resolver';
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

interface ChapterSection {
  id: string;
  title: string;
  html: string;
  order: number;
}

type ChapterPageMetrics = {
  firstPageByChapterId: Map<string, number>;
  pageCountByChapterId: Map<string, number>;
};

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

  const resolvedSections = resolveTocChapterHtml(chapterSections, config, project);

  // ─────────────────────────────────────────────────────────────
  // PAGINATE CHAPTERS
  // ─────────────────────────────────────────────────────────────

  let globalPageNumber = 2; // Content starts immediately after cover

  for (const chapter of resolvedSections) {
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

function resolveTocChapterHtml(
  chapterSections: ChapterSection[],
  config: PaginationConfig,
  project: ProjectRecord,
) {
  let currentSections = chapterSections;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const metrics = measureChapterPageMetrics(currentSections, config);
    const nextSections = currentSections.map((chapter) => {
      if (!isTocChapter(chapter.title)) {
        return chapter;
      }

      const nextHtml = buildTocChapterHtml(project, chapterSections, metrics, chapter.html);
      return nextHtml === chapter.html ? chapter : { ...chapter, html: nextHtml };
    });

    const hasChanged = nextSections.some((section, index) => section.html !== currentSections[index]?.html);
    currentSections = nextSections;

    if (!hasChanged) {
      break;
    }
  }

  return currentSections;
}

function measureChapterPageMetrics(
  chapterSections: ChapterSection[],
  config: PaginationConfig,
): ChapterPageMetrics {
  const firstPageByChapterId = new Map<string, number>();
  const pageCountByChapterId = new Map<string, number>();

  let globalPageNumber = 2;

  for (const chapter of chapterSections) {
    const reconciledChapterHtml = reconcileOverflowBreaks(chapter.html, config);
    const chapterPageHtmls = paginateContent(reconciledChapterHtml, config)
      .filter((page) => hasRenderablePageContent(page.html))
      .map((page) => page.html);

    const pageCount = Math.max(chapterPageHtmls.length, 1);
    firstPageByChapterId.set(chapter.id, globalPageNumber);
    pageCountByChapterId.set(chapter.id, pageCount);
    globalPageNumber += pageCount;
  }

  return {
    firstPageByChapterId,
    pageCountByChapterId,
  };
}

function isTocChapter(title: string) {
  const normalized = title.trim().toLowerCase();
  return normalized === 'índice' || normalized === 'indice' || normalized === 'index';
}

function normalizeLookupKey(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function buildDotLeader(level: number) {
  const target = Math.max(24, 96 - level * 8);
  return '·'.repeat(target);
}

function buildTocChapterHtml(
  project: ProjectRecord,
  chapterSections: ChapterSection[],
  metrics: ChapterPageMetrics,
  fallbackHtml: string,
) {
  const chapterByNormalizedTitle = new Map(
    chapterSections.map((chapter) => [normalizeLookupKey(chapter.title), chapter]),
  );

  const sourceOutline = project.document.source?.outline?.filter(
    (entry) => !isTocChapter(entry.title),
  );

  const outlineEntries =
    sourceOutline && sourceOutline.length > 0
      ? sourceOutline
      : chapterSections
          .filter((chapter) => !isTocChapter(chapter.title))
          .map((chapter) => ({
            title: chapter.title,
            level: 1,
          }));

  if (outlineEntries.length === 0) {
    return fallbackHtml;
  }

  const lines = outlineEntries
    .map((entry) => {
      const chapter = chapterByNormalizedTitle.get(normalizeLookupKey(entry.title));
      if (!chapter) {
        return null;
      }

      const firstPage = metrics.firstPageByChapterId.get(chapter.id);
      if (!firstPage) {
        return null;
      }

      const cleanTitle = entry.title.trim();
      const level = Math.max(1, entry.level ?? 1);
      const dots = buildDotLeader(level);
      const paddingLeft = (level - 1) * 24;

      return `<p data-toc-entry="true" style="margin:0 0 0.55rem 0;padding-left:${paddingLeft}px;"><span data-toc-title="true">${escapeHtml(cleanTitle)}</span><span data-toc-leader="true" aria-hidden="true">${dots}</span><span data-toc-page="true">${firstPage}</span></p>`;
    })
    .filter(Boolean)
    .join('');

  if (!lines) {
    return fallbackHtml;
  }

  return `<h2>Índice</h2>${lines}`;
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
  const baseState = normalizeSurfaceState(project.backCover.surfaceState ?? fallback);
  return {
    ...baseState,
    fields: {
      ...baseState.fields,
      ...resolveBackCoverSurfaceFields(project, baseState),
    },
  };
}
