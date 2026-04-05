import { render, screen } from '@testing-library/react';
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
  test('renders imported HTML blocks with headings and list items', () => {
    render(<PreviewCanvas copy={copy} project={makeProject()} />);

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
