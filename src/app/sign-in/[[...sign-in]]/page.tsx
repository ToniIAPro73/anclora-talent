import { SignIn } from '@clerk/nextjs';
import { AuthShell } from '@/components/auth/AuthShell';
import { clerkPremiumAppearance } from '@/components/auth/clerkAppearance';

export default function SignInPage() {
  return (
    <AuthShell mode="sign-in">
      <SignIn appearance={clerkPremiumAppearance} />
    </AuthShell>
  );
}
