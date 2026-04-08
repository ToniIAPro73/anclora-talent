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
      renderedImageUrl: project.cover.renderedImageUrl ?? null,
      backgroundImageUrl: project.cover.backgroundImageUrl ?? null,
      showSubtitle: project.cover.showSubtitle ?? true,
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
  // PAGINATE CHAPTERS
  // ─────────────────────────────────────────────────────────────

  let globalPageNumber = 2; // Content starts immediately after cover

  for (const chapter of chapterSections) {
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
        renderedImageUrl: project.backCover.renderedImageUrl ?? null,
        backgroundImageUrl: project.backCover.backgroundImageUrl ?? null,
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

type ChapterBlock = ProjectRecord['document']['chapters'][number]['blocks'][number];
