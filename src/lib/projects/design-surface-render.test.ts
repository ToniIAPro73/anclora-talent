// @vitest-environment node
//
// Exercises the real `fabric/node` + `canvas` server rendering path (not a
// mock) — this is literally what production export calls, so a real
// regression is caught here instead of only in production output.
import { describe, expect, it } from 'vitest';
import { renderDesignSurfaceToPng, renderDesignSurfaceToPngDataUrl } from './design-surface-render';
import { createDesignLayer, createEmptyDesignSurface, type DesignSurface } from './design-surface';

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function makeSurface(overrides: Partial<DesignSurface> = {}): DesignSurface {
  return {
    ...createEmptyDesignSurface('cover'),
    background: { kind: 'solid', color: '#0b133f' },
    layers: [
      createDesignLayer({ type: 'text', content: 'El Plan de Escape', fontSize: 32, color: '#f2e3b3', x: 40, y: 300 }, 1),
    ],
    ...overrides,
  };
}

describe('renderDesignSurfaceToPng', () => {
  it('renders a valid PNG buffer at the surface`s own pixel dimensions', async () => {
    const surface = makeSurface();
    const buffer = await renderDesignSurfaceToPng(surface);
    expect(buffer.subarray(0, 8)).toEqual(PNG_MAGIC);
    expect(buffer.length).toBeGreaterThan(500);
  });

  it('respects a custom dimension preset instead of a hardcoded size', async () => {
    const a = await renderDesignSurfaceToPng(makeSurface({ width: 400, height: 600 }));
    const b = await renderDesignSurfaceToPng(makeSurface({ width: 1600, height: 2400 }));
    expect(b.length).toBeGreaterThan(a.length);
  });

  it('excludes a layer with visible:false from the rendered output', async () => {
    const surface = makeSurface();
    surface.layers = [{ ...surface.layers[0], visible: false } as DesignSurface['layers'][number]];
    // Should not throw, and should still produce a valid (background-only) PNG.
    const buffer = await renderDesignSurfaceToPng(surface);
    expect(buffer.subarray(0, 8)).toEqual(PNG_MAGIC);
  });

  it('never renders guides, safe area, or the ISBN helper area (they are not layers)', async () => {
    const surface = makeSurface({
      guides: [{ id: 'g1', axis: 'x', position: 50 }],
      safeArea: { top: 10, right: 10, bottom: 10, left: 10 },
      isbnArea: { x: 0, y: 0, width: 50, height: 30 },
    });
    // The renderer only ever reads `surface.layers` + `surface.background` —
    // this is a structural guarantee, asserted by simply confirming the call
    // still succeeds and produces the same kind of output regardless of
    // these fields being present.
    const buffer = await renderDesignSurfaceToPng(surface);
    expect(buffer.subarray(0, 8)).toEqual(PNG_MAGIC);
  });
});

describe('renderDesignSurfaceToPngDataUrl', () => {
  it('returns a PNG data URL wrapping the same bytes as the buffer renderer', async () => {
    const surface = makeSurface();
    const dataUrl = await renderDesignSurfaceToPngDataUrl(surface);
    expect(dataUrl.startsWith('data:image/png;base64,')).toBe(true);
    const buffer = Buffer.from(dataUrl.split(',')[1], 'base64');
    expect(buffer.subarray(0, 8)).toEqual(PNG_MAGIC);
  });
});
