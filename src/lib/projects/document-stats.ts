import type { ProjectDocument, DocumentChapter } from './types';
import { DEVICE_PAGINATION_CONFIGS, type PreviewFormat } from '@/lib/preview/device-configs';

export interface DocumentStats {
  wordCount: number;
  characterCount: number;
  pageCount: number;
  estimatedReadTime: number; // in minutes
  chapterCount: number;
  paragraphCount: number;
}

/**
 * Calculate word count from content
 * Strips HTML tags and counts whitespace-separated words
 */
export function calculateWordCount(content: string): number {
  if (!content) return 0;

  // Remove HTML tags
  const plainText = content.replace(/<[^>]*>/g, ' ');

  // Split by whitespace and filter empty strings
  const words = plainText.trim().split(/\s+/).filter((word) => word.length > 0);

  return words.length;
}

/**
 * Calculate character count from content
 * Strips HTML tags and counts all characters including spaces
 */
export function calculateCharacterCount(content: string): number {
  if (!content) return 0;

  // Remove HTML tags
  const plainText = content.replace(/<[^>]*>/g, '');

  return plainText.length;
}

/**
 * Estimate number of paragraphs from HTML content
 */
function calculateParagraphCount(content: string): number {
  if (!content) return 0;

  // Count paragraph tags and block elements
  const paragraphMatch = content.match(/<p[^>]*>/gi) || [];
  const headingMatch = content.match(/<h[1-6][^>]*>/gi) || [];
  const quoteMatch = content.match(/<blockquote[^>]*>/gi) || [];

  return paragraphMatch.length + headingMatch.length + quoteMatch.length;
}

/**
 * Estimate page count based on word count and device format
 * Uses average words per page based on pagination config
 * Calibrated to match standard book publishing (250-300 words per page)
 */
export function estimatePageCount(wordCount: number, format: PreviewFormat = 'laptop'): number {
  if (wordCount === 0) return 1;

  // Standard publishing benchmarks: 250-300 words per page depending on format
  // These values are calibrated to match typical printed book page counts
  const wordsPerPageByFormat: Record<PreviewFormat, number> = {
    laptop: 275,    // 6×9" standard book format
    tablet: 260,    // Slightly smaller, more conservative
    mobile: 200,    // Much narrower columns
    ereader: 280,   // Similar to book format
  };

  const wordsPerPage = wordsPerPageByFormat[format];

  // Calculate pages needed
  const pages = Math.ceil(wordCount / wordsPerPage);

  return Math.max(1, pages);
}

/**
 * Estimate reading time in minutes
 * Based on average reading speed of 200-250 words per minute
 */
export function estimateReadingTime(wordCount: number): number {
  const WORDS_PER_MINUTE = 225; // Average reading speed
  const minutes = Math.ceil(wordCount / WORDS_PER_MINUTE);
  return Math.max(1, minutes);
}

/**
 * Get comprehensive document statistics
 */
export function getDocumentStats(document: ProjectDocument, format: PreviewFormat = 'laptop'): DocumentStats {
  let totalWordCount = 0;
  let totalCharacterCount = 0;
  let totalParagraphCount = 0;

  // Calculate stats for all chapters
  for (const chapter of document.chapters) {
    for (const block of chapter.blocks) {
      const wordCount = calculateWordCount(block.content);
      const charCount = calculateCharacterCount(block.content);
      const paragraphCount = calculateParagraphCount(block.content);

      totalWordCount += wordCount;
      totalCharacterCount += charCount;
      totalParagraphCount += paragraphCount;
    }
  }

  const pageCount = estimatePageCount(totalWordCount, format);
  const readingTime = estimateReadingTime(totalWordCount);

  return {
    wordCount: totalWordCount,
    characterCount: totalCharacterCount,
    pageCount,
    estimatedReadTime: readingTime,
    chapterCount: document.chapters.length,
    paragraphCount: totalParagraphCount,
  };
}

/**
 * Format numbers with thousand separators
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat('es-ES').format(num);
}

/**
 * Format reading time in a human-readable way
 */
export function formatReadingTime(minutes: number): string {
  if (minutes < 1) return 'Menos de 1 minuto';
  if (minutes === 1) return '1 minuto';
  if (minutes < 60) return `${minutes} minutos`;

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (remainingMinutes === 0) {
    return hours === 1 ? '1 hora' : `${hours} horas`;
  }

  return `${hours}h ${remainingMinutes}m`;
}
