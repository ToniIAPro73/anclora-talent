/**
 * Pure helpers of the Step 6 collaboration workspace: filters, counts and
 * display helpers over the server-loaded `CollaborationView`. No I/O and no
 * authorization — permissions stay in permissions.ts (UI guards only shape
 * what is rendered; every write is re-checked by the server actions).
 */

import type { ChapterCommentGroup, CommentThread } from './comments';
import type { CollaboratorRole, EditorSuggestionView, OutlineChapterView } from './model';
import { canPerform } from './permissions';

export type ThreadStatusFilter = 'all' | 'open' | 'resolved';
/** `'all'` = every chapter; otherwise the 0-based chapter index (-1 = front matter). */
export type ChapterFilter = 'all' | number;

export interface RoleCapabilities {
  manage: boolean;
  comment: boolean;
  resolve: boolean;
  propose: boolean;
  decide: boolean;
}

export function roleCapabilities(role: CollaboratorRole): RoleCapabilities {
  return {
    manage: canPerform(role, 'manage-collaborators'),
    comment: canPerform(role, 'comment'),
    resolve: canPerform(role, 'resolve-comment'),
    propose: canPerform(role, 'propose-suggestion'),
    decide: canPerform(role, 'decide-suggestion'),
  };
}

export interface ChapterOption {
  index: number;
  title: string;
  blockCount: number;
  openThreads: number;
}

function matchesStatus(thread: CommentThread, status: ThreadStatusFilter) {
  return status === 'all' || thread.root.status === status;
}

/** Threads of every block, flattened with their chapter/block context, after filters. */
export interface ThreadEntry {
  chapterIndex: number;
  chapterTitle: string;
  blockId: string;
  blockPreview: string;
  thread: CommentThread;
}

export function listThreadEntries(
  groups: ChapterCommentGroup[],
  filters: { chapter: ChapterFilter; status: ThreadStatusFilter; blockId?: string | null },
): ThreadEntry[] {
  const entries: ThreadEntry[] = [];
  for (const chapter of groups) {
    if (filters.chapter !== 'all' && chapter.chapterIndex !== filters.chapter) continue;
    for (const block of chapter.blocks) {
      if (filters.blockId && block.blockId !== filters.blockId) continue;
      for (const thread of block.threads) {
        if (!matchesStatus(thread, filters.status)) continue;
        entries.push({
          chapterIndex: chapter.chapterIndex,
          chapterTitle: chapter.chapterTitle,
          blockId: block.blockId,
          blockPreview: block.blockPreview,
          thread,
        });
      }
    }
  }
  return entries;
}

export function threadCounts(groups: ChapterCommentGroup[], chapter: ChapterFilter = 'all') {
  let open = 0;
  let resolved = 0;
  for (const entry of listThreadEntries(groups, { chapter, status: 'all' })) {
    if (entry.thread.root.status === 'open') open += 1;
    else resolved += 1;
  }
  return { open, resolved, total: open + resolved };
}

/** Thread counts per block (open/resolved) for the reader markers. */
export function blockThreadSummary(groups: ChapterCommentGroup[]): Map<string, { open: number; resolved: number }> {
  const summary = new Map<string, { open: number; resolved: number }>();
  for (const entry of listThreadEntries(groups, { chapter: 'all', status: 'all' })) {
    const current = summary.get(entry.blockId) ?? { open: 0, resolved: 0 };
    if (entry.thread.root.status === 'open') current.open += 1;
    else current.resolved += 1;
    summary.set(entry.blockId, current);
  }
  return summary;
}

/** Chapters offered by the filter: every outline chapter plus chapters that only appear through comments. */
export function chapterOptions(outline: OutlineChapterView[], groups: ChapterCommentGroup[]): ChapterOption[] {
  const options = new Map<number, ChapterOption>();
  for (const chapter of outline) {
    options.set(chapter.index, { index: chapter.index, title: chapter.title, blockCount: chapter.blocks.length, openThreads: 0 });
  }
  for (const group of groups) {
    if (!options.has(group.chapterIndex)) {
      options.set(group.chapterIndex, { index: group.chapterIndex, title: group.chapterTitle, blockCount: 0, openThreads: 0 });
    }
    const option = options.get(group.chapterIndex)!;
    option.openThreads = group.blocks.reduce(
      (total, block) => total + block.threads.filter((thread) => thread.root.status === 'open').length,
      0,
    );
  }
  return [...options.values()].sort((a, b) => a.index - b.index);
}

export type SuggestionFilter = 'pending' | 'decided' | 'all';

export function filterSuggestions(suggestions: EditorSuggestionView[], filter: SuggestionFilter): EditorSuggestionView[] {
  if (filter === 'all') return suggestions;
  return suggestions.filter((suggestion) => (filter === 'pending' ? suggestion.status === 'pending' : suggestion.status !== 'pending'));
}

export function pendingSuggestionCount(suggestions: EditorSuggestionView[]): number {
  return suggestions.filter((suggestion) => suggestion.status === 'pending').length;
}

export function initials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  const letters = parts.length === 1 ? parts[0].slice(0, 2) : `${parts[0][0]}${parts[parts.length - 1][0]}`;
  return letters.toLocaleUpperCase();
}

const UNITS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ['year', 31_536_000],
  ['month', 2_592_000],
  ['day', 86_400],
  ['hour', 3_600],
  ['minute', 60],
];

/** "hace 2 horas" / "2 hours ago"; falls back to the date when the timestamp is invalid. */
export function relativeTime(iso: string, locale: string, now: number = Date.now()): string {
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return iso;
  const seconds = Math.round((time - now) / 1000);
  const formatter = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return formatter.format(Math.round(seconds / size), unit);
  }
  return formatter.format(0, 'minute');
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** UX-only validation; the server action stays authoritative. */
export function looksLikeEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value.trim());
}
