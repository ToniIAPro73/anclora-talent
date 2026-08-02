import { describe, expect, test } from 'vitest';
import { computeLayerStyle, layerStyleToCss } from './surface-layer-style';
import type { SurfaceLayer } from '@/lib/projects/cover-surface';

describe('surface-layer-style', () => {
  test('resolves cover title defaults from the editorial layout', () => {
    const computed = computeLayerStyle('title', undefined, {
      surface: 'cover',
      palette: 'obsidian',
    });

    expect(computed).not.toBeNull();
    expect(computed?.originX).toBe('center');
    expect(computed?.textAlign).toBe('center');
    expect(computed?.fontWeight).toBe(900);
    expect(computed?.left).toBe(200);
  });

  test('layer overrides win over defaults', () => {
    const layer: SurfaceLayer = {
      id: 'cover-title',
      type: 'text',
      fieldKey: 'title',
      left: 120,
      top: 240,
      width: 300,
      fontSize: 44,
      fontFamily: 'Archivo',
      fill: '#ffffff',
      textAlign: 'left',
    };

    const computed = computeLayerStyle('title', layer, {
      surface: 'cover',
      palette: 'teal',
    });

    expect(computed?.left).toBe(120);
    expect(computed?.top).toBe(240);
    expect(computed?.width).toBe(300);
    expect(computed?.fontSize).toBe(44);
    expect(computed?.fontFamily).toBe('Archivo');
    expect(computed?.fill).toBe('#ffffff');
    expect(computed?.textAlign).toBe('left');
  });

  test('back-cover layers default to left anchored geometry', () => {
    const computed = computeLayerStyle('body', undefined, {
      surface: 'back-cover',
      palette: 'obsidian',
      accentColor: '#4fd1c5',
    });

    expect(computed?.originX).toBe('left');
    expect(computed?.textAlign).toBe('left');
    expect(computed?.fill).toBe('#4fd1c5');
  });

  test('css mapping can never clip text (anti-regression contract)', () => {
    const computed = computeLayerStyle('title', undefined, {
      surface: 'cover',
      palette: 'obsidian',
    });
    const css = layerStyleToCss(computed!);

    // The historical Fabric bug clipped long titles ("NUNCA M" instead of
    // "NUNCA MÁS EN LA SOMBRA"). The DOM layer must always wrap and grow.
    expect(css.whiteSpace).toBe('pre-wrap');
    expect(css.overflow).toBe('visible');
    expect(css.overflowWrap).toBe('break-word');
    expect(css).not.toHaveProperty('maxHeight');
    expect(css).not.toHaveProperty('height');
    expect(css.position).toBe('absolute');
    expect(css.width).toMatch(/%$/);
  });

  test('css anchor matches the export renderer convention', () => {
    const centered = layerStyleToCss(
      computeLayerStyle('title', undefined, { surface: 'cover', palette: 'obsidian' })!,
    );
    expect(centered.transform).toBe('translate(-50%, -50%)');

    const left = layerStyleToCss(
      computeLayerStyle('body', undefined, {
        surface: 'back-cover',
        palette: 'obsidian',
      })!,
    );
    expect(left.transform).toBe('translate(0, -50%)');
  });
});
