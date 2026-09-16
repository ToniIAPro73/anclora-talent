import { describe, expect, it } from 'vitest';
import { parseDesignSurfacePayload } from './design-surface-schema';
import { createDesignLayer, createEmptyDesignSurface } from './design-surface';

describe('parseDesignSurfacePayload', () => {
  it('accepts a real DesignSurface produced by createEmptyDesignSurface/createDesignLayer', () => {
    const surface = createEmptyDesignSurface('cover');
    surface.layers = [createDesignLayer({ type: 'text', content: 'Título', role: 'title', source: 'manual' }, 1)];
    const result = parseDesignSurfacePayload(surface);
    expect(result.ok).toBe(true);
    expect(result.surface?.layers).toHaveLength(1);
  });

  it('rejects a payload with the wrong version', () => {
    const surface = { ...createEmptyDesignSurface('cover'), version: 1 };
    const result = parseDesignSurfacePayload(surface);
    expect(result.ok).toBe(false);
  });

  it('rejects an arbitrary object (not a DesignSurface at all)', () => {
    const result = parseDesignSurfacePayload({ hello: 'world' });
    expect(result.ok).toBe(false);
  });

  it('rejects null/undefined/primitives', () => {
    expect(parseDesignSurfacePayload(null).ok).toBe(false);
    expect(parseDesignSurfacePayload(undefined).ok).toBe(false);
    expect(parseDesignSurfacePayload('not an object').ok).toBe(false);
    expect(parseDesignSurfacePayload(42).ok).toBe(false);
  });

  it('rejects a layer with an out-of-range opacity (defense against a corrupted or malicious client payload)', () => {
    const surface = createEmptyDesignSurface('cover');
    surface.layers = [{ ...createDesignLayer({ type: 'text', role: 'title', source: 'manual' }, 1), opacity: 5 }];
    expect(parseDesignSurfacePayload(surface).ok).toBe(false);
  });

  it('rejects a background image src that is neither a URL, a data:image URL, nor empty', () => {
    const surface = createEmptyDesignSurface('cover');
    surface.background = { kind: 'image', src: 'javascript:alert(1)', fit: 'cover', opacity: 1 };
    expect(parseDesignSurfacePayload(surface).ok).toBe(false);
  });

  it('accepts an empty image src (an image layer with nothing uploaded yet)', () => {
    const surface = createEmptyDesignSurface('cover');
    surface.layers = [createDesignLayer({ type: 'image', src: '' }, 1)];
    expect(parseDesignSurfacePayload(surface).ok).toBe(true);
  });

  it('rejects a gradient with fewer than two stops', () => {
    const surface = createEmptyDesignSurface('cover');
    surface.background = { kind: 'gradient', angle: 0, stops: [{ color: '#fff', offset: 0 }] };
    expect(parseDesignSurfacePayload(surface).ok).toBe(false);
  });

  it('caps the number of layers to guard against a pathological payload', () => {
    const surface = createEmptyDesignSurface('cover');
    surface.layers = Array.from({ length: 201 }, (_, i) => createDesignLayer({ type: 'text', role: 'free' }, i + 1));
    expect(parseDesignSurfacePayload(surface).ok).toBe(false);
  });

  it('accepts a real back-cover surface with an image layer and filters', () => {
    const surface = createEmptyDesignSurface('back-cover');
    surface.layers = [
      createDesignLayer({ type: 'image', src: 'https://blob.example/a.png', filters: { grayscale: true, brightness: 0.2 } }, 1),
    ];
    expect(parseDesignSurfacePayload(surface).ok).toBe(true);
  });
});
