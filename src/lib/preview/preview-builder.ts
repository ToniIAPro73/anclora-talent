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
import { reconcileOverflowBreaks, stripAutoBreaks } from './editor-page-layout';
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
    html: stripAutoBreaks(tocSection.html),
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
      `<ul>${pendingItems.map((t) => `<li><span class="toc-title">${escapeHtml(t)}</span></li>`).join('')}</ul>`,
    );
    pendingItems = [];
  };

  for (const entry of entries) {
    if (isTocChapter(entry.title)) continue;
    if (entry.level >= 3) {
      pendingItems.push(entry.title);
    } else {
      flushItems();
      parts.push(`<h2><span class="toc-title">${escapeHtml(entry.title)}</span></h2>`);
    }
  }
  flushItems();

  return parts.join('\n');
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

  // RULE: If the original HTML has content, we keep it exactly as is.
  // We only synthesize a fresh TOC if the stored HTML is completely empty.
  // This preserves the original Word document layout and avoids duplicates.
  const isOriginalEmpty = visibleFromHtml.length === 0;
  
  const baseHtml = isOriginalEmpty
    ? buildTocHtmlFromEntries(outlineEntries)
    : stripExistingTocPageNumbers(fallbackHtml);

  return injectTocPageNumbers(baseHtml, numberedEntries);
}

function buildOutlineEntries(
  project: ProjectRecord,
  chapterSections: ChapterSection[],
  tocHtml: string,
) {
  const visibleTocEntries = extractTocRenderableEntries(tocHtml);
  const currentChapters = chapterSections
    .filter((chapter) => !isTocChapter(chapter.title))
    .map((chapter) => ({ title: chapter.title, level: 1 }));

  if (visibleTocEntries.length === 0) {
    const sourceOutline = project.document.source?.outline?.filter(
      (entry) => !isTocChapter(entry.title),
    );
    return sourceOutline && sourceOutline.length > 0 ? sourceOutline : currentChapters;
  }

  // MERGE: el índice visible es la fuente primaria. Suplementamos con:
  // - Entradas del `source.outline` original que no están visibles.
  // - Capítulos actuales (títulos reales) que no están visibles — esto cubre
  //   los capítulos añadidos por el usuario después de la importación.
  // Los capítulos eliminados desaparecen porque al re-inyectar no encuentran un
  // capítulo real que las respalde; injectTocPageNumbers marca las que no
  // coinciden con un número y después las entradas huérfanas se limpian.
  const existingKeys = visibleTocEntries
    .map((entry) => normalizeMatchKey(entry.title))
    .filter(Boolean);

  const isAlreadyRepresented = (candidateKey: string) => {
    if (!candidateKey) return true;
    return existingKeys.some(
      (key) => key === candidateKey || key.includes(candidateKey) || candidateKey.includes(key),
    );
  };

  const sourceOutline = project.document.source?.outline?.filter(
    (entry) => !isTocChapter(entry.title),
  );

  const supplementCandidates = [
    ...(sourceOutline ?? []),
    ...currentChapters,
  ];
  const supplementary: Array<{ title: string; level: number }> = [];
  const supplementKeys = new Set<string>();
  for (const entry of supplementCandidates) {
    const key = normalizeMatchKey(entry.title);
    if (!key) continue;
    if (isAlreadyRepresented(key)) continue;
    if (supplementKeys.has(key)) continue;
    supplementary.push(entry);
    supplementKeys.add(key);
  }

  return [...visibleTocEntries, ...supplementary];
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

    // Relajar el cursor: sub-entradas cuyo texto aparece en una página anterior
    // (p. ej. "Día 1" cuando "Introducción" ya consumió el cursor).
    const matchedIgnoringCursor = pageRecords.find((page) =>
      matchesOutlineText(page.text, matchTitle),
    );
    if (matchedIgnoringCursor) {
      firstPages.push(matchedIgnoringCursor.pageNumber);
      continue;
    }

    // Fallback por título de capítulo (sub-entradas sin texto coincidente).
    const matchingRecord = pageRecords.find(
      (page) =>
        matchesOutlineText(page.chapterTitle, matchTitle) ||
        matchesOutlineText(matchTitle, page.chapterTitle),
    );
    if (matchingRecord) {
      firstPages.push(matchingRecord.pageNumber);
      continue;
    }

    // Huérfana (p. ej. capítulo borrado que quedó en el índice persistido).
    // Marcamos con 0 para que se filtre de `numberedEntries` y no se re-inyecte.
    firstPages.push(0);
  }

  return {
    firstPages,
  };
}

function injectTocPageNumbers(
  html: string,
  numberedEntries: TocNumberedEntry[],
) {
  const remaining = numberedEntries.slice();

  // Formato objetivo (sin spans, sobrevive al roundtrip del editor):
  //   <tag data-toc-entry="true" data-toc-level="N" data-toc-page="M"><span class="toc-title">Título</span></tag>
  // CSS (::before + ::after con attr(data-toc-page)) pinta los puntos y el número.
  const withInjected = html.replace(
    /<(p|li|h[1-6])((?:\s[^>]*)?)>([\s\S]*?)<\/\1>/gi,
    (fullMatch, tagName: string, rawAttributes: string = '', innerHtml: string) => {
      const titleHtml = stripTocTitleSpans(extractTocTitleHtml(innerHtml));
      const plainText = normalizeMatchKey(stripHtmlTags(titleHtml));
      if (!plainText) return fullMatch;

      const matchIndex = remaining.findIndex((entry) => {
        const expected = normalizeMatchKey(entry.title);
        return expected && matchesOutlineText(plainText, expected);
      });
      if (matchIndex < 0) return fullMatch;

      const entry = remaining.splice(matchIndex, 1)[0];
      const attrs = ensureTocEntryAttributes(rawAttributes, entry.level, entry.firstPage);
      return `<${tagName}${attrs}><span class="toc-title">${titleHtml}</span></${tagName}>`;
    },
  );

  if (remaining.length === 0) {
    return withInjected;
  }

  const extraHtml = remaining
    .map((entry) => {
      const tag = entry.level <= 1 ? 'h2' : 'li';
      const attrs = ` data-toc-entry="true" data-toc-level="${Math.max(1, entry.level)}" data-toc-page="${entry.firstPage}"`;
      return `<${tag}${attrs}><span class="toc-title">${decodeHtmlEntities(entry.title)}</span></${tag}>`;
    })
    .join('');

  if (/<\/ul>/i.test(withInjected) && remaining.every((entry) => entry.level > 1)) {
    return withInjected.replace(/<\/ul>(?![\s\S]*<\/ul>)/i, `${extraHtml}</ul>`);
  }
  return `${withInjected}${extraHtml}`;
}

function stripTocTitleSpans(html: string) {
  return html
    .replace(/<span\s+[^>]*class="[^"]*\btoc-title\b[^"]*"[^>]*>([\s\S]*?)<\/span>/gi, '$1')
    .replace(/<span\s+data-toc-title="true"[^>]*>([\s\S]*?)<\/span>/gi, '$1');
}

function extractTocTitleHtml(innerHtml: string) {
  // Legacy: si el título estaba envuelto en un span semántico (con clase o data-*),
  // lo extraemos. Si no, el innerHtml ya es el texto del título.
  const titleSpan = innerHtml.match(/<span\s+[^>]*class="[^"]*\btoc-title\b[^"]*"[^>]*>([\s\S]*?)<\/span>/i);
  if (titleSpan) return titleSpan[1];

  let current = innerHtml
    .replace(/<span\s+[^>]*class="[^"]*\btoc-leader\b[^"]*"[^>]*>[\s\S]*?<\/span>/gi, '')
    .replace(/<span\s+[^>]*class="[^"]*\btoc-page\b[^"]*"[^>]*>[\s\S]*?<\/span>/gi, '')
    .replace(/<span\s+data-toc-leader="true"[^>]*>[\s\S]*?<\/span>/gi, '')
    .replace(/<span\s+data-toc-page="true"[^>]*>[\s\S]*?<\/span>/gi, '')
    .replace(/<span\s+data-toc-title="true"[^>]*>([\s\S]*?)<\/span>/gi, '$1');
  // Sufijo textual "…··· 5" heredado de importaciones antiguas.
  current = current.replace(/\s*[·.\-–—~∿]{2,}\s*\d+\s*$/u, '').trim();
  return current;
}

function ensureTocEntryAttributes(rawAttributes: string, level: number, page: number) {
  // Limpia atributos toc-* residuales (por si venían del HTML persistido).
  let attrs = (rawAttributes ?? '')
    .replace(/\sdata-toc-(entry|level|page)="[^"]*"/gi, '')
    .replace(/\sclass="([^"]*)"/gi, (_m, cls: string) => {
      const cleaned = cls
        .split(/\s+/)
        .filter((c: string) => c && !/^toc-/.test(c))
        .join(' ')
        .trim();
      return cleaned ? ` class="${cleaned}"` : '';
    });

  attrs = `${attrs} data-toc-entry="true" data-toc-level="${Math.max(1, level)}" data-toc-page="${page}"`;
  return attrs.startsWith(' ') ? attrs : ` ${attrs}`;
}

export function stripExistingTocPageNumbers(html: string) {
  let current = html;

  // 1. Spans semánticos legacy y nuevos (por class o por data-*)
  current = current.replace(/<span\s+data-toc-leader="true"[^>]*>[\s\S]*?<\/span>/gi, '');
  current = current.replace(/<span\s+data-toc-page="true"[^>]*>[\s\S]*?<\/span>/gi, '');
  current = current.replace(/<span\s+data-toc-title="true"[^>]*>([\s\S]*?)<\/span>/gi, '$1');
  current = current.replace(/<span\s+[^>]*class="[^"]*\btoc-leader\b[^"]*"[^>]*>[\s\S]*?<\/span>/gi, '');
  current = current.replace(/<span\s+[^>]*class="[^"]*\btoc-page\b[^"]*"[^>]*>[\s\S]*?<\/span>/gi, '');
  current = current.replace(
    /<span\s+[^>]*class="[^"]*\btoc-title\b[^"]*"[^>]*>([\s\S]*?)<\/span>/gi,
    '$1',
  );

  // También limpiar los spans que inyectamos nosotros para ellipsis
  current = current.replace(/<span\s+class="toc-title"[^>]*>([\s\S]*?)<\/span>/gi, '$1');

  // 2. Sufijos textuales "·····5" o "... 5" dentro del nodo
  current = current.replace(
    /(<(p|li|h[1-6])(?:\s[^>]*)?>)([\s\S]*?)(<\/\2>)/gi,
    (_m, open: string, _tag: string, inner: string, close: string) => {
      const cleaned = inner.replace(/\s*[·.\-–—~∿]{2,}\s*\d+\s*$/u, '').trim();
      return `${open}${cleaned}${close}`;
    },
  );

  // 3. Atributos data-toc-* residuales (entry/level/page) y clases toc-*
  current = current.replace(/\sdata-toc-(entry|level|page)="[^"]*"/gi, '');
  current = current.replace(/\sclass="([^"]*)"/gi, (_m, cls: string) => {
    const cleaned = cls
      .split(/\s+/)
      .filter((c: string) => c && !/^toc-/.test(c))
      .join(' ')
      .trim();
    return cleaned ? ` class="${cleaned}"` : '';
  });

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
