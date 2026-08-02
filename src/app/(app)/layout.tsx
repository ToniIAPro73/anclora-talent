import { AppShell } from '@/components/layout/AppShell';
import { requireUser } from '@/lib/auth/guards';

export default async function ProtectedLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await requireUser();

  return <AppShell user={user}>{children}</AppShell>;
}
