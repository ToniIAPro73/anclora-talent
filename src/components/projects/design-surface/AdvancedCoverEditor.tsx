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
  Shapes,
  Type,
  Magnet,
  RotateCcw,
  RotateCw,
  ShieldCheck,
  Sparkles,
  ChevronDown,
  Eye,
  Grid2X2,
  Image as ImageIcon,
  Minus,
  Save,
  SeparatorHorizontal,
  SeparatorVertical,
  X,
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
import { CanvasOverlays, type GridDensity } from './CanvasOverlays';
import { LayersPanel, buildLayersPanelCopy, reorderLayers } from './LayersPanel';
import { resolveLayerLabel } from './layer-labels';
import { TemplateThumbnail } from './TemplateThumbnail';
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

/** The cover may grow beyond its natural size to fill the work area (08A: the cover dominates the centre). */
const FIT_MAX_ZOOM = 2.5;
const CANVAS_STAGE_PADDING = 20;
/** Room kept free under the canvas for the floating zoom bar. */
const ZOOM_BAR_CLEARANCE = 52;
const ZOOM_OPTIONS = [0.5, 0.75, 1, 1.5, 2] as const;

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
  const [showAllTemplates, setShowAllTemplates] = useState(false);
  // Once the user picks a zoom level the cover stops following the window size.
  const manualZoomRef = useRef(false);
  const [isPreview, setIsPreview] = useState(false);
  const [imageQualityWarning, setImageQualityWarning] = useState<string | null>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const templates: EditorialTemplate[] = surface.surface === 'cover' ? COVER_TEMPLATES : BACK_COVER_TEMPLATES;

  useEffect(() => {
    const el = viewportRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => {
      setViewportSize({
        width: Math.max(120, entry.contentRect.width - CANVAS_STAGE_PADDING * 2),
        height: Math.max(160, entry.contentRect.height - CANVAS_STAGE_PADDING * 2 - ZOOM_BAR_CLEARANCE),
      });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const layersCopy = useMemo(() => buildLayersPanelCopy(copy), [copy]);

  const fitToArea = useCallback(() => {
    manualZoomRef.current = false;
    canvasRef.current?.zoomToFit();
  }, []);
  const applyZoom = useCallback((factor: number) => {
    manualZoomRef.current = true;
    canvasRef.current?.setZoom(Math.min(FIT_MAX_ZOOM, Math.max(0.25, factor)));
  }, []);
  // Keep the cover fitted to the work area (first paint and every resize) until the user zooms by hand.
  useEffect(() => {
    if (!viewportSize || manualZoomRef.current) return;
    const frame = requestAnimationFrame(() => canvasRef.current?.zoomToFit());
    return () => cancelAnimationFrame(frame);
  }, [viewportSize]);
  const handleCanvasReady = useCallback(() => {
    if (!manualZoomRef.current) canvasRef.current?.zoomToFit();
  }, []);
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
          // A copy is its own element: it must not keep a metadata role (it would be overwritten on sync).
          ...(source.type === 'text' ? { role: 'free' as const, source: 'manual' as const } : {}),
          name: undefined,
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
    appendLayer(createDesignLayer({ type: 'text', content: 'Texto', x: surface.width / 2 - 110, y: surface.height / 2 - 30, width: 220, height: 60 }, surface.layers.length + 1));
  }, [appendLayer, surface.height, surface.layers.length, surface.width]);

  const addShapeLayer = useCallback(() => {
    appendLayer(createDesignLayer({ type: 'shape', shape: 'rect', fill: '#55c7ff', x: surface.width / 2 - 90, y: surface.height / 2 - 55, width: 180, height: 110, opacity: 0.9 }, surface.layers.length + 1));
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
    appendLayer(createDesignLayer({ type: 'image', src, fit: 'cover', x: 0, y: 0, width: surface.width, height: surface.height, name: file.name || undefined }, surface.layers.length + 1));
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

  const addGuide = useCallback(
    (axis: 'x' | 'y') => {
      const position = axis === 'x' ? Math.round(surface.width / 2) : Math.round(surface.height / 2);
      onChange({ ...surface, guides: [...(surface.guides ?? []), { id: `guide-${axis}-${Date.now()}`, axis, position }] });
    },
    [onChange, surface],
  );

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

  const ws = copy.workspace;
  const selectedLayer = selectedLayers.length === 1 ? selectedLayers[0] : null;
  const SelectedIcon = selectedLayer?.type === 'text' ? Type : selectedLayer?.type === 'image' ? ImageIcon : Shapes;
  const visibleTemplates = showAllTemplates ? templates : templates.slice(0, 3);
  const zoomSelectValue = ZOOM_OPTIONS.find((option) => Math.abs(option - zoom) < 0.01)?.toString() ?? 'custom';

  return (
    <div className="cover-workspace" data-testid="advanced-cover-editor" data-preview={isPreview ? 'true' : 'false'}>
      <div className="cover-workspace-toolbar" data-testid="cover-workspace-toolbar">
        <div className="cover-workspace-toolbar__group cover-workspace-toolbar__template">
          <label htmlFor="cover-template-select" className="cover-workspace-toolbar__label">
            {ws.templateLabel}
          </label>
          <span className="cover-workspace-toolbar__select-wrap">
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
              <option value="">{ws.selectTemplate}</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
            <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
        </div>

        <div className="cover-workspace-toolbar__group cover-workspace-toolbar__history">
          <button
            type="button"
            data-testid="advanced-editor-undo-button"
            onClick={() => canvasRef.current?.undo()}
            disabled={!historyState.canUndo}
            className="cover-toolbar-button"
            title={copy.toolbar.undoLabel}
            aria-label={copy.toolbar.undoLabel}
          >
            <RotateCcw className="h-4 w-4" />
            <span>{copy.toolbar.undoLabel}</span>
          </button>
          <button
            type="button"
            data-testid="advanced-editor-redo-button"
            onClick={() => canvasRef.current?.redo()}
            disabled={!historyState.canRedo}
            className="cover-toolbar-button"
            title={copy.toolbar.redoLabel}
            aria-label={copy.toolbar.redoLabel}
          >
            <RotateCw className="h-4 w-4" />
            <span>{copy.toolbar.redoLabel}</span>
          </button>
        </div>

        <div className="cover-workspace-toolbar__group cover-workspace-toolbar__actions">
          <span className="cover-workspace-toolbar__select-wrap cover-workspace-toolbar__zoom">
            <select
              data-testid="advanced-editor-zoom-select"
              aria-label={ws.fitToArea}
              value={zoomSelectValue}
              onChange={(event) => {
                if (event.target.value === 'fit') fitToArea();
                else if (event.target.value !== 'custom') applyZoom(Number(event.target.value));
              }}
              className="cover-workspace-toolbar__select"
            >
              <option value="fit">{ws.fitToArea}</option>
              {ZOOM_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {Math.round(option * 100)}%
                </option>
              ))}
              <option value="custom" disabled hidden>
                {Math.round(zoom * 100)}%
              </option>
            </select>
            <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
          <button
            type="button"
            className="ac-button ac-button--secondary ac-button--compact cover-toolbar-cta"
            onClick={() => setIsPreview((current) => !current)}
            aria-pressed={isPreview}
            data-testid="cover-editor-preview-button"
          >
            <Eye className="h-4 w-4" />
            <span>{ws.preview}</span>
          </button>
          <button
            type="button"
            className="ac-button ac-button--primary ac-button--compact cover-toolbar-cta"
            onClick={onSaveFinal}
            data-testid="studio-save-final-button"
          >
            <Save className="h-4 w-4" />
            <span data-testid="studio-save-status" data-status={saveStatus}>
              {saveStatus === 'saving'
                ? copy.studio.savingLabel
                : saveStatus === 'saved'
                  ? copy.studio.savedLabel
                  : saveStatus === 'error'
                    ? copy.studio.saveErrorLabel
                    : surface.status === 'final'
                      ? copy.studio.finalStatusLabel
                      : ws.save}
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
            {ws.backToEditor}
          </button>
        </div>
      ) : (
        <div className="cover-workspace-columns">
          {/* LEFT: elements, templates, import */}
          <aside className="cover-tools-panel" data-testid="advanced-editor-layers-column">
            <nav className="cover-editor-tool-list" aria-label={ws.elements}>
              {([
                ['elements', Grid2X2, ws.elements],
                ['text', Type, ws.text],
                ['images', ImageIcon, ws.images],
                ['shapes', Shapes, ws.shapes],
                ['lines', Minus, ws.lines],
                ['icons', Sparkles, ws.icons],
                ['background', Grid3x3, ws.backgrounds],
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
                  <Icon className="h-[18px] w-[18px] shrink-0" />
                  <span>{label}</span>
                </button>
              ))}
            </nav>
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

            <section className="cover-editor-templates" aria-label={ws.templates}>
              <div className="cover-editor-section-heading">
                <strong>{ws.templates}</strong>
                <button
                  type="button"
                  data-testid="cover-templates-view-all-button"
                  className="cover-editor-link"
                  aria-expanded={showAllTemplates}
                  onClick={() => setShowAllTemplates((current) => !current)}
                >
                  {ws.viewAllTemplates}
                  <ChevronDown className={`h-3 w-3 transition-transform ${showAllTemplates ? 'rotate-180' : ''}`} />
                </button>
              </div>
              <div className="cover-template-grid" data-testid="cover-template-grid">
                {visibleTemplates.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    data-testid={`cover-template-card-${template.id}`}
                    className="cover-template-card"
                    data-active={selectedTemplateId === template.id ? 'true' : 'false'}
                    onClick={() => applyTemplate(template)}
                    title={template.description}
                  >
                    <TemplateThumbnail template={template} surfaceKind={surface.surface} />
                    <span>{template.name}</span>
                  </button>
                ))}
              </div>
            </section>

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
              className="ac-button ac-button--secondary cover-editor-import"
              onClick={() => coverInputRef.current?.click()}
              data-testid="cover-editor-import-button"
            >
              <ImageIcon className="h-4 w-4" />
              {ws.importCover}
            </button>
            {imageQualityWarning && (
              <p className="cover-editor-quality-warning" data-testid="cover-editor-quality-warning">
                {imageQualityWarning}
              </p>
            )}
          </aside>

          {/* CENTER: the cover is the hero */}
          <main className="cover-canvas-area" data-testid="advanced-editor-canvas-column">
            <div className="cover-canvas-header">
              <span className="cover-canvas-header__title">
                {ws.canvasLabel}
                <small>{surface.width} × {surface.height} px</small>
              </span>
              <div className="cover-canvas-header__tools">
                <button
                  type="button"
                  data-testid="advanced-editor-snap-toggle"
                  onClick={() => setSnapEnabled((v) => !v)}
                  data-active={snapEnabled ? 'true' : 'false'}
                  aria-pressed={snapEnabled}
                  className="cover-toolbar-icon"
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
                  className="cover-toolbar-icon"
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
                  className="cover-toolbar-icon"
                  title={copy.toolbar.gridLabel}
                  aria-label={copy.toolbar.gridLabel}
                >
                  <Grid3x3 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  data-testid="add-vertical-guide-button"
                  onClick={() => addGuide('x')}
                  className="cover-toolbar-icon"
                  title={copy.addVerticalGuideLabel}
                  aria-label={copy.addVerticalGuideLabel}
                >
                  <SeparatorVertical className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  data-testid="add-horizontal-guide-button"
                  onClick={() => addGuide('y')}
                  className="cover-toolbar-icon"
                  title={copy.addHorizontalGuideLabel}
                  aria-label={copy.addHorizontalGuideLabel}
                >
                  <SeparatorHorizontal className="h-4 w-4" />
                </button>
                {(surface.guides?.length ?? 0) > 0 && (
                  <button
                    type="button"
                    data-testid="clear-guides-button"
                    onClick={() => onChange({ ...surface, guides: [] })}
                    className="cover-toolbar-icon"
                    title={copy.clearGuidesLabel || 'Limpiar guías'}
                    aria-label={copy.clearGuidesLabel || 'Limpiar guías'}
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
                <span className="cover-toolbar-divider" />
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
                    className="cover-toolbar-icon"
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
                    className="cover-toolbar-icon"
                    title={copy.origin.resetToOriginalLabel}
                    aria-label={copy.origin.resetToOriginalLabel}
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="cover-canvas-stage" ref={viewportRef}>
              <div className="cover-canvas-viewport">
                <div className="cover-canvas-paper" style={{ position: 'relative' }}>
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
                    maxFitZoom={FIT_MAX_ZOOM}
                    onReady={handleCanvasReady}
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
                    showControls={false}
                  />
                </div>
              </div>
            </div>

            <div className="cover-editor-bottom-zoom">
              <button type="button" data-testid="cover-canvas-zoom-out" onClick={() => applyZoom(zoom - 0.1)} title={ws.zoomOut} aria-label={ws.zoomOut}>
                −
              </button>
              <span data-testid="advanced-editor-zoom-value">{Math.round(zoom * 100)}%</span>
              <button type="button" data-testid="cover-canvas-zoom-in" onClick={() => applyZoom(zoom + 0.1)} title={ws.zoomIn} aria-label={ws.zoomIn}>
                +
              </button>
              <button type="button" data-testid="cover-canvas-zoom-fit" onClick={fitToArea}>
                {ws.fitToArea}
              </button>
            </div>
          </main>

          {/* RIGHT: properties and layers */}
          <aside className="cover-properties-panel" data-testid="advanced-editor-properties-column">
            <header className="cover-properties-header">
              <h2 className="cover-editor-properties-title">{ws.properties}</h2>
              {selectedLayer && (
                <div className="cover-properties-selection" data-testid="cover-properties-selection">
                  <SelectedIcon className="h-4 w-4" aria-hidden="true" />
                  <span>{resolveLayerLabel(selectedLayer, surface.layers, layersCopy, surface)}</span>
                </div>
              )}
            </header>
            <div className="cover-properties-body">
              {activeTool === 'background' && selectedLayerIds.length === 0 ? (
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
            </div>

            <section className="cover-layers-section" aria-label={ws.layers}>
              <div className="cover-editor-layers-heading">
                <span>{ws.layers}</span>
                <span data-testid="advanced-editor-layer-count">{surface.layers.length}</span>
              </div>
              <LayersPanel
                layers={surface.layers}
                surfaceSize={surface}
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
            </section>
          </aside>
        </div>
      )}
    </div>
  );
}
