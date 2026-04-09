'use client';

import { useEffect, useRef } from 'react';
import { createFabricCanvas } from '@/lib/canvas-utils';

type CoverCanvasProps = {
  onCanvasReady?: (canvas: unknown) => void;
  initialPalette?: string;
};

export const CoverCanvas = ({ onCanvasReady, initialPalette = 'obsidian' }: CoverCanvasProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<unknown>(null);
  // Keep a ref to the latest callback so we can call it without re-initializing the canvas
  const onCanvasReadyRef = useRef(onCanvasReady);
  useEffect(() => {
    onCanvasReadyRef.current = onCanvasReady;
  });

  useEffect(() => {
    const initializeCanvas = async () => {
      if (!canvasRef.current) return;

      try {
        // Create the Fabric.js canvas once — never recreate on callback changes
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

    // Cleanup
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
  }, []); // intentionally empty — canvas is initialized once, callback tracked via ref

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
          maxWidth: '460px',
          aspectRatio: '2 / 3',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          border: '1px solid var(--border-subtle)',
          borderRadius: '24px',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))',
          boxShadow: 'var(--shadow-strong)',
        }}
      >
        <canvas
          ref={canvasRef}
          data-testid="fabric-canvas"
          style={{
            width: '100%',
            height: '100%',
            borderRadius: '12px',
            display: 'block',
          }}
        />
      </div>
    </div>
  );
};
