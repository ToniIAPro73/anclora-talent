import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, test, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { CoverStudioV2 } from './CoverStudioV2';
import { createDesignLayer, createEmptyDesignSurface, type DesignSurface } from '@/lib/projects/design-surface';
import { resolveLocaleMessages } from '@/lib/i18n/messages';
import { createCoverDesignPackage } from '@/lib/projects/cover-design-package';

const copy = resolveLocaleMessages('es').coverDesignSurface;
const workflowLabels = resolveLocaleMessages('es').project;

type SaveResult = { status: 'saved' } | { status: 'error'; error: string };
const saveCoverDesignAction = vi.fn<(projectId: string, surface: DesignSurface) => Promise<SaveResult>>(async () => ({ status: 'saved' }));
const saveBackCoverDesignAction = vi.fn<(projectId: string, surface: DesignSurface) => Promise<SaveResult>>(async () => ({ status: 'saved' }));
vi.mock('@/lib/projects/actions', () => ({
  saveCoverDesignAction: (projectId: string, surface: DesignSurface) => saveCoverDesignAction(projectId, surface),
  saveBackCoverDesignAction: (projectId: string, surface: DesignSurface) => saveBackCoverDesignAction(projectId, surface),
}));

const rasterizeSourcePdfPage = vi.fn<(projectId: string, pageNumber: number) => Promise<string>>(async () => 'data:image/png;base64,RASTERIZED');
vi.mock('@/lib/projects/pdf-page-rasterizer', () => ({
  rasterizeSourcePdfPage: (projectId: string, pageNumber: number) => rasterizeSourcePdfPage(projectId, pageNumber),
  resolveOriginPageNumber: (surfaceKind: string, pageCount: number | null) => (surfaceKind === 'cover' ? 1 : (pageCount ?? 1)),
}));

vi.mock('./AdvancedCoverEditor', () => ({
  AdvancedCoverEditor: (props: { onSaveFinal?: () => void; saveStatus?: string; surface: DesignSurface; toolbarActions?: ReactNode }) => (
    <div data-testid="stub-advanced-editor">
      <div data-testid="stub-editor-toolbar-actions">{props.toolbarActions}</div>
      <button type="button" data-testid="studio-save-final-button" onClick={props.onSaveFinal}>Guardar</button>
      <span data-testid="studio-save-status">{props.saveStatus}</span>
      <span data-testid="advanced-surface-title">{props.surface.layers.find((layer) => layer.type === 'text')?.content}</span>
    </div>
  ),
}));

vi.mock('./BasicCoverEditor', () => ({
  BasicCoverEditor: (props: { surface: DesignSurface; onChange: (surface: DesignSurface) => void }) => (
    <div data-testid="stub-basic-editor">
      <span>{props.surface.surface}</span>
      <button type="button" data-testid="basic-edit-title" onClick={() => props.onChange({
        ...props.surface,
        layers: props.surface.layers.map((layer) => layer.type === 'text' ? { ...layer, content: 'Título desde Básico' } : layer),
      })}>Editar título</button>
    </div>
  ),
}));

function makeEmptySurface(kind: 'cover' | 'back-cover' = 'cover'): DesignSurface {
  return createEmptyDesignSurface(kind);
}

function makeNonEmptySurface(kind: 'cover' | 'back-cover' = 'cover'): DesignSurface {
  const surface = createEmptyDesignSurface(kind);
  surface.layers = [createDesignLayer({ type: 'text', content: 'Título', role: 'title', source: 'manual' }, 1)];
  return surface;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('CoverStudioV2', () => {
  test('shows the empty-state prompt for a fresh design and hides the mode toggle', () => {
    render(
      <CoverStudioV2
        surfaceKind="cover"
        projectId="p-1"
        initialSurface={makeEmptySurface()}
        sourceDocumentAssetId={null}
        pageCount={null}
        copy={copy}
      />,
    );
    expect(screen.getByTestId('cover-origin-prompt')).toBeInTheDocument();
    expect(screen.queryByTestId('studio-mode-basic-button')).not.toBeInTheDocument();
  });

  test('a non-empty design skips the prompt, renders Professional by default, and keeps compact accessible file actions', () => {
    render(
      <CoverStudioV2
        surfaceKind="cover"
        projectId="p-1"
        initialSurface={makeNonEmptySurface()}
        sourceDocumentAssetId={null}
        pageCount={null}
        copy={copy}
      />,
    );
    expect(screen.queryByTestId('cover-origin-prompt')).not.toBeInTheDocument();
    expect(screen.getByTestId('stub-advanced-editor')).toBeInTheDocument();
    expect(screen.queryByTestId('studio-mode-basic-button')).not.toBeInTheDocument();
    expect(screen.queryByTestId('studio-mode-professional-button')).not.toBeInTheDocument();
    const actions = screen.getByTestId('stub-editor-toolbar-actions');
    expect(actions.querySelector('[data-testid="cover-package-import-button"]')).toHaveAccessibleName(copy.workspace.importEditableJson);
    expect(actions.querySelector('[data-testid="cover-package-export-button"]')).toHaveAccessibleName(copy.workspace.exportEditableJson);
    expect(actions.querySelector('[data-testid="cover-png-export-button"]')).toHaveAccessibleName(copy.workspace.exportPng);
    expect(actions.querySelector('[data-testid="cover-package-import-button"] svg')).toHaveClass('lucide-file-input');
    expect(actions.querySelector('[data-testid="cover-package-export-button"] svg')).toHaveClass('lucide-file-output');
    expect(actions.querySelector('[data-testid="cover-png-export-button"] svg')).toHaveClass('lucide-image-up');
    expect(actions).not.toHaveTextContent('JSON');
    expect(actions).not.toHaveTextContent('PNG');
    expect(screen.queryByTestId('cover-package-help')).not.toBeInTheDocument();
  });

  test('does not render the lower preflight or collection panels after the editor', () => {
    render(
      <CoverStudioV2
        surfaceKind="cover"
        projectId="p-1"
        initialSurface={makeNonEmptySurface()}
        sourceDocumentAssetId={null}
        pageCount={null}
        copy={copy}
      />,
    );
    expect(screen.queryByTestId('cover-preflight-panel')).not.toBeInTheDocument();
    expect(screen.queryByTestId('cover-editor-artifacts')).not.toBeInTheDocument();
  });

  test('direct editor routes show the canonical eight-step workflow with the current surface active', () => {
    render(
      <CoverStudioV2
        surfaceKind="back-cover"
        projectId="p-1"
        initialSurface={makeNonEmptySurface('back-cover')}
        sourceDocumentAssetId={null}
        pageCount={null}
        copy={copy}
        showWorkflowNavigation
        workflowLabels={workflowLabels}
      />,
    );

    const nav = screen.getByTestId('cover-workflow-stepper');
    expect(nav.querySelectorAll('.ac-stepper__item')).toHaveLength(8);
    expect(nav.querySelector('[aria-current="step"]')).toHaveTextContent('4');
    expect(nav).toHaveTextContent('Contraportada');
  });

  test('imports a validated JSON package into both saved surfaces', async () => {
    const cover = makeNonEmptySurface('cover');
    const backCover = makeNonEmptySurface('back-cover');
    const firstTextLayer = backCover.layers[0];
    if (firstTextLayer.type !== 'text') throw new Error('Expected a text fixture');
    backCover.layers[0] = { ...firstTextLayer, content: 'Imported back cover' };
    const packageJson = await createCoverDesignPackage({ cover, 'back-cover': backCover });
    const file = new File([packageJson], 'design.json', { type: 'application/json' });
    Object.defineProperty(file, 'text', { value: async () => packageJson });
    render(
      <CoverStudioV2
        surfaceKind="cover"
        projectId="p-1"
        initialSurface={makeNonEmptySurface()}
        companionSurface={makeNonEmptySurface('back-cover')}
        sourceDocumentAssetId={null}
        pageCount={null}
        copy={copy}
      />,
    );

    fireEvent.change(screen.getByTestId('cover-package-input'), { target: { files: [file] } });
    await waitFor(() => expect(screen.getByTestId('cover-package-feedback')).toHaveTextContent(copy.workspace.jsonImported));
    expect(saveCoverDesignAction).toHaveBeenCalledWith('p-1', expect.objectContaining({ surface: 'cover' }));
    expect(saveBackCoverDesignAction).toHaveBeenCalledWith('p-1', expect.objectContaining({ surface: 'back-cover' }));
  });

  test('reports a file-read error without changing the save status', async () => {
    const file = new File(['invalid'], 'design.json', { type: 'application/json' });
    Object.defineProperty(file, 'text', { value: vi.fn().mockRejectedValue(new Error('File read denied')) });
    render(
      <CoverStudioV2
        surfaceKind="cover"
        projectId="p-1"
        initialSurface={makeNonEmptySurface()}
        sourceDocumentAssetId={null}
        pageCount={null}
        copy={copy}
      />,
    );

    fireEvent.change(screen.getByTestId('cover-package-input'), { target: { files: [file] } });
    await waitFor(() => expect(screen.getByTestId('cover-package-feedback')).toHaveTextContent('File read denied'));
    expect(screen.getByTestId('studio-save-status')).toHaveTextContent('idle');
    expect(saveCoverDesignAction).not.toHaveBeenCalled();
  });

  test('does not offer Basic mode and always mounts Professional editing', () => {
    render(
      <CoverStudioV2
        surfaceKind="cover"
        projectId="p-1"
        initialSurface={makeNonEmptySurface()}
        sourceDocumentAssetId={null}
        pageCount={null}
        copy={copy}
      />,
    );

    expect(screen.getByTestId('stub-advanced-editor')).toBeInTheDocument();
    expect(screen.queryByTestId('stub-basic-editor')).not.toBeInTheDocument();
    expect(screen.queryByTestId('studio-mode-basic-button')).not.toBeInTheDocument();
    expect(screen.queryByTestId('studio-mode-professional-button')).not.toBeInTheDocument();
  });

  test('choosing "create from scratch" dismisses the prompt and shows the unified editor', () => {
    render(
      <CoverStudioV2
        surfaceKind="cover"
        projectId="p-1"
        initialSurface={makeEmptySurface()}
        sourceDocumentAssetId={null}
        pageCount={null}
        copy={copy}
      />,
    );
    fireEvent.click(screen.getByTestId('cover-origin-create-from-scratch-button'));
    expect(screen.queryByTestId('cover-origin-prompt')).not.toBeInTheDocument();
    expect(screen.getByTestId('stub-advanced-editor')).toBeInTheDocument();
  });

  test('shows Guardando… then Guardado after a save resolves', async () => {
    render(
      <CoverStudioV2
        surfaceKind="cover"
        projectId="p-1"
        initialSurface={makeNonEmptySurface()}
        sourceDocumentAssetId={null}
        pageCount={null}
        copy={copy}
      />,
    );

    fireEvent.click(screen.getByTestId('studio-save-final-button'));
    await waitFor(() => expect(screen.getByTestId('studio-save-status')).toHaveTextContent('saved'));
    expect(saveCoverDesignAction).toHaveBeenCalledTimes(1);
    const [, savedSurface] = saveCoverDesignAction.mock.calls[0] as [string, DesignSurface];
    expect(savedSurface.status).toBe('final');
  });

  test('shows an error status when the save action fails', async () => {
    saveCoverDesignAction.mockResolvedValueOnce({ status: 'error', error: 'boom' });
    render(
      <CoverStudioV2
        surfaceKind="cover"
        projectId="p-1"
        initialSurface={makeNonEmptySurface()}
        sourceDocumentAssetId={null}
        pageCount={null}
        copy={copy}
      />,
    );
    fireEvent.click(screen.getByTestId('studio-save-final-button'));
    await waitFor(() => expect(screen.getByTestId('studio-save-status')).toHaveTextContent('error'));
  });

  test('uses the back-cover save action when surfaceKind is back-cover', async () => {
    render(
      <CoverStudioV2
        surfaceKind="back-cover"
        projectId="p-1"
        initialSurface={makeNonEmptySurface('back-cover')}
        sourceDocumentAssetId={null}
        pageCount={null}
        copy={copy}
      />,
    );
    fireEvent.click(screen.getByTestId('studio-save-final-button'));
    await waitFor(() => expect(saveBackCoverDesignAction).toHaveBeenCalledTimes(1));
    expect(saveCoverDesignAction).not.toHaveBeenCalled();
  });

  test('offers Use original / Edit as base only when a source-document asset exists, and rasterizes the correct page', async () => {
    render(
      <CoverStudioV2
        surfaceKind="cover"
        projectId="p-1"
        initialSurface={makeEmptySurface()}
        sourceDocumentAssetId="asset-1"
        pageCount={12}
        copy={copy}
      />,
    );
    expect(screen.getByTestId('cover-origin-use-original-button')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('cover-origin-use-original-button'));

    await waitFor(() => expect(rasterizeSourcePdfPage).toHaveBeenCalledWith('p-1', 1));
    await waitFor(() => expect(screen.queryByTestId('cover-origin-prompt')).not.toBeInTheDocument());
  });

});
