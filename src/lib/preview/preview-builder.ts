/**
 * Preview Builder - Anclora Talent Edition
 * Constructs pages for preview from project data
 *
 * Adapts Press preview architecture to Talent's ProjectRecord model
 * while maintaining premium UI contract compliance
 */

import type { ProjectRecord } from '@/lib/projects/types';
import { PaginationConfig } from './device-configs';

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
  pageNumber?: number;
}

// ==================== PAGE BUILDER ====================

/**
 * Build preview pages from project data
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
  // BUILD CONTENT STRUCTURE (for TOC and content pages)
  // ─────────────────────────────────────────────────────────────

  interface ContentSection {
    title: string;
    content: string;
    isChapter: boolean;
    chapterNumber?: number;
  }

  const sections: ContentSection[] = [];

  // Add document source outline if exists
  if (project.document.source?.outline && project.document.source.outline.length > 0) {
    // Source outline available - use as reference
    sections.push({
      title: 'Estructura original',
      content: `<p>Documento importado: ${project.document.source.fileName}</p>`,
      isChapter: false,
    });
  }

  // Add chapters
  if (project.document.chapters && project.document.chapters.length > 0) {
    const sortedChapters = [...project.document.chapters].sort(
      (a, b) => a.order - b.order,
    );

    sortedChapters.forEach((chapter, index) => {
      const chapterTitle = chapter.title?.trim() || `Capítulo ${index + 1}`;
      const chapterHtml = blocksToHtml(chapter.blocks);

      sections.push({
        title: chapterTitle,
        content: chapterHtml || '<p><em>Contenido aún no disponible</em></p>',
        isChapter: true,
        chapterNumber: index + 1,
      });
    });
  }

  // ─────────────────────────────────────────────────────────────
  // PAGE 2: TABLE OF CONTENTS
  // ─────────────────────────────────────────────────────────────

  const tocEntries: Array<{ title: string; pageNumber: number; level: number }> = [];
  let currentPageNumber = 3; // Content starts at page 3

  sections.forEach((section) => {
    tocEntries.push({
      title: section.title,
      pageNumber: currentPageNumber,
      level: section.isChapter ? 1 : 0,
    });

    // Estimate pages per section (rough: 1 page per 2000 chars)
    const estimatedPages = Math.max(
      1,
      Math.ceil(section.content.length / 2000),
    );
    currentPageNumber += estimatedPages;
  });

  // Generate TOC HTML
  const tocHtml = generateTOCHtml(tocEntries, project.document.title);

  pages.push({
    type: 'toc',
    content: tocHtml,
    tocEntries: tocEntries,
    pageNumber: 2,
  });

  // ─────────────────────────────────────────────────────────────
  // PAGE 3+: CONTENT PAGES
  // ─────────────────────────────────────────────────────────────

  let fullContent = '';

  sections.forEach((section) => {
    if (section.isChapter) {
      fullContent += `<h2>${escapeHtml(section.title)}</h2>\n${section.content}\n\n`;
    } else {
      fullContent += `${section.content}\n\n`;
    }
  });

  if (!fullContent.trim()) {
    fullContent = '<p><em>Todavía no hay contenido para previsualizar.</em></p>';
  }

  pages.push({
    type: 'content',
    content: fullContent,
    pageNumber: 3,
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
      pageNumber: pages.length + 1,
    });
  }

  return pages;
}

// ==================== HELPERS ====================

/**
 * Convert document blocks to HTML
 */
function blocksToHtml(blocks: any[]): string {
  return blocks
    .map((block) => {
      if (block.content.trimStart().startsWith('<')) {
        return block.content;
      }

      const escaped = escapeHtml(block.content);
      if (block.type === 'heading') return `<h3>${escaped}</h3>`;
      if (block.type === 'quote') return `<blockquote><p>${escaped}</p></blockquote>`;
      return `<p>${escaped}</p>`;
    })
    .join('');
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
  documentTitle: string,
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
