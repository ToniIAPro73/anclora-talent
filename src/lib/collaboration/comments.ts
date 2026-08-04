/**
 * Block comments over the document AST — Anclora Talent (F4, entregable 2).
 *
 * Anchors are the stable block ids of the AST (src/lib/document/model.ts),
 * never text offsets: a comment survives recomposition as long as its block
 * exists. This module is pure — persistence lives in repository.ts — so
 * grouping, threading and counting are unit-tested without a database.
 *
 * Threads are flat: a reply's `parentId` always points at the thread root,
 * and resolving a thread marks the root (replies inherit its status here).
 */

import { blockToPlainText } from '@/lib/document/diff';
import type { SemanticDocument } from '@/lib/document/model';
import type { BlockCommentView } from './model';

export interface BlockAnchor {
  blockId: string;
  /** Plain-text preview of the anchored block. */
  preview: string;
  /** Title of the chapter (level-1 heading slice) containing the block. */
  chapterTitle: string;
  /** 0-based chapter index; -1 for front matter (before the first chapter). */
  chapterIndex: number;
}

/**
 * Maps every block id to its chapter and preview, slicing the AST by
 * level-1 headings (the same chapter definition the composer and the F2
 * diff use). Content before the first chapter is front matter (index -1).
 */
export function indexDocumentBlocks(document: SemanticDocument): Map<string, BlockAnchor> {
  const index = new Map<string, BlockAnchor>();
  let chapterTitle = '';
  let chapterIndex = -1;

  for (const block of document.blocks) {
    if (block.type === 'heading' && block.level === 1) {
      chapterIndex += 1;
      chapterTitle = blockToPlainText(block);
    }
    index.set(block.id, {
      blockId: block.id,
      preview: blockToPlainText(block),
      chapterTitle,
      chapterIndex,
    });
  }
  return index;
}

/** Anchor of a block id, or null when the block no longer exists. */
export function findBlockAnchor(
  document: SemanticDocument,
  blockId: string,
): BlockAnchor | null {
  return indexDocumentBlocks(document).get(blockId) ?? null;
}

export interface CommentThread {
  root: BlockCommentView;
  replies: BlockCommentView[];
}

/**
 * Groups flat comment rows into threads. Rows arrive ordered by createdAt
 * (repository contract); replies always attach to their root regardless of
 * interleaving with other threads.
 */
export function groupCommentsIntoThreads(comments: BlockCommentView[]): CommentThread[] {
  const threads: CommentThread[] = [];
  const byRootId = new Map<string, CommentThread>();

  for (const comment of comments) {
    if (!comment.parentId) {
      const thread: CommentThread = { root: comment, replies: [] };
      threads.push(thread);
      byRootId.set(comment.id, thread);
      continue;
    }
    const thread = byRootId.get(comment.parentId);
    if (thread) {
      thread.replies.push(comment);
    } else {
      // Orphan reply (root deleted/missing): surface it as its own thread so
      // no feedback is ever silently dropped.
      threads.push({ root: comment, replies: [] });
      byRootId.set(comment.id, threads[threads.length - 1]);
    }
  }
  return threads;
}

export interface BlockCommentGroup {
  blockId: string;
  blockPreview: string;
  threads: CommentThread[];
}

export interface ChapterCommentGroup {
  chapterIndex: number;
  /** '' for front matter — the UI localizes it. */
  chapterTitle: string;
  blocks: BlockCommentGroup[];
}

/**
 * Groups threads by chapter → block following document order (chapters in
 * reading order, front matter first; blocks in AST order). Comments whose
 * anchor block disappeared from the document keep their last known chapter
 * (index -1, empty title) instead of vanishing.
 */
export function buildCommentGroups(
  comments: BlockCommentView[],
  document: SemanticDocument,
): ChapterCommentGroup[] {
  const anchors = indexDocumentBlocks(document);
  const threads = groupCommentsIntoThreads(comments);

  const chapters = new Map<number, ChapterCommentGroup>();
  const blocksByChapter = new Map<number, Map<string, BlockCommentGroup>>();

  for (const thread of threads) {
    const anchor = anchors.get(thread.root.blockId);
    const chapterIndex = anchor?.chapterIndex ?? -1;
    const chapterTitle = anchor?.chapterTitle ?? '';

    let chapter = chapters.get(chapterIndex);
    if (!chapter) {
      chapter = { chapterIndex, chapterTitle, blocks: [] };
      chapters.set(chapterIndex, chapter);
      blocksByChapter.set(chapterIndex, new Map());
    }
    const blocks = blocksByChapter.get(chapterIndex)!;
    let block = blocks.get(thread.root.blockId);
    if (!block) {
      block = {
        blockId: thread.root.blockId,
        blockPreview: anchor?.preview ?? '',
        threads: [],
      };
      blocks.set(thread.root.blockId, block);
      chapter.blocks.push(block);
    }
    block.threads.push(thread);
  }

  const ordered = [...chapters.values()].sort((a, b) => a.chapterIndex - b.chapterIndex);
  for (const chapter of ordered) {
    chapter.blocks.sort(
      (a, b) =>
        (document.blocks.findIndex((block) => block.id === a.blockId) || 0) -
        (document.blocks.findIndex((block) => block.id === b.blockId) || 0),
    );
  }
  return ordered;
}

/** Open threads counter — the author's notification substitute (F4 scope). */
export function countOpenThreads(comments: BlockCommentView[]): number {
  return groupCommentsIntoThreads(comments).filter((thread) => thread.root.status === 'open')
    .length;
}
