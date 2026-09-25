'use client';

import * as React from 'react';
import type { DocumentChapter, DocumentBlock } from '@/lib/projects/types';

interface ChapterRepresentativePreviewProps {
  chapter: DocumentChapter;
  locale?: 'es' | 'en';
  maxBlocks?: number;
  maxWords?: number;
  styleMap?: import('@/lib/style-engine/model').DocumentStyleMap | null;
}

/**
 * Extracts a clean, semantic preview excerpt from chapter blocks.
 * Filters out heading nodes that repeat the chapter title or number,
 * and collects the first meaningful body blocks within a bounded budget.
 */
function extractRepresentativeBlocks(
  chapter: DocumentChapter,
  maxBlocks = 3,
  maxWords = 220
): { previewHtml: string; hasMore: boolean } {
  if (!chapter.blocks || chapter.blocks.length === 0) {
    return { previewHtml: '', hasMore: false };
  }

  const normalizedTitle = chapter.title.trim().toLowerCase();
  const meaningfulBlocks: DocumentBlock[] = [];
  let accumulatedWords = 0;
  let totalMeaningfulCount = 0;

  for (const block of chapter.blocks) {
    const rawContent = block.content.trim();
    if (!rawContent) continue;

    const textOnly = rawContent.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
    if (!textOnly) continue;

    // Filter out redundant structural title or chapter-number repeats at the start
    const isRedundantTitle =
      (block.type === 'heading' || meaningfulBlocks.length === 0) &&
      (textOnly === normalizedTitle ||
        textOnly.startsWith(`capítulo ${chapter.order}`) ||
        textOnly.startsWith(`capitulo ${chapter.order}`) ||
        textOnly.startsWith(`chapter ${chapter.order}`));

    if (isRedundantTitle) {
      continue;
    }

    totalMeaningfulCount++;

    if (meaningfulBlocks.length < maxBlocks && accumulatedWords < maxWords) {
      meaningfulBlocks.push(block);
      const blockWords = textOnly.split(/\s+/).length;
      accumulatedWords += blockWords;
    }
  }

  if (meaningfulBlocks.length === 0) {
    // If all blocks were filtered as redundant titles, use the first block anyway
    const fallbackBlock = chapter.blocks[0];
    return {
      previewHtml: fallbackBlock ? sanitizeBlockHtml(fallbackBlock.content) : '',
      hasMore: chapter.blocks.length > 1,
    };
  }

  const hasMore = totalMeaningfulCount > meaningfulBlocks.length;
  const previewHtml = meaningfulBlocks.map((b) => sanitizeBlockHtml(b.content)).join('');

  return { previewHtml, hasMore };
}

/**
 * Ensures block HTML has valid wrapping and semantic tags.
 */
function sanitizeBlockHtml(html: string): string {
  const trimmed = html.trim();
  if (!trimmed) return '';

  // If already wrapped in a block-level tag, return as is
  if (/^<(p|h[1-6]|ul|ol|blockquote|div)[\s>]/i.test(trimmed)) {
    return trimmed;
  }

  return `<p>${trimmed}</p>`;
}

export function ChapterRepresentativePreview({
  chapter,
  locale = 'es',
  maxBlocks = 3,
  maxWords = 220,
  styleMap,
}: ChapterRepresentativePreviewProps) {
  const { previewHtml, hasMore } = React.useMemo(
    () => extractRepresentativeBlocks(chapter, maxBlocks, maxWords),
    [chapter, maxBlocks, maxWords]
  );

  if (!previewHtml) {
    return (
      <div className="chapter-rep-preview__empty text-[var(--text-tertiary)] italic py-8 text-center text-sm">
        {locale === 'en' ? 'This chapter has no content yet.' : 'Este capítulo todavía no tiene contenido.'}
      </div>
    );
  }

  return (
    <div
      className="chapter-rep-preview relative"
      data-testid="chapter-representative-preview"
      style={styleMap?.body.fontFamily ? { fontFamily: styleMap.body.fontFamily, color: styleMap.body.color } : undefined}
    >
      <div
        className="chapter-rep-preview__body"
        dangerouslySetInnerHTML={{ __html: previewHtml }}
      />
      {hasMore && (
        <div className="chapter-rep-preview__fade-boundary pointer-events-none mt-4 flex items-center justify-center pt-2">
          <span className="text-xs text-[var(--text-tertiary)] opacity-60 font-serif tracking-widest">
            · · ·
          </span>
        </div>
      )}
    </div>
  );
}
