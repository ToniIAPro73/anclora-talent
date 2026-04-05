import 'server-only';
import { auth } from '@clerk/nextjs/server';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { buildAbsoluteAppUrl } from './urls';

export async function requireUserId() {
  const { userId } = await auth();

  if (!userId) {
    const headerStore = await headers();
    redirect(
      buildAbsoluteAppUrl('/sign-in', {
        host: headerStore.get('x-forwarded-host') ?? headerStore.get('host'),
        protocol: headerStore.get('x-forwarded-proto') ?? 'https',
      }),
    );
  }

  return userId;
}
