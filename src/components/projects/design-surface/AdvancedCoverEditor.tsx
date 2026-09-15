'use client';

/**
 * Cover Studio v2 — Advanced editor (mission §30-31). Assembles every piece
 * built in Fase B-D into the layout mission §31 specifies:
 *
 *   top toolbar
 *   ├── Layers ── Canvas (rulers/guides/overlays) ── Properties
 *   └── zoom / status
 *
 * Owns the interaction-only state (selection, zoom, snap/grid/safe-area
 * toggles) — the canonical `DesignSurface` itself is fully controlled by
 * the parent (`onChange`), so Basic <-> Advanced mode switching (mission
 * §61-62) never loses data: both modes edit the exact same object.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Grid3x3,
  Magnet,
  Maximize,
  Redo2,
  RotateCcw,
  ShieldCheck,
  Undo2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import type { AppMessages } from '@/lib/i18n/messages';
import {
  applyOriginalPageBackground,
  createDesignLayer,
  type DesignLayer,
  type DesignSurface,
} from '@/lib/projects/design-surface';
import { DesignSurfaceCanvas, type DesignSurfaceCanvasHandle } from './DesignSurfaceCanvas';
import { CanvasRulers, CANVAS_RULER_THICKNESS } from './CanvasRulers';
import { CanvasOverlays, type GridDensity } from './CanvasOverlays';
import { LayersPanel, buildLayersPanelCopy, reorderLayers } from './LayersPanel';
import { PropertiesPanel } from './PropertiesPanel';

export interface AdvancedCoverEditorProps {
  surface: DesignSurface;
  onChange: (surface: DesignSurface) => void;
  copy: AppMessages['coverDesignSurface'];
  brandColors?: string[];
  /** The pristine rasterized original-page image (mission §33-39) — set only when the surface has an `originAssetId`. Powers "Reset to original"; the page/loader supplies it, since only it knows how to re-rasterize on demand. */
  originalBackgroundSrc?: string;
  /** role -> value the metadata precedence chain currently resolves to (mission §40-41), forwarded to the properties panel's "Actualizar desde metadatos" action. */
  metadataValues?: Partial<Record<string, string>>;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function AdvancedCoverEditor({ surface, onChange, copy, brandColors, originalBackgroundSrc, metadataValues }: AdvancedCoverEditorProps) {
  const canvasRef = useRef<DesignSurfaceCanvasHandle>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [selectedLayerIds, setSelectedLayerIds] = useState<string[]>([]);
  const [zoom, setZoom] = useState(1);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [grid, setGrid] = useState<GridDensity>('none');
  const [showSafeArea, setShowSafeArea] = useState(false);
  const [historyState, setHistoryState] = useState({ canUndo: false, canRedo: false });
  const [viewportSize, setViewportSize] = useState<{ width: number; height: number } | undefined>(undefined);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      setViewportSize({ width: entry.contentRect.width - CANVAS_RULER_THICKNESS - 48, height: entry.contentRect.height - CANVAS_RULER_THICKNESS - 48 });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const layersCopy = useMemo(() => buildLayersPanelCopy(copy), [copy]);
  const selectedLayers = surface.layers.filter((layer) => selectedLayerIds.includes(layer.id));

  const patchLayer = useCallback(
    (layerId: string, patch: Partial<DesignLayer>) => {
      onChange({
        ...surface,
        layers: surface.layers.map((layer) => (layer.id === layerId ? ({ ...layer, ...patch } as DesignLayer) : layer)),
      });
    },
    [onChange, surface],
  );

  const setLayers = useCallback(
    (layers: DesignLayer[]) => {
      onChange({ ...surface, layers });
    },
    [onChange, surface],
  );

  const handleReplaceImage = useCallback(
    async (layerId: string, file: File) => {
      const src = await readFileAsDataUrl(file);
      patchLayer(layerId, { src } as Partial<DesignLayer>);
    },
    [patchLayer],
  );

  const handleReorder = useCallback(
    (layerId: string, direction: 'up' | 'down' | 'front' | 'back') => {
      setLayers(reorderLayers(surface.layers, layerId, direction));
    },
    [setLayers, surface.layers],
  );

  const handleSelect = useCallback((layerId: string, options?: { additive?: boolean }) => {
    setSelectedLayerIds((current) => {
      if (!options?.additive) return [layerId];
      return current.includes(layerId) ? current.filter((id) => id !== layerId) : [...current, layerId];
    });
  }, []);

  const canResetToOriginal = Boolean(surface.originAssetId && originalBackgroundSrc);
  const handleResetToOriginal = useCallback(() => {
    if (!surface.originAssetId || !originalBackgroundSrc) return;
    if (!window.confirm(copy.origin.resetToOriginalConfirm)) return;
    onChange(
      applyOriginalPageBackground(surface, {
        assetId: surface.originAssetId,
        mode: surface.originMode === 'use-original' ? 'use-original' : 'edit-original',
        imageDataUrl: originalBackgroundSrc,
      }),
    );
    setSelectedLayerIds([]);
  }, [copy.origin.resetToOriginalConfirm, onChange, originalBackgroundSrc, surface]);

  return (
    <div className="ac-editor-shell" data-testid="advanced-cover-editor">
      <header className="ac-editor-shell__header">
        <div className="ac-editor-shell__controls">
          <button
            type="button"
            data-testid="advanced-editor-undo-button"
            onClick={() => canvasRef.current?.undo()}
            disabled={!historyState.canUndo}
            className="ac-button ac-button--ghost ac-button--icon ac-button--sm disabled:opacity-30"
            title="Undo"
          >
            <Undo2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            data-testid="advanced-editor-redo-button"
            onClick={() => canvasRef.current?.redo()}
            disabled={!historyState.canRedo}
            className="ac-button ac-button--ghost ac-button--icon ac-button--sm disabled:opacity-30"
            title="Redo"
          >
            <Redo2 className="h-4 w-4" />
          </button>

          <button
            type="button"
            data-testid="advanced-editor-snap-toggle"
            onClick={() => setSnapEnabled((v) => !v)}
            data-active={snapEnabled ? 'true' : 'false'}
            className="ac-button ac-button--ghost ac-button--icon ac-button--sm"
            title="Snapping"
          >
            <Magnet className="h-4 w-4" />
          </button>
          <button
            type="button"
            data-testid="advanced-editor-safe-area-toggle"
            onClick={() => setShowSafeArea((v) => !v)}
            data-active={showSafeArea ? 'true' : 'false'}
            className="ac-button ac-button--ghost ac-button--icon ac-button--sm"
            title="Safe area"
          >
            <ShieldCheck className="h-4 w-4" />
          </button>
          <button
            type="button"
            data-testid="advanced-editor-grid-cycle-button"
            onClick={() => setGrid((current) => (current === 'none' ? 'fine' : current === 'fine' ? 'medium' : 'none'))}
            data-active={grid !== 'none' ? 'true' : 'false'}
            className="ac-button ac-button--ghost ac-button--icon ac-button--sm"
            title="Grid"
          >
            <Grid3x3 className="h-4 w-4" />
          </button>
          {canResetToOriginal && (
            <button
              type="button"
              data-testid="advanced-editor-reset-to-original-button"
              onClick={handleResetToOriginal}
              className="ac-button ac-button--ghost ac-button--icon ac-button--sm"
              title={copy.origin.resetToOriginalLabel}
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="ac-editor-shell__actions">
          <button
            type="button"
            data-testid="advanced-editor-zoom-out-button"
            onClick={() => canvasRef.current?.setZoom(Math.max(0.25, zoom - 0.1))}
            className="ac-button ac-button--ghost ac-button--icon ac-button--sm"
            title="Zoom out"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          <span data-testid="advanced-editor-zoom-value" className="ac-preview-control-value">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            data-testid="advanced-editor-zoom-in-button"
            onClick={() => canvasRef.current?.setZoom(Math.min(2, zoom + 0.1))}
            className="ac-button ac-button--ghost ac-button--icon ac-button--sm"
            title="Zoom in"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <button
            type="button"
            data-testid="advanced-editor-zoom-fit-button"
            onClick={() => canvasRef.current?.zoomToFit()}
            className="ac-button ac-button--ghost ac-button--icon ac-button--sm"
            title="Fit"
          >
            <Maximize className="h-4 w-4" />
          </button>
          <button
            type="button"
            data-testid="advanced-editor-zoom-100-button"
            onClick={() => canvasRef.current?.setZoom(1)}
            className="ac-button ac-button--ghost ac-button--sm"
          >
            100%
          </button>
        </div>
      </header>

      <div className="ac-editor-shell__main grid-cols-[220px_minmax(0,1fr)_260px]" style={{ display: 'grid', gridTemplateColumns: '220px minmax(0,1fr) 260px', gap: '0.75rem' }}>
        <aside className="ac-editor-shell__surface overflow-auto" data-testid="advanced-editor-layers-column">
          <LayersPanel
            layers={surface.layers}
            selectedLayerIds={selectedLayerIds}
            copy={layersCopy}
            onSelect={handleSelect}
            onRename={(layerId, name) => patchLayer(layerId, { name })}
            onToggleVisibility={(layerId) => {
              const layer = surface.layers.find((l) => l.id === layerId);
              if (layer) patchLayer(layerId, { visible: !layer.visible });
            }}
            onToggleLock={(layerId) => {
              const layer = surface.layers.find((l) => l.id === layerId);
              if (layer) patchLayer(layerId, { locked: !layer.locked });
            }}
            onDuplicate={(layerId) => {
              const layer = surface.layers.find((l) => l.id === layerId);
              if (layer) setLayers([...surface.layers, createDesignLayer({ ...layer, x: layer.x + 16, y: layer.y + 16 }, surface.layers.length + 1)]);
            }}
            onDelete={(layerId) => setLayers(surface.layers.filter((l) => l.id !== layerId))}
            onReorder={handleReorder}
          />
        </aside>

        <div ref={viewportRef} className="ac-editor-shell__surface relative overflow-auto" data-testid="advanced-editor-canvas-column">
          <div style={{ padding: CANVAS_RULER_THICKNESS + 24 }}>
            <div className="relative" style={{ marginLeft: CANVAS_RULER_THICKNESS, marginTop: CANVAS_RULER_THICKNESS }}>
              <CanvasRulers width={surface.width} height={surface.height} zoom={zoom} />
              <div style={{ position: 'relative' }}>
                <DesignSurfaceCanvas
                  ref={canvasRef}
                  surface={surface}
                  onLayerChange={patchLayer}
                  onLayersChange={setLayers}
                  onSelectionChange={setSelectedLayerIds}
                  snapEnabled={snapEnabled}
                  onZoomChange={setZoom}
                  onHistoryChange={setHistoryState}
                  viewportSize={viewportSize}
                />
                <CanvasOverlays
                  width={surface.width}
                  height={surface.height}
                  zoom={zoom}
                  guides={surface.guides ?? []}
                  onGuidesChange={(guides) => onChange({ ...surface, guides })}
                  safeArea={surface.safeArea}
                  showSafeArea={showSafeArea}
                  isbnArea={surface.isbnArea}
                  grid={grid}
                  copy={copy}
                />
              </div>
            </div>
          </div>
        </div>

        <aside className="ac-editor-shell__surface overflow-auto p-3" data-testid="advanced-editor-properties-column">
          <PropertiesPanel
            selectedLayers={selectedLayers}
            copy={copy}
            brandColors={brandColors}
            onLayerChange={patchLayer}
            onReplaceImage={handleReplaceImage}
            metadataValues={metadataValues}
          />
        </aside>
      </div>

      <footer className="ac-editor-shell__footer" data-testid="advanced-editor-status-bar">
        <span data-testid="advanced-editor-layer-count">{surface.layers.length}</span>
        <span>{surface.width}×{surface.height}</span>
      </footer>
    </div>
  );
}
