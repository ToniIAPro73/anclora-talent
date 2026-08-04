/**
 * Editor (corrector) suggestions — Anclora Talent (F4, entregable 2).
 *
 * The editor never writes the document directly: a correction is a
 * `BlockOperation[]` patch plus a readable `DocumentDiff` — exactly the F3
 * AI proposal shape (src/lib/ai/ast-diff-proposal.ts) with human provenance
 * — that only the author accepts or rejects. This module is the pure core:
 * it builds a suggestion from a plain-text replacement over one block and
 * validates persisted operations read back from JSONB.
 *
 * Minimal scope decision (documented): a suggestion replaces the whole plain
 * text of ONE text-bearing block (heading/paragraph/quote/callout/code).
 * Inline marks and live `ref` tokens of that block flatten to plain text in
 * the replacement — the author reviews the diff before accepting.
 */

import { diffDocuments, blockToPlainText, type DocumentDiff } from '@/lib/document/diff';
import type { DocumentBlock, SemanticDocument } from '@/lib/document/model';
import { applyOperations, type BlockOperation } from '@/lib/ai/ast-diff-proposal';

export type SuggestionBuildError = 'blockNotFound' | 'unsupportedBlock' | 'unchanged';

/** Block types whose text a corrector can propose to replace. */
const TEXT_REPLACEABLE_TYPES = new Set<DocumentBlock['type']>([
  'heading',
  'paragraph',
  'quote',
  'callout',
  'code',
]);

function replaceBlockText(block: DocumentBlock, text: string): DocumentBlock | null {
  switch (block.type) {
    case 'heading':
    case 'paragraph':
    case 'quote':
    case 'callout':
      return { ...block, content: [{ type: 'text', text }] };
    case 'code':
      return { ...block, code: text };
    default:
      return null;
  }
}

/**
 * Builds the accept/rejectable patch for replacing the plain text of one
 * block. The operation anchors by the stable block id and carries the full
 * `before` state, so the patch is stale-safe (applyOperations throws when
 * the document changed) and invertible like any F3 proposal.
 */
export function buildTextReplacementSuggestion(
  document: SemanticDocument,
  input: { blockId: string; replacementText: string },
): { operations: BlockOperation[]; diff: DocumentDiff } | { error: SuggestionBuildError } {
  const block = document.blocks.find((candidate) => candidate.id === input.blockId);
  if (!block) return { error: 'blockNotFound' };
  if (!TEXT_REPLACEABLE_TYPES.has(block.type)) return { error: 'unsupportedBlock' };

  const text = input.replacementText.trim();
  if (!text || blockToPlainText(block) === text) return { error: 'unchanged' };

  const after = replaceBlockText(block, text);
  if (!after) return { error: 'unsupportedBlock' };

  const operations: BlockOperation[] = [
    { type: 'update', blockId: block.id, before: block, after },
  ];
  const edited = { ...document, blocks: applyOperations(document.blocks, operations) };
  return { operations, diff: diffDocuments(document, edited) };
}

const OPERATION_TYPES = new Set(['update', 'remove', 'insert', 'move']);

/**
 * Narrows operations read back from JSONB to `BlockOperation[]`. Structural
 * validation only — anchor integrity is enforced by `applyOperations`
 * (StaleProposalError) when the author accepts.
 */
export function parseStoredOperations(value: unknown): BlockOperation[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  for (const item of value) {
    if (!item || typeof item !== 'object') return null;
    const type = (item as { type?: unknown }).type;
    if (typeof type !== 'string' || !OPERATION_TYPES.has(type)) return null;
  }
  return value as BlockOperation[];
}
