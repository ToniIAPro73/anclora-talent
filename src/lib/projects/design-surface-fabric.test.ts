// @vitest-environment node
//
// Exercises the real `fabric/node` build (not a mock) — this is the exact
// server rendering path the structured export renderer (Fase G) will use,
// so a real regression here (a Fabric API fabric/node doesn't support, a
// filter that silently no-ops server-side, ...) is caught now instead of
// only in production exports. `@vitest-environment node` opts this one file
// out of the project's default jsdom environment, since fabric/node expects
// a real Node canvas backend, not jsdom's browser shims.
import { describe, expect, it } from 'vitest';
import {
  applyBackgroundToCanvas,
  hydrateFabricLayerObject,
  hydrateFabricLayers,
  normalizeFabricObjectScale,
  readLayerPatchFromFabricObject,
} from './design-surface-fabric';
import { createDesignLayer, createEmptyDesignSurface, type DesignSurface } from './design-surface';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- fabric/node's own .d.ts is stricter than its runtime API (e.g. StaticCanvas(null, ...) and toDataURL({format}) both work at runtime, per the earlier verified spike); matches this codebase's established loose-fabric-typing convention (canvas-utils.ts#getFabric).
async function loadFabric(): Promise<any> {
  return import('fabric/node');
}

describe('design-surface-fabric (real fabric/node)', () => {
  it('hydrates a text layer into a Fabric Textbox with the right typography', async () => {
    const fabric = await loadFabric();
    const layer = createDesignLayer(
      { type: 'text', content: 'El Plan de Escape', fontSize: 32, fontWeight: 900, color: '#f2e3b3', x: 20, y: 40, width: 200, height: 60, rotation: 8 },
      1,
    );

    const object = await hydrateFabricLayerObject(fabric, layer);
    expect(object.id).toBe(layer.id);
    expect(object.text).toBe('El Plan de Escape');
    expect(object.fontSize).toBe(32);
    expect(object.fontWeight).toBe(900);
    expect(object.fill).toBe('#f2e3b3');
    expect(object.left).toBe(20);
    expect(object.top).toBe(40);
    expect(object.angle).toBe(8);
  });

  it('applies uppercase/lowercase text-transform to the rendered string, not the persisted content', async () => {
    const fabric = await loadFabric();
    const layer = createDesignLayer({ type: 'text', content: 'autor demo', textTransform: 'uppercase' }, 1);
    const object = await hydrateFabricLayerObject(fabric, layer);
    expect(object.text).toBe('AUTOR DEMO');
  });

  it('hydrates a shape layer (rect) with fill/stroke', async () => {
    const fabric = await loadFabric();
    const layer = createDesignLayer({ type: 'shape', shape: 'rect', fill: '#d4af37', width: 120, height: 60 }, 1);
    const object = await hydrateFabricLayerObject(fabric, layer);
    expect(object.fill).toBe('#d4af37');
    expect(object.width).toBe(120);
    expect(object.height).toBe(60);
  });

  it('renders a full surface (background + text + shape) to a valid PNG buffer', async () => {
    const fabric = await loadFabric();
    const surface: DesignSurface = {
      ...createEmptyDesignSurface('cover'),
      background: { kind: 'solid', color: '#0b133f' },
      layers: [
        createDesignLayer({ type: 'shape', shape: 'rect', fill: '#d4af37', x: 100, y: 100, width: 120, height: 60, rotation: 15 }, 1),
        createDesignLayer({ type: 'text', content: 'El Plan de Escape', fontSize: 32, color: '#f2e3b3', x: 40, y: 300, rotation: -5 }, 2),
      ],
    };

    const canvas = new fabric.StaticCanvas(null, { width: surface.width, height: surface.height });
    await applyBackgroundToCanvas(fabric, canvas, surface.background, surface);
    const objects = await hydrateFabricLayers(fabric, surface);
    for (const object of objects.values()) canvas.add(object);
    canvas.renderAll();

    const dataUrl = canvas.toDataURL({ format: 'png' });
    const buffer = Buffer.from(dataUrl.split(',')[1], 'base64');
    expect(buffer.subarray(0, 8)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    expect(buffer.length).toBeGreaterThan(500);
  });

  it('applies grayscale + brightness + contrast filters to an image layer server-side', async () => {
    const fabric = await loadFabric();
    // Build a tiny in-memory source image via the same node-canvas backend
    // fabric itself uses — no network fetch needed for the test.
    const source = new fabric.StaticCanvas(null, { width: 20, height: 20 });
    source.backgroundColor = '#ff0000';
    source.renderAll();
    const sourceDataUrl = source.toDataURL({ format: 'png' });

    const layer = createDesignLayer(
      { type: 'image', src: sourceDataUrl, width: 20, height: 20, filters: { grayscale: true, brightness: 0.1, contrast: 0.1 } },
      1,
    );

    const object = await hydrateFabricLayerObject(fabric, layer);
    expect(object).not.toBeNull();
    expect(object.filters.length).toBe(3);
  });

  it('hydrates an image crop as a non-destructive source frame', async () => {
    const fabric = await loadFabric();
    const source = new fabric.StaticCanvas(null, { width: 80, height: 60 });
    source.backgroundColor = '#ff0000';
    source.renderAll();
    const layer = createDesignLayer(
      { type: 'image', src: source.toDataURL({ format: 'png' }), width: 80, height: 60, crop: { x: 10, y: 5, width: 40, height: 30 } },
      1,
    );
    const object = await hydrateFabricLayerObject(fabric, layer);
    expect(object.cropX).toBe(10);
    expect(object.cropY).toBe(5);
    expect(object.width).toBe(40);
    expect(object.height).toBe(30);
    expect(object.scaleX).toBe(2);
    expect(object.scaleY).toBe(2);
  });

  it('readLayerPatchFromFabricObject folds scale back into width/height', async () => {
    const fabric = await loadFabric();
    const layer = createDesignLayer({ type: 'shape', shape: 'rect', width: 100, height: 50 }, 1);
    const object = await hydrateFabricLayerObject(fabric, layer);
    object.set({ scaleX: 2, scaleY: 1.5, angle: 30, opacity: 0.5, left: 10, top: 20 });

    const patch = readLayerPatchFromFabricObject(object);
    expect(patch).toEqual({ x: 10, y: 20, width: 200, height: 75, rotation: 30, opacity: 0.5 });
  });

  it('normalizeFabricObjectScale resets scale to 1 after folding it into width/height', async () => {
    const fabric = await loadFabric();
    const layer = createDesignLayer({ type: 'shape', shape: 'rect', width: 100, height: 50 }, 1);
    const object = await hydrateFabricLayerObject(fabric, layer);
    object.set({ scaleX: 2, scaleY: 1.5 });

    normalizeFabricObjectScale(object);
    expect(object.scaleX).toBe(1);
    expect(object.scaleY).toBe(1);
    expect(object.width).toBe(200);
    expect(object.height).toBe(75);
  });

  it('readLayerPatchFromFabricObject extracts text content for text layers', async () => {
    const fabric = await loadFabric();
    const layer = createDesignLayer({ type: 'text', content: 'Original Text', width: 100, height: 50 }, 1);
    const object = await hydrateFabricLayerObject(fabric, layer);
    object.set({ text: 'Updated Text Directly In Fabric' });

    const patch = readLayerPatchFromFabricObject(object);
    expect((patch as { content?: string }).content).toBe('Updated Text Directly In Fabric');
  });
});
