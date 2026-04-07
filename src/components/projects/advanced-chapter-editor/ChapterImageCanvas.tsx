'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Image as ImageIcon, Trash2, Undo2, Redo2 } from 'lucide-react';
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

export function ChapterImageCanvas({
  onImageAdd,
  onImageDelete,
  onImageUpdate,
  images = [],
  canvasWidth = 500,
  canvasHeight = 700,
}: ChapterImageCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<any>(null);
  const guideManagerRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [historyStep, setHistoryStep] = useState(-1);

  // Initialize fabric canvas
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

      // Initialize guide manager
      guideManagerRef.current = createGuideManager(canvas);

      // Setup selection handlers
      canvas.on('selection:created', (e: any) => {
        if (e.selected && e.selected.length > 0) {
          setSelectedImageId(e.selected[0].id);
        }
      });

      canvas.on('selection:updated', (e: any) => {
        if (e.selected && e.selected.length > 0) {
          setSelectedImageId(e.selected[0].id);
        }
      });

      canvas.on('selection:cleared', () => {
        setSelectedImageId(null);
      });

      // Setup object modification handler to track changes
      canvas.on('object:modified', (e: any) => {
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
        }
      });

      // Load existing images
      for (const img of images) {
        try {
          const fabricImg = (await addImageToCanvas(canvas, img.url, {
            id: img.id,
            selectable: true,
            evented: true,
          })) as any;

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
    };

    initializeCanvas();

    return () => {
      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.dispose();
      }
    };
  }, [canvasWidth, canvasHeight, images, onImageUpdate]);

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

        try {
          const fabricImg = (await addImageToCanvas(canvas, imageUrl, {
            id,
            selectable: true,
            evented: true,
          })) as any;

          // Center new image
          fabricImg.set({
            left: canvas.width / 2,
            top: canvas.height / 2,
            originX: 'center',
            originY: 'center',
          });

          canvas.add(fabricImg);
          canvas.setActiveObject(fabricImg);
          canvas.renderAll();

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
    [onImageAdd]
  );

  const handleDeleteSelected = useCallback(() => {
    if (!selectedImageId || !fabricCanvasRef.current) return;

    const canvas = fabricCanvasRef.current;
    const obj = canvas.getObjects().find((o: any) => o.id === selectedImageId);
    if (obj) {
      canvas.remove(obj);
      canvas.renderAll();
      setSelectedImageId(null);
      onImageDelete?.(selectedImageId);
    }
  }, [selectedImageId, onImageDelete]);

  const handleUndo = useCallback(() => {
    if (historyStep > 0) {
      setHistoryStep(historyStep - 1);
      // Implement undo logic
    }
  }, [historyStep]);

  const handleRedo = useCallback(() => {
    if (historyStep < history.length - 1) {
      setHistoryStep(historyStep + 1);
      // Implement redo logic
    }
  }, [historyStep, history]);

  return (
    <div className="flex flex-col h-full border border-[var(--border-subtle)] rounded-[12px] bg-[var(--surface-soft)] overflow-hidden">
      {/* Toolbar */}
      <div className="shrink-0 flex items-center gap-2 border-b border-[var(--border-subtle)] px-4 py-3 flex-wrap">
        <div className="flex items-center gap-1 rounded-lg bg-[var(--surface-highlight)] p-1 border border-[var(--border-subtle)]">
          <button
            type="button"
            onClick={handleAddImage}
            className="flex h-8 items-center gap-2 rounded-md px-2.5 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-highlight)] transition"
            title="Añadir imagen"
          >
            <ImageIcon className="h-4 w-4 text-[var(--accent-mint)]" />
            <span>Imagen</span>
          </button>
        </div>

        <div className="h-5 w-px bg-[var(--border-subtle)] mx-1" />

        <div className="flex items-center gap-1 rounded-lg bg-[var(--surface-highlight)] p-1 border border-[var(--border-subtle)]">
          <button
            type="button"
            onClick={handleUndo}
            disabled={historyStep <= 0}
            className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--text-primary)] hover:bg-[var(--surface-highlight)] disabled:opacity-30 transition"
            title="Deshacer"
          >
            <Undo2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={handleRedo}
            disabled={historyStep >= history.length - 1}
            className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--text-primary)] hover:bg-[var(--surface-highlight)] disabled:opacity-30 transition"
            title="Rehacer"
          >
            <Redo2 className="h-4 w-4" />
          </button>
        </div>

        <div className="h-5 w-px bg-[var(--border-subtle)] mx-1" />

        <button
          type="button"
          onClick={handleDeleteSelected}
          disabled={!selectedImageId}
          className="flex h-8 w-8 items-center justify-center rounded-md text-red-500 hover:bg-red-500/10 disabled:opacity-30 transition"
          title="Eliminar seleccionado"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* Canvas area */}
      <div className="flex-1 overflow-auto flex items-center justify-center p-4 bg-[var(--page-surface)]">
        <div className="border border-[var(--border-subtle)] rounded-lg overflow-hidden shadow-lg">
          <canvas ref={canvasRef} />
        </div>
      </div>

      {/* Hidden file input */}
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
