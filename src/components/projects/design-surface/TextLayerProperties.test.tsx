import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { TextLayerProperties } from './TextLayerProperties';
import { createDesignLayer, type DesignLayer, type TextLayerProps } from '@/lib/projects/design-surface';
import { resolveLocaleMessages } from '@/lib/i18n/messages';

const copy = resolveLocaleMessages('es').coverDesignSurface;

function makeLayer(overrides: Partial<TextLayerProps> = {}) {
  return createDesignLayer({ type: 'text', content: 'Título', fontWeight: 400, fontStyle: 'normal', textDecoration: 'none', ...overrides }, 1) as DesignLayer & TextLayerProps;
}

describe('TextLayerProperties', () => {
  test('editing content fires onChange with the new text', () => {
    const onChange = vi.fn();
    render(<TextLayerProperties layer={makeLayer()} copy={copy} onChange={onChange} />);

    fireEvent.change(screen.getByTestId('text-layer-content-input'), { target: { value: 'Nuevo título' } });
    expect(onChange).toHaveBeenCalledWith({ content: 'Nuevo título' });
  });

  test('bold toggle turns on from a non-bold weight', () => {
    const onChange = vi.fn();
    render(<TextLayerProperties layer={makeLayer({ fontWeight: 400 })} copy={copy} onChange={onChange} />);

    fireEvent.click(screen.getByTestId('text-layer-bold-button'));
    expect(onChange).toHaveBeenCalledWith({ fontWeight: 700 });
  });

  test('underline toggle turns on from none', () => {
    const onChange = vi.fn();
    render(<TextLayerProperties layer={makeLayer({ textDecoration: 'none' })} copy={copy} onChange={onChange} />);

    fireEvent.click(screen.getByTestId('text-layer-underline-button'));
    expect(onChange).toHaveBeenCalledWith({ textDecoration: 'underline' });
  });

  test('text-transform buttons switch case handling', () => {
    const onChange = vi.fn();
    render(<TextLayerProperties layer={makeLayer({ textTransform: 'none' })} copy={copy} onChange={onChange} />);

    fireEvent.click(screen.getByTestId('text-layer-transform-uppercase-button'));
    expect(onChange).toHaveBeenCalledWith({ textTransform: 'uppercase' });
  });

  test('numeric fields (x/y/width/height/rotation) are all exposed and editable', () => {
    const onChange = vi.fn();
    const layer = makeLayer({});
    render(<TextLayerProperties layer={{ ...layer, x: 10, y: 20, width: 150, height: 40, rotation: 8 }} copy={copy} onChange={onChange} />);

    expect(screen.getByTestId('text-layer-x-input')).toHaveValue(10);
    expect(screen.getByTestId('text-layer-y-input')).toHaveValue(20);
    expect(screen.getByTestId('text-layer-width-input')).toHaveValue(150);
    expect(screen.getByTestId('text-layer-height-input')).toHaveValue(40);
    expect(screen.getByTestId('text-layer-rotation-input')).toHaveValue(8);

    fireEvent.change(screen.getByTestId('text-layer-rotation-input'), { target: { value: '45' } });
    expect(onChange).toHaveBeenCalledWith({ rotation: 45 });
  });
});
