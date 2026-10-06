import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { ProjectWorkspace } from '../ProjectWorkspace';
import { AdvancedCoverEditor } from './AdvancedCoverEditor';
import { resolveLocaleMessages } from '@/lib/i18n/messages';
import type { ProjectRecord } from '@/lib/projects/types';
import { createEmptyDesignSurface, createDesignLayer } from '@/lib/projects/design-surface';

vi.mock('server-only', () => ({}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
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
  createEditableCopyAction: vi.fn().mockResolvedValue(undefined),
  saveProjectCompositionAction: vi.fn().mockResolvedValue({ ok: true }),
  saveUserCompositionDefaultsAction: vi.fn().mockResolvedValue({ ok: true }),
  saveProjectRulesAction: vi.fn().mockResolvedValue({ ok: true }),
  setBrandForAllProjectsAction: vi.fn().mockResolvedValue({ ok: true }),
  saveCoverDesignAction: vi.fn().mockResolvedValue({ status: 'saved' }),
  saveBackCoverDesignAction: vi.fn().mockResolvedValue({ status: 'saved' }),
}));

vi.mock('@/lib/brand/actions', () => ({
  setProjectBrandProfileAction: vi.fn().mockResolvedValue({ ok: true }),
  setBrandProfileStatusAction: vi.fn().mockResolvedValue({ ok: true, status: 'active' }),
  createBrandProfileAction: vi.fn().mockResolvedValue({ ok: true, profileId: 'profile-1', name: 'Mock brand', warnings: [] }),
}));

vi.mock('./DesignSurfaceCanvas', () => ({
  DesignSurfaceCanvas: () => <div data-testid="mock-design-surface-canvas" />,
}));

const messages = resolveLocaleMessages('es');
const copy = messages.project;
const coverCopy = messages.coverDesignSurface;

function makeProject(overrides: Partial<ProjectRecord> = {}): ProjectRecord {
  return {
    id: 'proj-cover-08a',
    userId: 'user-1',
    title: 'La arquitectura del silencio',
    slug: 'la-arquitectura-del-silencio',
    author: 'María Vega',
    workflowStep: 3,
    status: 'draft',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    document: {
      id: 'doc-1',
      title: 'La arquitectura del silencio',
      subtitle: '',
      author: 'María Vega',
      language: 'es',
      metadata: { title: 'La arquitectura del silencio' },
      chapters: [
        { id: 'ch-1', title: 'Capítulo 1', order: 1, blocks: [{ id: 'b-1', type: 'paragraph', order: 0, content: 'Texto' }] },
      ],
    },
    cover: {
      id: 'cov-1',
      title: 'La arquitectura del silencio',
      subtitle: null,
      palette: 'obsidian',
      backgroundImageUrl: null,
      thumbnailUrl: null,
    },
    backCover: {
      id: 'bcov-1',
      title: 'La arquitectura del silencio',
      body: '',
      authorBio: '',
      palette: 'obsidian',
      backgroundImageUrl: null,
      thumbnailUrl: null,
      isbn: null,
    },
    assets: [],
    ...overrides,
  } as ProjectRecord;
}

describe('COVER_EDITOR_08A Architectural Contract Gates', () => {
  test('COVER_UI_01 & COVER_UI_02: exactly ONE workflow navigation and NO duplicate inner header/stepper in step 3', () => {
    const { container } = render(
      <ProjectWorkspace project={makeProject({ workflowStep: 3 })} copy={copy} />
    );

    // Assert exactly ONE canonical workflow stepper
    const steppers = screen.getAllByTestId('chapter-workflow-stepper');
    expect(steppers).toHaveLength(1);

    // Assert NO duplicate inner stepper exists in DOM
    expect(screen.queryByTestId('cover-editor-stepper')).not.toBeInTheDocument();

    // Assert NO duplicate brand header exists in the workspace
    expect(container.querySelector('.cover-editor-brand')).toBeNull();
    expect(container.querySelector('.cover-editor-heading')).toBeNull();
  });

  test('COVER_UI_03 & COVER_UI_04: legacy progress sidebar removed from Portada and workspace is mounted full-width', () => {
    render(<ProjectWorkspace project={makeProject({ workflowStep: 3 })} copy={copy} />);

    // Legacy progress rail sidebar ("de 8 pasos", "Paso anterior", "Siguiente paso") is completely absent
    expect(screen.queryByText('de 8 pasos')).not.toBeInTheDocument();
    expect(screen.queryByTestId('previous-step-button')).not.toBeInTheDocument();
    expect(screen.queryByTestId('next-step-button')).not.toBeInTheDocument();

    // Dedicated full-width workspace stage is mounted
    const coverStage = screen.getByTestId('cover-step-workspace');
    expect(coverStage).toBeInTheDocument();
    expect(coverStage).toHaveClass('w-full');
  });

  test('COVER_UI_05 to COVER_UI_10: AdvancedCoverEditor presents deliberate 08A structure', () => {
    const surface = createEmptyDesignSurface('cover');
    surface.layers = [
      createDesignLayer({ type: 'text', content: 'LA ARQUITECTURA DEL SILENCIO', role: 'title', x: 100, y: 200 }, 1),
      createDesignLayer({ type: 'text', content: 'UN ENSAYO SOBRE EL ESPACIO', role: 'subtitle', x: 100, y: 350 }, 2),
      createDesignLayer({ type: 'text', content: 'MARÍA VEGA', role: 'author', x: 100, y: 600 }, 3),
      createDesignLayer({ type: 'image', src: 'https://example.com/cover.jpg', name: 'Imagen de fondo', x: 0, y: 0, width: 800, height: 1200 }, 4),
    ];

    render(
      <AdvancedCoverEditor
        surface={surface}
        onChange={vi.fn()}
        copy={coverCopy}
      />
    );

    // COVER_UI_06: Left tools panel has 08A tool categories and template selector
    expect(screen.getByTestId('cover-tool-button-elements')).toBeInTheDocument();
    expect(screen.getByTestId('cover-tool-button-text')).toBeInTheDocument();
    expect(screen.getByTestId('cover-tool-button-images')).toBeInTheDocument();
    expect(screen.getByTestId('cover-tool-button-shapes')).toBeInTheDocument();
    expect(screen.getByTestId('cover-tool-button-lines')).toBeInTheDocument();
    expect(screen.getByTestId('cover-tool-button-icons')).toBeInTheDocument();
    expect(screen.getByTestId('cover-tool-button-background')).toBeInTheDocument();
    expect(screen.getByTestId('cover-template-select')).toBeInTheDocument();
    expect(screen.getByTestId('cover-templates-view-all-button')).toBeInTheDocument();

    // COVER_UI_05: Central canvas is mounted with bottom zoom controls
    expect(screen.getByTestId('advanced-editor-canvas-column')).toBeInTheDocument();
    expect(screen.getByTestId('cover-canvas-zoom-out')).toBeInTheDocument();
    expect(screen.getByTestId('cover-canvas-zoom-in')).toBeInTheDocument();
    expect(screen.getByTestId('cover-canvas-zoom-fit')).toBeInTheDocument();

    // COVER_UI_07 & COVER_UI_08: Right properties panel with layers list
    expect(screen.getByTestId('advanced-editor-properties-column')).toBeInTheDocument();
    expect(screen.getByTestId('layers-panel')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(4);

    // COVER_UI_09: Compact workspace toolbar has undo, redo, zoom, preview, save
    expect(screen.getByTestId('cover-workspace-toolbar')).toBeInTheDocument();
    expect(screen.getByTestId('advanced-editor-undo-button')).toBeInTheDocument();
    expect(screen.getByTestId('advanced-editor-redo-button')).toBeInTheDocument();
    expect(screen.getByTestId('cover-editor-preview-button')).toBeInTheDocument();
    expect(screen.getByTestId('studio-save-final-button')).toBeInTheDocument();
  });

  test('COVER_UI_11: layer names are clean and semantic, never raw content or editor residue', () => {
    const surface = createEmptyDesignSurface('cover');
    surface.layers = [
      createDesignLayer({ type: 'text', content: 'La arquitectura del silencio y otras cosas muy largas', role: 'title', name: 'Text' }, 1),
      createDesignLayer({ type: 'text', content: 'Sistemas para pensar, decidir y crear en un mundo de interrupciones', role: 'subtitle' }, 2),
      createDesignLayer({ type: 'text', content: '', role: 'author', name: 'Texto', visible: false }, 3),
      createDesignLayer({ type: 'image', src: 'https://example.com/cover.jpg', x: 0, y: 0, width: surface.width, height: surface.height }, 4),
    ];

    render(<AdvancedCoverEditor surface={surface} onChange={vi.fn()} copy={coverCopy} />);

    const names = screen.getAllByTestId(/^layer-name-/).map((node) => node.textContent);
    expect(names).toEqual(['Imagen de fondo', 'Autor', 'Subtítulo', 'Título']);
    expect(names).not.toContain('Text');
    expect(names).not.toContain('Texto');
  });

  test('COVER_UI_12: with no selection the properties panel shows an intentional empty state', () => {
    render(<AdvancedCoverEditor surface={createEmptyDesignSurface('cover')} onChange={vi.fn()} copy={coverCopy} />);

    const empty = screen.getByTestId('properties-panel-empty');
    expect(empty).toHaveTextContent(coverCopy.workspace.emptyTitle);
    expect(empty).toHaveTextContent(coverCopy.workspace.emptyHint);
    expect(screen.queryByTestId('cover-properties-selection')).not.toBeInTheDocument();
  });

  test('COVER_UI_13: one toolbar, one zoom readout in the toolbar, guide buttons live in the canvas header', () => {
    const { container } = render(<AdvancedCoverEditor surface={createEmptyDesignSurface('cover')} onChange={vi.fn()} copy={coverCopy} />);

    expect(container.querySelectorAll('[data-testid="cover-workspace-toolbar"]')).toHaveLength(1);
    expect(screen.getByTestId('advanced-editor-zoom-select')).toBeInTheDocument();
    // the add-guide controls are part of the canvas header, not floating over the paper
    const header = container.querySelector('.cover-canvas-header') as HTMLElement;
    expect(header).toContainElement(screen.getByTestId('add-vertical-guide-button'));
    expect(header).toContainElement(screen.getByTestId('add-horizontal-guide-button'));
  });

  test('COVER_UI_14: templates render real miniatures and "Ver todas" reveals the full catalogue', () => {
    render(<AdvancedCoverEditor surface={createEmptyDesignSurface('cover')} onChange={vi.fn()} copy={coverCopy} />);

    const initial = screen.getAllByTestId(/^cover-template-card-/);
    expect(initial.length).toBe(3);
    expect(screen.getAllByTestId(/^cover-template-thumb-/).length).toBe(3);

    fireEvent.click(screen.getByTestId('cover-templates-view-all-button'));
    expect(screen.getAllByTestId(/^cover-template-card-/).length).toBeGreaterThan(3);
  });

  test('COVER_PROPS_01: the text properties form is compact (icon buttons, readable case control, internal scroll)', () => {
    const surface = createEmptyDesignSurface('cover');
    const title = createDesignLayer({ type: 'text', content: 'Título', role: 'title' }, 1);
    surface.layers = [title];
    const { container } = render(<AdvancedCoverEditor surface={surface} onChange={vi.fn()} copy={coverCopy} />);

    fireEvent.click(screen.getByTestId(`layer-select-${title.id}`));

    // alignment / vertical alignment / style controls are 28px icon buttons, not large blocks
    for (const id of ['text-layer-align-left-button', 'text-layer-vertical-top-button', 'text-layer-bold-button', 'text-layer-italic-button']) {
      expect(screen.getByTestId(id)).toHaveClass('cover-prop-icon');
    }
    // the case control keeps all three words readable in one segmented row
    const labels = ['none', 'uppercase', 'lowercase'].map((t) => screen.getByTestId(`text-layer-transform-${t}-button`).textContent);
    expect(labels).toEqual(['Normal', 'MAYÚSCULAS', 'minúsculas']);
    expect(screen.getByTestId('text-layer-transform-none-button').parentElement).toHaveClass('cover-prop-segmented');
    // size shares the font row, X/Y/W/H are compact fields
    expect(screen.getByTestId('text-layer-font-size-input').closest('.cover-prop-row--font')).not.toBeNull();
    for (const id of ['x', 'y', 'width', 'height']) {
      expect(screen.getByTestId(`text-layer-${id}-input`)).toHaveClass('cover-prop-input');
    }
    // the properties form scrolls inside its own region
    expect(container.querySelector('.cover-properties-body')).toContainElement(screen.getByTestId('text-layer-properties'));
  });

  test('COVER_PROPS_02: editing X in the form changes only that layer', () => {
    const surface = createEmptyDesignSurface('cover');
    const title = createDesignLayer({ type: 'text', content: 'Título', role: 'title', x: 24, y: 143 }, 1);
    const subtitle = createDesignLayer({ type: 'text', content: 'Sub', role: 'subtitle', x: 36, y: 284 }, 2);
    surface.layers = [title, subtitle];
    const onChange = vi.fn();
    render(<AdvancedCoverEditor surface={surface} onChange={onChange} copy={coverCopy} />);

    fireEvent.click(screen.getByTestId(`layer-select-${title.id}`));
    fireEvent.change(screen.getByTestId('text-layer-x-input'), { target: { value: '-40' } });

    const next = onChange.mock.calls.at(-1)?.[0];
    expect(next.layers.find((l: { id: string }) => l.id === title.id)).toMatchObject({ x: -40, y: 143 });
    expect(next.layers.find((l: { id: string }) => l.id === subtitle.id)).toBe(subtitle);
  });
});
