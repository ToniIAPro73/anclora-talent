/**
 * Source Document Metrics
 * Compares original source document page estimates with Talent paginated format
 *
 * Helps users understand the difference between their original document
 * and how it will be paginated in Talent's print formats
 */

import type { ProjectRecord } from './types';
import { getDocumentStats, estimatePageCount } from './document-stats';
import type { PreviewFormat } from '@/lib/preview/device-configs';

export interface SourceDocumentMetrics {
  fileName: string;
  fileType: string;
  estimatedSourcePages: number; // Estimated pages in original format
  talentPages: Record<PreviewFormat, number>; // Paginated pages by format
  pageReduction: Record<PreviewFormat, number>; // Percentage difference
}

/**
 * Extract file type from MIME type
 */
function getFileTypeLabel(mimeType: string): string {
  const typeMap: Record<string, string> = {
    'application/pdf': 'PDF',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word',
    'application/msword': 'Word (97-2003)',
    'text/plain': 'Texto',
    'text/markdown': 'Markdown',
    'application/vnd.oasis.opendocument.text': 'OpenDocument',
  };

  return typeMap[mimeType] || 'Documento';
}

/**
 * Estimate pages in source document
 * Uses Microsoft Word's default calculation: ~250 words per page
 * This accounts for 12pt font, 1.15 line spacing, 1" margins
 */
function estimateSourceDocumentPages(wordCount: number): number {
  const WORDS_PER_PAGE_SOURCE = 250; // Standard MS Word default
  return Math.max(1, Math.ceil(wordCount / WORDS_PER_PAGE_SOURCE));
}

/**
 * Calculate percentage difference between two page counts
 * Negative = reduction (Talent uses fewer pages)
 * Positive = expansion (Talent uses more pages)
 */
function calculatePageDifference(sourcPages: number, talentPages: number): number {
  if (sourcPages === 0) return 0;
  return Math.round(((talentPages - sourcPages) / sourcPages) * 100);
}

/**
 * Get comprehensive source document metrics and comparison
 */
export function getSourceDocumentMetrics(
  project: ProjectRecord,
): SourceDocumentMetrics | null {
  const source = project.document.source;

  // No source document metadata available
  if (!source) {
    return null;
  }

  // Get document stats
  const stats = getDocumentStats(project.document);

  // Estimate pages in source format
  const estimatedSourcePages = estimateSourceDocumentPages(stats.wordCount);

  // Calculate Talent format page counts
  const talentPages: Record<PreviewFormat, number> = {
    mobile: estimatePageCount(stats.wordCount, 'mobile'),
    tablet: estimatePageCount(stats.wordCount, 'tablet'),
    laptop: estimatePageCount(stats.wordCount, 'laptop'),
    ereader: estimatePageCount(stats.wordCount, 'ereader'),
  };

  // Calculate percentage differences
  const pageReduction: Record<PreviewFormat, number> = {
    mobile: calculatePageDifference(estimatedSourcePages, talentPages.mobile),
    tablet: calculatePageDifference(estimatedSourcePages, talentPages.tablet),
    laptop: calculatePageDifference(estimatedSourcePages, talentPages.laptop),
    ereader: calculatePageDifference(estimatedSourcePages, talentPages.ereader),
  };

  return {
    fileName: source.fileName,
    fileType: getFileTypeLabel(source.mimeType),
    estimatedSourcePages,
    talentPages,
    pageReduction,
  };
}

/**
 * Format source metrics as human-readable comparison
 * Example: "Word: ~45 páginas → Talent: 38 laptop · 41 tablet · 52 móvil (-16%)"
 */
export function formatSourceDocumentComparison(
  metrics: SourceDocumentMetrics | null,
): string {
  if (!metrics) {
    return 'Sin documento fuente';
  }

  const {
    fileType,
    estimatedSourcePages,
    talentPages,
    pageReduction,
  } = metrics;

  // Build Talent pages string
  const talentStr = [
    `${talentPages.laptop} laptop`,
    `${talentPages.tablet} tablet`,
    `${talentPages.mobile} móvil`,
  ].join(' · ');

  // Calculate average reduction
  const avgReduction = Math.round(
    (pageReduction.laptop +
      pageReduction.tablet +
      pageReduction.mobile +
      pageReduction.ereader) /
      4,
  );

  const reductionStr = avgReduction < 0 ? `${avgReduction}%` : `+${avgReduction}%`;

  return `${fileType}: ~${estimatedSourcePages} págs → Talent: ${talentStr} (${reductionStr})`;
}

/**
 * Format detailed source document breakdown
 */
export function formatSourceDocumentDetails(
  metrics: SourceDocumentMetrics | null,
): {
  source: string;
  comparison: string;
  details: string[];
} | null {
  if (!metrics) {
    return null;
  }

  const {
    fileName,
    fileType,
    estimatedSourcePages,
    talentPages,
    pageReduction,
  } = metrics;

  const source = `${fileType} (${fileName})`;
  const comparison = `${estimatedSourcePages} páginas estimadas`;

  const details = [
    `Laptop: ${talentPages.laptop} pág (${pageReduction.laptop > 0 ? '+' : ''}${pageReduction.laptop}%)`,
    `Tablet: ${talentPages.tablet} pág (${pageReduction.tablet > 0 ? '+' : ''}${pageReduction.tablet}%)`,
    `Móvil: ${talentPages.mobile} pág (${pageReduction.mobile > 0 ? '+' : ''}${pageReduction.mobile}%)`,
    `E-reader: ${talentPages.ereader} pág (${pageReduction.ereader > 0 ? '+' : ''}${pageReduction.ereader}%)`,
  ];

  return { source, comparison, details };
}
