import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

const { requireUserIdMock, hasDatabaseMock } = vi.hoisted(() => ({
  requireUserIdMock: vi.fn(),
  hasDatabaseMock: vi.fn(() => true),
}));

vi.mock('@/lib/auth/guards', () => ({
  requireUserId: requireUserIdMock,
  requireUser: vi.fn(),
}));

import { blockComments, projects, projectCollaborators } from '@/lib/db/schema';

interface Seed {
  projects?: Array<{ userId: string }>;
  collaborators?: Array<{ projectId: string; userId: string; role: string }>;
  comments?: Array<Record<string, unknown>>;
}

/** Same fake-drizzle approach as actions.test.ts (table-seeded rows). */
function fakeDb(seed: Seed = {}) {
  const tables = new Map<unknown, unknown[]>([
    [projects, [...(seed.projects ?? [])]],
    [projectCollaborators, [...(seed.collaborators ?? [])]],
    [blockComments, [...(seed.comments ?? [])]],
  ]);
  const insertedInto: Array<{ table: unknown; values: Record<string, unknown> }> = [];
  const updated: Array<{ table: unknown; patch: Record<string, unknown> }> = [];
  const rowsOf = (table: unknown) => tables.get(table) ?? [];

  const db = {
    select: () => ({
      from: (table: unknown) => ({
        where: () => ({
          limit: async () => rowsOf(table).slice(0, 1),
          orderBy: async () => rowsOf(table),
          then: (resolve: (value: unknown) => void) => resolve(rowsOf(table)),
        }),
      }),
    }),
    insert: (table: unknown) => ({
      values: (values: Record<string, unknown>) => {
        insertedInto.push({ table, values });
        rowsOf(table).push(values);
        return {
          returning: async () => [values],
          then: (resolve: (value: unknown) => void) => resolve(undefined),
        };
      },
    }),
    update: (table: unknown) => ({
      set: (patch: Record<string, unknown>) => ({
        where: async () => {
          updated.push({ table, patch });
        },
      }),
    }),
    delete: () => ({
      where: async () => undefined,
    }),
  };

  return { db, insertedInto, updated, rowsOf };
}

const { dbState } = vi.hoisted(() => ({
  dbState: { current: null as ReturnType<typeof fakeDb> | null },
}));

vi.mock('@/lib/db', () => ({
  hasDatabase: hasDatabaseMock,
  getDb: () => dbState.current?.db,
}));

import {
  addBlockCommentAction,
  replyBlockCommentAction,
  resolveBlockCommentThreadAction,
} from './actions';

const OWNER_PROJECT: Seed = {
  projects: [{ userId: 'owner-1' }],
  collaborators: [
    { projectId: 'p', userId: 'editor-1', role: 'editor' },
    { projectId: 'p', userId: 'designer-1', role: 'designer' },
  ],
  comments: [
    {
      id: 'root-1',
      projectId: 'p',
      blockId: 'block-9',
      authorId: 'editor-1',
      body: 'Raíz del hilo',
      status: 'open',
      parentId: null,
    },
  ],
};

describe('block comment actions — server-side role matrix (R5)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hasDatabaseMock.mockReturnValue(true);
    requireUserIdMock.mockResolvedValue('owner-1');
    dbState.current = fakeDb(OWNER_PROJECT);
  });

  test('every project role can open a comment thread anchored to a block id', async () => {
    for (const userId of ['owner-1', 'editor-1', 'designer-1']) {
      requireUserIdMock.mockResolvedValue(userId);
      const result = await addBlockCommentAction({
        projectId: 'p',
        blockId: 'block-9',
        body: 'Comentario anclado',
      });
      expect(result.ok).toBe(true);
    }
    expect(dbState.current?.insertedInto).toHaveLength(3);
    expect(dbState.current?.insertedInto[0].values).toMatchObject({
      projectId: 'p',
      blockId: 'block-9',
      parentId: null,
    });
  });

  test('a user without project access cannot comment', async () => {
    requireUserIdMock.mockResolvedValue('outsider-1');
    dbState.current = fakeDb({ projects: [{ userId: 'owner-1' }] });
    expect(await addBlockCommentAction({ projectId: 'p', blockId: 'b', body: 'hola' }))
      .toEqual({ ok: false, error: 'notFound' });
    expect(dbState.current?.insertedInto).toHaveLength(0);
  });

  test('empty or overlong bodies and empty anchors are rejected as invalid', async () => {
    expect(await addBlockCommentAction({ projectId: 'p', blockId: 'b', body: '   ' }))
      .toEqual({ ok: false, error: 'invalid' });
    expect(await addBlockCommentAction({ projectId: 'p', blockId: ' ', body: 'hola' }))
      .toEqual({ ok: false, error: 'invalid' });
    expect(
      await addBlockCommentAction({ projectId: 'p', blockId: 'b', body: 'x'.repeat(2001) }),
    ).toEqual({ ok: false, error: 'invalid' });
    expect(dbState.current?.insertedInto).toHaveLength(0);
  });

  test('replies inherit the root block anchor and point at the root', async () => {
    requireUserIdMock.mockResolvedValue('designer-1');
    const result = await replyBlockCommentAction({
      projectId: 'p',
      threadRootId: 'root-1',
      body: 'Respuesta',
    });

    expect(result.ok).toBe(true);
    expect(dbState.current?.insertedInto[0].values).toMatchObject({
      blockId: 'block-9',
      parentId: 'root-1',
      authorId: 'designer-1',
    });
  });

  test('replying to a missing thread resolves to notFound', async () => {
    dbState.current = fakeDb({ ...OWNER_PROJECT, comments: [] });
    expect(await replyBlockCommentAction({ projectId: 'p', threadRootId: 'ghost', body: 'hola' }))
      .toEqual({ ok: false, error: 'notFound' });
  });

  test('only the author resolves threads; editors and designers are forbidden', async () => {
    requireUserIdMock.mockResolvedValue('editor-1');
    expect(await resolveBlockCommentThreadAction({ projectId: 'p', threadRootId: 'root-1' }))
      .toEqual({ ok: false, error: 'forbidden' });

    requireUserIdMock.mockResolvedValue('designer-1');
    expect(await resolveBlockCommentThreadAction({ projectId: 'p', threadRootId: 'root-1' }))
      .toEqual({ ok: false, error: 'forbidden' });

    requireUserIdMock.mockResolvedValue('owner-1');
    expect(await resolveBlockCommentThreadAction({ projectId: 'p', threadRootId: 'root-1' }))
      .toEqual({ ok: true });
    expect(dbState.current?.updated).toEqual([
      {
        table: blockComments,
        patch: expect.objectContaining({ status: 'resolved', resolvedBy: 'owner-1' }),
      },
    ]);
  });
});
