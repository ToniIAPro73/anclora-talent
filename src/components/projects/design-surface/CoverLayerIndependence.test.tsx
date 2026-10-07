import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AdvancedCoverEditor, patchLayerById } from './AdvancedCoverEditor';
import { createDesignLayer, createEmptyDesignSurface, type DesignSurface } from '@/lib/projects/design-surface';
import { COVER_TEMPLATES } from '@/lib/projects/cover-templates';
import type { SemanticBinding } from '@/lib/projects/design-surface-templates';
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
    { ...createDesignLayer({ type: 'text', role: 'title', source: 'metadata', content: 'Título', x: 24, y: 143, width: 352, height: 50 }, 1), id: 'title' },
    { ...createDesignLayer({ type: 'text', role: 'subtitle', source: 'metadata', content: 'Subtítulo', x: 36, y: 284, width: 328, height: 32 }, 2), id: 'subtitle' },
    { ...createDesignLayer({ type: 'text', role: 'author', source: 'metadata', content: 'Autor', x: 36, y: 420, width: 328, height: 23 }, 3), id: 'author' },
  ];
  return surface;
}

function Harness({ initial, onSurface, binding }: { initial: DesignSurface; onSurface: (surface: DesignSurface) => void; binding?: SemanticBinding }) {
  const [surface, setSurface] = useState(initial);
  return (
    <AdvancedCoverEditor
      surface={surface}
      onChange={(next) => {
        setSurface(next);
        onSurface(next);
      }}
      copy={copy}
      semanticBinding={binding}
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


const BINDING: SemanticBinding = { title: 'La atención deliberada', subtitle: 'Sistemas para pensar', author: 'María Vega' };
const [TEMPLATE_A, TEMPLATE_B, TEMPLATE_C] = COVER_TEMPLATES;

async function setupWithBinding(initial: DesignSurface = makeSurface()) {
  let latest = initial;
  render(<Harness initial={initial} binding={BINDING} onSurface={(next) => (latest = next)} />);
  await waitFor(() => expect(mocks.state.objects.length).toBeGreaterThan(0));
  return { surface: () => latest };
}

const textOf = (surface: DesignSurface, role: string) => surface.layers.find((l) => l.type === 'text' && l.role === role) as (DesignSurface['layers'][number] & { content: string; source: string; visible: boolean }) | undefined;

describe('applying a cover template', () => {
  beforeEach(() => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  it('materializes every slot with the manuscript content and marks the template active', async () => {
    const { surface } = await setupWithBinding();
    fireEvent.click(screen.getByTestId(`cover-template-card-${TEMPLATE_A.id}`));

    expect(surface().layers).toHaveLength(3);
    expect(textOf(surface(), 'title')).toMatchObject({ content: 'La atención deliberada', source: 'metadata', visible: true });
    expect(textOf(surface(), 'subtitle')).toMatchObject({ content: 'Sistemas para pensar' });
    expect(textOf(surface(), 'author')).toMatchObject({ content: 'María Vega' });
    expect(surface().templateId).toBe(TEMPLATE_A.id);
    expect(screen.getByTestId(`cover-template-card-${TEMPLATE_A.id}`)).toHaveAttribute('data-active', 'true');
    expect(screen.getAllByTestId('cover-template-active-check')).toHaveLength(1);
  });

  it('cancelling the confirmation changes neither the surface nor the active template', async () => {
    const { surface } = await setupWithBinding();
    fireEvent.click(screen.getByTestId(`cover-template-card-${TEMPLATE_A.id}`));
    const applied = surface();

    vi.spyOn(window, 'confirm').mockReturnValue(false);
    fireEvent.click(screen.getByTestId(`cover-template-card-${TEMPLATE_B.id}`));

    expect(surface()).toBe(applied);
    expect(screen.getByTestId(`cover-template-card-${TEMPLATE_A.id}`)).toHaveAttribute('data-active', 'true');
    expect(screen.getByTestId(`cover-template-card-${TEMPLATE_B.id}`)).toHaveAttribute('data-active', 'false');
  });

  it('A -> B -> C -> A keeps the content and the layer identities; the active card follows', async () => {
    const { surface } = await setupWithBinding();
    fireEvent.click(screen.getByTestId(`cover-template-card-${TEMPLATE_A.id}`));
    const ids = surface().layers.map((l) => l.id);
    const contentA = surface().layers.map((l) => (l.type === 'text' ? l.content : ''));

    for (const template of [TEMPLATE_B, TEMPLATE_C, TEMPLATE_A]) {
      fireEvent.click(screen.getByTestId(`cover-template-card-${template.id}`));
      expect(surface().layers.map((l) => l.id)).toEqual(ids);
      expect(surface().layers.map((l) => (l.type === 'text' ? l.content : ''))).toEqual(contentA);
      expect(surface().templateId).toBe(template.id);
      expect(screen.getByTestId(`cover-template-card-${template.id}`)).toHaveAttribute('data-active', 'true');
    }
  });

  it('a title edited on the cover is an override that survives the next template', async () => {
    const { surface } = await setupWithBinding();
    fireEvent.click(screen.getByTestId(`cover-template-card-${TEMPLATE_A.id}`));
    const title = textOf(surface(), 'title')!;

    fireEvent.click(screen.getByTestId(`layer-select-${title.id}`));
    fireEvent.change(screen.getByTestId('text-layer-content-input'), { target: { value: 'Título de portada' } });
    expect(textOf(surface(), 'title')).toMatchObject({ content: 'Título de portada', source: 'manual' });

    fireEvent.click(screen.getByTestId(`cover-template-card-${TEMPLATE_B.id}`));
    expect(textOf(surface(), 'title')).toMatchObject({ content: 'Título de portada', source: 'manual' });
    expect(textOf(surface(), 'subtitle')).toMatchObject({ content: 'Sistemas para pensar', source: 'metadata' });
  });

  it('a selection pointing at a removed layer is cleared', async () => {
    const free = createDesignLayer({ type: 'text', role: 'free', content: 'suelto', x: 5, y: 5 }, 9);
    const start = makeSurface();
    start.layers = [...start.layers, free];
    await setupWithBinding(start);

    fireEvent.click(screen.getByTestId(`layer-select-${free.id}`));
    expect(screen.getByTestId('cover-properties-selection')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId(`cover-template-card-${TEMPLATE_A.id}`));
    expect(screen.queryByTestId('cover-properties-selection')).not.toBeInTheDocument();
    expect(screen.getByTestId('properties-panel-empty')).toBeInTheDocument();
  });
});

describe('layers panel stability', () => {
  it('keeps the same row DOM nodes (no remount) and the same order while selecting and renaming', async () => {
    const { surface } = await setupWithBinding();
    const ids = surface().layers.map((l) => l.id);
    const rows = ids.map((id) => screen.getByTestId(`layer-row-${id}`));
    const orderBefore = screen.getAllByRole('listitem').map((row) => row.getAttribute('data-testid'));

    for (const id of [ids[0], ids[2], ids[1], ids[2], ids[0]]) {
      fireEvent.click(screen.getByTestId(`layer-select-${id}`));
    }
    fireEvent.doubleClick(screen.getByTestId(`layer-name-${ids[1]}`));
    const input = screen.getByTestId(`layer-rename-input-${ids[1]}`);
    expect(input).toHaveClass('cover-layer-row__rename'); // sized to fit inside the row
    expect(rows[1]).toContainElement(input);
    fireEvent.change(input, { target: { value: 'Lema' } });
    fireEvent.blur(input);

    expect(ids.map((id) => screen.getByTestId(`layer-row-${id}`))).toEqual(rows); // same nodes
    expect(screen.getAllByRole('listitem').map((row) => row.getAttribute('data-testid'))).toEqual(orderBefore);
    expect(screen.getAllByRole('listitem')).toHaveLength(ids.length + 1); // + structural cover background row
  });

  it('row actions are an overlay: opening the menu does not add anything to the row layout', async () => {
    const { surface } = await setupWithBinding();
    const id = surface().layers[0].id;
    const row = screen.getByTestId(`layer-row-${id}`);
    const tray = row.querySelector('.cover-layer-actions') as HTMLElement;

    expect(tray).toHaveAttribute('data-open', 'false');
    fireEvent.click(screen.getByTestId(`layer-menu-${id}`));
    expect(tray).toHaveAttribute('data-open', 'true');
    expect(row).toContainElement(tray); // inside the row (absolutely positioned by CSS), not a sibling block
    expect(screen.getAllByRole('listitem')).toHaveLength(surface().layers.length + 1);
  });
});

describe('cover background selection and layering', () => {
  function surfaceWithBackgroundImage(): DesignSurface {
    const start = makeSurface();
    const image = { ...createDesignLayer({ type: 'image', src: 'https://example.com/bg.jpg', x: 0, y: 0, width: start.width, height: start.height }, 1), id: 'bg-image' };
    start.layers = [image, ...start.layers.map((layer, index) => ({ ...layer, zIndex: index + 2 }))];
    return start;
  }

  it('the Layers panel has a "Fondo de portada" row that opens the compact Fondo editor', async () => {
    await setupWithBinding();
    expect(screen.queryByTestId('background-editor')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('layer-select-background'));

    expect(screen.getByTestId('background-editor')).toBeInTheDocument();
    expect(screen.getByTestId('layer-row-background')).toHaveAttribute('data-selected', 'true');
    expect(screen.getByTestId('cover-properties-selection')).toHaveTextContent('Fondo de portada');
    expect(screen.getByTestId('background-kind-solid-button')).toBeInTheDocument();
    expect(screen.getByTestId('background-kind-gradient-button')).toBeInTheDocument();
    expect(screen.getByTestId('background-kind-image-button')).toBeInTheDocument();
  });

  it('clicking empty cover area on the canvas selects the background; selecting a layer leaves it', async () => {
    await setupWithBinding();
    act(() => {
      mocks.state.handlers.get('mouse:down')?.({ target: undefined });
    });
    expect(screen.getByTestId('background-editor')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('layer-select-title'));
    expect(screen.queryByTestId('background-editor')).not.toBeInTheDocument();
    expect(screen.getByTestId('layer-row-background')).toHaveAttribute('data-selected', 'false');
  });

  it('changing the background colour goes through the surface', async () => {
    const { surface } = await setupWithBinding();
    fireEvent.click(screen.getByTestId('layer-select-background'));
    fireEvent.click(screen.getByTestId('background-kind-gradient-button'));
    expect(surface().background.kind).toBe('gradient');
    fireEvent.click(screen.getByTestId('background-kind-solid-button'));
    expect(surface().background).toMatchObject({ kind: 'solid' });
  });

  it('an imported image can be moved behind/above the text with the explicit layering actions', async () => {
    const { surface } = await setupWithBinding(surfaceWithBackgroundImage());
    const z = (id: string) => surface().layers.find((l) => l.id === id)!.zIndex;
    expect(z('bg-image')).toBeLessThan(z('title'));

    fireEvent.click(screen.getByTestId('layer-select-bg-image'));
    fireEvent.click(screen.getByTestId('image-layer-order-front'));
    expect(z('bg-image')).toBeGreaterThan(z('author'));

    fireEvent.click(screen.getByTestId('image-layer-order-back'));
    expect(z('bg-image')).toBeLessThan(z('title'));
    expect(z('title')).toBeLessThan(z('subtitle'));
    expect(z('subtitle')).toBeLessThan(z('author'));

    // Layers panel lists highest zIndex first: author above ... above the image.
    const rowIds = screen.getAllByRole('listitem').map((row) => row.getAttribute('data-testid'));
    expect(rowIds).toEqual(['layer-row-author', 'layer-row-subtitle', 'layer-row-title', 'layer-row-bg-image', 'layer-row-background']);
  });

  it('"Usar como fondo" turns the image into the structural background and removes the layer', async () => {
    const { surface } = await setupWithBinding(surfaceWithBackgroundImage());
    fireEvent.click(screen.getByTestId('layer-select-bg-image'));
    fireEvent.click(screen.getByTestId('image-layer-use-as-background'));

    expect(surface().background).toMatchObject({ kind: 'image', src: 'https://example.com/bg.jpg', fit: 'cover' });
    expect(surface().layers.map((l) => l.id)).toEqual(['title', 'subtitle', 'author']);
    expect(screen.getByTestId('background-editor')).toBeInTheDocument();
  });
});
