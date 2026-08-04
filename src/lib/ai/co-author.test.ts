import { describe, expect, test } from 'vitest';
import type { SemanticDocument } from '@/lib/document/model';
import { applyProposal } from './ast-diff-proposal';
import {
  listCoAuthorChapters,
  parseArchitectureResponse,
  parseDerivedSummaryResponse,
  parseStyleRewriteResponse,
  proposeChapterArchitecture,
  proposeDerivedSummary,
  proposeStyleRewrite,
} from './co-author';
import { NullProvider, type AiProvider } from './provider';

const IDENTITY = { id: 'ai-co-1', createdAt: '2026-01-01T00:00:00.000Z' };

function fixtureDocument(): SemanticDocument {
  return {
    version: 1,
    metadata: { title: 'Doc' },
    blocks: [
      { id: 'h1', type: 'heading', level: 1, content: [{ type: 'text', text: 'Capítulo uno' }] },
      { id: 'p1', type: 'paragraph', content: [{ type: 'text', text: 'Primera idea del capítulo.' }] },
      { id: 'p2', type: 'paragraph', content: [{ type: 'text', text: 'Segunda idea del capítulo.' }] },
      {
        id: 'p-ref',
        type: 'paragraph',
        content: [
          { type: 'text', text: 'Ver la ' },
          { type: 'ref', refKind: 'figure', targetId: 'fig1', fallback: 'figura 1' },
        ],
      },
      { id: 'h2', type: 'heading', level: 1, content: [{ type: 'text', text: 'Capítulo dos' }] },
      { id: 'p3', type: 'paragraph', content: [{ type: 'text', text: 'Contenido del segundo capítulo.' }] },
    ],
  };
}

function fakeProvider(response: unknown): AiProvider {
  return {
    kind: 'openai',
    completeJson: () => Promise.resolve(response),
  };
}

function failingProvider(): AiProvider {
  return {
    kind: 'openai',
    completeJson: () => Promise.reject(new Error('boom')),
  };
}

const identity = () => IDENTITY;

describe('listCoAuthorChapters', () => {
  test('lists chapters anchored by their first block id', () => {
    const chapters = listCoAuthorChapters(fixtureDocument());
    expect(chapters).toEqual([
      { key: 'h1', title: 'Capítulo uno' },
      { key: 'h2', title: 'Capítulo dos' },
    ]);
  });
});

describe('proposeStyleRewrite', () => {
  test('is unavailable without a cloud provider (LLM-obligatory, no fake heuristic)', async () => {
    const result = await proposeStyleRewrite(
      { document: fixtureDocument(), chapterKey: 'h1' },
      new NullProvider(),
    );
    expect(result).toEqual({ proposal: null, mode: 'cloud', available: false });
  });

  test('builds one update operation per rewritten paragraph, skipping ref paragraphs', async () => {
    const provider = fakeProvider({
      rewrites: [
        { blockId: 'p1', text: 'La primera idea, reescrita con mejor ritmo.' },
        { blockId: 'p2', text: 'La segunda idea, ahora más clara.' },
        { blockId: 'p-ref', text: 'NO debe aplicarse: contiene una ref viva.' },
        { blockId: 'ghost', text: 'Bloque inexistente.' },
      ],
    });

    const result = await proposeStyleRewrite(
      { document: fixtureDocument(), chapterKey: 'h1', locale: 'es' },
      provider,
      identity,
    );

    expect(result.available).toBe(true);
    expect(result.mode).toBe('cloud');
    const proposal = result.proposal;
    expect(proposal).not.toBeNull();
    expect(proposal!.kind).toBe('style-rewrite');
    expect(proposal!.provenance).toBe('ai');
    expect(proposal!.operations).toHaveLength(2);
    expect(proposal!.operations.every((op) => op.type === 'update')).toBe(true);

    const edited = applyProposal(fixtureDocument(), proposal!);
    const p1 = edited.blocks.find((block) => block.id === 'p1');
    expect(p1).toEqual({
      id: 'p1',
      type: 'paragraph',
      content: [{ type: 'text', text: 'La primera idea, reescrita con mejor ritmo.' }],
    });
    // Ref paragraph untouched.
    const pRef = edited.blocks.find((block) => block.id === 'p-ref');
    expect(JSON.stringify(pRef)).toContain('"ref"');
  });

  test('injects brand voice pairs as few-shot contrast examples', async () => {
    let capturedPrompt = '';
    const provider: AiProvider = {
      kind: 'openai',
      completeJson: (request) => {
        capturedPrompt = request.prompt;
        return Promise.resolve({ rewrites: [{ blockId: 'p1', text: 'Reescrito.' }] });
      },
    };

    await proposeStyleRewrite(
      {
        document: fixtureDocument(),
        chapterKey: 'h1',
        voicePairs: [{ soundsLike: 'Directo y cercano.', doesntSoundLike: 'Grandilocuente.' }],
      },
      provider,
      identity,
    );

    expect(capturedPrompt).toContain('ASÍ SUENA: "Directo y cercano."');
    expect(capturedPrompt).toContain('ASÍ NO SUENA: "Grandilocuente."');
  });

  test('falls back to a neutral conservative style without voice pairs', async () => {
    let capturedPrompt = '';
    const provider: AiProvider = {
      kind: 'openai',
      completeJson: (request) => {
        capturedPrompt = request.prompt;
        return Promise.resolve({ rewrites: [{ blockId: 'p1', text: 'Reescrito.' }] });
      },
    };

    await proposeStyleRewrite({ document: fixtureDocument(), chapterKey: 'h1' }, provider, identity);
    expect(capturedPrompt).toContain('neutra');
  });

  test('returns no proposal when the LLM response does not validate (never a corrupt diff)', async () => {
    const result = await proposeStyleRewrite(
      { document: fixtureDocument(), chapterKey: 'h1' },
      fakeProvider({ rewrites: 'not-an-array' }),
      identity,
    );
    expect(result.proposal).toBeNull();
  });

  test('returns no proposal when every rewrite is identical to the source', async () => {
    const result = await proposeStyleRewrite(
      { document: fixtureDocument(), chapterKey: 'h1' },
      fakeProvider({ rewrites: [{ blockId: 'p1', text: 'Primera idea del capítulo.' }] }),
      identity,
    );
    expect(result.proposal).toBeNull();
  });

  test('returns no proposal on provider failure', async () => {
    const result = await proposeStyleRewrite(
      { document: fixtureDocument(), chapterKey: 'h1' },
      failingProvider(),
      identity,
    );
    expect(result).toEqual({ proposal: null, mode: 'cloud', available: true });
  });

  test('unknown chapter key yields no proposal', async () => {
    const result = await proposeStyleRewrite(
      { document: fixtureDocument(), chapterKey: 'nope' },
      fakeProvider({ rewrites: [] }),
      identity,
    );
    expect(result.proposal).toBeNull();
  });
});

describe('proposeChapterArchitecture', () => {
  test('is unavailable without a cloud provider', async () => {
    const result = await proposeChapterArchitecture(
      { document: fixtureDocument(), chapterKey: 'h1' },
      undefined,
    );
    expect(result.available).toBe(false);
    expect(result.proposal).toBeNull();
  });

  test('builds move + insert-heading operations with server-generated ids', async () => {
    const provider = fakeProvider({
      moves: [{ blockId: 'p2', afterBlockId: 'h1' }],
      headings: [{ afterBlockId: 'p2', text: 'Subsección propuesta', level: 2 }],
    });

    const result = await proposeChapterArchitecture(
      { document: fixtureDocument(), chapterKey: 'h1', locale: 'es' },
      provider,
      identity,
    );

    const proposal = result.proposal;
    expect(proposal).not.toBeNull();
    expect(proposal!.kind).toBe('content-architecture');
    expect(proposal!.operations.some((op) => op.type === 'move')).toBe(true);
    const insert = proposal!.operations.find((op) => op.type === 'insert');
    expect(insert).toBeDefined();
    if (insert?.type === 'insert') {
      expect(insert.block.type).toBe('heading');
      expect(insert.block.id.startsWith('ai-')).toBe(true);
      expect(fixtureDocument().blocks.some((block) => block.id === insert.block.id)).toBe(false);
    }

    // The proposal applies cleanly over the current document.
    const edited = applyProposal(fixtureDocument(), proposal!);
    expect(edited.blocks.length).toBe(fixtureDocument().blocks.length + 1);
  });

  test('drops moves/headings anchored to unknown blocks', async () => {
    const provider = fakeProvider({
      moves: [{ blockId: 'ghost', afterBlockId: 'h1' }],
      headings: [{ afterBlockId: 'ghost', text: 'Nada' }],
    });
    const result = await proposeChapterArchitecture(
      { document: fixtureDocument(), chapterKey: 'h1' },
      provider,
      identity,
    );
    expect(result.proposal).toBeNull();
  });

  test('returns no proposal when the LLM response does not validate', async () => {
    const result = await proposeChapterArchitecture(
      { document: fixtureDocument(), chapterKey: 'h1' },
      fakeProvider(42),
      identity,
    );
    expect(result.proposal).toBeNull();
  });
});

describe('proposeDerivedSummary', () => {
  test('is unavailable without a cloud provider', async () => {
    const result = await proposeDerivedSummary({ document: fixtureDocument() }, new NullProvider());
    expect(result).toEqual({ proposal: null, mode: 'cloud', available: false });
  });

  test('appends a level-1 heading + paragraphs at the end of the document', async () => {
    const provider = fakeProvider({
      title: 'Resumen',
      paragraphs: ['Idea clave uno.', 'Idea clave dos.'],
    });

    const result = await proposeDerivedSummary(
      { document: fixtureDocument(), locale: 'es' },
      provider,
      identity,
    );

    const proposal = result.proposal;
    expect(proposal).not.toBeNull();
    expect(proposal!.kind).toBe('derived-summary');
    expect(proposal!.operations).toHaveLength(3);
    expect(proposal!.operations.every((op) => op.type === 'insert')).toBe(true);

    const edited = applyProposal(fixtureDocument(), proposal!);
    const tail = edited.blocks.slice(-3);
    expect(tail[0]).toMatchObject({ type: 'heading', level: 1 });
    expect(tail[1]).toMatchObject({ type: 'paragraph' });
    expect(tail[2]).toMatchObject({ type: 'paragraph' });
    // Original blocks untouched and in order.
    expect(edited.blocks.slice(0, fixtureDocument().blocks.length)).toEqual(fixtureDocument().blocks);
  });

  test('returns no proposal when the LLM response does not validate', async () => {
    const result = await proposeDerivedSummary(
      { document: fixtureDocument() },
      fakeProvider({ title: 'Resumen' }),
      identity,
    );
    expect(result.proposal).toBeNull();
  });
});

describe('response parsers (validation boundary)', () => {
  test('parseStyleRewriteResponse accepts valid and rejects invalid shapes', () => {
    expect(parseStyleRewriteResponse({ rewrites: [{ blockId: 'p1', text: 'x' }] })).toHaveLength(1);
    expect(parseStyleRewriteResponse({ rewrites: [{ blockId: '', text: 'x' }] })).toEqual([]);
    expect(parseStyleRewriteResponse(null)).toEqual([]);
  });

  test('parseArchitectureResponse applies defaults and rejects invalid shapes', () => {
    const parsed = parseArchitectureResponse({ moves: [], headings: [] });
    expect(parsed).toEqual({ moves: [], headings: [] });
    expect(parseArchitectureResponse('nope')).toBeNull();
  });

  test('parseDerivedSummaryResponse requires title and paragraphs', () => {
    expect(parseDerivedSummaryResponse({ title: 'T', paragraphs: ['a'] })).not.toBeNull();
    expect(parseDerivedSummaryResponse({ title: 'T', paragraphs: [] })).toBeNull();
    expect(parseDerivedSummaryResponse({})).toBeNull();
  });
});

describe('proposal identity default', () => {
  test('works with the default identity factory (no injected identity)', async () => {
    const provider = fakeProvider({ title: 'Resumen', paragraphs: ['Uno.'] });
    const result = await proposeDerivedSummary({ document: fixtureDocument() }, provider);
    expect(result.proposal).not.toBeNull();
    expect(result.proposal!.id).toMatch(/^ai-/);
  });
});
