/**
 * Cover Studio v2 — background image framing (pure, environment agnostic).
 *
 * The cover is a non-destructive clipping window over the background image:
 * the image keeps its full size and only the part inside the surface shows.
 * Every route that sets a background image (Fondos tool, "Usar como fondo",
 * "Importar portada", original-page inheritance) stores the same
 * `BackgroundSpec` image variant; `frame` is its optional framing.
 */

import {
  createDesignLayer,
  type BackgroundImageFrame,
  type BackgroundSpec,
  type DesignLayer,
} from './design-surface';

export type BackgroundImageSpec = Extract<BackgroundSpec, { kind: 'image' }>;
export type BackgroundFit = BackgroundImageSpec['fit'];

export interface Size {
  width: number;
  height: number;
}

/** id of the interactive Fabric object that represents the cover background (never a layer). */
export const BACKGROUND_OBJECT_ID = '__cover-background__';

const round = (value: number) => Math.round(value * 100) / 100;

/** Frame of `natural` for a fit mode, centred on the surface. */
export function frameForFit(fit: BackgroundFit, natural: Size, surface: Size): BackgroundImageFrame {
  const naturalWidth = natural.width > 0 ? natural.width : surface.width;
  const naturalHeight = natural.height > 0 ? natural.height : surface.height;
  const scale =
    fit === 'original'
      ? 1
      : fit === 'contain'
        ? Math.min(surface.width / naturalWidth, surface.height / naturalHeight)
        : Math.max(surface.width / naturalWidth, surface.height / naturalHeight);
  const width = naturalWidth * scale;
  const height = naturalHeight * scale;
  return { x: round((surface.width - width) / 2), y: round((surface.height - height) / 2), width: round(width), height: round(height), rotation: 0 };
}

/** The frame actually drawn: the stored one, or the one derived from `fit`. */
export function resolveBackgroundFrame(background: BackgroundImageSpec, natural: Size, surface: Size): BackgroundImageFrame {
  return background.frame ?? frameForFit(background.fit, natural, surface);
}

/** Rellenar / Ajustar / Original: derived framing, centred, rotation cleared. */
export function setBackgroundFit(background: BackgroundImageSpec, fit: BackgroundFit): BackgroundImageSpec {
  const { frame: _discarded, ...rest } = background;
  void _discarded;
  return { ...rest, fit };
}

/** "Restablecer fondo": back to the default Rellenar framing (position, scale, rotation); opacity and the grayscale toggle stay. */
export function resetBackgroundFrame(background: BackgroundImageSpec): BackgroundImageSpec {
  return setBackgroundFit(background, 'cover');
}

/** Centrar: keep scale and rotation, centre the image on the surface. */
export function centerBackgroundFrame(background: BackgroundImageSpec, natural: Size, surface: Size): BackgroundImageSpec {
  const frame = resolveBackgroundFrame(background, natural, surface);
  return { ...background, frame: { ...frame, x: round((surface.width - frame.width) / 2), y: round((surface.height - frame.height) / 2) } };
}

/** Scale as a percentage of the Rellenar size (100% = the image just covers the cover). */
export function backgroundScalePercent(background: BackgroundImageSpec, natural: Size, surface: Size): number {
  const fill = frameForFit('cover', natural, surface);
  const frame = resolveBackgroundFrame(background, natural, surface);
  return Math.round((frame.width / fill.width) * 100);
}

/** Scales around the frame centre, preserving aspect ratio. */
export function scaleBackgroundToPercent(background: BackgroundImageSpec, natural: Size, surface: Size, percent: number): BackgroundImageSpec {
  const fill = frameForFit('cover', natural, surface);
  const frame = resolveBackgroundFrame(background, natural, surface);
  const factor = Math.max(1, percent) / 100;
  const width = fill.width * factor;
  const height = fill.height * factor;
  const centerX = frame.x + frame.width / 2;
  const centerY = frame.y + frame.height / 2;
  return { ...background, frame: { ...frame, x: round(centerX - width / 2), y: round(centerY - height / 2), width: round(width), height: round(height) } };
}

export function patchBackgroundFrame(
  background: BackgroundImageSpec,
  natural: Size,
  surface: Size,
  patch: Partial<BackgroundImageFrame>,
): BackgroundImageSpec {
  return { ...background, frame: { ...resolveBackgroundFrame(background, natural, surface), ...patch } };
}

/** True when the frame no longer intersects the cover at all (the user needs "Restablecer fondo"). */
export function isBackgroundOffCanvas(frame: BackgroundImageFrame, surface: Size): boolean {
  return frame.x >= surface.width || frame.y >= surface.height || frame.x + frame.width <= 0 || frame.y + frame.height <= 0;
}

/** "Usar como fondo": an image layer becomes the structural background, keeping its src, box, rotation and opacity. */
export function imageLayerToBackground(layer: DesignLayer & { type: 'image' }, natural: Size, surface: Size): BackgroundImageSpec {
  const fullBleed = layer.x <= 0 && layer.y <= 0 && layer.width >= surface.width && layer.height >= surface.height && layer.rotation === 0;
  const filters = layer.filters?.grayscale ? { filters: { grayscale: true } } : {};
  if (fullBleed || natural.width <= 0 || natural.height <= 0) {
    return { kind: 'image', src: layer.src, fit: layer.fit === 'contain' ? 'contain' : 'cover', opacity: layer.opacity, ...filters };
  }
  // The layer box is the area the user composed: show the whole image covering that box.
  const scale = Math.max(layer.width / natural.width, layer.height / natural.height);
  const width = natural.width * scale;
  const height = natural.height * scale;
  return {
    kind: 'image',
    src: layer.src,
    fit: 'cover',
    opacity: layer.opacity,
    ...filters,
    frame: {
      x: round(layer.x + (layer.width - width) / 2),
      y: round(layer.y + (layer.height - height) / 2),
      width: round(width),
      height: round(height),
      rotation: layer.rotation,
    },
  };
}

/** "Convertir en imagen": the background becomes a normal layer (above nothing, at the back of the stack). */
export function backgroundToImageLayer(background: BackgroundImageSpec, natural: Size, surface: Size, zIndex: number): DesignLayer {
  const frame = resolveBackgroundFrame(background, natural, surface);
  return createDesignLayer(
    { type: 'image', src: background.src, fit: 'fill', x: frame.x, y: frame.y, width: frame.width, height: frame.height, rotation: frame.rotation, opacity: background.opacity, ...(background.filters?.grayscale ? { filters: { grayscale: true } } : {}) },
    zIndex,
  );
}
