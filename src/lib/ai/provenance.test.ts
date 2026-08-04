import { describe, expect, test } from 'vitest';
import type { SemanticDocument } from '@/lib/document/model';
import { countProvenance, deriveProvenanceUpdate, pruneProvenance } from './provenance';

function documentWith(ids: string[]): SemanticDocument {
  return {
    version: 1,
    metadata: { title: 'Doc' },
    blocks: ids.map((id) => ({
      id,
      type: 'paragraph' as const,
      content: [{ type: 'text' as const, text: `Texto de ${id}` }],
    })),
  };
}

describe('deriveProvenanceUpdate', () => {
  test('stamps every block on the first model save (no previous document)', () => {
    const next = documentWith(['a', 'b']);
    const result = deriveProvenanceUpdate(null, next, undefined, 'human');
    expect(result).toEqual({ a: 'human', b: 'human' });
  });

  test('marks added and changed blocks with the edit origin and keeps the rest', () => {
    const previous = documentWith(['a', 'b']);
    const next = documentWith(['a', 'b', 'c']);
    next.blocks[1] = { id: 'b', type: 'paragraph', content: [{ type: 'text', text: 'b editado' }] };

    const result = deriveProvenanceUpdate(previous, next, { a: 'ai', b: 'human' }, 'ai');

    expect(result.a).toBe('ai'); // untouched keeps its origin
    expect(result.b).toBe('ai'); // changed by this edit
    expect(result.c).toBe('ai'); // added by this edit
  });

  test('a human edit re-marks AI-authored blocks it touches as human', () => {
    const previous = documentWith(['a']);
    const next = documentWith(['a']);
    next.blocks[0] = { id: 'a', type: 'paragraph', content: [{ type: 'text', text: 'a editado a mano' }] };

    const result = deriveProvenanceUpdate(previous, next, { a: 'ai' }, 'human');
    expect(result.a).toBe('human');
  });

  test('drops provenance of removed blocks', () => {
    const previous = documentWith(['a', 'b']);
    const next = documentWith(['a']);
    const result = deriveProvenanceUpdate(previous, next, { a: 'human', b: 'ai' }, 'human');
    expect(result).toEqual({ a: 'human' });
  });
});

describe('pruneProvenance / countProvenance', () => {
  test('prunes unknown ids and ignores invalid values', () => {
    const map = { a: 'ai', b: 'human', gone: 'ai', bad: 'robot' } as never;
    const pruned = pruneProvenance(map, documentWith(['a', 'b']));
    expect(pruned).toEqual({ a: 'ai', b: 'human' });
  });

  test('counts origins for the UI summary', () => {
    expect(countProvenance({ a: 'ai', b: 'human', c: 'ai' })).toEqual({ human: 1, ai: 2 });
    expect(countProvenance(null)).toEqual({ human: 0, ai: 0 });
  });
});
