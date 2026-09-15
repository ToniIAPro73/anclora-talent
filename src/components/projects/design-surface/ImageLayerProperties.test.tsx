import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { ImageLayerProperties } from './ImageLayerProperties';
import { createDesignLayer, type DesignLayer, type ImageLayerProps } from '@/lib/projects/design-surface';
import { resolveLocaleMessages } from '@/lib/i18n/messages';

const copy = resolveLocaleMessages('es').coverDesignSurface.image;

function makeLayer(overrides: Partial<ImageLayerProps> = {}) {
  return createDesignLayer({ type: 'image', src: 'https://blob.example/a.png', fit: 'cover', ...overrides }, 1) as DesignLayer & ImageLayerProps;
}

describe('ImageLayerProperties', () => {
  test('switching fit fires onChange', () => {
    const onChange = vi.fn();
    render(<ImageLayerProperties layer={makeLayer()} copy={copy} onChange={onChange} onReplaceFile={vi.fn()} />);

    fireEvent.click(screen.getByTestId('image-layer-fit-contain-button'));
    expect(onChange).toHaveBeenCalledWith({ fit: 'contain' });
  });

  test('toggling grayscale sets the filter without touching other filters', () => {
    const onChange = vi.fn();
    const layer = makeLayer({ filters: { brightness: 0.2 } });
    render(<ImageLayerProperties layer={layer} copy={copy} onChange={onChange} onReplaceFile={vi.fn()} />);

    fireEvent.click(screen.getByTestId('image-layer-grayscale-checkbox'));
    expect(onChange).toHaveBeenCalledWith({ filters: { brightness: 0.2, grayscale: true } });
  });

  test('reset filters clears every filter at once', () => {
    const onChange = vi.fn();
    const layer = makeLayer({ filters: { grayscale: true, brightness: 0.5, contrast: 0.3 } });
    render(<ImageLayerProperties layer={layer} copy={copy} onChange={onChange} onReplaceFile={vi.fn()} />);

    fireEvent.click(screen.getByTestId('image-layer-reset-filters-button'));
    expect(onChange).toHaveBeenCalledWith({ filters: {} });
  });

  test('selecting a replacement file calls onReplaceFile', () => {
    const onReplaceFile = vi.fn();
    render(<ImageLayerProperties layer={makeLayer()} copy={copy} onChange={vi.fn()} onReplaceFile={onReplaceFile} />);

    const file = new File(['x'], 'nueva.png', { type: 'image/png' });
    fireEvent.change(screen.getByTestId('image-layer-file-input'), { target: { files: [file] } });
    expect(onReplaceFile).toHaveBeenCalledWith(file);
  });
});
