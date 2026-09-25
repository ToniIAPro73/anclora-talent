import JSZip from 'jszip';
import { createHash } from 'node:crypto';
import type { SourcePaginationBaseline, SourcePageAnchor } from './source-style-profile';

export interface SourcePaginationBlock {
  type: string;
  content: string;
}

export function canonicalContentHash(blocks: SourcePaginationBlock[]): string {
  return createHash('sha256').update(JSON.stringify(blocks)).digest('hex');
}

function textLength(paragraphXml: string): number {
  return Array.from(paragraphXml.matchAll(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>/g))
    .reduce((total, match) => total + match[1].replace(/&amp;/g, '&').length, 0);
}

function pageBreakOffsets(paragraphXml: string): number[] {
  const offsets: number[] = [];
  let offset = 0;
  const tokens = /<w:t\b[^>]*>([\s\S]*?)<\/w:t>|<w:br\b[^>]*w:type="page"[^>]*\/>|<w:lastRenderedPageBreak\b[^>]*\/>/g;
  let match: RegExpExecArray | null;
  while ((match = tokens.exec(paragraphXml)) !== null) {
    if (match[1] !== undefined) offset += match[1].replace(/&amp;/g, '&').length;
    else offsets.push(offset);
  }
  return offsets;
}

/**
 * Builds a conservative baseline from page markers that are actually present
 * in the OOXML. Automatic Word page breaks are intentionally not invented.
 */
export async function extractSourcePaginationBaseline(
  buffer: Buffer | ArrayBuffer,
  blocks: SourcePaginationBlock[],
  sourceHash: string,
): Promise<SourcePaginationBaseline | null> {
  try {
    const zip = await JSZip.loadAsync(buffer);
    const documentFile = zip.file('word/document.xml');
    if (!documentFile) return null;
    const xml = await documentFile.async('string');
    const paragraphs = Array.from(xml.matchAll(/<w:p\b[\s\S]*?<\/w:p>/g));
    const breaks: Array<{ blockIndex: number; offset: number }> = [];
    paragraphs.forEach((paragraph, paragraphIndex) => {
      pageBreakOffsets(paragraph[0]).forEach((offset) => {
        breaks.push({ blockIndex: Math.min(paragraphIndex, Math.max(0, blocks.length - 1)), offset });
      });
    });
    if (breaks.length === 0) return null;

    const pages: SourcePaginationBaseline['pages'] = [];
    let startAnchor: SourcePageAnchor = { blockIndex: 0, offset: 0 };
    breaks.forEach((end, index) => {
      pages.push({ pageNumber: index + 1, startAnchor, endAnchor: end });
      startAnchor = { blockIndex: end.blockIndex, offset: end.offset };
    });
    pages.push({
      pageNumber: pages.length + 1,
      startAnchor,
      endAnchor: { blockIndex: Math.max(0, blocks.length - 1), offset: blocks.length ? textLength(paragraphs[paragraphs.length - 1]?.[0] ?? '') : 0 },
    });

    return {
      version: 1,
      sourceHash,
      canonicalContentHash: canonicalContentHash(blocks),
      pageCount: pages.length,
      exactness: 'proven_ooxml_breaks',
      pages,
      createdAt: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function isSourcePaginationBaselineValid(
  baseline: SourcePaginationBaseline | null | undefined,
  blocks: SourcePaginationBlock[],
  sourceHash: string | undefined,
): boolean {
  return Boolean(
    baseline &&
    sourceHash &&
    baseline.sourceHash === sourceHash &&
    baseline.canonicalContentHash === canonicalContentHash(blocks),
  );
}
