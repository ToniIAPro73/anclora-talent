/**
 * Cover Studio v2 — Fabric.js object hydration (Fase B).
 *
 * Pure `DesignLayer -> Fabric object` construction, deliberately environment
 * agnostic: it takes an already-loaded fabric module (`getFabric()` in the
 * browser, `import('fabric/node')` on the server) and never touches
 * `window`/`document` itself, so the exact same code hydrates the
 * interactive editor canvas (`DesignSurfaceCanvas.tsx`) and the structured
 * server renderer (`design-surface-render.ts`, Fase G) — one engine, one
 * object graph, per mission §45.
 *
 * Fabric module typing follows this codebase's existing convention
 * (`canvas-utils.ts`'s `getFabric()`): loosely typed, since the browser and
 * `/node` builds are structurally identical but not exported under one
 * shared type from the `fabric` package itself.
 */

import type {
  BackgroundSpec,
  DesignLayer,
  DesignSurface,
  ImageLayerFilters,
} from './design-surface';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FabricModule = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FabricObject = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FabricCanvasLike = any;

/** Fabric's filter classes expect -1..1 for brightness/contrast/saturation and 0..1 for blur — matches `ImageLayerFilters`' own convention (see design-surface.ts). */
function buildImageFilters(fabric: FabricModule, filters: ImageLayerFilters | undefined) {
  if (!filters) return [];
  const built: FabricObject[] = [];
  if (filters.grayscale) built.push(new fabric.filters.Grayscale());
  if (typeof filters.brightness === 'number' && filters.brightness !== 0) {
    built.push(new fabric.filters.Brightness({ brightness: filters.brightness }));
  }
  if (typeof filters.contrast === 'number' && filters.contrast !== 0) {
    built.push(new fabric.filters.Contrast({ contrast: filters.contrast }));
  }
  if (typeof filters.saturation === 'number' && filters.saturation !== 0) {
    built.push(new fabric.filters.Saturation({ saturation: filters.saturation }));
  }
  if (filters.sepia) built.push(new fabric.filters.Sepia());
  if (typeof filters.blur === 'number' && filters.blur > 0) {
    built.push(new fabric.filters.Blur({ blur: filters.blur }));
  }
  return built;
}

function resolveImageCrop(layer: DesignLayer & { type: 'image' }, sourceWidth: number, sourceHeight: number) {
  if (layer.crop && layer.crop.width > 0 && layer.crop.height > 0) return layer.crop;
  if (layer.fit !== 'cover' || layer.width <= 0 || layer.height <= 0) return null;

  const sourceRatio = sourceWidth / sourceHeight;
  const frameRatio = layer.width / layer.height;
  if (sourceRatio > frameRatio) {
    const width = sourceHeight * frameRatio;
    return { x: (sourceWidth - width) / 2, y: 0, width, height: sourceHeight };
  }

  const height = sourceWidth / frameRatio;
  return { x: 0, y: (sourceHeight - height) / 2, width: sourceWidth, height };
}

/** Common transform/state props every hydrated Fabric object gets, regardless of layer type. */
function baseObjectProps(layer: DesignLayer, opts: { interactive: boolean }) {
  return {
    left: layer.x,
    top: layer.y,
    angle: layer.rotation,
    opacity: layer.opacity,
    visible: layer.visible,
    selectable: opts.interactive && !layer.locked,
    evented: opts.interactive && !layer.locked,
    hasControls: opts.interactive && !layer.locked,
    originX: 'left' as const,
    originY: 'top' as const,
  };
}

async function hydrateTextLayer(
  fabric: FabricModule,
  layer: DesignLayer & { type: 'text' },
  opts: { interactive: boolean },
): Promise<FabricObject> {
  // Fabric has no native text-transform; the transformed string is what
  // gets rendered/measured (mirrors the DOM renderer's CSS text-transform
  // by pre-applying it, since Fabric would otherwise measure/wrap the
  // ORIGINAL case). Must be the constructor's positional text argument —
  // passing it as an option (`text: ...`) is silently ignored, the
  // constructor's own positional argument wins.
  const displayText =
    layer.textTransform === 'uppercase'
      ? layer.content.toUpperCase()
      : layer.textTransform === 'lowercase'
        ? layer.content.toLowerCase()
        : layer.content;

  const textbox = new fabric.Textbox(displayText, {
    ...baseObjectProps(layer, opts),
    width: layer.width,
    fontFamily: layer.fontFamily,
    fontSize: layer.fontSize,
    fontWeight: layer.fontWeight,
    fontStyle: layer.fontStyle,
    underline: layer.textDecoration === 'underline',
    fill: layer.color,
    charSpacing: layer.letterSpacing,
    lineHeight: layer.lineHeight,
    textAlign: layer.textAlign,
    splitByGrapheme: false,
  });
  textbox.id = layer.id;
  return textbox;
}

async function hydrateImageLayer(
  fabric: FabricModule,
  layer: DesignLayer & { type: 'image' },
  opts: { interactive: boolean },
): Promise<FabricObject | null> {
  if (!layer.src) return null;
  const result = fabric.FabricImage.fromURL(layer.src, { crossOrigin: 'anonymous' });
  const image = result instanceof Promise ? await result : result;

  const sourceWidth: number = image.width || layer.width;
  const sourceHeight: number = image.height || layer.height;
  const fit = layer.fit ?? 'cover';
  const crop = resolveImageCrop(layer, sourceWidth, sourceHeight);
  const scaleX = fit === 'fill' ? layer.width / sourceWidth : undefined;
  const scaleY = fit === 'fill' ? layer.height / sourceHeight : undefined;
  const uniformScale =
    fit === 'contain'
      ? Math.min(layer.width / sourceWidth, layer.height / sourceHeight)
      : fit === 'cover'
        ? Math.max(layer.width / sourceWidth, layer.height / sourceHeight)
        : undefined;

  image.set({
    ...baseObjectProps(layer, opts),
    ...(crop
      ? {
          cropX: crop.x,
          cropY: crop.y,
          width: crop.width,
          height: crop.height,
          scaleX: layer.width / crop.width,
          scaleY: layer.height / crop.height,
        }
      : {
          scaleX: scaleX ?? uniformScale ?? 1,
          scaleY: scaleY ?? uniformScale ?? 1,
        }),
  });
  image.id = layer.id;

  const filters = buildImageFilters(fabric, layer.filters);
  if (filters.length > 0) {
    image.filters = filters;
    image.applyFilters();
  }

  return image;
}

async function hydrateShapeLayer(
  fabric: FabricModule,
  layer: DesignLayer & { type: 'shape' },
  opts: { interactive: boolean },
): Promise<FabricObject> {
  const common = {
    ...baseObjectProps(layer, opts),
    width: layer.width,
    height: layer.height,
    fill: layer.fill ?? 'transparent',
    stroke: layer.stroke,
    strokeWidth: layer.strokeWidth ?? (layer.stroke ? 1 : 0),
  };

  const shape =
    layer.shape === 'ellipse'
      ? new fabric.Ellipse({ ...common, rx: layer.width / 2, ry: layer.height / 2 })
      : layer.shape === 'line'
        ? new fabric.Line([0, 0, layer.width, 0], { ...common, left: layer.x, top: layer.y })
        : new fabric.Rect(common);

  shape.id = layer.id;
  return shape;
}

/** Builds a single Fabric object from one `DesignLayer`. Returns null only when an image layer has no source yet (nothing to render). */
export async function hydrateFabricLayerObject(
  fabric: FabricModule,
  layer: DesignLayer,
  opts: { interactive: boolean } = { interactive: true },
): Promise<FabricObject | null> {
  if (layer.type === 'text') return hydrateTextLayer(fabric, layer, opts);
  if (layer.type === 'image') return hydrateImageLayer(fabric, layer, opts);
  return hydrateShapeLayer(fabric, layer, opts);
}

/** Hydrates every layer of a surface, in zIndex order, returning them keyed by layer id (Fabric's own stacking order will match array-add order — callers add in the returned Map's iteration order). */
export async function hydrateFabricLayers(
  fabric: FabricModule,
  surface: DesignSurface,
  opts: { interactive: boolean } = { interactive: true },
): Promise<Map<string, FabricObject>> {
  const sorted = [...surface.layers].sort((a, b) => a.zIndex - b.zIndex);
  const entries = new Map<string, FabricObject>();
  for (const layer of sorted) {
    const object = await hydrateFabricLayerObject(fabric, layer, opts);
    if (object) entries.set(layer.id, object);
  }
  return entries;
}

/** Applies a `BackgroundSpec` to a Fabric canvas (client `Canvas` or server `StaticCanvas` — both share this API). Never a selectable/interactive object, matching the model: background is not a layer. */
export async function applyBackgroundToCanvas(
  fabric: FabricModule,
  canvas: FabricCanvasLike,
  background: BackgroundSpec,
  dimensions: { width: number; height: number },
): Promise<void> {
  if (background.kind === 'solid') {
    canvas.backgroundColor = background.color;
    return;
  }

  if (background.kind === 'gradient') {
    const radians = (background.angle * Math.PI) / 180;
    const x2 = dimensions.width * Math.cos(radians);
    const y2 = dimensions.height * Math.sin(radians);
    canvas.backgroundColor = new fabric.Gradient({
      type: 'linear',
      coords: { x1: 0, y1: 0, x2, y2 },
      colorStops: background.stops.map((stop) => ({ offset: stop.offset, color: stop.color })),
    });
    return;
  }

  if (!background.src) return;
  const result = fabric.FabricImage.fromURL(background.src, { crossOrigin: 'anonymous' });
  const image = result instanceof Promise ? await result : result;
  const sourceWidth: number = image.width || dimensions.width;
  const sourceHeight: number = image.height || dimensions.height;
  const scale =
    background.fit === 'contain'
      ? Math.min(dimensions.width / sourceWidth, dimensions.height / sourceHeight)
      : Math.max(dimensions.width / sourceWidth, dimensions.height / sourceHeight);

  image.set({
    originX: 'center',
    originY: 'center',
    left: dimensions.width / 2,
    top: dimensions.height / 2,
    scaleX: scale,
    scaleY: scale,
    opacity: background.opacity,
  });

  if (background.filters?.grayscale) {
    image.filters = [new fabric.filters.Grayscale()];
    image.applyFilters();
  }

  canvas.backgroundImage = image;
}

/**
 * Reads the current transform/state back off a Fabric object into a
 * `DesignLayer`-shaped patch — the inverse of `baseObjectProps`, called on
 * `object:modified`. Resize in Fabric changes `scaleX`/`scaleY`, never
 * `width`/`height` directly, so this folds scale back into width/height
 * and resets scale to 1 (keeps the persisted model's width/height
 * authoritative, matching mission §22 "resize... without destroying the
 * box").
 */
export function readLayerPatchFromFabricObject(object: FabricObject): Partial<DesignLayer> {
  const scaleX = object.scaleX ?? 1;
  const scaleY = object.scaleY ?? 1;
  const width = (object.width ?? 0) * scaleX;
  const height = (object.height ?? 0) * scaleY;

  return {
    x: object.left ?? 0,
    y: object.top ?? 0,
    width,
    height,
    rotation: object.angle ?? 0,
    opacity: object.opacity ?? 1,
  };
}

/** Fabric keeps resize as scale; normalizing it back to scale=1 + explicit width/height keeps every consumer (properties panel, server renderer) reading one authoritative source instead of having to multiply scale in every reader. */
export function normalizeFabricObjectScale(object: FabricObject): void {
  const scaleX = object.scaleX ?? 1;
  const scaleY = object.scaleY ?? 1;
  if (scaleX === 1 && scaleY === 1) return;
  const width = (object.width ?? 0) * scaleX;
  const height = (object.height ?? 0) * scaleY;
  object.set({ width, height, scaleX: 1, scaleY: 1 });
}
