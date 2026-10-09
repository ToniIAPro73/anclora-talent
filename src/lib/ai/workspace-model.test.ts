import { describe, expect, test } from 'vitest';
import type { SemanticDocument } from '@/lib/document/model';
import { createProposal } from './ast-diff-proposal';
import { listCoAuthorChapterStats } from './co-author';
import { AI_TOOLS, groupProposalChanges, listFixCandidates, plural, summarizeProposalImpact, toolDefinition } from './workspace-model';

const document: SemanticDocument = {
  version: 1,
  metadata: { title: 'Libro' },
  blocks: [
    { id: 'h1', type: 'heading', level: 1, content: [{ type: 'text', text: 'Uno' }] },
    { id: 'p1', type: 'paragraph', content: [{ type: 'text', text: 'Texto original del primer párrafo.' }] },
    { id: 'p2', type: 'paragraph', content: [{ type: 'text', text: 'Segundo.' }] },
    { id: 'p3', type: 'paragraph', content: [{ type: 'text', text: 'Tercero.' }] },
  ],
};

function proposalFixture() {
  const p1 = document.blocks[1] as Extract<SemanticDocument['blocks'][number], { type: 'paragraph' }>;
  return createProposal(
    {
      kind: 'content-architecture',
      summary: 'Reorganizar',
      operations: [
        { type: 'update', blockId: 'p1', before: p1, after: { ...p1, content: [{ type: 'text', text: 'Texto nuevo.' }] } },
        { type: 'insert', previousBlockId: 'h1', block: { id: 'ai-h2', type: 'heading', level: 2, content: [{ type: 'text', text: 'Subtítulo' }] } },
        { type: 'move', blockId: 'p3', fromPreviousBlockId: 'p2', toPreviousBlockId: 'h1' },
      ],
    },
    document,
    { id: 'ai-1', createdAt: '2026-01-01T00:00:00.000Z' },
  );
}

describe('workspace model', () => {
  test('tools: only real operations, with their requirements', () => {
    expect(AI_TOOLS.map((tool) => tool.id)).toEqual(['style', 'architecture', 'summary', 'coherence', 'fixes']);
    expect(toolDefinition('style')).toMatchObject({ chapterScoped: true, needsCloud: true });
    expect(toolDefinition('summary')).toMatchObject({ chapterScoped: false, needsCloud: true });
    expect(toolDefinition('coherence')).toMatchObject({ needsCloud: false });
  });

  test('impact is derived from the diff counts and distinguishes added headings', () => {
    const impact = summarizeProposalImpact(proposalFixture());
    expect(impact.changed).toBe(1);
    expect(impact.added).toBe(1);
    expect(impact.headingsAdded).toBe(1);
    expect(impact.moved).toBe(1);
    expect(impact.total).toBe(impact.changed + impact.added + impact.removed + impact.moved);
  });

  test('changes are grouped by chapter and kind in a stable order', () => {
    const groups = groupProposalChanges(proposalFixture());
    expect(groups).toHaveLength(1);
    expect(groups[0].title).toBe('Uno');
    expect(groups[0].kinds.map((entry) => entry.kind)).toEqual(['changed', 'added', 'moved']);
    expect(groups[0].count).toBe(3);
  });

  test('fix candidates keep only what the structural assistant can fix, deduplicated across channels', () => {
    const candidates = listFixCandidates(
      [
        { page: 1, blockId: 'a', rule: 'widowsOrphans', message: 'Viuda' },
        { page: 2, blockId: 'b', rule: 'unknown.rule', message: 'x' },
      ],
      [
        { channel: 'kdp', severity: 'warning', rule: 'kdp.heading.jump', params: {}, blockId: 'c' },
        { channel: 'kobo', severity: 'warning', rule: 'kobo.a11y.headingJump', params: {}, blockId: 'c' },
      ],
      (check) => check.rule,
    );
    expect(candidates.map((candidate) => candidate.source)).toContain('violation');
    expect(candidates.some((candidate) => candidate.rule === 'unknown.rule')).toBe(false);
  });

  test('chapter stats carry real counts for the context panel', () => {
    const stats = listCoAuthorChapterStats(document);
    expect(stats).toEqual([{ key: 'h1', title: 'Uno', words: 8, blocks: 4 }]);
  });

  test('plural picks the form and fills the count', () => {
    expect(plural(1, '{count} bloque', '{count} bloques')).toBe('1 bloque');
    expect(plural(3, '{count} bloque', '{count} bloques')).toBe('3 bloques');
  });
});
