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
import { blockToPlainText } from '@/lib/document/diff';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { isFixedPdfProject } from '@/lib/projects/types';
import { buildCommentGroups, countOpenThreads, indexDocumentBlocks, type ChapterBoundary, type ChapterCommentGroup } from './comments';
import type {
  CollaboratorRole,
  CollaboratorSummary,
  EditorSuggestionView,
  InvitationSummary,
  OutlineChapterView,
  OwnerSummary,
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
  /** The caller (client-side "is this mine" checks; never an authorization input). */
  viewerId: string;
  /** Project owner (the author), listed first in the team. */
  owner: OwnerSummary;
  /** Chapters → blocks with plain-text previews: the surface comments anchor to. Empty for fixed-PDF projects. */
  outline: OutlineChapterView[];
  /** Fixed-PDF projects carry no semantic block anchors: comments/suggestions are unsupported there. */
  blockAnchoring: boolean;
}

/** Safety cap only: a proposal replaces the whole block text, so the read model carries it in full. */
const OUTLINE_TEXT_LIMIT = 6000;


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

  const fixedPdf = isFixedPdfProject(input.project);
  const { document, chapterStartIds, chapterById } = projectToSemanticDocument(input.project);
  const boundaries: ChapterBoundary[] = chapterStartIds.flatMap((startBlockId) => {
    const info = chapterById.get(startBlockId);
    return info ? [{ startBlockId, title: info.title }] : [];
  });
  const [collaborators, invitations, comments, suggestions, ownerRows] = await Promise.all([
    listCollaborators(db, input.project.id),
    listPendingInvitations(db, input.project.id),
    listBlockComments(db, { projectId: input.project.id, ownerId: access.ownerId }),
    listEditorSuggestions(db, input.project.id, document),
    db.select({ id: users.id, fullName: users.fullName, email: users.email }).from(users).where(eq(users.id, access.ownerId)).limit(1),
  ]);

  const anchors = indexDocumentBlocks(document, boundaries);
  const chapters = new Map<number, OutlineChapterView>();
  if (!fixedPdf) {
    for (const block of document.blocks) {
      const anchor = anchors.get(block.id);
      if (!anchor || block.type === 'pageBreak') continue;
      const text = blockToPlainText(block).trim();
      if (!text) continue;
      let chapter = chapters.get(anchor.chapterIndex);
      if (!chapter) {
        chapter = { index: anchor.chapterIndex, title: anchor.chapterTitle, blocks: [] };
        chapters.set(anchor.chapterIndex, chapter);
      }
      chapter.blocks.push({
        blockId: block.id,
        kind: block.type,
        ...(block.type === 'heading' ? { level: block.level } : {}),
        text: text.length > OUTLINE_TEXT_LIMIT ? `${text.slice(0, OUTLINE_TEXT_LIMIT)}…` : text,
      });
    }
  }
  const outline = [...chapters.values()].sort((a, b) => a.index - b.index);

  const roleByUserId = new Map<string, CollaboratorRole>(collaborators.map((collaborator) => [collaborator.userId, collaborator.role]));
  roleByUserId.set(access.ownerId, 'author');
  const enrichedSuggestions: EditorSuggestionView[] = suggestions.map((suggestion) => {
    const firstBlockId = suggestion.changes?.[0]?.blockId ?? suggestion.affectedBlockIds[0];
    const anchor = firstBlockId ? anchors.get(firstBlockId) : undefined;
    return {
      ...suggestion,
      authorRole: roleByUserId.get(suggestion.authorId) ?? 'editor',
      ...(anchor ? { chapterIndex: anchor.chapterIndex, chapterTitle: anchor.chapterTitle } : {}),
    };
  });

  const owner = ownerRows[0] ?? { id: access.ownerId, fullName: '', email: '' };

  return {
    viewerRole: access.role,
    viewerId: input.userId,
    owner,
    collaborators,
    invitations,
    commentGroups: buildCommentGroups(comments, document, boundaries),
    openThreadCount: countOpenThreads(comments),
    suggestions: enrichedSuggestions,
    outline,
    blockAnchoring: !fixedPdf,
  };
}
