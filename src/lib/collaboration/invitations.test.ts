import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { projectCollaborators, projectInvitations, projects, users } from '@/lib/db/schema';
import {
  acceptInvitation,
  createInvitation,
  generateInvitationToken,
  hashInvitationToken,
  INVITATION_TTL_MS,
  isInvitationExpired,
  normalizeInvitationEmail,
} from './invitations';

const NOW = new Date('2026-08-04T12:00:00.000Z');

type InvitationSeed = {
  id: string;
  projectId: string;
  email: string;
  role: string;
  tokenHash: string;
  invitedBy: string;
  expiresAt: Date;
  acceptedAt: Date | null;
  acceptedBy: string | null;
};

interface Seed {
  projects?: Array<{ userId: string }>;
  users?: Array<{ id: string; email: string }>;
  collaborators?: Array<{ projectId: string; userId: string; role: string }>;
  invitations?: InvitationSeed[];
}

/**
 * Minimal fake of the drizzle surface repository.ts uses. `where` clauses
 * are drizzle expression objects (not evaluable here), so each table starts
 * with exactly the rows the test expects its queries to return; inserts and
 * updates are recorded for assertions (same approach as
 * sales/credentials.test.ts).
 */
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

function invitationRow(overrides: Partial<InvitationSeed> = {}): InvitationSeed {
  return {
    id: 'inv-1',
    projectId: 'proj-1',
    email: 'editor@example.com',
    role: 'editor',
    tokenHash: hashInvitationToken('token-1'),
    invitedBy: 'owner-1',
    expiresAt: new Date(NOW.getTime() + INVITATION_TTL_MS),
    acceptedAt: null,
    acceptedBy: null,
    ...overrides,
  };
}

describe('invitation tokens', () => {
  test('tokens are 256-bit random and only the SHA-256 is persisted', () => {
    const token = generateInvitationToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(generateInvitationToken()).not.toBe(token);

    const hash = hashInvitationToken(token);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).not.toBe(token);
    expect(hashInvitationToken(token)).toBe(hash);
  });

  test('expiration is evaluated against the injected clock', () => {
    const expiresAt = new Date(NOW.getTime() + 1000);
    expect(isInvitationExpired(expiresAt, NOW)).toBe(false);
    expect(isInvitationExpired(expiresAt, new Date(NOW.getTime() + 1000))).toBe(true);
  });

  test('emails are normalized before comparing', () => {
    expect(normalizeInvitationEmail('  Editor@Example.com ')).toBe('editor@example.com');
  });
});

describe('createInvitation', () => {
  beforeEach(() => vi.clearAllMocks());

  test('rejects malformed emails and non-invocable roles', async () => {
    const { db } = fakeDb();
    expect(await createInvitation(db as never, { projectId: 'p', email: 'nope', role: 'editor', invitedBy: 'o' }))
      .toEqual({ ok: false, error: 'invalidEmail' });
    // `author` is the owner role — never assignable through an invitation.
    expect(await createInvitation(db as never, { projectId: 'p', email: 'a@b.co', role: 'author', invitedBy: 'o' }))
      .toEqual({ ok: false, error: 'invalidRole' });
  });

  test('persists hash + expiry, never the raw token, and returns the token once', async () => {
    const { db, insertedInto, deletedFrom } = fakeDb({ users: [] });
    const result = await createInvitation(db as never, {
      projectId: 'proj-1',
      email: 'Editor@Example.com',
      role: 'editor',
      invitedBy: 'owner-1',
      now: NOW,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const insert = insertedInto.find((entry) => entry.table === projectInvitations);
    expect(insert?.values.email).toBe('editor@example.com');
    expect(insert?.values.tokenHash).toBe(hashInvitationToken(result.token));
    expect(insert?.values.tokenHash).not.toBe(result.token);
    expect((insert?.values.expiresAt as Date).getTime()).toBe(NOW.getTime() + INVITATION_TTL_MS);
    // Re-inviting replaces previous pending invitations for the same email.
    expect(deletedFrom).toContain(projectInvitations);
  });

  test('refuses to invite an account that already has access', async () => {
    const { db } = fakeDb({
      projects: [{ userId: 'owner-1' }],
      users: [{ id: 'user-9', email: 'editor@example.com' }],
      collaborators: [{ projectId: 'proj-1', userId: 'user-9', role: 'editor' }],
    });
    const result = await createInvitation(db as never, {
      projectId: 'proj-1',
      email: 'editor@example.com',
      role: 'designer',
      invitedBy: 'owner-1',
      now: NOW,
    });
    expect(result).toEqual({ ok: false, error: 'alreadyCollaborator' });
  });
});

describe('acceptInvitation', () => {
  const user = { id: 'user-9', email: 'editor@example.com' };

  test('unknown token is invalid', async () => {
    const { db } = fakeDb({ invitations: [] });
    expect(await acceptInvitation(db as never, { token: 'missing', user, now: NOW }))
      .toEqual({ ok: false, error: 'invalid' });
  });

  test('expired invitations cannot be accepted', async () => {
    const { db } = fakeDb({
      invitations: [invitationRow({ expiresAt: new Date(NOW.getTime() - 1000) })],
    });
    expect(await acceptInvitation(db as never, { token: 'token-1', user, now: NOW }))
      .toEqual({ ok: false, error: 'expired' });
  });

  test('the accepting account email must match the invited email', async () => {
    const { db } = fakeDb({ invitations: [invitationRow()] });
    expect(
      await acceptInvitation(db as never, {
        token: 'token-1',
        user: { id: 'user-9', email: 'other@example.com' },
        now: NOW,
      }),
    ).toEqual({ ok: false, error: 'emailMismatch' });
  });

  test('already accepted by another account is rejected; re-accept by the same account is idempotent', async () => {
    const acceptedByOther = fakeDb({ invitations: [invitationRow({ acceptedAt: NOW, acceptedBy: 'user-7' })] });
    expect(await acceptInvitation(acceptedByOther.db as never, { token: 'token-1', user, now: NOW }))
      .toEqual({ ok: false, error: 'alreadyAccepted' });

    const acceptedBySame = fakeDb({ invitations: [invitationRow({ acceptedAt: NOW, acceptedBy: 'user-9' })] });
    expect(await acceptInvitation(acceptedBySame.db as never, { token: 'token-1', user, now: NOW }))
      .toEqual({ ok: true, projectId: 'proj-1', role: 'editor' });
  });

  test('happy path grants the role and marks the invitation accepted (no seat toll)', async () => {
    const { db, insertedInto, updated } = fakeDb({ invitations: [invitationRow()] });
    const result = await acceptInvitation(db as never, { token: 'token-1', user, now: NOW });

    expect(result).toEqual({ ok: true, projectId: 'proj-1', role: 'editor' });
    const collaboratorInsert = insertedInto.find((entry) => entry.table === projectCollaborators);
    expect(collaboratorInsert?.values).toMatchObject({
      projectId: 'proj-1',
      userId: 'user-9',
      role: 'editor',
      invitedBy: 'owner-1',
    });
    const acceptance = updated.find((entry) => entry.table === projectInvitations);
    expect(acceptance?.patch.acceptedBy).toBe('user-9');
    expect(acceptance?.patch.acceptedAt).toBeInstanceOf(Date);
  });
});
