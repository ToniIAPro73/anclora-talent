import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, test, vi, beforeEach } from 'vitest';
import type { ProjectRecord } from '@/lib/projects/types';
import { resolveLocaleMessages } from '@/lib/i18n/messages';
import { createDefaultSurfaceState } from '@/lib/projects/cover-surface';
import { AdvancedSurfaceEditor } from './AdvancedSurfaceEditor';

const mocks = vi.hoisted(() => {
  const renderCoverImageActionMock = vi.fn();
  const renderBackCoverImageActionMock = vi.fn();
  const routerRefreshMock = vi.fn();
  const addElementMock = vi.fn();
  const clearStoreMock = vi.fn();
  const selectElementMock = vi.fn();
  const setCanvasMock = vi.fn();
  const addImageToCanvasMock = vi.fn();
  const fakeCanvas = {
    width: 400,
    height: 600,
    clear: vi.fn(),
    set: vi.fn(),
    on: vi.fn(),
    requestRenderAll: vi.fn(),
    setActiveObject: vi.fn(),
    toDataURL: vi.fn(() => 'data:image/png;base64,preview'),
  };
  const canvasStoreState = {
    elements: [] as Array<{ id: string }>,
    pushHistory: vi.fn(),
  };
  const useCanvasStoreMock = Object.assign(
    vi.fn(() => ({
      canvas: fakeCanvas,
      setCanvas: setCanvasMock,
      addElement: addElementMock,
      clear: clearStoreMock,
      selectElement: selectElementMock,
    })),
    {
      getState: () => canvasStoreState,
    },
  );

  return {
    renderCoverImageActionMock,
    renderBackCoverImageActionMock,
    routerRefreshMock,
    addElementMock,
    clearStoreMock,
    selectElementMock,
    setCanvasMock,
    addImageToCanvasMock,
    fakeCanvas,
    canvasStoreState,
    useCanvasStoreMock,
  };
});

vi.mock('@/lib/projects/actions', () => ({
  renderCoverImageAction: (...args: unknown[]) => mocks.renderCoverImageActionMock(...args),
  renderBackCoverImageAction: (...args: unknown[]) => mocks.renderBackCoverImageActionMock(...args),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: mocks.routerRefreshMock,
  }),
}));

vi.mock('@/lib/canvas-store', () => ({
  useCanvasStore: mocks.useCanvasStoreMock,
}));

vi.mock('@/lib/canvas-utils', () => ({
  addImageToCanvas: (...args: unknown[]) => mocks.addImageToCanvasMock(...args),
  addTextToCanvas: vi.fn(),
  getFabricImageNaturalSize: (image: { getElement?: () => HTMLImageElement | null; width?: number; height?: number }) => {
    const element = typeof image.getElement === 'function' ? image.getElement() : null;
    return {
      width: element?.naturalWidth ?? image.width ?? 400,
      height: element?.naturalHeight ?? image.height ?? 600,
    };
  },
}));

vi.mock('@/lib/canvas-guides', () => ({
  createGuideManager: () => ({
    clearGuides: vi.fn(),
    hideGuidesWithAnimation: vi.fn(),
    showGuides: vi.fn(),
    snapToGuides: vi.fn(),
    dispose: vi.fn(),
  }),
}));

vi.mock('./advanced-surface-utils', () => ({
  createSurfaceSnapshotFromProject: vi.fn(() => ({
    surface: 'cover',
    fields: {},
    layers: [],
  })),
}));

vi.mock('./Canvas', () => ({
  CoverCanvas: ({ onCanvasReady }: { onCanvasReady: (canvas: typeof mocks.fakeCanvas) => void }) => {
    onCanvasReady(mocks.fakeCanvas);
    return <div data-testid="cover-canvas" />;
  },
}));

vi.mock('./Toolbar', () => ({
  CoverToolbar: () => <div data-testid="cover-toolbar" />,
}));

vi.mock('./PropertyPanel', () => ({
  CoverPropertyPanel: () => <div data-testid="cover-property-panel" />,
}));

const copy = resolveLocaleMessages('es').project;

function makeProject(): ProjectRecord {
  const coverSurface = createDefaultSurfaceState('cover');
  coverSurface.fields.title.value = 'Mi portada';
  coverSurface.fields.title.visible = true;

  const backCoverSurface = createDefaultSurfaceState('back-cover');
  backCoverSurface.fields.title.value = 'Mi contra';
  backCoverSurface.fields.title.visible = true;

  return {
    id: 'project-1',
    userId: 'user-1',
    workspaceId: null,
    slug: 'mi-libro',
    title: 'Mi libro',
    status: 'draft',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    document: {
      id: 'doc-1',
      title: 'Mi libro',
      subtitle: 'Subtitulo',
      author: 'Autor Demo',
      language: 'es',
      chapters: [],
    },
    cover: {
      id: 'cover-1',
      title: 'Mi portada',
      subtitle: 'Subtitulo',
      palette: 'obsidian',
      backgroundImageUrl: null,
      thumbnailUrl: null,
      renderedImageUrl: null,
      surfaceState: coverSurface,
    },
    backCover: {
      id: 'back-cover-1',
      title: 'Mi contra',
      body: 'Texto',
      authorBio: 'Bio',
      accentColor: null,
      backgroundImageUrl: null,
      renderedImageUrl: null,
      surfaceState: backCoverSurface,
    },
    assets: [],
  };
}

describe('AdvancedSurfaceEditor', () => {
  beforeEach(() => {
    mocks.renderCoverImageActionMock.mockReset();
    mocks.renderBackCoverImageActionMock.mockReset();
    mocks.routerRefreshMock.mockReset();
    mocks.addElementMock.mockReset();
    mocks.clearStoreMock.mockReset();
    mocks.selectElementMock.mockReset();
    mocks.setCanvasMock.mockReset();
    mocks.addImageToCanvasMock.mockReset();
    mocks.fakeCanvas.clear.mockClear();
    mocks.fakeCanvas.set.mockClear();
    mocks.fakeCanvas.on.mockClear();
    mocks.fakeCanvas.requestRenderAll.mockClear();
    mocks.fakeCanvas.setActiveObject.mockClear();
    mocks.fakeCanvas.toDataURL.mockClear();
    mocks.canvasStoreState.pushHistory.mockClear();
  });

  test('uses the natural background image dimensions so cover backgrounds fill the full canvas', async () => {
    const backgroundObject = {
      id: 'cover-background-image',
      width: undefined,
      height: undefined,
      opacity: 1,
      getElement: () => ({ naturalWidth: 995, naturalHeight: 1600 } as HTMLImageElement),
      set: vi.fn(),
    };
    mocks.addImageToCanvasMock.mockResolvedValue(backgroundObject);

    const project = makeProject();
    project.cover.backgroundImageUrl = 'https://example.com/cover.jpg';

    render(<AdvancedSurfaceEditor surface="cover" project={project} copy={copy} />);

    await waitFor(() => {
      expect(mocks.addImageToCanvasMock).toHaveBeenCalledTimes(1);
    });

    const backgroundSetArgs = backgroundObject.set.mock.calls[0]?.[0];
    expect(backgroundSetArgs.left).toBe(200);
    expect(backgroundSetArgs.top).toBe(300);
    expect(backgroundSetArgs.originX).toBe('center');
    expect(backgroundSetArgs.originY).toBe('center');
    expect(backgroundSetArgs.opacity).toBe(1);
    expect(backgroundSetArgs.scaleX).toBeCloseTo(400 / 995, 5);
    expect(backgroundSetArgs.scaleY).toBeCloseTo(400 / 995, 5);
  });

  test('refreshes the route after saving the rendered cover so preview reads the latest persisted asset', async () => {
    mocks.renderCoverImageActionMock.mockResolvedValue(undefined);

    render(<AdvancedSurfaceEditor surface="cover" project={makeProject()} copy={copy} />);

    fireEvent.click(screen.getByRole('button', { name: /guardar diseño final/i }));

    await waitFor(() => {
      expect(mocks.renderCoverImageActionMock).toHaveBeenCalledTimes(1);
    });

    expect(mocks.routerRefreshMock).toHaveBeenCalledTimes(1);
  });

  test('refreshes the route after saving the rendered back cover so preview reads the latest persisted asset', async () => {
    mocks.renderBackCoverImageActionMock.mockResolvedValue(undefined);

    render(<AdvancedSurfaceEditor surface="back-cover" project={makeProject()} copy={copy} />);

    fireEvent.click(screen.getByRole('button', { name: /guardar diseño final/i }));

    await waitFor(() => {
      expect(mocks.renderBackCoverImageActionMock).toHaveBeenCalledTimes(1);
    });

    expect(mocks.routerRefreshMock).toHaveBeenCalledTimes(1);
  });
});
