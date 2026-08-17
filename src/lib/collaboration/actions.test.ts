import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

const { requireUserIdMock, requireUserMock, hasDatabaseMock } = vi.hoisted(() => ({
  requireUserIdMock: vi.fn(),
  requireUserMock: vi.fn(),
  hasDatabaseMock: vi.fn(() => true),
}));

vi.mock('@/lib/auth/guards', () => ({
  requireUserId: requireUserIdMock,
  requireUser: requireUserMock,
}));

import { projectCollaborators, projectInvitations, projects, users } from '@/lib/db/schema';
import { hashInvitationToken, INVITATION_TTL_MS } from './invitations';

const NOW = new Date('2026-08-04T12:00:00.000Z');

interface Seed {
  projects?: Array<{ userId: string }>;
  users?: Array<{ id: string; email: string }>;
  collaborators?: Array<{ projectId: string; userId: string; role: string }>;
  invitations?: Array<Record<string, unknown>>;
}

/** Same fake-drizzle approach as invitations.test.ts (table-seeded rows). */
function fakeDb(seed: Seed = {}) {
  const tables = new Map<unknown, unknown[]>([
    [projects, [...(seed.projects ?? [])]],
    [users, [...(seed.users ?? [])]],
    [projectCollaborators, [...(seed.collaborators ?? [])]],
    [projectInvitations, [...(seed.invitations ?? [])]],
  ]);
  const insertedInto: Array<{ table: unknown; values: Record<string, unknown> }> = [];
  const updated: Array<{ table: unknown; patch: Record<string, unknown> }> = [];
  const deletedFrom: unknown[] = [];
  const rowsOf = (table: unknown) => tables.get(table) ?? [];

  const db = {
    select: () => ({
      from: (table: unknown) => ({
        where: () => ({
          limit: async () => rowsOf(table).slice(0, 1),
          orderBy: async () => rowsOf(table),
          then: (resolve: (value: unknown) => void) => resolve(rowsOf(table)),
        }),
        innerJoin: () => ({
          where: () => ({
            orderBy: async () => rowsOf(table),
            then: (resolve: (value: unknown) => void) => resolve(rowsOf(table)),
          }),
        }),
      }),
    }),
    insert: (table: unknown) => ({
      values: (values: Record<string, unknown>) => {
        insertedInto.push({ table, values });
        rowsOf(table).push(values);
        return {
          onConflictDoNothing: async () => undefined,
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
    delete: (table: unknown) => ({
      where: async () => {
        deletedFrom.push(table);
      },
    }),
  };

  return { db, insertedInto, updated, deletedFrom, rowsOf };
}

const { dbState } = vi.hoisted(() => ({
  dbState: { current: null as ReturnType<typeof fakeDb> | null },
}));

vi.mock('@/lib/db', () => ({
  hasDatabase: hasDatabaseMock,
  getDb: () => dbState.current?.db,
}));

import {
  acceptInvitationAction,
  cancelInvitationAction,
  inviteCollaboratorAction,
  revokeCollaboratorAction,
} from './actions';

describe('collaboration actions — authorization server-side (R5)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // acceptInvitationAction (unlike acceptInvitation) has no `now` override —
    // it's a public server action — so expiry fixtures need a controlled
    // system clock instead of a real one drifting past NOW + TTL.
    vi.useFakeTimers({ now: NOW });
    hasDatabaseMock.mockReturnValue(true);
    requireUserIdMock.mockResolvedValue('owner-1');
    requireUserMock.mockResolvedValue({ id: 'user-9', email: 'editor@example.com', fullName: 'Editor' });
    dbState.current = fakeDb({
      projects: [{ userId: 'owner-1' }],
      users: [{ id: 'user-9', email: 'editor@example.com' }],
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('inviteCollaboratorAction requires a database', async () => {
    hasDatabaseMock.mockReturnValue(false);
    expect(await inviteCollaboratorAction({ projectId: 'p', email: 'a@b.co', role: 'editor' }))
      .toEqual({ ok: false, error: 'unavailable' });
  });

  test('inviteCollaboratorAction: unknown project resolves to notFound', async () => {
    dbState.current = fakeDb({ projects: [] });
    expect(await inviteCollaboratorAction({ projectId: 'ghost', email: 'a@b.co', role: 'editor' }))
      .toEqual({ ok: false, error: 'notFound' });
  });

  test('inviteCollaboratorAction: collaborators cannot manage collaborators', async () => {
    requireUserIdMock.mockResolvedValue('user-9');
    dbState.current = fakeDb({
      projects: [{ userId: 'owner-1' }],
      collaborators: [{ projectId: 'p', userId: 'user-9', role: 'editor' }],
    });
    expect(await inviteCollaboratorAction({ projectId: 'p', email: 'a@b.co', role: 'editor' }))
      .toEqual({ ok: false, error: 'forbidden' });

    // A designer is equally forbidden from revoking or cancelling.
    dbState.current = fakeDb({
      projects: [{ userId: 'owner-1' }],
      collaborators: [{ projectId: 'p', userId: 'user-9', role: 'designer' }],
    });
    expect(await revokeCollaboratorAction({ projectId: 'p', collaboratorId: 'c-1' }))
      .toEqual({ ok: false, error: 'forbidden' });
    expect(await cancelInvitationAction({ projectId: 'p', invitationId: 'i-1' }))
      .toEqual({ ok: false, error: 'forbidden' });
  });

  test('inviteCollaboratorAction: the author gets a copyable invite link', async () => {
    const result = await inviteCollaboratorAction({
      projectId: 'p',
      email: 'editor@example.com',
      role: 'editor',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.inviteUrl).toMatch(/^\/invite\/[A-Za-z0-9_-]{43}$/);
  });

  test('revokeCollaboratorAction and cancelInvitationAction delete scoped rows', async () => {
    expect(await revokeCollaboratorAction({ projectId: 'p', collaboratorId: 'c-1' }))
      .toEqual({ ok: true });
    expect(dbState.current?.deletedFrom).toContain(projectCollaborators);

    expect(await cancelInvitationAction({ projectId: 'p', invitationId: 'i-1' }))
      .toEqual({ ok: true });
    expect(dbState.current?.deletedFrom).toContain(projectInvitations);
  });

  test('acceptInvitationAction: any authenticated user, no seat toll', async () => {
    dbState.current = fakeDb({
      invitations: [
        {
          id: 'inv-1',
          projectId: 'proj-1',
          email: 'editor@example.com',
          role: 'designer',
          tokenHash: hashInvitationToken('token-xyz'),
          invitedBy: 'owner-1',
          expiresAt: new Date(NOW.getTime() + INVITATION_TTL_MS),
          acceptedAt: null,
          acceptedBy: null,
        },
      ],
    });

    const result = await acceptInvitationAction({ token: 'token-xyz' });
    expect(result).toEqual({ ok: true, projectId: 'proj-1', role: 'designer' });
  });

  test('acceptInvitationAction: email mismatch and invalid token are rejected', async () => {
    dbState.current = fakeDb({
      invitations: [
        {
          id: 'inv-1',
          projectId: 'proj-1',
          email: 'other@example.com',
          role: 'editor',
          tokenHash: hashInvitationToken('token-xyz'),
          invitedBy: 'owner-1',
          expiresAt: new Date(NOW.getTime() + INVITATION_TTL_MS),
          acceptedAt: null,
          acceptedBy: null,
        },
      ],
    });
    expect(await acceptInvitationAction({ token: 'token-xyz' }))
      .toEqual({ ok: false, error: 'emailMismatch' });

    dbState.current = fakeDb({ invitations: [] });
    expect(await acceptInvitationAction({ token: 'nope' }))
      .toEqual({ ok: false, error: 'invalid' });
  });
});
