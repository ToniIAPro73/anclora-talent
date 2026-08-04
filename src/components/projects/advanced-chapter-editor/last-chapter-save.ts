'use client';

/**
 * Session snapshot of the last successful chapter save (F0.3 undo).
 *
 * When a recomposition was triggered by the user's last chapter save, the
 * workspace offers to revert it: re-saving `previousHtml` through the
 * regular save path (`saveChapterContentAction`), so the subsequent
 * recomposition happens on its own. No new endpoints, no data-path fork.
 *
 * Scope (deliberately conservative): only the LAST save of the session is
 * kept, in memory. There is no persistent undo history — a page reload
 * drops the snapshot and a new save replaces it.
 */

export interface LastChapterSaveSnapshot {
  projectId: string;
  chapterId: string;
  chapterTitle: string;
  /** Normalized editor HTML as it was right before the last successful save. */
  previousHtml: string;
  savedAt: number;
}

let snapshot: LastChapterSaveSnapshot | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function recordLastChapterSave(
  next: Omit<LastChapterSaveSnapshot, 'savedAt'>,
): void {
  snapshot = { ...next, savedAt: Date.now() };
  emit();
}

export function clearLastChapterSave(): void {
  if (!snapshot) return;
  snapshot = null;
  emit();
}

export function getLastChapterSaveSnapshot(): LastChapterSaveSnapshot | null {
  return snapshot;
}

/** `useSyncExternalStore`-compatible subscription. */
export function subscribeLastChapterSave(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
