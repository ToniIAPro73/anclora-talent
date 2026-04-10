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
        const fabricCanvas = await createFabricCanvas(canvasRef.current);

        // Fabric 7 envuelve el <canvas> en un div generado. Forzar que ocupe el 100% del wrapper
        const fabricWrapper = canvasRef.current.parentElement;
        if (fabricWrapper && fabricWrapper !== wrapperRef.current) {
          fabricWrapper.style.cssText =
            'width:100% !important; height:100% !important; position:absolute; inset:0;';
          fabricWrapper.querySelectorAll('canvas').forEach((c) => {
            c.style.cssText =
              'position:absolute !important; inset:0 !important; width:100% !important; height:100% !important;';
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

  // ResizeObserver — Fabric 7 usa setDimensions({ width, height }) en vez de setWidth/setHeight
  useEffect(() => {
    if (!wrapperRef.current) return;

    const observer = new ResizeObserver((entries) => {
      const fc = fabricCanvasRef.current as {
        setZoom: (z: number) => void;
        setDimensions: (dims: { width: number; height: number }) => void;
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
        fc.setDimensions({
          width: newW,
          height: newH > 10 ? newH : CANVAS_HEIGHT * scale,
        });

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
        <canvas
          ref={canvasRef}
          data-testid="fabric-canvas"
          style={{ display: 'block', position: 'absolute', inset: 0 }}
        />
      </div>
    </div>
  );
};