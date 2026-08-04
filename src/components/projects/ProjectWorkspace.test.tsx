import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { ProjectWorkspace } from './ProjectWorkspace';
import { resolveLocaleMessages } from '@/lib/i18n/messages';
import type { ProjectRecord } from '@/lib/projects/types';
import { createDefaultSurfaceState } from '@/lib/projects/cover-surface';
import { saveProjectWorkflowStepAction, saveChapterContentAction, syncProjectPaginationAction } from '@/lib/projects/actions';
import {
  clearLastChapterSave,
  recordLastChapterSave,
} from './advanced-chapter-editor/last-chapter-save';

vi.mock('server-only', () => ({}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}));

vi.mock('@/lib/projects/actions', () => ({
  saveChapterContentAction: vi.fn().mockResolvedValue(undefined),
  saveProjectDocumentAction: vi.fn().mockResolvedValue(undefined),
  saveProjectWorkflowStepAction: vi.fn().mockResolvedValue(undefined),
  syncProjectPaginationAction: vi.fn().mockResolvedValue({ status: 'updated' }),
  moveChapterAction: vi.fn().mockResolvedValue(undefined),
  deleteChapterAction: vi.fn().mockResolvedValue(undefined),
  saveProjectCoverAction: vi.fn().mockResolvedValue(undefined),
  saveBackCoverAction: vi.fn().mockResolvedValue(undefined),
}));

// Tiptap requires a real browser DOM — stub it out for jsdom
vi.mock('./RichTextEditor', () => ({
  RichTextEditor: ({ defaultContent }: { defaultContent: string }) => (
    <div data-testid="rich-text-editor">{defaultContent}</div>
  ),
}));

vi.mock('./cover-studio/CoverStudio', () => ({
  CoverStudio: ({ surface }: { surface: string }) => (
    <div data-testid={`cover-studio-${surface}`} />
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
    workflowStep: 1,
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
      showSubtitle: true,
      surfaceState: (() => {
        const state = createDefaultSurfaceState('cover');
        state.fields.title.value = 'Mi Proyecto';
        state.fields.title.visible = true;
        state.fields.subtitle.value = 'Subtítulo';
        state.fields.subtitle.visible = true;
        state.fields.author.value = 'Autor Demo';
        state.fields.author.visible = true;
        return state;
      })(),
    },
    backCover: {
      id: 'bc-1',
      title: 'Mi Proyecto',
      body: '',
      authorBio: '',
      accentColor: null,
      backgroundImageUrl: null,
      renderedImageUrl: null,
      surfaceState: (() => {
        const state = createDefaultSurfaceState('back-cover');
        state.fields.title.value = 'Mi Proyecto';
        state.fields.title.visible = true;
        state.fields.body.value = '';
        state.fields.body.visible = false;
        state.fields.authorBio.value = '';
        state.fields.authorBio.visible = false;
        return state;
      })(),
    },
    assets: [],
    ...overrides,
  };
}

describe('ProjectWorkspace', () => {
  beforeEach(() => {
    window.localStorage.clear();
    clearLastChapterSave();
    vi.mocked(syncProjectPaginationAction).mockResolvedValue({ status: 'updated' });
  });

  test('renders the project title in the header', () => {
    render(<ProjectWorkspace project={makeProject()} copy={copy} />);
    expect(screen.getByText('Mi Proyecto')).toBeInTheDocument();
  });

  test('shows document metadata form by default in Step 1', () => {
    render(<ProjectWorkspace project={makeProject()} copy={copy} />);
    expect(screen.getByTestId('project-metadata-form')).toBeInTheDocument();
    expect(screen.getByTestId('project-document-title-input')).toHaveValue('Mi Proyecto');
  });

  test('restores the persisted workflow step and marks previous steps as completed', () => {
    const { container } = render(
      <ProjectWorkspace
        project={makeProject({ workflowStep: 7 })}
        copy={copy}
      />,
    );

    expect(screen.getByText('Colaborar')).toBeInTheDocument();
    expect(screen.getByText('de 9 pasos')).toBeInTheDocument();
    expect(screen.getAllByText('7').length).toBeGreaterThan(0);

    const activeStepButton = container.querySelector('[aria-current="step"]');
    expect(activeStepButton).not.toBeNull();

    const stepper = screen.getByRole('navigation', { name: 'Progress' });
    expect(stepper.querySelectorAll('svg.lucide-check')).toHaveLength(6);
  });

  test('prioritizes the persisted database workflow step over local storage', () => {
    window.localStorage.setItem(
      'anclora-project-workflow-step',
      JSON.stringify({
        'proj-1': 2,
      }),
    );

    render(<ProjectWorkspace project={makeProject({ workflowStep: 5 })} copy={copy} />);

    expect(screen.getByText('de 9 pasos')).toBeInTheDocument();
    expect(screen.getAllByText('5').length).toBeGreaterThan(0);
    expect(screen.getAllByText(copy.stepBackCover).length).toBeGreaterThan(0);
  });

  test('persists the workflow step when navigating', async () => {
    render(<ProjectWorkspace project={makeProject()} copy={copy} />);

    fireEvent.click(screen.getByText('Siguiente paso'));

    expect(saveProjectWorkflowStepAction).toHaveBeenCalledTimes(1);
  });

  test('renders chapter organizer when moving to Step 2', () => {
    render(<ProjectWorkspace project={makeProject()} copy={copy} />);
    
    // Navigate to step 2 (Capítulos)
    const nextButton = screen.getByText('Siguiente paso');
    fireEvent.click(nextButton);

    expect(screen.getByText('Capítulo 1')).toBeInTheDocument();
    expect(screen.getByText('Capítulo 2')).toBeInTheDocument();
  });

  test('shows the pagination sync action in Step 2 and updates its state when clicked', () => {
    render(<ProjectWorkspace project={makeProject()} copy={copy} />);

    fireEvent.click(screen.getByText('Siguiente paso'));

    const syncButton = screen.getByTestId('sync-page-numbers-button');

    expect(syncButton).toBeInTheDocument();
    expect(syncButton).toHaveTextContent(copy.chapterSyncPageNumbers);
    expect(syncButton).toHaveAttribute('data-sync-state', 'idle');

    fireEvent.click(syncButton);

    return waitFor(() => {
      expect(syncProjectPaginationAction).toHaveBeenCalledTimes(1);
      expect(syncButton).toHaveAttribute('data-sync-state', 'synced');
      expect(screen.getByTestId('pagination-sync-feedback-done')).toHaveTextContent(
        copy.chapterSyncPageNumbersDone,
      );
    });
  });

  test('shows a warning when pagination sync cannot find an index chapter', () => {
    vi.mocked(syncProjectPaginationAction).mockResolvedValue({ status: 'missing-index' });

    render(<ProjectWorkspace project={makeProject()} copy={copy} />);

    fireEvent.click(screen.getByText('Siguiente paso'));
    fireEvent.click(screen.getByTestId('sync-page-numbers-button'));

    return waitFor(() => {
      expect(screen.getByTestId('pagination-sync-feedback-missing-index')).toHaveTextContent(
        copy.chapterSyncPageNumbersMissingIndex,
      );
    });
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

  test('renders the unified cover studio in Step 4', () => {
    render(<ProjectWorkspace project={makeProject()} copy={copy} />);

    const nextButton = screen.getByText('Siguiente paso');
    // 1 -> 2
    fireEvent.click(nextButton);
    // 2 -> 3
    fireEvent.click(nextButton);
    // 3 -> 4
    fireEvent.click(nextButton);

    expect(screen.getByTestId('cover-studio-cover')).toBeInTheDocument();
  });

  test('renders the same unified studio for the back cover in Step 5', () => {
    render(<ProjectWorkspace project={makeProject()} copy={copy} />);

    const nextButton = screen.getByText('Siguiente paso');
    fireEvent.click(nextButton);
    fireEvent.click(nextButton);
    fireEvent.click(nextButton);
    fireEvent.click(nextButton);

    expect(screen.getByTestId('cover-studio-back-cover')).toBeInTheDocument();
  });

  test('template step shows separate cover and back cover catalogs', () => {
    render(<ProjectWorkspace project={makeProject()} copy={copy} />);

    const nextButton = screen.getByText('Siguiente paso');
    fireEvent.click(nextButton);
    fireEvent.click(nextButton);

    expect(screen.getByText('Plantillas de portada')).toBeInTheDocument();
    expect(screen.getByText('Plantillas de contraportada')).toBeInTheDocument();
    expect(screen.getByText('Ficcion literaria')).toBeInTheDocument();
    expect(screen.getByText('Workbook / guia practica')).toBeInTheDocument();
    expect(screen.getByText('Statement back')).toBeInTheDocument();
  });

  test('offers reverting the recomposition of the last chapter save (F0.3)', async () => {
    recordLastChapterSave({
      projectId: 'proj-1',
      chapterId: 'ch-2',
      chapterTitle: 'Capítulo 2',
      previousHtml: '<p>Contenido previo</p>',
    });

    render(<ProjectWorkspace project={makeProject()} copy={copy} />);

    const banner = screen.getByTestId('document-health-revert');
    expect(banner).toHaveTextContent('Capítulo 2');

    fireEvent.click(screen.getByRole('button', { name: 'Revertir' }));

    await waitFor(() => expect(vi.mocked(saveChapterContentAction)).toHaveBeenCalledTimes(1));
    const formData = vi.mocked(saveChapterContentAction).mock.calls[0][0] as FormData;
    expect(formData.get('projectId')).toBe('proj-1');
    expect(formData.get('chapterId')).toBe('ch-2');
    expect(formData.get('chapterTitle')).toBe('Capítulo 2');
    expect(formData.get('htmlContent')).toBe('<p>Contenido previo</p>');

    // The snapshot is consumed: the banner disappears after the revert.
    await waitFor(() =>
      expect(screen.queryByTestId('document-health-revert')).not.toBeInTheDocument(),
    );
  });

  test('hides the revert banner when there is no revertible save', () => {
    render(<ProjectWorkspace project={makeProject()} copy={copy} />);
    expect(screen.queryByTestId('document-health-revert')).not.toBeInTheDocument();
  });
});
