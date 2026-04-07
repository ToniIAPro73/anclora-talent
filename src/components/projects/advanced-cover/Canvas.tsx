'use client';

import { useEffect, useRef } from 'react';
import { createFabricCanvas } from '@/lib/canvas-utils';

type CoverCanvasProps = {
  onCanvasReady?: (canvas: any) => void;
  initialPalette?: string;
};

export const CoverCanvas = ({ onCanvasReady, initialPalette = 'obsidian' }: CoverCanvasProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<any>(null);

  useEffect(() => {
    const initializeCanvas = async () => {
      if (!canvasRef.current) return;

      try {
        // Create the Fabric.js canvas
        const fabricCanvas = await createFabricCanvas(canvasRef.current);
        fabricCanvasRef.current = fabricCanvas;

        // Notify parent that canvas is ready
        if (onCanvasReady) {
          onCanvasReady(fabricCanvas);
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
          fabricCanvasRef.current.dispose();
        } catch (e) {
          console.warn('[CoverCanvas] Error disposing canvas:', e);
        }
      }
    };
  }, [onCanvasReady]);

  return (
    <div
      ref={containerRef}
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
        maxWidth: '500px',
      }}
    >
      <canvas
        ref={canvasRef}
        data-testid="fabric-canvas"
        style={{
          border: '1px solid var(--border-subtle)',
          borderRadius: '8px',
          display: 'block',
        }}
      />
    </div>
  );
};
