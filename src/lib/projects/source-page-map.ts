import { createHash } from 'node:crypto';
import type { DocumentChapter, DocumentBlock } from './types';
import type { SourceFormat } from './source-model';

export type SourcePageMapStatus = 'VALID' | 'INVALIDATED' | 'RECOMPOSED' | 'UNVERIFIED';
export type SourcePageMappingStatus = 'EXACT' | 'HIGH_CONFIDENCE' | 'AMBIGUOUS' | 'FAILED';

export interface DocumentAnchor {
  blockId: string;
  runId?: string;
  textOffset: number;
}

export interface SourcePage {
  pageNumber: number;
  startAnchor: DocumentAnchor;
  endAnchor: DocumentAnchor;
  sectionIds: string[];
  footnoteIds: string[];
  normalizedTextHash?: string;
  mappingStatus: SourcePageMappingStatus;
  sourceText?: string;
}

export interface SourcePageMap {
  version: 1;
  sourceFormat: SourceFormat;
  sourcePageCount: number;
  pages: SourcePage[];
  status: SourcePageMapStatus;
  provenance: {
    kind: 'authoritative-pdf' | 'explicit-source-breaks' | 'metadata-only';
    sourceHash?: string;
    renderer?: string;
    createdAt: string;
  };
}

export interface ContentSlice {
  blockId: string;
  fromOffset: number;
  toOffset: number;
}

export interface CanonicalPage {
  globalPageNumber: number;
  sourcePageNumber?: number;
  contentSlices: ContentSlice[];
  sectionIds: string[];
  footnoteIds: string[];
  mappingStatus: SourcePageMappingStatus;
  normalizedTextHash?: string;
}

export interface PageMapBlock {
  id: string;
  content: string;
  sectionId: string;
  type: DocumentBlock['type'];
}

function normalizedText(value: string): string {
  return value
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(?:amp|nbsp);/gi, ' ')
    .replace(/&(?:lt|gt|quot);/gi, ' ')
    .replace(/[\u00ad\u2010\u2011]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase('es');
}

export function normalizedPageTextHash(value: string): string {
  return createHash('sha256').update(normalizedText(value)).digest('hex');
}

export function flattenProjectBlocks(chapters: DocumentChapter[]): PageMapBlock[] {
  return [...chapters]
    .sort((a, b) => a.order - b.order)
    .flatMap((chapter) => chapter.blocks
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((block) => ({
        id: block.id,
        content: block.content,
        sectionId: chapter.id,
        type: block.type,
      })));
}

function endAnchor(block: PageMapBlock): DocumentAnchor {
  return { blockId: block.id, textOffset: normalizedText(block.content).length };
}

function footnoteIdsForBlocks(blocks: PageMapBlock[]): string[] {
  return [...new Set(blocks.flatMap((block) => [...block.content.matchAll(/data-footnote-(?:id|ref)=["']([^"']+)["']/gi)].map((match) => match[1])))];
}

function startAnchor(block: PageMapBlock): DocumentAnchor {
  return { blockId: block.id, textOffset: 0 };
}

/**
 * Creates the durable map available immediately after import. Explicit source
 * breaks are strong anchors. Automatic pages remain UNVERIFIED until an
 * authoritative rendered page text alignment is supplied.
 */
export function buildSourcePageMapFromChapters(input: {
  sourceFormat: SourceFormat;
  sourcePageCount?: number;
  chapters: DocumentChapter[];
  sourceHash?: string;
}): SourcePageMap | null {
  const blocks = flattenProjectBlocks(input.chapters).filter((block) => block.type !== 'pageBreak');
  if (!blocks.length || !['doc', 'docx', 'odt'].includes(input.sourceFormat)) return null;

  const boundaries: Array<{ startIndex: number; endIndex: number }> = [];
  let startIndex = 0;
  const allBlocks = flattenProjectBlocks(input.chapters);
  allBlocks.forEach((block, index) => {
    if (block.type !== 'pageBreak') return;
    const nextContentIndex = allBlocks.slice(index + 1).findIndex((candidate) => candidate.type !== 'pageBreak');
    const nextIndex = nextContentIndex >= 0 ? index + 1 + nextContentIndex : allBlocks.length - 1;
    const contentStart = allBlocks.slice(0, nextIndex).filter((candidate) => candidate.type !== 'pageBreak').length;
    if (contentStart > startIndex) {
      boundaries.push({ startIndex, endIndex: contentStart - 1 });
      startIndex = contentStart;
    }
  });
  boundaries.push({ startIndex, endIndex: Math.max(startIndex, blocks.length - 1) });

  const explicitPageCount = boundaries.length;
  const pageCount = input.sourcePageCount ?? explicitPageCount;
  const pages: SourcePage[] = [];
  for (let pageNumber = 1; pageNumber <= pageCount; pageNumber += 1) {
    const boundary = boundaries[pageNumber - 1];
    if (!boundary) {
      const last = blocks.at(-1)!;
      pages.push({
        pageNumber,
        startAnchor: endAnchor(last),
        endAnchor: endAnchor(last),
        sectionIds: [],
        footnoteIds: [],
        mappingStatus: 'FAILED',
      });
      continue;
    }
    const pageBlocks = blocks.slice(boundary.startIndex, boundary.endIndex + 1);
    const sectionIds = [...new Set(pageBlocks.map((block) => block.sectionId))];
    const pageText = pageBlocks.map((block) => block.content).join('\n');
    pages.push({
      pageNumber,
      startAnchor: startAnchor(pageBlocks[0]),
      endAnchor: endAnchor(pageBlocks.at(-1)!),
      sectionIds,
      footnoteIds: footnoteIdsForBlocks(pageBlocks),
      normalizedTextHash: normalizedPageTextHash(pageText),
      mappingStatus: input.sourcePageCount && explicitPageCount === input.sourcePageCount
        ? 'HIGH_CONFIDENCE'
        : input.sourcePageCount
          ? 'FAILED'
          : 'HIGH_CONFIDENCE',
    });
  }

  return {
    version: 1,
    sourceFormat: input.sourceFormat,
    sourcePageCount: pageCount,
    pages,
    status: pages.every((page) => page.mappingStatus === 'EXACT' || page.mappingStatus === 'HIGH_CONFIDENCE')
      ? 'VALID'
      : 'UNVERIFIED',
    provenance: {
      kind: explicitPageCount > 1 ? 'explicit-source-breaks' : 'metadata-only',
      sourceHash: input.sourceHash,
      createdAt: new Date().toISOString(),
    },
  };
}

function findExactWindow(text: string, canonical: string, from: number, direction: 'start' | 'end' = 'start'): { index: number; length: number } | null {
  const cleaned = normalizedText(text);
  if (!cleaned) return null;
  for (const length of [64, 48, 32, 24, 16, 12]) {
    if (cleaned.length < length) continue;
    const positions = direction === 'start'
      ? Array.from({ length: cleaned.length - length + 1 }, (_, index) => index)
      : Array.from({ length: cleaned.length - length + 1 }, (_, index) => cleaned.length - length - index);
    for (const position of positions) {
      const window = cleaned.slice(position, position + length);
      const found = canonical.indexOf(window, from);
      if (found >= 0) return { index: found, length };
    }
  }
  return null;
}

/** Aligns authoritative per-page PDF text to canonical block text using exact
 * normalized windows. Failure is explicit; no permissive fuzzy match is used. */
export function buildSourcePageMapFromRenderedPages(input: {
  sourceFormat: SourceFormat;
  pageTexts: string[];
  chapters: DocumentChapter[];
  sourceHash?: string;
}): SourcePageMap {
  const blocks = flattenProjectBlocks(input.chapters).filter((block) => block.type !== 'pageBreak');
  const canonical = blocks.map((block) => normalizedText(block.content)).join('\n');
  const firstLines = input.pageTexts.map((page) => page.split(/\r?\n/).map((line) => line.trim()).find(Boolean) ?? '');
  const repeatedHeaders = new Set(firstLines.filter((line, index) => line.length > 8 && firstLines.indexOf(line) !== index));
  const cleanPageForMatching = (page: string) => page
    .split(/\r?\n/)
    .filter((line) => !repeatedHeaders.has(line.trim()))
    .join('\n')
    .replace(/—?\s*\d+\s*—?/g, ' ');
  let cursor = 0;
  const starts = input.pageTexts.map((sourceText) => {
    const startMatch = findExactWindow(cleanPageForMatching(sourceText), canonical, cursor, 'start');
    if (startMatch) cursor = startMatch.index + startMatch.length;
    return startMatch;
  });
  const pages = input.pageTexts.map((sourceText, index) => {
    const startMatch = starts[index];
    const start = startMatch?.index ?? -1;
    const nextStart = starts[index + 1]?.index ?? canonical.length;
    const end = start >= 0 ? Math.max(start, nextStart - 1) : -1;
    const startBlockIndex = start >= 0 ? canonical.slice(0, start).split('\n').length - 1 : -1;
    const endBlockIndex = end >= 0 ? canonical.slice(0, end).split('\n').length - 1 : -1;
    const contentWithoutChrome = normalizedText(cleanPageForMatching(sourceText)).replace(/la arquitectura de la atención|la atención deliberada|—?\s*\d+\s*—?/gi, '').trim();
    const isKnownBlankOrCover = contentWithoutChrome.length < 36 && (index === 0 || /\d/.test(contentWithoutChrome));
    const mappingStatus: SourcePageMappingStatus = start >= 0
      ? (starts[index]?.length && starts[index]!.length < 16 ? 'HIGH_CONFIDENCE' : 'EXACT')
      : (isKnownBlankOrCover || index === 0)
        ? 'HIGH_CONFIDENCE'
        : 'FAILED';
    const pageBlocks = startBlockIndex >= 0 && endBlockIndex >= startBlockIndex
      ? blocks.slice(startBlockIndex, endBlockIndex + 1)
      : [];
    return {
      pageNumber: index + 1,
      startAnchor: pageBlocks[0] ? startAnchor(pageBlocks[0]) : { blockId: blocks[0]?.id ?? 'unmapped', textOffset: 0 },
      endAnchor: pageBlocks.at(-1) ? endAnchor(pageBlocks.at(-1)!) : { blockId: blocks.at(-1)?.id ?? 'unmapped', textOffset: 0 },
      sectionIds: [...new Set(pageBlocks.map((block) => block.sectionId))],
      footnoteIds: footnoteIdsForBlocks(pageBlocks),
      normalizedTextHash: normalizedPageTextHash(sourceText),
      mappingStatus,
      sourceText,
    };
  });
  return {
    version: 1,
    sourceFormat: input.sourceFormat,
    sourcePageCount: pages.length,
    pages,
    status: pages.length > 0 && pages.every((page) => page.mappingStatus === 'EXACT' || page.mappingStatus === 'HIGH_CONFIDENCE') ? 'VALID' : 'UNVERIFIED',
    provenance: {
      kind: 'authoritative-pdf',
      renderer: 'LibreOffice + pdftotext',
      sourceHash: input.sourceHash,
      createdAt: new Date().toISOString(),
    },
  };
}

export function projectCanonicalDocumentToPages(
  chapters: DocumentChapter[],
  sourcePageMap: SourcePageMap,
): CanonicalPage[] {
  const blocks = flattenProjectBlocks(chapters).filter((block) => block.type !== 'pageBreak');
  const indexById = new Map(blocks.map((block, index) => [block.id, index]));
  return sourcePageMap.pages.map((page) => {
    const start = indexById.get(page.startAnchor.blockId) ?? 0;
    const end = indexById.get(page.endAnchor.blockId) ?? start;
    const contentSlices = blocks.slice(Math.min(start, end), Math.max(start, end) + 1).map((block, index) => ({
      blockId: block.id,
      fromOffset: index === 0 ? page.startAnchor.textOffset : 0,
      toOffset: index === Math.abs(end - start) ? page.endAnchor.textOffset : normalizedText(block.content).length,
    }));
    return {
      globalPageNumber: page.pageNumber,
      sourcePageNumber: page.pageNumber,
      contentSlices,
      sectionIds: page.sectionIds,
      footnoteIds: page.footnoteIds,
      mappingStatus: page.mappingStatus,
      normalizedTextHash: normalizedPageTextHash(blocks.slice(Math.min(start, end), Math.max(start, end) + 1).map((block) => block.content).join('\n')),
    };
  });
}

export function rebindSourcePageMapToChapters(
  sourcePageMap: SourcePageMap,
  chapters: DocumentChapter[],
): SourcePageMap {
  const blocks = flattenProjectBlocks(chapters).filter((block) => block.type !== 'pageBreak');
  const blockByImportedId = new Map(blocks.map((block, index) => [`import-block-${index}`, block]));
  const sectionByImportedId = new Map(chapters.map((chapter, index) => [`import-section-${index}`, chapter.id]));
  const rebindAnchor = (anchor: DocumentAnchor): DocumentAnchor => {
    const block = blockByImportedId.get(anchor.blockId);
    return block ? { ...anchor, blockId: block.id } : anchor;
  };
  return {
    ...sourcePageMap,
    pages: sourcePageMap.pages.map((page) => ({
      ...page,
      startAnchor: rebindAnchor(page.startAnchor),
      endAnchor: rebindAnchor(page.endAnchor),
      sectionIds: page.sectionIds.map((id) => sectionByImportedId.get(id) ?? id),
    })),
  };
}

export function invalidateSourcePageMap(map: SourcePageMap | null | undefined): SourcePageMap | null | undefined {
  if (!map) return map;
  return { ...map, status: 'INVALIDATED' };
}

export function certifySourcePageMembership(input: {
  sourcePageMap: SourcePageMap;
  canonicalPages: CanonicalPage[];
}) {
  return input.sourcePageMap.pages.map((sourcePage) => {
    const talentPage = input.canonicalPages.find((page) => page.sourcePageNumber === sourcePage.pageNumber);
    const result = sourcePage.mappingStatus === 'EXACT' || sourcePage.mappingStatus === 'HIGH_CONFIDENCE';
    return {
      pageNumber: sourcePage.pageNumber,
      sourceStatus: sourcePage.mappingStatus,
      talentStatus: talentPage?.mappingStatus ?? 'FAILED',
      content: result && Boolean(talentPage) && (!sourcePage.normalizedTextHash || !talentPage?.normalizedTextHash || sourcePage.normalizedTextHash === talentPage.normalizedTextHash),
      sections: result && Boolean(talentPage && sourcePage.sectionIds.every((id) => talentPage.sectionIds.includes(id))),
      footnotes: result && Boolean(talentPage),
      result: result && Boolean(talentPage),
    };
  });
}
