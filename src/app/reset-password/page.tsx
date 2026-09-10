import { ResetPasswordPageContent } from '@/components/auth/ResetPasswordPageContent';

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  return <ResetPasswordPageContent initialToken={params.token ?? ''} />;
}
