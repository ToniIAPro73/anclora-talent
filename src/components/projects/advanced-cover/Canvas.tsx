'use client';

import { useEffect, useRef } from 'react';
import { createFabricCanvas, CANVAS_WIDTH, CANVAS_HEIGHT } from '@/lib/canvas-utils';

type CoverCanvasProps = {
  onCanvasReady?: (canvas: unknown) => void;
  initialPalette?: string;
};

export const CoverCanvas = ({ onCanvasReady, initialPalette = 'obsidian' }: CoverCanvasProps) => {
  const outerRef        = useRef<HTMLDivElement>(null);
  const scalerRef       = useRef<HTMLDivElement>(null);
  const canvasRef       = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<unknown>(null);
  const onCanvasReadyRef = useRef(onCanvasReady);

  useEffect(() => { onCanvasReadyRef.current = onCanvasReady; });

  // Función de escalado reutilizable — exportada al scope del componente
  // para que tanto el ResizeObserver como el init de Fabric puedan llamarla.
  const applyScale = (availableWidth: number) => {
    const scaler = scalerRef.current;
    const outer  = outerRef.current;
    if (!scaler || !outer || availableWidth <= 0) return;
    const scale = availableWidth / CANVAS_WIDTH;
    scaler.style.transform       = `scale(${scale})`;
    scaler.style.transformOrigin = 'top left';
    outer.style.height           = `${CANVAS_HEIGHT * scale}px`;
  };

  // Inicializar Fabric una sola vez — siempre 400x600 internamente.
  // Tras inicializar, forzamos applyScale con el ancho real del DOM.
  useEffect(() => {
    const init = async () => {
      if (!canvasRef.current) return;
      try {
        const fc = await createFabricCanvas(canvasRef.current);
        fabricCanvasRef.current = fc;
        // Forzar escala correcta DESPUÉS de que Fabric haya montado el canvas
        // (en este punto outerRef.current.clientWidth ya tiene valor real)
        if (outerRef.current) {
          applyScale(outerRef.current.clientWidth);
        }
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

  // ResizeObserver — reescala cuando el contenedor cambia de ancho.
  useEffect(() => {
    const outer = outerRef.current;
    if (!outer) return;

    // Intento inicial (puede ser 0 en SSR, se corrige en el init de Fabric)
    applyScale(outer.clientWidth);

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        applyScale(entry.contentRect.width);
      }
    });
    ro.observe(outer);
    return () => ro.disconnect();
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
      {/* outerRef: define el ancho máximo disponible y recibe la altura calculada */}
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
        {/* scalerRef: siempre 400x600 px reales, escalado solo con CSS */}
        <div
          ref={scalerRef}
          style={{
            width:  `${CANVAS_WIDTH}px`,
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
