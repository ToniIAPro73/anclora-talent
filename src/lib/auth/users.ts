import 'server-only';
import { eq } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { users } from '@/lib/db/schema';

export type StoredUser = {
  id: string;
  email: string;
  fullName: string;
  // Null for accounts created via social OAuth (no password).
  passwordHash: string | null;
};

export async function findUserByEmail(email: string): Promise<StoredUser | null> {
  const [user] = await getDb()
    .select({
      id: users.id,
      email: users.email,
      fullName: users.fullName,
      passwordHash: users.passwordHash,
    })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  return user ?? null;
}

export async function createUser(input: {
  email: string;
  passwordHash: string | null;
  fullName: string;
}): Promise<{ id: string; email: string; fullName: string }> {
  try {
    const [user] = await getDb()
      .insert(users)
      .values(input)
      .returning({ id: users.id, email: users.email, fullName: users.fullName });

    return user;
  } catch (error) {
    // Unique violation on users.email (race between concurrent registrations).
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: string }).code === '23505'
    ) {
      throw new EmailAlreadyInUseError();
    }
    throw error;
  }
}

export class EmailAlreadyInUseError extends Error {
  constructor() {
    super('EMAIL_IN_USE');
    this.name = 'EmailAlreadyInUseError';
  }
}
