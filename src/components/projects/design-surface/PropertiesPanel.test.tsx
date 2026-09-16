import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { PropertiesPanel } from './PropertiesPanel';
import { createDesignLayer } from '@/lib/projects/design-surface';
import { resolveLocaleMessages } from '@/lib/i18n/messages';

const copy = resolveLocaleMessages('es').coverDesignSurface;

describe('PropertiesPanel', () => {
  test('no selection shows the empty state', () => {
    render(<PropertiesPanel selectedLayers={[]} copy={copy} onLayerChange={vi.fn()} onReplaceImage={vi.fn()} />);
    expect(screen.getByTestId('properties-panel-empty')).toHaveTextContent(copy.noSelection);
  });

  test('multiple layers selected shows the multi-selection state, not the first layer editor', () => {
    const layers = [createDesignLayer({ type: 'text' }, 1), createDesignLayer({ type: 'text' }, 2)];
    render(<PropertiesPanel selectedLayers={layers} copy={copy} onLayerChange={vi.fn()} onReplaceImage={vi.fn()} />);
    expect(screen.getByTestId('properties-panel-multi')).toHaveTextContent(copy.multiSelection);
    expect(screen.queryByTestId('text-layer-properties')).not.toBeInTheDocument();
  });

  test('a single selected text layer renders the text properties editor', () => {
    const layer = createDesignLayer({ type: 'text', content: 'Título' }, 1);
    render(<PropertiesPanel selectedLayers={[layer]} copy={copy} onLayerChange={vi.fn()} onReplaceImage={vi.fn()} />);
    expect(screen.getByTestId('text-layer-properties')).toBeInTheDocument();
    expect(screen.getByTestId('text-layer-content-input')).toHaveValue('Título');
  });

  test('a single selected image layer renders the image properties editor', () => {
    const layer = createDesignLayer({ type: 'image', src: 'https://blob.example/a.png' }, 1);
    render(<PropertiesPanel selectedLayers={[layer]} copy={copy} onLayerChange={vi.fn()} onReplaceImage={vi.fn()} />);
    expect(screen.getByTestId('image-layer-properties')).toBeInTheDocument();
  });

  test('forwards the matching metadataValues entry to the text layer as a confirmed sync action', () => {
    const onLayerChange = vi.fn();
    const layer = createDesignLayer({ type: 'text', role: 'title', content: 'Mi proyecto' }, 1);
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(
      <PropertiesPanel
        selectedLayers={[layer]}
        copy={copy}
        onLayerChange={onLayerChange}
        onReplaceImage={vi.fn()}
        metadataValues={{ title: 'El Plan de Escape' }}
      />,
    );

    fireEvent.click(screen.getByTestId('text-layer-sync-from-metadata-button'));
    expect(onLayerChange).toHaveBeenCalledWith(layer.id, { content: 'El Plan de Escape', source: 'metadata' });
    confirmSpy.mockRestore();
  });
});
