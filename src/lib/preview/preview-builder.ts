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
  firstPages: number[];
};

type TocNumberedEntry = {
  title: string;
  level: number;
  firstPage: number;
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

  const resolvedSections = buildChapterSections(project);

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
  const resolvedSections = buildChapterSections(project);

  return resolvedSections
    .map((chapter) => reconcileOverflowBreaks(normalizeHtmlContent(chapter.html), config))
    .join('<hr data-page-break="manual">');
}

export function buildSyncedTocChapterContent(
  project: ProjectRecord,
  config: PaginationConfig,
) {
  const resolvedSections = buildDerivedChapterSections(project, config);
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

export function buildDerivedChapterSections(
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

export function isTocChapter(title: string) {
  const normalized = title
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '');
  return [
    'indice',
    'index',
    'tabla de contenidos',
    'tabla de contenido',
    'table of contents',
    'contents',
    'contenidos',
    'contenido',
    'sumario',
  ].includes(normalized);
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

// Matches major structural headings that should appear as level-1 entries in the
// generated TOC. Used to identify "extra" entries from source.outline (e.g.,
// "CIERRE: LA VISIBILIDAD SOSTENIBLE") that were not generated as chapters.
const MAJOR_HEADING_RE =
  /^(?:cap[ií]tulo|chapter|introducci[oó]n|pr[oó]logo|prologo|[íi]ndice|indice|fase\s+\d+|parte\s+\d+|secci[oó]n|ep[ií]logo|cierre|despu[eé]s\s+de|recursos(?:\s+recomendados)?|anexos?)(?:\b|:)/i;

function escapeHtml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Build a plain TOC HTML string from a list of outline entries.
 * Level < 3 → <h2> block; level ≥ 3 → <li> inside <ul>.
 * Used when supplements were added to outlineEntries so that the fresh HTML
 * contains ALL entries (including CIERRE-like ones not in the stored chapter HTML).
 */
function buildTocHtmlFromEntries(
  entries: Array<{ title: string; level: number }>,
): string {
  const parts: string[] = [];
  let pendingItems: string[] = [];

  const flushItems = () => {
    if (pendingItems.length === 0) return;
    parts.push(
      `<ul>${pendingItems.map((t) => `<li>${escapeHtml(t)}</li>`).join('')}</ul>`,
    );
    pendingItems = [];
  };

  for (const entry of entries) {
    if (isTocChapter(entry.title)) continue;
    if (entry.level >= 3) {
      pendingItems.push(entry.title);
    } else {
      flushItems();
      parts.push(`<h2>${escapeHtml(entry.title)}</h2>`);
    }
  }
  flushItems();

  return parts.join('\n');
}

function buildDotLeader(level: number) {
  // Keep the persisted HTML lightweight. The full visual leader is rendered by CSS.
  return '····';
}

function buildTocChapterHtml(
  project: ProjectRecord,
  chapterSections: ChapterSection[],
  metrics: ChapterPageMetrics,
  config: PaginationConfig,
  fallbackHtml: string,
) {
  // Count visible entries in stored HTML *before* supplementing, so we can detect
  // whether buildOutlineEntries added any new entries from source.outline.
  const visibleFromHtml = extractTocRenderableEntries(fallbackHtml);

  const outlineEntries = buildOutlineEntries(project, chapterSections, fallbackHtml);

  if (outlineEntries.length === 0) {
    return fallbackHtml;
  }

  const outlineMetrics = measureOutlineEntryPageMetrics(chapterSections, metrics, config, outlineEntries);

  const numberedEntries = outlineEntries
    .map((entry, index) => {
      const firstPage = outlineMetrics.firstPages[index];
      if (!firstPage) {
        return null;
      }

      return {
        title: entry.title.trim(),
        level: Math.max(1, entry.level ?? 1),
        firstPage,
      };
    })
    .filter((entry): entry is TocNumberedEntry => Boolean(entry));

  if (numberedEntries.length === 0) {
    return fallbackHtml;
  }

  // If supplements were added (outlineEntries has more entries than what was in
  // the stored HTML), we must generate fresh HTML so all entries — including the
  // newly added ones like "CIERRE" — appear in the output.
  // Also synthesize if the stored HTML was basically empty (e.g. initial import
  // without a proper TOC).
  // Otherwise inject page numbers directly into the stored HTML to preserve the
  // original Word document layout and formatting.
  const hasSupplement = outlineEntries.length > visibleFromHtml.length;
  const isOriginalEmpty = visibleFromHtml.length === 0;
  
  const baseHtml = (hasSupplement || isOriginalEmpty) 
    ? buildTocHtmlFromEntries(outlineEntries) 
    : fallbackHtml;

  return injectTocPageNumbers(baseHtml, numberedEntries);
}

function buildOutlineEntries(
  project: ProjectRecord,
  chapterSections: ChapterSection[],
  tocHtml: string,
) {
  const visibleTocEntries = extractTocRenderableEntries(tocHtml);

  // Check for entries that should be in the TOC but are absent from the stored
  // HTML. This happens for projects imported before the full TOC generation was
  // in place (e.g. CIERRE, Después de los 30 días, Recursos recomendados).
  const existingKeys = new Set(
    visibleTocEntries.map((e) => normalizeLookupKey(e.title)),
  );

  const chapterKeys = new Set(
    chapterSections
      .filter((ch) => !isTocChapter(ch.title))
      .map((ch) => normalizeLookupKey(ch.title)),
  );

  // 1. Actual chapters not present in the stored TOC (added after import, or
  //    missing from old generated index).
  const missingChapters = chapterSections
    .filter(
      (ch) =>
        !isTocChapter(ch.title) &&
        !existingKeys.has(normalizeLookupKey(ch.title)),
    )
    .map((ch) => ({ title: ch.title, level: 1 as const }));

  // 2. MAJOR_HEADING_RE entries from source.outline that are not already in
  //    the stored TOC and are not actual chapters (e.g. "CIERRE: LA VISIBILIDAD
  //    SOSTENIBLE" from the stale Word TOC cache).
  const majorSupplements = (project.document.source?.outline ?? [])
    .filter((entry) => !isTocChapter(entry.title))
    .filter((entry) => !existingKeys.has(normalizeLookupKey(entry.title)))
    .filter((entry) => !chapterKeys.has(normalizeLookupKey(entry.title)))
    .filter((entry) => MAJOR_HEADING_RE.test(entry.title.trim()))
    // De-duplicate (same title may appear multiple times in the raw outline)
    .filter(
      (entry, idx, arr) =>
        arr.findIndex(
          (e) => normalizeLookupKey(e.title) === normalizeLookupKey(entry.title),
        ) === idx,
    )
    .map((entry) => ({ title: entry.title, level: 1 as const }));

  const allSupplements = [...majorSupplements, ...missingChapters];

  if (allSupplements.length === 0) {
    return visibleTocEntries;
  }

  if (visibleTocEntries.length === 0) {
    // If we have NO visible entries, use the full outline or just the chapters
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

  // Insert supplements after the last minor-heading cluster (e.g. last Día X
  // entry, level ≥ 3 from <li>), but before the first subsequent major entry
  // (level < 3, e.g. "Después de los 30 días"). This positions CIERRE between
  // Día 30 and any tail chapters.
  let lastMinorIdx = -1;
  for (let i = 0; i < visibleTocEntries.length; i++) {
    if (visibleTocEntries[i].level >= 3) lastMinorIdx = i;
  }

  let insertAt = visibleTocEntries.length;
  if (lastMinorIdx >= 0) {
    for (let i = lastMinorIdx + 1; i < visibleTocEntries.length; i++) {
      if (visibleTocEntries[i].level < 3) {
        insertAt = i;
        break;
      }
    }
  }

  return [
    ...visibleTocEntries.slice(0, insertAt),
    ...allSupplements,
    ...visibleTocEntries.slice(insertAt),
  ];
}

function extractTocRenderableEntries(html: string) {
  const sanitizedHtml = stripExistingTocPageNumbers(html);
  const entries: Array<{ title: string; level: number }> = [];

  sanitizedHtml.replace(
    /<(p|li|h[1-6])(\s[^>]*)?>([\s\S]*?)<\/\1>/gi,
    (_fullMatch, tagName: string, _rawAttributes = '', innerHtml: string) => {
      const plainText = stripExistingTocSuffix(
        normalizeVisibleText(stripHtmlTags(innerHtml)),
      );

      if (!plainText || isTocChapter(plainText) || !/[^\d\s·~∿.-]/u.test(plainText)) {
        return '';
      }

      entries.push({
        title: plainText,
        level: resolveTocEntryLevel(tagName),
      });

      return '';
    },
  );

  return entries;
}

function resolveTocEntryLevel(tagName: string) {
  if (/^h[1-6]$/i.test(tagName)) {
    return Math.max(1, Number.parseInt(tagName.slice(1), 10) || 1);
  }

  if (tagName.toLowerCase() === 'li') {
    return 3;
  }

  return 2;
}

function measureOutlineEntryPageMetrics(
  chapterSections: ChapterSection[],
  metrics: ChapterPageMetrics,
  config: PaginationConfig,
  outlineEntries: Array<{ title: string; level: number }>,
): OutlineEntryPageMetrics {
  const firstPages: number[] = [];
  const pageRecords: Array<{
    pageNumber: number;
    chapterId: string;
    chapterTitle: string;
    text: string;
  }> = [];

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
        chapterTitle: normalizeMatchKey(chapter.title),
        text: '',
      });
      globalPageNumber += 1;
      continue;
    }

    for (const pageHtml of chapterPageHtmls) {
      pageRecords.push({
        pageNumber: globalPageNumber,
        chapterId: chapter.id,
        chapterTitle: normalizeMatchKey(chapter.title),
        text: normalizeMatchKey(stripHtmlTags(pageHtml)),
      });
      globalPageNumber += 1;
    }
  }

  let pageCursor = 0;

  for (const entry of outlineEntries) {
    const matchTitle = normalizeMatchKey(entry.title);

    const matchedPage = pageRecords.find((page, index) => {
      if (index < pageCursor) {
        return false;
      }

      return (
        matchesOutlineText(page.text, matchTitle) ||
        matchesOutlineText(page.chapterTitle, matchTitle)
      );
    });

    if (matchedPage) {
      const matchIndex = pageRecords.indexOf(matchedPage);
      firstPages.push(matchedPage.pageNumber);
      pageCursor = matchIndex + 1;
      continue;
    }

    // Try to find the chapter that likely contains this sub-entry
    const matchingRecord = pageRecords.find((page) => {
      return matchesOutlineText(page.chapterTitle, matchTitle) || matchesOutlineText(matchTitle, page.chapterTitle);
    });

    if (matchingRecord) {
      firstPages.push(matchingRecord.pageNumber);
      // We don't advance pageCursor for fallbacks to avoid skipping other entries 
      // that might have better matches later.
      continue;
    }

    const fallbackPage = metrics.firstPageByChapterId.get(chapterSections.find(c => !isTocChapter(c.title))?.id ?? '');
    if (fallbackPage) {
      firstPages.push(fallbackPage);
    } else {
      firstPages.push(0);
    }
  }

  return {
    firstPages,
  };
}

function injectTocPageNumbers(
  html: string,
  numberedEntries: TocNumberedEntry[],
) {
  const sanitizedHtml = stripExistingTocPageNumbers(html);
  
  let entryIndex = 0;

  return sanitizedHtml.replace(
    /<(p|li|h[1-6])(\s[^>]*)?>([\s\S]*?)<\/\1>/gi,
    (fullMatch, tagName: string, rawAttributes = '', innerHtml: string) => {
      if (entryIndex >= numberedEntries.length) {
        return fullMatch;
      }

      const plainText = normalizeMatchKey(
        stripExistingTocSuffix(stripHtmlTags(innerHtml)),
      );

      if (!plainText) {
        return fullMatch;
      }

      // Try to find if THIS line exists ANYWHERE in the remaining numbered entries.
      let matchIdx = -1;
      for (let i = entryIndex; i < numberedEntries.length; i++) {
        const expected = normalizeMatchKey(numberedEntries[i].title);
        if (matchesOutlineText(plainText, expected)) {
          matchIdx = i;
          break;
        }
      }

      if (matchIdx === -1) {
        return fullMatch;
      }

      // Found a match! Use it and advance entryIndex to the one after it to maintain sequence.
      const entry = numberedEntries[matchIdx];
      entryIndex = matchIdx + 1;

      // Strip any inline page-number suffix (e.g., "----3", "····5") that the
      // original Word TOC may have embedded in the entry text.
      const cleanInnerHtml = innerHtml.replace(/\s*[-–—·.~∿]{1,}\s*\d+\s*$/, '').trim();

      return `<${tagName}${rawAttributes} data-toc-entry="true" data-toc-level="${entry.level}"><span data-toc-title="true">${cleanInnerHtml}</span><span data-toc-leader="true" aria-hidden="true">${buildDotLeader(entry.level)}</span><span data-toc-page="true">${entry.firstPage}</span></${tagName}>`;
    },
  );
}

export function stripExistingTocPageNumbers(html: string) {
  let current = html;

  // 1. Remove the data-toc-page spans and leaders first
  current = current.replace(/<span data-toc-leader="true"[^>]*>[\s\S]*?<\/span>/gi, '');
  current = current.replace(/<span data-toc-page="true"[^>]*>[\s\S]*?<\/span>/gi, '');
  
  // 2. Unwrap the title span if it exists
  current = current.replace(/<span data-toc-title="true">([\s\S]*?)<\/span>/gi, '$1');
  
  // 3. Remove all data-toc attributes from parent tags
  current = current.replace(/\sdata-toc-entry="true"/gi, '');
  current = current.replace(/\sdata-toc-level="[^"]*"/gi, '');

  return current.trim();
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

function normalizeVisibleText(value: string) {
  return decodeHtmlEntities(value)
    .replace(/\s+/g, ' ')
    .trim();
}

function stripExistingTocSuffix(value: string) {
  return value
    .replace(/\s*[·.\-–—~∿]+\s*\d+\s*$/u, '')
    .trim();
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
