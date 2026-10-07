import { describe, expect, it } from 'vitest';
import { createDesignLayer } from '@/lib/projects/design-surface';
import { normalizeLayerPatch } from './layer-patch';

describe('normalizeLayerPatch', () => {
  const author = createDesignLayer({ type: 'text', role: 'author', source: 'metadata', content: 'María Vega', textTransform: 'uppercase' }, 1);
  const title = createDesignLayer({ type: 'text', role: 'title', source: 'metadata', content: 'Mi título' }, 2);
  const free = createDesignLayer({ type: 'text', role: 'free', source: 'manual', content: 'texto' }, 3);

  it('drops Fabric\'s echoed (transformed) content: dragging an uppercase layer is not an edit', () => {
    expect(normalizeLayerPatch(author, { x: 10, y: 20, content: 'MARÍA VEGA' } as never)).toEqual({ x: 10, y: 20 });
  });

  it('drops an unchanged content echo', () => {
    expect(normalizeLayerPatch(title, { x: 1, content: 'Mi título' } as never)).toEqual({ x: 1 });
  });

  it('a real edit of a role slot becomes a cover-specific override', () => {
    expect(normalizeLayerPatch(title, { content: 'Otro' } as never)).toEqual({ content: 'Otro', source: 'manual' });
  });

  it('sync-from-metadata keeps the explicit source it asks for', () => {
    expect(normalizeLayerPatch(title, { content: 'Del documento', source: 'metadata' } as never)).toEqual({ content: 'Del documento', source: 'metadata' });
  });

  it('free text and non-text layers are untouched', () => {
    expect(normalizeLayerPatch(free, { content: 'nuevo' } as never)).toEqual({ content: 'nuevo' });
    const image = createDesignLayer({ type: 'image', src: 'x' }, 4);
    expect(normalizeLayerPatch(image, { x: 5 })).toEqual({ x: 5 });
  });
});
