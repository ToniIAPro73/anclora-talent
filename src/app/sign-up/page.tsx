import { RegisterPageContent } from '@/components/auth/RegisterPageContent';
import { resolveOAuthAvailability } from '@/lib/auth/oauth/availability';

export const dynamic = 'force-dynamic';

export default function SignUpPage() {
  return <RegisterPageContent oauthAvailability={resolveOAuthAvailability()} />;
}
