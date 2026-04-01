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

export interface ProjectDocument {
  id: string;
  title: string;
  subtitle: string;
  language: string;
  chapters: DocumentChapter[];
}

export interface CoverDesign {
  id: string;
  title: string;
  subtitle: string;
  palette: 'obsidian' | 'teal' | 'sand';
  backgroundImageUrl: string | null;
  thumbnailUrl: string | null;
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
