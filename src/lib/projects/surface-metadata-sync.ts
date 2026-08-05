import type { ProjectRecord } from './types';

type DocumentSubset = ProjectRecord['document'];

export interface SyncedSurfaceValues {
  /** Cover and back-cover title. */
  title: string;
  /** Cover subtitle. */
  subtitle: string;
  /** Cover author. */
  author: string;
  /** Back-cover body (long synopsis lives only in the product metadata). */
  body: string;
}

/**
 * D.3 — single source for surface text: the product metadata chain.
 * `DocumentMetadata` mirrors the document's main form (title/subtitle/author
 * are refreshed by `updateProjectDocument` on every document save), so the
 * metadata value is preferred and the document field is the fallback when no
 * metadata was ever saved. The back-cover body has no document counterpart:
 * it follows `metadata.description`, falling back to the document subtitle.
 */
const SUBTITLE_CONDENSE_LIMIT = 220;
const SENTENCE_BOUNDARY = /(?<=[.!?])\s+/;

/**
 * M3 — condense a cover subtitle longer than `limit` chars by keeping whole
 * sentences (never cutting mid-sentence) and appending an ellipsis. Falls
 * back to a word-boundary cut when a single sentence already exceeds the
 * limit. Purely a display transform: the stored `DocumentMetadata.subtitle`
 * is never touched, only the value fed to the cover surface.
 */
export function condenseSubtitle(subtitle: string, limit = SUBTITLE_CONDENSE_LIMIT): string {
  const trimmed = subtitle.trim();
  if (trimmed.length <= limit) return trimmed;

  const sentences = trimmed.split(SENTENCE_BOUNDARY);
  let condensed = '';
  for (const sentence of sentences) {
    const candidate = condensed ? `${condensed} ${sentence}` : sentence;
    if (candidate.length > limit) break;
    condensed = candidate;
  }

  if (!condensed) {
    const cut = trimmed.slice(0, limit);
    const lastSpace = cut.lastIndexOf(' ');
    condensed = lastSpace > 0 ? cut.slice(0, lastSpace) : cut;
  }

  return `${condensed.replace(/[.!?]+$/, '')}…`;
}

export function syncedSurfaceValues(document: DocumentSubset): SyncedSurfaceValues {
  const metadata = document.metadata ?? null;
  return {
    title: metadata?.title?.trim() || document.title || '',
    subtitle: metadata?.subtitle?.trim() || document.subtitle || '',
    author: metadata?.author?.trim() || document.author || '',
    body: metadata?.description?.trim() || document.subtitle || '',
  };
}
