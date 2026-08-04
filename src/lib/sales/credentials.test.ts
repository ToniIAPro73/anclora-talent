import { describe, expect, test, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { decryptCredentials } from '@/lib/filestudio/crypto';
import {
  deleteChannelToken,
  getChannelToken,
  hasChannelToken,
  saveChannelToken,
} from './credentials';

const KEY = 'c'.repeat(64);

interface FakeRow {
  userId: string;
  channel: string;
  encryptedToken: string;
}

/**
 * Minimal fake of the drizzle surface credentials.ts uses. The `where`
 * clauses are drizzle expression objects (not evaluable here), so the fake
 * trusts the rows the test seeds — the SQL itself is covered by the schema
 * migration contract, the crypto + flow by these tests.
 */
function fakeDb(seed: FakeRow[] = []) {
  const rows = [...seed];
  const inserted: Array<Record<string, unknown>> = [];
  let deleted = false;
  const db = {
    insert: () => ({
      values: (values: Record<string, unknown>) => {
        inserted.push(values);
        return {
          onConflictDoUpdate: async () => {
            const index = rows.findIndex(
              (row) => row.userId === values.userId && row.channel === values.channel,
            );
            const row = values as unknown as FakeRow;
            if (index === -1) rows.push(row);
            else rows[index] = { ...rows[index], encryptedToken: row.encryptedToken };
          },
        };
      },
    }),
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => rows,
        }),
      }),
    }),
    delete: () => ({
      where: async () => {
        deleted = true;
        rows.length = 0;
      },
    }),
  };
  return { db: db as never, rows, inserted, wasDeleted: () => deleted };
}

describe('sales channel credentials', () => {
  test('save stores the token AES-256-GCM encrypted (never plaintext)', async () => {
    const { db, inserted } = fakeDb();
    await saveChannelToken(db, { userId: 'u1', channel: 'gumroad', token: 'gr-token-123', keyHex: KEY });

    const stored = inserted[0]?.encryptedToken as string;
    expect(stored.startsWith('v1:')).toBe(true);
    expect(stored).not.toContain('gr-token-123');
    expect(decryptCredentials(stored, KEY)).toBe('gr-token-123');
  });

  test('get round-trips the decrypted token; null when not connected', async () => {
    const empty = fakeDb();
    expect(
      await getChannelToken(empty.db, { userId: 'u1', channel: 'gumroad', keyHex: KEY }),
    ).toBeNull();

    const { db } = fakeDb();
    await saveChannelToken(db, { userId: 'u1', channel: 'gumroad', token: 'gr-token-123', keyHex: KEY });
    // Same store: the row seeded by the upsert above.
    expect(
      await getChannelToken(db, { userId: 'u1', channel: 'gumroad', keyHex: KEY }),
    ).toBe('gr-token-123');
  });

  test('has reports the connection without decrypting; delete disconnects', async () => {
    const { db, wasDeleted } = fakeDb();
    expect(await hasChannelToken(db, { userId: 'u1', channel: 'gumroad' })).toBe(false);

    await saveChannelToken(db, { userId: 'u1', channel: 'gumroad', token: 'gr-token-123', keyHex: KEY });
    expect(await hasChannelToken(db, { userId: 'u1', channel: 'gumroad' })).toBe(true);

    await deleteChannelToken(db, { userId: 'u1', channel: 'gumroad' });
    expect(wasDeleted()).toBe(true);
    expect(await hasChannelToken(db, { userId: 'u1', channel: 'gumroad' })).toBe(false);
  });

  test('upsert replaces the previous token (one row per user+channel)', async () => {
    const { db, rows } = fakeDb();
    await saveChannelToken(db, { userId: 'u1', channel: 'gumroad', token: 'old', keyHex: KEY });
    await saveChannelToken(db, { userId: 'u1', channel: 'gumroad', token: 'new', keyHex: KEY });

    expect(rows).toHaveLength(1);
    expect(decryptCredentials(rows[0].encryptedToken, KEY)).toBe('new');
  });
});
