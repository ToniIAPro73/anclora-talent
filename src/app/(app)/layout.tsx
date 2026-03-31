import { AppShell } from '@/components/layout/AppShell';
import { requireUserId } from '@/lib/auth/guards';

export default async function ProtectedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await requireUserId();

  return <AppShell>{children}</AppShell>;
}
