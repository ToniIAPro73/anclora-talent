import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { DocumentStatsCard } from './DocumentStatsCard';
import type { ProjectDocument, ProjectRecord } from '@/lib/projects/types';

function baseDocument(overrides: Partial<ProjectDocument> = {}): ProjectDocument {
  return {
    id: 'doc-1',
    title: 'Libro',
    subtitle: '',
    author: '',
    language: 'es',
    chapters: [
      {
        id: 'ch-1',
        order: 0,
        title: 'Capítulo 1',
        blocks: [{ id: 'b-1', type: 'paragraph', order: 0, content: 'Contenido de prueba.' }],
      },
    ],
    ...overrides,
  };
}

function baseProject(document: ProjectDocument): ProjectRecord {
  return {
    id: 'p-1',
    userId: 'u-1',
    workspaceId: null,
    slug: 'libro',
    title: 'Libro',
    status: 'draft',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    document,
    cover: {
      id: 'c-1',
      title: 'Libro',
      subtitle: '',
      palette: 'obsidian',
      backgroundImageUrl: null,
      thumbnailUrl: null,
    },
    backCover: {
      id: 'bc-1',
      title: 'Libro',
      body: '',
      authorBio: '',
      accentColor: null,
      backgroundImageUrl: null,
      renderedImageUrl: null,
    },
    assets: [],
  };
}

describe('DocumentStatsCard', () => {
  test('regression: editable project shows the full chapter/word/character breakdown', () => {
    const document = baseDocument();
    render(<DocumentStatsCard document={document} project={baseProject(document)} />);

    expect(screen.getByText('Capítulo')).toBeInTheDocument();
    expect(screen.getByText('Palabras')).toBeInTheDocument();
    expect(screen.queryByTestId('document-stats-fixed-pdf')).not.toBeInTheDocument();
  });

  test('fixed-pdf project shows only the real page count, never a misleading chapter/word count', () => {
    const document = baseDocument({
      chapters: [],
      source: {
        fileName: 'El_Plan_de_Escape_EBOOK.pdf',
        mimeType: 'application/pdf',
        importedAt: '2026-01-01T00:00:00Z',
        mode: 'fixed-pdf',
        pageCount: 122,
      },
    });

    render(<DocumentStatsCard document={document} project={baseProject(document)} />);

    const panel = screen.getByTestId('document-stats-fixed-pdf');
    expect(panel).toHaveTextContent('122');
    expect(panel).toHaveTextContent('Páginas (PDF original)');
    expect(screen.queryByText('Capítulos')).not.toBeInTheDocument();
    expect(screen.queryByText('Palabras')).not.toBeInTheDocument();
  });
});
