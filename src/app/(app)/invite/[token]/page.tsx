import { resolveLocaleMessages } from '@/lib/i18n/messages';
import { readUiPreferences } from '@/lib/ui-preferences/preferences.server';
import { AcceptInvitationCard } from '@/components/projects/AcceptInvitationCard';

/**
 * Invitation landing (F4, entregable 2). Requires authentication via the
 * (app) layout; the accept action validates that the session email matches
 * the invited email. No plan/checkout gate for the invitee (no seat toll).
 */
export default async function InvitationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const { locale } = await readUiPreferences();
  const copy = resolveLocaleMessages(locale).collaboration;

  return (
    <main className="mx-auto flex max-w-lg flex-col gap-6 py-16">
      <AcceptInvitationCard token={token} copy={copy} />
    </main>
  );
}
