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
  RotateCcw, 
  RotateCw, 
  Copy, 
  Trash2,
  Undo2,
  Redo2
} from 'lucide-react';

export function CoverToolbar() {
  const { canvas, addElement, undo, redo, historyStep, history } = useCanvasStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAddText = async () => {
    if (!canvas) return;
    const id = `text-${Date.now()}`;
    const fabricText = await addTextToCanvas(canvas, 'Nuevo Texto', { id });
    
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
        const fabricImage = (await addImageToCanvas(canvas, imageUrl, { id })) as any;
        
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

  const handleDuplicate = () => {
    if (!canvas) return;
    const activeObject = canvas.getActiveObject();
    if (!activeObject) return;

    activeObject.clone((cloned: any) => {
      cloned.set({
        left: (cloned.left || 0) + 20,
        top: (cloned.top || 0) + 20,
        id: `clone-${Date.now()}`,
      });
      canvas.add(cloned);
      canvas.setActiveObject(cloned);
      canvas.renderAll();
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1 rounded-xl bg-[var(--surface-soft)] p-1 border border-[var(--border-subtle)]">
        <button
          type="button"
          onClick={handleAddText}
          className="flex h-9 items-center gap-2 rounded-lg px-3 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-highlight)] transition"
          title="Añadir texto"
        >
          <Type className="h-4 w-4 text-[var(--accent)]" />
          <span>Texto</span>
        </button>
        <button
          type="button"
          onClick={handleAddImage}
          className="flex h-9 items-center gap-2 rounded-lg px-3 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--surface-highlight)] transition"
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

      <div className="h-6 w-px bg-[var(--border-subtle)] mx-1" />

      <div className="flex items-center gap-1 rounded-xl bg-[var(--surface-soft)] p-1 border border-[var(--border-subtle)]">
        <button
          type="button"
          onClick={undo}
          disabled={historyStep <= 0}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--text-primary)] hover:bg-[var(--surface-highlight)] disabled:opacity-30 transition"
          title="Deshacer"
        >
          <Undo2 className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={redo}
          disabled={historyStep >= history.length - 1}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--text-primary)] hover:bg-[var(--surface-highlight)] disabled:opacity-30 transition"
          title="Rehacer"
        >
          <Redo2 className="h-4 w-4" />
        </button>
      </div>

      <div className="h-6 w-px bg-[var(--border-subtle)] mx-1" />

      <div className="flex items-center gap-1 rounded-xl bg-[var(--surface-soft)] p-1 border border-[var(--border-subtle)]">
        <button
          type="button"
          onClick={handleDuplicate}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--text-primary)] hover:bg-[var(--surface-highlight)] transition"
          title="Duplicar seleccionado"
        >
          <Copy className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={handleClear}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-red-500 hover:bg-red-500/10 transition"
          title="Limpiar diseño"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
