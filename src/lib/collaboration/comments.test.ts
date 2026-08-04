import { describe, expect, test } from 'vitest';

import type { SemanticDocument } from '@/lib/document/model';
import {
  buildCommentGroups,
  countOpenThreads,
  findBlockAnchor,
  groupCommentsIntoThreads,
  indexDocumentBlocks,
} from './comments';
import type { BlockCommentView } from './model';

function documentFixture(): SemanticDocument {
  return {
    version: 1,
    metadata: { title: 'Libro', author: 'Autor' },
    blocks: [
      { id: 'fm-1', type: 'paragraph', content: [{ type: 'text', text: 'Prólogo de presentación' }] },
      {
        id: 'ch-1',
        type: 'heading',
        level: 1,
        content: [{ type: 'text', text: 'Capítulo uno' }],
      },
      { id: 'p-1', type: 'paragraph', content: [{ type: 'text', text: 'Texto del capítulo uno.' }] },
      {
        id: 'ch-2',
        type: 'heading',
        level: 1,
        content: [{ type: 'text', text: 'Capítulo dos' }],
      },
      { id: 'q-2', type: 'quote', content: [{ type: 'text', text: 'Cita del capítulo dos.' }] },
    ],
  };
}

let commentSeq = 0;
function commentFixture(overrides: Partial<BlockCommentView> = {}): BlockCommentView {
  commentSeq += 1;
  return {
    id: `c-${commentSeq}`,
    blockId: 'p-1',
    parentId: null,
    authorId: 'user-1',
    authorName: 'Autor Uno',
    authorRole: 'author',
    body: 'Comentario',
    status: 'open',
    resolvedByName: null,
    resolvedAt: null,
    createdAt: new Date(Date.UTC(2026, 7, 4, 12, commentSeq)).toISOString(),
    ...overrides,
  };
}

describe('indexDocumentBlocks — stable AST anchors', () => {
  test('maps every block to its chapter by level-1 heading slices', () => {
    const index = indexDocumentBlocks(documentFixture());

    expect(index.get('fm-1')).toMatchObject({ chapterIndex: -1, chapterTitle: '' });
    expect(index.get('ch-1')).toMatchObject({ chapterIndex: 0, chapterTitle: 'Capítulo uno' });
    expect(index.get('p-1')).toMatchObject({ chapterIndex: 0, preview: 'Texto del capítulo uno.' });
    expect(index.get('q-2')).toMatchObject({ chapterIndex: 1, chapterTitle: 'Capítulo dos' });
  });

  test('anchors are block ids: unknown ids resolve to null, never offsets', () => {
    const document = documentFixture();
    expect(findBlockAnchor(document, 'p-1')?.blockId).toBe('p-1');
    expect(findBlockAnchor(document, 'removed-block')).toBeNull();
  });
});

describe('groupCommentsIntoThreads', () => {
  test('replies attach to their root regardless of interleaving', () => {
    const rootA = commentFixture({ id: 'a', blockId: 'p-1' });
    const rootB = commentFixture({ id: 'b', blockId: 'q-2' });
    const replyA1 = commentFixture({ id: 'a1', parentId: 'a' });
    const replyA2 = commentFixture({ id: 'a2', parentId: 'a' });

    const threads = groupCommentsIntoThreads([rootA, rootB, replyA1, replyA2]);

    expect(threads).toHaveLength(2);
    expect(threads[0].root.id).toBe('a');
    expect(threads[0].replies.map((reply) => reply.id)).toEqual(['a1', 'a2']);
    expect(threads[1].root.id).toBe('b');
    expect(threads[1].replies).toHaveLength(0);
  });

  test('orphan replies surface as their own thread — feedback is never dropped', () => {
    const orphan = commentFixture({ id: 'orphan', parentId: 'deleted-root' });
    const threads = groupCommentsIntoThreads([orphan]);
    expect(threads).toHaveLength(1);
    expect(threads[0].root.id).toBe('orphan');
  });
});

describe('buildCommentGroups', () => {
  test('groups threads by chapter then block following document order', () => {
    const comments = [
      commentFixture({ id: 'q-root', blockId: 'q-2' }),
      commentFixture({ id: 'fm-root', blockId: 'fm-1' }),
      commentFixture({ id: 'p-root', blockId: 'p-1' }),
      commentFixture({ id: 'p-reply', blockId: 'p-1', parentId: 'p-root' }),
    ];

    const groups = buildCommentGroups(comments, documentFixture());

    expect(groups.map((group) => group.chapterIndex)).toEqual([-1, 0, 1]);
    expect(groups[0].chapterTitle).toBe('');
    expect(groups[1].chapterTitle).toBe('Capítulo uno');
    expect(groups[1].blocks[0].blockId).toBe('p-1');
    expect(groups[1].blocks[0].threads[0].replies).toHaveLength(1);
    expect(groups[2].blocks[0].blockPreview).toBe('Cita del capítulo dos.');
  });

  test('comments whose anchor block disappeared stay visible as front matter', () => {
    const comments = [commentFixture({ id: 'lost', blockId: 'removed-block' })];
    const groups = buildCommentGroups(comments, documentFixture());

    expect(groups).toHaveLength(1);
    expect(groups[0].chapterIndex).toBe(-1);
    expect(groups[0].blocks[0].blockId).toBe('removed-block');
  });
});

describe('countOpenThreads', () => {
  test('counts open thread roots only (replies never add up)', () => {
    const comments = [
      commentFixture({ id: 'open-1', status: 'open' }),
      commentFixture({ id: 'resolved-1', status: 'resolved' }),
      commentFixture({ id: 'reply', parentId: 'open-1', status: 'open' }),
    ];
    expect(countOpenThreads(comments)).toBe(1);
  });
});
