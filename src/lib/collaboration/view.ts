/**
 * Collaboration view loader — Anclora Talent (F4, entregable 2).
 *
 * Builds the read model of the workspace "Colaborar" panel in one place:
 * caller role (server-resolved, R5), team, pending invitations, comments
 * grouped by chapter/block over the stable AST anchors, and editor
 * suggestions. The panel receives only this plain view — authorization on
 * writes stays in the server actions.
 */

import 'server-only';
import { getDb } from '@/lib/db';
import { projectToSemanticDocument } from '@/lib/compose/preview-adapter';
import type { ProjectRecord } from '@/lib/projects/types';
import { buildCommentGroups, countOpenThreads, type ChapterCommentGroup } from './comments';
import type {
  CollaboratorRole,
  CollaboratorSummary,
  EditorSuggestionView,
  InvitationSummary,
} from './model';
import {
  listBlockComments,
  listCollaborators,
  listEditorSuggestions,
  listPendingInvitations,
  resolveProjectAccess,
} from './repository';

export interface CollaborationView {
  /** Caller's role on the project (resolved server-side). */
  viewerRole: CollaboratorRole;
  collaborators: CollaboratorSummary[];
  invitations: InvitationSummary[];
  /** Comments grouped by chapter → block following document order. */
  commentGroups: ChapterCommentGroup[];
  openThreadCount: number;
  suggestions: EditorSuggestionView[];
}

export async function getCollaborationViewForProject(input: {
  project: ProjectRecord;
  userId: string;
}): Promise<CollaborationView | null> {
  const db = getDb();
  const access = await resolveProjectAccess(db, {
    projectId: input.project.id,
    userId: input.userId,
  });
  if (!access) return null;

  const { document } = projectToSemanticDocument(input.project);
  const [collaborators, invitations, comments, suggestions] = await Promise.all([
    listCollaborators(db, input.project.id),
    listPendingInvitations(db, input.project.id),
    listBlockComments(db, { projectId: input.project.id, ownerId: access.ownerId }),
    listEditorSuggestions(db, input.project.id),
  ]);

  return {
    viewerRole: access.role,
    collaborators,
    invitations,
    commentGroups: buildCommentGroups(comments, document),
    openThreadCount: countOpenThreads(comments),
    suggestions,
  };
}
