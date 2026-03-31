export type ProjectStatus = 'draft' | 'active' | 'review';

export type DocumentBlock =
  | {
      id: string;
      type: 'heading';
      content: string;
      level: 1 | 2;
    }
  | {
      id: string;
      type: 'paragraph';
      content: string;
    }
  | {
      id: string;
      type: 'quote';
      content: string;
      attribution?: string;
    }
  | {
      id: string;
      type: 'image';
      assetId: string;
      caption: string;
    }
  | {
      id: string;
      type: 'divider';
      label: string;
    };

export interface EditorialChapter {
  id: string;
  title: string;
  order: number;
  blocks: DocumentBlock[];
}

export interface EditorialAsset {
  id: string;
  kind: 'image';
  source: string;
  alt: string;
  width: number;
  height: number;
}

export interface EditorialDocument {
  id: string;
  title: string;
  subtitle: string;
  language: string;
  authors: string[];
  chapters: EditorialChapter[];
  assets: EditorialAsset[];
}

export interface EditorialProject {
  id: string;
  title: string;
  slug: string;
  status: ProjectStatus;
  themeId: string;
  coverTemplate: string;
  document: EditorialDocument;
}

export interface DocumentMetrics {
  chapterCount: number;
  blockCount: number;
  imageCount: number;
  quoteCount: number;
}

export function getDocumentMetrics(document: EditorialDocument): DocumentMetrics {
  const allBlocks = document.chapters.flatMap((chapter) => chapter.blocks);

  return {
    chapterCount: document.chapters.length,
    blockCount: allBlocks.length,
    imageCount: allBlocks.filter((block) => block.type === 'image').length,
    quoteCount: allBlocks.filter((block) => block.type === 'quote').length,
  };
}
