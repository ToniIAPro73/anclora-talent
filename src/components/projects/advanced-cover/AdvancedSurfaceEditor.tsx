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
import { premiumPrimaryDarkButton } from '@/components/ui/button-styles';
import { createSurfaceSnapshotFromProject } from './advanced-surface-utils';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '@/lib/canvas-utils';
import { normalizeSurfaceState, type SurfaceKind, type SurfaceState } from '@/lib/projects/cover-surface';
import { COVER_TEXT_LAYOUT } from '@/lib/projects/cover-layout';
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
            top: surface === 'cover' ? canvasHeight * COVER_TEXT_LAYOUT.titleTop : canvasHeight * 0.18,
            fontSize: surface === 'cover' ? COVER_TEXT_LAYOUT.titleFontSize : 28,
            fontWeight: 900,
            textAlign: surface === 'cover' ? 'center' : 'left',
            width: canvasWidth * (surface === 'cover' ? COVER_TEXT_LAYOUT.titleWidth : 0.72),
            left: surface === 'cover' ? canvasWidth / 2 : canvasWidth * 0.16,
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
            top: canvasHeight * 0.36,
            fontSize: 16,
            fontWeight: 500,
            textAlign: 'left',
            width: canvasWidth * 0.72,
            left: canvasWidth * 0.16,
          },
          authorBio: {
            top: canvasHeight * 0.78,
            fontSize: 13,
            fontWeight: 400,
            textAlign: 'left',
            width: canvasWidth * 0.62,
            left: canvasWidth * 0.16,
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

          const textObject = await addTextToCanvas(fabricCanvas, fieldState.value, {
            top: config.top,
            fontSize: config.fontSize,
            fontWeight: config.fontWeight,
            // FIX: nombre de fuente único — Fabric no soporta stacks CSS tipo 'ui-sans-serif, system-ui'
            fontFamily: CANVAS_FONT,
            fill: config.fill ?? textColor,
            textAlign: config.textAlign,
            id: `${surface}-${layer.fieldKey}-text`,
            wrapWidth: config.width,
            left: config.left,
            originX: config.textAlign === 'center' ? 'center' : 'left',
            selectable: true,
            evented: true,
            splitByGrapheme: false,
            lineHeight: layer.fieldKey === 'body' ? 1.45 : COVER_TEXT_LAYOUT.titleLineHeight,
          });

          const nextElement = {
            id: `${surface}-${layer.fieldKey}-text`,
            type: 'text' as const,
            object: textObject,
            properties: {
              fill: config.fill ?? textColor,
              fontSize: config.fontSize,
              opacity: 1,
              fontWeight: config.fontWeight,
              textAlign: config.textAlign,
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

      // Navigate back to basic editor to load updated data
      router.push(`/projects/${project.id}/editor`);
    });
  };

  return (
    <div className="space-y-6" data-testid={`advanced-${surface}-editor`}>
      <div className="rounded-[24px] border border-[var(--border-subtle)] bg-[var(--page-surface)] p-4 shadow-[var(--shadow-strong)] flex items-center justify-between">
        <CoverToolbar />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSaveAndRender}
            disabled={isRendering}
            className={`${premiumPrimaryDarkButton} px-4 py-2 text-xs`}
          >
            {isRendering ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Sparkles className="mr-2 h-3.5 w-3.5" />}
            Guardar Diseño Final
          </button>
          {rendered && (
            <span className="flex items-center gap-1.5 text-xs text-[var(--accent-mint)]">
              <Check className="h-3 w-3" />
              Guardado
            </span>
          )}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <section className="rounded-[28px] border border-[var(--border-subtle)] bg-[var(--page-surface)] p-8 shadow-[var(--shadow-strong)] flex flex-col items-center justify-center min-h-[700px]">
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

          {renderedImageUrl && (
            <div className="mt-8 p-4 rounded-2xl bg-[var(--surface-soft)] border border-[var(--border-subtle)] w-full max-w-md">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)] mb-3">
                {copy.coverRenderedImageLabel}
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={renderedImageUrl}
                alt={copy.coverRenderedImageLabel}
                className="w-24 rounded-lg shadow-lg border border-white/10"
              />
            </div>
          )}
        </section>

        <aside className="rounded-[28px] border border-[var(--border-subtle)] bg-[var(--page-surface)] p-6 shadow-[var(--shadow-strong)] self-start sticky top-8">
          <CoverPropertyPanel />
        </aside>
      </div>
    </div>
  );
}
