import 'server-only';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getSessionUser, SESSION_COOKIE_NAME, type SessionUser } from './session';
import { buildAbsoluteAppUrl } from './urls';

export async function getCurrentUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return getSessionUser(token);
}

function redirectToSignIn(headerStore: Awaited<ReturnType<typeof headers>>): never {
  redirect(
    buildAbsoluteAppUrl('/sign-in', {
      host: headerStore.get('x-forwarded-host') ?? headerStore.get('host'),
      protocol: headerStore.get('x-forwarded-proto') ?? 'https',
    }),
  );
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();

  if (!user) {
    redirectToSignIn(await headers());
  }

  return user;
}

export async function requireUserId() {
  const user = await requireUser();

  return user.id;
}
