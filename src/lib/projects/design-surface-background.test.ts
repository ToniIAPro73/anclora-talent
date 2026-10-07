import { describe, expect, it } from 'vitest';
import { createDesignLayer } from './design-surface';
import {
  backgroundScalePercent,
  backgroundToImageLayer,
  centerBackgroundFrame,
  frameForFit,
  imageLayerToBackground,
  isBackgroundOffCanvas,
  patchBackgroundFrame,
  resetBackgroundFrame,
  resolveBackgroundFrame,
  scaleBackgroundToPercent,
  setBackgroundFit,
  type BackgroundImageSpec,
} from './design-surface-background';
import { parseDesignSurfacePayload } from './design-surface-schema';
import { createEmptyDesignSurface } from './design-surface';

const surface = { width: 400, height: 600 };
const natural = { width: 2000, height: 3000 }; // same ratio as the cover
const wide = { width: 3000, height: 2000 };
const base: BackgroundImageSpec = { kind: 'image', src: 'https://example.com/bg.jpg', fit: 'cover', opacity: 1 };

describe('background image framing', () => {
  it('Rellenar fully covers the cover preserving aspect ratio, centred', () => {
    const frame = frameForFit('cover', wide, surface);
    expect(frame.height).toBeCloseTo(600);
    expect(frame.width).toBeCloseTo(900);
    expect(frame.width / frame.height).toBeCloseTo(1.5);
    expect(frame.x).toBeCloseTo(-250);
    expect(frame.y).toBeCloseTo(0);
  });

  it('Ajustar shows the whole image inside the cover', () => {
    const frame = frameForFit('contain', wide, surface);
    expect(frame.width).toBeCloseTo(400);
    expect(frame.height).toBeCloseTo(266.67);
    expect(frame.y).toBeCloseTo(166.67);
  });

  it('Original is 1:1 with the source, centred (may exceed the cover)', () => {
    const frame = frameForFit('original', natural, surface);
    expect(frame).toMatchObject({ width: 2000, height: 3000, x: -800, y: -1200 });
  });

  it('a stored frame wins over the derived one; setting a fit discards it', () => {
    const framed = patchBackgroundFrame(base, natural, surface, { x: -80, y: 24 });
    expect(resolveBackgroundFrame(framed, natural, surface)).toMatchObject({ x: -80, y: 24 });
    expect(setBackgroundFit(framed, 'contain')).toEqual({ ...base, fit: 'contain' });
  });

  it('scale is a percentage of Rellenar and keeps aspect ratio around the centre', () => {
    const scaled = scaleBackgroundToPercent(base, natural, surface, 150);
    const frame = resolveBackgroundFrame(scaled, natural, surface);
    expect(frame.width).toBeCloseTo(600);
    expect(frame.height).toBeCloseTo(900);
    expect(frame.x + frame.width / 2).toBeCloseTo(200);
    expect(frame.y + frame.height / 2).toBeCloseTo(300);
    expect(backgroundScalePercent(scaled, natural, surface)).toBe(150);
  });

  it('Centrar keeps scale; Restablecer returns to the default fill', () => {
    const moved = patchBackgroundFrame(scaleBackgroundToPercent(base, natural, surface, 200), natural, surface, { x: -900, y: 700 });
    const centered = resolveBackgroundFrame(centerBackgroundFrame(moved, natural, surface), natural, surface);
    expect(centered.width).toBeCloseTo(800);
    expect(centered.x).toBeCloseTo(-200);
    expect(centered.y).toBeCloseTo(-300);
    expect(resetBackgroundFrame(moved)).toEqual({ ...base, fit: 'cover' });
  });

  it('detects an image moved completely off the cover', () => {
    expect(isBackgroundOffCanvas({ x: 500, y: 0, width: 400, height: 600, rotation: 0 }, surface)).toBe(true);
    expect(isBackgroundOffCanvas({ x: -80, y: 24, width: 600, height: 900, rotation: 0 }, surface)).toBe(false);
  });
});

describe('use as background / convert back', () => {
  it('a full-bleed image layer becomes the default Rellenar background', () => {
    const layer = createDesignLayer({ type: 'image', src: 'x.png', x: 0, y: 0, width: 400, height: 600, opacity: 0.8 }, 1) as Parameters<typeof imageLayerToBackground>[0];
    expect(imageLayerToBackground(layer, { width: 0, height: 0 }, surface)).toEqual({ kind: 'image', src: 'x.png', fit: 'cover', opacity: 0.8 });
  });

  it('a positioned layer keeps its composed box as the background frame', () => {
    const layer = createDesignLayer({ type: 'image', src: 'x.png', x: 20, y: 40, width: 200, height: 300, rotation: 10 }, 1) as Parameters<typeof imageLayerToBackground>[0];
    const bg = imageLayerToBackground(layer, natural, surface);
    expect(bg.frame).toMatchObject({ x: 20, y: 40, width: 200, height: 300, rotation: 10 });
  });

  it('background -> image layer keeps src, framing, rotation and opacity', () => {
    const framed = { ...patchBackgroundFrame({ ...base, opacity: 0.5 }, natural, surface, { x: -80, y: 24, rotation: 5 }) };
    const layer = backgroundToImageLayer(framed, natural, surface, 3);
    expect(layer).toMatchObject({ type: 'image', src: base.src, x: -80, y: 24, rotation: 5, opacity: 0.5, fit: 'fill', zIndex: 3 });
  });
});

describe('serialization', () => {
  it('the zod schema keeps the frame and the original fit', () => {
    const doc = createEmptyDesignSurface('cover');
    doc.background = { ...patchBackgroundFrame({ ...base, fit: 'original' }, natural, surface, { x: -80, y: 24 }) };
    const result = parseDesignSurfacePayload(doc);
    expect(result.ok).toBe(true);
    const parsed = result.surface!.background as BackgroundImageSpec;
    expect(parsed.fit).toBe('original');
    expect(parsed.frame).toMatchObject({ x: -80, y: 24 });
    expect(JSON.parse(JSON.stringify(parsed))).toEqual(parsed);
  });
});
