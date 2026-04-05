import { render, screen } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { ProjectWorkspace } from './ProjectWorkspace';
import { resolveLocaleMessages } from '@/lib/i18n/messages';
import type { ProjectRecord } from '@/lib/projects/types';

vi.mock('@/lib/projects/actions', () => ({
  saveChapterContentAction: vi.fn().mockResolvedValue(undefined),
  saveProjectDocumentAction: vi.fn().mockResolvedValue(undefined),
  moveChapterAction: vi.fn().mockResolvedValue(undefined),
  deleteChapterAction: vi.fn().mockResolvedValue(undefined),
}));

// Tiptap requires a real browser DOM — stub it out for jsdom
vi.mock('./RichTextEditor', () => ({
  RichTextEditor: ({ defaultContent }: { defaultContent: string }) => (
    <div data-testid="rich-text-editor">{defaultContent}</div>
  ),
}));

const copy = resolveLocaleMessages('es').project;

function makeProject(overrides: Partial<ProjectRecord> = {}): ProjectRecord {
  return {
    id: 'proj-1',
    userId: 'user-1',
    workspaceId: null,
    slug: 'proyecto-1',
    title: 'Mi Proyecto',
    status: 'draft',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    document: {
      id: 'doc-1',
      title: 'Mi Proyecto',
      subtitle: 'Subtítulo del proyecto',
      author: 'Autor Demo',
      language: 'es',
      chapters: [
        {
          id: 'ch-1',
          order: 0,
          title: 'Capítulo 1',
          blocks: [{ id: 'b-1', type: 'paragraph', order: 0, content: 'Primer párrafo.' }],
        },
        {
          id: 'ch-2',
          order: 1,
          title: 'Capítulo 2',
          blocks: [{ id: 'b-2', type: 'paragraph', order: 0, content: 'Segundo párrafo.' }],
        },
      ],
    },
    cover: {
      id: 'cov-1',
      title: 'Mi Proyecto',
      subtitle: 'Subtítulo',
      palette: 'obsidian',
      backgroundImageUrl: null,
      thumbnailUrl: null,
    },
    backCover: {
      id: 'bc-1',
      title: 'Mi Proyecto',
      body: '',
      authorBio: '',
      accentColor: null,
      backgroundImageUrl: null,
      renderedImageUrl: null,
    },
    assets: [],
    ...overrides,
  };
}

describe('ProjectWorkspace', () => {
  test('renders the project title in the header', () => {
    render(<ProjectWorkspace project={makeProject()} copy={copy} />);
    expect(screen.getByText('Mi Proyecto')).toBeInTheDocument();
  });

  test('renders the chapter organizer with all chapter titles', () => {
    render(<ProjectWorkspace project={makeProject()} copy={copy} />);
    expect(screen.getByRole('button', { name: /Capítulo 1/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Capítulo 2/ })).toBeInTheDocument();
  });

  test('shows first chapter content in the editor by default', () => {
    render(<ProjectWorkspace project={makeProject()} copy={copy} />);
    // RichTextEditor mock renders defaultContent
    expect(screen.getByTestId('rich-text-editor')).toHaveTextContent('<p>Primer párrafo.</p>');
  });

  test('switches to the second chapter when clicked', () => {
    render(<ProjectWorkspace project={makeProject()} copy={copy} />);

    fireEvent.click(screen.getByRole('button', { name: /Capítulo 2/ }));

    expect(screen.getByTestId('rich-text-editor')).toHaveTextContent('<p>Segundo párrafo.</p>');
  });

  test('shows links to preview and cover', () => {
    render(<ProjectWorkspace project={makeProject()} copy={copy} />);
    expect(screen.getByRole('link', { name: copy.editorOpenPreview })).toHaveAttribute(
      'href',
      '/projects/proj-1/preview',
    );
    expect(screen.getByRole('link', { name: copy.editorOpenCover })).toHaveAttribute(
      'href',
      '/projects/proj-1/cover',
    );
  });

  test('renders chapter management controls in the organizer', () => {
    render(<ProjectWorkspace project={makeProject()} copy={copy} />);

    expect(screen.getByTestId('chapter-move-up-button-1')).toBeInTheDocument();
    expect(screen.getByTestId('chapter-move-down-button-1')).toBeInTheDocument();
    expect(screen.getByTestId('chapter-delete-button-1')).toBeInTheDocument();
  });
});
