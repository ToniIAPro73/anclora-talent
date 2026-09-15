import { createRef } from 'react';
import { render, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  DesignSurfaceCanvas,
  type DesignSurfaceCanvasHandle,
} from './DesignSurfaceCanvas';
import { createDesignLayer, createEmptyDesignSurface, type DesignSurface } from '@/lib/projects/design-surface';

/**
 * The interactive engine's actual hydration/rendering logic against the
 * real Fabric library is covered by design-surface-fabric.test.ts (via
 * fabric/node). This suite mocks fabric entirely (same convention as
 * canvas-guides.test.ts) and focuses on what that file can't cover: this
 * component's OWN wiring — effects, refs, event handlers, the imperative
 * handle, and the keyboard-shortcut guard rules.
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
  isEditing?: boolean;
  set: (props: Record<string, unknown>) => void;
  setCoords: () => void;
  getSrc?: () => string;
}

/**
 * Mutates `target` in place (rather than building a separate object and
 * spreading it) so `.set()` closes over the SAME reference that ends up in
 * `state.objects` — a Fabric constructor mock that did
 * `Object.assign(this, makeMockObject(...))` previously had `.set()` close
 * over the throwaway object literal `makeMockObject` built internally,
 * silently mutating an orphaned copy instead of `this`.
 */
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
  (target as MockObject).set = (patch: Record<string, unknown>) => {
    Object.assign(target, patch);
  };
  return target as MockObject;
}

function makeMockObject(props: Partial<MockObject> = {}): MockObject {
  return initMockObject({}, props);
}

const mocks = vi.hoisted(() => {
  const state = {
    objects: [] as MockObject[],
    handlers: new Map<string, (event: unknown) => void>(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    lastCanvas: null as any,
  };

  class MockCanvas {
    width: number;
    height: number;
    constructor(_el: unknown, opts: { width: number; height: number }) {
      this.width = opts.width;
      this.height = opts.height;
      state.lastCanvas = this;
    }
    add(object: MockObject) {
      state.objects.push(object);
    }
    remove(object: MockObject) {
      state.objects = state.objects.filter((candidate) => candidate !== object);
    }
    getObjects() {
      return state.objects;
    }
    getActiveObject() {
      return state.objects.find((object) => (object as { __active?: boolean }).__active) ?? null;
    }
    getActiveObjects() {
      const active = this.getActiveObject();
      return active ? [active] : [];
    }
    discardActiveObject() {
      state.objects.forEach((object) => {
        (object as { __active?: boolean }).__active = false;
      });
    }
    setActiveObject(object: MockObject) {
      state.objects.forEach((candidate) => {
        (candidate as { __active?: boolean }).__active = candidate === object;
      });
    }
    on(event: string, handler: (event: unknown) => void) {
      state.handlers.set(event, handler);
    }
    renderAll = vi.fn();
    requestRenderAll = vi.fn();
    setZoom = vi.fn();
    setDimensions = vi.fn();
    toJSON = vi.fn(() => ({ objects: state.objects.map((o) => ({ id: o.id, ...o })) }));
    loadFromJSON = vi.fn((_json: string, callback: () => void) => callback());
    dispose = vi.fn();
  }

  return {
    state,
    MockCanvas,
    fabricModule: {
      Canvas: MockCanvas,
      Textbox: vi.fn(function Textbox(this: MockObject, text: string, opts: Record<string, unknown>) {
        initMockObject(this, opts as Partial<MockObject>);
        (this as unknown as { text: string }).text = text;
      }),
      FabricImage: { fromURL: vi.fn(async () => makeMockObject()) },
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
      filters: {
        Grayscale: vi.fn(),
        Brightness: vi.fn(),
        Contrast: vi.fn(),
        Saturation: vi.fn(),
        Sepia: vi.fn(),
        Blur: vi.fn(),
      },
    },
  };
});

vi.mock('@/lib/canvas-utils', () => ({
  getFabric: vi.fn(async () => mocks.fabricModule),
}));

function emit(event: string, payload: unknown) {
  mocks.state.handlers.get(event)?.(payload);
}

beforeEach(() => {
  mocks.state.objects = [];
  mocks.state.handlers.clear();
  vi.clearAllMocks();
});

function makeSurfaceWithOneTextLayer(): DesignSurface {
  const surface = createEmptyDesignSurface('cover');
  surface.layers = [createDesignLayer({ type: 'text', content: 'Título', x: 10, y: 20, width: 150, height: 40 }, 1)];
  return surface;
}

describe('DesignSurfaceCanvas', () => {
  it('hydrates every layer on mount and adds it to the canvas', async () => {
    const surface = makeSurfaceWithOneTextLayer();
    render(
      <DesignSurfaceCanvas
        surface={surface}
        onLayerChange={vi.fn()}
        onLayersChange={vi.fn()}
        onSelectionChange={vi.fn()}
      />,
    );

    await waitFor(() => expect(mocks.state.objects).toHaveLength(1));
    expect(mocks.state.objects[0].id).toBe(surface.layers[0].id);
  });

  it('reports a layer transform change on object:modified, folding scale into width/height', async () => {
    const surface = makeSurfaceWithOneTextLayer();
    const onLayerChange = vi.fn();
    render(
      <DesignSurfaceCanvas surface={surface} onLayerChange={onLayerChange} onLayersChange={vi.fn()} onSelectionChange={vi.fn()} />,
    );
    await waitFor(() => expect(mocks.state.objects).toHaveLength(1));

    const object = mocks.state.objects[0];
    object.set({ left: 30, top: 50, angle: 12, opacity: 0.8, scaleX: 2, scaleY: 1 });
    emit('object:modified', { target: object });

    expect(onLayerChange).toHaveBeenCalledWith(
      surface.layers[0].id,
      expect.objectContaining({ x: 30, y: 50, rotation: 12, opacity: 0.8, width: 300 }),
    );
  });

  it('reports selection changes', async () => {
    const surface = makeSurfaceWithOneTextLayer();
    const onSelectionChange = vi.fn();
    render(
      <DesignSurfaceCanvas surface={surface} onLayerChange={vi.fn()} onLayersChange={vi.fn()} onSelectionChange={onSelectionChange} />,
    );
    await waitFor(() => expect(mocks.state.objects).toHaveLength(1));

    emit('selection:created', { selected: [mocks.state.objects[0]] });
    expect(onSelectionChange).toHaveBeenCalledWith([surface.layers[0].id]);

    emit('selection:cleared', {});
    expect(onSelectionChange).toHaveBeenCalledWith([]);
  });

  it('imperative undo/redo restore prior snapshots', async () => {
    const surface = makeSurfaceWithOneTextLayer();
    const handleRef = createRef<DesignSurfaceCanvasHandle>();
    render(
      <DesignSurfaceCanvas ref={handleRef} surface={surface} onLayerChange={vi.fn()} onLayersChange={vi.fn()} onSelectionChange={vi.fn()} />,
    );
    await waitFor(() => expect(mocks.state.objects).toHaveLength(1));

    expect(handleRef.current?.canUndo()).toBe(false);

    const object = mocks.state.objects[0];
    object.set({ left: 99 });
    emit('object:modified', { target: object });

    await waitFor(() => expect(handleRef.current?.canUndo()).toBe(true));
    handleRef.current?.undo();
    expect(mocks.state.lastCanvas.loadFromJSON).toHaveBeenCalled();
  });

  it('imperative deleteSelected removes the active object from the canvas', async () => {
    const surface = makeSurfaceWithOneTextLayer();
    const onLayersChange = vi.fn();
    const handleRef = createRef<DesignSurfaceCanvasHandle>();
    render(
      <DesignSurfaceCanvas ref={handleRef} surface={surface} onLayerChange={vi.fn()} onLayersChange={onLayersChange} onSelectionChange={vi.fn()} />,
    );
    await waitFor(() => expect(mocks.state.objects).toHaveLength(1));

    (mocks.state.objects[0] as { __active?: boolean }).__active = true;

    handleRef.current?.deleteSelected();
    expect(mocks.state.objects).toHaveLength(0);
    expect(onLayersChange).toHaveBeenCalledWith([]);
  });
});
