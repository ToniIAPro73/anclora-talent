import { describe, expect, test } from 'vitest';
import type { HeadingBlock, ParagraphBlock, SemanticDocument } from '@/lib/document/model';
import {
  StaleProposalError,
  applyOperations,
  applyProposal,
  createProposal,
  invertProposal,
  proposalAffectedBlockIds,
  type ProposalIdentity,
} from './ast-diff-proposal';

const IDENTITY: ProposalIdentity = { id: 'ai-test-1', createdAt: '2026-01-01T00:00:00.000Z' };

const headingBlock: HeadingBlock = {
  id: 'h1',
  type: 'heading',
  level: 1,
  content: [{ type: 'text', text: 'Capítulo 1' }],
};
const firstParagraph: ParagraphBlock = {
  id: 'p1',
  type: 'paragraph',
  content: [{ type: 'text', text: 'Primer párrafo.' }],
};
const secondParagraph: ParagraphBlock = {
  id: 'p2',
  type: 'paragraph',
  content: [{ type: 'text', text: 'Segundo párrafo.' }],
};

function fixtureDocument(): SemanticDocument {
  return {
    version: 1,
    metadata: { title: 'Doc' },
    blocks: [
      structuredClone(headingBlock),
      structuredClone(firstParagraph),
      structuredClone(secondParagraph),
    ],
  };
}

describe('applyOperations', () => {
  test('update replaces a block in place', () => {
    const document = fixtureDocument();
    const heading = headingBlock;
    const after: HeadingBlock = { ...heading, level: 2 };
    const result = applyOperations(document.blocks, [
      { type: 'update', blockId: 'h1', before: heading, after },
    ]);
    expect(result[0]).toEqual(after);
    expect(result).toHaveLength(3);
    // Input is never mutated.
    expect(document.blocks[0]).not.toEqual(after);
  });

  test('remove drops a block and insert re-anchors it', () => {
    const document = fixtureDocument();
    const paragraph = document.blocks[1];
    const removed = applyOperations(document.blocks, [
      { type: 'remove', block: paragraph, previousBlockId: 'h1' },
    ]);
    expect(removed.map((block) => block.id)).toEqual(['h1', 'p2']);

    const inserted = applyOperations(removed, [
      { type: 'insert', previousBlockId: 'h1', block: paragraph },
    ]);
    expect(inserted.map((block) => block.id)).toEqual(['h1', 'p1', 'p2']);
  });

  test('move relocates a block after the given anchor', () => {
    const document = fixtureDocument();
    const result = applyOperations(document.blocks, [
      { type: 'move', blockId: 'p2', fromPreviousBlockId: 'p1', toPreviousBlockId: 'h1' },
    ]);
    expect(result.map((block) => block.id)).toEqual(['h1', 'p2', 'p1']);
  });

  test('throws StaleProposalError when an anchor block no longer exists', () => {
    const document = fixtureDocument();
    expect(() =>
      applyOperations(document.blocks, [
        { type: 'update', blockId: 'gone', before: document.blocks[0], after: document.blocks[0] },
      ]),
    ).toThrow(StaleProposalError);
    expect(() =>
      applyOperations(document.blocks, [
        { type: 'insert', previousBlockId: 'gone', block: document.blocks[0] },
      ]),
    ).toThrow(StaleProposalError);
  });
});

describe('createProposal / applyProposal', () => {
  test('carries the structural diff (F2 format) of the operations', () => {
    const document = fixtureDocument();
    const heading = headingBlock;
    const proposal = createProposal(
      {
        kind: 'heading-level',
        summary: 'Bajar el nivel del encabezado',
        operations: [
          { type: 'update', blockId: 'h1', before: heading, after: { ...heading, level: 2 } },
        ],
      },
      document,
      IDENTITY,
    );

    expect(proposal.provenance).toBe('ai');
    expect(proposal.id).toBe('ai-test-1');
    expect(proposal.diff.counts.changed).toBe(1);
    expect(proposalAffectedBlockIds(proposal)).toEqual(['h1']);

    const edited = applyProposal(document, proposal);
    expect(edited.blocks[0]).toMatchObject({ level: 2 });
  });

  test('advisory proposals (no operations) produce an empty diff', () => {
    const document = fixtureDocument();
    const proposal = createProposal(
      { kind: 'advisory', summary: 'Bloque demasiado grande: revísalo manualmente', operations: [] },
      document,
      IDENTITY,
    );
    expect(proposal.diff.counts).toEqual({ added: 0, removed: 0, changed: 0, moved: 0 });
    expect(applyProposal(document, proposal)).toEqual(document);
  });
});

describe('invertProposal', () => {
  test('applying the inverse restores the original document', () => {
    const document = fixtureDocument();
    const paragraph = firstParagraph;
    const proposal = createProposal(
      {
        kind: 'merge-paragraphs',
        summary: 'Unir párrafos cortos',
        operations: [
          { type: 'remove', block: paragraph, previousBlockId: 'h1' },
          {
            type: 'update',
            blockId: 'p2',
            before: secondParagraph,
            after: {
              ...secondParagraph,
              content: [{ type: 'text' as const, text: 'Segundo párrafo. Primer párrafo.' }],
            },
          },
        ],
      },
      document,
      IDENTITY,
    );

    const edited = applyProposal(document, proposal);
    expect(edited.blocks.map((block) => block.id)).toEqual(['h1', 'p2']);

    const inverse = invertProposal(edited, proposal, { id: 'ai-test-2', createdAt: IDENTITY.createdAt });
    const restored = applyProposal(edited, inverse);
    expect(restored).toEqual(document);
    expect(inverse.provenance).toBe('ai');
  });
});
