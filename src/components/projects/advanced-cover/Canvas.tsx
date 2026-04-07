'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  createFabricCanvas,
  disposeCanvas,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  getFabric,
} from '@/lib/canvas-utils';
import { useCanvasStore } from '@/lib/canvas-store';

interface CanvasProps {
  onCanvasReady?: (canvas: any) => void;
  initialPalette?: string;
}

const SNAP_THRESHOLD = 8;

export function CoverCanvas({ onCanvasReady, initialPalette }: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<any>(null);
  const guideLinesRef = useRef<any[]>([]);
  const { setCanvas, selectElement } = useCanvasStore();
  const [isInitialized, setIsInitialized] = useState(false);

  const clearGuideLines = useCallback((fabricCanvas: any) => {
    guideLinesRef.current.forEach((line) => {
      try {
        fabricCanvas.remove(line);
      } catch (e) {}
    });
    guideLinesRef.current = [];
  }, []);

  const createGuideLine = useCallback(
    async (fabricCanvas: any, points: number[], color: string = '#4a9fd8') => {
      const fabric = await getFabric();
      const line = new fabric.Line(points, {
        stroke: color,
        strokeWidth: 1,
        strokeDashArray: [5, 5],
        selectable: false,
        evented: false,
        excludeFromExport: true,
      });
      fabricCanvas.add(line);
      guideLinesRef.current.push(line);
      return line;
    },
    []
  );

  const showAlignmentGuides = useCallback(
    async (fabricCanvas: any, movingObj: any) => {
      clearGuideLines(fabricCanvas);

      const canvasWidth = fabricCanvas.width;
      const canvasHeight = fabricCanvas.height;
      const centerX = canvasWidth / 2;
      const centerY = canvasHeight / 2;

      const objBounds = movingObj.getBoundingRect();
      const objCenterX = objBounds.left + objBounds.width / 2;
      const objCenterY = objBounds.top + objBounds.height / 2;

      // Vertical Center
      if (Math.abs(objCenterX - centerX) < SNAP_THRESHOLD) {
        await createGuideLine(fabricCanvas, [centerX, 0, centerX, canvasHeight]);
        movingObj.set({
          left: centerX - objBounds.width / 2 + (movingObj.left - objBounds.left),
        });
      }

      // Horizontal Center
      if (Math.abs(objCenterY - centerY) < SNAP_THRESHOLD) {
        await createGuideLine(fabricCanvas, [0, centerY, canvasWidth, centerY]);
        movingObj.set({
          top: centerY - objBounds.height / 2 + (movingObj.top - objBounds.top),
        });
      }

      fabricCanvas.renderAll();
    },
    [clearGuideLines, createGuideLine]
  );

  useEffect(() => {
    if (!canvasRef.current || isInitialized) return;

    let isMounted = true;

    const initCanvas = async () => {
      try {
        const fabricCanvas = await createFabricCanvas(canvasRef.current!);
        if (!isMounted) {
          disposeCanvas(fabricCanvas);
          return;
        }

        fabricCanvasRef.current = fabricCanvas;
        
        // Initial background color based on palette
        const bgColors: Record<string, string> = {
          obsidian: '#0b133f',
          teal: '#124a50',
          sand: '#f2e3b3',
        };
        fabricCanvas.set({ backgroundColor: bgColors[initialPalette || 'obsidian'] || '#0b133f' });

        fabricCanvas.on('selection:created', (e: any) => handleObjectSelected(e.selected?.[0]));
        fabricCanvas.on('selection:updated', (e: any) => handleObjectSelected(e.selected?.[0]));
        fabricCanvas.on('selection:cleared', () => selectElement(null));

        fabricCanvas.on('object:moving', (e: any) => {
          if (e.target) showAlignmentGuides(fabricCanvas, e.target);
        });

        fabricCanvas.on('object:modified', () => {
          clearGuideLines(fabricCanvas);
          fabricCanvas.renderAll();
          useCanvasStore.getState().pushHistory();
        });

        fabricCanvas.on('mouse:up', () => {
          clearGuideLines(fabricCanvas);
          fabricCanvas.renderAll();
        });

        const handleObjectSelected = (selectedObj: any) => {
          if (!selectedObj) return;
          const elements = useCanvasStore.getState().elements;
          const element = elements.find((el: any) => el.id === selectedObj.id);

          if (element) {
            selectElement(element);
          } else {
            selectElement({
              id: selectedObj.id || `temp-${Date.now()}`,
              type: selectedObj.type.includes('image') ? 'image' : 'text',
              object: selectedObj,
              properties: {
                fill: selectedObj.fill,
                fontSize: selectedObj.fontSize,
                fontFamily: selectedObj.fontFamily,
                opacity: selectedObj.opacity,
              },
            });
          }
        };

        setCanvas(fabricCanvas);
        setIsInitialized(true);
        if (onCanvasReady) onCanvasReady(fabricCanvas);
      } catch (error) {
        console.error('Error initializing canvas:', error);
      }
    };

    initCanvas();
    return () => { isMounted = false; };
  }, [isInitialized, setCanvas, onCanvasReady, selectElement, showAlignmentGuides, clearGuideLines, initialPalette]);

  useEffect(() => {
    return () => {
      if (fabricCanvasRef.current) {
        disposeCanvas(fabricCanvasRef.current);
        fabricCanvasRef.current = null;
      }
    };
  }, []);

  return (
    <div className="flex justify-center items-center bg-[var(--surface-soft)] rounded-[32px] overflow-hidden p-6 border border-[var(--border-subtle)] shadow-inner">
      <div className="relative shadow-2xl rounded-lg overflow-hidden border-4 border-white/5">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          style={{ cursor: 'default' }}
        />
      </div>
    </div>
  );
}
