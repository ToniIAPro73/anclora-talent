'use client';

/**
 * Cover Studio v2 — faithful, read-only preview. It renders the SAME `DesignSurface` through the SAME
 * Fabric hydration path the editor canvas and the server renderer use (`hydrateFabricLayers` +
 * `applyBackgroundToCanvas`), only non-interactive and uniformly scaled with the canvas zoom. There is no
 * second layout interpretation: geometry, text wrapping, line height, fonts, image crop, the background
 * frame, z-order and clipping all come from the one engine. Editor zoom is view state and never an input.
 */

import { useEffect, useRef, useState } from 'react';
import { getFabric } from '@/lib/canvas-utils';
import { useGoogleFonts } from '@/hooks/use-google-fonts';
import { applyBackgroundToCanvas, hydrateFabricLayers, readLiveGeometry } from '@/lib/projects/design-surface-fabric';
import type { DesignSurface } from '@/lib/projects/design-surface';

const STAGE_MARGIN = 32;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FabricCanvas = any;

export function DesignSurfaceStaticPreview({ surface, margin = STAGE_MARGIN }: { surface: DesignSurface; /** Breathing room around the cover inside its container (0 = fill the container exactly). */ margin?: number }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasElRef = useRef<HTMLCanvasElement>(null);
  const canvasRef = useRef<FabricCanvas | null>(null);
  const { loadFont } = useGoogleFonts();
  const [area, setArea] = useState<{ width: number; height: number } | null>(null);
  const [geometry, setGeometry] = useState('{}');

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const measure = () => setArea({ width: el.clientWidth, height: el.clientHeight });
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // One uniform scale for the whole cover: aspect ratio preserved, never a per-object adjustment.
  const scale = area ? Math.max(0.05, Math.min((area.width - margin * 2) / surface.width, (area.height - margin * 2) / surface.height)) : 0;

  useEffect(() => {
    if (!scale || !canvasElRef.current) return;
    let cancelled = false;
    (async () => {
      const fabric = await getFabric();
      // Text is measured with the real faces: wait for every family the surface uses.
      const families = [...new Set(surface.layers.flatMap((layer) => (layer.type === 'text' ? [layer.fontFamily] : [])))];
      await Promise.all(families.map((family) => loadFont(family).catch(() => undefined)));
      if (cancelled || !canvasElRef.current) return;

      canvasRef.current?.dispose?.();
      const canvas = new fabric.StaticCanvas(canvasElRef.current, { width: surface.width * scale, height: surface.height * scale, enableRetinaScaling: true });
      canvasRef.current = canvas;
      canvas.setZoom(scale);
      await applyBackgroundToCanvas(fabric, canvas, surface.background, surface);
      const objects = await hydrateFabricLayers(fabric, surface, { interactive: false });
      if (cancelled) return;
      const ordered = [...surface.layers].sort((a, b) => a.zIndex - b.zIndex);
      for (const layer of ordered) {
        const object = objects.get(layer.id);
        if (object && layer.visible !== false) canvas.add(object);
      }
      canvas.renderAll();
      setGeometry(JSON.stringify(readLiveGeometry(canvas.getObjects())));
    })();
    return () => {
      cancelled = true;
    };
  }, [surface, scale, loadFont]);

  useEffect(() => () => {
    canvasRef.current?.dispose?.();
    canvasRef.current = null;
  }, []);

  return (
    <div ref={stageRef} className="cover-preview-surface" data-testid="cover-preview-surface">
      <div
        className="cover-preview-paper"
        style={{ width: surface.width * scale, height: surface.height * scale }}
        data-testid="cover-preview-paper"
        data-preview-scale={scale}
        data-preview-geometry={geometry}
        data-background={JSON.stringify(surface.background.kind === 'image' ? { kind: 'image', fit: surface.background.fit, frame: surface.background.frame ?? null } : { kind: surface.background.kind })}
      >
        <canvas ref={canvasElRef} />
      </div>
    </div>
  );
}
