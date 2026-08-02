import 'server-only';
import { eq } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { sessions, users } from '@/lib/db/schema';
import { SESSION_COOKIE_NAME } from './constants';
import {
  generateSessionToken,
  hashSessionToken,
  safeEqual,
  SESSION_TTL_MS,
} from './session-helpers';

export { SESSION_COOKIE_NAME };
export { SESSION_COOKIE_OPTIONS } from './constants';
export { SESSION_TTL_MS } from './session-helpers';

const SESSION_RENEW_THRESHOLD_MS = SESSION_TTL_MS / 2;

export type SessionUser = {
  id: string;
  email: string;
  fullName: string;
};

export async function createSession(userId: string): Promise<{ token: string; expiresAt: Date }> {
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await getDb().insert(sessions).values({
    id: hashSessionToken(token),
    userId,
    expiresAt,
  });

  return { token, expiresAt };
}

export async function getSessionUser(token: string | null | undefined): Promise<SessionUser | null> {
  if (!token) return null;

  try {
    const sessionId = hashSessionToken(token);
    const db = getDb();
    const [row] = await db
      .select({
        sessionId: sessions.id,
        sessionExpiresAt: sessions.expiresAt,
        userId: users.id,
        userEmail: users.email,
        userFullName: users.fullName,
      })
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .where(eq(sessions.id, sessionId))
      .limit(1);

    if (!row || !safeEqual(row.sessionId, sessionId)) return null;

    const now = Date.now();
    const expiresAtMs = row.sessionExpiresAt.getTime();

    if (expiresAtMs <= now) {
      await db.delete(sessions).where(eq(sessions.id, sessionId));
      return null;
    }

    // Sliding renewal: extend sessions past half their lifetime.
    if (expiresAtMs - now < SESSION_RENEW_THRESHOLD_MS) {
      await db
        .update(sessions)
        .set({ expiresAt: new Date(now + SESSION_TTL_MS) })
        .where(eq(sessions.id, sessionId));
    }

    return { id: row.userId, email: row.userEmail, fullName: row.userFullName };
  } catch {
    // Database unavailable or misconfigured: treat as unauthenticated.
    return null;
  }
}

export async function deleteSession(token: string | null | undefined): Promise<void> {
  if (!token) return;

  try {
    await getDb().delete(sessions).where(eq(sessions.id, hashSessionToken(token)));
  } catch {
    // Best effort: the cookie is cleared regardless.
  }
}
