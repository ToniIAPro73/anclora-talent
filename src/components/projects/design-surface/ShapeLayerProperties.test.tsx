import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { resolveLocaleMessages } from '@/lib/i18n/messages';
import { createDesignLayer, type DesignLayer, type ShapeLayerProps } from '@/lib/projects/design-surface';
import { ShapeLayerProperties } from './ShapeLayerProperties';

const copy = resolveLocaleMessages('es').coverDesignSurface;

function makeLayer(overrides: Partial<ShapeLayerProps> & Partial<Pick<DesignLayer, 'x' | 'y' | 'width' | 'height' | 'rotation'>> = {}) {
  return createDesignLayer({ type: 'shape', shape: 'rect', fill: '#061629', ...overrides }, 1) as DesignLayer & ShapeLayerProps;
}

describe('ShapeLayerProperties', () => {
  it('edits fill and position independently', () => {
    const onChange = vi.fn();
    render(<ShapeLayerProperties layer={makeLayer({ x: 12 })} copy={copy.shape} onChange={onChange} />);

    fireEvent.click(screen.getByTestId('shape-layer-fill-toggle'));
    fireEvent.click(screen.getByTestId('shape-layer-fill-swatch-f2f2f2'));
    expect(onChange).toHaveBeenCalledWith({ fill: '#f2f2f2' });
    fireEvent.change(screen.getByTestId('shape-layer-x-input'), { target: { value: '-20' } });
    expect(onChange).toHaveBeenCalledWith({ x: -20 });
  });
});
