import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { CoverStudio } from './CoverStudio';
import { resolveLocaleMessages } from '@/lib/i18n/messages';
import { createDefaultSurfaceState } from '@/lib/projects/cover-surface';
import type { ProjectRecord } from '@/lib/projects/types';
import {
  renderCoverImageAction,
  saveProjectCoverAction,
} from '@/lib/projects/actions';

const LONG_TITLE = 'NUNCA MÁS EN LA SOMBRA';

vi.mock('server-only', () => ({}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

vi.mock('@/lib/projects/actions', () => ({
  saveProjectCoverAction: vi.fn().mockResolvedValue(undefined),
  saveBackCoverAction: vi.fn().mockResolvedValue(undefined),
  renderCoverImageAction: vi.fn().mockResolvedValue(undefined),
  renderBackCoverImageAction: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('html-to-image', () => ({
  toPng: vi.fn().mockResolvedValue('data:image/png;base64,AAA'),
}));

vi.mock('@/hooks/use-google-fonts', () => ({
  useGoogleFonts: () => ({ fonts: [], loadFont: vi.fn() }),
}));

const copy = resolveLocaleMessages('es').project;

function makeProject(overrides: Partial<ProjectRecord> = {}): ProjectRecord {
  return {
    id: 'proj-1',
    userId: 'user-1',
    workspaceId: null,
    slug: 'proyecto-1',
    title: LONG_TITLE,
    status: 'draft',
    workflowStep: 4,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    document: {
      id: 'doc-1',
      title: LONG_TITLE,
      subtitle: 'Subtítulo del proyecto',
      author: 'Autor Demo',
      language: 'es',
      chapters: [
        {
          id: 'ch-1',
          order: 0,
          title: 'Capítulo 1',
          blocks: [{ id: 'b-1', type: 'paragraph', order: 0, content: 'Párrafo.' }],
        },
      ],
    },
    cover: {
      id: 'cov-1',
      title: LONG_TITLE,
      subtitle: 'Subtítulo',
      palette: 'obsidian',
      backgroundImageUrl: null,
      thumbnailUrl: null,
      showSubtitle: true,
      surfaceState: (() => {
        const state = createDefaultSurfaceState('cover');
        state.fields.title!.value = LONG_TITLE;
        state.fields.title!.visible = true;
        state.fields.subtitle!.value = 'Subtítulo';
        state.fields.subtitle!.visible = true;
        state.fields.author!.value = 'Autor Demo';
        state.fields.author!.visible = true;
        return state;
      })(),
    },
    backCover: {
      id: 'bc-1',
      title: 'Sobre el libro',
      body: 'Un cuerpo de contraportada suficientemente largo para comprobar el ajuste de línea completo.',
      authorBio: 'Bio del autor.',
      accentColor: null,
      backgroundImageUrl: null,
      renderedImageUrl: null,
      surfaceState: (() => {
        const state = createDefaultSurfaceState('back-cover');
        state.fields.title!.value = 'Sobre el libro';
        state.fields.title!.visible = true;
        state.fields.body!.value =
          'Un cuerpo de contraportada suficientemente largo para comprobar el ajuste de línea completo.';
        state.fields.body!.visible = true;
        state.fields.authorBio!.value = 'Bio del autor.';
        state.fields.authorBio!.visible = true;
        return state;
      })(),
    },
    assets: [],
    ...overrides,
  };
}

describe('CoverStudio', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders the full long title on the DOM canvas without clipping constraints', () => {
    render(<CoverStudio surface="cover" project={makeProject()} copy={copy} />);

    const titleNode = screen.getByTestId('cover-layer-title');
    // Regression gate (unit level): the whole text is in the DOM...
    expect(titleNode.textContent).toBe(LONG_TITLE);
    // ...and the layer styles can never clip it: wraps inside its width,
    // grows vertically, no hidden overflow, no fixed height.
    expect(titleNode.style.whiteSpace).toBe('pre-wrap');
    expect(titleNode.style.overflow).toBe('visible');
    expect(titleNode.style.height).toBe('');
    expect(titleNode.style.maxHeight).toBe('');
    expect(titleNode.style.width).not.toBe('');
  });

  test('renders the full back-cover body text with wrapping styles', () => {
    const project = makeProject();
    render(<CoverStudio surface="back-cover" project={project} copy={copy} />);

    const bodyNode = screen.getByTestId('back-cover-layer-body');
    expect(bodyNode.textContent).toBe(project.backCover.body);
    expect(bodyNode.style.whiteSpace).toBe('pre-wrap');
    expect(bodyNode.style.overflow).toBe('visible');
  });

  test('simple mode edits update the canvas layer in place', () => {
    render(<CoverStudio surface="cover" project={makeProject()} copy={copy} />);

    fireEvent.change(screen.getByLabelText(copy.coverTitleLabel), {
      target: { value: 'OTRO TÍTULO LARGO COMPLETO' },
    });

    expect(screen.getByTestId('cover-layer-title').textContent).toBe(
      'OTRO TÍTULO LARGO COMPLETO',
    );
  });

  test('does not reintroduce a removed subtitle from document metadata', () => {
    const project = makeProject({
      cover: {
        ...makeProject().cover,
        subtitle: 'Subtítulo antiguo',
        showSubtitle: true,
        surfaceState: (() => {
          const state = createDefaultSurfaceState('cover');
          state.fields.title!.value = LONG_TITLE;
          state.fields.title!.visible = true;
          state.fields.subtitle!.value = '';
          state.fields.subtitle!.visible = false;
          state.fields.author!.value = 'Autor Demo';
          state.fields.author!.visible = true;
          return state;
        })(),
      },
    });

    render(<CoverStudio surface="cover" project={project} copy={copy} />);

    expect(screen.getByLabelText(copy.coverSubtitleLabel)).toHaveValue('');
    expect(screen.queryByTestId('cover-layer-subtitle')).not.toBeInTheDocument();
  });

  test('applying a template updates the layer typography on the canvas', () => {
    render(<CoverStudio surface="cover" project={makeProject()} copy={copy} />);

    fireEvent.change(screen.getByLabelText(copy.coverStudioTemplateLabel), {
      target: { value: 'fiction-cover' },
    });

    const titleNode = screen.getByTestId('cover-layer-title');
    expect(titleNode.style.fontFamily).toContain('Cormorant Garamond');
  });

  test('mode toggle switches between simple and advanced with the same state', () => {
    render(<CoverStudio surface="cover" project={makeProject()} copy={copy} />);

    // The project has no persisted custom layers -> starts in simple mode.
    expect(screen.getByLabelText(copy.coverTitleLabel)).toBeInTheDocument();
    expect(screen.getByTestId('cover-layer-title').textContent).toBe(LONG_TITLE);

    fireEvent.click(screen.getByTestId('cover-studio-mode-toggle-cover'));
    // Advanced mode: guided inputs disappear, canvas keeps the same text.
    expect(screen.queryByLabelText(copy.coverTitleLabel)).not.toBeInTheDocument();
    expect(screen.getByTestId('cover-layer-title').textContent).toBe(LONG_TITLE);

    fireEvent.click(screen.getByTestId('cover-studio-mode-toggle-cover'));
    expect(screen.getByLabelText(copy.coverTitleLabel)).toBeInTheDocument();
    expect(screen.getByTestId('cover-layer-title').textContent).toBe(LONG_TITLE);
  });

  test('advanced mode selects a layer and shows its inspector', () => {
    render(<CoverStudio surface="cover" project={makeProject()} copy={copy} />);

    fireEvent.click(screen.getByTestId('cover-studio-mode-toggle-cover'));
    fireEvent.pointerDown(screen.getByTestId('cover-layer-title'));

    expect(screen.getByTestId('inspector-title')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(copy.coverStudioContentLabel), {
      target: { value: 'TÍTULO EDITADO DESDE EL INSPECTOR' },
    });

    expect(screen.getByTestId('cover-layer-title').textContent).toBe(
      'TÍTULO EDITADO DESDE EL INSPECTOR',
    );
  });

  test('save persists the surface state with the full title and renders the DOM node', async () => {
    render(<CoverStudio surface="cover" project={makeProject()} copy={copy} />);

    fireEvent.click(screen.getByText(copy.coverStudioSaveDesign));

    await waitFor(() => {
      expect(saveProjectCoverAction).toHaveBeenCalledTimes(1);
    });

    const formData = vi.mocked(saveProjectCoverAction).mock.calls[0][0];
    expect(formData.get('title')).toBe(LONG_TITLE);
    const persisted = JSON.parse(String(formData.get('surfaceState')));
    expect(persisted.fields.title.value).toBe(LONG_TITLE);

    await waitFor(() => {
      expect(renderCoverImageAction).toHaveBeenCalledTimes(1);
    });
    const renderData = vi.mocked(renderCoverImageAction).mock.calls[0][0];
    expect(String(renderData.get('dataUrl'))).toMatch(/^data:image\//);
  });
});

describe('CoverStudio — D.3 metadata sync', () => {
  test('manual override shows a resync control that restores the metadata value', () => {
    const state = createDefaultSurfaceState('cover');
    state.fields.title = { value: 'Título personalizado', visible: true, source: 'manual' };

    const project = makeProject({
      document: {
        ...makeProject().document,
        title: 'Título documento',
        metadata: { title: 'Título metadato' },
      },
      cover: {
        ...makeProject().cover,
        surfaceState: state,
      },
    });

    render(<CoverStudio surface="cover" project={project} copy={copy} />);

    const titleInput = screen.getByLabelText(copy.coverTitleLabel);
    expect(titleInput).toHaveValue('Título personalizado');

    fireEvent.click(screen.getByTestId('cover-field-resync-title'));
    expect(titleInput).toHaveValue('Título metadato');
    expect(screen.queryByTestId('cover-field-resync-title')).not.toBeInTheDocument();
  });

  test('editing a synced field by hand marks it as a manual override', () => {
    render(<CoverStudio surface="cover" project={makeProject()} copy={copy} />);

    expect(screen.queryByTestId('cover-field-resync-title')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(copy.coverTitleLabel), {
      target: { value: 'Edición manual' },
    });
    expect(screen.getByTestId('cover-field-resync-title')).toBeInTheDocument();
  });
});
