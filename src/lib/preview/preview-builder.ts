/**
 * Preview Builder - Anclora Talent Edition
 * Constructs pages for preview from project data
 *
 * Adapts Press preview architecture to Talent's ProjectRecord model
 * while maintaining premium UI contract compliance
 *
 * PAGINATION ARCHITECTURE (Commit 1):
 * - Each chapter is paginated independently using paginateContent
 * - Global page numbering across all chapters (cover=1, toc=2, content=3+)
 * - TOC reflects actual first-page numbers per chapter (not estimates)
 * - Back-cover numbered after all content pages
 */

import type { ProjectRecord } from '@/lib/projects/types';
import { PaginationConfig } from './device-configs';
import { paginateContent } from './content-paginator';

// ==================== TYPES ====================

export interface PreviewPage {
  type: 'cover' | 'toc' | 'content' | 'back-cover';
  content: string | null;
  coverData?: {
    title: string;
    subtitle?: string;
    author: string;
    palette: string;
  };
  backCoverData?: {
    title: string;
    body: string;
    authorBio: string;
  };
  tocEntries?: Array<{
    title: string;
    pageNumber: number;
    level: number;
  }>;
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
 * 2. TOC (page 2) - holds entry points for chapters
 * 3+ Content pages - each chapter paginated independently with global page numbers
 * Last: Back-cover
 */
export function buildPreviewPages(
  project: ProjectRecord,
  config: PaginationConfig,
): PreviewPage[] {
  const pages: PreviewPage[] = [];

  // ─────────────────────────────────────────────────────────────
  // PAGE 1: COVER
  // ─────────────────────────────────────────────────────────────
  pages.push({
    type: 'cover',
    content: null,
    coverData: {
      title: project.cover.title || 'Proyecto sin título',
      subtitle: project.cover.subtitle,
      author: project.document.author || 'Autor desconocido',
      palette: project.cover.palette,
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
      const chapterHtml = blocksToHtml(chapter.blocks);

      chapterSections.push({
        id: chapter.id,
        title: chapterTitle,
        html: chapterHtml || '<p><em>Contenido aún no disponible</em></p>',
        order: index,
      });
    });
  }

  // ─────────────────────────────────────────────────────────────
  // PAGINATE CHAPTERS AND BUILD TOC ENTRIES
  // ─────────────────────────────────────────────────────────────

  const tocEntries: Array<{ title: string; pageNumber: number; level: number }> = [];
  let globalPageNumber = 3; // Content starts at page 3 (after cover and TOC)

  // Track chapter first page for TOC
  const chapterFirstPages = new Map<string, number>();

  for (const chapter of chapterSections) {
    // Record first page of this chapter for TOC
    chapterFirstPages.set(chapter.id, globalPageNumber);

    // Add chapter heading + content to paginate together
    const chapterRecord = project.document.chapters.find((item) => item.id === chapter.id);
    const chapterContentHtml = chapterStartsWithTitle(chapterRecord?.blocks ?? [], chapter.title)
      ? chapter.html
      : `<h2>${escapeHtml(chapter.title)}</h2>\n${chapter.html}`;

    // Paginate this chapter's content
    const chapterPages = paginateContent(chapterContentHtml, config);

    // Add paginated pages with global numbering and chapter metadata
    for (const page of chapterPages) {
      pages.push({
        type: 'content',
        content: page.html,
        chapterTitle: chapter.title,
        chapterId: chapter.id,
        pageNumber: globalPageNumber,
      });
      globalPageNumber++;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // PAGE 2: TABLE OF CONTENTS (now with actual page numbers)
  // ─────────────────────────────────────────────────────────────

  chapterSections.forEach((chapter) => {
    const firstPageNumber = chapterFirstPages.get(chapter.id) || 3;
    tocEntries.push({
      title: chapter.title,
      pageNumber: firstPageNumber,
      level: 1,
    });
  });

  const tocHtml = generateTOCHtml(tocEntries, project.document.title);

  pages.splice(1, 0, {
    type: 'toc',
    content: tocHtml,
    tocEntries: tocEntries,
    pageNumber: 2,
  });

  // ─────────────────────────────────────────────────────────────
  // BACK COVER
  // ─────────────────────────────────────────────────────────────

  if (project.backCover) {
    pages.push({
      type: 'back-cover',
      content: null,
      backCoverData: {
        title: project.backCover.title || project.document.title,
        body: project.backCover.body,
        authorBio: project.backCover.authorBio,
      },
      pageNumber: globalPageNumber,
    });
  }

  return pages;
}

// ==================== HELPERS ====================

/**
 * Convert document blocks to HTML
 */
function blocksToHtml(blocks: ChapterBlock[]): string {
  return blocks
    .map((block) => {
      const content = block.block?.content || block.content || '';
      const type = block.block?.type || block.type || 'paragraph';

      if (content.trimStart().startsWith('<')) {
        return content;
      }

      const escaped = escapeHtml(content);
      if (type === 'heading') return `<h3>${escaped}</h3>`;
      if (type === 'quote') return `<blockquote><p>${escaped}</p></blockquote>`;
      return `<p>${escaped}</p>`;
    })
    .join('');
}

function chapterStartsWithTitle(blocks: ChapterBlock[], title: string): boolean {
  const firstBlock = blocks[0];
  if (!firstBlock) return false;

  const firstContent = String(firstBlock.block?.content || firstBlock.content || '').trim();
  if (!firstContent) return false;

  return firstContent.replace(/<[^>]+>/g, '').trim().toLowerCase() === title.trim().toLowerCase();
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (char) => map[char]);
}

/**
 * Generate TOC HTML
 */
function generateTOCHtml(
  entries: Array<{ title: string; pageNumber: number; level: number }>,
): string {
  const tocItems = entries
    .map(
      (entry) =>
        `<li style="margin-left: ${entry.level * 20}px; margin-bottom: 8px;">
        <span>${escapeHtml(entry.title)}</span>
        <span style="float: right; color: var(--text-tertiary);">p. ${entry.pageNumber}</span>
      </li>`,
    )
    .join('');

  return `
    <div style="padding: 2rem;">
      <h2 style="font-size: 1.5rem; font-weight: 900; margin-bottom: 1.5rem; color: var(--text-primary);">
        Índice
      </h2>
      <ul style="list-style: none; padding: 0; margin: 0; color: var(--text-secondary);">
        ${tocItems}
      </ul>
    </div>
  `;
}
type ChapterBlock = ProjectRecord['document']['chapters'][number]['blocks'][number];
