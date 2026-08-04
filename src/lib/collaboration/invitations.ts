/**
 * Project invitations — Anclora Talent (F4, entregable 2).
 *
 * The token is 256 bits of randomness (base64url); only its SHA-256 is
 * stored, so a database leak never exposes usable links. Invitations expire
 * after INVITATION_TTL_MS and are single-use.
 *
 * No seat toll (documented product decision): accepting an invitation never
 * requires a plan, license or checkout from the invitee — the product has
 * no billing yet. If the invited email has no account, the same link works
 * after registering with that email.
 */

import { createHash, randomBytes } from 'node:crypto';
import {
  addCollaborator,
  createInvitationRow,
  deletePendingInvitationsForEmail,
  findInvitationByTokenHash,
  findUserIdByEmail,
  markInvitationAccepted,
  resolveProjectAccess,
  type CollaborationDb,
} from './repository';
import { parseInvitableRole } from './permissions';
import type { InvitableRole } from './model';

export const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function generateInvitationToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashInvitationToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function normalizeInvitationEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isInvitationExpired(expiresAt: Date, now: Date = new Date()): boolean {
  return expiresAt.getTime() <= now.getTime();
}

export type InviteError = 'invalidEmail' | 'invalidRole' | 'alreadyCollaborator';

/**
 * Creates an invitation and returns the raw token (shown once to the author
 * as a copyable link — there is no mailer yet). Re-inviting the same email
 * replaces its previous pending invitations.
 */
export async function createInvitation(
  db: CollaborationDb,
  input: { projectId: string; email: string; role: string; invitedBy: string; now?: Date },
): Promise<{ ok: true; token: string } | { ok: false; error: InviteError }> {
  const email = normalizeInvitationEmail(input.email);
  if (!email || !email.includes('@')) return { ok: false, error: 'invalidEmail' };

  const role = parseInvitableRole(input.role);
  if (!role) return { ok: false, error: 'invalidRole' };

  // An account with this email that is already a collaborator cannot be
  // re-invited (the unique constraint would reject the accept anyway).
  const existingUserId = await findUserIdByEmail(db, email);
  if (existingUserId) {
    const access = await resolveProjectAccess(db, { projectId: input.projectId, userId: existingUserId });
    if (access) return { ok: false, error: 'alreadyCollaborator' };
  }

  await deletePendingInvitationsForEmail(db, { projectId: input.projectId, email });

  const token = generateInvitationToken();
  const now = input.now ?? new Date();
  await createInvitationRow(db, {
    projectId: input.projectId,
    email,
    role,
    tokenHash: hashInvitationToken(token),
    invitedBy: input.invitedBy,
    expiresAt: new Date(now.getTime() + INVITATION_TTL_MS),
  });
  return { ok: true, token };
}

export type AcceptInvitationError = 'invalid' | 'expired' | 'emailMismatch' | 'alreadyAccepted';

/**
 * Accepts an invitation: the session user's email must match the invited
 * email. Grants the role (idempotent) and marks the invitation accepted.
 * Requires no plan/license from the invitee (no seat toll).
 */
export async function acceptInvitation(
  db: CollaborationDb,
  input: { token: string; user: { id: string; email: string }; now?: Date },
): Promise<{ ok: true; projectId: string; role: InvitableRole } | { ok: false; error: AcceptInvitationError }> {
  const token = input.token.trim();
  if (!token) return { ok: false, error: 'invalid' };

  const invitation = await findInvitationByTokenHash(db, hashInvitationToken(token));
  if (!invitation) return { ok: false, error: 'invalid' };

  if (invitation.acceptedAt) {
    // Idempotent re-accept by the same account (e.g. double click).
    if (invitation.acceptedBy === input.user.id) {
      const role = parseInvitableRole(invitation.role);
      return role
        ? { ok: true, projectId: invitation.projectId, role }
        : { ok: false, error: 'invalid' };
    }
    return { ok: false, error: 'alreadyAccepted' };
  }

  if (isInvitationExpired(invitation.expiresAt, input.now ?? new Date())) {
    return { ok: false, error: 'expired' };
  }

  if (normalizeInvitationEmail(input.user.email) !== normalizeInvitationEmail(invitation.email)) {
    return { ok: false, error: 'emailMismatch' };
  }

  const role = parseInvitableRole(invitation.role);
  if (!role) return { ok: false, error: 'invalid' };

  await addCollaborator(db, {
    projectId: invitation.projectId,
    userId: input.user.id,
    role,
    invitedBy: invitation.invitedBy,
  });
  await markInvitationAccepted(db, { invitationId: invitation.id, userId: input.user.id });

  return { ok: true, projectId: invitation.projectId, role };
}
