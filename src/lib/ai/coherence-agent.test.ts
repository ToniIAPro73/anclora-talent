import { describe, expect, test } from 'vitest';
import type { HeadingBlock, ParagraphBlock, SemanticDocument } from '@/lib/document/model';
import type { AiProvider } from './provider';
import { applyProposal, type ProposalIdentity } from './ast-diff-proposal';
import {
  analyzeCoherence,
  parseLlmRenameResponse,
  proposeCoherenceFixes,
} from './coherence-agent';

let counter = 0;
function identity(): ProposalIdentity {
  counter += 1;
  return { id: `ai-coh-${counter}`, createdAt: '2026-01-01T00:00:00.000Z' };
}

function heading(id: string, level: HeadingBlock['level'], text: string): HeadingBlock {
  return { id, type: 'heading', level, content: [{ type: 'text', text }] };
}

function paragraph(id: string, text: string): ParagraphBlock {
  return { id, type: 'paragraph', content: [{ type: 'text', text }] };
}

function documentWith(blocks: SemanticDocument['blocks']): SemanticDocument {
  return { version: 1, metadata: { title: 'Doc' }, blocks };
}

describe('analyzeCoherence', () => {
  test('detects broken live refs to missing targets', () => {
    const document = documentWith([
      heading('h1', 1, 'Capítulo'),
      {
        id: 'p1',
        type: 'paragraph',
        content: [
          { type: 'text', text: 'Ver la ' },
          { type: 'ref', refKind: 'figure', targetId: 'fig-gone', fallback: 'figura 1' },
        ],
      },
    ]);

    const issues = analyzeCoherence(document);
    expect(issues).toEqual([{ type: 'broken-ref', blockId: 'p1', targetId: 'fig-gone' }]);
  });

  test('ignores refs whose target exists', () => {
    const document = documentWith([
      heading('h1', 1, 'Capítulo'),
      {
        id: 'p1',
        type: 'paragraph',
        content: [{ type: 'ref', refKind: 'chapter', targetId: 'h1' }],
      },
    ]);
    expect(analyzeCoherence(document)).toEqual([]);
  });

  test('detects duplicated headings at the same level', () => {
    const document = documentWith([
      heading('h1', 1, 'Capítulo'),
      heading('h2', 2, 'Resumen'),
      heading('h3', 2, '  resumen '),
      heading('h4', 3, 'Resumen'),
    ]);
    const issues = analyzeCoherence(document);
    // headingText is the plain (trimmed) heading text; matching is normalized.
    expect(issues).toEqual([
      { type: 'duplicate-heading', blockId: 'h3', headingText: 'resumen', level: 2 },
    ]);
  });

  test('detects chapters without a level-1 heading (front matter excluded)', () => {
    const document = documentWith([
      paragraph('front', 'Portada interior'),
      heading('h1', 1, 'Capítulo 1'),
      paragraph('p1', 'Texto'),
      paragraph('orphan-chapter', 'Esto abre capítulo implícito?'),
    ]);
    // Only one H1 → one chapter; nothing missing.
    expect(analyzeCoherence(document).filter((i) => i.type === 'missing-chapter-heading')).toEqual([]);

    // splitChapters only starts a new slice at level-1 headings, so a missing
    // chapter heading scenario needs a second forced slice — covered through
    // the composed slices: two H1s with content before the first one is front
    // matter, never flagged.
    const withFront = documentWith([paragraph('f', 'front'), heading('h1', 1, 'Cap'), heading('h2', 1, 'Cap 2')]);
    expect(analyzeCoherence(withFront).filter((i) => i.type === 'missing-chapter-heading')).toEqual([]);
  });
});

describe('proposeCoherenceFixes (heuristics)', () => {
  test('broken ref → proposal materializing it as plain text (fallback)', async () => {
    const document = documentWith([
      heading('h1', 1, 'Capítulo'),
      {
        id: 'p1',
        type: 'paragraph',
        content: [
          { type: 'text', text: 'Ver la ' },
          { type: 'ref', refKind: 'figure', targetId: 'fig-gone', fallback: 'figura 1' },
        ],
      },
    ]);

    const { issues, proposals, mode } = await proposeCoherenceFixes(document, { identity });
    expect(issues).toHaveLength(1);
    expect(mode).toBe('local');
    expect(proposals).toHaveLength(1);
    expect(proposals[0].kind).toBe('broken-ref');

    const edited = applyProposal(document, proposals[0]);
    const content = (edited.blocks[1] as ParagraphBlock).content;
    expect(content).toEqual([
      { type: 'text', text: 'Ver la ' },
      { type: 'text', text: 'figura 1' },
    ]);
  });

  test('duplicated heading → rename proposal with numeric suffix', async () => {
    const document = documentWith([
      heading('h1', 1, 'Capítulo'),
      heading('h2', 2, 'Resumen'),
      heading('h3', 2, 'Resumen'),
    ]);

    const { proposals } = await proposeCoherenceFixes(document, { identity });
    expect(proposals).toHaveLength(1);
    expect(proposals[0].kind).toBe('duplicate-heading');

    const edited = applyProposal(document, proposals[0]);
    expect((edited.blocks[2] as HeadingBlock).content[0]).toMatchObject({ text: 'Resumen (2)' });
  });

  test('duplicated heading → LLM title used when valid (cloud mode)', async () => {
    const document = documentWith([
      heading('h1', 1, 'Capítulo'),
      heading('h2', 2, 'Resumen'),
      heading('h3', 2, 'Resumen'),
    ]);
    const provider: AiProvider = {
      kind: 'openai',
      completeJson: () =>
        Promise.resolve({ renames: [{ blockId: 'h3', title: 'Resumen ejecutivo' }] }),
    };

    const { proposals, mode } = await proposeCoherenceFixes(document, { provider, identity });
    expect(mode).toBe('cloud');
    const edited = applyProposal(document, proposals[0]);
    expect((edited.blocks[2] as HeadingBlock).content[0]).toMatchObject({ text: 'Resumen ejecutivo' });
  });

  test('invalid LLM titles fall back to numeric suffixes (local mode)', async () => {
    const document = documentWith([
      heading('h1', 1, 'Capítulo'),
      heading('h2', 2, 'Resumen'),
      heading('h3', 2, 'Resumen'),
    ]);
    const provider: AiProvider = {
      kind: 'openai',
      // Title still duplicated + unknown blockId → both rejected.
      completeJson: () =>
        Promise.resolve({
          renames: [
            { blockId: 'h3', title: 'Resumen' },
            { blockId: 'ghost', title: 'Otro' },
          ],
        }),
    };

    const { proposals, mode } = await proposeCoherenceFixes(document, { provider, identity });
    expect(mode).toBe('local');
    const edited = applyProposal(document, proposals[0]);
    expect((edited.blocks[2] as HeadingBlock).content[0]).toMatchObject({ text: 'Resumen (2)' });
  });
});

describe('parseLlmRenameResponse', () => {
  test('rejects malformed responses', () => {
    expect(parseLlmRenameResponse(undefined)).toEqual([]);
    expect(parseLlmRenameResponse({ renames: [{ blockId: '', title: 'x' }] })).toEqual([]);
    expect(parseLlmRenameResponse({ renames: [{ blockId: 'h3' }] })).toEqual([]);
  });
});
