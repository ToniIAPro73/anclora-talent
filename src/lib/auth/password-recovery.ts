import 'server-only';

import { createHash, randomBytes } from 'node:crypto';
import { and, eq, gt, isNull, sql } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { passwordResetTokens, sessions, users } from '@/lib/db/schema';

export const PASSWORD_RESET_TOKEN_TTL_MS = 30 * 60 * 1000;

export function generatePasswordResetToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashPasswordResetToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function isPasswordResetTokenShapeValid(token: string): boolean {
  return /^[A-Za-z0-9_-]{43}$/.test(token);
}

export async function createPasswordResetToken(
  userId: string,
  now: Date = new Date(),
): Promise<{ token: string; expiresAt: Date }> {
  const token = generatePasswordResetToken();
  const expiresAt = new Date(now.getTime() + PASSWORD_RESET_TOKEN_TTL_MS);
  const db = getDb();

  // One active token per user. Used and expired rows remain auditable until
  // normal cleanup, while a new request invalidates every prior live link.
  await db
    .delete(passwordResetTokens)
    .where(and(eq(passwordResetTokens.userId, userId), isNull(passwordResetTokens.usedAt)));
  await db.insert(passwordResetTokens).values({
    userId,
    tokenHash: hashPasswordResetToken(token),
    expiresAt,
  });

  return { token, expiresAt };
}

export async function invalidatePasswordResetToken(token: string): Promise<void> {
  await getDb()
    .delete(passwordResetTokens)
    .where(eq(passwordResetTokens.tokenHash, hashPasswordResetToken(token)));
}

/**
 * Atomically claims a live token, changes the password and invalidates all
 * sessions. Neon HTTP does not support interactive transactions, so the
 * single data-modifying CTE is the transaction boundary.
 */
export async function consumePasswordResetToken(
  token: string,
  passwordHash: string,
  now: Date = new Date(),
): Promise<boolean> {
  if (!isPasswordResetTokenShapeValid(token)) return false;

  const result = await getDb().execute<{ user_id: string }>(sql`
    WITH claimed AS (
      UPDATE password_reset_tokens
      SET used_at = ${now}
      WHERE token_hash = ${hashPasswordResetToken(token)}
        AND used_at IS NULL
        AND expires_at > ${now}
      RETURNING user_id
    ), updated_user AS (
      UPDATE users
      SET password_hash = ${passwordHash}
      WHERE id IN (SELECT user_id FROM claimed)
      RETURNING id
    ), deleted_sessions AS (
      DELETE FROM sessions
      WHERE user_id IN (SELECT id FROM updated_user)
      RETURNING user_id
    )
    SELECT id AS user_id FROM updated_user
  `);

  return result.rows.length > 0;
}
