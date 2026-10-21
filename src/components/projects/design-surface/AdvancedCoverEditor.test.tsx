import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AdvancedCoverEditor } from './AdvancedCoverEditor';
import { createDesignLayer, createEmptyDesignSurface, type DesignSurface } from '@/lib/projects/design-surface';
import { resolveLocaleMessages } from '@/lib/i18n/messages';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Same fabric-mocking approach as DesignSurfaceCanvas.test.tsx (this
 * component mounts one) — focuses on the ASSEMBLY: does selecting a layer
 * in the layers panel drive the properties panel, do toolbar actions call
 * through to the canvas, does the layout expose every mission §31 region.
 */

interface MockObject {
  id?: string;
  left: number;
  top: number;
  width: number;
  height: number;
  angle: number;
  opacity: number;
  scaleX: number;
  scaleY: number;
  visible: boolean;
  selectable: boolean;
  evented: boolean;
  set: (props: Record<string, unknown>) => void;
  setCoords: () => void;
}

function initMockObject(target: Partial<MockObject>, props: Partial<MockObject> = {}): MockObject {
  Object.assign(target, {
    left: 0,
    top: 0,
    width: 100,
    height: 40,
    angle: 0,
    opacity: 1,
    scaleX: 1,
    scaleY: 1,
    visible: true,
    selectable: true,
    evented: true,
    setCoords: vi.fn(),
    ...props,
  });
  (target as MockObject).set = (patch: Record<string, unknown>) => Object.assign(target, patch);
  return target as MockObject;
}

const mocks = vi.hoisted(() => {
  const state = { objects: [] as MockObject[], handlers: new Map<string, (event: unknown) => void>() };

  class MockCanvas {
    width: number;
    height: number;
    constructor(_el: unknown, opts: { width: number; height: number }) {
      this.width = opts.width;
      this.height = opts.height;
    }
    add(object: MockObject) {
      state.objects.push(object);
    }
    remove(object: MockObject) {
      state.objects = state.objects.filter((o) => o !== object);
    }
    getObjects() {
      return state.objects;
    }
    getActiveObject() {
      return null;
    }
    getActiveObjects() {
      return [];
    }
    discardActiveObject() {}
    setActiveObject() {}
    on(event: string, handler: (event: unknown) => void) {
      state.handlers.set(event, handler);
    }
    renderAll = vi.fn();
    requestRenderAll = vi.fn();
    setZoom = vi.fn();
    setDimensions = vi.fn();
    toJSON = vi.fn(() => ({ objects: state.objects }));
    loadFromJSON = vi.fn((_json: string, callback: () => void) => callback());
    dispose = vi.fn();
  }

  return {
    state,
    fabricModule: {
      Canvas: MockCanvas,
      Textbox: vi.fn(function Textbox(this: MockObject, text: string, opts: Record<string, unknown>) {
        initMockObject(this, opts as Partial<MockObject>);
        (this as unknown as { text: string }).text = text;
      }),
      FabricImage: { fromURL: vi.fn(async () => initMockObject({})) },
      Rect: vi.fn(function Rect(this: MockObject, opts: Record<string, unknown>) {
        initMockObject(this, opts as Partial<MockObject>);
      }),
      Ellipse: vi.fn(function Ellipse(this: MockObject, opts: Record<string, unknown>) {
        initMockObject(this, opts as Partial<MockObject>);
      }),
      Line: vi.fn(function Line(this: MockObject, _points: number[], opts: Record<string, unknown>) {
        initMockObject(this, opts as Partial<MockObject>);
      }),
      Gradient: vi.fn(),
      filters: { Grayscale: vi.fn(), Brightness: vi.fn(), Contrast: vi.fn(), Saturation: vi.fn(), Sepia: vi.fn(), Blur: vi.fn() },
    },
  };
});

vi.mock('@/lib/canvas-utils', () => ({ getFabric: vi.fn(async () => mocks.fabricModule) }));
vi.mock('fabric', () => ({
  Line: vi.fn(function Line(this: Record<string, unknown>) {
    this.set = vi.fn();
  }),
  Text: vi.fn(function Text(this: Record<string, unknown>) {
    this.set = vi.fn();
  }),
}));

// jsdom has no ResizeObserver.
class ResizeObserverStub {
  observe() {}
  disconnect() {}
}
vi.stubGlobal('ResizeObserver', ResizeObserverStub);

const copy = resolveLocaleMessages('es').coverDesignSurface;

beforeEach(() => {
  mocks.state.objects = [];
  mocks.state.handlers.clear();
});

function makeSurfaceWithTitle(): DesignSurface {
  const surface = createEmptyDesignSurface('cover');
  surface.layers = [createDesignLayer({ type: 'text', content: 'El Plan de Escape', x: 10, y: 20, width: 150, height: 40 }, 1)];
  return surface;
}

describe('AdvancedCoverEditor', () => {
  it('renders the mission §31 layout regions', async () => {
    render(<AdvancedCoverEditor surface={makeSurfaceWithTitle()} onChange={vi.fn()} copy={copy} />);
    expect(screen.getByTestId('advanced-editor-tools-column')).toBeInTheDocument();
    expect(screen.getByTestId('advanced-editor-layers-column')).toBeInTheDocument();
    expect(screen.getByTestId('advanced-editor-canvas-column')).toBeInTheDocument();
    expect(screen.getByTestId('advanced-editor-properties-column')).toBeInTheDocument();
    expect(screen.getByTestId('advanced-editor-layers-column')).toContainElement(screen.getByTestId('layers-panel'));
    expect(screen.getByTestId('advanced-editor-properties-column')).not.toContainElement(screen.getByTestId('layers-panel'));
    expect(screen.getByTestId('advanced-editor-layer-count')).toBeInTheDocument();
    await waitFor(() => expect(mocks.state.objects).toHaveLength(1));
  });

  it('keeps canvas tools and dimensions beneath the compact layer list and opens full layer management', () => {
    render(<AdvancedCoverEditor surface={makeSurfaceWithTitle()} onChange={vi.fn()} copy={copy} />);
    const rail = screen.getByTestId('advanced-editor-layers-column');
    expect(screen.getByTestId('advanced-editor-canvas-column').querySelector('.cover-canvas-header')).toBeNull();
    expect(rail.querySelector('.cover-canvas-header')).toBeInTheDocument();
    expect(rail).toContainElement(screen.getByTestId('advanced-editor-canvas-tools'));
    expect(rail).toContainElement(screen.getByTestId('advanced-editor-layer-count'));
    expect(screen.getByTestId('advanced-editor-layer-list')).toHaveAttribute('data-compact', 'true');
    expect(screen.getByTestId('advanced-editor-layer-list')).toHaveClass('cover-layer-list-compact');
    expect(screen.getByTestId('advanced-editor-canvas-options-group')).toHaveAttribute('role', 'group');
    expect(screen.getByTestId('advanced-editor-canvas-alignment-group')).toHaveAttribute('role', 'group');
    expect(screen.getByTestId('advanced-editor-manage-layers')).toHaveAttribute('aria-label', copy.workspace.manageLayers);
    expect(screen.getByTestId('advanced-editor-manage-layers').textContent).toBe('');
    fireEvent.click(screen.getByTestId('advanced-editor-manage-layers'));
    expect(screen.getByRole('dialog', { name: copy.workspace.layers })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: copy.toolbar.closeLabel })).toHaveFocus();
    expect(screen.getByTestId('advanced-editor-layer-list-dialog')).toHaveAttribute('data-compact', 'false');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: copy.workspace.layers })).not.toBeInTheDocument();
    expect(screen.getByTestId('advanced-editor-manage-layers')).toHaveFocus();
  });

  it('does not render a redundant canvas title or dimension label', () => {
    const surface = makeSurfaceWithTitle();
    surface.width = 512;
    surface.height = 768;
    render(<AdvancedCoverEditor surface={surface} onChange={vi.fn()} copy={copy} />);
    expect(screen.queryByText('512 × 768 px')).not.toBeInTheDocument();
    expect(screen.queryByText(copy.workspace.canvasLabel)).not.toBeInTheDocument();
  });

  it('uses a surface-specific label for the background import action', () => {
    const cover = makeSurfaceWithTitle();
    const { unmount } = render(<AdvancedCoverEditor surface={cover} onChange={vi.fn()} copy={copy} />);
    expect(screen.getByTestId('cover-editor-import-button')).toHaveTextContent(copy.workspace.importCover);
    unmount();

    const backCover = makeSurfaceWithTitle();
    backCover.surface = 'back-cover';
    render(<AdvancedCoverEditor surface={backCover} onChange={vi.fn()} copy={copy} />);
    expect(screen.getByTestId('cover-editor-import-button')).toHaveTextContent(copy.workspace.importBackCover);
  });

  it('replaces the active composition with a flattened image after confirmation', async () => {
    const surface = makeSurfaceWithTitle();
    const onChange = vi.fn();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    class FailedImageLoad {
      onerror: (() => void) | null = null;
      naturalWidth = 0;
      naturalHeight = 0;
      set src(_value: string) { this.onerror?.(); }
    }
    vi.stubGlobal('Image', FailedImageLoad);
    render(<AdvancedCoverEditor surface={surface} onChange={onChange} copy={copy} />);

    fireEvent.change(screen.getByTestId('cover-editor-import-file-input'), { target: { files: [new File(['image'], 'cover.png', { type: 'image/png' })] } });
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      layers: [],
      guides: [],
      background: expect.objectContaining({ kind: 'image', fit: 'cover' }),
    })));
    expect(confirmSpy).toHaveBeenCalledWith(copy.workspace.replaceImportedCoverConfirm);
    confirmSpy.mockRestore();
    vi.unstubAllGlobals();
  });

  it('does not replace a composition when raster import confirmation is cancelled', async () => {
    const onChange = vi.fn();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<AdvancedCoverEditor surface={makeSurfaceWithTitle()} onChange={onChange} copy={copy} />);
    fireEvent.change(screen.getByTestId('cover-editor-import-file-input'), { target: { files: [new File(['image'], 'cover.png', { type: 'image/png' })] } });
    expect(confirmSpy).toHaveBeenCalledWith(copy.workspace.replaceImportedCoverConfirm);
    expect(onChange).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it('keeps the properties heading and selected layer label in one compact header row', async () => {
    const surface = makeSurfaceWithTitle();
    render(<AdvancedCoverEditor surface={surface} onChange={vi.fn()} copy={copy} />);
    await waitFor(() => expect(mocks.state.objects).toHaveLength(1));
    fireEvent.click(screen.getByTestId(`layer-select-${surface.layers[0].id}`));

    const header = screen.getByTestId('advanced-editor-properties-header');
    expect(header).toContainElement(screen.getByRole('heading', { name: copy.workspace.properties }));
    expect(header).toContainElement(screen.getByTestId('cover-properties-selection'));
  });

  it('styles active inspector toggles with the left rail accent treatment', () => {
    const css = readFileSync(resolve(process.cwd(), 'src/app/globals.css'), 'utf8');
    expect(css).toContain('.cover-prop-icon[data-active="true"]::before');
    expect(css).toContain('.cover-prop-segmented button { height: 28px !important;');
    expect(css).toContain('body:has([data-testid="cover-studio-v2"]) .talent-legal-footer { display: none; }');
    expect(css).toContain('.cover-properties-body { flex: 1 1 0; min-height: 0; padding: 3px 10px 6px; overflow-y: auto;');
  });

  it('marks selected canvas toggles with the same left accent language as the tool rail', () => {
    const css = readFileSync(resolve(process.cwd(), 'src/app/globals.css'), 'utf8');
    expect(css).toContain('.cover-toolbar-icon[data-active="true"]::before');
    expect(css).toContain('.cover-editor-tool[data-active="true"]::before');
  });

  it('renders supplied package actions in the compact workspace toolbar', () => {
    render(
      <AdvancedCoverEditor
        surface={makeSurfaceWithTitle()}
        onChange={vi.fn()}
        copy={copy}
        toolbarActions={<button type="button" data-testid="test-toolbar-action">Export</button>}
      />,
    );
    expect(screen.getByTestId('cover-workspace-toolbar')).toContainElement(screen.getByTestId('test-toolbar-action'));
  });

  it('undo/redo start disabled with a freshly mounted surface', () => {
    render(<AdvancedCoverEditor surface={makeSurfaceWithTitle()} onChange={vi.fn()} copy={copy} toolbarActions={<button type="button" data-testid="cover-package-import-button">Import JSON</button>} />);
    expect(screen.getByTestId('advanced-editor-undo-button')).toBeDisabled();
    expect(screen.getByTestId('advanced-editor-redo-button')).toBeDisabled();
    expect(screen.getByTestId('advanced-editor-undo-button').textContent?.trim()).toBe('');
    expect(screen.getByTestId('advanced-editor-redo-button').textContent?.trim()).toBe('');
    const actions = screen.getByTestId('cover-package-import-button').closest('.cover-workspace-toolbar__file-actions');
    expect(actions).toContainElement(screen.getByTestId('advanced-editor-undo-button'));
    expect(actions).toContainElement(screen.getByTestId('advanced-editor-redo-button'));
    expect(screen.getByTestId('advanced-editor-layers-column').querySelector('[data-testid="cover-editor-history-controls"]')).not.toBeInTheDocument();
  });

  it('selecting a layer in the layers panel shows its properties', async () => {
    const surface = makeSurfaceWithTitle();
    render(<AdvancedCoverEditor surface={surface} onChange={vi.fn()} copy={copy} />);
    await waitFor(() => expect(mocks.state.objects).toHaveLength(1));

    expect(screen.getByTestId('properties-panel-empty')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId(`layer-select-${surface.layers[0].id}`));
    expect(screen.getByTestId('text-layer-properties')).toBeInTheDocument();
  });

  it('editing a property from the panel calls onChange with the patched layer', async () => {
    const surface = makeSurfaceWithTitle();
    const onChange = vi.fn();
    render(<AdvancedCoverEditor surface={surface} onChange={onChange} copy={copy} />);
    await waitFor(() => expect(mocks.state.objects).toHaveLength(1));

    fireEvent.click(screen.getByTestId(`layer-select-${surface.layers[0].id}`));
    fireEvent.change(screen.getByTestId('text-layer-content-input'), { target: { value: 'Nuevo título' } });

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        layers: [expect.objectContaining({ content: 'Nuevo título' })],
      }),
    );
  });

  it('keeps object alignment controls separate and aligns a selected object to the canvas', async () => {
    const surface = makeSurfaceWithTitle();
    const onChange = vi.fn();
    render(<AdvancedCoverEditor surface={surface} onChange={onChange} copy={copy} />);
    await waitFor(() => expect(mocks.state.objects).toHaveLength(1));

    fireEvent.click(screen.getByTestId(`layer-select-${surface.layers[0].id}`));
    fireEvent.click(screen.getByTestId('advanced-editor-object-align-center-horizontal-button'));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ layers: [expect.objectContaining({ x: 125 })] }));
  });

  it('the Shapes tool adds a centred rectangle (not a full-bleed overlay)', () => {
    const onChange = vi.fn();
    render(<AdvancedCoverEditor surface={createEmptyDesignSurface('cover')} onChange={onChange} copy={copy} />);

    fireEvent.click(screen.getByTestId('cover-tool-button-shapes'));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ layers: [expect.objectContaining({ type: 'shape', shape: 'rect', width: 180, height: 110 })] }),
    );
  });

  it('the snap toggle button reflects its active state', () => {
    render(<AdvancedCoverEditor surface={makeSurfaceWithTitle()} onChange={vi.fn()} copy={copy} />);
    const toggle = screen.getByTestId('advanced-editor-snap-toggle');
    expect(toggle).toHaveAttribute('data-active', 'true');
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('data-active', 'false');
  });

  it('deleting a layer from the panel updates the surface via onChange', async () => {
    const surface = makeSurfaceWithTitle();
    const onChange = vi.fn();
    render(<AdvancedCoverEditor surface={surface} onChange={onChange} copy={copy} />);
    await waitFor(() => expect(mocks.state.objects).toHaveLength(1));

    fireEvent.click(screen.getByTestId(`layer-delete-${surface.layers[0].id}`));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ layers: [] }));
  });

  it('offers no reset-to-original button when the surface has no origin asset', () => {
    render(<AdvancedCoverEditor surface={makeSurfaceWithTitle()} onChange={vi.fn()} copy={copy} />);
    expect(screen.queryByTestId('advanced-editor-reset-to-original-button')).not.toBeInTheDocument();
  });

  it('reset-to-original asks for confirmation and, once confirmed, restores the original background and clears layers', async () => {
    const surface = makeSurfaceWithTitle();
    surface.originAssetId = 'asset-1';
    surface.originMode = 'edit-original';
    const onChange = vi.fn();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(
      <AdvancedCoverEditor surface={surface} onChange={onChange} copy={copy} originalBackgroundSrc="data:image/png;base64,AAA" />,
    );
    await waitFor(() => expect(mocks.state.objects).toHaveLength(1));

    fireEvent.click(screen.getByTestId('advanced-editor-reset-to-original-button'));
    expect(confirmSpy).toHaveBeenCalled();
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        layers: [],
        background: { kind: 'image', src: 'data:image/png;base64,AAA', fit: 'cover', opacity: 1, originalUncropped: true },
      }),
    );
    confirmSpy.mockRestore();
  });

  it('reset-to-original does nothing when the user cancels the confirmation', async () => {
    const surface = makeSurfaceWithTitle();
    surface.originAssetId = 'asset-1';
    const onChange = vi.fn();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

    render(
      <AdvancedCoverEditor surface={surface} onChange={onChange} copy={copy} originalBackgroundSrc="data:image/png;base64,AAA" />,
    );
    await waitFor(() => expect(mocks.state.objects).toHaveLength(1));

    fireEvent.click(screen.getByTestId('advanced-editor-reset-to-original-button'));
    expect(onChange).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });
});
