import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { ProjectWorkspace } from './ProjectWorkspace';
import { resolveLocaleMessages } from '@/lib/i18n/messages';
import type { ProjectRecord } from '@/lib/projects/types';

vi.mock('@/lib/projects/actions', () => ({
  saveChapterContentAction: vi.fn().mockResolvedValue(undefined),
  saveProjectDocumentAction: vi.fn().mockResolvedValue(undefined),
  moveChapterAction: vi.fn().mockResolvedValue(undefined),
  deleteChapterAction: vi.fn().mockResolvedValue(undefined),
  saveProjectCoverAction: vi.fn().mockResolvedValue(undefined),
}));

// Tiptap requires a real browser DOM — stub it out for jsdom
vi.mock('./RichTextEditor', () => ({
  RichTextEditor: ({ defaultContent }: { defaultContent: string }) => (
    <div data-testid="rich-text-editor">{defaultContent}</div>
  ),
}));

vi.mock('./advanced-cover/AdvancedCoverEditor', () => ({
  AdvancedCoverEditor: () => <div data-testid="advanced-cover-editor" />,
}));

vi.mock('./advanced-back-cover/AdvancedBackCoverEditor', () => ({
  AdvancedBackCoverEditor: () => <div data-testid="advanced-back-cover-editor" />,
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

  test('shows first chapter content in the editor by default (Step 1)', () => {
    render(<ProjectWorkspace project={makeProject()} copy={copy} />);
    expect(screen.getByTestId('rich-text-editor')).toHaveTextContent('<p>Primer párrafo.</p>');
  });

  test('renders chapter organizer when moving to Step 2', () => {
    render(<ProjectWorkspace project={makeProject()} copy={copy} />);
    
    // Navigate to step 2 (Capítulos)
    const nextButton = screen.getByText('Siguiente paso');
    fireEvent.click(nextButton);

    expect(screen.getByText('Capítulo 1')).toBeInTheDocument();
    expect(screen.getByText('Capítulo 2')).toBeInTheDocument();
  });

  test('navigates through steps', () => {
    render(<ProjectWorkspace project={makeProject()} copy={copy} />);
    
    const nextButton = screen.getByText('Siguiente paso');
    
    // Step 1 -> 2
    fireEvent.click(nextButton);
    expect(screen.getByText('de 9 pasos')).toBeInTheDocument();
    expect(screen.getAllByText('2').length).toBeGreaterThan(0);
    
    // Step 2 -> 3
    fireEvent.click(nextButton);
    expect(screen.getAllByText('3').length).toBeGreaterThan(0);
  });

  test('can switch to advanced cover in Step 4', () => {
    render(<ProjectWorkspace project={makeProject()} copy={copy} />);
    
    const nextButton = screen.getByText('Siguiente paso');
    // 1 -> 2
    fireEvent.click(nextButton);
    // 2 -> 3
    fireEvent.click(nextButton);
    // 3 -> 4
    fireEvent.click(nextButton);

    const advancedButton = screen.getByText(copy.coverSwitchToAdvanced);
    fireEvent.click(advancedButton);

    expect(screen.getByTestId('advanced-cover-editor')).toBeInTheDocument();
  });
});
