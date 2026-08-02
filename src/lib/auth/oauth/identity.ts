import 'server-only';
import { and, eq } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { oauthIdentities, users } from '@/lib/db/schema';
import { normalizeEmail } from '../password';
import { createUser, findUserByEmail } from '../users';
import type { OAuthProvider } from './providers';

export type ExternalIdentityInput = {
  provider: OAuthProvider;
  providerAccountId: string;
  email: string;
  fullName?: string;
};

export type AuthenticatedUser = {
  id: string;
  email: string;
  fullName: string;
};

async function findUserByOAuthIdentity(
  provider: OAuthProvider,
  providerAccountId: string,
): Promise<AuthenticatedUser | null> {
  const [row] = await getDb()
    .select({ id: users.id, email: users.email, fullName: users.fullName })
    .from(oauthIdentities)
    .innerJoin(users, eq(oauthIdentities.userId, users.id))
    .where(
      and(
        eq(oauthIdentities.provider, provider),
        eq(oauthIdentities.providerAccountId, providerAccountId),
      ),
    )
    .limit(1);

  return row ?? null;
}

async function linkOAuthIdentity(
  userId: string,
  identity: ExternalIdentityInput & { email: string },
): Promise<void> {
  await getDb().insert(oauthIdentities).values({
    userId,
    provider: identity.provider,
    providerAccountId: identity.providerAccountId,
    email: identity.email,
  });
}

/**
 * Resolves a verified external OAuth identity to a local user:
 *
 * 1. Identity already linked → return the linked user.
 * 2. No identity, but a user exists with the same (verified) email →
 *    link the external identity to that user.
 * 3. Neither → register a new passwordless user and link the identity.
 *
 * The caller is responsible for creating the session afterwards.
 */
export async function loginWithExternalIdentity(
  identity: ExternalIdentityInput,
): Promise<AuthenticatedUser> {
  const email = normalizeEmail(identity.email);

  const linkedUser = await findUserByOAuthIdentity(identity.provider, identity.providerAccountId);
  if (linkedUser) {
    return linkedUser;
  }

  const existingUser = await findUserByEmail(email);
  if (existingUser) {
    await linkOAuthIdentity(existingUser.id, { ...identity, email });
    return { id: existingUser.id, email: existingUser.email, fullName: existingUser.fullName };
  }

  const fullName = identity.fullName?.trim() || email;
  const newUser = await createUser({ email, passwordHash: null, fullName });
  await linkOAuthIdentity(newUser.id, { ...identity, email });
  return newUser;
}
