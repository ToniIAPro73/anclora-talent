import { describe, expect, test } from 'vitest';

import type { DocumentBlock, SemanticDocument } from './model';
import { FRONT_MATTER_ANCHOR, blockToPlainText, diffDocuments } from './diff';

function heading(id: string, text: string, level: 1 | 2 = 1): DocumentBlock {
  return { id, type: 'heading', level, content: [{ type: 'text', text }] };
}

function paragraph(id: string, text: string): DocumentBlock {
  return { id, type: 'paragraph', content: [{ type: 'text', text }] };
}

function doc(blocks: DocumentBlock[], title = 'Libro'): SemanticDocument {
  return { version: 1, metadata: { title }, blocks };
}

describe('blockToPlainText', () => {
  test('flattens inline flows and lists', () => {
    expect(blockToPlainText(paragraph('p1', 'Hola'))).toBe('Hola');
    expect(
      blockToPlainText({
        id: 'l1',
        type: 'list',
        ordered: false,
        items: [[{ type: 'text', text: 'Uno' }], [{ type: 'text', text: 'Dos' }]],
      }),
    ).toBe('Uno · Dos');
  });
});

describe('diffDocuments', () => {
  test('identical documents produce an empty diff', () => {
    const a = doc([heading('h1', 'Capítulo 1'), paragraph('p1', 'Hola')]);
    const diff = diffDocuments(a, doc([heading('h1', 'Capítulo 1'), paragraph('p1', 'Hola')]));
    expect(diff.chapters).toEqual([]);
    expect(diff.counts).toEqual({ added: 0, removed: 0, changed: 0, moved: 0 });
    expect(diff.metadataChanged).toBe(false);
  });

  test('detects added, removed and changed blocks by stable id', () => {
    const before = doc([
      heading('h1', 'Capítulo 1'),
      paragraph('p1', 'Hola'),
      paragraph('p2', 'Adiós'),
    ]);
    const after = doc([
      heading('h1', 'Capítulo 1'),
      paragraph('p1', 'Hola editado'),
      paragraph('p3', 'Nuevo'),
    ]);

    const diff = diffDocuments(before, after);
    expect(diff.counts).toEqual({ added: 1, removed: 1, changed: 1, moved: 0 });

    const group = diff.chapters.find((chapter) => chapter.anchorId === 'h1');
    expect(group?.changes).toEqual([
      { kind: 'changed', blockId: 'p1', blockType: 'paragraph', preview: 'Hola editado', previousPreview: 'Hola' },
      { kind: 'added', blockId: 'p3', blockType: 'paragraph', preview: 'Nuevo' },
      { kind: 'removed', blockId: 'p2', blockType: 'paragraph', preview: 'Adiós' },
    ]);
  });

  test('detects moved blocks: identical content, different relative order', () => {
    const before = doc([heading('h1', 'Cap'), paragraph('a', 'A'), paragraph('b', 'B'), paragraph('c', 'C')]);
    const after = doc([heading('h1', 'Cap'), paragraph('c', 'C'), paragraph('a', 'A'), paragraph('b', 'B')]);

    const diff = diffDocuments(before, after);
    expect(diff.counts.moved).toBe(1);
    expect(diff.counts.added).toBe(0);
    expect(diff.counts.changed).toBe(0);
    const moved = diff.chapters[0].changes.filter((change) => change.kind === 'moved');
    expect(moved.map((change) => change.blockId)).toEqual(['c']);
  });

  test('insertions do not flag the surrounding blocks as moved', () => {
    const before = doc([heading('h1', 'Cap'), paragraph('a', 'A'), paragraph('b', 'B')]);
    const after = doc([heading('h1', 'Cap'), paragraph('a', 'A'), paragraph('x', 'X'), paragraph('b', 'B')]);

    const diff = diffDocuments(before, after);
    expect(diff.counts).toEqual({ added: 1, removed: 0, changed: 0, moved: 0 });
  });

  test('groups a brand-new chapter under its heading anchor', () => {
    const before = doc([heading('h1', 'Capítulo 1'), paragraph('p1', 'Hola')]);
    const after = doc([
      heading('h1', 'Capítulo 1'),
      paragraph('p1', 'Hola'),
      heading('h2', 'Capítulo 2'),
      paragraph('p2', 'Contenido'),
    ]);

    const diff = diffDocuments(before, after);
    expect(diff.chapters).toHaveLength(1);
    expect(diff.chapters[0].anchorId).toBe('h2');
    expect(diff.chapters[0].title).toBe('Capítulo 2');
    expect(diff.chapters[0].changes.map((change) => change.blockId)).toEqual(['h2', 'p2']);
    expect(diff.chapters[0].changes.every((change) => change.kind === 'added')).toBe(true);
  });

  test('a fully removed chapter keeps its group at the end', () => {
    const before = doc([
      heading('h1', 'Capítulo 1'),
      paragraph('p1', 'Hola'),
      heading('h2', 'Capítulo 2'),
      paragraph('p2', 'Contenido'),
    ]);
    const after = doc([heading('h1', 'Capítulo 1'), paragraph('p1', 'Hola editado')]);

    const diff = diffDocuments(before, after);
    expect(diff.chapters.map((chapter) => chapter.anchorId)).toEqual(['h1', 'h2']);
    const removedGroup = diff.chapters[1];
    expect(removedGroup.title).toBe('Capítulo 2');
    expect(removedGroup.changes.map((change) => change.kind)).toEqual(['removed', 'removed']);
  });

  test('front matter (before the first chapter) lands in the front group', () => {
    const before = doc([paragraph('p0', 'Prólogo viejo'), heading('h1', 'Capítulo 1')]);
    const after = doc([paragraph('p0', 'Prólogo nuevo'), heading('h1', 'Capítulo 1')]);

    const diff = diffDocuments(before, after);
    expect(diff.chapters[0].anchorId).toBe(FRONT_MATTER_ANCHOR);
    expect(diff.chapters[0].changes[0]).toMatchObject({ kind: 'changed', blockId: 'p0' });
  });

  test('flags metadata changes separately from block changes', () => {
    const before = doc([paragraph('p1', 'Hola')], 'Libro A');
    const after = doc([paragraph('p1', 'Hola')], 'Libro B');

    const diff = diffDocuments(before, after);
    expect(diff.metadataChanged).toBe(true);
    expect(diff.chapters).toEqual([]);
  });
});
