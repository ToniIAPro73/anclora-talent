/**
 * Cover Studio v2 — templates as real layer geometry (mission §29, §50-51).
 *
 * The legacy `EditorialTemplate`/`SurfaceTemplateDefinition` catalog
 * (`cover-templates.ts`) already carries good typography presets per
 * category but its `layout.kind` was purely a semantic tag — nothing ever
 * changed actual position/composition, only visibility + typography. This
 * module maps each existing layout kind to one of a small set of real
 * geometry archetypes (Centered, Top, Bottom, Left editorial, Title
 * dominant, Image dominant, Minimal — mission §29's own list) and
 * instantiates a genuine `DesignSurface` with positioned, role-tagged text
 * layers from it — selecting a template now actually changes composition,
 * not just font choices.
 */

import { randomUUID } from 'node:crypto';
import type { EditorialTemplate } from './cover-templates';
import { createEmptyDesignSurface, type DesignLayer, type DesignSurface, type TextLayerProps } from './design-surface';
import { COVER_SURFACE_CANVAS } from './cover-layout';
import type { SurfaceFieldKey } from './cover-surface';
import type { CoverDesign } from './types';

export type SurfacePalette = CoverDesign['palette'];

interface FieldGeometry {
  x: number;
  y: number;
  width: number;
  textAlign: 'left' | 'center' | 'right';
}

const PALETTE_TEXT: Record<CoverDesign['palette'], { primary: string; secondary: string; background: string }> = {
  obsidian: { primary: '#f2e3b3', secondary: 'rgba(242,227,179,0.75)', background: '#0b133f' },
  teal: { primary: '#f2e3b3', secondary: 'rgba(242,227,179,0.75)', background: '#124a50' },
  sand: { primary: '#0b313f', secondary: 'rgba(11,49,63,0.72)', background: '#f2e3b3' },
};

/** Named palette presets exposed to the Basic editor's palette picker (mission §26 "paleta (preset/brand/custom)"). */
export const PALETTE_PRESETS: SurfacePalette[] = ['obsidian', 'teal', 'sand'];

function hexLuminance(hex: string): number {
  const normalized = hex.replace('#', '');
  if (normalized.length !== 6) return 1;
  const r = parseInt(normalized.slice(0, 2), 16) / 255;
  const g = parseInt(normalized.slice(2, 4), 16) / 255;
  const b = parseInt(normalized.slice(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Recolors a surface's background and every role-tagged text layer to a
 * named palette preset, or a custom background hex (mission §26). Only
 * touches `role !== 'free'` text layers and a solid/gradient-less
 * background — never overwrites an image background or a user's free-form
 * layer colors, since those are the user's own explicit choices.
 */
export function applyPaletteToSurface(surface: DesignSurface, palette: SurfacePalette | { custom: string }): DesignSurface {
  const colors =
    typeof palette === 'object'
      ? {
          background: palette.custom,
          primary: hexLuminance(palette.custom) > 0.5 ? '#0b133f' : '#f2e3b3',
          secondary: hexLuminance(palette.custom) > 0.5 ? 'rgba(11,19,63,0.72)' : 'rgba(242,227,179,0.75)',
        }
      : PALETTE_TEXT[palette];

  const layers: DesignLayer[] = surface.layers.map((layer) => {
    if (layer.type !== 'text' || layer.role === 'free') return layer;
    const isPrimary = layer.role === 'title';
    return { ...layer, color: isPrimary ? colors.primary : colors.secondary };
  });

  const background = surface.background.kind === 'solid' ? { kind: 'solid' as const, color: colors.background } : surface.background;

  return { ...surface, background, layers };
}

const { width: W, height: H } = COVER_SURFACE_CANVAS;

/** Cover archetype geometry, keyed by the mission §29 preset names. */
const COVER_ARCHETYPES: Record<string, { title: FieldGeometry; subtitle: FieldGeometry; author: FieldGeometry }> = {
  centered: {
    title: { x: W * 0.06, y: H * 0.26, width: W * 0.88, textAlign: 'center' },
    subtitle: { x: W * 0.09, y: H * 0.48, width: W * 0.82, textAlign: 'center' },
    author: { x: W * 0.09, y: H * 0.7, width: W * 0.82, textAlign: 'center' },
  },
  top: {
    title: { x: W * 0.08, y: H * 0.08, width: W * 0.84, textAlign: 'left' },
    subtitle: { x: W * 0.08, y: H * 0.25, width: W * 0.8, textAlign: 'left' },
    author: { x: W * 0.08, y: H * 0.36, width: W * 0.8, textAlign: 'left' },
  },
  bottom: {
    title: { x: W * 0.08, y: H * 0.68, width: W * 0.84, textAlign: 'left' },
    subtitle: { x: W * 0.08, y: H * 0.82, width: W * 0.8, textAlign: 'left' },
    author: { x: W * 0.08, y: H * 0.9, width: W * 0.8, textAlign: 'left' },
  },
  'left-editorial': {
    title: { x: W * 0.14, y: H * 0.16, width: W * 0.72, textAlign: 'left' },
    subtitle: { x: W * 0.14, y: H * 0.35, width: W * 0.68, textAlign: 'left' },
    author: { x: W * 0.14, y: H * 0.85, width: W * 0.6, textAlign: 'left' },
  },
  'title-dominant': {
    title: { x: W * 0.08, y: H * 0.18, width: W * 0.86, textAlign: 'left' },
    subtitle: { x: W * 0.08, y: H * 0.53, width: W * 0.78, textAlign: 'left' },
    author: { x: W * 0.08, y: H * 0.76, width: W * 0.78, textAlign: 'left' },
  },
  'image-dominant': {
    title: { x: W * 0.08, y: H * 0.68, width: W * 0.84, textAlign: 'center' },
    subtitle: { x: W * 0.1, y: H * 0.79, width: W * 0.8, textAlign: 'center' },
    author: { x: W * 0.1, y: H * 0.89, width: W * 0.8, textAlign: 'center' },
  },
  minimal: {
    title: { x: W * 0.15, y: H * 0.44, width: W * 0.7, textAlign: 'center' },
    subtitle: { x: W * 0.18, y: H * 0.53, width: W * 0.64, textAlign: 'center' },
    author: { x: W * 0.18, y: H * 0.62, width: W * 0.64, textAlign: 'center' },
  },
};

/** Legacy layout kind -> archetype. Every cover template maps to one of the geometries above. */
const COVER_KIND_TO_ARCHETYPE: Record<string, keyof typeof COVER_ARCHETYPES> = {
  'stacked-center': 'centered',
  'functional-grid': 'left-editorial',
  'portrait-balanced': 'bottom',
  'minimal-stack': 'minimal',
  'title-dominant': 'title-dominant',
  'image-dominant': 'image-dominant',
  'statement-bold': 'top',
};

/** Back-cover geometry — a single well-designed "left editorial" default (the format nearly every back cover actually wants), with one size variation for body-heavy layouts. Mission §29 focuses the named archetypes on the cover; back-cover templates differ mainly in typography, which the legacy catalog already provides per category. */
const BACK_COVER_ARCHETYPES: Record<'default' | 'body-heavy' | 'minimal', { title: FieldGeometry; body: FieldGeometry; authorBio: FieldGeometry }> = {
  default: {
    title: { x: W * 0.16, y: H * 0.18, width: W * 0.72, textAlign: 'left' },
    body: { x: W * 0.16, y: H * 0.36, width: W * 0.72, textAlign: 'left' },
    authorBio: { x: W * 0.16, y: H * 0.78, width: W * 0.62, textAlign: 'left' },
  },
  'body-heavy': {
    title: { x: W * 0.16, y: H * 0.12, width: W * 0.72, textAlign: 'left' },
    body: { x: W * 0.16, y: H * 0.26, width: W * 0.72, textAlign: 'left' },
    authorBio: { x: W * 0.16, y: H * 0.85, width: W * 0.62, textAlign: 'left' },
  },
  minimal: {
    title: { x: W * 0.18, y: H * 0.3, width: W * 0.64, textAlign: 'center' },
    body: { x: W * 0.18, y: H * 0.44, width: W * 0.64, textAlign: 'center' },
    authorBio: { x: W * 0.18, y: H * 0.84, width: W * 0.64, textAlign: 'center' },
  },
};

const BACK_COVER_KIND_TO_ARCHETYPE: Record<string, keyof typeof BACK_COVER_ARCHETYPES> = {
  'body-led': 'default',
  'summary-card': 'body-heavy',
  'benefits-grid': 'body-heavy',
  'synopsis-focus': 'body-heavy',
  'minimal-body': 'minimal',
  'bio-balanced': 'default',
  'statement-body': 'body-heavy',
};

function estimateHeight(fontSize: number, lineHeight = 1.3): number {
  return Math.max(fontSize * lineHeight * 1.4, fontSize * 1.4);
}

/**
 * Instantiates a `DesignSurface` from a legacy `EditorialTemplate` — real
 * positioned layers, not just a typography preset (mission §50: "al
 * seleccionar un template, instantiate layers que luego pueden
 * modificarse").
 */
export function buildDesignSurfaceFromTemplate(
  template: EditorialTemplate,
  options: { palette: CoverDesign['palette']; accentColor?: string | null } = { palette: 'obsidian' },
): DesignSurface {
  const surface = createEmptyDesignSurface(template.surface);
  const colors = PALETTE_TEXT[options.palette] ?? PALETTE_TEXT.obsidian;
  surface.background = { kind: 'solid', color: colors.background };

  const isCover = template.surface === 'cover';
  const archetypeKey = isCover
    ? (COVER_KIND_TO_ARCHETYPE[template.layout.kind] ?? 'centered')
    : (BACK_COVER_KIND_TO_ARCHETYPE[template.layout.kind] ?? 'default');
  const geometry = isCover ? COVER_ARCHETYPES[archetypeKey as keyof typeof COVER_ARCHETYPES] : BACK_COVER_ARCHETYPES[archetypeKey as keyof typeof BACK_COVER_ARCHETYPES];

  const fieldOrder: SurfaceFieldKey[] = isCover ? ['title', 'subtitle', 'author'] : ['title', 'body', 'authorBio'];
  const defaultVisible: Record<SurfaceFieldKey, boolean> = {
    title: true,
    subtitle: isCover,
    author: isCover,
    body: !isCover,
    authorBio: !isCover,
  };

  const layers: DesignSurface['layers'] = [];
  let zIndex = 1;
  for (const fieldKey of fieldOrder) {
    const visible = template.visibility?.[fieldKey] ?? defaultVisible[fieldKey];
    if (!visible) continue;
    const fieldGeometry = (geometry as Record<string, FieldGeometry>)[fieldKey];
    if (!fieldGeometry) continue;

    const stylePreset = template.layerStyles?.[fieldKey] ?? {};
    const fontSize = typeof stylePreset.fontSize === 'number' ? stylePreset.fontSize : 24;
    const isPrimary = fieldKey === 'title';

    const textLayer: DesignSurface['layers'][number] = {
      id: randomUUID(),
      type: 'text',
      zIndex: zIndex++,
      x: fieldGeometry.x,
      y: fieldGeometry.y,
      width: fieldGeometry.width,
      height: estimateHeight(fontSize, typeof stylePreset.lineHeight === 'number' ? stylePreset.lineHeight : 1.3),
      rotation: 0,
      opacity: 1,
      visible: true,
      locked: false,
      content: '',
      fontFamily: stylePreset.fontFamily?.trim() || 'DM Sans',
      fontSize,
      fontWeight: stylePreset.fontWeight ?? (isPrimary ? 800 : 500),
      fontStyle: (stylePreset.fontStyle as 'normal' | 'italic') ?? 'normal',
      textDecoration: 'none',
      color: stylePreset.fill?.trim() || (isPrimary ? colors.primary : colors.secondary),
      letterSpacing: stylePreset.charSpacing ?? 0,
      lineHeight: typeof stylePreset.lineHeight === 'number' ? stylePreset.lineHeight : 1.3,
      textAlign: stylePreset.textAlign ?? fieldGeometry.textAlign,
      verticalAlign: 'top',
      textTransform: fieldKey === 'author' && isCover ? 'uppercase' : 'none',
      role: fieldKey,
      source: 'metadata',
    } satisfies DesignSurface['layers'][number] & TextLayerProps;

    layers.push(textLayer);
  }

  surface.layers = layers;
  return surface;
}
