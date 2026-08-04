/**
 * Sales channel credentials (F4) — per-user channel tokens at rest.
 *
 * One row per (user, channel) in `sales_channel_credentials`; the token is
 * AES-256-GCM encrypted with the same scheme as filestudio/crypto.ts
 * (`v1:<iv>:<tag>:<ciphertext>`, base64) and is never logged nor returned to
 * the client — the UI only learns whether a channel is connected.
 *
 * The db surface is injected so the module is unit-testable without a live
 * database (same pattern as filestudio/pairing.ts).
 */

import 'server-only';
import { and, eq } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { salesChannelCredentials } from '@/lib/db/schema';
import { decryptCredentials, encryptCredentials } from '@/lib/filestudio/crypto';

export type SalesChannel = 'gumroad' | 'hotmart';

type CredentialsStore = Pick<ReturnType<typeof getDb>, 'insert' | 'select' | 'delete'>;

interface CredentialRow {
  userId: string;
  channel: string;
  encryptedToken: string;
}

/** Encrypt + upsert the channel token of a user. */
export async function saveChannelToken(
  db: CredentialsStore,
  input: { userId: string; channel: SalesChannel; token: string; keyHex: string },
): Promise<void> {
  const encryptedToken = encryptCredentials(input.token, input.keyHex);
  const now = new Date();
  await db
    .insert(salesChannelCredentials)
    .values({
      userId: input.userId,
      channel: input.channel,
      encryptedToken,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [salesChannelCredentials.userId, salesChannelCredentials.channel],
      set: { encryptedToken, updatedAt: now },
    });
}

/**
 * Decrypted channel token of a user, or null when the channel is not
 * connected. Server-side only — never ship the result to the client.
 */
export async function getChannelToken(
  db: CredentialsStore,
  input: { userId: string; channel: SalesChannel; keyHex: string },
): Promise<string | null> {
  const rows = (await db
    .select()
    .from(salesChannelCredentials)
    .where(
      and(
        eq(salesChannelCredentials.userId, input.userId),
        eq(salesChannelCredentials.channel, input.channel),
      ),
    )
    .limit(1)) as CredentialRow[];
  const row = rows[0];
  if (!row) return null;
  return decryptCredentials(row.encryptedToken, input.keyHex);
}

/** Whether the user connected the channel (token stored), without decrypting. */
export async function hasChannelToken(
  db: CredentialsStore,
  input: { userId: string; channel: SalesChannel },
): Promise<boolean> {
  const rows = (await db
    .select({ channel: salesChannelCredentials.channel })
    .from(salesChannelCredentials)
    .where(
      and(
        eq(salesChannelCredentials.userId, input.userId),
        eq(salesChannelCredentials.channel, input.channel),
      ),
    )
    .limit(1)) as Array<Pick<CredentialRow, 'channel'>>;
  return rows.length > 0;
}

/** Disconnects the channel (drops the stored token). */
export async function deleteChannelToken(
  db: CredentialsStore,
  input: { userId: string; channel: SalesChannel },
): Promise<void> {
  await db
    .delete(salesChannelCredentials)
    .where(
      and(
        eq(salesChannelCredentials.userId, input.userId),
        eq(salesChannelCredentials.channel, input.channel),
      ),
    );
}
