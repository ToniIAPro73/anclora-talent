/**
 * Chapter Page Metrics
 * Compute per-chapter page counts for each device format
 *
 * Used in editor to display how many pages each chapter occupies
 * across different device formats (mobile, tablet, laptop)
 */

import type { ProjectRecord } from '@/lib/projects/types';
import { chapterBlocksToHtml } from '@/lib/projects/chapter-html';
import { countRenderablePages, paginateContent } from './content-paginator';
import { DEVICE_PAGINATION_CONFIGS, type PreviewFormat } from './device-configs';
import { normalizeHtmlContent } from './html-normalize';
import { reconcileOverflowBreaks } from './editor-page-layout';

// ==================== TYPES ====================

export interface ChapterPageMetrics {
  chapterId: string;
  title: string;
  pagesByFormat: Record<PreviewFormat, number>;
}

// ==================== METRICS COMPUTATION ====================

/**
 * Compute page metrics for each chapter across all device formats
 *
 * Returns an array of metrics showing how many pages each chapter
 * occupies in mobile, tablet, and laptop formats
 */
export function computeChapterPageMetrics(
  project: ProjectRecord,
): ChapterPageMetrics[] {
  if (!project.document.chapters || project.document.chapters.length === 0) {
    return [];
  }

  const formats: PreviewFormat[] = ['mobile', 'tablet', 'laptop'];
  const metrics: ChapterPageMetrics[] = [];

  // Sort chapters by order
  const sortedChapters = [...project.document.chapters].sort(
    (a, b) => a.order - b.order,
  );

  // Compute metrics for each chapter
  for (const chapter of sortedChapters) {
    const title = chapter.title?.trim() || `Capítulo`;
    const chapterHtml = chapterBlocksToHtml(chapter.blocks);

    const pagesByFormat: Record<PreviewFormat, number> = {
      mobile: 0,
      tablet: 0,
      laptop: 0,
      ereader: 0,
    };

    // Paginate for each format
    for (const format of formats) {
      const config = DEVICE_PAGINATION_CONFIGS[format];
      const canonicalHtml = normalizeHtmlContent(
        reconcileOverflowBreaks(chapterHtml, config),
      );
      const pages = paginateContent(canonicalHtml, config);
      pagesByFormat[format] = countRenderablePages(pages);
    }

    metrics.push({
      chapterId: chapter.id,
      title,
      pagesByFormat,
    });
  }

  return metrics;
}

/**
 * Get metrics for a specific chapter
 */
export function getChapterMetrics(
  metrics: ChapterPageMetrics[],
  chapterId: string,
): ChapterPageMetrics | undefined {
  return metrics.find((m) => m.chapterId === chapterId);
}

/**
 * Format page count for display
 * Example: "≈ 3 pág móvil · 2 tablet · 1 desktop"
 */
export function formatChapterPageMetrics(metrics: ChapterPageMetrics): string {
  const parts = [];

  if (metrics.pagesByFormat.mobile) {
    parts.push(`${metrics.pagesByFormat.mobile} pág móvil`);
  }
  if (metrics.pagesByFormat.tablet) {
    parts.push(`${metrics.pagesByFormat.tablet} tablet`);
  }
  if (metrics.pagesByFormat.laptop) {
    parts.push(`${metrics.pagesByFormat.laptop} desktop`);
  }

  return parts.length > 0 ? `≈ ${parts.join(' · ')}` : '-';
}
