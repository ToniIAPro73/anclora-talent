import { fireEvent, render, screen, within } from '@testing-library/react';
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
        outline: [
          { title: 'Introducción', level: 1, origin: 'detected' },
          { title: 'Contexto', level: 2, origin: 'detected' },
        ],
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
  test('renders a launcher button before opening the full preview modal', () => {
    render(<PreviewCanvas copy={copy} project={makeProject()} />);

    expect(screen.getByRole('button', { name: /open full preview/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: copy.previewModalSpreadView })).not.toBeInTheDocument();
  });

  test('opens the full preview modal from the launcher button', () => {
    render(<PreviewCanvas copy={copy} project={makeProject()} />);

    fireEvent.click(screen.getByRole('button', { name: /open full preview/i }));

    expect(screen.getByRole('button', { name: copy.previewModalSpreadView })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: copy.previewModalLaptop })).toBeInTheDocument();
    expect(screen.getByTestId('preview-modal-stage')).toBeInTheDocument();
    expect(screen.getByTestId('preview-modal-footer')).toBeInTheDocument();
  });

  test('shows imported chapter content inside the opened modal when navigating past the cover', () => {
    render(<PreviewCanvas copy={copy} project={makeProject()} />);

    fireEvent.click(screen.getByRole('button', { name: /open full preview/i }));
    fireEvent.click(screen.getByRole('button', { name: copy.previewModalNext }));

    const previewStage = screen.getByTestId('preview-modal-stage');
    expect(previewStage).toBeInTheDocument();
    expect(within(previewStage).getByText('Contexto')).toBeInTheDocument();
    expect(within(previewStage).getByText('Punto 1')).toBeInTheDocument();
  });

  test('closes the full preview modal and returns to the launcher button', () => {
    render(<PreviewCanvas copy={copy} project={makeProject()} />);

    fireEvent.click(screen.getByRole('button', { name: /open full preview/i }));
    fireEvent.click(screen.getByRole('button', { name: copy.previewModalClose }));

    expect(screen.getByRole('button', { name: /open full preview/i })).toBeInTheDocument();
    expect(screen.queryByTestId('preview-modal-stage')).not.toBeInTheDocument();
  });
});
