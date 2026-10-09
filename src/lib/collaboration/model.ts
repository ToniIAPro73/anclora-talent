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

/** One block-level change of a suggestion, readable as before/after plain text. */
export interface SuggestionChangeView {
  blockId: string;
  kind: 'update' | 'insert' | 'remove' | 'move';
  before: string | null;
  after: string | null;
}

export interface OwnerSummary {
  id: string;
  fullName: string;
  email: string;
}

export interface OutlineBlockView {
  blockId: string;
  kind: string;
  level?: number;
  /** Plain text of the block (safety-capped). */
  text: string;
}

export interface OutlineChapterView {
  /** 0-based chapter index (-1 for content before the first chapter). */
  index: number;
  title: string;
  blocks: OutlineBlockView[];
}

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
  /** Before/after of every block the stored patch touches. */
  changes?: SuggestionChangeView[];
  /** The author's role at read time (the owner is `author`). */
  authorRole?: CollaboratorRole;
  /** Pending only: the stored patch no longer applies to the current document. */
  stale?: boolean;
  /** Chapter of the first affected block (-1 front matter), when known. */
  chapterIndex?: number;
  chapterTitle?: string;
}
