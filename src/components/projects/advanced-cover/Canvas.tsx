'use client';

import { useEffect, useRef } from 'react';
import { createFabricCanvas, CANVAS_WIDTH, CANVAS_HEIGHT } from '@/lib/canvas-utils';

type CoverCanvasProps = {
  onCanvasReady?: (canvas: unknown) => void;
  initialPalette?: string;
};

export const CoverCanvas = ({ onCanvasReady, initialPalette = 'obsidian' }: CoverCanvasProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<unknown>(null);
  const onCanvasReadyRef = useRef(onCanvasReady);

  useEffect(() => {
    onCanvasReadyRef.current = onCanvasReady;
  });

  // Inicialización del canvas Fabric — solo una vez
  useEffect(() => {
    const initializeCanvas = async () => {
      if (!canvasRef.current) return;

      try {
        const fabricCanvas = await createFabricCanvas(canvasRef.current);
        fabricCanvasRef.current = fabricCanvas;

        if (onCanvasReadyRef.current) {
          onCanvasReadyRef.current(fabricCanvas);
        }
      } catch (error) {
        console.error('[CoverCanvas] Error initializing Fabric.js canvas:', error);
      }
    };

    initializeCanvas();

    return () => {
      if (fabricCanvasRef.current) {
        try {
          (fabricCanvasRef.current as { dispose: () => void }).dispose();
        } catch (e) {
          console.warn('[CoverCanvas] Error disposing canvas:', e);
        }
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ResizeObserver — reescala el canvas cuando el contenedor cambia de tamaño
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      const canvas = fabricCanvasRef.current as {
        setZoom: (zoom: number) => void;
        setWidth: (w: number) => void;
        setHeight: (h: number) => void;
        requestRenderAll?: () => void;
        renderAll?: () => void;
      } | null;

      if (!canvas) return;

      for (const entry of entries) {
        const newWidth = entry.contentRect.width;
        if (newWidth < 10) continue; // ignorar valores espurios durante el montaje

        const scale = newWidth / CANVAS_WIDTH;
        canvas.setZoom(scale);
        canvas.setWidth(newWidth);
        canvas.setHeight(CANVAS_HEIGHT * scale);

        if (canvas.requestRenderAll) canvas.requestRenderAll();
        else canvas.renderAll?.();
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  void initialPalette;

  return (
    <div
      ref={containerRef}
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        maxWidth: '680px',
        minHeight: '100%',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '420px',
          aspectRatio: '2 / 3',
          border: '1px solid var(--border-subtle)',
          borderRadius: '24px',
          overflow: 'hidden',       /* recorta el canvas a los bordes redondeados */
          boxShadow: 'var(--shadow-strong)',
        }}
      >
        <canvas
          ref={canvasRef}
          data-testid="fabric-canvas"
          style={{
            width: '100%',
            height: '100%',
            display: 'block',
          }}
        />
      </div>
    </div>
  );
};