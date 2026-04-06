"use client";

/**
 * Canvas.tsx - VERSION 3 CON GUÍAS ESTILO CANVA
 *
 * Features:
 * - Guías de alineación visibles (líneas rojas/verdes)
 * - Snap a centro y bordes
 * - Distancias mostradas durante el movimiento
 * - Controles de selección visibles
 */

import { useEffect, useRef, useState, useCallback } from "react";
import {
  createFabricCanvas,
  disposeCanvas,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  getFabric,
} from "@/lib/canvas-utils";
import { useCanvasStore } from "@/lib/canvas-store";

interface CanvasProps {
  onCanvasReady?: (canvas: any) => void;
}

const SNAP_THRESHOLD = 8; // Píxeles de tolerancia para snap

export default function Canvas({ onCanvasReady }: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<any>(null);
  const guideLinesRef = useRef<any[]>([]);
  const { setCanvas, selectElement } = useCanvasStore();
  const [isInitialized, setIsInitialized] = useState(false);

  const memoizedOnCanvasReady = useCallback(onCanvasReady || (() => {}), [
    onCanvasReady,
  ]);

  // ═══════════════════════════════════════════════════════════════════════════
  // LIMPIAR GUÍAS
  // ═══════════════════════════════════════════════════════════════════════════
  const clearGuideLines = useCallback((fabricCanvas: any) => {
    guideLinesRef.current.forEach((line) => {
      try {
        fabricCanvas.remove(line);
      } catch (e) {}
    });
    guideLinesRef.current = [];
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // CREAR LÍNEA GUÍA
  // ═══════════════════════════════════════════════════════════════════════════
  const createGuideLine = useCallback(
    async (fabricCanvas: any, points: number[], color: string = "#ff0000") => {
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

  // ═══════════════════════════════════════════════════════════════════════════
  // MOSTRAR GUÍAS DURANTE EL MOVIMIENTO
  // ═══════════════════════════════════════════════════════════════════════════
  const showAlignmentGuides = useCallback(
    async (fabricCanvas: any, movingObj: any) => {
      clearGuideLines(fabricCanvas);

      const canvasWidth = fabricCanvas.width;
      const canvasHeight = fabricCanvas.height;
      const centerX = canvasWidth / 2;
      const centerY = canvasHeight / 2;

      // Obtener bounds del objeto
      const objBounds = movingObj.getBoundingRect();
      const objCenterX = objBounds.left + objBounds.width / 2;
      const objCenterY = objBounds.top + objBounds.height / 2;
      const objLeft = objBounds.left;
      const objRight = objBounds.left + objBounds.width;
      const objTop = objBounds.top;
      const objBottom = objBounds.top + objBounds.height;

      // ═══════════════════════════════════════════════════════════════════
      // GUÍAS DE CENTRO DEL CANVAS
      // ═══════════════════════════════════════════════════════════════════

      // Centro vertical (objeto centrado horizontalmente)
      if (Math.abs(objCenterX - centerX) < SNAP_THRESHOLD) {
        await createGuideLine(
          fabricCanvas,
          [centerX, 0, centerX, canvasHeight],
          "#ff0000"
        );
        // Snap al centro
        movingObj.set({
          left:
            centerX - objBounds.width / 2 + (movingObj.left - objBounds.left),
        });
      }

      // Centro horizontal (objeto centrado verticalmente)
      if (Math.abs(objCenterY - centerY) < SNAP_THRESHOLD) {
        await createGuideLine(
          fabricCanvas,
          [0, centerY, canvasWidth, centerY],
          "#ff0000"
        );
        movingObj.set({
          top: centerY - objBounds.height / 2 + (movingObj.top - objBounds.top),
        });
      }

      // ═══════════════════════════════════════════════════════════════════
      // GUÍAS DE BORDES DEL CANVAS
      // ═══════════════════════════════════════════════════════════════════

      // Borde izquierdo
      if (Math.abs(objLeft) < SNAP_THRESHOLD) {
        await createGuideLine(fabricCanvas, [0, 0, 0, canvasHeight], "#00ff00");
        movingObj.set({ left: movingObj.left - objLeft });
      }

      // Borde derecho
      if (Math.abs(objRight - canvasWidth) < SNAP_THRESHOLD) {
        await createGuideLine(
          fabricCanvas,
          [canvasWidth, 0, canvasWidth, canvasHeight],
          "#00ff00"
        );
        movingObj.set({ left: movingObj.left - (objRight - canvasWidth) });
      }

      // Borde superior
      if (Math.abs(objTop) < SNAP_THRESHOLD) {
        await createGuideLine(fabricCanvas, [0, 0, canvasWidth, 0], "#00ff00");
        movingObj.set({ top: movingObj.top - objTop });
      }

      // Borde inferior
      if (Math.abs(objBottom - canvasHeight) < SNAP_THRESHOLD) {
        await createGuideLine(
          fabricCanvas,
          [0, canvasHeight, canvasWidth, canvasHeight],
          "#00ff00"
        );
        movingObj.set({ top: movingObj.top - (objBottom - canvasHeight) });
      }

      // ═══════════════════════════════════════════════════════════════════
      // GUÍAS DE ALINEACIÓN CON OTROS OBJETOS
      // ═══════════════════════════════════════════════════════════════════
      const allObjects = fabricCanvas
        .getObjects()
        .filter(
          (obj: any) =>
            obj !== movingObj &&
            !guideLinesRef.current.includes(obj) &&
            obj.selectable !== false
        );

      for (const otherObj of allObjects) {
        const otherBounds = otherObj.getBoundingRect();
        const otherCenterX = otherBounds.left + otherBounds.width / 2;
        const otherCenterY = otherBounds.top + otherBounds.height / 2;

        // Alineación de centros verticales
        if (Math.abs(objCenterX - otherCenterX) < SNAP_THRESHOLD) {
          await createGuideLine(
            fabricCanvas,
            [
              otherCenterX,
              Math.min(objTop, otherBounds.top),
              otherCenterX,
              Math.max(objBottom, otherBounds.top + otherBounds.height),
            ],
            "#00aaff"
          );
        }

        // Alineación de centros horizontales
        if (Math.abs(objCenterY - otherCenterY) < SNAP_THRESHOLD) {
          await createGuideLine(
            fabricCanvas,
            [
              Math.min(objLeft, otherBounds.left),
              otherCenterY,
              Math.max(objRight, otherBounds.left + otherBounds.width),
              otherCenterY,
            ],
            "#00aaff"
          );
        }

        // Alineación de bordes izquierdos
        if (Math.abs(objLeft - otherBounds.left) < SNAP_THRESHOLD) {
          await createGuideLine(
            fabricCanvas,
            [
              otherBounds.left,
              Math.min(objTop, otherBounds.top),
              otherBounds.left,
              Math.max(objBottom, otherBounds.top + otherBounds.height),
            ],
            "#ffaa00"
          );
        }

        // Alineación de bordes derechos
        if (
          Math.abs(objRight - (otherBounds.left + otherBounds.width)) <
          SNAP_THRESHOLD
        ) {
          await createGuideLine(
            fabricCanvas,
            [
              otherBounds.left + otherBounds.width,
              Math.min(objTop, otherBounds.top),
              otherBounds.left + otherBounds.width,
              Math.max(objBottom, otherBounds.top + otherBounds.height),
            ],
            "#ffaa00"
          );
        }
      }

      fabricCanvas.renderAll();
    },
    [clearGuideLines, createGuideLine]
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // INICIALIZAR CANVAS
  // ═══════════════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!canvasRef.current || isInitialized) return;

    let isMounted = true;

    const initCanvas = async () => {
      try {
        if (fabricCanvasRef.current) {
          disposeCanvas(fabricCanvasRef.current);
          fabricCanvasRef.current = null;
        }

        const fabricCanvas = await createFabricCanvas(canvasRef.current!);

        if (!isMounted) {
          disposeCanvas(fabricCanvas);
          return;
        }

        fabricCanvasRef.current = fabricCanvas;

        // ═══════════════════════════════════════════════════════════════════
        // EVENTOS DE SELECCIÓN
        // ═══════════════════════════════════════════════════════════════════

        fabricCanvas.on("selection:created", (e: any) => {
          handleObjectSelected(e.selected?.[0]);
        });

        fabricCanvas.on("selection:updated", (e: any) => {
          handleObjectSelected(e.selected?.[0]);
        });

        fabricCanvas.on("selection:cleared", () => {
          selectElement(null);
        });

        // ═══════════════════════════════════════════════════════════════════
        // EVENTOS DE MOVIMIENTO (GUÍAS)
        // ═══════════════════════════════════════════════════════════════════

        fabricCanvas.on("object:moving", (e: any) => {
          if (e.target) {
            showAlignmentGuides(fabricCanvas, e.target);
          }
        });

        fabricCanvas.on("object:scaling", (e: any) => {
          if (e.target) {
            showAlignmentGuides(fabricCanvas, e.target);
          }
        });

        fabricCanvas.on("object:modified", () => {
          clearGuideLines(fabricCanvas);
          fabricCanvas.renderAll();
        });

        fabricCanvas.on("mouse:up", () => {
          clearGuideLines(fabricCanvas);
          fabricCanvas.renderAll();
        });

        // Handler de selección
        const handleObjectSelected = (selectedObj: any) => {
          if (!selectedObj) return;

          const elements = useCanvasStore.getState().elements;
          const element = elements.find((el) => el.id === selectedObj.id);

          if (element) {
            selectElement(element);
          } else {
            const tempElement = {
              id: selectedObj.id || `temp-${Date.now()}`,
              type:
                selectedObj.type === "image"
                  ? ("image" as const)
                  : ("text" as const),
              object: selectedObj,
              properties: {
                fill: selectedObj.fill || "#ffffff",
                fontSize: selectedObj.fontSize,
                fontFamily: selectedObj.fontFamily,
                opacity: selectedObj.opacity || 1,
              },
            };
            selectElement(tempElement);
          }
        };

        setCanvas(fabricCanvas);
        setIsInitialized(true);

        if (memoizedOnCanvasReady) {
          memoizedOnCanvasReady(fabricCanvas);
        }
      } catch (error) {
        console.error("Error initializing canvas:", error);
      }
    };

    initCanvas();

    return () => {
      isMounted = false;
    };
  }, [
    isInitialized,
    setCanvas,
    memoizedOnCanvasReady,
    selectElement,
    showAlignmentGuides,
    clearGuideLines,
  ]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (fabricCanvasRef.current) {
        disposeCanvas(fabricCanvasRef.current);
        fabricCanvasRef.current = null;
      }
    };
  }, []);

  return (
    <div className="flex justify-center items-center bg-slate-900 rounded-lg overflow-hidden p-2">
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="border-2 border-slate-600 shadow-2xl"
        style={{ cursor: "default" }}
      />
    </div>
  );
}
