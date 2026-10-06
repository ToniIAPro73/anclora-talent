import type { DesignLayer, DesignSurface } from '@/lib/projects/design-surface';

/** Localized labels the layer list can show (see `coverDesignSurface.layers`). */
export interface LayerLabelCopy {
  untitledText: string;
  untitledImage: string;
  untitledShape: string;
  roleTitle: string;
  roleSubtitle: string;
  roleAuthor: string;
  roleBody: string;
  roleAuthorBio: string;
  backgroundImage: string;
  lineLabel: string;
  iconLabel: string;
  overlayLabel: string;
}

/**
 * Names the editor itself assigns when a tool creates a layer. They carry the
 * *kind* of the layer, never a user choice, so they are replaced by the
 * localized semantic label ("Text" / "Texto" must never reach the panel).
 */
const KIND_MARKERS: Record<string, 'text' | 'image' | 'shape' | 'line' | 'icon' | 'overlay'> = {
  text: 'text',
  texto: 'text',
  image: 'image',
  imagen: 'image',
  shape: 'shape',
  forma: 'shape',
  line: 'line',
  linea: 'line',
  línea: 'line',
  icon: 'icon',
  icono: 'icon',
  overlay: 'overlay',
  superposición: 'overlay',
  superposicion: 'overlay',
};

function coversSurface(layer: DesignLayer, surface?: Pick<DesignSurface, 'width' | 'height'>): boolean {
  if (!surface) return false;
  return layer.width >= surface.width * 0.9 && layer.height >= surface.height * 0.9;
}

function ordinalOf(layer: DesignLayer, layers: DesignLayer[], matches: (other: DesignLayer) => boolean): number | null {
  const same = layers.filter(matches).sort((a, b) => a.zIndex - b.zIndex);
  if (same.length < 2) return null;
  return same.findIndex((other) => other.id === layer.id) + 1;
}

/**
 * The clean, semantic name for a layer. A name typed by the user always wins;
 * otherwise the name comes from the layer's role/kind, never from its text
 * content (which is what produced rows like "Sistemas para pensar, decidir y…").
 */
export function resolveLayerLabel(
  layer: DesignLayer,
  layers: DesignLayer[],
  copy: LayerLabelCopy,
  surface?: Pick<DesignSurface, 'width' | 'height'>,
): string {
  const custom = layer.name?.trim();
  const marker = custom ? KIND_MARKERS[custom.toLowerCase()] : undefined;
  const isCustom = Boolean(custom) && !marker && !(layer.type === 'text' && custom === layer.content.trim());
  if (isCustom) return custom as string;

  if (layer.type === 'text') {
    if (layer.role === 'title') return copy.roleTitle;
    if (layer.role === 'subtitle') return copy.roleSubtitle;
    if (layer.role === 'author') return copy.roleAuthor;
    if (layer.role === 'body') return copy.roleBody;
    if (layer.role === 'authorBio') return copy.roleAuthorBio;
    const n = ordinalOf(layer, layers, (other) => other.type === 'text' && other.role === 'free');
    return n ? `${copy.untitledText} ${n}` : copy.untitledText;
  }

  if (layer.type === 'image') {
    if (layer.isOriginalSource || coversSurface(layer, surface)) return copy.backgroundImage;
    const n = ordinalOf(layer, layers, (other) => other.type === 'image' && !coversSurface(other, surface));
    return n ? `${copy.untitledImage} ${n}` : copy.untitledImage;
  }

  if (marker === 'overlay') return copy.overlayLabel;
  if (marker === 'icon') return copy.iconLabel;
  if (marker === 'line' || layer.shape === 'line') return copy.lineLabel;
  if (coversSurface(layer, surface) && (layer.opacity ?? 1) < 1) return copy.overlayLabel;
  const n = ordinalOf(layer, layers, (other) => other.type === 'shape' && other.shape !== 'line' && !KIND_MARKERS[(other.name ?? '').toLowerCase()]);
  return n ? `${copy.untitledShape} ${n}` : copy.untitledShape;
}
