import { describe, expect, it } from 'vitest';
import { alignLayers, getLayerBounds } from './layer-geometry';
import { createDesignLayer, type DesignLayer } from './design-surface';

function layer(id: string, x: number, y: number, width = 100, height = 40): DesignLayer {
  return { ...createDesignLayer({ type: 'shape', x, y, width, height }, 1), id };
}

describe('layer geometry alignment', () => {
  it('aligns selected layers to their shared left edge', () => {
    const layers = [layer('a', 10, 20), layer('b', 80, 60), layer('c', 140, 90)];
    expect(alignLayers(layers, ['a', 'b', 'c'], 'left').map((item) => item.x)).toEqual([10, 10, 10]);
  });

  it('centers one selected layer on the surface', () => {
    const layers = [layer('a', 10, 20, 100, 40)];
    expect(alignLayers(layers, ['a'], 'center-horizontal', { width: 400, height: 600 })[0].x).toBe(150);
  });

  it('uses rotated-free layer bounds for group alignment', () => {
    const bounds = getLayerBounds(layer('a', 10, 20, 100, 40));
    expect(bounds).toEqual({ left: 10, top: 20, right: 110, bottom: 60, centerX: 60, centerY: 40 });
  });
});
