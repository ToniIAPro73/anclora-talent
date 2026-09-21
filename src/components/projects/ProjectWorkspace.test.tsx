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
  createEditableCopyAction: vi.fn().mockResolvedValue(undefined),
  saveProjectCompositionAction: vi.fn().mockResolvedValue({ ok: true }),
  saveUserCompositionDefaultsAction: vi.fn().mockResolvedValue({ ok: true }),
  saveProjectRulesAction: vi.fn().mockResolvedValue({ ok: true }),
  setBrandForAllProjectsAction: vi.fn().mockResolvedValue({ ok: true }),
}));

// U6: DocumentDataModal imports the brand server action — stub it so the
// real brand module never pulls the db/neon chain into jsdom.
vi.mock('@/lib/brand/actions', () => ({
  setProjectBrandProfileAction: vi.fn().mockResolvedValue({ ok: true }),
  setBrandProfileStatusAction: vi.fn().mockResolvedValue({ ok: true, status: 'active' }),
  createBrandProfileAction: vi.fn().mockResolvedValue({ ok: true, profileId: 'profile-1', name: 'Mock brand', warnings: [] }),
}));

// Tiptap requires a real browser DOM — stub it out for jsdom
vi.mock('./RichTextEditor', () => ({
  RichTextEditor: ({ defaultContent }: { defaultContent: string }) => (
    <div data-testid="rich-text-editor">{defaultContent}</div>
  ),
}));

vi.mock('./design-surface/CoverStudioV2', () => ({
  CoverStudioV2: ({ surfaceKind }: { surfaceKind: string }) => (
    <div data-testid="cover-studio-v2" data-surface-kind={surfaceKind} />
  ),
}));

vi.mock('./advanced-chapter-editor/ChapterEditorFullscreen', () => ({
  ChapterEditorFullscreen: ({ chapters, initialChapterIndex, onClose }: { chapters: ProjectRecord['document']['chapters']; initialChapterIndex: number; onClose: () => void }) => (
    <div data-testid="chapter-editor-rendered" data-chapter-id={chapters[initialChapterIndex]?.id}>
      Editor {chapters[initialChapterIndex]?.title}
      <button type="button" data-testid="chapter-editor-back-button" onClick={onClose}>Volver a Capítulos</button>
    </div>
  ),
}));

// Fixed-PDF document mode: the viewer is a client-only pdfjs-dist canvas
// renderer, irrelevant to workspace-gating assertions here — stub it.
vi.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: { workerSrc: '' },
  getDocument: () => ({ promise: new Promise(() => undefined) }),
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

// The canonical stepper is the sole workflow navigation/progress system for
// the content and chapters workspaces. Later workflow screens retain the
// legacy rail for their own transition affordances.
function clickStepperStep(container: HTMLElement, step: number) {
  const trigger = container.querySelectorAll('.ac-stepper__trigger')[step - 1] as HTMLElement | undefined;
  if (!trigger) throw new Error(`Stepper trigger for step ${step} not found`);
  fireEvent.click(trigger);
}

describe('ProjectWorkspace', () => {
  beforeEach(() => {
    window.localStorage.clear();
    clearLastChapterSave();
    vi.mocked(syncProjectPaginationAction).mockResolvedValue({ status: 'updated' });
    // ProjectWorkspace portals its header into the app shell's compact
    // editor topbar slot (see AppShell.tsx); stand that slot in since these
    // tests render ProjectWorkspace without its AppShell ancestor.
    document.body.innerHTML = '<div id="talent-editor-topbar-slot"></div>';
  });

  test('renders the project title in the header', () => {
    render(<ProjectWorkspace project={makeProject()} copy={copy} />);
    expect(screen.getByTestId('content-workspace-topbar')).toHaveTextContent('Mi Proyecto');
  });

  test('shows the Resumen tab by default in Step 1', () => {
    render(<ProjectWorkspace project={makeProject()} copy={copy} />);
    expect(screen.getByTestId('content-summary')).toBeInTheDocument();
  });

  test('shows the document metadata form under the Metadatos tab in Step 1', () => {
    render(<ProjectWorkspace project={makeProject()} copy={copy} />);
    fireEvent.click(screen.getByTestId('content-tab-metadatos'));
    expect(screen.getByTestId('metadata-workspace')).toBeInTheDocument();
    expect(screen.getByTestId('metadata-title-input')).toHaveValue('Mi Proyecto');
  });

  test('restores the persisted workflow step and marks previous steps as completed', () => {
    const { container } = render(
      <ProjectWorkspace
        project={makeProject({ workflowStep: 6 })}
        copy={copy}
      />,
    );

    // Appears twice: once in the stepper label, once in the portalled
    // topbar's step eyebrow (see AppShell's #talent-editor-topbar-slot).
    expect(screen.getAllByText('Colaborar').length).toBeGreaterThan(0);
    expect(screen.getByText('de 8 pasos')).toBeInTheDocument();
    expect(screen.getAllByText('6').length).toBeGreaterThan(0);

    const activeStepButton = container.querySelector('[aria-current="step"]');
    expect(activeStepButton).not.toBeNull();

    const stepper = screen.getByRole('navigation', { name: 'Progress' });
    expect(stepper.querySelectorAll('svg.lucide-check')).toHaveLength(5);
  });

  test('prioritizes the persisted database workflow step over local storage', () => {
    window.localStorage.setItem(
      'anclora-project-workflow-step',
      JSON.stringify({
        'proj-1': 2,
      }),
    );

    render(<ProjectWorkspace project={makeProject({ workflowStep: 4 })} copy={copy} />);

    expect(screen.getByText('de 8 pasos')).toBeInTheDocument();
    expect(screen.getAllByText('4').length).toBeGreaterThan(0);
    expect(screen.getAllByText(copy.stepBackCover).length).toBeGreaterThan(0);
  });

  test('persists the workflow step when navigating', async () => {
    const { container } = render(<ProjectWorkspace project={makeProject()} copy={copy} />);

    clickStepperStep(container, 2);

    expect(saveProjectWorkflowStepAction).toHaveBeenCalledTimes(1);
  });

  test('renders chapter organizer when moving to Step 2', () => {
    const { container } = render(<ProjectWorkspace project={makeProject()} copy={copy} />);

    // Navigate to step 2 (Capítulos)
    clickStepperStep(container, 2);

    expect(screen.getAllByText('Capítulo 1').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Capítulo 2').length).toBeGreaterThan(0);
    expect(screen.queryByTestId('previous-step-button')).not.toBeInTheDocument();
    expect(screen.queryByTestId('next-step-button')).not.toBeInTheDocument();
  });

  test('replaces chapter management with the editor workspace', () => {
    const { container } = render(<ProjectWorkspace project={makeProject()} copy={copy} />);

    clickStepperStep(container, 2);
    expect(screen.getByTestId('chapter-workflow-stepper')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('chapter-open-button'));

    expect(screen.getByTestId('chapter-editor-rendered')).toHaveAttribute('data-chapter-id', 'ch-1');
    expect(screen.queryByTestId('chapter-workflow-stepper')).not.toBeInTheDocument();
    expect(screen.queryByTestId('chapter-organizer')).not.toBeInTheDocument();
    expect(screen.queryByTestId('chapter-overview')).not.toBeInTheDocument();
    expect(screen.queryByTestId('chapter-properties-title')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('chapter-editor-back-button'));
    expect(screen.getByTestId('chapter-workflow-stepper')).toBeInTheDocument();
  });

  test('shows the pagination sync action in Step 2 and updates its state when clicked', () => {
    const { container } = render(<ProjectWorkspace project={makeProject()} copy={copy} />);

    clickStepperStep(container, 2);

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

    const { container } = render(<ProjectWorkspace project={makeProject()} copy={copy} />);

    clickStepperStep(container, 2);
    fireEvent.click(screen.getByTestId('sync-page-numbers-button'));

    return waitFor(() => {
      expect(screen.getByTestId('pagination-sync-feedback-missing-index')).toHaveTextContent(
        copy.chapterSyncPageNumbersMissingIndex,
      );
    });
  });

  test('navigates through steps', () => {
    const { container } = render(<ProjectWorkspace project={makeProject()} copy={copy} />);

    // Step 1 -> 2 (no rail on Step 1; use the canonical stepper)
    clickStepperStep(container, 2);
    expect(screen.queryByText('de 8 pasos')).not.toBeInTheDocument();
    expect(screen.getAllByText('2').length).toBeGreaterThan(0);

    // Step 2 -> 3
    clickStepperStep(container, 3);
    expect(screen.getAllByText('3').length).toBeGreaterThan(0);
  });

  test('renders the unified cover studio in Step 3', () => {
    const { container } = render(<ProjectWorkspace project={makeProject()} copy={copy} />);

    // 1 -> 2
    clickStepperStep(container, 2);
    // 2 -> 3
    clickStepperStep(container, 3);

    expect(screen.getByTestId('cover-studio-v2')).toHaveAttribute('data-surface-kind', 'cover');
  });

  test('renders the same unified studio for the back cover in Step 4', () => {
    const { container } = render(<ProjectWorkspace project={makeProject()} copy={copy} />);

    // 1 -> 2
    clickStepperStep(container, 2);
    // 2 -> 3
    clickStepperStep(container, 3);
    // 3 -> 4
    clickStepperStep(container, 4);

    expect(screen.getByTestId('cover-studio-v2')).toHaveAttribute('data-surface-kind', 'back-cover');
  });

  test('offers reverting the recomposition of the last chapter save (F0.3)', async () => {
    recordLastChapterSave({
      projectId: 'proj-1',
      chapterId: 'ch-2',
      chapterTitle: 'Capítulo 2',
      previousHtml: '<p>Contenido previo</p>',
    });

    render(<ProjectWorkspace project={makeProject()} copy={copy} />);
    fireEvent.click(screen.getByTestId('content-tab-preflight'));

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

  describe('fixed-pdf document mode', () => {
    function makeFixedPdfProject(overrides: Partial<ProjectRecord> = {}) {
      const base = makeProject(overrides);
      return {
        ...base,
        document: {
          ...base.document,
          source: {
            fileName: 'El_Plan_de_Escape_EBOOK.pdf',
            mimeType: 'application/pdf',
            importedAt: '2026-01-01T00:00:00Z',
            mode: 'fixed-pdf' as const,
          },
        },
        assets: [
          {
            id: 'asset-1',
            kind: 'document' as const,
            usage: 'source-document' as const,
            blobUrl: 'projects/proj-1/source/1700000000000-el-plan.pdf',
            fileName: 'El_Plan_de_Escape_EBOOK.pdf',
            mimeType: 'application/pdf',
            createdAt: '2026-01-01T00:00:00Z',
          },
        ],
      };
    }

    test('does not force CoverStudio/BackCoverStudio — steps 2-4 show the included panel', () => {
      render(<ProjectWorkspace project={makeFixedPdfProject({ workflowStep: 3 })} copy={copy} />);

      expect(screen.getByTestId('fixed-pdf-included-panel')).toBeInTheDocument();
      expect(screen.queryByTestId('cover-studio-v2')).not.toBeInTheDocument();
    });

    test('marks chapters/cover/back-cover steps as already completed', () => {
      render(<ProjectWorkspace project={makeFixedPdfProject({ workflowStep: 1 })} copy={copy} />);

      const stepper = screen.getByRole('navigation', { name: 'Progress' });
      // Step 1 is active; steps 2-4 are pre-completed for fixed-pdf.
      expect(stepper.querySelectorAll('svg.lucide-check')).toHaveLength(3);
    });

    test('exposes an original-document preview instead of the composed preview', () => {
      render(<ProjectWorkspace project={makeFixedPdfProject({ workflowStep: 5 })} copy={copy} />);

      expect(screen.getByTestId('fixed-pdf-preview')).toBeInTheDocument();
      expect(screen.queryByTestId('preview-inline-document')).not.toBeInTheDocument();
    });

    test('export step offers the original PDF and disables DOCX/EPUB/HTML/Markdown', () => {
      render(<ProjectWorkspace project={makeFixedPdfProject({ workflowStep: 8 })} copy={copy} />);

      expect(screen.getByTestId('export-pdf-original-button')).toBeInTheDocument();
      expect(screen.queryByTestId('pdf-export-button')).not.toBeInTheDocument();
      expect(screen.getByTestId('export-docx-button')).toBeDisabled();
      expect(screen.getByTestId('export-epub-button')).toBeDisabled();
      expect(screen.getByTestId('export-html-button')).toBeDisabled();
      expect(screen.getByTestId('export-markdown-button')).toBeDisabled();
    });

    test('export step offers "Crear copia editable" (Fase 3)', () => {
      render(<ProjectWorkspace project={makeFixedPdfProject({ workflowStep: 8 })} copy={copy} />);

      expect(screen.getByTestId('create-editable-copy-button')).toBeInTheDocument();
    });

    test('export step never shows the composition-violations banner (Talent does not govern fixed-pdf composition)', () => {
      render(<ProjectWorkspace project={makeFixedPdfProject({ workflowStep: 8 })} copy={copy} />);

      expect(screen.queryByTestId('export-gate-message')).not.toBeInTheDocument();
    });

    test('the original-PDF download button is never blocked by the export gate', () => {
      render(<ProjectWorkspace project={makeFixedPdfProject({ workflowStep: 8 })} copy={copy} />);

      expect(screen.getByTestId('export-pdf-original-button')).not.toBeDisabled();
      const actions = screen.getByTestId('export-pdf-original-button').closest('.ac-export-suite__actions');
      expect(actions).not.toHaveAttribute('aria-disabled', 'true');
    });

    test('regression: an editable project is unaffected by fixed-pdf gating', () => {
      render(<ProjectWorkspace project={makeProject({ workflowStep: 3 })} copy={copy} />);

      expect(screen.queryByTestId('fixed-pdf-included-panel')).not.toBeInTheDocument();
      expect(screen.getByTestId('cover-studio-v2')).toHaveAttribute('data-surface-kind', 'cover');
    });

    test('regression: editable project export step keeps every reflowable format enabled', () => {
      render(<ProjectWorkspace project={makeProject({ workflowStep: 8 })} copy={copy} />);

      expect(screen.getByTestId('export-html-button')).not.toBeDisabled();
      expect(screen.getByTestId('export-docx-button')).not.toBeDisabled();
      expect(screen.getByTestId('export-epub-button')).not.toBeDisabled();
      expect(screen.getByTestId('export-markdown-button')).not.toBeDisabled();
    });

    test('regression: an already-editable project never offers "Crear copia editable"', () => {
      render(<ProjectWorkspace project={makeProject({ workflowStep: 8 })} copy={copy} />);

      expect(screen.queryByTestId('create-editable-copy-button')).not.toBeInTheDocument();
    });
  });
});
