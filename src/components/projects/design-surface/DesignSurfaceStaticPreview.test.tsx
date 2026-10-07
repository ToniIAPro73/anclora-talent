import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { DesignSurfaceStaticPreview } from './DesignSurfaceStaticPreview';
import { createDesignLayer, createEmptyDesignSurface } from '@/lib/projects/design-surface';

const mocks = vi.hoisted(() => {
  const state = { added: [] as Array<{ id?: string; text?: string }>, zoom: 0, dims: null as null | { width: number; height: number }, textboxes: 0, loaded: [] as string[] };
  class StaticCanvas {
    constructor(_el: unknown, opts: { width: number; height: number }) {
      state.dims = { width: opts.width, height: opts.height };
    }
    add(object: { id?: string }) {
      state.added.push(object);
    }
    setZoom(value: number) {
      state.zoom = value;
    }
    getObjects() {
      return state.added;
    }
    renderAll() {}
    dispose() {}
  }
  const make = (props: Record<string, unknown>) => ({ ...props, set: vi.fn(), setCoords: vi.fn() });
  return {
    state,
    fabric: {
      StaticCanvas,
      Gradient: vi.fn(),
      filters: {},
      Textbox: vi.fn(function Textbox(this: Record<string, unknown>, text: string, props: Record<string, unknown>) {
        state.textboxes += 1;
        Object.assign(this, make({ ...props, text }), { width: props.width, height: 40 });
      }),
      Rect: vi.fn(function Rect(this: Record<string, unknown>, props: Record<string, unknown>) {
        Object.assign(this, make(props));
      }),
      Ellipse: vi.fn(),
      Line: vi.fn(),
      FabricImage: { fromURL: vi.fn(async () => make({ width: 100, height: 100 })) },
    },
  };
});

vi.mock('@/lib/canvas-utils', () => ({ getFabric: vi.fn(async () => mocks.fabric) }));
// Stable identity, like the real useCallback-backed hook: an unstable loadFont would re-run the render effect forever.
const loadFont = (family: string) => {
  mocks.state.loaded.push(family);
  return Promise.resolve('loaded');
};
vi.mock('@/hooks/use-google-fonts', () => ({ useGoogleFonts: () => ({ loadFont }) }));

beforeEach(() => {
  Object.assign(mocks.state, { added: [], zoom: 0, dims: null, textboxes: 0, loaded: [] });
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => 600 });
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, get: () => 800 });
});

function surfaceWithLayers() {
  const surface = createEmptyDesignSurface('cover');
  surface.layers = [
    { ...createDesignLayer({ type: 'text', content: 'Arriba', fontFamily: 'Source Serif 4', x: 24, y: 100, width: 352 }, 5), id: 'top' },
    { ...createDesignLayer({ type: 'shape', shape: 'rect', x: 10, y: 10, width: 50, height: 50 }, 1), id: 'shape' },
    { ...createDesignLayer({ type: 'text', content: 'Oculto', x: 0, y: 0, visible: false }, 9), id: 'hidden' },
    { ...createDesignLayer({ type: 'text', content: 'Medio', x: 36, y: 300, width: 328 }, 3), id: 'mid' },
  ];
  return surface;
}

describe('DesignSurfaceStaticPreview', () => {
  it('renders the canonical surface through the editor hydration path with one uniform scale and the real z-order', async () => {
    render(<DesignSurfaceStaticPreview surface={surfaceWithLayers()} />);
    await waitFor(() => expect(mocks.state.added.length).toBe(3));

    // stage 600x800 minus 2x32 margin: the height is the limit -> min(536/400, 736/600)
    const scale = Math.min((600 - 64) / 400, (800 - 64) / 600);
    expect(mocks.state.zoom).toBeCloseTo(scale, 5);
    expect(mocks.state.dims!.width / mocks.state.dims!.height).toBeCloseTo(400 / 600, 5); // 2:3 preserved
    expect(mocks.state.added.map((object) => object.id)).toEqual(['shape', 'mid', 'top']); // zIndex order, hidden layer skipped
    expect(mocks.state.textboxes).toBe(3); // same Textbox hydration the editor uses (hidden one is built but not drawn)
    expect(screen.getByTestId('cover-preview-paper')).toHaveAttribute('data-preview-scale', String(scale));
  });

  it('loads the real faces before measuring text and publishes the live geometry in surface pixels', async () => {
    render(<DesignSurfaceStaticPreview surface={surfaceWithLayers()} />);
    await waitFor(() => expect(mocks.state.added.length).toBe(3));
    expect(mocks.state.loaded).toContain('Source Serif 4');
    await waitFor(() => {
      const geometry = JSON.parse(screen.getByTestId('cover-preview-paper').getAttribute('data-preview-geometry') ?? '{}');
      expect(geometry.top).toMatchObject({ x: 24, y: 100, width: 352, fontFamily: 'Source Serif 4' });
      expect(geometry.hidden).toBeUndefined();
    });
  });

  it('is independent of any editor zoom: the same surface yields the same geometry at a different stage size', async () => {
    const first = render(<DesignSurfaceStaticPreview surface={surfaceWithLayers()} />);
    await waitFor(() => expect(mocks.state.added.length).toBe(3));
    const geometryA = screen.getByTestId('cover-preview-paper').getAttribute('data-preview-geometry');
    first.unmount();
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, get: () => 300 });
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, get: () => 500 });
    mocks.state.added = [];
    render(<DesignSurfaceStaticPreview surface={surfaceWithLayers()} />);
    await waitFor(() => expect(mocks.state.added.length).toBe(3));
    await waitFor(() => expect(screen.getByTestId('cover-preview-paper').getAttribute('data-preview-geometry')).toBe(geometryA));
  });
});
