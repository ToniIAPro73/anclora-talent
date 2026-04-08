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

export interface ProjectDocumentSource {
  fileName: string;
  mimeType: string;
  importedAt: string;
  pageCount?: number;
  outline?: EditorialMapEntry[];
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
}

export interface BackCoverDesign {
  id: string;
  title: string;
  body: string;
  authorBio: string;
  accentColor: string | null;
  backgroundImageUrl: string | null;
  renderedImageUrl: string | null;
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
  createdAt: string;
  updatedAt: string;
  document: ProjectDocument;
  cover: CoverDesign;
  backCover: BackCoverDesign;
  assets: ProjectAsset[];
}

export interface ProjectSummary {
  id: string;
  slug: string;
  title: string;
  status: ProjectStatus;
  updatedAt: string;
  documentTitle: string;
  coverPalette: CoverDesign['palette'];
}

export interface ImportedDocumentSeed {
  title: string;
  subtitle: string;
  author: string;
  sourcePageCount?: number;
  warnings?: string[];
  detectedOutline?: EditorialMapEntry[];
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
}

export interface UpdateBackCoverInput {
  title: string;
  body: string;
  authorBio: string;
  accentColor: string | null;
  backgroundImageUrl: string | null;
}
