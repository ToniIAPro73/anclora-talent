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
        // Medir el ancho real del contenedor y derivar el alto con ratio 2:3
        const containerW = wrapperRef.current.clientWidth || 400;
        const containerH = Math.round(containerW * (CANVAS_HEIGHT / CANVAS_WIDTH)); // ratio 2:3

        // Aplicar esas dimensiones al div wrapper y al <canvas> ANTES de que Fabric lo inicialice
        wrapperRef.current.style.height = `${containerH}px`;
        canvasRef.current.width = containerW;
        canvasRef.current.height = containerH;

        // Escalar el zoom de Fabric para que las coordenadas internas (400×600)
        // se mapeen al tamaño real del contenedor
        const zoom = containerW / CANVAS_WIDTH;

        const fabricCanvas = await createFabricCanvas(canvasRef.current, {
          width: containerW,
          height: containerH,
        });

        // Aplicar zoom para que los objetos internos usen coordenadas 400×600
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (fabricCanvas as any).setZoom(zoom);

        // Parchear el div.canvas-container que genera Fabric internamente
        const fabricWrapper = canvasRef.current?.parentElement;
        if (fabricWrapper && fabricWrapper !== wrapperRef.current) {
          fabricWrapper.style.width = `${containerW}px`;
          fabricWrapper.style.height = `${containerH}px`;
          fabricWrapper.style.position = 'absolute';
          fabricWrapper.style.inset = '0';
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
      {/*
        Sin aspectRatio CSS — el alto lo fija JS en el useEffect.
        position: relative + overflow: hidden para contener el div.canvas-container de Fabric.
      */}
      <div
        ref={wrapperRef}
        style={{
          width: '100%',
          maxWidth: '420px',
          position: 'relative',
          overflow: 'hidden',
          border: '1px solid var(--border-subtle)',
          borderRadius: '24px',
          boxShadow: 'var(--shadow-strong)',
          backgroundColor: '#0b133f', // fallback mientras carga Fabric
        }}
      >
        <canvas
          ref={canvasRef}
          data-testid="fabric-canvas"
          style={{ display: 'block' }}
        />
      </div>
    </div>
  );
};