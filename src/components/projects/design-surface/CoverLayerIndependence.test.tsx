import { act, render, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AdvancedCoverEditor, patchLayerById } from './AdvancedCoverEditor';
import { createDesignLayer, createEmptyDesignSurface, type DesignSurface } from '@/lib/projects/design-surface';
import { resolveLocaleMessages } from '@/lib/i18n/messages';

/**
 * Regression: "move Title, then move Subtitle -> Title jumps back". The Fabric
 * event handlers are registered once at mount, so they used to report changes
 * through the FIRST render's callback and rebuild the surface from its stale
 * copy. These tests drive the same mount-once handlers the real canvas uses.
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

function makeSurface(): DesignSurface {
  const surface = createEmptyDesignSurface('cover');
  surface.layers = [
    { ...createDesignLayer({ type: 'text', role: 'title', content: 'Título', x: 24, y: 143, width: 352, height: 50 }, 1), id: 'title' },
    { ...createDesignLayer({ type: 'text', role: 'subtitle', content: 'Subtítulo', x: 36, y: 284, width: 328, height: 32 }, 2), id: 'subtitle' },
    { ...createDesignLayer({ type: 'text', role: 'author', content: 'Autor', x: 36, y: 420, width: 328, height: 23 }, 3), id: 'author' },
  ];
  return surface;
}

function Harness({ initial, onSurface }: { initial: DesignSurface; onSurface: (surface: DesignSurface) => void }) {
  const [surface, setSurface] = useState(initial);
  return (
    <AdvancedCoverEditor
      surface={surface}
      onChange={(next) => {
        setSurface(next);
        onSurface(next);
      }}
      copy={copy}
    />
  );
}

function moveObject(id: string, left: number, top: number) {
  const object = mocks.state.objects.find((candidate) => candidate.id === id);
  if (!object) throw new Error(`no canvas object ${id}`);
  object.left = left;
  object.top = top;
  act(() => {
    mocks.state.handlers.get('object:modified')?.({ target: object });
  });
}

function positions(surface: DesignSurface) {
  return Object.fromEntries(surface.layers.map((layer) => [layer.id, [layer.x, layer.y]]));
}

async function setup() {
  let latest = makeSurface();
  render(<Harness initial={latest} onSurface={(next) => (latest = next)} />);
  await waitFor(() => expect(mocks.state.objects).toHaveLength(3));
  return { surface: () => latest };
}

describe('cover layer independence', () => {
  it('moving Subtitle after Title keeps Title exactly where the user left it', async () => {
    const { surface } = await setup();

    moveObject('title', 80, 15);
    expect(positions(surface()).title).toEqual([80, 15]);

    moveObject('subtitle', 120, 200);
    expect(positions(surface())).toEqual({ title: [80, 15], subtitle: [120, 200], author: [36, 420] });
  });

  it('every layer keeps its own X and Y through a chain of moves (including negative X)', async () => {
    const { surface } = await setup();

    moveObject('title', -40, 10);
    moveObject('subtitle', 200, 90);
    moveObject('author', 5, 580);
    moveObject('title', -41, 11); // a second move of the first layer

    expect(positions(surface())).toEqual({ title: [-41, 11], subtitle: [200, 90], author: [5, 580] });
  });

  it('a move changes only the moved layer\'s identity; siblings are the same objects', async () => {
    const { surface } = await setup();
    const before = surface().layers;

    moveObject('author', 60, 500);
    const after = surface().layers;

    expect(after.find((l) => l.id === 'title')).toBe(before.find((l) => l.id === 'title'));
    expect(after.find((l) => l.id === 'subtitle')).toBe(before.find((l) => l.id === 'subtitle'));
    expect(after.find((l) => l.id === 'author')).not.toBe(before.find((l) => l.id === 'author'));
  });
});

describe('patchLayerById', () => {
  it('patches only the targeted id, leaving siblings untouched by reference', () => {
    const layers = makeSurface().layers;
    const patched = patchLayerById(layers, 'subtitle', { x: 99, y: 7 });

    expect(patched.find((l) => l.id === 'subtitle')).toMatchObject({ x: 99, y: 7, content: 'Subtítulo' });
    expect(patched.find((l) => l.id === 'title')).toBe(layers.find((l) => l.id === 'title'));
    expect(patched.find((l) => l.id === 'author')).toBe(layers.find((l) => l.id === 'author'));
    expect(layers.find((l) => l.id === 'subtitle')).toMatchObject({ x: 36, y: 284 }); // input not mutated
  });
});
