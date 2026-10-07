import { describe, expect, it } from 'vitest';
import { createDesignLayer, type DesignLayer } from './design-surface';
import { alignLayers, distributeLayers } from './layer-geometry';
import { expandSelectionToGroups, groupLayers, ungroupLayers } from './layer-groups';
import { bleedInset, resolveSafeArea } from './cover-print-guides';

const shape = (id: string, x: number, y: number, width: number, height: number): DesignLayer => ({
  ...createDesignLayer({ type: 'shape', shape: 'rect', x, y, width, height }, 1),
  id,
});

describe('distribution', () => {
  const layers = [shape('a', 0, 0, 50, 20), shape('b', 100, 40, 30, 20), shape('c', 300, 90, 50, 20)];

  it('leaves equal horizontal gaps; the outer two layers stay put', () => {
    const next = distributeLayers(layers, ['a', 'b', 'c'], 'horizontal');
    const [a, b, c] = ['a', 'b', 'c'].map((id) => next.find((layer) => layer.id === id)!);
    expect([a.x, c.x]).toEqual([0, 300]);
    // span 350 - widths 130 = 220 / 2 gaps = 110
    expect(b.x - (a.x + a.width)).toBeCloseTo(110);
    expect(c.x - (b.x + b.width)).toBeCloseTo(110);
  });

  it('distributes vertically and ignores a selection of fewer than three', () => {
    const vertical = distributeLayers(layers, ['a', 'b', 'c'], 'vertical');
    const [a, b, c] = ['a', 'b', 'c'].map((id) => vertical.find((layer) => layer.id === id)!);
    expect(b.y - (a.y + a.height)).toBeCloseTo(c.y - (b.y + b.height));
    expect(distributeLayers(layers, ['a', 'b'], 'horizontal')).toBe(layers);
  });

  it('multi-selection alignment uses the selection bounds', () => {
    const next = alignLayers(layers, ['a', 'c'], 'right');
    expect(next.find((layer) => layer.id === 'a')!.x).toBe(300);
  });
});

describe('groups', () => {
  const layers = [shape('a', 10, 10, 50, 50), shape('b', 100, 10, 50, 50), shape('c', 200, 10, 50, 50)];

  it('grouping tags the members only and never touches geometry', () => {
    const grouped = groupLayers(layers, ['a', 'b'], 'g1');
    expect(grouped.filter((layer) => layer.groupId === 'g1').map((layer) => layer.id)).toEqual(['a', 'b']);
    expect(grouped.map((layer) => [layer.x, layer.y, layer.width, layer.height])).toEqual(layers.map((layer) => [layer.x, layer.y, layer.width, layer.height]));
    expect(groupLayers(layers, ['a'], 'g1')).toBe(layers); // a group needs two members
  });

  it('selecting one member selects the whole group', () => {
    const grouped = groupLayers(layers, ['a', 'b'], 'g1');
    expect(expandSelectionToGroups(grouped, ['b'])).toEqual(['a', 'b']);
    expect(expandSelectionToGroups(grouped, ['c'])).toEqual(['c']);
    const already = ['a', 'b'];
    expect(expandSelectionToGroups(grouped, already)).toBe(already);
  });

  it('ungroup restores free layers with the same geometry; grouping a group merges', () => {
    const grouped = groupLayers(layers, ['a', 'b'], 'g1');
    const ungrouped = ungroupLayers(grouped, ['a', 'b']);
    expect(ungrouped.some((layer) => layer.groupId)).toBe(false);
    expect(ungrouped).toEqual(layers);
    const merged = groupLayers(grouped, ['a', 'c'], 'g2');
    expect(merged.map((layer) => layer.groupId)).toEqual(['g2', 'g2', 'g2']);
  });

  it('groupId survives the surface schema (save/reload)', async () => {
    const { parseDesignSurfacePayload } = await import('./design-surface-schema');
    const { createEmptyDesignSurface } = await import('./design-surface');
    const surface = createEmptyDesignSurface('cover');
    surface.layers = groupLayers(layers, ['a', 'b'], 'g1');
    const parsed = parseDesignSurfacePayload(JSON.parse(JSON.stringify({ ...surface, layers: surface.layers.map((layer) => ({ ...layer, flipX: layer.id === 'a' ? true : undefined })) })));
    expect(parsed.ok).toBe(true);
    expect(parsed.surface!.layers.map((layer) => layer.groupId)).toEqual(['g1', 'g1', undefined]);
    expect(parsed.surface!.layers[0].flipX).toBe(true);
  });
});

describe('print guides', () => {
  it('the trim line sits 3mm inside the bleed edge and the safe area 5mm inside the trim', () => {
    const inset = bleedInset(400);
    expect(inset).toBeCloseTo((3 * 400) / 152.4, 1);
    const safe = resolveSafeArea({ width: 400 });
    expect(safe.left).toBeCloseTo((8 * 400) / 152.4, 1);
    expect(safe.left).toBeGreaterThan(inset);
  });

  it('a safe area defined on the surface wins', () => {
    expect(resolveSafeArea({ width: 400, safeArea: { top: 1, right: 2, bottom: 3, left: 4 } })).toEqual({ top: 1, right: 2, bottom: 3, left: 4 });
  });
});
