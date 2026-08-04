/**
 * Role permission matrix — Anclora Talent (F4, entregable 2).
 *
 * Single source of truth for what each project role can do. ALWAYS enforced
 * server-side (R5): every collaboration action resolves the caller's role
 * from the database and checks it here before touching any data.
 *
 * Conservative decision (documented): the editor (corrector) never writes
 * the document directly — corrections are suggestions the author accepts or
 * rejects (same accept/reject flow as F3 AI proposals, provenance human).
 */

import type { CollaboratorRole, InvitableRole } from './model';

export type CollaborationAction =
  /** Invite collaborators, cancel invitations, revoke access. */
  | 'manage-collaborators'
  /** Create comments and reply in threads. */
  | 'comment'
  /** Resolve a comment thread. */
  | 'resolve-comment'
  /** Propose a correction as an accept/rejectable AST suggestion. */
  | 'propose-suggestion'
  /** Accept or reject a suggestion (applies it to the document). */
  | 'decide-suggestion'
  /** Direct content editing of the document AST. */
  | 'edit-content'
  /** Edit composition rules and cover/back cover (never content). */
  | 'edit-design';

const ROLE_PERMISSIONS: Record<CollaboratorRole, readonly CollaborationAction[]> = {
  author: [
    'manage-collaborators',
    'comment',
    'resolve-comment',
    'propose-suggestion',
    'decide-suggestion',
    'edit-content',
    'edit-design',
  ],
  editor: ['comment', 'propose-suggestion'],
  designer: ['comment', 'edit-design'],
};

export function canPerform(role: CollaboratorRole, action: CollaborationAction): boolean {
  return ROLE_PERMISSIONS[role].includes(action);
}

/** Narrows an untrusted persisted value to a full role (owner included). */
export function parseCollaboratorRole(value: unknown): CollaboratorRole | null {
  return value === 'author' || value === 'editor' || value === 'designer' ? value : null;
}

/** Narrows an untrusted input to an invitable role (never `author`). */
export function parseInvitableRole(value: unknown): InvitableRole | null {
  return value === 'editor' || value === 'designer' ? value : null;
}
