'use client';

/**
 * Cover Studio v2 — interactive Fabric.js canvas (Fase B).
 *
 * Hydrates a `DesignSurface` into a live Fabric canvas: drag/resize/rotate
 * (Fabric's native object controls — no hand-rolled pointer math), native
 * multi-select (`ActiveSelection`, Shift+click), keyboard move/duplicate/
 * delete/undo/redo (never intercepted while a Fabric text object is being
 * edited or a real DOM input has focus), JSON-snapshot undo/redo history,
 * and viewport-only zoom (`canvas.setZoom`, never touches layer data —
 * mission §24).
 *
 * The canvas is the interaction surface, not the source of truth: every
 * transform change is reported upward via `onLayerChange`; the parent owns
 * `surface` and passes it back down. External changes (a properties-panel
 * edit, a template switch, add/remove layer) are diffed against the last
 * synced snapshot and applied to the matching Fabric object in place,
 * preserving selection — never a full re-hydrate on every prop change.
 */

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { getFabric } from '@/lib/canvas-utils';
import { createGuideManager, type CanvasGuideManager } from '@/lib/canvas-guides';
import {
  applyBackgroundToCanvas,
  hydrateFabricLayerObject,
  normalizeFabricObjectScale,
  readLayerPatchFromFabricObject,
} from '@/lib/projects/design-surface-fabric';
import { createDesignLayer, type DesignLayer, type DesignSurface } from '@/lib/projects/design-surface';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FabricObject = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FabricCanvas = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FabricEvent = any;

/** Fabric's `requestRenderAll` (batched, preferred) isn't on every build/mock; falls back to the always-available `renderAll`. */
function renderCanvas(canvas: FabricCanvas): void {
  if (typeof canvas.requestRenderAll === 'function') {
    canvas.requestRenderAll();
  } else {
    canvas.renderAll();
  }
}

export interface DesignSurfaceCanvasHandle {
  deleteSelected(): void;
  duplicateSelected(): void;
  undo(): void;
  redo(): void;
  canUndo(): boolean;
  canRedo(): boolean;
  setZoom(factor: number): void;
  zoomToFit(): void;
  selectLayers(layerIds: string[]): void;
}

export interface DesignSurfaceCanvasProps {
  surface: DesignSurface;
  onLayerChange: (layerId: string, patch: Partial<DesignLayer>) => void;
  onLayersChange: (layers: DesignLayer[]) => void;
  onSelectionChange: (layerIds: string[]) => void;
  /** Container size available to the canvas — used for zoom-to-fit and CSS scaling. */
  viewportSize?: { width: number; height: number };
  /** Snapping to canvas edges/center, guides and other layer edges (mission §15). Defaults to true; the user can turn it off temporarily. */
  snapEnabled?: boolean;
  onZoomChange?: (zoom: number) => void;
  /** Fires after every history push/undo/redo — the only render-safe way for a toolbar to know canUndo/canRedo (reading the imperative handle's ref during render is not allowed). */
  onHistoryChange?: (state: { canUndo: boolean; canRedo: boolean }) => void;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable;
}

export const DesignSurfaceCanvas = forwardRef<DesignSurfaceCanvasHandle, DesignSurfaceCanvasProps>(
  function DesignSurfaceCanvas(
    { surface, onLayerChange, onLayersChange, onSelectionChange, viewportSize, snapEnabled = true, onZoomChange, onHistoryChange },
    ref,
  ) {
    const canvasElRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const fabricRef = useRef<FabricCanvas | null>(null);
    const fabricModuleRef = useRef<FabricCanvas | null>(null);
    const objectsByIdRef = useRef<Map<string, FabricObject>>(new Map());
    const lastSyncedLayersRef = useRef<Map<string, string>>(new Map());
    const historyRef = useRef<string[]>([]);
    const historyIndexRef = useRef(-1);
    const guideManagerRef = useRef<CanvasGuideManager | null>(null);
    const snapEnabledRef = useRef(snapEnabled);
    const [, forceRender] = useState(0);
    const [zoom, setZoomState] = useState(1);
    const suppressHistoryRef = useRef(false);

    useEffect(() => {
      snapEnabledRef.current = snapEnabled;
    }, [snapEnabled]);

    const pushHistory = useCallback(() => {
      const canvas = fabricRef.current;
      if (!canvas) return;
      const snapshot = JSON.stringify(canvas.toJSON(['id']));
      if (historyRef.current[historyIndexRef.current] === snapshot) return;
      historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
      historyRef.current.push(snapshot);
      historyIndexRef.current = historyRef.current.length - 1;
      forceRender((n) => n + 1);
      onHistoryChange?.({ canUndo: historyIndexRef.current > 0, canRedo: false });
    }, [onHistoryChange]);

    const reportLayerChange = useCallback(
      (object: FabricObject) => {
        if (!object?.id) return;
        normalizeFabricObjectScale(object);
        onLayerChange(object.id, readLayerPatchFromFabricObject(object));
      },
      [onLayerChange],
    );

    // Mount once: build the canvas, hydrate the initial surface, wire events.
    useEffect(() => {
      let disposed = false;

      (async () => {
        if (!canvasElRef.current) return;
        const fabric = await getFabric();
        if (disposed) return;
        fabricModuleRef.current = fabric;

        const canvas = new fabric.Canvas(canvasElRef.current, {
          width: surface.width,
          height: surface.height,
          selection: true,
          preserveObjectStacking: true,
        });
        fabricRef.current = canvas;
        guideManagerRef.current = createGuideManager(canvas);
        guideManagerRef.current.setCustomGuides(surface.guides ?? []);
        guideManagerRef.current.setZoom(1);

        await applyBackgroundToCanvas(fabric, canvas, surface.background, surface);

        const sorted = [...surface.layers].sort((a, b) => a.zIndex - b.zIndex);
        for (const layer of sorted) {
          const object = await hydrateFabricLayerObject(fabric, layer);
          if (!object) continue;
          objectsByIdRef.current.set(layer.id, object);
          lastSyncedLayersRef.current.set(layer.id, JSON.stringify(layer));
          canvas.add(object);
        }
        canvas.renderAll();

        historyRef.current = [JSON.stringify(canvas.toJSON(['id']))];
        historyIndexRef.current = 0;

        const emitSelection = (event: FabricEvent) => {
          const selected: FabricObject[] = event.selected ?? (event.target ? [event.target] : []);
          onSelectionChange(selected.map((object) => object.id).filter(Boolean));
        };

        canvas.on('selection:created', emitSelection);
        canvas.on('selection:updated', emitSelection);
        canvas.on('selection:cleared', () => onSelectionChange([]));

        // Snapping (mission §15): live alignment guides while dragging, with
        // visual feedback (CanvasGuideManager already draws distance labels
        // and canvas/object edge lines); actually moving the object to the
        // snapped position only happens when snapping is enabled, but the
        // guide lines themselves are informational either way.
        canvas.on('object:moving', (event: FabricEvent) => {
          const target = event.target;
          if (!target) return;
          const guideManager = guideManagerRef.current;
          if (!guideManager) return;
          guideManager.showGuides(target);
          const nativeEvent = event.e ?? event;
          if (snapEnabledRef.current && !nativeEvent.altKey) guideManager.snapToGuides(target);
        });

        canvas.on('object:modified', (event: FabricEvent) => {
          guideManagerRef.current?.hideGuidesWithAnimation();
          if (suppressHistoryRef.current) return;
          if (event.target) reportLayerChange(event.target);
          pushHistory();
        });

        fabricRef.current = canvas;
        forceRender((n) => n + 1);
      })();

      return () => {
        disposed = true;
        guideManagerRef.current?.dispose();
        guideManagerRef.current = null;
        fabricRef.current?.dispose();
        fabricRef.current = null;
        // Read fresh at cleanup time deliberately — the async hydration
        // above may still be populating these maps when unmount happens
        // before it resolves; a value copied at effect-run time would miss
        // whatever it added since.
        // eslint-disable-next-line react-hooks/exhaustive-deps
        objectsByIdRef.current.clear();
        // eslint-disable-next-line react-hooks/exhaustive-deps
        lastSyncedLayersRef.current.clear();
      };
      // Intentionally mount-once: the surface passed in on the FIRST render
      // seeds the canvas; every later change is applied via the diff effect
      // below, never by remounting.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Diff-and-apply: external changes (properties panel, template switch,
    // add/remove) get reconciled against the live Fabric objects instead of
    // a full re-hydrate, so selection/interaction state survives.
    useEffect(() => {
      const canvas = fabricRef.current;
      if (!canvas) return;

      let cancelled = false;

      (async () => {
        const fabric = await getFabric();
        if (cancelled) return;

        const currentIds = new Set(surface.layers.map((layer) => layer.id));
        for (const [id, object] of [...objectsByIdRef.current.entries()]) {
          if (!currentIds.has(id)) {
            canvas.remove(object);
            objectsByIdRef.current.delete(id);
            lastSyncedLayersRef.current.delete(id);
          }
        }

        for (const layer of [...surface.layers].sort((a, b) => a.zIndex - b.zIndex)) {
          const serialized = JSON.stringify(layer);
          if (lastSyncedLayersRef.current.get(layer.id) === serialized) continue;

          const existing = objectsByIdRef.current.get(layer.id);
          // Image fit/crop/filter changes alter the Fabric source frame and
          // scale, so rebuild the object from the canonical layer rather than
          // applying only the common style patch.
          const needsRebuild = !existing || layer.type === 'image';

          if (needsRebuild) {
            if (existing) canvas.remove(existing);
            const object = await hydrateFabricLayerObject(fabric, layer);
            if (object) {
              objectsByIdRef.current.set(layer.id, object);
              canvas.add(object);
            }
          } else {
            existing.set(fabricPatchFromLayer(layer));
            existing.setCoords?.();
          }
          lastSyncedLayersRef.current.set(layer.id, serialized);
        }

        // The layer array is the single z-order source of truth. Fabric does
        // not reorder objects when only zIndex changes, so reconcile its stack
        // after panel reorder actions.
        [...surface.layers]
          .sort((a, b) => a.zIndex - b.zIndex)
          .forEach((layer, index) => {
            const object = objectsByIdRef.current.get(layer.id);
            if (object) canvas.moveObjectTo?.(object, index);
          });

        renderCanvas(canvas);
        // Property-panel and layer-panel edits arrive through the canonical
        // surface rather than Fabric events. Record them here as one history
        // entry; pushHistory deduplicates the snapshot emitted by a drag.
        pushHistory();
      })();

      return () => {
        cancelled = true;
      };
    }, [pushHistory, surface.layers]);

    // Background changes independently of the layer array.
    useEffect(() => {
      const canvas = fabricRef.current;
      if (!canvas) return;
      let cancelled = false;
      (async () => {
        const fabric = await getFabric();
        if (cancelled) return;
        await applyBackgroundToCanvas(fabric, canvas, surface.background, surface);
        renderCanvas(canvas);
      })();
      return () => {
        cancelled = true;
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps -- re-runs only when the background value itself changes, deliberately excluding `surface` (width/height are stable for a given editor session).
    }, [surface.background]);

    // Guides changing (added/removed via the guides UI) refreshes the
    // guide manager's snap targets — never re-hydrates the canvas.
    useEffect(() => {
      guideManagerRef.current?.setCustomGuides(surface.guides ?? []);
    }, [surface.guides]);

    const applyHistorySnapshot = useCallback(
      (snapshot: string) => {
        const canvas = fabricRef.current;
        if (!canvas) return;
        suppressHistoryRef.current = true;
        canvas.loadFromJSON(snapshot, () => {
          canvas.getObjects().forEach((object: FabricObject) => object.setCoords?.());
          renderCanvas(canvas);
          suppressHistoryRef.current = false;

          const layers: DesignLayer[] = [];
          canvas.getObjects().forEach((object: FabricObject, index: number) => {
            if (!object.id) return;
            objectsByIdRef.current.set(object.id, object);
            const existingLayer = surface.layers.find((layer) => layer.id === object.id);
            if (!existingLayer) return;
            const patch = readLayerPatchFromFabricObject(object);
            layers.push({ ...existingLayer, ...patch, zIndex: index } as DesignLayer);
          });
          onLayersChange(layers);
          onHistoryChange?.({
            canUndo: historyIndexRef.current > 0,
            canRedo: historyIndexRef.current < historyRef.current.length - 1,
          });
        });
      },
      [onHistoryChange, onLayersChange, surface.layers],
    );

    useImperativeHandle(
      ref,
      (): DesignSurfaceCanvasHandle => ({
        deleteSelected() {
          const canvas = fabricRef.current;
          if (!canvas) return;
          const active = canvas.getActiveObjects?.() ?? [];
          if (active.length === 0) return;
          for (const object of active) {
            canvas.remove(object);
            if (object.id) objectsByIdRef.current.delete(object.id);
          }
          canvas.discardActiveObject?.();
          renderCanvas(canvas);
          onLayersChange(
            canvas
              .getObjects()
              .map((object: FabricObject, index: number) => {
                const layer = surface.layers.find((candidate) => candidate.id === object.id);
                return layer ? ({ ...layer, zIndex: index } as DesignLayer) : null;
              })
              .filter((layer: DesignLayer | null): layer is DesignLayer => Boolean(layer)),
          );
          pushHistory();
        },
        duplicateSelected() {
          const canvas = fabricRef.current;
          if (!canvas) return;
          const active = canvas.getActiveObject?.();
          if (!active?.id) return;
          const sourceLayer = surface.layers.find((layer) => layer.id === active.id);
          if (!sourceLayer) return;
          const duplicated = createDesignLayer(
            { ...sourceLayer, x: sourceLayer.x + 16, y: sourceLayer.y + 16 },
            surface.layers.length + 1,
          );
          onLayersChange([...surface.layers, duplicated]);
          onSelectionChange([duplicated.id]);
        },
        undo() {
          if (historyIndexRef.current <= 0) return;
          historyIndexRef.current -= 1;
          applyHistorySnapshot(historyRef.current[historyIndexRef.current]);
        },
        redo() {
          if (historyIndexRef.current >= historyRef.current.length - 1) return;
          historyIndexRef.current += 1;
          applyHistorySnapshot(historyRef.current[historyIndexRef.current]);
        },
        canUndo() {
          return historyIndexRef.current > 0;
        },
        canRedo() {
          return historyIndexRef.current < historyRef.current.length - 1;
        },
        setZoom(factor: number) {
          const canvas = fabricRef.current;
          if (!canvas) return;
          canvas.setZoom(factor);
          canvas.setDimensions({ width: surface.width * factor, height: surface.height * factor });
          guideManagerRef.current?.setZoom(factor);
          setZoomState(factor);
          onZoomChange?.(factor);
        },
        zoomToFit() {
          if (!viewportSize) return;
          const factor = Math.min(viewportSize.width / surface.width, viewportSize.height / surface.height, 1);
          const canvas = fabricRef.current;
          if (!canvas) return;
          canvas.setZoom(factor);
          canvas.setDimensions({ width: surface.width * factor, height: surface.height * factor });
          guideManagerRef.current?.setZoom(factor);
          setZoomState(factor);
          onZoomChange?.(factor);
        },
        selectLayers(layerIds: string[]) {
          const canvas = fabricRef.current;
          if (!canvas) return;
          if (layerIds.length === 0) {
            canvas.discardActiveObject?.();
            renderCanvas(canvas);
            return;
          }
          const matchedObjects = layerIds
            .map((id) => objectsByIdRef.current.get(id))
            .filter((obj): obj is FabricObject => Boolean(obj));

          if (matchedObjects.length === 0) {
            canvas.discardActiveObject?.();
          } else if (matchedObjects.length === 1) {
            canvas.setActiveObject?.(matchedObjects[0]);
          } else {
            const fabric = fabricModuleRef.current;
            if (fabric?.ActiveSelection) {
              const selection = new fabric.ActiveSelection(matchedObjects, { canvas });
              canvas.setActiveObject?.(selection);
            }
          }
          renderCanvas(canvas);
        },
      }),
      [applyHistorySnapshot, onLayersChange, onSelectionChange, onZoomChange, pushHistory, surface.layers, viewportSize, surface.width, surface.height],
    );

    // Keyboard: arrow move / Shift+arrow larger step / Delete / Cmd-Ctrl+D
    // duplicate / Cmd-Ctrl+Z undo / Cmd-Ctrl+Shift+Z redo. Never while a Fabric
    // text object is mid-edit or a real DOM input has focus (mission §27).
    useEffect(() => {
      function handleKeyDown(event: KeyboardEvent) {
        const canvas = fabricRef.current;
        if (!canvas) return;
        if (isEditableTarget(event.target)) return;
        const activeObject = canvas.getActiveObject?.();
        if (activeObject?.isEditing) return;
        if (!containerRef.current?.contains(document.activeElement) && document.activeElement !== document.body) return;

        const meta = event.metaKey || event.ctrlKey;

        if (meta && event.key.toLowerCase() === 'z') {
          event.preventDefault();
          if (event.shiftKey) {
            if (historyIndexRef.current < historyRef.current.length - 1) {
              historyIndexRef.current += 1;
              applyHistorySnapshot(historyRef.current[historyIndexRef.current]);
            }
          } else if (historyIndexRef.current > 0) {
            historyIndexRef.current -= 1;
            applyHistorySnapshot(historyRef.current[historyIndexRef.current]);
          }
          return;
        }

        if (!activeObject) return;

        if (event.key === 'Delete' || event.key === 'Backspace') {
          event.preventDefault();
          canvas.remove(activeObject);
          if (activeObject.id) objectsByIdRef.current.delete(activeObject.id);
          canvas.discardActiveObject?.();
          renderCanvas(canvas);
          onLayersChange(
            canvas
              .getObjects()
              .map((object: FabricObject, index: number) => {
                const layer = surface.layers.find((candidate) => candidate.id === object.id);
                return layer ? ({ ...layer, zIndex: index } as DesignLayer) : null;
              })
              .filter((layer: DesignLayer | null): layer is DesignLayer => Boolean(layer)),
          );
          pushHistory();
          return;
        }

        if (meta && event.key.toLowerCase() === 'd') {
          event.preventDefault();
          const sourceLayer = surface.layers.find((layer) => layer.id === activeObject.id);
          if (sourceLayer) {
            onLayersChange([
              ...surface.layers,
              createDesignLayer({ ...sourceLayer, x: sourceLayer.x + 16, y: sourceLayer.y + 16 }, surface.layers.length + 1),
            ]);
          }
          return;
        }

        const step = event.shiftKey ? 10 : 1;
        const arrowDeltas: Record<string, [number, number]> = {
          ArrowUp: [0, -step],
          ArrowDown: [0, step],
          ArrowLeft: [-step, 0],
          ArrowRight: [step, 0],
        };
        const delta = arrowDeltas[event.key];
        if (delta) {
          event.preventDefault();
          activeObject.set({ left: (activeObject.left ?? 0) + delta[0], top: (activeObject.top ?? 0) + delta[1] });
          activeObject.setCoords?.();
          renderCanvas(canvas);
          reportLayerChange(activeObject);
          pushHistory();
        }
      }

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }, [applyHistorySnapshot, onLayersChange, pushHistory, reportLayerChange, surface.layers]);

    return (
      <div ref={containerRef} tabIndex={0} data-testid="design-surface-canvas" className="outline-none">
        <canvas ref={canvasElRef} />
        <span data-testid="design-surface-canvas-zoom" className="sr-only">
          {Math.round(zoom * 100)}%
        </span>
      </div>
    );
  },
);

/** Non-transform, style-only properties `.set()` can apply to an existing Fabric object without reconstructing it (transform fields are handled by the interactive canvas itself and skipped here to avoid fighting an in-progress drag). */
function fabricPatchFromLayer(layer: DesignLayer): Record<string, unknown> {
  const patch: Record<string, unknown> = {
    opacity: layer.opacity,
    visible: layer.visible,
    selectable: !layer.locked,
    evented: !layer.locked,
    left: layer.x,
    top: layer.y,
    angle: layer.rotation,
  };

  if (layer.type === 'text') {
    const displayText =
      layer.textTransform === 'uppercase'
        ? layer.content.toUpperCase()
        : layer.textTransform === 'lowercase'
          ? layer.content.toLowerCase()
          : layer.content;
    Object.assign(patch, {
      text: displayText,
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
    });
  }

  if (layer.type === 'shape') {
    Object.assign(patch, { fill: layer.fill, stroke: layer.stroke, strokeWidth: layer.strokeWidth, width: layer.width, height: layer.height });
  }

  return patch;
}
