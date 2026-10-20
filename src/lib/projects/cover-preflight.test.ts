import { describe, expect, it } from 'vitest';
import { createDesignLayer, createEmptyDesignSurface } from './design-surface';
import { analyzeCoverPreflight, contrastRatio } from './cover-preflight';

describe('cover preflight', () => {
  it('reports advisory overflow, safe-area, ISBN, small-text, and contrast issues', async () => {
    const surface = createEmptyDesignSurface('back-cover');
    surface.width = 100;
    surface.height = 100;
    surface.safeArea = { top: 10, right: 10, bottom: 10, left: 10 };
    surface.isbnArea = { x: 80, y: 80, width: 15, height: 15 };
    surface.background = { kind: 'solid', color: '#ffffff' };
    surface.layers = [{ ...createDesignLayer({
      type: 'text', role: 'body', name: 'Sinopsis', content: 'Texto', color: '#ffffff', fontSize: 9,
      x: 88, y: 88, width: 20, height: 20,
    }, 1), id: 'body-layer' }];

    const issues = await analyzeCoverPreflight(surface);

    expect(issues.map((issue) => issue.id)).toEqual(expect.arrayContaining([
      'overflow:body-layer', 'safe-area:body-layer', 'isbn:body-layer', 'small-text:body-layer', 'contrast:body-layer',
    ]));
  });

  it('warns when an image has fewer source pixels than its canvas dimensions', async () => {
    const surface = createEmptyDesignSurface('cover');
    surface.layers = [{ ...createDesignLayer({ type: 'image', src: 'https://assets.test/low.png', width: 300, height: 200 }, 1), id: 'image-layer' }];

    const issues = await analyzeCoverPreflight(surface, async () => ({ width: 120, height: 80 }));

    expect(issues.map((issue) => issue.id)).toContain('image-resolution:image-layer');
  });

  it('uses a known contrast ratio and does not guess for unsupported colors', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBe(21);
    expect(contrastRatio('var(--text-primary)', '#ffffff')).toBeNull();
  });
});
