/**
 * Collaboration persistence — Anclora Talent (F4, entregable 2).
 *
 * The db surface is injected so the module is unit-testable without a live
 * database (same pattern as sales/credentials.ts). Role resolution is the
 * authorization core: the owner of `projects.userId` is `author`, a row in
 * `project_collaborators` grants its stored role, anything else is denied.
 */

import 'server-only';
import { and, desc, eq } from 'drizzle-orm';
import type { getDb } from '@/lib/db';
import {
  blockComments,
  editorSuggestions,
  projectCollaborators,
  projectInvitations,
  projects,
  users,
} from '@/lib/db/schema';
import type {
  BlockCommentView,
  CollaboratorRole,
  CollaboratorSummary,
  CommentStatus,
  EditorSuggestionView,
  InvitationSummary,
  InvitableRole,
  SuggestionStatus,
} from './model';
import { parseInvitableRole } from './permissions';

export type CollaborationDb = Pick<
  ReturnType<typeof getDb>,
  'select' | 'insert' | 'update' | 'delete'
>;

export interface ProjectAccess {
  role: CollaboratorRole;
  ownerId: string;
}

type InvitationRow = typeof projectInvitations.$inferSelect;
type CommentRow = typeof blockComments.$inferSelect;
type SuggestionRow = typeof editorSuggestions.$inferSelect;

/**
 * Resolves the caller's role on a project. Server-side authorization root
 * (R5): every collaboration action starts here.
 */
export async function resolveProjectAccess(
  db: CollaborationDb,
  input: { projectId: string; userId: string },
): Promise<ProjectAccess | null> {
  const [project] = await db
    .select({ userId: projects.userId })
    .from(projects)
    .where(eq(projects.id, input.projectId))
    .limit(1);
  if (!project) return null;
  if (project.userId === input.userId) {
    return { role: 'author', ownerId: project.userId };
  }

  const [collaborator] = await db
    .select({ role: projectCollaborators.role })
    .from(projectCollaborators)
    .where(
      and(
        eq(projectCollaborators.projectId, input.projectId),
        eq(projectCollaborators.userId, input.userId),
      ),
    )
    .limit(1);
  const role = collaborator ? parseInvitableRole(collaborator.role) : null;
  return role ? { role, ownerId: project.userId } : null;
}

/** Collaborators of a project with their account identity (owner excluded). */
export async function listCollaborators(
  db: CollaborationDb,
  projectId: string,
): Promise<CollaboratorSummary[]> {
  const rows = await db
    .select({
      id: projectCollaborators.id,
      userId: projectCollaborators.userId,
      role: projectCollaborators.role,
      fullName: users.fullName,
      email: users.email,
      createdAt: projectCollaborators.createdAt,
    })
    .from(projectCollaborators)
    .innerJoin(users, eq(users.id, projectCollaborators.userId))
    .where(eq(projectCollaborators.projectId, projectId))
    .orderBy(desc(projectCollaborators.createdAt));

  return rows.flatMap((row) => {
    const role = parseInvitableRole(row.role);
    return role
      ? [
          {
            id: row.id,
            userId: row.userId,
            role,
            fullName: row.fullName,
            email: row.email,
            createdAt: row.createdAt.toISOString(),
          },
        ]
      : [];
  });
}

/** Grants a role; idempotent per (project, user) via the unique constraint. */
export async function addCollaborator(
  db: CollaborationDb,
  input: { projectId: string; userId: string; role: InvitableRole; invitedBy: string },
): Promise<void> {
  await db
    .insert(projectCollaborators)
    .values({
      projectId: input.projectId,
      userId: input.userId,
      role: input.role,
      invitedBy: input.invitedBy,
    })
    .onConflictDoNothing({
      target: [projectCollaborators.projectId, projectCollaborators.userId],
    });
}

export async function removeCollaboratorById(
  db: CollaborationDb,
  input: { projectId: string; collaboratorId: string },
): Promise<void> {
  await db
    .delete(projectCollaborators)
    .where(
      and(
        eq(projectCollaborators.id, input.collaboratorId),
        eq(projectCollaborators.projectId, input.projectId),
      ),
    );
}

/** Account id for an email (invites dedupe against existing members). */
export async function findUserIdByEmail(
  db: CollaborationDb,
  email: string,
): Promise<string | null> {
  const [row] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  return row?.id ?? null;
}

export async function createInvitationRow(
  db: CollaborationDb,
  input: {
    projectId: string;
    email: string;
    role: InvitableRole;
    tokenHash: string;
    invitedBy: string;
    expiresAt: Date;
  },
): Promise<void> {
  await db.insert(projectInvitations).values(input);
}

export async function findInvitationByTokenHash(
  db: CollaborationDb,
  tokenHash: string,
): Promise<InvitationRow | null> {
  const [row] = await db
    .select()
    .from(projectInvitations)
    .where(eq(projectInvitations.tokenHash, tokenHash))
    .limit(1);
  return row ?? null;
}

/** Pending (not yet accepted) invitations of a project, newest first. */
export async function listPendingInvitations(
  db: CollaborationDb,
  projectId: string,
): Promise<InvitationSummary[]> {
  const rows = await db
    .select()
    .from(projectInvitations)
    .where(eq(projectInvitations.projectId, projectId))
    .orderBy(desc(projectInvitations.createdAt));

  return rows.flatMap((row) => {
    const role = parseInvitableRole(row.role);
    return !row.acceptedAt && role
      ? [
          {
            id: row.id,
            email: row.email,
            role,
            expiresAt: row.expiresAt.toISOString(),
            createdAt: row.createdAt.toISOString(),
          },
        ]
      : [];
  });
}

/** Re-inviting an email replaces its previous pending invitations. */
export async function deletePendingInvitationsForEmail(
  db: CollaborationDb,
  input: { projectId: string; email: string },
): Promise<void> {
  await db
    .delete(projectInvitations)
    .where(
      and(
        eq(projectInvitations.projectId, input.projectId),
        eq(projectInvitations.email, input.email),
      ),
    );
}

export async function markInvitationAccepted(
  db: CollaborationDb,
  input: { invitationId: string; userId: string },
): Promise<void> {
  await db
    .update(projectInvitations)
    .set({ acceptedAt: new Date(), acceptedBy: input.userId })
    .where(eq(projectInvitations.id, input.invitationId));
}

export async function deleteInvitationById(
  db: CollaborationDb,
  input: { projectId: string; invitationId: string },
): Promise<void> {
  await db
    .delete(projectInvitations)
    .where(
      and(
        eq(projectInvitations.id, input.invitationId),
        eq(projectInvitations.projectId, input.projectId),
      ),
    );
}

// ---------------------------------------------------------------------------
// Block comments (anchored to stable AST block ids) and editor suggestions.
// ---------------------------------------------------------------------------

interface CommentJoinRow {
  comment: CommentRow;
  authorName: string;
  resolverName: string | null;
}

function toCommentView(
  row: CommentJoinRow,
  roleByUserId: Map<string, CollaboratorRole>,
): BlockCommentView | null {
  const status: CommentStatus = row.comment.status === 'resolved' ? 'resolved' : 'open';
  const authorRole = roleByUserId.get(row.comment.authorId) ?? 'author';
  return {
    id: row.comment.id,
    blockId: row.comment.blockId,
    parentId: row.comment.parentId,
    authorId: row.comment.authorId,
    authorName: row.authorName,
    authorRole,
    body: row.comment.body,
    status,
    resolvedByName: row.resolverName,
    resolvedAt: row.comment.resolvedAt?.toISOString() ?? null,
    createdAt: row.comment.createdAt.toISOString(),
  };
}

/**
 * All comments of a project with author identity. The caller groups them
 * into threads and chapters (comments.ts) — persistence stays flat.
 */
export async function listBlockComments(
  db: CollaborationDb,
  input: { projectId: string; ownerId: string },
): Promise<BlockCommentView[]> {
  const rows = (await db
    .select({
      comment: blockComments,
      authorName: users.fullName,
    })
    .from(blockComments)
    .innerJoin(users, eq(users.id, blockComments.authorId))
    .where(eq(blockComments.projectId, input.projectId))
    .orderBy(blockComments.createdAt)) as Array<{ comment: CommentRow; authorName: string }>;

  // Resolver names are rare (only resolved threads): a tiny second pass keeps
  // the main query simple instead of a self-join.
  const resolverIds = [...new Set(rows.flatMap((row) => (row.comment.resolvedBy ? [row.comment.resolvedBy] : [])))];
  const resolverNames = new Map<string, string>();
  for (const resolverId of resolverIds) {
    const [resolver] = await db
      .select({ fullName: users.fullName })
      .from(users)
      .where(eq(users.id, resolverId))
      .limit(1);
    if (resolver) resolverNames.set(resolverId, resolver.fullName);
  }

  const collaborators = await listCollaborators(db, input.projectId);
  const roleByUserId = new Map<string, CollaboratorRole>(
    collaborators.map((collaborator) => [collaborator.userId, collaborator.role]),
  );
  roleByUserId.set(input.ownerId, 'author');

  return rows.flatMap((row) => {
    const view = toCommentView(
      {
        comment: row.comment,
        authorName: row.authorName,
        resolverName: row.comment.resolvedBy ? (resolverNames.get(row.comment.resolvedBy) ?? null) : null,
      },
      roleByUserId,
    );
    return view ? [view] : [];
  });
}

export async function insertBlockComment(
  db: CollaborationDb,
  input: { projectId: string; blockId: string; authorId: string; body: string; parentId: string | null },
): Promise<{ id: string }> {
  const [row] = await db
    .insert(blockComments)
    .values({
      projectId: input.projectId,
      blockId: input.blockId,
      authorId: input.authorId,
      body: input.body,
      parentId: input.parentId,
    })
    .returning({ id: blockComments.id });
  return { id: row.id };
}

/** Fetches a comment scoped to its project (thread resolution checks). */
export async function findBlockComment(
  db: CollaborationDb,
  input: { projectId: string; commentId: string },
): Promise<CommentRow | null> {
  const [row] = await db
    .select()
    .from(blockComments)
    .where(and(eq(blockComments.id, input.commentId), eq(blockComments.projectId, input.projectId)))
    .limit(1);
  return row ?? null;
}

/** Resolves a thread root (replies inherit the root status in the view). */
export async function markCommentThreadResolved(
  db: CollaborationDb,
  input: { projectId: string; commentId: string; resolvedBy: string },
): Promise<void> {
  await db
    .update(blockComments)
    .set({ status: 'resolved', resolvedBy: input.resolvedBy, resolvedAt: new Date() })
    .where(and(eq(blockComments.id, input.commentId), eq(blockComments.projectId, input.projectId)));
}

export async function insertEditorSuggestion(
  db: CollaborationDb,
  input: {
    projectId: string;
    authorId: string;
    summary: string;
    operations: unknown;
    diff: unknown;
  },
): Promise<{ id: string }> {
  const [row] = await db
    .insert(editorSuggestions)
    .values({
      projectId: input.projectId,
      authorId: input.authorId,
      summary: input.summary,
      operations: input.operations,
      diff: input.diff,
    })
    .returning({ id: editorSuggestions.id });
  return { id: row.id };
}

export async function findEditorSuggestion(
  db: CollaborationDb,
  input: { projectId: string; suggestionId: string },
): Promise<SuggestionRow | null> {
  const [row] = await db
    .select()
    .from(editorSuggestions)
    .where(
      and(eq(editorSuggestions.id, input.suggestionId), eq(editorSuggestions.projectId, input.projectId)),
    )
    .limit(1);
  return row ?? null;
}

export async function listEditorSuggestions(
  db: CollaborationDb,
  projectId: string,
): Promise<EditorSuggestionView[]> {
  const rows = (await db
    .select({ suggestion: editorSuggestions, authorName: users.fullName })
    .from(editorSuggestions)
    .innerJoin(users, eq(users.id, editorSuggestions.authorId))
    .where(eq(editorSuggestions.projectId, projectId))
    .orderBy(desc(editorSuggestions.createdAt))) as Array<{
    suggestion: SuggestionRow;
    authorName: string;
  }>;

  const deciderIds = [...new Set(rows.flatMap((row) => (row.suggestion.decidedBy ? [row.suggestion.decidedBy] : [])))];
  const deciderNames = new Map<string, string>();
  for (const deciderId of deciderIds) {
    const [decider] = await db
      .select({ fullName: users.fullName })
      .from(users)
      .where(eq(users.id, deciderId))
      .limit(1);
    if (decider) deciderNames.set(deciderId, decider.fullName);
  }

  return rows.map((row) => {
    const status: SuggestionStatus =
      row.suggestion.status === 'accepted' || row.suggestion.status === 'rejected'
        ? row.suggestion.status
        : 'pending';
    const diff = row.suggestion.diff as {
      chapters?: Array<{ changes?: Array<{ blockId?: string }> }>;
    } | null;
    const affectedBlockIds = (diff?.chapters ?? []).flatMap((chapter) =>
      (chapter.changes ?? []).flatMap((change) => (change.blockId ? [change.blockId] : [])),
    );
    return {
      id: row.suggestion.id,
      authorId: row.suggestion.authorId,
      authorName: row.authorName,
      summary: row.suggestion.summary,
      affectedBlockIds,
      status,
      decidedByName: row.suggestion.decidedBy ? (deciderNames.get(row.suggestion.decidedBy) ?? null) : null,
      decidedAt: row.suggestion.decidedAt?.toISOString() ?? null,
      createdAt: row.suggestion.createdAt.toISOString(),
    };
  });
}

export async function markSuggestionDecided(
  db: CollaborationDb,
  input: {
    projectId: string;
    suggestionId: string;
    status: Exclude<SuggestionStatus, 'pending'>;
    decidedBy: string;
  },
): Promise<void> {
  await db
    .update(editorSuggestions)
    .set({ status: input.status, decidedBy: input.decidedBy, decidedAt: new Date() })
    .where(
      and(eq(editorSuggestions.id, input.suggestionId), eq(editorSuggestions.projectId, input.projectId)),
    );
}
