'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Image as ImageIcon, Trash2, Undo2, Redo2, Grid3x3 } from 'lucide-react';
import { getFabric, addImageToCanvas } from '@/lib/canvas-utils';
import { createGuideManager } from '@/lib/canvas-guides';

export interface ChapterImage {
  id: string;
  url: string;
  alt: string;
  width: number;
  height: number;
  left: number;
  top: number;
  rotation: number;
  opacity: number;
  zIndex: number;
  createdAt: string;
}

interface ChapterImageCanvasProps {
  onImageAdd?: (image: ChapterImage) => void;
  onImageDelete?: (id: string) => void;
  onImageUpdate?: (id: string, properties: Partial<ChapterImage>) => void;
  images?: ChapterImage[];
  canvasWidth?: number;
  canvasHeight?: number;
}

type FabricObjectLike = {
  id?: string;
  width?: number;
  height?: number;
  scaleX?: number;
  scaleY?: number;
  left?: number;
  top?: number;
  angle?: number;
  opacity?: number;
  originX?: string;
  originY?: string;
  set: (props: Record<string, unknown>) => void;
};

type FabricSelectionEvent = {
  selected?: FabricObjectLike[];
  target?: FabricObjectLike;
};

type FabricCanvasLike = {
  width: number;
  height: number;
  add: (object: FabricObjectLike) => void;
  remove: (object: FabricObjectLike) => void;
  renderAll: () => void;
  setActiveObject: (object: FabricObjectLike) => void;
  getObjects: () => FabricObjectLike[];
  loadFromJSON: (json: string, callback: () => void) => void;
  toJSON: () => unknown;
  on: (event: string, handler: (event: FabricSelectionEvent) => void) => void;
  dispose: () => void;
};

export function ChapterImageCanvas({
  onImageAdd,
  onImageDelete,
  onImageUpdate,
  images = [],
  canvasWidth = 500,
  canvasHeight = 700,
}: ChapterImageCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<FabricCanvasLike | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const historyStepRef = useRef(-1);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [historyStep, setHistoryStep] = useState(-1);
  const [showGuides, setShowGuides] = useState(true);

  useEffect(() => {
    historyStepRef.current = historyStep;
  }, [historyStep]);

  const pushCanvasHistory = useCallback((canvas: FabricCanvasLike) => {
    const canvasState = JSON.stringify(canvas.toJSON());
    setHistory((prev) => {
      const newHistory = prev.slice(0, historyStepRef.current + 1);
      newHistory.push(canvasState);
      historyStepRef.current = newHistory.length - 1;
      setHistoryStep(historyStepRef.current);
      return newHistory;
    });
  }, []);

  useEffect(() => {
    const initializeCanvas = async () => {
      if (!canvasRef.current) return;

      const fabric = await getFabric();

      // Create canvas
      const canvas = new fabric.Canvas(canvasRef.current, {
        width: canvasWidth,
        height: canvasHeight,
        backgroundColor: 'transparent',
        border: '1px solid var(--border-subtle)',
      });

      fabricCanvasRef.current = canvas;

      void createGuideManager(canvas);

      canvas.on('selection:created', (e: FabricSelectionEvent) => {
        if (e.selected && e.selected.length > 0) {
          setSelectedImageId(e.selected[0].id);
        }
      });

      canvas.on('selection:updated', (e: FabricSelectionEvent) => {
        if (e.selected && e.selected.length > 0) {
          setSelectedImageId(e.selected[0].id);
        }
      });

      canvas.on('selection:cleared', () => {
        setSelectedImageId(null);
      });

      canvas.on('object:modified', (e: FabricSelectionEvent) => {
        if (e.target && e.target.id) {
          const obj = e.target;
          onImageUpdate?.(e.target.id, {
            left: obj.left,
            top: obj.top,
            width: (obj.width || 0) * (obj.scaleX || 1),
            height: (obj.height || 0) * (obj.scaleY || 1),
            rotation: obj.angle || 0,
            opacity: obj.opacity || 1,
            zIndex: canvas.getObjects().indexOf(obj),
          });

          pushCanvasHistory(canvas);
        }
      });

      for (const img of images) {
        try {
          const fabricImg = (await addImageToCanvas(canvas, img.url, {
            id: img.id,
            selectable: true,
            evented: true,
          })) as FabricObjectLike;

          fabricImg.set({
            left: img.left,
            top: img.top,
            scaleX: img.width / (fabricImg.width || 100),
            scaleY: img.height / (fabricImg.height || 100),
            angle: img.rotation,
            opacity: img.opacity,
          });
        } catch (error) {
          console.error('Error loading image:', error);
        }
      }

      canvas.renderAll();

      const initialState = JSON.stringify(canvas.toJSON());
      setHistory([initialState]);
      historyStepRef.current = 0;
      setHistoryStep(0);
    };

    initializeCanvas();

    return () => {
      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.dispose();
      }
    };
  }, [canvasWidth, canvasHeight, images, onImageUpdate, pushCanvasHistory]);

  const handleAddImage = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleImageUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file || !fabricCanvasRef.current) return;

      const reader = new FileReader();
      reader.onload = async (e) => {
        const imageUrl = e.target?.result as string;
        const id = `image-${Date.now()}`;
        const canvas = fabricCanvasRef.current;
        if (!canvas) return;

        try {
          const fabricImg = (await addImageToCanvas(canvas, imageUrl, {
            id,
            selectable: true,
            evented: true,
          })) as FabricObjectLike;

          fabricImg.set({
            left: canvas.width / 2,
            top: canvas.height / 2,
            originX: 'center',
            originY: 'center',
          });

          canvas.add(fabricImg);
          canvas.setActiveObject(fabricImg);
          canvas.renderAll();

          pushCanvasHistory(canvas);

          const newImage: ChapterImage = {
            id,
            url: imageUrl,
            alt: file.name,
            width: fabricImg.width * fabricImg.scaleX,
            height: fabricImg.height * fabricImg.scaleY,
            left: fabricImg.left,
            top: fabricImg.top,
            rotation: fabricImg.angle || 0,
            opacity: fabricImg.opacity || 1,
            zIndex: canvas.getObjects().length - 1,
            createdAt: new Date().toISOString(),
          };

          onImageAdd?.(newImage);
        } catch (error) {
          console.error('Error adding image:', error);
        }
      };

      reader.readAsDataURL(file);
      event.target.value = '';
    },
    [onImageAdd, pushCanvasHistory]
  );

  const handleDeleteSelected = useCallback(() => {
    if (!selectedImageId || !fabricCanvasRef.current) return;

    const canvas = fabricCanvasRef.current;
    const obj = canvas.getObjects().find((object) => object.id === selectedImageId);
    if (obj) {
      canvas.remove(obj);
      canvas.renderAll();
      setSelectedImageId(null);
      onImageDelete?.(selectedImageId);

      pushCanvasHistory(canvas);
    }
  }, [onImageDelete, pushCanvasHistory, selectedImageId]);

  const handleUndo = useCallback(() => {
    if (historyStep > 0 && fabricCanvasRef.current) {
      const newStep = historyStep - 1;
      const canvasState = history[newStep];
      if (canvasState) {
        const canvas = fabricCanvasRef.current;
        canvas.loadFromJSON(canvasState, () => {
          canvas.renderAll();
          setHistoryStep(newStep);
        });
      }
    }
  }, [historyStep, history]);

  const handleRedo = useCallback(() => {
    if (historyStep < history.length - 1 && fabricCanvasRef.current) {
      const newStep = historyStep + 1;
      const canvasState = history[newStep];
      if (canvasState) {
        const canvas = fabricCanvasRef.current;
        canvas.loadFromJSON(canvasState, () => {
          canvas.renderAll();
          setHistoryStep(newStep);
        });
      }
    }
  }, [historyStep, history]);

  return (
    <div className="ac-text-editor h-full rounded-[12px]">
      <div className="ac-text-editor__toolbar">
        <div className="ac-editor-toolbar__group">
          <button
            type="button"
            onClick={handleAddImage}
            className="ac-button ac-button--ghost ac-button--sm"
            title="Añadir imagen"
          >
            <ImageIcon className="h-4 w-4 text-[var(--accent-mint)]" />
            <span>Imagen</span>
          </button>
        </div>

        <div className="ac-editor-toolbar__group">
          <button
            type="button"
            onClick={handleUndo}
            disabled={historyStep <= 0}
            className="ac-button ac-button--ghost ac-button--sm disabled:opacity-30"
            title="Deshacer"
          >
            <Undo2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handleRedo}
            disabled={historyStep >= history.length - 1}
            className="ac-button ac-button--ghost ac-button--sm disabled:opacity-30"
            title="Rehacer"
          >
            <Redo2 className="h-4 w-4" />
          </button>
        </div>

        <button
          type="button"
          onClick={() => setShowGuides(!showGuides)}
          className="ac-text-editor__button"
          data-active={showGuides ? 'true' : 'false'}
          title="Alternar guías de alineación"
        >
          <Grid3x3 className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={handleDeleteSelected}
          disabled={!selectedImageId}
          className="ac-button ac-button--destructive ac-button--sm disabled:opacity-30"
          title="Eliminar seleccionado"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="ac-text-editor__content ac-text-editor__content--scroll flex items-center justify-center p-4 bg-[var(--page-surface)]">
        <div className="border border-[var(--border-subtle)] rounded-lg overflow-hidden shadow-lg">
          <canvas ref={canvasRef} />
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        className="hidden"
      />
    </div>
  );
}
