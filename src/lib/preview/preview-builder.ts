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
import { normalizeHtmlContent } from './html-normalize';

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

type OutlineEntryPageMetrics = {
  firstPageByOutlineTitle: Map<string, number>;
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

  const resolvedSections = buildResolvedChapterSections(project, config);

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

export function buildPreviewContentFlowHtml(
  project: ProjectRecord,
  config: PaginationConfig,
) {
  const resolvedSections = buildResolvedChapterSections(project, config);

  return resolvedSections
    .map((chapter) => reconcileOverflowBreaks(normalizeHtmlContent(chapter.html), config))
    .join('<hr data-page-break="manual">');
}

export function buildSyncedTocChapterContent(
  project: ProjectRecord,
  config: PaginationConfig,
) {
  const resolvedSections = buildResolvedChapterSections(project, config);
  const tocSection = resolvedSections.find((chapter) => isTocChapter(chapter.title));

  if (!tocSection) {
    return null;
  }

  return {
    chapterId: tocSection.id,
    chapterTitle: tocSection.title,
    html: tocSection.html,
  };
}

function buildResolvedChapterSections(
  project: ProjectRecord,
  config: PaginationConfig,
) {
  const chapterSections = buildChapterSections(project);
  return resolveTocChapterHtml(chapterSections, config, project);
}

function buildChapterSections(project: ProjectRecord): ChapterSection[] {
  const chapterSections: ChapterSection[] = [];

  if (!project.document.chapters?.length) {
    return chapterSections;
  }

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

  return chapterSections;
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

      const nextHtml = buildTocChapterHtml(project, currentSections, metrics, config, chapter.html);
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

function normalizeMatchKey(value: string) {
  return normalizeLookupKey(value).replace(/[^\p{Letter}\p{Number}\s]/gu, '');
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
  // Always use enough dots to fill the entire line, flexbox + overflow:hidden will handle the rest
  return '·'.repeat(300);
}

function buildTocChapterHtml(
  project: ProjectRecord,
  chapterSections: ChapterSection[],
  metrics: ChapterPageMetrics,
  config: PaginationConfig,
  fallbackHtml: string,
) {
  const outlineEntries = buildOutlineEntries(project, chapterSections);

  if (outlineEntries.length === 0) {
    return fallbackHtml;
  }

  const outlineMetrics = measureOutlineEntryPageMetrics(chapterSections, metrics, config, outlineEntries);

  const numberedEntries = outlineEntries
    .map((entry) => {
      const firstPage = outlineMetrics.firstPageByOutlineTitle.get(normalizeLookupKey(entry.title));
      if (!firstPage) {
        return null;
      }

      return {
        title: entry.title.trim(),
        level: Math.max(1, entry.level ?? 1),
        firstPage,
      };
    })
    .filter((entry): entry is { title: string; level: number; firstPage: number } => Boolean(entry));

  if (numberedEntries.length === 0) {
    return fallbackHtml;
  }

  return injectTocPageNumbers(fallbackHtml, numberedEntries);
}

function buildOutlineEntries(
  project: ProjectRecord,
  chapterSections: ChapterSection[],
) {
  const sourceOutline = project.document.source?.outline?.filter(
    (entry) => !isTocChapter(entry.title),
  );

  return sourceOutline && sourceOutline.length > 0
    ? sourceOutline
    : chapterSections
        .filter((chapter) => !isTocChapter(chapter.title))
        .map((chapter) => ({
          title: chapter.title,
          level: 1,
        }));
}

function measureOutlineEntryPageMetrics(
  chapterSections: ChapterSection[],
  metrics: ChapterPageMetrics,
  config: PaginationConfig,
  outlineEntries: Array<{ title: string; level: number }>,
): OutlineEntryPageMetrics {
  const firstPageByOutlineTitle = new Map<string, number>();
  const pageRecords: Array<{ pageNumber: number; chapterId: string; text: string }> = [];

  let globalPageNumber = 2;

  for (const chapter of chapterSections) {
    const reconciledChapterHtml = reconcileOverflowBreaks(chapter.html, config);
    const chapterPageHtmls = paginateContent(reconciledChapterHtml, config)
      .filter((page) => hasRenderablePageContent(page.html))
      .map((page) => page.html);

    const effectivePageHtmls = chapterPageHtmls.length > 0 ? chapterPageHtmls : [''];

    if (isTocChapter(chapter.title)) {
      globalPageNumber += effectivePageHtmls.length;
      continue;
    }

    if (chapterPageHtmls.length === 0) {
      pageRecords.push({
        pageNumber: globalPageNumber,
        chapterId: chapter.id,
        text: '',
      });
      globalPageNumber += 1;
      continue;
    }

    for (const pageHtml of chapterPageHtmls) {
      pageRecords.push({
        pageNumber: globalPageNumber,
        chapterId: chapter.id,
        text: normalizeMatchKey(stripHtmlTags(pageHtml)),
      });
      globalPageNumber += 1;
    }
  }

  let pageCursor = 0;

  for (const entry of outlineEntries) {
    const normalizedTitle = normalizeLookupKey(entry.title);
    const matchTitle = normalizeMatchKey(entry.title);

    const matchedPage = pageRecords.find((page, index) => {
      if (index < pageCursor) {
        return false;
      }

      return matchesOutlineText(page.text, matchTitle);
    });

    if (matchedPage) {
      firstPageByOutlineTitle.set(normalizedTitle, matchedPage.pageNumber);
      pageCursor = Math.max(pageCursor, pageRecords.indexOf(matchedPage));
      continue;
    }

    const matchingChapter = chapterSections.find((chapter) => {
      if (isTocChapter(chapter.title)) {
        return false;
      }

      return matchesOutlineText(normalizeMatchKey(chapter.title), matchTitle);
    });

    const fallbackPage = matchingChapter
      ? metrics.firstPageByChapterId.get(matchingChapter.id)
      : undefined;

    if (fallbackPage) {
      firstPageByOutlineTitle.set(normalizedTitle, fallbackPage);
    }
  }

  return {
    firstPageByOutlineTitle,
  };
}

function injectTocPageNumbers(
  html: string,
  numberedEntries: Array<{ title: string; level: number; firstPage: number }>,
) {
  const sanitizedHtml = stripExistingTocPageNumbers(html);
  let entryIndex = 0;

  return sanitizedHtml.replace(
    /<(p|li|h[1-6])(\s[^>]*)?>([\s\S]*?)<\/\1>/gi,
    (fullMatch, tagName: string, rawAttributes = '', innerHtml: string) => {
      if (entryIndex >= numberedEntries.length) {
        return fullMatch;
      }

      const plainText = normalizeMatchKey(stripHtmlTags(innerHtml));
      const expectedText = normalizeMatchKey(numberedEntries[entryIndex].title);

      if (!plainText || !matchesOutlineText(plainText, expectedText)) {
        return fullMatch;
      }

      const entry = numberedEntries[entryIndex];
      entryIndex += 1;

      return `<${tagName}${rawAttributes}><span data-toc-line="true" data-toc-level="${entry.level}"><span data-toc-title="true">${innerHtml}</span><span data-toc-leader="true" aria-hidden="true">${buildDotLeader(entry.level)}</span><span data-toc-page="true">${entry.firstPage}</span></span></${tagName}>`;
    },
  );
}

function stripExistingTocPageNumbers(html: string) {
  let current = html;
  let previous = '';

  while (current !== previous) {
    previous = current;
    current = current.replace(
      /<span data-toc-line="true"[^>]*>\s*<span data-toc-title="true">([\s\S]*?)<\/span>\s*<span data-toc-leader="true"[^>]*>[\s\S]*?<\/span>\s*<span data-toc-page="true">[\s\S]*?<\/span>\s*<\/span>/gi,
      '$1',
    );
  }

  return current;
}

function matchesOutlineText(candidate: string, target: string) {
  if (!candidate || !target) {
    return false;
  }

  return candidate === target || candidate.includes(target) || target.includes(candidate);
}

function stripHtmlTags(value: string) {
  return decodeHtmlEntities(value.replace(/<[^>]+>/g, ' '));
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#039;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&');
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
