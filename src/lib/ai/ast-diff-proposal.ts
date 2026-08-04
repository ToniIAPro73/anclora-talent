/**
 * AI proposals as diffs over the document AST — Anclora Talent (F3).
 *
 * Core product rule: AI never writes the document directly. Every AI
 * operation is an `AiProposal` — a set of block-level operations plus a
 * human-readable structural `diff` (the same `DocumentDiff` format the F2
 * history UI renders) — that a human accepts or rejects. Applying a proposal
 * is a pure function over the AST; persistence happens exclusively through
 * the existing save route (R3: no parallel write path).
 *
 * Operations carry enough before/after state to be inverted, so an accepted
 * proposal can be reverted as another proposal (also accept/rejectable).
 */

import { diffDocuments, type DocumentDiff } from '@/lib/document/diff';
import type { DocumentBlock, SemanticDocument } from '@/lib/document/model';

export type AiProposalKind =
  /** Preflight heading jump → correct the heading level. */
  | 'heading-level'
  /** Widows/orphans → merge two short paragraphs. */
  | 'merge-paragraphs'
  /** Broken live reference → materialize it as plain text. */
  | 'broken-ref'
  /** Duplicated heading → rename the later occurrence. */
  | 'duplicate-heading'
  /** Chapter without a level-1 heading. */
  | 'chapter-heading'
  /** LLM-suggested fix (schema-validated before it reaches the UI). */
  | 'llm-suggested'
  /** R6: doubtful cases are never auto-fixed — advisory only, no operations. */
  | 'advisory';

/**
 * Block-level patch over the AST. Every operation anchors by stable block id
 * and carries the state needed to revert it:
 * - `update`: replace the block with `after` (`before` restores it).
 * - `remove`: drop `block` (`previousBlockId` re-anchors it on revert).
 * - `insert`: add `block` after `previousBlockId` (null = prepend).
 * - `move`: relocate an existing block after `toPreviousBlockId`.
 */
export type BlockOperation =
  | { type: 'update'; blockId: string; before: DocumentBlock; after: DocumentBlock }
  | { type: 'remove'; block: DocumentBlock; previousBlockId: string | null }
  | { type: 'insert'; previousBlockId: string | null; block: DocumentBlock }
  | {
      type: 'move';
      blockId: string;
      fromPreviousBlockId: string | null;
      toPreviousBlockId: string | null;
    };

export interface AiProposal {
  id: string;
  kind: AiProposalKind;
  /** One-line human description of the fix (localized by the generator). */
  summary: string;
  /** Patch over the AST; empty for advisories (nothing to accept). */
  operations: BlockOperation[];
  /** Readable before/after diff (src/lib/document/diff.ts format, F2). */
  diff: DocumentDiff;
  provenance: 'ai';
  createdAt: string;
}

/** Thrown when a proposal no longer applies (document changed meanwhile). */
export class StaleProposalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StaleProposalError';
  }
}

export interface ProposalIdentity {
  id: string;
  createdAt: string;
}

export function createProposalIdentity(): ProposalIdentity {
  return {
    id: `ai-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`,
    createdAt: new Date().toISOString(),
  };
}

function indexOfBlock(blocks: DocumentBlock[], blockId: string): number {
  return blocks.findIndex((block) => block.id === blockId);
}

function requireIndex(blocks: DocumentBlock[], blockId: string): number {
  const index = indexOfBlock(blocks, blockId);
  if (index < 0) {
    throw new StaleProposalError(`Block ${blockId} no longer exists in the document`);
  }
  return index;
}

function requireAnchor(blocks: DocumentBlock[], previousBlockId: string | null): number {
  if (previousBlockId === null) return -1;
  return requireIndex(blocks, previousBlockId);
}

function insertAfter(
  blocks: DocumentBlock[],
  previousIndex: number,
  block: DocumentBlock,
): DocumentBlock[] {
  const next = [...blocks];
  next.splice(previousIndex + 1, 0, block);
  return next;
}

/**
 * Applies operations sequentially over a block list. Pure: inputs are never
 * mutated. Any broken anchor (block removed/edited since the proposal was
 * generated) aborts with `StaleProposalError` — a stale proposal can never
 * silently write.
 */
export function applyOperations(
  blocks: DocumentBlock[],
  operations: BlockOperation[],
): DocumentBlock[] {
  let current = blocks;
  for (const operation of operations) {
    switch (operation.type) {
      case 'update': {
        const index = requireIndex(current, operation.blockId);
        if (indexOfBlock(current, operation.after.id) >= 0 && operation.after.id !== operation.blockId) {
          throw new StaleProposalError(`Block id ${operation.after.id} would collide`);
        }
        current = current.map((block, i) => (i === index ? operation.after : block));
        break;
      }
      case 'remove': {
        requireIndex(current, operation.block.id);
        current = current.filter((block) => block.id !== operation.block.id);
        break;
      }
      case 'insert': {
        if (indexOfBlock(current, operation.block.id) >= 0) {
          throw new StaleProposalError(`Block id ${operation.block.id} already exists`);
        }
        current = insertAfter(current, requireAnchor(current, operation.previousBlockId), operation.block);
        break;
      }
      case 'move': {
        const index = requireIndex(current, operation.blockId);
        const anchor = requireAnchor(current, operation.toPreviousBlockId);
        const [moved] = current.splice(index, 1);
        // Removing an element before the anchor shifts the anchor index.
        const shiftedAnchor = anchor >= index ? anchor - 1 : anchor;
        current = insertAfter(current, shiftedAnchor, moved);
        break;
      }
    }
  }
  return current;
}

/** Applies a proposal to a document, producing the edited document. */
export function applyProposal(
  document: SemanticDocument,
  proposal: AiProposal,
): SemanticDocument {
  return {
    ...document,
    blocks: applyOperations(document.blocks, proposal.operations),
  };
}

/**
 * Builds a proposal from operations: computes the edited document and the
 * readable structural diff against the current document. `identity` is
 * injectable for deterministic tests.
 */
export function createProposal(
  input: { kind: AiProposalKind; summary: string; operations: BlockOperation[] },
  document: SemanticDocument,
  identity: ProposalIdentity = createProposalIdentity(),
): AiProposal {
  const edited = applyProposal(document, {
    id: identity.id,
    kind: input.kind,
    summary: input.summary,
    operations: input.operations,
    diff: diffDocuments(document, document),
    provenance: 'ai',
    createdAt: identity.createdAt,
  });
  return {
    id: identity.id,
    kind: input.kind,
    summary: input.summary,
    operations: input.operations,
    diff: diffDocuments(document, edited),
    provenance: 'ai',
    createdAt: identity.createdAt,
  };
}

function invertOperation(operation: BlockOperation): BlockOperation {
  switch (operation.type) {
    case 'update':
      return {
        type: 'update',
        blockId: operation.after.id,
        before: operation.after,
        after: operation.before,
      };
    case 'remove':
      return {
        type: 'insert',
        previousBlockId: operation.previousBlockId,
        block: operation.block,
      };
    case 'insert':
      return {
        type: 'remove',
        block: operation.block,
        previousBlockId: operation.previousBlockId,
      };
    case 'move':
      return {
        type: 'move',
        blockId: operation.blockId,
        fromPreviousBlockId: operation.toPreviousBlockId,
        toPreviousBlockId: operation.fromPreviousBlockId,
      };
  }
}

/**
 * Produces the inverse proposal: applying it to the edited document restores
 * the original one. It is itself an `AiProposal`, so the revert also flows
 * through human accept/reject.
 */
export function invertProposal(
  editedDocument: SemanticDocument,
  proposal: AiProposal,
  identity: ProposalIdentity = createProposalIdentity(),
): AiProposal {
  const inverseOperations = [...proposal.operations].reverse().map(invertOperation);
  const restored = applyOperations(editedDocument.blocks, inverseOperations);
  const restoredDocument = { ...editedDocument, blocks: restored };
  return {
    id: identity.id,
    kind: proposal.kind,
    summary: proposal.summary,
    operations: inverseOperations,
    diff: diffDocuments(editedDocument, restoredDocument),
    provenance: 'ai',
    createdAt: identity.createdAt,
  };
}

/** Ids of the blocks a proposal touches (added/changed/removed in its diff). */
export function proposalAffectedBlockIds(proposal: AiProposal): string[] {
  const ids = new Set<string>();
  for (const chapter of proposal.diff.chapters) {
    for (const change of chapter.changes) {
      ids.add(change.blockId);
    }
  }
  return [...ids];
}
