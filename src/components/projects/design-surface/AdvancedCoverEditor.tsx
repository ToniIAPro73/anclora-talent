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
  AlignHorizontalJustifyCenter,
  AlignHorizontalJustifyEnd,
  AlignHorizontalJustifyStart,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  AlignVerticalJustifyStart,
  ImagePlus,
  Shapes,
  Type,
  Magnet,
  Maximize,
  RotateCcw,
  RotateCw,
  ShieldCheck,
  Sparkles,
  ZoomIn,
  ZoomOut,
  ChevronDown,
  Eye,
  Grid2X2,
  Image as ImageIcon,
  Minus,
} from 'lucide-react';
import type { AppMessages } from '@/lib/i18n/messages';
import {
  applyOriginalPageBackground,
  createDesignLayer,
  type DesignLayer,
  type DesignSurface,
} from '@/lib/projects/design-surface';
import { alignLayers, type LayerAlignment } from '@/lib/projects/layer-geometry';
import { DesignSurfaceCanvas, type DesignSurfaceCanvasHandle } from './DesignSurfaceCanvas';
import { CanvasRulers, CANVAS_RULER_THICKNESS } from './CanvasRulers';
import { CanvasOverlays, type GridDensity } from './CanvasOverlays';
import { LayersPanel, buildLayersPanelCopy, reorderLayers } from './LayersPanel';
import { PropertiesPanel } from './PropertiesPanel';
import { BackgroundEditor } from './BackgroundEditor';
import { DesignSurfaceRenderer } from './DesignSurfaceRenderer';
import { COVER_TEMPLATES, BACK_COVER_TEMPLATES, type EditorialTemplate } from '@/lib/projects/cover-templates';
import { buildDesignSurfaceFromTemplate } from '@/lib/projects/design-surface-templates';

export interface AdvancedCoverEditorProps {
  surface: DesignSurface;
  onChange: (surface: DesignSurface) => void;
  copy: AppMessages['coverDesignSurface'];
  brandColors?: string[];
  /** The pristine rasterized original-page image (mission §33-39) — set only when the surface has an `originAssetId`. Powers "Reset to original"; the page/loader supplies it, since only it knows how to re-rasterize on demand. */
  originalBackgroundSrc?: string;
  /** role -> value the metadata precedence chain currently resolves to (mission §40-41), forwarded to the properties panel's "Actualizar desde metadatos" action. */
  metadataValues?: Partial<Record<string, string>>;
  saveStatus?: 'idle' | 'saving' | 'saved' | 'error';
  onSaveFinal?: () => void;
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function AdvancedCoverEditor({ surface, onChange, copy, brandColors, originalBackgroundSrc, metadataValues, saveStatus = 'idle', onSaveFinal }: AdvancedCoverEditorProps) {
  const canvasRef = useRef<DesignSurfaceCanvasHandle>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [selectedLayerIds, setSelectedLayerIds] = useState<string[]>([]);
  const [zoom, setZoom] = useState(1);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [grid, setGrid] = useState<GridDensity>('none');
  const [showSafeArea, setShowSafeArea] = useState(false);
  const [historyState, setHistoryState] = useState({ canUndo: false, canRedo: false });
  const [viewportSize, setViewportSize] = useState<{ width: number; height: number } | undefined>(undefined);
  const [activeTool, setActiveTool] = useState<'elements' | 'text' | 'images' | 'shapes' | 'lines' | 'icons' | 'background'>('elements');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [isPreview, setIsPreview] = useState(false);
  const [imageQualityWarning, setImageQualityWarning] = useState<string | null>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const templates: EditorialTemplate[] = surface.surface === 'cover' ? COVER_TEMPLATES : BACK_COVER_TEMPLATES;

  useEffect(() => {
    const el = viewportRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
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
      const next = !options?.additive ? [layerId] : current.includes(layerId) ? current.filter((id) => id !== layerId) : [...current, layerId];
      return next;
    });
  }, []);

  useEffect(() => {
    canvasRef.current?.selectLayers(selectedLayerIds);
  }, [selectedLayerIds]);

  const handleObjectAlignment = useCallback(
    (alignment: LayerAlignment) => {
      if (selectedLayerIds.length === 0) return;
      setLayers(alignLayers(surface.layers, selectedLayerIds, alignment, { width: surface.width, height: surface.height }));
    },
    [selectedLayerIds, setLayers, surface.height, surface.layers, surface.width],
  );

  const duplicateLayer = useCallback(
    (layerId: string) => {
      const source = surface.layers.find((layer) => layer.id === layerId);
      if (!source) return;
      const duplicate = createDesignLayer(
        {
          ...source,
          x: source.x + 16,
          y: source.y + 16,
          name: source.name ? `${source.name} copy` : undefined,
        },
        surface.layers.length + 1,
      );
      setLayers([...surface.layers, duplicate]);
      setSelectedLayerIds([duplicate.id]);
    },
    [setLayers, surface.layers],
  );

  const appendLayer = useCallback(
    (layer: DesignLayer) => {
      setLayers([...surface.layers, layer]);
      setSelectedLayerIds([layer.id]);
    },
    [setLayers, surface.layers],
  );

  const addTextLayer = useCallback(() => {
    appendLayer(createDesignLayer({ type: 'text', content: 'Texto', x: surface.width / 2 - 110, y: surface.height / 2 - 30, width: 220, height: 60, name: 'Text' }, surface.layers.length + 1));
  }, [appendLayer, surface.height, surface.layers.length, surface.width]);

  const addShapeLayer = useCallback(() => {
    appendLayer(createDesignLayer({ type: 'shape', shape: 'rect', fill: '#061629', x: 0, y: 0, width: surface.width, height: surface.height, opacity: 0.35, name: 'Overlay' }, surface.layers.length + 1));
  }, [appendLayer, surface.height, surface.layers.length, surface.width]);

  const inspectImage = useCallback((file: File) => new Promise<{ width: number; height: number }>((resolve) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => resolve({ width: 0, height: 0 });
    image.src = URL.createObjectURL(file);
  }), []);

  const handleAddImage = useCallback(async (file: File) => {
    const src = await readFileAsDataUrl(file);
    const dimensions = await inspectImage(file);
    setImageQualityWarning(dimensions.width > 0 && (dimensions.width < 800 || dimensions.height < 1200)
      ? `Resolución baja: ${dimensions.width} × ${dimensions.height}px. La imagen se ha importado igualmente.`
      : null);
    appendLayer(createDesignLayer({ type: 'image', src, fit: 'cover', x: 0, y: 0, width: surface.width, height: surface.height, name: file.name || 'Image' }, surface.layers.length + 1));
  }, [appendLayer, inspectImage, surface.height, surface.layers.length, surface.width]);

  const handleImportCover = useCallback(async (file: File) => {
    const src = await readFileAsDataUrl(file);
    const dimensions = await inspectImage(file);
    setImageQualityWarning(dimensions.width > 0 && (dimensions.width < 1200 || dimensions.height < 1800)
      ? `Resolución baja: ${dimensions.width} × ${dimensions.height}px. La portada se ha importado igualmente.`
      : null);
    onChange({ ...surface, background: { kind: 'image', src, fit: 'cover', opacity: 1 }, originAssetId: null, originMode: 'blank' });
  }, [inspectImage, onChange, surface]);

  const applyTemplate = useCallback((template: EditorialTemplate) => {
    if (surface.layers.length > 0 && !window.confirm(copy.origin.resetToTemplateConfirm)) return;
    const next = buildDesignSurfaceFromTemplate(template, { palette: 'obsidian' });
    onChange({ ...next, guides: surface.guides, safeArea: surface.safeArea, isbnArea: surface.isbnArea });
    setSelectedTemplateId(template.id);
  }, [copy.origin.resetToTemplateConfirm, onChange, surface.guides, surface.isbnArea, surface.layers.length, surface.safeArea]);

  const addLine = useCallback(() => {
    appendLayer(createDesignLayer({ type: 'shape', shape: 'line', x: surface.width * 0.18, y: surface.height * 0.5, width: surface.width * 0.64, height: 2, stroke: '#55c7ff', strokeWidth: 2, name: 'Line' }, surface.layers.length + 1));
  }, [appendLayer, surface.height, surface.layers.length, surface.width]);

  const addIcon = useCallback(() => {
    appendLayer(createDesignLayer({ type: 'shape', shape: 'ellipse', fill: '#55c7ff', x: surface.width / 2 - 18, y: surface.height / 2 - 18, width: 36, height: 36, name: 'Icon' }, surface.layers.length + 1));
  }, [appendLayer, surface.height, surface.layers.length, surface.width]);

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
    <div className="cover-workspace" data-testid="advanced-cover-editor" data-preview={isPreview ? 'true' : 'false'}>
      {/* 08A PORTADA WORKSPACE TOOLBAR */}
      <div className="cover-workspace-toolbar" data-testid="cover-workspace-toolbar">
        {/* Template selector */}
        <div className="cover-workspace-toolbar__template">
          <label htmlFor="cover-template-select" className="cover-workspace-toolbar__template-label">
            Plantilla editorial
          </label>
          <select
            id="cover-template-select"
            data-testid="cover-template-select"
            value={selectedTemplateId ?? ''}
            onChange={(event) => {
              const template = templates.find((candidate) => candidate.id === event.target.value);
              if (template) applyTemplate(template);
            }}
            className="cover-workspace-toolbar__select"
          >
            <option value="">Seleccionar plantilla</option>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </select>
        </div>

        {/* Center tools & canvas toggles */}
        <div className="cover-workspace-toolbar__tools">
          <button
            type="button"
            data-testid="advanced-editor-add-text-button"
            onClick={addTextLayer}
            className="ac-button ac-button--ghost ac-button--icon ac-button--sm"
            title={copy.fields.addFieldButtonLabel}
            aria-label={copy.fields.addFieldButtonLabel}
          >
            <Type className="h-4 w-4" />
          </button>
          <button
            type="button"
            data-testid="advanced-editor-add-shape-button"
            onClick={addShapeLayer}
            className="ac-button ac-button--ghost ac-button--icon ac-button--sm"
            title={copy.layers.untitledShape}
            aria-label={copy.layers.untitledShape}
          >
            <Shapes className="h-4 w-4" />
          </button>
          <button
            type="button"
            data-testid="advanced-editor-add-image-button"
            onClick={() => imageInputRef.current?.click()}
            className="ac-button ac-button--ghost ac-button--icon ac-button--sm"
            title={copy.image.uploadLabel}
            aria-label={copy.image.uploadLabel}
          >
            <ImagePlus className="h-4 w-4" />
          </button>
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            data-testid="advanced-editor-image-file-input"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleAddImage(file);
              event.target.value = '';
            }}
          />

          <span className="cover-toolbar-divider" />

          <button
            type="button"
            data-testid="advanced-editor-snap-toggle"
            onClick={() => setSnapEnabled((v) => !v)}
            data-active={snapEnabled ? 'true' : 'false'}
            aria-pressed={snapEnabled}
            className="ac-button ac-button--ghost ac-button--icon ac-button--sm"
            title={copy.toolbar.snappingLabel}
            aria-label={copy.toolbar.snappingLabel}
          >
            <Magnet className="h-4 w-4" />
          </button>
          <button
            type="button"
            data-testid="advanced-editor-safe-area-toggle"
            onClick={() => setShowSafeArea((v) => !v)}
            data-active={showSafeArea ? 'true' : 'false'}
            aria-pressed={showSafeArea}
            className="ac-button ac-button--ghost ac-button--icon ac-button--sm"
            title={copy.toolbar.safeAreaLabel}
            aria-label={copy.toolbar.safeAreaLabel}
          >
            <ShieldCheck className="h-4 w-4" />
          </button>
          <button
            type="button"
            data-testid="advanced-editor-grid-cycle-button"
            onClick={() => setGrid((current) => (current === 'none' ? 'fine' : current === 'fine' ? 'medium' : 'none'))}
            data-active={grid !== 'none' ? 'true' : 'false'}
            aria-pressed={grid !== 'none'}
            className="ac-button ac-button--ghost ac-button--icon ac-button--sm"
            title={copy.toolbar.gridLabel}
            aria-label={copy.toolbar.gridLabel}
          >
            <Grid3x3 className="h-4 w-4" />
          </button>

          <span className="sr-only">{copy.toolbar.objectAlignmentLabel}</span>
          {([
            ['left', AlignHorizontalJustifyStart, copy.toolbar.objectAlignLeftLabel],
            ['center-horizontal', AlignHorizontalJustifyCenter, copy.toolbar.objectAlignCenterHorizontalLabel],
            ['right', AlignHorizontalJustifyEnd, copy.toolbar.objectAlignRightLabel],
            ['top', AlignVerticalJustifyStart, copy.toolbar.objectAlignTopLabel],
            ['center-vertical', AlignVerticalJustifyCenter, copy.toolbar.objectAlignCenterVerticalLabel],
            ['bottom', AlignVerticalJustifyEnd, copy.toolbar.objectAlignBottomLabel],
          ] as const).map(([alignment, Icon, label]) => (
            <button
              key={alignment}
              type="button"
              data-testid={`advanced-editor-object-align-${alignment}-button`}
              onClick={() => handleObjectAlignment(alignment)}
              disabled={selectedLayerIds.length === 0}
              className="ac-button ac-button--ghost ac-button--icon ac-button--sm disabled:opacity-30"
              title={label}
              aria-label={label}
              aria-pressed="false"
            >
              <Icon className="h-4 w-4" />
            </button>
          ))}

          {canResetToOriginal && (
            <button
              type="button"
              data-testid="advanced-editor-reset-to-original-button"
              onClick={handleResetToOriginal}
              className="ac-button ac-button--ghost ac-button--icon ac-button--sm"
              title={copy.origin.resetToOriginalLabel}
              aria-label={copy.origin.resetToOriginalLabel}
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Right actions: Undo, Redo, Zoom, Preview, Save */}
        <div className="cover-workspace-toolbar__actions">
          <button
            type="button"
            data-testid="advanced-editor-undo-button"
            onClick={() => canvasRef.current?.undo()}
            disabled={!historyState.canUndo}
            className="ac-button ac-button--ghost ac-button--compact px-2 text-xs disabled:opacity-30 inline-flex items-center gap-1"
            title={copy.toolbar.undoLabel}
            aria-label={copy.toolbar.undoLabel}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>{copy.toolbar.undoLabel}</span>
          </button>
          <button
            type="button"
            data-testid="advanced-editor-redo-button"
            onClick={() => canvasRef.current?.redo()}
            disabled={!historyState.canRedo}
            className="ac-button ac-button--ghost ac-button--compact px-2 text-xs disabled:opacity-30 inline-flex items-center gap-1"
            title={copy.toolbar.redoLabel}
            aria-label={copy.toolbar.redoLabel}
          >
            <RotateCw className="h-3.5 w-3.5" />
            <span>{copy.toolbar.redoLabel}</span>
          </button>

          <span className="cover-toolbar-divider" />

          {/* Zoom controls */}
          <div className="cover-toolbar-zoom-group">
            <button
              type="button"
              data-testid="advanced-editor-zoom-out-button"
              onClick={() => canvasRef.current?.setZoom(Math.max(0.25, zoom - 0.1))}
              className="ac-button ac-button--ghost ac-button--icon ac-button--sm"
              title={copy.toolbar.zoomOutLabel}
              aria-label={copy.toolbar.zoomOutLabel}
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <span data-testid="advanced-editor-zoom-value" className="ac-preview-control-value px-1 text-xs font-mono">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              data-testid="advanced-editor-zoom-in-button"
              onClick={() => canvasRef.current?.setZoom(Math.min(2, zoom + 0.1))}
              className="ac-button ac-button--ghost ac-button--icon ac-button--sm"
              title={copy.toolbar.zoomInLabel}
              aria-label={copy.toolbar.zoomInLabel}
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              data-testid="advanced-editor-zoom-fit-button"
              onClick={() => canvasRef.current?.zoomToFit()}
              className="ac-button ac-button--ghost ac-button--icon ac-button--sm"
              title={copy.toolbar.zoomFitLabel}
              aria-label={copy.toolbar.zoomFitLabel}
            >
              <Maximize className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              data-testid="advanced-editor-zoom-100-button"
              onClick={() => canvasRef.current?.setZoom(1)}
              className="ac-button ac-button--ghost ac-button--compact text-xs px-1.5"
            >
              100%
            </button>
          </div>

          <span className="cover-toolbar-divider" />

          <button
            type="button"
            className="ac-button ac-button--ghost ac-button--sm inline-flex items-center gap-1.5"
            onClick={() => setIsPreview((current) => !current)}
            aria-pressed={isPreview}
            data-testid="cover-editor-preview-button"
          >
            <Eye className="h-4 w-4" />
            <span>Vista previa</span>
          </button>

          <button
            type="button"
            className="ac-button ac-button--primary ac-button--sm"
            onClick={onSaveFinal}
            data-testid="studio-save-final-button"
          >
            <span data-testid="studio-save-status" data-status={saveStatus}>
              {saveStatus === 'saving'
                ? copy.studio.savingLabel
                : saveStatus === 'saved'
                  ? copy.studio.savedLabel
                  : saveStatus === 'error'
                    ? copy.studio.saveErrorLabel
                    : surface.status === 'final'
                      ? copy.studio.finalStatusLabel
                      : 'Guardar'}
            </span>
          </button>
        </div>
      </div>

      {isPreview ? (
        <div className="cover-editor-preview-stage" data-testid="cover-editor-preview-stage">
          <DesignSurfaceRenderer surface={surface} />
          <button
            type="button"
            data-testid="cover-editor-preview-exit-button"
            className="ac-button ac-button--secondary"
            onClick={() => setIsPreview(false)}
          >
            Volver al editor
          </button>
        </div>
      ) : (
        <div className="cover-workspace-columns">
          {/* LEFT TOOL PANEL (08A ~240px) */}
          <aside className="cover-tools-panel" data-testid="advanced-editor-layers-column">
            <div className="cover-editor-tool-list">
              {([
                ['elements', Grid2X2, 'Elementos'],
                ['text', Type, 'Texto'],
                ['images', ImageIcon, 'Imágenes'],
                ['shapes', Shapes, 'Formas'],
                ['lines', Minus, 'Líneas'],
                ['icons', Sparkles, 'Iconos'],
                ['background', Grid3x3, 'Fondos'],
              ] as const).map(([tool, Icon, label]) => (
                <button
                  key={tool}
                  type="button"
                  data-testid={`cover-tool-button-${tool}`}
                  className="cover-editor-tool"
                  data-active={activeTool === tool ? 'true' : 'false'}
                  onClick={() => {
                    setActiveTool(tool);
                    if (tool === 'text') addTextLayer();
                    if (tool === 'images') imageInputRef.current?.click();
                    if (tool === 'shapes') addShapeLayer();
                    if (tool === 'lines') addLine();
                    if (tool === 'icons') addIcon();
                    if (tool === 'background') setSelectedLayerIds([]);
                  }}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{label}</span>
                </button>
              ))}
            </div>

            <div className="cover-editor-templates">
              <div className="cover-editor-section-heading">
                <strong>Plantillas</strong>
                <button
                  type="button"
                  data-testid="cover-templates-view-all-button"
                  className="cover-editor-link"
                  onClick={() => document.querySelector('[data-testid="cover-template-grid"]')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  Ver todas <ChevronDown className="h-3 w-3" />
                </button>
              </div>
              <div className="cover-template-grid" data-testid="cover-template-grid">
                {templates.slice(0, 3).map((template, index) => (
                  <button
                    key={template.id}
                    type="button"
                    data-testid={`cover-template-card-${template.id}`}
                    className="cover-template-card"
                    data-active={selectedTemplateId === template.id ? 'true' : 'false'}
                    onClick={() => applyTemplate(template)}
                    title={template.description}
                  >
                    <img
                      src={['/landing/features/cover-studio-dark.png', '/landing/features/cover-studio-light.png', '/landing/hero/cover-preview-dark.png'][index]}
                      alt=""
                    />
                    <span>{template.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <input
              ref={coverInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              data-testid="cover-editor-import-file-input"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleImportCover(file);
                event.target.value = '';
              }}
            />
            <button
              type="button"
              className="ac-button ac-button--secondary w-full text-xs"
              onClick={() => coverInputRef.current?.click()}
              data-testid="cover-editor-import-button"
            >
              Importar portada
            </button>
            {imageQualityWarning && (
              <p className="cover-editor-quality-warning" data-testid="cover-editor-quality-warning">
                {imageQualityWarning}
              </p>
            )}
          </aside>

          {/* CENTER CANVAS (08A Dominant) */}
          <main ref={viewportRef} className="cover-canvas-area" data-testid="advanced-editor-canvas-column">
            <div className="cover-editor-canvas-label">
              <span>Lienzo de portada</span>
              <span>{surface.width} × {surface.height}px</span>
            </div>
            <div className="cover-canvas-viewport">
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

            {/* Floating bottom zoom bar (08A) */}
            <div className="cover-editor-bottom-zoom">
              <button
                type="button"
                data-testid="cover-canvas-zoom-out"
                onClick={() => canvasRef.current?.setZoom(Math.max(0.25, zoom - 0.1))}
                title="Alejar"
                aria-label="Alejar"
              >
                −
              </button>
              <span>{Math.round(zoom * 100)}%</span>
              <button
                type="button"
                data-testid="cover-canvas-zoom-in"
                onClick={() => canvasRef.current?.setZoom(Math.min(2, zoom + 0.1))}
                title="Acercar"
                aria-label="Acercar"
              >
                +
              </button>
              <button
                type="button"
                data-testid="cover-canvas-zoom-fit"
                onClick={() => canvasRef.current?.zoomToFit()}
              >
                Ajustar al área
              </button>
            </div>
          </main>

          {/* RIGHT PROPERTIES PANEL (08A ~340px) */}
          <aside className="cover-properties-panel" data-testid="advanced-editor-properties-column">
            <h2 className="cover-editor-properties-title">Propiedades</h2>
            {activeTool === 'background' ? (
              <BackgroundEditor
                background={surface.background}
                copy={copy.background}
                colorPickerCopy={copy.colorPicker}
                brandColors={brandColors}
                onChange={(background) => onChange({ ...surface, background })}
                onUploadFile={async (file) => {
                  const src = await readFileAsDataUrl(file);
                  onChange({ ...surface, background: { kind: 'image', src, fit: 'cover', opacity: 1 } });
                }}
              />
            ) : (
              <PropertiesPanel
                selectedLayers={selectedLayers}
                copy={copy}
                brandColors={brandColors}
                onLayerChange={patchLayer}
                onReplaceImage={handleReplaceImage}
                metadataValues={metadataValues}
              />
            )}

            <div className="cover-editor-layers-heading">
              <span>Capas</span>
              <span>{surface.layers.length}</span>
            </div>
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
              onDuplicate={duplicateLayer}
              onDelete={(layerId) => setLayers(surface.layers.filter((l) => l.id !== layerId))}
              onReorder={handleReorder}
            />
          </aside>
        </div>
      )}

      {/* STATUS BAR FOOTER */}
      <footer className="cover-workspace-status-bar" data-testid="advanced-editor-status-bar">
        <span data-testid="advanced-editor-layer-count">{surface.layers.length} capas</span>
        <span>{surface.width} × {surface.height} px</span>
      </footer>
    </div>
  );
}
