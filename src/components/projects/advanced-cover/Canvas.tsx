'use client';

import { useEffect, useRef } from 'react';
import { createFabricCanvas, CANVAS_WIDTH, CANVAS_HEIGHT } from '@/lib/canvas-utils';

type CoverCanvasProps = {
  onCanvasReady?: (canvas: unknown) => void;
  initialPalette?: string;
};

export const CoverCanvas = ({ onCanvasReady, initialPalette = 'obsidian' }: CoverCanvasProps) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<unknown>(null);
  const onCanvasReadyRef = useRef(onCanvasReady);

  useEffect(() => {
    onCanvasReadyRef.current = onCanvasReady;
  });

  useEffect(() => {
    const initializeCanvas = async () => {
      if (!canvasRef.current || !wrapperRef.current) return;
      try {
        // Medir el contenedor ANTES de crear Fabric para pasarle las dimensiones reales
        const containerW = wrapperRef.current.clientWidth || CANVAS_WIDTH;
        const containerH = wrapperRef.current.clientHeight || CANVAS_HEIGHT;

        const fabricCanvas = await createFabricCanvas(canvasRef.current, {
          width: containerW,
          height: containerH,
        });

        // Fabric envuelve el <canvas> en un div generado. Forzar ese wrapper a fill completo
        const fabricWrapper = canvasRef.current.parentElement;
        if (fabricWrapper && fabricWrapper !== wrapperRef.current) {
          fabricWrapper.style.width = '100%';
          fabricWrapper.style.height = '100%';
          fabricWrapper.style.position = 'relative';

          // También los canvas internos de Fabric (upper + lower)
          fabricWrapper.querySelectorAll('canvas').forEach((c) => {
            c.style.width = '100%';
            c.style.height = '100%';
            c.style.position = 'absolute';
            c.style.top = '0';
            c.style.left = '0';
          });
        }

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

  // ResizeObserver — reescala zoom de Fabric cuando el contenedor cambia
  useEffect(() => {
    if (!wrapperRef.current) return;

    const observer = new ResizeObserver((entries) => {
      const fc = fabricCanvasRef.current as {
        setZoom: (z: number) => void;
        setWidth: (w: number) => void;
        setHeight: (h: number) => void;
        requestRenderAll?: () => void;
        renderAll?: () => void;
      } | null;
      if (!fc) return;

      for (const entry of entries) {
        const newW = entry.contentRect.width;
        const newH = entry.contentRect.height;
        if (newW < 10) continue;
        const scale = newW / CANVAS_WIDTH;
        fc.setZoom(scale);
        fc.setWidth(newW);
        fc.setHeight(newH > 10 ? newH : CANVAS_HEIGHT * scale);

        // Re-forzar CSS en canvas internos tras resize
        const fabricWrapper = canvasRef.current?.parentElement;
        if (fabricWrapper) {
          fabricWrapper.style.width = '100%';
          fabricWrapper.style.height = '100%';
          fabricWrapper.querySelectorAll('canvas').forEach((c) => {
            c.style.width = '100%';
            c.style.height = '100%';
          });
        }

        if (fc.requestRenderAll) fc.requestRenderAll();
        else fc.renderAll?.();
      }
    });

    observer.observe(wrapperRef.current);
    return () => observer.disconnect();
  }, []);

  void initialPalette;

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        width: '100%',
        maxWidth: '680px',
      }}
    >
      {/* Contenedor visual con ratio 2:3 — overflow hidden para que Fabric no se derrame */}
      <div
        ref={wrapperRef}
        style={{
          width: '100%',
          maxWidth: '420px',
          aspectRatio: '2 / 3',
          position: 'relative',
          overflow: 'hidden',
          border: '1px solid var(--border-subtle)',
          borderRadius: '24px',
          boxShadow: 'var(--shadow-strong)',
        }}
      >
        {/* canvas original — Fabric lo envuelve en su propio div */}
        <canvas
          ref={canvasRef}
          data-testid="fabric-canvas"
          style={{ display: 'block', position: 'absolute', inset: 0 }}
        />
      </div>
    </div>
  );
};