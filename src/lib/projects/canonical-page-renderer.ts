import type { DocumentChapter } from './types';
import {
  chapterBlocksToHtml,
  } from './chapter-html';
import type { CanonicalPage, ContentSlice, SourcePageKind, SourceSurfaceKind } from './source-page-map';
import { flattenProjectBlocks } from './source-page-map';

export interface RenderedCanonicalPage {
  globalPageNumber: number;
  sourcePageNumber?: number;
  pageKind?: SourcePageKind;
  surfaceKind?: SourceSurfaceKind;
  sectionIds: string[];
  footnoteIds: string[];
  mappingStatus: CanonicalPage['mappingStatus'];
  html: string;
}

const ENTITY_LENGTHS: Record<string, string> = {
  '&nbsp;': ' ', '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#039;': "'",
};

function decodeEntity(value: string): string {
  return ENTITY_LENGTHS[value] ?? value;
}

/**
 * Crops a rich HTML block by its document-text offsets without flattening
 * marks, attributes, or paragraph decoration. The source map offsets are
 * offsets in the normalized document text, not offsets in the HTML string.
 */
export function sliceRichHtml(html: string, fromOffset: number, toOffset: number): string {
  if (fromOffset <= 0 && toOffset >= textLength(html)) return html;
  const tokens = html.match(/<!--[\s\S]*?-->|<[^>]*>|[^<]+/g) ?? [];
  let textOffset = 0;
  let emitted = false;
  const openTags: string[] = [];
  const pendingTags: string[] = [];
  const output: string[] = [];

  for (const token of tokens) {
    if (token.startsWith('<')) {
      if (/^<\s*\//.test(token)) {
        const tag = token.match(/^<\s*\/\s*([^\s>]+)/)?.[1]?.toLowerCase();
        if (emitted && tag) output.push(token);
        if (tag) {
          const index = openTags.lastIndexOf(tag);
          if (index >= 0) openTags.splice(index, 1);
        }
      } else {
        const tag = token.match(/^<\s*([^\s/>]+)/)?.[1]?.toLowerCase();
        if (emitted) output.push(token);
        else pendingTags.push(token);
        if (tag && !/\/\s*>$/.test(token) && !/^(br|img|hr|meta|input|source)$/.test(tag)) openTags.push(tag);
      }
      continue;
    }

    const decoded = token.replace(/&(?:nbsp|amp|lt|gt|quot);|&#039;/g, decodeEntity);
    const start = Math.max(0, fromOffset - textOffset);
    const end = Math.min(decoded.length, toOffset - textOffset);
    if (end > start) {
      if (!emitted) {
        emitted = true;
        output.push(...pendingTags);
      }
      output.push(token.slice(start, Math.min(token.length, end)));
    }
    textOffset += decoded.length;
    if (textOffset >= toOffset) break;
  }

  if (!emitted) return '';
  for (let index = openTags.length - 1; index >= 0; index -= 1) {
    output.push(`</${openTags[index]}>`);
  }
  return output.join('');
}

function textLength(html: string): number {
  return (html.replace(/<[^>]*>/g, ' ').replace(/&(?:nbsp|amp|lt|gt|quot);|&#039;/g, decodeEntity)).length;
}

export function renderCanonicalPageSlices(
  chapters: DocumentChapter[],
  page: CanonicalPage,
): RenderedCanonicalPage {
  const blocks = new Map(flattenProjectBlocks(chapters).map((block) => [block.id, block]));
  const htmlByBlock = new Map<string, string>();
  for (const slice of page.contentSlices) {
    const block = blocks.get(slice.blockId);
    if (!block) continue;
    const blockHtml = htmlByBlock.get(block.id) ?? chapterBlocksToHtml([block]);
    htmlByBlock.set(block.id, blockHtml);
  }
  const html = page.contentSlices
    .map((slice: ContentSlice) => {
      const blockHtml = htmlByBlock.get(slice.blockId);
      if (!blockHtml) return '';
      return sliceRichHtml(blockHtml, slice.fromOffset, slice.toOffset);
    })
    .filter(Boolean)
    .join('\n');
  return { ...page, html };
}

export function renderCanonicalDocumentPages(
  chapters: DocumentChapter[],
  pages: CanonicalPage[],
): RenderedCanonicalPage[] {
  return pages.map((page) => renderCanonicalPageSlices(chapters, page));
}
