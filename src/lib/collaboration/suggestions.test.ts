import { describe, expect, test } from 'vitest';

import type { SemanticDocument } from '@/lib/document/model';
import { buildTextReplacementSuggestion, parseStoredOperations } from './suggestions';

function documentFixture(): SemanticDocument {
  return {
    version: 1,
    metadata: { title: 'Libro', author: 'Autor' },
    blocks: [
      {
        id: 'h-1',
        type: 'heading',
        level: 1,
        content: [{ type: 'text', text: 'Capítulo uno' }],
      },
      {
        id: 'p-1',
        type: 'paragraph',
        content: [
          { type: 'text', text: 'Texto con ' },
          { type: 'text', text: 'errata', marks: [{ type: 'bold' }] },
        ],
      },
      { id: 'img-1', type: 'image', src: 'figura.png' },
    ],
  };
}

describe('buildTextReplacementSuggestion', () => {
  test('builds an update operation anchored by stable block id with before/after', () => {
    const built = buildTextReplacementSuggestion(documentFixture(), {
      blockId: 'p-1',
      replacementText: 'Texto con errata corregida',
    });

    expect('error' in built).toBe(false);
    if ('error' in built) return;
    expect(built.operations).toHaveLength(1);
    const [operation] = built.operations;
    expect(operation.type).toBe('update');
    if (operation.type !== 'update') return;
    expect(operation.blockId).toBe('p-1');
    expect(operation.before).toMatchObject({ id: 'p-1', type: 'paragraph' });
    expect(operation.after).toMatchObject({
      id: 'p-1',
      content: [{ type: 'text', text: 'Texto con errata corregida' }],
    });
    // The readable diff (F2 format) flags the block as changed.
    const changed = built.diff.chapters.flatMap((chapter) => chapter.changes);
    expect(changed).toEqual([
      expect.objectContaining({ kind: 'changed', blockId: 'p-1' }),
    ]);
  });

  test('supports headings and rejects non-text blocks', () => {
    const heading = buildTextReplacementSuggestion(documentFixture(), {
      blockId: 'h-1',
      replacementText: 'Capítulo 1',
    });
    expect('error' in heading).toBe(false);

    expect(
      buildTextReplacementSuggestion(documentFixture(), {
        blockId: 'img-1',
        replacementText: 'no aplica',
      }),
    ).toEqual({ error: 'unsupportedBlock' });
  });

  test('missing block, empty text and no-op replacements do not produce patches', () => {
    expect(
      buildTextReplacementSuggestion(documentFixture(), { blockId: 'ghost', replacementText: 'x' }),
    ).toEqual({ error: 'blockNotFound' });
    expect(
      buildTextReplacementSuggestion(documentFixture(), { blockId: 'p-1', replacementText: '   ' }),
    ).toEqual({ error: 'unchanged' });
    expect(
      buildTextReplacementSuggestion(documentFixture(), {
        blockId: 'p-1',
        replacementText: 'Texto con errata',
      }),
    ).toEqual({ error: 'unchanged' });
  });
});

describe('parseStoredOperations', () => {
  test('accepts well-formed operations and rejects corrupted JSONB payloads', () => {
    const built = buildTextReplacementSuggestion(documentFixture(), {
      blockId: 'p-1',
      replacementText: 'Texto corregido',
    });
    if ('error' in built) throw new Error('fixture must build');

    const roundTripped = JSON.parse(JSON.stringify(built.operations)) as unknown;
    expect(parseStoredOperations(roundTripped)).toEqual(built.operations);

    expect(parseStoredOperations(null)).toBeNull();
    expect(parseStoredOperations([])).toBeNull();
    expect(parseStoredOperations([{ type: 'drop-table' }])).toBeNull();
    expect(parseStoredOperations(['update'])).toBeNull();
  });
});
