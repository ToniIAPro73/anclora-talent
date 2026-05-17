'use client';

import { useRef } from 'react';
import { useCanvasStore } from '@/lib/canvas-store';
import {
  addTextToCanvas,
  addImageToCanvas,
} from '@/lib/canvas-utils';
import {
  Type, 
  Image as ImageIcon, 
  Copy, 
  Trash2,
  Undo2,
  Redo2
} from 'lucide-react';

type CanvasObjectLike = {
  type: string;
  left?: number;
  top?: number;
  clone: () => Promise<CanvasObjectLike>;
  set: (props: Record<string, unknown>) => void;
  toObject?: () => Record<string, unknown>;
};

export function CoverToolbar() {
  const { canvas, addElement, undo, redo, historyStep, history } = useCanvasStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAddText = async () => {
    if (!canvas) return;
    const id = `text-${Date.now()}`;
    const fabricText = await addTextToCanvas(canvas, 'Nuevo Texto', {
      id,
      selectable: true,
      evented: true,
      fill: '#ffffff',
      fontSize: 24,
      fontFamily: 'ui-sans-serif, system-ui, sans-serif',
    });

    // Add to store
    addElement({
      id,
      type: 'text',
      object: fabricText,
      properties: {
        fill: '#ffffff',
        fontSize: 24,
        fontFamily: 'sans',
        opacity: 1,
      },
    });
  };

  const handleAddImage = () => {
    fileInputRef.current?.click();
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !canvas) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const imageUrl = e.target?.result as string;
      const id = `image-${Date.now()}`;
      try {
        const fabricImage = await addImageToCanvas(canvas, imageUrl, { id });
        
        addElement({
          id,
          type: 'image',
          object: fabricImage,
          properties: {
            opacity: 1,
          },
        });
      } catch (error) {
        console.error('Error adding image:', error);
      }
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const handleClear = () => {
    if (!canvas) return;
    if (confirm('¿Estás seguro de que deseas limpiar el diseño?')) {
      // Keep only background if exists? No, clear all for now
      canvas.clear();
      canvas.set({ backgroundColor: '#0b133f' }); // Default palette
      canvas.renderAll();
    }
  };

  const handleDuplicate = async () => {
    if (!canvas) return;
    const activeObject = canvas.getActiveObject() as CanvasObjectLike | null;
    if (!activeObject) return;

    try {
      const cloned = await activeObject.clone();
      const id = `clone-${Date.now()}`;
      cloned.set({
        left: (cloned.left || 0) + 20,
        top: (cloned.top || 0) + 20,
        id: id,
      });
      canvas.add(cloned);
      
      // Add to store
      addElement({
        id,
        type: activeObject.type.includes('text') ? 'text' : 'image',
        object: cloned,
        properties: { ...(activeObject.toObject?.() || {}) },
      });

      canvas.setActiveObject(cloned);
      if (typeof canvas.requestRenderAll === 'function') {
        canvas.requestRenderAll();
      } else {
        canvas.renderAll();
      }
    } catch (error) {
      console.error('[CoverToolbar] Error cloning object:', error);
    }
  };

  return (
    <div className="ac-editor-toolbar">
      <div className="ac-editor-toolbar__group">
        <button
          type="button"
          onClick={handleAddText}
          className="ac-button ac-button--ghost ac-button--sm"
          title="Añadir texto"
        >
          <Type className="h-4 w-4 text-[var(--accent)]" />
          <span>Texto</span>
        </button>
        <button
          type="button"
          onClick={handleAddImage}
          className="ac-button ac-button--ghost ac-button--sm"
          title="Añadir imagen"
        >
          <ImageIcon className="h-4 w-4 text-[var(--accent)]" />
          <span>Imagen</span>
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        className="hidden"
      />

      <div className="ac-editor-toolbar__group">
        <button
          type="button"
          onClick={undo}
          disabled={historyStep <= 0}
          className="ac-button ac-button--ghost ac-button--icon ac-button--sm disabled:opacity-30"
          title="Deshacer"
        >
          <Undo2 className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={redo}
          disabled={historyStep >= history.length - 1}
          className="ac-button ac-button--ghost ac-button--icon ac-button--sm disabled:opacity-30"
          title="Rehacer"
        >
          <Redo2 className="h-4 w-4" />
        </button>
      </div>

      <div className="ac-editor-toolbar__group">
        <button
          type="button"
          onClick={handleDuplicate}
          className="ac-button ac-button--ghost ac-button--icon ac-button--sm"
          title="Duplicar seleccionado"
        >
          <Copy className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={handleClear}
          className="ac-button ac-button--destructive ac-button--icon ac-button--sm"
          title="Limpiar diseño"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
