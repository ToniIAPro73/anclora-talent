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
export function syncedSurfaceValues(document: DocumentSubset): SyncedSurfaceValues {
  const metadata = document.metadata ?? null;
  return {
    title: metadata?.title?.trim() || document.title || '',
    subtitle: metadata?.subtitle?.trim() || document.subtitle || '',
    author: metadata?.author?.trim() || document.author || '',
    body: metadata?.description?.trim() || document.subtitle || '',
  };
}
