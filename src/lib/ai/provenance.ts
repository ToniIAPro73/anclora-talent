/**
 * Content provenance registry — Anclora Talent (F3, governance).
 *
 * Per-block record of who authored the current content: `human` or `ai`.
 * Persisted as a JSONB map (`blockId → origin`) on `project_documents` and
 * wired into both write paths of the semantic model:
 * - every accepted AI proposal marks the blocks its diff touches as `ai`;
 * - every human save of the document model marks the blocks its diff
 *   touches as `human`.
 *
 * Untouched blocks keep their previous origin; blocks no longer present in
 * the document are pruned. The map is derived from structural diffs (same
 * anchor ids the engine uses), never from free text comparison.
 */

import { diffDocuments } from '@/lib/document/diff';
import type { SemanticDocument } from '@/lib/document/model';

export type BlockProvenance = 'human' | 'ai';

/** Persisted shape: blockId → origin of its current content. */
export type ProvenanceMap = Record<string, BlockProvenance>;

/**
 * Derives the next provenance map after an edit from `previous` to `next`.
 * Blocks added or changed by the edit are stamped with `origin`; unchanged
 * blocks keep their recorded origin; removed blocks are dropped. When there
 * is no previous document (first model save) every block is stamped.
 */
export function deriveProvenanceUpdate(
  previous: SemanticDocument | null,
  next: SemanticDocument,
  current: ProvenanceMap | null | undefined,
  origin: BlockProvenance,
): ProvenanceMap {
  const nextIds = new Set(next.blocks.map((block) => block.id));
  const result: ProvenanceMap = {};

  for (const [blockId, value] of Object.entries(current ?? {})) {
    if (nextIds.has(blockId) && (value === 'human' || value === 'ai')) {
      result[blockId] = value;
    }
  }

  if (!previous) {
    for (const block of next.blocks) {
      result[block.id] = origin;
    }
    return result;
  }

  const diff = diffDocuments(previous, next);
  for (const chapter of diff.chapters) {
    for (const change of chapter.changes) {
      if (change.kind === 'added' || change.kind === 'changed') {
        result[change.blockId] = origin;
      }
    }
  }
  return result;
}

/** Drops entries whose block no longer exists in the document. */
export function pruneProvenance(
  map: ProvenanceMap | null | undefined,
  document: SemanticDocument,
): ProvenanceMap {
  const ids = new Set(document.blocks.map((block) => block.id));
  const result: ProvenanceMap = {};
  for (const [blockId, value] of Object.entries(map ?? {})) {
    if (ids.has(blockId) && (value === 'human' || value === 'ai')) {
      result[blockId] = value;
    }
  }
  return result;
}

/** Counts blocks per origin for the provenance UI summary. */
export function countProvenance(map: ProvenanceMap | null | undefined): {
  human: number;
  ai: number;
} {
  let human = 0;
  let ai = 0;
  for (const value of Object.values(map ?? {})) {
    if (value === 'ai') ai += 1;
    else if (value === 'human') human += 1;
  }
  return { human, ai };
}
