import type { CSSProperties } from 'react';
import type {
  SurfaceFieldKey,
  SurfaceKind,
  SurfaceLayer,
} from '@/lib/projects/cover-surface';
import {
  BACK_COVER_TEXT_LAYOUT,
  COVER_SURFACE_CANVAS,
  COVER_TEXT_LAYOUT,
} from '@/lib/projects/cover-layout';
import { fabricCharSpacingToCss } from '@/lib/projects/cover-layer-style';
import type { CoverDesign } from '@/lib/projects/types';

export const SURFACE_BACKGROUNDS: Record<CoverDesign['palette'], string> = {
  obsidian: 'linear-gradient(160deg, #0b133f 0%, #0b233f 50%, #07252f 100%)',
  teal: 'linear-gradient(160deg, #124a50 0%, #0b313f 50%, #07252f 100%)',
  sand: 'linear-gradient(160deg, #f2e3b3 0%, #e7d4a0 50%, #d4af37 100%)',
};

export const BACK_COVER_BACKGROUND =
  'linear-gradient(160deg, #0b133f 0%, #0b233f 50%, #07252f 100%)';

const COVER_TEXT_COLORS: Record<CoverDesign['palette'], { primary: string; secondary: string }> = {
  obsidian: { primary: '#f2e3b3', secondary: 'rgba(242,227,179,0.75)' },
  teal: { primary: '#f2e3b3', secondary: 'rgba(242,227,179,0.75)' },
  sand: { primary: '#0b313f', secondary: 'rgba(11,49,63,0.72)' },
};

const BACK_COVER_TEXT_FALLBACK = '#f2e3b3';
const BACK_COVER_TEXT_SECONDARY = 'rgba(242,227,179,0.78)';

export interface LayerStyleContext {
  surface: SurfaceKind;
  palette: CoverDesign['palette'];
  accentColor?: string | null;
}

interface FieldGeometry {
  top: number;
  left: number;
  width: number;
  originX: 'left' | 'center';
  textAlign: 'left' | 'center' | 'right';
  fontSize: number;
  fontWeight: number;
  lineHeight: number;
  fill: string;
  uppercase?: boolean;
}

function defaultFieldGeometry(
  fieldKey: SurfaceFieldKey,
  context: LayerStyleContext,
): FieldGeometry | null {
  const { width: canvasWidth, height: canvasHeight } = COVER_SURFACE_CANVAS;

  if (context.surface === 'cover') {
    const colors = COVER_TEXT_COLORS[context.palette];
    switch (fieldKey) {
      case 'title':
        return {
          top: COVER_TEXT_LAYOUT.titleTop * canvasHeight,
          left: canvasWidth / 2,
          width: COVER_TEXT_LAYOUT.titleWidth * canvasWidth,
          originX: 'center',
          textAlign: 'center',
          fontSize: COVER_TEXT_LAYOUT.titleFontSize,
          fontWeight: 900,
          lineHeight: COVER_TEXT_LAYOUT.titleLineHeight,
          fill: colors.primary,
        };
      case 'subtitle':
        return {
          top: COVER_TEXT_LAYOUT.subtitleTop * canvasHeight,
          left: canvasWidth / 2,
          width: COVER_TEXT_LAYOUT.subtitleWidth * canvasWidth,
          originX: 'center',
          textAlign: 'center',
          fontSize: COVER_TEXT_LAYOUT.subtitleFontSize,
          fontWeight: 500,
          lineHeight: 1.45,
          fill: colors.secondary,
        };
      case 'author':
        return {
          top: COVER_TEXT_LAYOUT.authorTop * canvasHeight,
          left: canvasWidth / 2,
          width: COVER_TEXT_LAYOUT.authorWidth * canvasWidth,
          originX: 'center',
          textAlign: 'center',
          fontSize: COVER_TEXT_LAYOUT.authorFontSize,
          fontWeight: 500,
          lineHeight: COVER_TEXT_LAYOUT.titleLineHeight,
          fill: colors.primary,
          uppercase: true,
        };
      default:
        return null;
    }
  }

  const accent = context.accentColor?.trim() || BACK_COVER_TEXT_FALLBACK;
  switch (fieldKey) {
    case 'title':
      return {
        top: BACK_COVER_TEXT_LAYOUT.titleTop * canvasHeight,
        left: BACK_COVER_TEXT_LAYOUT.titleLeft * canvasWidth,
        width: BACK_COVER_TEXT_LAYOUT.titleWidth * canvasWidth,
        originX: 'left',
        textAlign: 'left',
        fontSize: BACK_COVER_TEXT_LAYOUT.titleFontSize,
        fontWeight: 900,
        lineHeight: BACK_COVER_TEXT_LAYOUT.titleLineHeight,
        fill: accent,
      };
    case 'body':
      return {
        top: BACK_COVER_TEXT_LAYOUT.bodyTop * canvasHeight,
        left: BACK_COVER_TEXT_LAYOUT.bodyLeft * canvasWidth,
        width: BACK_COVER_TEXT_LAYOUT.bodyWidth * canvasWidth,
        originX: 'left',
        textAlign: 'left',
        fontSize: BACK_COVER_TEXT_LAYOUT.bodyFontSize,
        fontWeight: 500,
        lineHeight: BACK_COVER_TEXT_LAYOUT.bodyLineHeight,
        fill: accent,
      };
    case 'authorBio':
      return {
        top: BACK_COVER_TEXT_LAYOUT.authorBioTop * canvasHeight,
        left: BACK_COVER_TEXT_LAYOUT.authorBioLeft * canvasWidth,
        width: BACK_COVER_TEXT_LAYOUT.authorBioWidth * canvasWidth,
        originX: 'left',
        textAlign: 'left',
        fontSize: BACK_COVER_TEXT_LAYOUT.authorBioFontSize,
        fontWeight: 400,
        lineHeight: BACK_COVER_TEXT_LAYOUT.authorBioLineHeight,
        fill: BACK_COVER_TEXT_SECONDARY,
      };
    default:
      return null;
  }
}

export interface ComputedLayerStyle {
  fieldKey: SurfaceFieldKey;
  left: number;
  top: number;
  width: number;
  originX: 'left' | 'center';
  textAlign: 'left' | 'center' | 'right';
  fontSize: number;
  fontFamily: string;
  fontWeight: string | number;
  fontStyle: string;
  lineHeight: number;
  charSpacing: number;
  fill: string;
  opacity: number;
  uppercase: boolean;
}

/**
 * Resolves the effective geometry + typography of a text field layer, merging
 * the persisted layer over the editorial defaults of the surface. Shared by
 * the DOM canvas, the inspector and the unit tests — single source of truth
 * for how a layer maps to CSS.
 */
export function computeLayerStyle(
  fieldKey: SurfaceFieldKey,
  layer: SurfaceLayer | undefined,
  context: LayerStyleContext,
): ComputedLayerStyle | null {
  const defaults = defaultFieldGeometry(fieldKey, context);
  if (!defaults) return null;

  const originX =
    layer?.originX === 'left' || layer?.originX === 'center'
      ? layer.originX
      : defaults.originX;

  return {
    fieldKey,
    left: typeof layer?.left === 'number' ? layer.left : defaults.left,
    top: typeof layer?.top === 'number' ? layer.top : defaults.top,
    width: typeof layer?.width === 'number' ? layer.width : defaults.width,
    originX,
    textAlign: layer?.textAlign ?? defaults.textAlign,
    fontSize: typeof layer?.fontSize === 'number' ? layer.fontSize : defaults.fontSize,
    fontFamily:
      typeof layer?.fontFamily === 'string' && layer.fontFamily.trim()
        ? layer.fontFamily
        : 'DM Sans',
    fontWeight: layer?.fontWeight ?? defaults.fontWeight,
    fontStyle: layer?.fontStyle ?? 'normal',
    lineHeight: typeof layer?.lineHeight === 'number' ? layer.lineHeight : defaults.lineHeight,
    charSpacing: typeof layer?.charSpacing === 'number' ? layer.charSpacing : 0,
    fill: typeof layer?.fill === 'string' && layer.fill.trim() ? layer.fill : defaults.fill,
    opacity: typeof layer?.opacity === 'number' ? layer.opacity : 1,
    uppercase: Boolean(defaults.uppercase),
  };
}

function toPercent(value: number, base: number) {
  return `${((value / base) * 100).toFixed(4)}%`;
}

/**
 * Maps a computed layer to the exact CSS used on the canvas. The server-side
 * export renderer (`export-surface-image.ts`) uses the same conventions
 * (anchor + translate + width + typography), so the DOM render and the
 * exported image match by construction.
 */
export function layerStyleToCss(style: ComputedLayerStyle): CSSProperties {
  const { width: canvasWidth, height: canvasHeight } = COVER_SURFACE_CANVAS;

  return {
    position: 'absolute',
    top: toPercent(style.top, canvasHeight),
    left: toPercent(style.left, canvasWidth),
    transform: `translate(${style.originX === 'center' ? '-50%' : '0'}, -50%)`,
    width: toPercent(style.width, canvasWidth),
    margin: 0,
    color: style.fill,
    opacity: style.opacity,
    fontSize: `${style.fontSize}px`,
    fontFamily: `'${style.fontFamily}', 'DM Sans', sans-serif`,
    fontWeight: style.fontWeight as CSSProperties['fontWeight'],
    fontStyle: style.fontStyle as CSSProperties['fontStyle'],
    textAlign: style.textAlign,
    lineHeight: style.lineHeight,
    letterSpacing: fabricCharSpacingToCss(style.charSpacing, style.fontSize),
    textTransform: style.uppercase ? 'uppercase' : 'none',
    // Anti-clip contract: the layer never constrains its content. Text wraps
    // inside the declared width and grows vertically — nothing can be cut.
    whiteSpace: 'pre-wrap',
    overflowWrap: 'break-word',
    overflow: 'visible',
  };
}
