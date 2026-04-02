import { SignUp } from '@clerk/nextjs';
import { AuthShell } from '@/components/auth/AuthShell';
import { getClerkPremiumAppearance } from '@/components/auth/clerkAppearance';
import { readUiPreferences } from '@/lib/ui-preferences/preferences.server';

export default async function SignUpPage() {
  const { theme } = await readUiPreferences();

  return (
    <AuthShell mode="sign-up">
      <SignUp appearance={getClerkPremiumAppearance(theme)} />
    </AuthShell>
  );
}
