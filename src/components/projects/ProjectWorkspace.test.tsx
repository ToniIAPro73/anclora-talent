import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { ProjectWorkspace } from './ProjectWorkspace';
import { resolveLocaleMessages } from '@/lib/i18n/messages';
import type { ProjectRecord } from '@/lib/projects/types';
import { createDefaultSurfaceState } from '@/lib/projects/cover-surface';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}));

vi.mock('@/lib/projects/actions', () => ({
  saveChapterContentAction: vi.fn().mockResolvedValue(undefined),
  saveProjectDocumentAction: vi.fn().mockResolvedValue(undefined),
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

vi.mock('./advanced-cover/AdvancedCoverEditor', () => ({
  AdvancedCoverEditor: ({ project }: { project: ProjectRecord }) => (
    <div data-testid="advanced-cover-editor">{project.cover.title}</div>
  ),
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

  test('preserves the basic cover draft when switching to the advanced cover editor', () => {
    render(<ProjectWorkspace project={makeProject()} copy={copy} />);

    const nextButton = screen.getByText('Siguiente paso');
    fireEvent.click(nextButton);
    fireEvent.click(nextButton);
    fireEvent.click(nextButton);

    fireEvent.change(screen.getByLabelText(copy.coverTitleLabel), {
      target: { value: 'NUNCA MAS EN LA SOMBRA' },
    });

    fireEvent.click(screen.getByText(copy.coverSwitchToAdvanced));

    expect(screen.getByTestId('advanced-cover-editor')).toHaveTextContent('NUNCA MAS EN LA SOMBRA');
  });

  test('basic cover does not reintroduce a removed subtitle', () => {
    const project = makeProject({
      cover: {
        ...makeProject().cover,
        subtitle: 'Subtítulo antiguo',
        showSubtitle: true,
        surfaceState: (() => {
          const state = createDefaultSurfaceState('cover');
          state.fields.title.value = 'Mi Proyecto';
          state.fields.title.visible = true;
          state.fields.subtitle.value = '';
          state.fields.subtitle.visible = false;
          state.fields.author.value = 'Autor Demo';
          state.fields.author.visible = true;
          return state;
        })(),
      },
    });

    render(<ProjectWorkspace project={project} copy={copy} />);

    const nextButton = screen.getByText('Siguiente paso');
    fireEvent.click(nextButton);
    fireEvent.click(nextButton);
    fireEvent.click(nextButton);

    expect(screen.getByLabelText(copy.coverSubtitleLabel)).toHaveValue('');
    expect(screen.queryByTestId('cover-preview-subtitle')).not.toBeInTheDocument();
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
});
