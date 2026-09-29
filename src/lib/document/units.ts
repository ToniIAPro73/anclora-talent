/** Editorial point/pixel conversions used at the document/editor boundary. */
const CSS_PIXELS_PER_POINT = 96 / 72;

export function ptToCssPx(points: number): number {
  return points * CSS_PIXELS_PER_POINT;
}

export function cssPxToPt(value: number | string): number | undefined {
  const raw = typeof value === 'number' ? value : Number.parseFloat(value);
  if (!Number.isFinite(raw)) return undefined;
  const unit = typeof value === 'string' && /pt\s*$/i.test(value.trim()) ? 'pt' : 'px';
  return unit === 'pt' ? raw : raw / CSS_PIXELS_PER_POINT;
}

export function formatPointSize(points: number | undefined): string {
  if (points === undefined || !Number.isFinite(points)) return '—';
  return `${Number(points.toFixed(2))} pt`;
}
