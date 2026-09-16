import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { LayersPanel, buildLayersPanelCopy, reorderLayers } from './LayersPanel';
import { createDesignLayer, type DesignLayer } from '@/lib/projects/design-surface';
import { resolveLocaleMessages } from '@/lib/i18n/messages';

const copy = buildLayersPanelCopy(resolveLocaleMessages('es').coverDesignSurface);

function makeLayers(): DesignLayer[] {
  return [
    createDesignLayer({ type: 'text', content: 'Título' }, 1),
    createDesignLayer({ type: 'image', src: 'https://blob.example/a.png' }, 2),
    createDesignLayer({ type: 'shape', shape: 'rect' }, 3),
  ];
}

describe('LayersPanel', () => {
  test('empty state when there are no layers', () => {
    render(
      <LayersPanel
        layers={[]}
        selectedLayerIds={[]}
        copy={copy}
        onSelect={vi.fn()}
        onRename={vi.fn()}
        onToggleVisibility={vi.fn()}
        onToggleLock={vi.fn()}
        onDuplicate={vi.fn()}
        onDelete={vi.fn()}
        onReorder={vi.fn()}
      />,
    );
    expect(screen.getByTestId('layers-panel-empty')).toBeInTheDocument();
  });

  test('lists layers front-most (highest zIndex) first', () => {
    const layers = makeLayers();
    render(
      <LayersPanel
        layers={layers}
        selectedLayerIds={[]}
        copy={copy}
        onSelect={vi.fn()}
        onRename={vi.fn()}
        onToggleVisibility={vi.fn()}
        onToggleLock={vi.fn()}
        onDuplicate={vi.fn()}
        onDelete={vi.fn()}
        onReorder={vi.fn()}
      />,
    );
    const rows = screen.getAllByRole('listitem');
    expect(rows[0]).toHaveAttribute('data-testid', `layer-row-${layers[2].id}`);
    expect(rows[2]).toHaveAttribute('data-testid', `layer-row-${layers[0].id}`);
  });

  test('clicking a row selects it; shift-click reports additive selection', () => {
    const layers = makeLayers();
    const onSelect = vi.fn();
    render(
      <LayersPanel
        layers={layers}
        selectedLayerIds={[]}
        copy={copy}
        onSelect={onSelect}
        onRename={vi.fn()}
        onToggleVisibility={vi.fn()}
        onToggleLock={vi.fn()}
        onDuplicate={vi.fn()}
        onDelete={vi.fn()}
        onReorder={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByTestId(`layer-select-${layers[0].id}`), { shiftKey: true });
    expect(onSelect).toHaveBeenCalledWith(layers[0].id, { additive: true });
  });

  test('visibility, lock, duplicate and delete buttons fire their callbacks', () => {
    const layers = makeLayers();
    const onToggleVisibility = vi.fn();
    const onToggleLock = vi.fn();
    const onDuplicate = vi.fn();
    const onDelete = vi.fn();
    render(
      <LayersPanel
        layers={layers}
        selectedLayerIds={[]}
        copy={copy}
        onSelect={vi.fn()}
        onRename={vi.fn()}
        onToggleVisibility={onToggleVisibility}
        onToggleLock={onToggleLock}
        onDuplicate={onDuplicate}
        onDelete={onDelete}
        onReorder={vi.fn()}
      />,
    );

    const layerId = layers[0].id;
    fireEvent.click(screen.getByTestId(`layer-visibility-${layerId}`));
    fireEvent.click(screen.getByTestId(`layer-lock-${layerId}`));
    fireEvent.click(screen.getByTestId(`layer-duplicate-${layerId}`));
    fireEvent.click(screen.getByTestId(`layer-delete-${layerId}`));

    expect(onToggleVisibility).toHaveBeenCalledWith(layerId);
    expect(onToggleLock).toHaveBeenCalledWith(layerId);
    expect(onDuplicate).toHaveBeenCalledWith(layerId);
    expect(onDelete).toHaveBeenCalledWith(layerId);
  });

  test('the front-most layer cannot move up or to front; the back-most cannot move down or to back', () => {
    const layers = makeLayers();
    render(
      <LayersPanel
        layers={layers}
        selectedLayerIds={[]}
        copy={copy}
        onSelect={vi.fn()}
        onRename={vi.fn()}
        onToggleVisibility={vi.fn()}
        onToggleLock={vi.fn()}
        onDuplicate={vi.fn()}
        onDelete={vi.fn()}
        onReorder={vi.fn()}
      />,
    );

    const frontMost = layers[2].id; // zIndex 3, listed first
    const backMost = layers[0].id; // zIndex 1, listed last

    expect(screen.getByTestId(`layer-move-up-${frontMost}`)).toBeDisabled();
    expect(screen.getByTestId(`layer-front-${frontMost}`)).toBeDisabled();
    expect(screen.getByTestId(`layer-move-down-${backMost}`)).toBeDisabled();
    expect(screen.getByTestId(`layer-back-${backMost}`)).toBeDisabled();
  });

  test('renaming: double-click enters edit mode, blur commits the new name', () => {
    const layers = makeLayers();
    const onRename = vi.fn();
    render(
      <LayersPanel
        layers={layers}
        selectedLayerIds={[]}
        copy={copy}
        onSelect={vi.fn()}
        onRename={onRename}
        onToggleVisibility={vi.fn()}
        onToggleLock={vi.fn()}
        onDuplicate={vi.fn()}
        onDelete={vi.fn()}
        onReorder={vi.fn()}
      />,
    );

    const layerId = layers[0].id;
    fireEvent.doubleClick(screen.getByTestId(`layer-name-${layerId}`));
    const input = screen.getByTestId(`layer-rename-input-${layerId}`);
    fireEvent.change(input, { target: { value: 'Mi título personalizado' } });
    fireEvent.blur(input);

    expect(onRename).toHaveBeenCalledWith(layerId, 'Mi título personalizado');
  });
});

describe('reorderLayers', () => {
  test('front/back reassign zIndex for every layer, keeping relative order otherwise', () => {
    const layers: DesignLayer[] = [
      createDesignLayer({ type: 'shape', shape: 'rect' }, 1),
      createDesignLayer({ type: 'shape', shape: 'rect' }, 2),
      createDesignLayer({ type: 'shape', shape: 'rect' }, 3),
    ];
    const [a, b, c] = layers;

    const sentToBack = reorderLayers(layers, c.id, 'back');
    expect(sentToBack.find((l) => l.id === c.id)?.zIndex).toBe(1);
    expect(sentToBack.find((l) => l.id === a.id)?.zIndex).toBe(2);
    expect(sentToBack.find((l) => l.id === b.id)?.zIndex).toBe(3);

    const broughtToFront = reorderLayers(layers, a.id, 'front');
    expect(broughtToFront.find((l) => l.id === a.id)?.zIndex).toBe(3);
  });

  test('up/down swap with the neighboring layer only', () => {
    const layers: DesignLayer[] = [
      createDesignLayer({ type: 'shape', shape: 'rect' }, 1),
      createDesignLayer({ type: 'shape', shape: 'rect' }, 2),
      createDesignLayer({ type: 'shape', shape: 'rect' }, 3),
    ];
    const [a, b] = layers;

    const moved = reorderLayers(layers, a.id, 'up');
    expect(moved.find((l) => l.id === a.id)?.zIndex).toBe(2);
    expect(moved.find((l) => l.id === b.id)?.zIndex).toBe(1);
  });
});
