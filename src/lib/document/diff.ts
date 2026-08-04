/**
 * Structural diff between two document ASTs (F2).
 *
 * Blocks carry stable ids (model.ts), so the diff is anchored by id — never
 * a plain-text diff:
 * - `added` / `removed`: id present on one side only;
 * - `changed`: same id, different serialized content;
 * - `moved`: same id, identical content, different relative order (minimal
 *   moved set via the longest increasing subsequence of the common blocks).
 *
 * Changes are grouped by chapter using the same anchor the composer uses
 * (level-1 headings); content before the first chapter lands in a `front`
 * group. Every change carries its block id so the UI can anchor/link to the
 * exact block.
 */

import type { DocumentBlock, DocumentBlockType, SemanticDocument } from './model';
import { inlineToPlainText } from './model';

export type BlockChangeKind = 'added' | 'removed' | 'changed' | 'moved';

export interface BlockChange {
  kind: BlockChangeKind;
  /** Stable block id — the anchor the UI navigates to. */
  blockId: string;
  blockType: DocumentBlockType;
  /** Plain-text preview (after state; before state for removed blocks). */
  preview: string;
  /** Previous plain text for `changed` blocks. */
  previousPreview?: string;
}

export interface ChapterDiff {
  /** Id of the level-1 heading opening the chapter (`front` before the first one). */
  anchorId: string;
  /** Chapter title ('' for the `front` group — the UI localizes it). */
  title: string;
  changes: BlockChange[];
}

export interface DocumentDiff {
  chapters: ChapterDiff[];
  counts: Record<BlockChangeKind, number>;
  metadataChanged: boolean;
}

/** Anchor id for content before the first level-1 heading. */
export const FRONT_MATTER_ANCHOR = 'front';

/** Plain-text preview of any block (ids and structure excluded). */
export function blockToPlainText(block: DocumentBlock): string {
  switch (block.type) {
    case 'heading':
    case 'paragraph':
    case 'quote':
    case 'callout':
      return inlineToPlainText(block.content);
    case 'list':
      return block.items.map((item) => inlineToPlainText(item)).join(' · ');
    case 'table':
      return block.rows
        .map((row) => row.map((cell) => inlineToPlainText(cell)).join(' | '))
        .join(' / ');
    case 'image':
      return block.alt ?? block.src;
    case 'code':
      return block.code;
    case 'pageBreak':
      return '';
  }
}

interface ChapterSlice {
  anchorId: string;
  title: string;
}

/**
 * Splits the flat block list into chapter slices at level-1 headings (the
 * composer's default `chapterLevel`). Returns the ordered slices and the
 * slice index (or -1 = front) of every block id.
 */
function sliceChapters(blocks: DocumentBlock[]): {
  slices: ChapterSlice[];
  sliceIndexByBlockId: Map<string, number>;
} {
  const slices: ChapterSlice[] = [];
  const sliceIndexByBlockId = new Map<string, number>();
  let current = -1;
  for (const block of blocks) {
    if (block.type === 'heading' && block.level === 1) {
      slices.push({ anchorId: block.id, title: inlineToPlainText(block.content) });
      current = slices.length - 1;
    }
    sliceIndexByBlockId.set(block.id, current);
  }
  return { slices, sliceIndexByBlockId };
}

function sameBlockContent(a: DocumentBlock, b: DocumentBlock): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** Indices of the longest strictly increasing subsequence (positions kept in relative order). */
function longestIncreasingSubsequence(sequence: number[]): Set<number> {
  const tails: number[] = [];
  const prev: number[] = new Array(sequence.length).fill(-1);
  for (let index = 0; index < sequence.length; index += 1) {
    let lo = 0;
    let hi = tails.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (sequence[tails[mid]] < sequence[index]) lo = mid + 1;
      else hi = mid;
    }
    if (lo > 0) prev[index] = tails[lo - 1];
    if (lo === tails.length) tails.push(index);
    else tails[lo] = index;
  }
  const kept = new Set<number>();
  let cursor = tails.length > 0 ? tails[tails.length - 1] : -1;
  while (cursor !== -1) {
    kept.add(cursor);
    cursor = prev[cursor];
  }
  return kept;
}

/**
 * Ids of content-identical common blocks whose relative order changed.
 * Additions/removals around a block never flag it as moved: only the order
 * among the common unchanged blocks matters.
 */
function movedBlockIds(beforeBlocks: DocumentBlock[], afterBlocks: DocumentBlock[]): Set<string> {
  const afterIndexById = new Map(afterBlocks.map((block, index) => [block.id, index]));
  const afterById = new Map(afterBlocks.map((block) => [block.id, block]));
  const unchangedCommon = beforeBlocks.filter((block) => {
    const candidate = afterById.get(block.id);
    return candidate !== undefined && sameBlockContent(block, candidate);
  });
  const sequence = unchangedCommon.map((block) => afterIndexById.get(block.id) as number);
  const kept = longestIncreasingSubsequence(sequence);
  const moved = new Set<string>();
  unchangedCommon.forEach((block, index) => {
    if (!kept.has(index)) moved.add(block.id);
  });
  return moved;
}

/**
 * Diff two AST snapshots (`before` → `after`) anchored by stable block ids,
 * grouped by chapter in `after` document order; chapters that only exist in
 * `before` (fully removed) are appended at the end.
 */
export function diffDocuments(before: SemanticDocument, after: SemanticDocument): DocumentDiff {
  const beforeById = new Map(before.blocks.map((block) => [block.id, block]));
  const afterById = new Map(after.blocks.map((block) => [block.id, block]));
  const moved = movedBlockIds(before.blocks, after.blocks);

  const groups = new Map<string, ChapterDiff>();
  const counts: Record<BlockChangeKind, number> = { added: 0, removed: 0, changed: 0, moved: 0 };

  const pushChange = (anchorId: string, title: string, change: BlockChange) => {
    let group = groups.get(anchorId);
    if (!group) {
      group = { anchorId, title, changes: [] };
      groups.set(anchorId, group);
    }
    group.changes.push(change);
    counts[change.kind] += 1;
  };

  // Added / changed / moved, in after-document order.
  const afterSlicing = sliceChapters(after.blocks);
  for (const block of after.blocks) {
    const prev = beforeById.get(block.id);
    let change: BlockChange | null = null;
    if (!prev) {
      change = { kind: 'added', blockId: block.id, blockType: block.type, preview: blockToPlainText(block) };
    } else if (!sameBlockContent(prev, block)) {
      change = {
        kind: 'changed',
        blockId: block.id,
        blockType: block.type,
        preview: blockToPlainText(block),
        previousPreview: blockToPlainText(prev),
      };
    } else if (moved.has(block.id)) {
      change = { kind: 'moved', blockId: block.id, blockType: block.type, preview: blockToPlainText(block) };
    }
    if (!change) continue;
    const sliceIndex = afterSlicing.sliceIndexByBlockId.get(block.id) ?? -1;
    const slice = sliceIndex >= 0 ? afterSlicing.slices[sliceIndex] : undefined;
    pushChange(slice?.anchorId ?? FRONT_MATTER_ANCHOR, slice?.title ?? '', change);
  }

  // Removed, in before-document order; before-only chapters append at the end.
  const beforeSlicing = sliceChapters(before.blocks);
  for (const block of before.blocks) {
    if (afterById.has(block.id)) continue;
    const sliceIndex = beforeSlicing.sliceIndexByBlockId.get(block.id) ?? -1;
    const slice = sliceIndex >= 0 ? beforeSlicing.slices[sliceIndex] : undefined;
    pushChange(slice?.anchorId ?? FRONT_MATTER_ANCHOR, slice?.title ?? '', {
      kind: 'removed',
      blockId: block.id,
      blockType: block.type,
      preview: blockToPlainText(block),
    });
  }

  return {
    chapters: [...groups.values()],
    counts,
    metadataChanged: JSON.stringify(before.metadata) !== JSON.stringify(after.metadata),
  };
}
