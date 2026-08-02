import { LoginPageContent } from '@/components/auth/LoginPageContent';
import { resolveOAuthAvailability } from '@/lib/auth/oauth/availability';

// Social OAuth availability is read from process.env at request time, so
// this page must render dynamically.
export const dynamic = 'force-dynamic';

export default function SignInPage() {
  return <LoginPageContent oauthAvailability={resolveOAuthAvailability()} />;
}
