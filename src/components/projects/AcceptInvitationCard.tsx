'use client';

/**
 * Accept-invitation card (F4, entregable 2).
 *
 * The acceptance itself is validated server-side (session email must match
 * the invited email; single-use, expiring token). On success the invitee
 * lands on the dashboard: the collaborator in-app editing surface is out of
 * this deliverable's scope — access and roles are already effective for the
 * collaboration actions.
 */

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Loader2, MailCheck } from 'lucide-react';
import { acceptInvitationAction } from '@/lib/collaboration/actions';
import type { CollaboratorRole } from '@/lib/collaboration/model';
import type { AppMessages } from '@/lib/i18n/messages';

type Copy = AppMessages['collaboration'];

export function AcceptInvitationCard({ token, copy }: { token: string; copy: Copy }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [acceptedRole, setAcceptedRole] = useState<CollaboratorRole | null>(null);

  const errorMessage = error && error in copy.errors
    ? copy.errors[error as keyof Copy['errors']]
    : copy.errors.unavailable;

  const handleAccept = () => {
    setError(null);
    startTransition(async () => {
      const result = await acceptInvitationAction({ token });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setAcceptedRole(result.role);
    });
  };

  return (
    <div className="ac-surface-panel p-8 text-center" data-testid="accept-invitation-card">
      <MailCheck className="mx-auto mb-4 h-8 w-8 text-[var(--accent)]" />
      {acceptedRole ? (
        <>
          <h1 className="ac-section-heading__title text-2xl">{copy.invite.acceptedTitle}</h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            {copy.invite.acceptedDescription}
          </p>
          <p className="mt-3 text-xs text-[var(--text-tertiary)]">
            {copy.invite.roleLabel}: <strong>{copy.roleBadges[acceptedRole]}</strong>
          </p>
          <button
            type="button"
            data-testid="go-to-dashboard-button"
            onClick={() => router.push('/dashboard')}
            className="ac-button ac-button--primary mt-6 w-full"
          >
            <Check className="h-4 w-4" />
            {copy.invite.goToDashboardButton}
          </button>
        </>
      ) : (
        <>
          <h1 className="ac-section-heading__title text-2xl">{copy.invite.title}</h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">{copy.invite.description}</p>
          {error && (
            <p role="alert" data-testid="accept-error" className="mt-4 text-sm font-semibold text-red-600">
              {errorMessage}
            </p>
          )}
          <button
            type="button"
            data-testid="accept-invitation-button"
            disabled={isPending}
            onClick={handleAccept}
            className="ac-button ac-button--primary mt-6 w-full"
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {isPending ? copy.invite.acceptingButton : copy.invite.acceptButton}
          </button>
        </>
      )}
    </div>
  );
}
