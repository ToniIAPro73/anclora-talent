import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AdvancedCoverEditor } from './AdvancedCoverEditor';
import { createDesignLayer, createEmptyDesignSurface, type DesignSurface } from '@/lib/projects/design-surface';
import { resolveLocaleMessages } from '@/lib/i18n/messages';

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
    expect(screen.getByTestId('advanced-editor-layers-column')).toBeInTheDocument();
    expect(screen.getByTestId('advanced-editor-canvas-column')).toBeInTheDocument();
    expect(screen.getByTestId('advanced-editor-properties-column')).toBeInTheDocument();
    expect(screen.getByTestId('advanced-editor-status-bar')).toBeInTheDocument();
    await waitFor(() => expect(mocks.state.objects).toHaveLength(1));
  });

  it('undo/redo start disabled with a freshly mounted surface', () => {
    render(<AdvancedCoverEditor surface={makeSurfaceWithTitle()} onChange={vi.fn()} copy={copy} />);
    expect(screen.getByTestId('advanced-editor-undo-button')).toBeDisabled();
    expect(screen.getByTestId('advanced-editor-redo-button')).toBeDisabled();
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
});
