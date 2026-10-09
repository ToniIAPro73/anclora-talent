import { describe, expect, test } from 'vitest';
import type { ChapterCommentGroup } from './comments';
import type { BlockCommentView, EditorSuggestionView } from './model';
import {
  blockThreadSummary,
  chapterOptions,
  filterSuggestions,
  initials,
  listThreadEntries,
  looksLikeEmail,
  pendingSuggestionCount,
  relativeTime,
  roleCapabilities,
  threadCounts,
} from './workspace-model';

const comment = (id: string, status: 'open' | 'resolved', blockId: string): BlockCommentView => ({
  id, blockId, parentId: null, authorId: 'u1', authorName: 'Ana Pérez', authorRole: 'editor', body: 'x', status,
  resolvedByName: null, resolvedAt: null, createdAt: '2026-01-01T00:00:00.000Z',
});

const groups: ChapterCommentGroup[] = [
  { chapterIndex: 0, chapterTitle: 'Uno', blocks: [
    { blockId: 'b1', blockPreview: 'Primero', threads: [{ root: comment('c1', 'open', 'b1'), replies: [] }, { root: comment('c2', 'resolved', 'b1'), replies: [] }] },
  ] },
  { chapterIndex: 1, chapterTitle: 'Dos', blocks: [
    { blockId: 'b9', blockPreview: 'Nueve', threads: [{ root: comment('c3', 'open', 'b9'), replies: [] }] },
  ] },
];

describe('workspace-model', () => {
  test('role capabilities mirror the server matrix', () => {
    expect(roleCapabilities('author')).toEqual({ manage: true, comment: true, resolve: true, propose: true, decide: true });
    expect(roleCapabilities('editor')).toEqual({ manage: false, comment: true, resolve: false, propose: true, decide: false });
    expect(roleCapabilities('designer')).toEqual({ manage: false, comment: true, resolve: false, propose: false, decide: false });
  });

  test('threads filter by chapter, status and block', () => {
    expect(listThreadEntries(groups, { chapter: 'all', status: 'all' })).toHaveLength(3);
    expect(listThreadEntries(groups, { chapter: 'all', status: 'open' })).toHaveLength(2);
    expect(listThreadEntries(groups, { chapter: 1, status: 'all' }).map((entry) => entry.thread.root.id)).toEqual(['c3']);
    expect(listThreadEntries(groups, { chapter: 'all', status: 'resolved' }).map((entry) => entry.thread.root.id)).toEqual(['c2']);
    expect(listThreadEntries(groups, { chapter: 'all', status: 'all', blockId: 'b1' })).toHaveLength(2);
  });

  test('counts per scope and per block', () => {
    expect(threadCounts(groups)).toEqual({ open: 2, resolved: 1, total: 3 });
    expect(threadCounts(groups, 0)).toEqual({ open: 1, resolved: 1, total: 2 });
    expect(blockThreadSummary(groups).get('b1')).toEqual({ open: 1, resolved: 1 });
  });

  test('chapter options merge the outline with chapters that only exist through comments', () => {
    const options = chapterOptions([{ index: 0, title: 'Uno', blocks: [{ blockId: 'b1', kind: 'paragraph', text: 'x' }] }], groups);
    expect(options.map((option) => [option.index, option.title, option.openThreads])).toEqual([[0, 'Uno', 1], [1, 'Dos', 1]]);
  });

  test('suggestions filter and count', () => {
    const base = { authorId: 'u', authorName: 'A', summary: 's', affectedBlockIds: [], decidedByName: null, decidedAt: null, createdAt: '' };
    const list: EditorSuggestionView[] = [
      { ...base, id: '1', status: 'pending' },
      { ...base, id: '2', status: 'accepted' },
      { ...base, id: '3', status: 'rejected' },
    ];
    expect(pendingSuggestionCount(list)).toBe(1);
    expect(filterSuggestions(list, 'decided').map((item) => item.id)).toEqual(['2', '3']);
    expect(filterSuggestions(list, 'all')).toHaveLength(3);
  });

  test('display helpers', () => {
    expect(initials('María Vega Soto')).toBe('MS');
    expect(initials('clara')).toBe('CL');
    expect(initials('  ')).toBe('?');
    const now = Date.parse('2026-01-01T12:00:00.000Z');
    expect(relativeTime('2026-01-01T10:00:00.000Z', 'es', now)).toBe('hace 2 horas');
    expect(relativeTime('2025-12-31T12:00:00.000Z', 'en', now)).toBe('yesterday');
    expect(relativeTime('nope', 'es', now)).toBe('nope');
    expect(looksLikeEmail('a@b.co')).toBe(true);
    expect(looksLikeEmail('a@b')).toBe(false);
  });
});
