import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { forwardRef, type ForwardedRef } from 'react';
import { describe, expect, test, vi, beforeEach } from 'vitest';
import type { ProjectRecord } from '@/lib/projects/types';
import { resolveLocaleMessages } from '@/lib/i18n/messages';
import { createDefaultSurfaceState } from '@/lib/projects/cover-surface';
import { AdvancedSurfaceEditor } from './AdvancedSurfaceEditor';

const mocks = vi.hoisted(() => {
  const renderCoverImageActionMock = vi.fn();
  const renderBackCoverImageActionMock = vi.fn();
  const saveProjectCoverActionMock = vi.fn();
  const saveBackCoverActionMock = vi.fn();
  const routerRefreshMock = vi.fn();
  const routerPushMock = vi.fn();
  const toPngMock = vi.fn(async () => 'data:image/png;base64,dom-preview');
  const addElementMock = vi.fn();
  const clearStoreMock = vi.fn();
  const selectElementMock = vi.fn();
  const setCanvasMock = vi.fn();
  const coverCanvasPropsMock = vi.fn();
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
    saveProjectCoverActionMock,
    saveBackCoverActionMock,
    routerRefreshMock,
    routerPushMock,
    toPngMock,
    addElementMock,
    clearStoreMock,
    selectElementMock,
    setCanvasMock,
    coverCanvasPropsMock,
    fakeCanvas,
    canvasStoreState,
    useCanvasStoreMock,
  };
});

vi.mock('@/lib/projects/actions', () => ({
  renderCoverImageAction: (...args: unknown[]) => mocks.renderCoverImageActionMock(...args),
  renderBackCoverImageAction: (...args: unknown[]) => mocks.renderBackCoverImageActionMock(...args),
  saveProjectCoverAction: (...args: unknown[]) => mocks.saveProjectCoverActionMock(...args),
  saveBackCoverAction: (...args: unknown[]) => mocks.saveBackCoverActionMock(...args),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: mocks.routerRefreshMock,
    push: mocks.routerPushMock,
  }),
}));

vi.mock('@/lib/canvas-store', () => ({
  useCanvasStore: mocks.useCanvasStoreMock,
}));

vi.mock('@/lib/canvas-utils', () => ({
  CANVAS_WIDTH: 400,
  CANVAS_HEIGHT: 600,
  addTextToCanvas: vi.fn(),
}));

vi.mock('html-to-image', () => ({
  toPng: (...args: unknown[]) => mocks.toPngMock(...(args as [])),
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
  createSurfaceSnapshotFromProject: vi.fn((surface: 'cover' | 'back-cover', project: ProjectRecord) => ({
    surface,
    fields: {},
    layers: [],
    opacity:
      surface === 'cover'
        ? project.cover.surfaceState?.opacity ?? 1
        : project.backCover.surfaceState?.opacity ?? 0.24,
  })),
}));

vi.mock('./Canvas', () => ({
  CoverCanvas: forwardRef(function CoverCanvasMock(
    { onCanvasReady, ...props }: { onCanvasReady: (canvas: typeof mocks.fakeCanvas) => void },
    ref: ForwardedRef<HTMLDivElement>,
  ) {
    mocks.coverCanvasPropsMock(props);
    onCanvasReady(mocks.fakeCanvas);
    return <div ref={ref} data-testid="cover-canvas" />;
  }),
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
  if (coverSurface.fields.title) {
    coverSurface.fields.title.value = 'Mi portada';
    coverSurface.fields.title.visible = true;
  }

  const backCoverSurface = createDefaultSurfaceState('back-cover');
  if (backCoverSurface.fields.title) {
    backCoverSurface.fields.title.value = 'Mi contra';
    backCoverSurface.fields.title.visible = true;
  }

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
    mocks.routerPushMock.mockReset();
    mocks.saveProjectCoverActionMock.mockReset();
    mocks.saveBackCoverActionMock.mockReset();
    mocks.toPngMock.mockReset();
    mocks.addElementMock.mockReset();
    mocks.clearStoreMock.mockReset();
    mocks.selectElementMock.mockReset();
    mocks.setCanvasMock.mockReset();
    mocks.coverCanvasPropsMock.mockReset();
    mocks.fakeCanvas.clear.mockClear();
    mocks.fakeCanvas.set.mockClear();
    mocks.fakeCanvas.on.mockClear();
    mocks.fakeCanvas.requestRenderAll.mockClear();
    mocks.fakeCanvas.setActiveObject.mockClear();
    mocks.fakeCanvas.toDataURL.mockClear();
    mocks.canvasStoreState.pushHistory.mockClear();
  });

  test('passes the persisted cover background to the DOM canvas layer with cover-like semantics', async () => {
    const project = makeProject();
    project.cover.backgroundImageUrl = 'https://example.com/cover.jpg';
    project.cover.surfaceState = {
      ...project.cover.surfaceState!,
      opacity: 0.58,
    };

    render(<AdvancedSurfaceEditor surface="cover" project={project} copy={copy} />);

    await waitFor(() => {
      expect(mocks.coverCanvasPropsMock).toHaveBeenCalledTimes(1);
    });

    expect(mocks.coverCanvasPropsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        backgroundImageUrl: 'https://example.com/cover.jpg',
        backgroundImageOpacity: 0.58,
        backgroundColor: '#0b133f',
      }),
    );
  });

  test('passes the persisted back-cover background opacity to the DOM canvas layer', async () => {
    const project = makeProject();
    project.backCover.backgroundImageUrl = 'https://example.com/back-cover.jpg';
    project.backCover.surfaceState = {
      ...project.backCover.surfaceState!,
      opacity: 0.41,
    };

    render(<AdvancedSurfaceEditor surface="back-cover" project={project} copy={copy} />);

    await waitFor(() => {
      expect(mocks.coverCanvasPropsMock).toHaveBeenCalledTimes(1);
    });

    expect(mocks.coverCanvasPropsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        backgroundImageUrl: 'https://example.com/back-cover.jpg',
        backgroundImageOpacity: 0.41,
        backgroundColor: '#0b133f',
      }),
    );
  });

  test('refreshes the route after saving the rendered cover so preview reads the latest persisted asset', async () => {
    mocks.saveProjectCoverActionMock.mockResolvedValue(undefined);
    mocks.renderCoverImageActionMock.mockResolvedValue(undefined);

    render(<AdvancedSurfaceEditor surface="cover" project={makeProject()} copy={copy} />);

    fireEvent.click(screen.getByRole('button', { name: /guardar diseño final/i }));

    await waitFor(() => {
      expect(mocks.renderCoverImageActionMock).toHaveBeenCalledTimes(1);
    });

    expect(mocks.saveProjectCoverActionMock).toHaveBeenCalledTimes(1);
    expect(mocks.toPngMock).toHaveBeenCalledTimes(1);
    expect(mocks.routerRefreshMock).toHaveBeenCalledTimes(1);
    expect(mocks.routerPushMock).not.toHaveBeenCalled();
  });

  test('refreshes the route after saving the rendered back cover so preview reads the latest persisted asset', async () => {
    mocks.saveBackCoverActionMock.mockResolvedValue(undefined);
    mocks.renderBackCoverImageActionMock.mockResolvedValue(undefined);

    render(<AdvancedSurfaceEditor surface="back-cover" project={makeProject()} copy={copy} />);

    fireEvent.click(screen.getByRole('button', { name: /guardar diseño final/i }));

    await waitFor(() => {
      expect(mocks.renderBackCoverImageActionMock).toHaveBeenCalledTimes(1);
    });

    expect(mocks.saveBackCoverActionMock).toHaveBeenCalledTimes(1);
    expect(mocks.toPngMock).toHaveBeenCalledTimes(1);
    expect(mocks.routerRefreshMock).toHaveBeenCalledTimes(1);
    expect(mocks.routerPushMock).not.toHaveBeenCalled();
  });
});
