import type { DesignLayer, DesignSurface } from './design-surface';

export interface CoverPreflightIssue {
  id: string;
  severity: 'warning' | 'info';
  message: string;
  layerId?: string;
}

export type ImageDimensionReader = (src: string) => Promise<{ width: number; height: number }>;
export type PreflightLocale = 'en' | 'es';

function intersects(a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

function colorToRgb(color: string): [number, number, number] | null {
  const hex = color.trim().match(/^#([\da-f]{3}|[\da-f]{6})$/i)?.[1];
  if (!hex) return null;
  const normalized = hex.length === 3 ? [...hex].map((part) => `${part}${part}`).join('') : hex;
  return [0, 2, 4].map((offset) => Number.parseInt(normalized.slice(offset, offset + 2), 16)) as [number, number, number];
}

function relativeLuminance(rgb: [number, number, number]): number {
  const values = rgb.map((value) => {
    const channel = value / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * values[0] + 0.7152 * values[1] + 0.0722 * values[2];
}

export function contrastRatio(foreground: string, background: string): number | null {
  const fg = colorToRgb(foreground);
  const bg = colorToRgb(background);
  if (!fg || !bg) return null;
  const values = [relativeLuminance(fg), relativeLuminance(bg)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

function getLayerBounds(layer: DesignLayer) {
  return { x: layer.x, y: layer.y, width: layer.width, height: layer.height };
}

/** Advisory composition checks only. Without a selected print profile this is not a print-readiness certification. */
export async function analyzeCoverPreflight(
  surface: DesignSurface,
  readImageSize: ImageDimensionReader = async () => ({ width: 0, height: 0 }),
  locale: PreflightLocale = 'es',
): Promise<CoverPreflightIssue[]> {
  const en = locale === 'en';
  const issues: CoverPreflightIssue[] = [];
  const { width, height } = surface;
  const safe = surface.safeArea;
  const safeBounds = safe ? { x: safe.left, y: safe.top, width: width - safe.left - safe.right, height: height - safe.top - safe.bottom } : null;

  for (const layer of surface.layers) {
    if (!layer.visible) continue;
    const bounds = getLayerBounds(layer);
    const overflow = bounds.x < 0 || bounds.y < 0 || bounds.x + bounds.width > width || bounds.y + bounds.height > height;
    if (overflow) issues.push({ id: `overflow:${layer.id}`, severity: 'warning', layerId: layer.id, message: en ? `“${layer.name || layer.type}” extends beyond the canvas; adjust its position or size.` : `“${layer.name || layer.type}” sale del límite del lienzo; ajusta su posición o tamaño.` });
    if (safeBounds && (bounds.x < safeBounds.x || bounds.y < safeBounds.y || bounds.x + bounds.width > safeBounds.x + safeBounds.width || bounds.y + bounds.height > safeBounds.y + safeBounds.height)) {
      issues.push({ id: `safe-area:${layer.id}`, severity: 'info', layerId: layer.id, message: en ? `“${layer.name || layer.type}” enters the defined safe area.` : `“${layer.name || layer.type}” invade el área segura definida.` });
    }
    if (surface.isbnArea && intersects(bounds, surface.isbnArea)) {
      issues.push({ id: `isbn:${layer.id}`, severity: 'warning', layerId: layer.id, message: en ? `“${layer.name || layer.type}” overlaps the reserved ISBN area.` : `“${layer.name || layer.type}” ocupa la zona reservada para ISBN.` });
    }
    if (layer.type === 'text') {
      if (layer.fontSize < 12) issues.push({ id: `small-text:${layer.id}`, severity: 'info', layerId: layer.id, message: en ? `“${layer.name || layer.role}” is smaller than 12 px; check readability at final size.` : `El texto “${layer.name || layer.role}” mide menos de 12 px; revisa su legibilidad al tamaño final.` });
      const backgroundColor = surface.background.kind === 'solid' ? surface.background.color : null;
      const ratio = backgroundColor ? contrastRatio(layer.color, backgroundColor) : null;
      if (ratio !== null && ratio < 4.5) issues.push({ id: `contrast:${layer.id}`, severity: 'info', layerId: layer.id, message: en ? `Text contrast for “${layer.name || layer.role}” is low (${ratio.toFixed(1)}:1) on the solid background.` : `El contraste del texto “${layer.name || layer.role}” es bajo (${ratio.toFixed(1)}:1) sobre el fondo sólido.` });
    }
    if (layer.type === 'image' && layer.src) {
      const natural = await readImageSize(layer.src);
      if (natural.width > 0 && natural.height > 0 && (natural.width < bounds.width || natural.height < bounds.height)) {
        issues.push({ id: `image-resolution:${layer.id}`, severity: 'info', layerId: layer.id, message: en ? `“${layer.name || 'image'}” has fewer source pixels than its canvas size; check output resolution.` : `La imagen “${layer.name || 'imagen'}” tiene menos píxeles que su tamaño en el lienzo; verifica la resolución de salida.` });
      }
    }
  }

  if (surface.background.kind !== 'solid') {
    issues.push({ id: 'background-contrast-unknown', severity: 'info', message: en ? 'The background is not a solid color; check text contrast visually.' : 'El fondo no es un color sólido; comprueba visualmente el contraste de los textos.' });
  }
  return issues;
}
