/**
 * Collaboration model — Anclora Talent (F4, entregable 2).
 *
 * Roles over a project:
 * - `author`: the project owner (projects.userId). Can do everything.
 * - `editor` (corrector): comments and proposes corrections as accept/
 *   rejectable suggestions — never edits the document directly.
 * - `designer` (maquetador): comments and edits rules/cover (never content).
 *
 * Comment anchors are the stable block ids of the document AST
 * (src/lib/document/model.ts) — never text offsets.
 */

/** Full role set including the owner. */
export type CollaboratorRole = 'author' | 'editor' | 'designer';

/** Roles assignable through an invitation (the author is the owner). */
export type InvitableRole = Exclude<CollaboratorRole, 'author'>;

export interface CollaboratorSummary {
  id: string;
  userId: string;
  role: InvitableRole;
  fullName: string;
  email: string;
  createdAt: string;
}

export interface InvitationSummary {
  id: string;
  email: string;
  role: InvitableRole;
  expiresAt: string;
  createdAt: string;
}

export type CommentStatus = 'open' | 'resolved';

export interface BlockCommentView {
  id: string;
  blockId: string;
  parentId: string | null;
  authorId: string;
  authorName: string;
  authorRole: CollaboratorRole;
  body: string;
  status: CommentStatus;
  resolvedByName: string | null;
  resolvedAt: string | null;
  createdAt: string;
}

export type SuggestionStatus = 'pending' | 'accepted' | 'rejected';

export interface EditorSuggestionView {
  id: string;
  authorId: string;
  authorName: string;
  summary: string;
  /** Ids of the AST blocks the proposal touches. */
  affectedBlockIds: string[];
  status: SuggestionStatus;
  decidedByName: string | null;
  decidedAt: string | null;
  createdAt: string;
}
