'use server';

/**
 * Server actions — project collaboration (F4, entregable 2).
 *
 * Every action resolves the caller's role server-side (R5) through
 * `resolveProjectAccess` and checks the permission matrix
 * (collaboration/permissions.ts) before touching data. Comment anchors and
 * suggestion operations always reference stable AST block ids.
 */

import { revalidatePath } from 'next/cache';
import { requireUser, requireUserId } from '@/lib/auth/guards';
import { getDb, hasDatabase } from '@/lib/db';
import { canPerform, type CollaborationAction } from './permissions';
import {
  deleteInvitationById,
  removeCollaboratorById,
  resolveProjectAccess,
  type ProjectAccess,
} from './repository';
import {
  acceptInvitation,
  createInvitation,
  type AcceptInvitationError,
  type InviteError,
} from './invitations';
import type { InvitableRole } from './model';

type CollaborationError =
  | 'unavailable'
  | 'forbidden'
  | 'notFound'
  | 'invalid'
  | InviteError
  | AcceptInvitationError;

type Result<T extends object = object> =
  | ({ ok: true } & T)
  | { ok: false; error: CollaborationError };

async function requireProjectAction(
  userId: string,
  projectId: string,
  action: CollaborationAction,
): Promise<{ access: ProjectAccess } | { error: CollaborationError }> {
  if (!projectId) return { error: 'notFound' };
  const access = await resolveProjectAccess(getDb(), { projectId, userId });
  if (!access) return { error: 'notFound' };
  if (!canPerform(access.role, action)) return { error: 'forbidden' };
  return { access };
}

function revalidateProject(projectId: string) {
  revalidatePath(`/projects/${projectId}/editor`);
}

/**
 * Invites a collaborator by email with a role (author only). Returns the
 * invite link to copy (there is no mailer yet). No seat/plan requirement
 * for the invitee — accepting the link is enough.
 */
export async function inviteCollaboratorAction(input: {
  projectId: string;
  email: string;
  role: string;
}): Promise<Result<{ inviteUrl: string }>> {
  if (!hasDatabase()) return { ok: false, error: 'unavailable' };
  const userId = await requireUserId();
  const gate = await requireProjectAction(userId, input.projectId, 'manage-collaborators');
  if ('error' in gate) return { ok: false, error: gate.error };

  const result = await createInvitation(getDb(), {
    projectId: input.projectId,
    email: input.email,
    role: input.role,
    invitedBy: userId,
  });
  if (!result.ok) return { ok: false, error: result.error };

  revalidateProject(input.projectId);
  return { ok: true, inviteUrl: `/invite/${result.token}` };
}

export async function revokeCollaboratorAction(input: {
  projectId: string;
  collaboratorId: string;
}): Promise<Result> {
  if (!hasDatabase()) return { ok: false, error: 'unavailable' };
  const userId = await requireUserId();
  const gate = await requireProjectAction(userId, input.projectId, 'manage-collaborators');
  if ('error' in gate) return { ok: false, error: gate.error };

  await removeCollaboratorById(getDb(), {
    projectId: input.projectId,
    collaboratorId: input.collaboratorId,
  });
  revalidateProject(input.projectId);
  return { ok: true };
}

export async function cancelInvitationAction(input: {
  projectId: string;
  invitationId: string;
}): Promise<Result> {
  if (!hasDatabase()) return { ok: false, error: 'unavailable' };
  const userId = await requireUserId();
  const gate = await requireProjectAction(userId, input.projectId, 'manage-collaborators');
  if ('error' in gate) return { ok: false, error: gate.error };

  await deleteInvitationById(getDb(), {
    projectId: input.projectId,
    invitationId: input.invitationId,
  });
  revalidateProject(input.projectId);
  return { ok: true };
}

/**
 * Accepts an invitation link. Any authenticated account whose email matches
 * the invited email can accept — no plan/license/checkout (no seat toll;
 * the product has no billing yet).
 */
export async function acceptInvitationAction(input: {
  token: string;
}): Promise<Result<{ projectId: string; role: InvitableRole }>> {
  if (!hasDatabase()) return { ok: false, error: 'unavailable' };
  const user = await requireUser();
  const result = await acceptInvitation(getDb(), {
    token: input.token,
    user: { id: user.id, email: user.email },
  });
  if (!result.ok) return { ok: false, error: result.error };

  revalidateProject(result.projectId);
  return { ok: true, projectId: result.projectId, role: result.role };
}
