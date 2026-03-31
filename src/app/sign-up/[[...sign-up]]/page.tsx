import { SignUp } from '@clerk/nextjs';
import { AuthShell } from '@/components/auth/AuthShell';
import { clerkPremiumAppearance } from '@/components/auth/clerkAppearance';

export default function SignUpPage() {
  return (
    <AuthShell mode="sign-up">
      <SignUp appearance={clerkPremiumAppearance} />
    </AuthShell>
  );
}
