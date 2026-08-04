import { describe, expect, test } from 'vitest';
import type { ComposeViolation } from '@/lib/compose/compose';
import type { PreflightCheck } from '@/lib/preflight/preflight';
import type { HeadingBlock, ParagraphBlock, SemanticDocument } from '@/lib/document/model';
import type { AiProvider } from './provider';
import { applyProposal, type ProposalIdentity } from './ast-diff-proposal';
import {
  isAiFixEligible,
  parseLlmFixResponse,
  proposeStructuralFixes,
} from './structural-assistant';

let counter = 0;
function identity(): ProposalIdentity {
  counter += 1;
  return { id: `ai-test-${counter}`, createdAt: '2026-01-01T00:00:00.000Z' };
}

function documentWith(blocks: SemanticDocument['blocks']): SemanticDocument {
  return { version: 1, metadata: { title: 'Doc' }, blocks };
}

function heading(id: string, level: HeadingBlock['level'], text: string): HeadingBlock {
  return { id, type: 'heading', level, content: [{ type: 'text', text }] };
}

function paragraph(id: string, text: string): ParagraphBlock {
  return { id, type: 'paragraph', content: [{ type: 'text', text }] };
}

function fakeProvider(response: unknown): AiProvider {
  return {
    kind: 'openai',
    completeJson: () => Promise.resolve(response),
  };
}

describe('isAiFixEligible', () => {
  test('gates the rules the assistant can fix', () => {
    expect(isAiFixEligible('widowsOrphans')).toBe(true);
    expect(isAiFixEligible('keepTogether.table')).toBe(true);
    expect(isAiFixEligible('kobo.a11y.headingJump')).toBe(true);
    expect(isAiFixEligible('kdp.metadata.title')).toBe(false);
    expect(isAiFixEligible('numbering')).toBe(false);
  });
});

describe('structural heuristics (no provider)', () => {
  test('heading jump (preflight) → concrete heading-level fix', async () => {
    const document = documentWith([heading('h1', 1, 'Capítulo'), heading('h2', 3, 'Salto')]);
    const check: PreflightCheck = {
      channel: 'kobo',
      severity: 'warning',
      rule: 'kobo.a11y.headingJump',
      params: { from: '1', to: '3' },
      blockId: 'h2',
    };

    const { proposals, mode } = await proposeStructuralFixes(
      { document, checks: [check] },
      undefined,
      identity,
    );

    expect(mode).toBe('local');
    expect(proposals).toHaveLength(1);
    expect(proposals[0].kind).toBe('heading-level');
    const edited = applyProposal(document, proposals[0]);
    expect((edited.blocks[1] as HeadingBlock).level).toBe(2);
    expect(proposals[0].diff.counts.changed).toBe(1);
  });

  test('widows/orphans on short paragraphs → merge proposal', async () => {
    const document = documentWith([paragraph('p1', 'Corto.'), paragraph('p2', 'También corto.')]);
    const violation: ComposeViolation = {
      page: 0,
      blockId: 'p1',
      rule: 'widowsOrphans',
      message: 'Paragraph split with fewer than 2 lines on one side of the boundary.',
    };

    const { proposals } = await proposeStructuralFixes({ document, violations: [violation] }, undefined, identity);

    expect(proposals).toHaveLength(1);
    expect(proposals[0].kind).toBe('merge-paragraphs');
    const edited = applyProposal(document, proposals[0]);
    expect(edited.blocks).toHaveLength(1);
    expect((edited.blocks[0] as ParagraphBlock).content.map((n) => (n.type === 'text' ? n.text : '')).join(''))
      .toBe('Corto. También corto.');
  });

  test('widows/orphans on long paragraphs → advisory only (R6)', async () => {
    const longText = 'Lorem ipsum dolor sit amet. '.repeat(30);
    const document = documentWith([paragraph('p1', longText), paragraph('p2', longText)]);
    const violation: ComposeViolation = { page: 0, blockId: 'p1', rule: 'widowsOrphans', message: 'split' };

    const { proposals } = await proposeStructuralFixes({ document, violations: [violation] }, undefined, identity);

    expect(proposals).toHaveLength(1);
    expect(proposals[0].kind).toBe('advisory');
    expect(proposals[0].operations).toHaveLength(0);
  });

  test('oversized keep-together block → never auto-fixed, advisory only', async () => {
    const document = documentWith([
      { id: 't1', type: 'table', rows: [[[{ type: 'text', text: 'celda' }]]], hasHeader: false },
    ]);
    const violation: ComposeViolation = {
      page: 0,
      blockId: 't1',
      rule: 'keepTogether.table',
      message: 'Block of 40 lines exceeds page capacity (32); split despite keepTogether.table.',
    };

    const { proposals } = await proposeStructuralFixes({ document, violations: [violation] }, undefined, identity);

    expect(proposals).toHaveLength(1);
    expect(proposals[0].kind).toBe('advisory');
    expect(proposals[0].operations).toHaveLength(0);
  });

  test('summaries localize (en)', async () => {
    const document = documentWith([heading('h1', 1, 'Chapter'), heading('h2', 3, 'Jump')]);
    const check: PreflightCheck = {
      channel: 'kobo',
      severity: 'warning',
      rule: 'kobo.a11y.headingJump',
      params: { from: '1', to: '3' },
      blockId: 'h2',
    };
    const { proposals } = await proposeStructuralFixes({ document, checks: [check], locale: 'en' }, undefined, identity);
    expect(proposals[0].summary).toContain('H3 to H2');
  });
});

describe('LLM path (fake provider)', () => {
  const violation: ComposeViolation = { page: 0, blockId: 'p1', rule: 'widowsOrphans', message: 'split' };

  test('valid replacement block becomes an llm-suggested proposal (cloud mode)', async () => {
    const document = documentWith([paragraph('p1', 'Corto.')]);
    const provider = fakeProvider({
      suggestions: [
        {
          summary: 'Unir ideas en un párrafo más compacto.',
          replacementBlock: { id: 'p1', type: 'paragraph', content: [{ type: 'text', text: 'Corto y compacto.' }] },
        },
      ],
    });

    const { proposals, mode } = await proposeStructuralFixes({ document, violations: [violation] }, provider, identity);

    expect(mode).toBe('cloud');
    const llmProposal = proposals.find((proposal) => proposal.kind === 'llm-suggested');
    expect(llmProposal).toBeDefined();
    const edited = applyProposal(document, llmProposal!);
    expect((edited.blocks[0] as ParagraphBlock).content[0]).toMatchObject({ text: 'Corto y compacto.' });
  });

  test('invalid JSON/shape is rejected and heuristics still run (local mode)', async () => {
    const document = documentWith([paragraph('p1', 'Corto.'), paragraph('p2', 'Corto también.')]);
    const provider = fakeProvider('garbage — not a schema match');

    const { proposals, mode } = await proposeStructuralFixes({ document, violations: [violation] }, provider, identity);

    expect(mode).toBe('local');
    expect(proposals.every((proposal) => proposal.kind !== 'llm-suggested')).toBe(true);
    // The heuristic merge proposal is still there.
    expect(proposals.some((proposal) => proposal.kind === 'merge-paragraphs')).toBe(true);
  });

  test('replacement blocks with unknown ids are rejected', async () => {
    const document = documentWith([paragraph('p1', 'Corto.')]);
    const provider = fakeProvider({
      suggestions: [
        { summary: 'Inventar bloque', replacementBlock: { id: 'nope', type: 'paragraph', content: [] } },
      ],
    });

    const { proposals, mode } = await proposeStructuralFixes({ document, violations: [violation] }, provider, identity);
    expect(mode).toBe('local');
    expect(proposals.every((proposal) => proposal.kind !== 'llm-suggested')).toBe(true);
  });

  test('provider failure degrades to heuristics without breaking', async () => {
    const document = documentWith([paragraph('p1', 'Corto.'), paragraph('p2', 'Otro corto.')]);
    const provider: AiProvider = {
      kind: 'openai',
      completeJson: () => Promise.reject(new Error('network down')),
    };

    const { proposals, mode } = await proposeStructuralFixes({ document, violations: [violation] }, provider, identity);
    expect(mode).toBe('local');
    expect(proposals.some((proposal) => proposal.kind === 'merge-paragraphs')).toBe(true);
  });
});

describe('parseLlmFixResponse', () => {
  test('rejects malformed shapes', () => {
    expect(parseLlmFixResponse(null)).toEqual([]);
    expect(parseLlmFixResponse({ suggestions: [{ summary: '' }] })).toEqual([]);
    expect(
      parseLlmFixResponse({
        suggestions: [{ summary: 'ok', replacementBlock: { id: 'x', type: 'unknown-type' } }],
      }),
    ).toEqual([]);
  });

  test('accepts well-formed suggestions with or without replacement', () => {
    const suggestions = parseLlmFixResponse({
      suggestions: [
        { summary: 'Solo aviso' },
        { summary: 'Cambio', replacementBlock: { id: 'p1', type: 'paragraph', content: [] } },
      ],
    });
    expect(suggestions).toHaveLength(2);
    expect(suggestions[0].replacementBlock).toBeUndefined();
  });
});
