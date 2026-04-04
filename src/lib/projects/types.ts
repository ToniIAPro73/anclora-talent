export type ProjectStatus = 'draft' | 'active';

export type DocumentBlockType = 'heading' | 'paragraph' | 'quote';

export interface DocumentBlock {
  id: string;
  type: DocumentBlockType;
  order: number;
  content: string;
}

export interface DocumentChapter {
  id: string;
  order: number;
  title: string;
  blocks: DocumentBlock[];
}

export interface ProjectDocumentSource {
  fileName: string;
  mimeType: string;
  importedAt: string;
}

export interface ProjectDocument {
  id: string;
  title: string;
  subtitle: string;
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
  layout?: 'centered' | 'top' | 'bottom' | 'split';
  fontFamily?: string | null;
  accentColor?: string | null;
  renderedImageUrl?: string | null;
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
  chapterTitle: string;
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
}
