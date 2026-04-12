import type { SurfaceLayer } from './cover-surface';

export function findSurfaceTextLayer(
  layers: SurfaceLayer[] | undefined,
  fieldKey: SurfaceLayer['fieldKey'],
) {
  return (layers ?? []).find((layer) => layer.type === 'text' && layer.fieldKey === fieldKey);
}

export function fabricCharSpacingToCss(charSpacing: number | undefined, fontSize: number | undefined) {
  if (!charSpacing || !fontSize) return '0px';
  const px = (charSpacing / 1000) * fontSize;
  return `${px}px`;
}
