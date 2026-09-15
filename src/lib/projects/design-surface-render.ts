/**
 * Cover Studio v2 — structured server renderer (Fase G, mission §45-47).
 *
 * ONE canonical rendering engine, shared with the client editor: hydrates
 * the exact same `DesignSurface` through the exact same environment-agnostic
 * functions in `design-surface-fabric.ts`, backed by `fabric/node` +
 * `canvas` (Automattic's node-canvas) instead of a browser canvas. Guides,
 * safe-area, and ISBN helper overlays are never hydrated here — they only
 * ever exist as DOM/CSS overlays in the editor (`CanvasOverlays.tsx`), so
 * "guides never appear in export" holds by construction, not by a filter
 * step.
 *
 * Replaces `export-surface-image.ts`'s cached-screenshot / Playwright-HTML /
 * SVG-fallback chain for any project whose cover/back-cover design has
 * already been authored as a v2 `DesignSurface` — a pre-v2 (legacy
 * `SurfaceState`) design keeps using the old pipeline until it is opened and
 * saved in the new editor (lazy migration, mission's "never break existing
 * projects' covers").
 */

import { applyBackgroundToCanvas, hydrateFabricLayers } from './design-surface-fabric';
import type { DesignSurface } from './design-surface';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- fabric/node's own .d.ts is stricter than its runtime API (StaticCanvas(null, opts) and toDataURL({format}) both work at runtime — see design-surface-fabric.test.ts's verified spike).
type FabricNodeModule = any;

let fabricNodePromise: Promise<FabricNodeModule> | null = null;

async function loadFabricNode(): Promise<FabricNodeModule> {
  if (!fabricNodePromise) {
    fabricNodePromise = import('fabric/node');
  }
  return fabricNodePromise;
}

/**
 * Renders a `DesignSurface` to a PNG buffer at its native pixel dimensions
 * (mission §47: dimension presets are respected, never hardcoded — the
 * surface's own `width`/`height` already encode whichever preset was
 * chosen when the design was created).
 */
export async function renderDesignSurfaceToPng(surface: DesignSurface): Promise<Buffer> {
  const fabric = await loadFabricNode();
  const canvas = new fabric.StaticCanvas(null, { width: surface.width, height: surface.height });

  await applyBackgroundToCanvas(fabric, canvas, surface.background, surface);

  const objects = await hydrateFabricLayers(fabric, surface, { interactive: false });
  const visible = [...surface.layers]
    .sort((a, b) => a.zIndex - b.zIndex)
    .map((layer) => ({ layer, object: objects.get(layer.id) }))
    .filter((entry): entry is { layer: DesignSurface['layers'][number]; object: ReturnType<typeof objects.get> } => Boolean(entry.object));

  for (const { layer, object } of visible) {
    if (layer.visible === false) continue;
    canvas.add(object);
  }

  canvas.renderAll();

  const dataUrl = canvas.toDataURL({ format: 'png' });
  return Buffer.from(dataUrl.split(',')[1], 'base64');
}

/** Convenience wrapper for callers that want a data URL (the shape `export-surface-image.ts`'s existing consumers already expect). */
export async function renderDesignSurfaceToPngDataUrl(surface: DesignSurface): Promise<string> {
  const buffer = await renderDesignSurfaceToPng(surface);
  return `data:image/png;base64,${buffer.toString('base64')}`;
}
