'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Loader2, Sparkles } from 'lucide-react';
import { toPng } from 'html-to-image';
import { CoverCanvas } from './Canvas';
import { CoverToolbar } from './Toolbar';
import { CoverPropertyPanel } from './PropertyPanel';
import {
  renderBackCoverImageAction,
  renderCoverImageAction,
  saveBackCoverAction,
  saveProjectCoverAction,
} from '@/lib/projects/actions';
import { useCanvasStore } from '@/lib/canvas-store';
import { addTextToCanvas } from '@/lib/canvas-utils';
import { createGuideManager } from '@/lib/canvas-guides';
import { createSurfaceSnapshotFromProject } from './advanced-surface-utils';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '@/lib/canvas-utils';
import { normalizeSurfaceState, type SurfaceKind, type SurfaceState } from '@/lib/projects/cover-surface';
import { BACK_COVER_TEXT_LAYOUT, COVER_TEXT_LAYOUT } from '@/lib/projects/cover-layout';
import type { ProjectRecord } from '@/lib/projects/types';
import type { AppMessages } from '@/lib/i18n/messages';

type AdvancedSurfaceEditorProps = {
  surface: SurfaceKind;
  project: ProjectRecord;
  copy: AppMessages['project'];
};

type FabricCanvasLike = {
  width?: number;
  height?: number;
  clear: () => void;
  set: (props: Record<string, unknown>) => void;
  on: (event: string, handler: (event: FabricEvent) => void | Promise<void>) => void;
  requestRenderAll: () => void;
  setActiveObject: (object: FabricObjectLike) => void;
  toDataURL: (options: { format: string; quality: number; multiplier: number }) => string;
};

type FabricObjectLike = {
  id?: string;
  width?: number;
  height?: number;
  opacity?: number;
  set: (props: Record<string, unknown>) => void;
};

type FabricEvent = {
  selected?: FabricObjectLike[];
  target?: FabricObjectLike;
};

type GuideManagerLike = {
  clearGuides: () => void;
  hideGuidesWithAnimation: () => void;
  showGuides: (target: FabricObjectLike) => Promise<void>;
  snapToGuides: (target: FabricObjectLike) => void;
  dispose: () => void;
};

export function AdvancedSurfaceEditor({
  surface,
  project,
  copy,
}: AdvancedSurfaceEditorProps) {
  const router = useRouter();
  const { canvas, setCanvas, addElement, clear, selectElement } = useCanvasStore();
  const [isRendering, startRenderTransition] = useTransition();
  const [rendered, setRendered] = useState(false);
  const [renderedImageUrl, setRenderedImageUrl] = useState<string | null>(
    surface === 'cover'
      ? project.cover.renderedImageUrl ?? null
      : project.backCover.renderedImageUrl ?? null,
  );
  const loadingRef = useRef(false);
  const listenersAttachedRef = useRef(false);
  const guideManagerRef = useRef<GuideManagerLike | null>(null);
  const surfaceNodeRef = useRef<HTMLDivElement>(null);
  const surfaceSnapshot = useMemo(
    () => createSurfaceSnapshotFromProject(surface, project),
    [surface, project],
  );
  const backgroundElementRef = useRef<{
    id: string;
    type: 'image';
    object: {
      id: string;
      type: string;
      opacity: number;
      isBackgroundProxy: boolean;
      set: (props: Record<string, unknown>) => void;
      removeFromCanvas: () => void;
      bringForward: () => void;
      sendBackwards: () => void;
    };
    properties: Record<string, unknown>;
  } | null>(null);
  const [backgroundImageUrl, setBackgroundImageUrl] = useState<string | null>(
    surface === 'cover' ? project.cover.backgroundImageUrl : project.backCover.backgroundImageUrl,
  );
  const [backgroundOpacity, setBackgroundOpacity] = useState<number>(
    surfaceSnapshot.opacity ?? (surface === 'back-cover' ? 0.24 : 1),
  );

  useEffect(() => {
    setBackgroundImageUrl(surface === 'cover' ? project.cover.backgroundImageUrl : project.backCover.backgroundImageUrl);
    setBackgroundOpacity(surfaceSnapshot.opacity ?? (surface === 'back-cover' ? 0.24 : 1));
  }, [project, surface, surfaceSnapshot.opacity]);

  const loadSurfaceData = useCallback(
    async (fabricCanvas: FabricCanvasLike) => {
      if (!fabricCanvas || loadingRef.current) return;

      loadingRef.current = true;

      try {
        clear();
        if (guideManagerRef.current) {
          guideManagerRef.current.clearGuides();
        }
        fabricCanvas.clear();
        selectElement(null);
        listenersAttachedRef.current = false;
        backgroundElementRef.current = null;

        const canvasWidth = CANVAS_WIDTH;   // 400
        const canvasHeight = CANVAS_HEIGHT; // 600
        fabricCanvas.set({ backgroundColor: 'rgba(0,0,0,0)' });

        if (backgroundImageUrl) {
          const backgroundId = `${surface}-background-image`;
          const backgroundElement = {
            id: backgroundId,
            type: 'image' as const,
            object: {
              id: backgroundId,
              type: 'image',
              opacity: backgroundOpacity,
              isBackgroundProxy: true,
              set: (props: Record<string, unknown>) => {
                if (typeof props.opacity === 'number') {
                  setBackgroundOpacity(props.opacity);
                  backgroundElement.object.opacity = props.opacity;
                }
              },
              removeFromCanvas: () => {
                setBackgroundImageUrl(null);
                backgroundElementRef.current = null;
              },
              bringForward: () => {},
              sendBackwards: () => {},
            },
            properties: { opacity: backgroundOpacity },
          };

          backgroundElementRef.current = backgroundElement;
          addElement(backgroundElement);
        }

        const textColor =
          surface === 'cover'
            ? project.cover.accentColor || (project.cover.palette === 'sand' ? '#0b313f' : '#f2e3b3')
            : project.backCover.accentColor || '#f2e3b3';

        // NOTA: Fabric.js solo acepta un nombre de fuente único (no stacks CSS).
        // Usar 'Arial' garantiza métricas consistentes en todos los sistemas operativos
        // y evita que el texto se trunque por fallback a Times New Roman.
        const CANVAS_FONT = 'Arial';

        const fieldConfigs: Record<string, { top: number; fontSize: number; fontWeight: string | number; textAlign: 'left' | 'center'; width: number; left: number; fill?: string }> = {
          title: {
            top: surface === 'cover' ? canvasHeight * COVER_TEXT_LAYOUT.titleTop : canvasHeight * BACK_COVER_TEXT_LAYOUT.titleTop,
            fontSize: surface === 'cover' ? COVER_TEXT_LAYOUT.titleFontSize : BACK_COVER_TEXT_LAYOUT.titleFontSize,
            fontWeight: 900,
            textAlign: surface === 'cover' ? 'center' : 'left',
            width: canvasWidth * (surface === 'cover' ? COVER_TEXT_LAYOUT.titleWidth : BACK_COVER_TEXT_LAYOUT.titleWidth),
            left: surface === 'cover' ? canvasWidth / 2 : canvasWidth * BACK_COVER_TEXT_LAYOUT.titleLeft,
          },
          subtitle: {
            top: canvasHeight * COVER_TEXT_LAYOUT.subtitleTop,
            fontSize: COVER_TEXT_LAYOUT.subtitleFontSize,
            fontWeight: 500,
            textAlign: 'center',
            width: canvasWidth * COVER_TEXT_LAYOUT.subtitleWidth,
            left: canvasWidth / 2,
            fill: project.cover.palette === 'sand' ? 'rgba(11,49,63,0.75)' : 'rgba(242,227,179,0.82)',
          },
          author: {
            top: canvasHeight * COVER_TEXT_LAYOUT.authorTop,
            fontSize: COVER_TEXT_LAYOUT.authorFontSize,
            fontWeight: 500,
            textAlign: 'center',
            width: canvasWidth * COVER_TEXT_LAYOUT.authorWidth,
            left: canvasWidth / 2,
            fill: project.cover.palette === 'sand' ? 'rgba(11,49,63,0.7)' : 'rgba(242,227,179,0.72)',
          },
          body: {
            top: canvasHeight * BACK_COVER_TEXT_LAYOUT.bodyTop,
            fontSize: BACK_COVER_TEXT_LAYOUT.bodyFontSize,
            fontWeight: 500,
            textAlign: 'left',
            width: canvasWidth * BACK_COVER_TEXT_LAYOUT.bodyWidth,
            left: canvasWidth * BACK_COVER_TEXT_LAYOUT.bodyLeft,
          },
          authorBio: {
            top: canvasHeight * BACK_COVER_TEXT_LAYOUT.authorBioTop,
            fontSize: BACK_COVER_TEXT_LAYOUT.authorBioFontSize,
            fontWeight: 400,
            textAlign: 'left',
            width: canvasWidth * BACK_COVER_TEXT_LAYOUT.authorBioWidth,
            left: canvasWidth * BACK_COVER_TEXT_LAYOUT.authorBioLeft,
            fill: 'rgba(242,227,179,0.78)',
          },
        };

        let firstTextElement: { id: string; type: 'text'; object: FabricObjectLike; properties: Record<string, unknown> } | null = null;

        for (const layer of surfaceSnapshot.layers ?? []) {
          if (layer.type !== 'text' || !layer.fieldKey) continue;
          const fieldState = surfaceSnapshot.fields[layer.fieldKey];
          if (!fieldState?.visible) continue;

          const config = fieldConfigs[layer.fieldKey];
          if (!config) continue;

          const layerTop = typeof layer.top === 'number' ? layer.top : config.top;
          const layerFontSize = typeof layer.fontSize === 'number' ? layer.fontSize : config.fontSize;
          const layerFontWeight = typeof layer.fontWeight !== 'undefined' ? layer.fontWeight : config.fontWeight;
          const layerFontFamily = typeof layer.fontFamily === 'string' && layer.fontFamily.trim() ? layer.fontFamily : CANVAS_FONT;
          const layerFill = typeof layer.fill === 'string' && layer.fill.trim() ? layer.fill : (config.fill ?? textColor);
          const layerTextAlign = layer.textAlign ?? config.textAlign;
          const layerWidth = typeof layer.width === 'number' ? layer.width : config.width;
          const layerLeft = typeof layer.left === 'number' ? layer.left : config.left;
          const layerOriginX = layer.originX ?? (layerTextAlign === 'center' ? 'center' : 'left');
          const layerLineHeight =
            typeof layer.lineHeight === 'number'
              ? layer.lineHeight
              : layer.fieldKey === 'body'
              ? 1.45
                : surface === 'back-cover' && layer.fieldKey === 'authorBio'
                  ? BACK_COVER_TEXT_LAYOUT.authorBioLineHeight
                  : COVER_TEXT_LAYOUT.titleLineHeight;
          const layerCharSpacing = typeof layer.charSpacing === 'number' ? layer.charSpacing : 0;
          const layerOpacity = typeof layer.opacity === 'number' ? layer.opacity : 1;
          const layerFontStyle = typeof layer.fontStyle === 'string' ? layer.fontStyle : 'normal';

          const textObject = await addTextToCanvas(fabricCanvas, fieldState.value, {
            top: layerTop,
            fontSize: layerFontSize,
            fontWeight: layerFontWeight,
            // FIX: nombre de fuente único — Fabric no soporta stacks CSS tipo 'ui-sans-serif, system-ui'
            fontFamily: CANVAS_FONT,
            fill: layerFill,
            opacity: layerOpacity,
            textAlign: layerTextAlign,
            fontStyle: layerFontStyle,
            charSpacing: layerCharSpacing,
            id: `${surface}-${layer.fieldKey}-text`,
            wrapWidth: layerWidth,
            left: layerLeft,
            originX: layerOriginX,
            selectable: true,
            evented: true,
            splitByGrapheme: false,
            lineHeight: layerLineHeight,
          });

          const nextElement = {
            id: `${surface}-${layer.fieldKey}-text`,
            type: 'text' as const,
            object: textObject,
            properties: {
              fill: layerFill,
              fontSize: layerFontSize,
              opacity: layerOpacity,
              fontWeight: layerFontWeight,
              fontStyle: layerFontStyle,
              fontFamily: layerFontFamily,
              textAlign: layerTextAlign,
              lineHeight: layerLineHeight,
              charSpacing: layerCharSpacing,
              text: fieldState.value,
            },
          };

          addElement(nextElement);
          firstTextElement ??= nextElement;
        }

        if (!listenersAttachedRef.current) {
          if (!guideManagerRef.current) {
            guideManagerRef.current = createGuideManager(fabricCanvas);
          }

          fabricCanvas.on('selection:created', (e: FabricEvent) => {
            if ((e.selected?.length ?? 0) > 0) {
              const selectedFabricObj = e.selected![0];
              const element = useCanvasStore.getState().elements.find((el) => el.id === selectedFabricObj.id);
              if (element) selectElement(element);
            }
          });

          fabricCanvas.on('selection:updated', (e: FabricEvent) => {
            if ((e.selected?.length ?? 0) > 0) {
              const selectedFabricObj = e.selected![0];
              const element = useCanvasStore.getState().elements.find((el) => el.id === selectedFabricObj.id);
              if (element) selectElement(element);
            }
          });

          fabricCanvas.on('selection:cleared', () => {
            if (backgroundElementRef.current) {
              selectElement(backgroundElementRef.current);
            } else {
              selectElement(null);
            }
            guideManagerRef.current?.hideGuidesWithAnimation();
          });

          fabricCanvas.on('object:moving', async (e: FabricEvent) => {
            if (guideManagerRef.current && e.target) {
              await guideManagerRef.current.showGuides(e.target);
              guideManagerRef.current.snapToGuides(e.target);
            }
          });

          fabricCanvas.on('object:modified', () => {
            guideManagerRef.current?.hideGuidesWithAnimation();
          });

          listenersAttachedRef.current = true;
        }

        fabricCanvas.requestRenderAll();

        if (firstTextElement) {
          fabricCanvas.setActiveObject(firstTextElement.object);
          selectElement(firstTextElement);
        } else if (backgroundElementRef.current) {
          selectElement(backgroundElementRef.current);
        }

        useCanvasStore.getState().pushHistory();
      } finally {
        loadingRef.current = false;
      }
    },
    [addElement, backgroundImageUrl, backgroundOpacity, clear, project, selectElement, surface, surfaceSnapshot.fields, surfaceSnapshot.layers],
  );

  const handleCanvasReady = useCallback(
    (fabricCanvas: unknown) => {
      const nextCanvas = fabricCanvas as FabricCanvasLike;
      setCanvas(nextCanvas);
      loadSurfaceData(nextCanvas);
    },
    [loadSurfaceData, setCanvas],
  );

  useEffect(() => {
    return () => {
      if (guideManagerRef.current) {
        guideManagerRef.current.dispose();
        guideManagerRef.current = null;
      }
    };
  }, []);

  const handleSaveAndRender = () => {
    if (!canvas) return;

    startRenderTransition(async () => {
      const currentElements = useCanvasStore.getState().elements;
      const nextFields: SurfaceState['fields'] = { ...surfaceSnapshot.fields };
      const nextLayers = (surfaceSnapshot.layers ?? []).map((layer) => {
        if (layer.type !== 'text' || !layer.fieldKey) return layer;
        const textElement = currentElements.find((element) => element.id === `${surface}-${layer.fieldKey}-text`);
        const obj = textElement?.object;
        if (!obj) return layer;

        return {
          ...layer,
          left: typeof obj.left === 'number' ? obj.left : layer.left,
          top: typeof obj.top === 'number' ? obj.top : layer.top,
          width: typeof obj.width === 'number' ? obj.width : layer.width,
          fill: typeof obj.fill === 'string' ? obj.fill : layer.fill,
          opacity: typeof obj.opacity === 'number' ? obj.opacity : layer.opacity,
          fontSize: typeof obj.fontSize === 'number' ? obj.fontSize : layer.fontSize,
          fontFamily: typeof obj.fontFamily === 'string' ? obj.fontFamily : layer.fontFamily,
          fontWeight: typeof obj.fontWeight !== 'undefined' ? obj.fontWeight : layer.fontWeight,
          fontStyle: typeof obj.fontStyle === 'string' ? obj.fontStyle : layer.fontStyle,
          textAlign: obj.textAlign ?? layer.textAlign,
          lineHeight: typeof obj.lineHeight === 'number' ? obj.lineHeight : layer.lineHeight,
          charSpacing: typeof obj.charSpacing === 'number' ? obj.charSpacing : layer.charSpacing,
          originX: typeof obj.originX === 'string' ? obj.originX : layer.originX,
          originY: typeof obj.originY === 'string' ? obj.originY : layer.originY,
        };
      });

      for (const fieldKey of Object.keys(surfaceSnapshot.fields) as Array<keyof SurfaceState['fields']>) {
        const textElement = currentElements.find((element) => element.id === `${surface}-${fieldKey}-text`);
        const nextValue =
          typeof textElement?.object?.text === 'string'
            ? textElement.object.text
            : surfaceSnapshot.fields[fieldKey]?.value ?? '';

        nextFields[fieldKey] = {
          value: nextValue,
          visible: Boolean(textElement ? nextValue.trim() : surfaceSnapshot.fields[fieldKey]?.visible),
        };
      }

      const nextSurfaceState = normalizeSurfaceState({
        ...surfaceSnapshot,
        fields: nextFields,
        layers: nextLayers,
        opacity: backgroundOpacity,
      });

      const persistenceData = new FormData();
      persistenceData.set('projectId', project.id);
      persistenceData.set('surfaceState', JSON.stringify(nextSurfaceState));

      if (surface === 'cover') {
        persistenceData.set('title', nextSurfaceState.fields.title?.value ?? project.cover.title);
        persistenceData.set('subtitle', nextSurfaceState.fields.subtitle?.value ?? project.cover.subtitle);
        persistenceData.set('palette', project.cover.palette);
        persistenceData.set('currentBackgroundImageUrl', backgroundImageUrl ?? '');
        persistenceData.set('currentThumbnailUrl', project.cover.thumbnailUrl ?? '');
        persistenceData.set('showSubtitle', String(nextSurfaceState.fields.subtitle?.visible ?? false));
        persistenceData.set('layout', project.cover.layout ?? 'centered');
        persistenceData.set('fontFamily', project.cover.fontFamily ?? '');
        persistenceData.set('accentColor', project.cover.accentColor ?? '');
        await saveProjectCoverAction(persistenceData);
      } else {
        persistenceData.set('title', nextSurfaceState.fields.title?.value ?? project.backCover.title);
        persistenceData.set('body', nextSurfaceState.fields.body?.value ?? project.backCover.body);
        persistenceData.set('authorBio', nextSurfaceState.fields.authorBio?.value ?? project.backCover.authorBio);
        persistenceData.set('accentColor', project.backCover.accentColor ?? '');
        persistenceData.set('currentBackgroundImageUrl', backgroundImageUrl ?? '');
        await saveBackCoverAction(persistenceData);
      }

      const dataUrl = surfaceNodeRef.current
        ? await toPng(surfaceNodeRef.current, {
            cacheBust: true,
            pixelRatio: 2,
            width: CANVAS_WIDTH,
            height: CANVAS_HEIGHT,
          })
        : canvas.toDataURL({
            format: 'png',
            quality: 1,
            multiplier: 2,
          });

      const formData = new FormData();
      formData.set('projectId', project.id);
      formData.set('dataUrl', dataUrl);

      if (surface === 'cover') {
        await renderCoverImageAction(formData);
      } else {
        await renderBackCoverImageAction(formData);
      }

      setRenderedImageUrl(dataUrl);
      setRendered(true);
      setTimeout(() => setRendered(false), 2500);

      // Refresh the current editor route so basic and advanced views rehydrate
      // from the persisted advanced design, which is the source of truth.
      router.refresh();
    });
  };

  return (
    <div className="ac-editor-studio" data-testid={`advanced-${surface}-editor`}>
      <div className="ac-editor-studio__topbar">
        <div className="ac-editor-studio__headline">
          <p className="ac-editor-studio__eyebrow">Editorial studio</p>
          <h3 className="ac-editor-studio__title">
            {surface === 'cover' ? 'Portada avanzada premium' : 'Contraportada avanzada premium'}
          </h3>
          <p className="ac-editor-studio__summary">
            Ajusta composicion, tipografia y render final sobre una misma estructura canonica del design system.
          </p>
        </div>

        <CoverToolbar />
        <div className="ac-editor-studio__actions">
          <button
            type="button"
            onClick={handleSaveAndRender}
            disabled={isRendering}
            className="ac-button ac-button--primary ac-button--sm"
          >
            {isRendering ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Sparkles className="mr-2 h-3.5 w-3.5" />}
            Guardar Diseño Final
          </button>
          {rendered && (
            <span className="ac-editor-studio__status">
              <Check className="h-3 w-3" />
              Guardado
            </span>
          )}
        </div>
      </div>

      <div className="ac-editor-studio__layout">
        <section className="ac-editor-canvas-stage">
          <div className="ac-editor-canvas-stage__header">
            <p className="ac-editor-studio__eyebrow">Canvas</p>
            <h4 className="ac-editor-canvas-stage__title">
              {surface === 'cover' ? 'Composicion visual de portada' : 'Composicion visual de contraportada'}
            </h4>
            <p className="ac-editor-canvas-stage__summary">
              El lienzo mantiene la disciplina premium compartida, mientras Talent define su tono humano-capital.
            </p>
          </div>

          <div className="ac-editor-canvas-stage__viewport">
            <CoverCanvas
              ref={surfaceNodeRef}
              onCanvasReady={handleCanvasReady}
              initialPalette={surface === 'cover' ? project.cover.palette : 'obsidian'}
              backgroundColor={(surface === 'cover'
                ? {
                    obsidian: '#0b133f',
                    teal: '#124a50',
                    sand: '#f2e3b3',
                  }[project.cover.palette]
                : '#0b133f') ?? '#0b133f'}
              backgroundImageUrl={backgroundImageUrl}
              backgroundImageOpacity={backgroundOpacity}
            />
          </div>

          {renderedImageUrl && (
            <div className="ac-editor-canvas-stage__preview">
              <p className="ac-editor-canvas-stage__preview-label">
                {copy.coverRenderedImageLabel}
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={renderedImageUrl}
                alt={copy.coverRenderedImageLabel}
                className="ac-editor-canvas-stage__preview-image"
              />
            </div>
          )}
        </section>

        <aside className="ac-editor-inspector">
          <CoverPropertyPanel />
        </aside>
      </div>
    </div>
  );
}
