import type { DocumentMetadata, SemanticDocument } from '@/lib/document/model';
import type { DocumentRules } from '@/lib/compose/rules';
import type { ProvenanceMap } from '@/lib/ai/provenance';
import type { SurfaceState } from './cover-surface';

export type ProjectStatus = 'draft' | 'active';

export type DocumentBlockType = 'heading' | 'paragraph' | 'quote';

export interface DocumentBlock {
  id: string;
  type: DocumentBlockType;
  order: number;
  content: string;
}

export interface ChapterImage {
  id: string;
  url: string;
  alt: string;
  width: number;
  height: number;
  left: number;
  top: number;
  rotation: number;
  opacity: number;
  zIndex: number;
  createdAt: string;
}

export interface DocumentChapter {
  id: string;
  order: number;
  title: string;
  blocks: DocumentBlock[];
  images?: ChapterImage[];
  imageCanvasHeight?: number;
}

/**
 * 'editable' (default when undefined, for backward compatibility with every
 * project created before this field existed): the document was normalized
 * into chapters/blocks and is governed by the composition engine.
 * 'fixed-pdf': the original PDF binary is the canonical visual source; the
 * semantic pipeline only produces sidecar metadata and never governs
 * rendering, cover, back cover, TOC or pagination.
 */
export type DocumentMode = 'editable' | 'fixed-pdf';

/**
 * 'private': the source Blob store honored `access: 'private'`.
 * 'public-proxy-only': the store rejected private access (documented infra
 * gap, see sdd/features/feature-fixed-pdf-document-mode); the blob is
 * technically public, but its URL is still only ever read server-side,
 * behind the project's own auth/ownership check.
 */
export type SourceDocumentAccessLevel = 'private' | 'public-proxy-only';

export interface ProjectDocumentSource {
  fileName: string;
  mimeType: string;
  importedAt: string;
  mode?: DocumentMode;
  pageCount?: number;
  outline?: EditorialMapEntry[];
  sizeBytes?: number;
  sha256?: string;
  sourceAssetId?: string;
  sourceAccessLevel?: SourceDocumentAccessLevel;
}

export interface EditorialMapEntry {
  title: string;
  level: number;
  origin?: 'detected' | 'generated' | 'inferred';
}

export interface ProjectDocument {
  id: string;
  title: string;
  subtitle: string;
  author: string;
  language: string;
  chapters: DocumentChapter[];
  source?: ProjectDocumentSource | null;
  /** FASE C: declarative composition rules (defaults applied when null). */
  rules?: DocumentRules | null;
  /** FASE C: canonical semantic model; null until lazily migrated from HTML. */
  documentModel?: SemanticDocument | null;
  /** FASE C: digital product metadata (ISBN, description, keywords…). */
  metadata?: DocumentMetadata | null;
  /** F3: per-block content provenance (blockId → human|ai governance map). */
  provenance?: ProvenanceMap | null;
}

/** FASE C: partial update of rules / semantic model / product metadata. */
export interface UpdateDocumentExtrasInput {
  rules?: DocumentRules | null;
  documentModel?: SemanticDocument | null;
  metadata?: DocumentMetadata | null;
  /** F3: provenance map update (AI accept / human model save). */
  provenance?: ProvenanceMap | null;
}

export interface CoverDesign {
  id: string;
  title: string;
  subtitle: string;
  palette: 'obsidian' | 'teal' | 'sand';
  backgroundImageUrl: string | null;
  thumbnailUrl: string | null;
  layout?: 'centered' | 'top' | 'bottom' | 'overlay-centered' | 'overlay-bottom' | 'image-only' | 'minimalist';
  fontFamily?: string | null;
  accentColor?: string | null;
  renderedImageUrl?: string | null;
  showSubtitle?: boolean;
  surfaceState?: SurfaceState | null;
}

export interface BackCoverDesign {
  id: string;
  title: string;
  body: string;
  authorBio: string;
  accentColor: string | null;
  backgroundImageUrl: string | null;
  renderedImageUrl: string | null;
  surfaceState?: SurfaceState | null;
}

export type ProjectAssetUsage =
  | 'source-document'
  | 'cover-background'
  | 'cover-thumbnail'
  | 'cover-render'
  | 'back-cover-render';

export interface ProjectAsset {
  id: string;
  kind: 'document' | 'image' | 'render';
  usage: ProjectAssetUsage;
  blobUrl: string | null;
  fileName: string;
  mimeType: string;
  createdAt: string;
}

export interface ProjectRecord {
  id: string;
  userId: string;
  workspaceId: string | null;
  slug: string;
  title: string;
  status: ProjectStatus;
  workflowStep?: number;
  /** F2: optional BrandProfile applied to exports as templateOverrides (G1). */
  brandProfileId?: string | null;
  /** F2: product template that seeded the project (drives the launch pack). */
  templateId?: string | null;
  createdAt: string;
  updatedAt: string;
  document: ProjectDocument;
  cover: CoverDesign;
  backCover: BackCoverDesign;
  assets: ProjectAsset[];
}

/** Canonical mode check — undefined `source.mode` behaves as 'editable'. */
export function isFixedPdfProject(project: ProjectRecord): boolean {
  return project.document.source?.mode === 'fixed-pdf';
}

export function isEditableProject(project: ProjectRecord): boolean {
  return !isFixedPdfProject(project);
}

export interface ProjectSummary {
  id: string;
  slug: string;
  title: string;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
  documentSubtitle: string;
  documentAuthor: string;
  documentTitle: string;
  pageCount: number | null;
  chapterCount: number;
  coverPalette: CoverDesign['palette'];
}

/** M4 — heuristic confidence for a detected import field (no AI involved). */
export type ImportFieldConfidence = 'high' | 'medium' | 'low';

/** M5 — manuscript genre preset, used only to adjust chapter-splitting granularity. */
export type ManuscriptType = 'essay' | 'guide' | 'novel' | 'non-fiction';

export interface ImportedDocumentSeed {
  title: string;
  subtitle: string;
  author: string;
  sourcePageCount?: number;
  warnings?: string[];
  /** M4 — per-field detection confidence (title/author/chapters). */
  confidence?: {
    title: ImportFieldConfidence;
    author: ImportFieldConfidence;
    chapters: ImportFieldConfidence;
  };
  /** M5 — effective manuscript type (override if provided, else auto-detected). */
  manuscriptType?: ManuscriptType;
  /** M5 — auto-detected manuscript type, independent of any override. */
  detectedManuscriptType?: ManuscriptType;
  detectedOutline?: EditorialMapEntry[];
  /** Fixed-PDF document mode: undefined behaves as 'editable'. */
  mode?: DocumentMode;
  /** Fixed-PDF document mode: Blob URL of the uploaded original. */
  sourceBlobUrl?: string | null;
  /** Fixed-PDF document mode: SHA-256 of the uploaded original bytes. */
  sourceSha256?: string;
  /** Fixed-PDF document mode: byte size of the uploaded original. */
  sourceSizeBytes?: number;
  /** Fixed-PDF document mode: whether the Blob store honored private access. */
  sourceAccessLevel?: SourceDocumentAccessLevel;
  chapterTitle: string;
  blocks: Array<{
    type: DocumentBlockType;
    content: string;
  }>;
  chapters?: Array<{
    title: string;
    blocks: Array<{
      type: DocumentBlockType;
      content: string;
    }>;
  }>;
  sourceFileName: string;
  sourceMimeType: string;
}

export interface CreateProjectInput {
  title: string;
  importedDocument?: ImportedDocumentSeed | null;
  /** F2: product template id; seeds structure + rules when no document is imported. */
  templateId?: string | null;
}

export interface UpdateDocumentInput {
  title: string;
  subtitle: string;
  author: string;
  chapterTitle: string;
  /** Target chapter id. Defaults to first chapter when omitted. */
  chapterId?: string;
  blocks: Array<{
    id: string;
    content: string;
  }>;
}

export interface UpdateCoverInput {
  title: string;
  subtitle: string;
  palette: CoverDesign['palette'];
  backgroundImageUrl: string | null;
  thumbnailUrl: string | null;
  layout?: CoverDesign['layout'];
  fontFamily?: string | null;
  accentColor?: string | null;
  showSubtitle?: boolean;
  surfaceState?: SurfaceState | null;
}

export interface UpdateBackCoverInput {
  title: string;
  body: string;
  authorBio: string;
  accentColor: string | null;
  backgroundImageUrl: string | null;
  surfaceState?: SurfaceState | null;
}
