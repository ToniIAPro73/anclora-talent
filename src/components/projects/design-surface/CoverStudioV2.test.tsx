import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, test, vi, beforeEach } from 'vitest';
import { CoverStudioV2 } from './CoverStudioV2';
import { createDesignLayer, createEmptyDesignSurface, type DesignSurface } from '@/lib/projects/design-surface';
import { resolveLocaleMessages } from '@/lib/i18n/messages';

const copy = resolveLocaleMessages('es').coverDesignSurface;

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
  AdvancedCoverEditor: (props: { onSaveFinal?: () => void; saveStatus?: string }) => (
    <div data-testid="stub-advanced-editor">
      <button type="button" data-testid="studio-save-final-button" onClick={props.onSaveFinal}>Guardar</button>
      <span data-testid="studio-save-status">{props.saveStatus}</span>
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

  test('a non-empty design skips the prompt and renders the unified editor', () => {
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
