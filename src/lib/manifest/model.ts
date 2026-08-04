/**
 * Project asset manifest — canonical model (F2).
 *
 * The manifest is the versioned registry of every deliverable a project has
 * produced: compositor exports (EPUB/PDF/HTML/Markdown/slides) and FileStudio
 * derivatives (cover resolutions, MOBI/AZW3). Each regeneration appends a new
 * version; old versions stay for audit.
 *
 * Stale detection is computed at read time, never stored: an item is `stale`
 * when the hash of the current document AST differs from the `sourceHash`
 * the item was generated from (the document changed since the export).
 */

export type ManifestAssetKind =
  | 'epub'
  | 'pdf'
  | 'html'
  | 'markdown'
  | 'slides'
  | 'image'
  | 'mobi'
  | 'azw3'
  | 'audio'
  | 'video';

export type ManifestProvenance = 'compositor' | 'filestudio-local' | 'filestudio-service';

export interface ProjectAssetManifestItem {
  /** Stable id inside the manifest (e.g. `epub`, `cover-1600`, `mobi`). */
  assetId: string;
  kind: ManifestAssetKind;
  /** Public URL once materialized; null while a FileStudio job is pending. */
  url: string | null;
  /** Vercel Blob pathname when the asset is stored in Blob. */
  blobKey: string | null;
  provenance: ManifestProvenance;
  /** SHA-256 of the document AST snapshot the asset was generated from. */
  sourceHash: string;
  /** ISO timestamp of the item generation. */
  createdAt: string;
  /** FileStudio job row id for delegated assets still in flight. */
  jobId?: string;
}

export interface ProjectAssetManifest {
  id: string;
  projectId: string;
  /** Monotonic per project: the latest version is the current manifest. */
  version: number;
  items: ProjectAssetManifestItem[];
  createdAt: string;
}

export interface ManifestItemWithStatus extends ProjectAssetManifestItem {
  /** True when the document changed after this item was generated. */
  stale: boolean;
}

/**
 * Marks each item stale when its `sourceHash` differs from the hash of the
 * current document AST. Pure: the comparison is a string equality.
 */
export function withStaleStatus(
  items: ProjectAssetManifestItem[],
  currentSourceHash: string,
): ManifestItemWithStatus[] {
  return items.map((item) => ({ ...item, stale: item.sourceHash !== currentSourceHash }));
}

/** Human-stable asset id for the compositor deliverables. */
export function compositorAssetId(kind: ManifestAssetKind): string {
  return kind;
}
