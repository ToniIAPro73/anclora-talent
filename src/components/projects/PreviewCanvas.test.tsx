import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import { PreviewCanvas } from './PreviewCanvas';
import { resolveLocaleMessages } from '@/lib/i18n/messages';
import type { ProjectRecord } from '@/lib/projects/types';

const copy = resolveLocaleMessages('es').project;

function makeProject(): ProjectRecord {
  return {
    id: 'proj-preview-1',
    userId: 'user-1',
    workspaceId: null,
    slug: 'preview-1',
    title: 'Nunca más en la sombra',
    status: 'draft',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    document: {
      id: 'doc-1',
      title: 'Nunca más en la sombra',
      subtitle: 'Guía práctica de presencia editorial',
      author: 'Antonio Ballesteros Alonso',
      language: 'es',
      chapters: [
        {
          id: 'ch-1',
          order: 0,
          title: 'Introducción',
          blocks: [
            {
              id: 'b-1',
              type: 'paragraph',
              order: 0,
              content:
                '<h2>Contexto</h2><p>Este texto mantiene jerarquía editorial.</p><ul><li>Punto 1</li><li>Punto 2</li></ul>',
            },
          ],
        },
      ],
      source: {
        fileName: 'nunca.docx',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        importedAt: '2026-01-01T00:00:00.000Z',
      },
    },
    cover: {
      id: 'cover-1',
      title: 'Nunca más en la sombra',
      subtitle: 'Guía práctica',
      palette: 'obsidian',
      backgroundImageUrl: null,
      thumbnailUrl: null,
    },
    backCover: {
      id: 'back-cover-1',
      title: 'Nunca más en la sombra',
      body: '',
      authorBio: '',
      accentColor: null,
      backgroundImageUrl: null,
      renderedImageUrl: null,
    },
    assets: [],
  };
}

describe('PreviewCanvas', () => {
  test('renders a dedicated title page first for imported documents', () => {
    render(<PreviewCanvas copy={copy} project={makeProject()} />);

    expect(screen.getAllByText('Nunca más en la sombra').length).toBeGreaterThan(0);
    expect(screen.queryByText('Contexto')).not.toBeInTheDocument();
  });

  test('renders imported HTML blocks with headings and list items after advancing page', () => {
    render(<PreviewCanvas copy={copy} project={makeProject()} />);

    fireEvent.click(screen.getByTestId('preview-next-page-button'));

    expect(screen.getByText('Contexto')).toBeInTheDocument();
    expect(screen.getByText('Punto 1')).toBeInTheDocument();
    expect(screen.getByText('Punto 2')).toBeInTheDocument();
  });

  test('renders preview controls with stable data-testid attributes', () => {
    render(<PreviewCanvas copy={copy} project={makeProject()} />);

    expect(screen.getByTestId('preview-scroll-view-button')).toBeInTheDocument();
    expect(screen.getByTestId('preview-book-view-button')).toBeInTheDocument();
    expect(screen.getByTestId('preview-cover-panel')).toBeInTheDocument();
  });
});
