'use client';

import { useEffect, useRef } from 'react';
import { createFabricCanvas, CANVAS_WIDTH, CANVAS_HEIGHT } from '@/lib/canvas-utils';

type CoverCanvasProps = {
  onCanvasReady?: (canvas: unknown) => void;
  initialPalette?: string;
};

export const CoverCanvas = ({ onCanvasReady, initialPalette = 'obsidian' }: CoverCanvasProps) => {
  const outerRef   = useRef<HTMLDivElement>(null); // div externo que mide el espacio disponible
  const scalerRef  = useRef<HTMLDivElement>(null); // div que recibe transform: scale()
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<unknown>(null);
  const onCanvasReadyRef = useRef(onCanvasReady);

  useEffect(() => { onCanvasReadyRef.current = onCanvasReady; });

  // Inicializar Fabric una sola vez — siempre a 400×600 fijos
  useEffect(() => {
    const init = async () => {
      if (!canvasRef.current) return;
      try {
        const fc = await createFabricCanvas(canvasRef.current);
        fabricCanvasRef.current = fc;
        if (onCanvasReadyRef.current) onCanvasReadyRef.current(fc);
      } catch (e) {
        console.error('[CoverCanvas] Error initializing Fabric.js canvas:', e);
      }
    };
    init();
    return () => {
      try { (fabricCanvasRef.current as { dispose: () => void } | null)?.dispose(); }
      catch (e) { console.warn('[CoverCanvas] dispose error:', e); }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ResizeObserver — solo ajusta transform: scale() en el div escalador
  // Fabric nunca cambia de tamaño: siempre 400×600
  useEffect(() => {
    const outer = outerRef.current;
    const scaler = scalerRef.current;
    if (!outer || !scaler) return;

    const applyScale = (availableWidth: number) => {
      const scale = availableWidth / CANVAS_WIDTH;
      scaler.style.transform = `scale(${scale})`;
      scaler.style.transformOrigin = 'top left';
      // El outer necesita altura explícita para que el flow no colapse
      outer.style.height = `${CANVAS_HEIGHT * scale}px`;
    };

    // Aplicar escala inicial
    applyScale(outer.clientWidth || CANVAS_WIDTH);

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        applyScale(entry.contentRect.width);
      }
    });
    ro.observe(outer);
    return () => ro.disconnect();
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
        outerRef: define el ancho máximo disponible y la altura calculada por JS.
        overflow: hidden para que el canvas 400×600 no desborde mientras escala.
      */}
      <div
        ref={outerRef}
        style={{
          width: '100%',
          maxWidth: '420px',
          overflow: 'hidden',
          border: '1px solid var(--border-subtle)',
          borderRadius: '24px',
          boxShadow: 'var(--shadow-strong)',
        }}
      >
        {/*
          scalerRef: siempre 400×600 px, escalado con transform: scale().
          Fabric ve siempre 400×600 — sin zoom, sin setDimensions.
        */}
        <div
          ref={scalerRef}
          style={{
            width: `${CANVAS_WIDTH}px`,
            height: `${CANVAS_HEIGHT}px`,
          }}
        >
          <canvas
            ref={canvasRef}
            data-testid="fabric-canvas"
            style={{ display: 'block' }}
          />
        </div>
      </div>
    </div>
  );
};