import type { DesignLayer } from './design-surface';

export interface LayerBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
  centerX: number;
  centerY: number;
}

export type LayerAlignment =
  | 'left'
  | 'center-horizontal'
  | 'right'
  | 'top'
  | 'center-vertical'
  | 'bottom';

export function getLayerBounds(layer: Pick<DesignLayer, 'x' | 'y' | 'width' | 'height'>): LayerBounds {
  const right = layer.x + layer.width;
  const bottom = layer.y + layer.height;
  return { left: layer.x, top: layer.y, right, bottom, centerX: layer.x + layer.width / 2, centerY: layer.y + layer.height / 2 };
}

/** Aligns selected layers without changing type-specific properties. */
export function alignLayers(
  layers: DesignLayer[],
  selectedIds: string[],
  alignment: LayerAlignment,
  surface?: { width: number; height: number },
): DesignLayer[] {
  const selected = layers.filter((layer) => selectedIds.includes(layer.id));
  if (selected.length === 0) return layers;

  const bounds = selected.map(getLayerBounds);
  const group = {
    left: Math.min(...bounds.map((item) => item.left)),
    top: Math.min(...bounds.map((item) => item.top)),
    right: Math.max(...bounds.map((item) => item.right)),
    bottom: Math.max(...bounds.map((item) => item.bottom)),
  };
  const target = selected.length === 1 && surface
    ? { left: 0, top: 0, right: surface.width, bottom: surface.height, centerX: surface.width / 2, centerY: surface.height / 2 }
    : { ...group, centerX: (group.left + group.right) / 2, centerY: (group.top + group.bottom) / 2 };

  return layers.map((layer) => {
    if (!selectedIds.includes(layer.id) || layer.locked) return layer;
    const next = { ...layer };
    if (alignment === 'left') next.x = target.left;
    if (alignment === 'right') next.x = target.right - layer.width;
    if (alignment === 'center-horizontal') next.x = target.centerX - layer.width / 2;
    if (alignment === 'top') next.y = target.top;
    if (alignment === 'bottom') next.y = target.bottom - layer.height;
    if (alignment === 'center-vertical') next.y = target.centerY - layer.height / 2;
    return next;
  });
}
