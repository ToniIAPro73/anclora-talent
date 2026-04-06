"use client";

/**
 * Advanced Cover Editor - VERSION 11
 *
 * CORRECCIONES:
 * 1. Color de fondo personalizado aplicado correctamente
 * 2. Fuente Libre Baskerville añadida al mapeo
 * 3. Posiciones exactas según layout del editor básico
 * 4. Imagen con filtro de color (overlay)
 * 5. Textos fáciles de mover con controles visibles
 * 6. Guías de alineación visibles durante el movimiento
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { useCanvasStore } from "@/lib/canvas-store";
import { getFabric } from "@/lib/canvas-utils";
import Canvas from "./Canvas";
import Toolbar from "./Toolbar";
import PropertyPanel from "./PropertyPanel";
import FullscreenModal from "./FullscreenModal";
import { Button } from "@/components/ui/button";
import { Wand2 } from "lucide-react";

interface AdvancedCoverEditorProps {
  onSave?: (imageData: string) => void;
  onClose?: () => void;
  initialImage?: string;
  title?: string;
  subtitle?: string;
  author?: string;
  coverColor?: string;
  coverLayout?: string;
  coverFont?: string;
}

export default function AdvancedCoverEditor({
  onSave,
  onClose,
  initialImage,
  title = "",
  subtitle = "",
  author = "",
  coverColor = "#0088a0",
  coverLayout = "centered",
  coverFont = "font-serif",
}: AdvancedCoverEditorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [canvasKey, setCanvasKey] = useState(0);
  const { canvas, clear } = useCanvasStore();

  const dataRef = useRef({
    initialImage,
    title,
    subtitle,
    author,
    coverColor,
    coverLayout,
    coverFont,
  });

  useEffect(() => {
    dataRef.current = {
      initialImage,
      title,
      subtitle,
      author,
      coverColor,
      coverLayout,
      coverFont,
    };
  }, [
    initialImage,
    title,
    subtitle,
    author,
    coverColor,
    coverLayout,
    coverFont,
  ]);

  // ═══════════════════════════════════════════════════════════════════════════
  // MAPEO DE FUENTES (TODAS las disponibles en el editor básico)
  // ═══════════════════════════════════════════════════════════════════════════
  const getFontFamily = (fontClass: string): string => {
    const fontMap: Record<string, string> = {
      // Serif Clásicos
      "font-serif": "Libre Baskerville, Georgia, serif", // Por defecto = Libre Baskerville
      "font-playfair": "Playfair Display, Georgia, serif",
      "font-lora": "Lora, Georgia, serif",
      "font-merriweather": "Merriweather, Georgia, serif",
      "font-crimson": "Crimson Text, Georgia, serif",
      "font-cormorant": "Cormorant Garamond, Georgia, serif",
      // Sans-Serif Modernos
      "font-sans": "Inter, system-ui, sans-serif",
      "font-poppins": "Poppins, system-ui, sans-serif",
      "font-raleway": "Raleway, system-ui, sans-serif",
      "font-roboto": "Roboto, system-ui, sans-serif",
      "font-montserrat": "Montserrat, system-ui, sans-serif",
      "font-oswald": "Oswald, system-ui, sans-serif",
      "font-bebas": "Bebas Neue, system-ui, sans-serif",
      // Especiales
      "font-mono": "JetBrains Mono, monospace",
      "font-caveat": "Caveat, cursive",
      "font-pacifico": "Pacifico, cursive",
    };
    return fontMap[fontClass] || fontMap["font-serif"];
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // POSICIONES EXACTAS SEGÚN LAYOUT (coinciden con editor básico)
  // ═══════════════════════════════════════════════════════════════════════════
  const getLayoutPositions = (layout: string) => {
    // Estas posiciones deben coincidir EXACTAMENTE con las del editor básico
    switch (layout) {
      case "top":
        return { titleY: 0.12, subtitleY: 0.22, authorY: 0.9 };
      case "bottom":
        return { titleY: 0.55, subtitleY: 0.67, authorY: 0.85 };
      case "split":
        return { titleY: 0.1, subtitleY: 0.2, authorY: 0.92 };
      case "centered":
      default:
        // Para centrado: título ~45%, subtítulo ~58%, autor ~72%
        return { titleY: 0.45, subtitleY: 0.58, authorY: 0.72 };
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // CARGAR IMAGEN CON OVERLAY DE COLOR
  // ═══════════════════════════════════════════════════════════════════════════
  const loadImageWithColorOverlay = async (
    fabric: any,
    fabricCanvas: any,
    imageUrl: string,
    overlayColor: string,
    canvasWidth: number,
    canvasHeight: number
  ): Promise<void> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";

      img.onload = () => {
        const imageId = `background-${Date.now()}`;

        const fabricImg = new fabric.Image(img, {
          id: imageId,
          selectable: true,
          evented: true,
          hasControls: true,
          hasBorders: true,
          cornerColor: "#00ff00",
          cornerSize: 10,
          transparentCorners: false,
          borderColor: "#00ff00",
          borderScaleFactor: 2,
        });

        // Escalar para cubrir todo el canvas (object-cover)
        const scaleX = canvasWidth / img.width;
        const scaleY = canvasHeight / img.height;
        const scale = Math.max(scaleX, scaleY);

        fabricImg.set({
          left: (canvasWidth - img.width * scale) / 2,
          top: (canvasHeight - img.height * scale) / 2,
          scaleX: scale,
          scaleY: scale,
        });

        fabricCanvas.add(fabricImg);

        // Enviar al fondo
        try {
          if (fabricCanvas.sendObjectToBack)
            fabricCanvas.sendObjectToBack(fabricImg);
          else if (fabricCanvas.sendToBack) fabricCanvas.sendToBack(fabricImg);
          else fabricCanvas.moveTo(fabricImg, 0);
        } catch (e) {}

        // Registrar en el store
        useCanvasStore.getState().addElement({
          id: imageId,
          type: "image",
          object: fabricImg,
          properties: { opacity: 1 },
        });

        // ═══════════════════════════════════════════════════════════════════
        // OVERLAY DE COLOR (como en el editor básico)
        // ═══════════════════════════════════════════════════════════════════
        const colorOverlay = new fabric.Rect({
          id: `color-overlay-${Date.now()}`,
          left: 0,
          top: 0,
          width: canvasWidth,
          height: canvasHeight,
          fill: overlayColor,
          opacity: 0.4, // Mismo valor que en el editor básico
          selectable: true,
          evented: true,
          hasControls: false,
          hasBorders: true,
          borderColor: "#ffff00",
        });

        fabricCanvas.add(colorOverlay);

        // El overlay va encima de la imagen pero debajo de los textos
        fabricCanvas.moveTo(colorOverlay, 1);

        // Registrar overlay en el store
        useCanvasStore.getState().addElement({
          id: colorOverlay.id,
          type: "image", // Lo tratamos como imagen para las propiedades
          object: colorOverlay,
          properties: { opacity: 0.4, fill: overlayColor },
        });

        fabricCanvas.renderAll();
        resolve();
      };

      img.onerror = () => resolve();
      img.src = imageUrl;
    });
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // CREAR TEXTO SELECCIONABLE CON CONTROLES VISIBLES
  // ═══════════════════════════════════════════════════════════════════════════
  const createSelectableText = (
    fabric: any,
    fabricCanvas: any,
    text: string,
    options: {
      id: string;
      top: number;
      fontSize: number;
      fontFamily: string;
      fontWeight?: string;
      fontStyle?: string;
      opacity?: number;
    }
  ) => {
    const canvasWidth = fabricCanvas.width || 400;

    const textObj = new fabric.Textbox(text, {
      id: options.id,
      left: canvasWidth / 2,
      top: options.top,
      width: canvasWidth * 0.85,
      fontSize: options.fontSize,
      fontFamily: options.fontFamily,
      fontWeight: options.fontWeight || "normal",
      fontStyle: options.fontStyle || "normal",
      fill: "#ffffff",
      originX: "center",
      originY: "center",
      textAlign: "center",
      opacity: options.opacity || 1,
      shadow: "rgba(0,0,0,0.8) 2px 2px 8px",
      // Controles visibles y fáciles de usar
      selectable: true,
      evented: true,
      hasControls: true,
      hasBorders: true,
      cornerColor: "#00ff00",
      cornerSize: 12,
      cornerStyle: "circle",
      transparentCorners: false,
      borderColor: "#00ff00",
      borderScaleFactor: 2,
      padding: 10,
      // Permitir movimiento libre
      lockMovementX: false,
      lockMovementY: false,
      lockScalingX: false,
      lockScalingY: false,
      lockRotation: false,
    });

    fabricCanvas.add(textObj);

    // Registrar en el store
    useCanvasStore.getState().addElement({
      id: options.id,
      type: "text",
      object: textObj,
      properties: {
        fill: "#ffffff",
        fontSize: options.fontSize,
        fontFamily: options.fontFamily,
        opacity: options.opacity || 1,
      },
    });

    return textObj;
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // CALLBACK CUANDO EL CANVAS ESTÁ LISTO
  // ═══════════════════════════════════════════════════════════════════════════
  const handleCanvasReady = useCallback(async (fabricCanvas: any) => {
    if (!fabricCanvas) return;

    const data = dataRef.current;
    console.log("Reconstructing cover:", data);

    try {
      const fabric = await getFabric();
      const canvasWidth = fabricCanvas.width || 400;
      const canvasHeight = fabricCanvas.height || 600;

      // 1. COLOR DE FONDO
      fabricCanvas.set({ backgroundColor: data.coverColor });

      // 2. IMAGEN DE FONDO CON OVERLAY DE COLOR
      if (data.initialImage) {
        await loadImageWithColorOverlay(
          fabric,
          fabricCanvas,
          data.initialImage,
          data.coverColor,
          canvasWidth,
          canvasHeight
        );
      }

      // 3. POSICIONES Y FUENTES
      const positions = getLayoutPositions(data.coverLayout);
      const fontFamily = getFontFamily(data.coverFont);

      console.log("Layout:", data.coverLayout, "Positions:", positions);
      console.log("Font class:", data.coverFont, "Font family:", fontFamily);

      // 4. TÍTULO
      if (data.title) {
        let titleFontSize = 32;
        if (data.title.length > 25) titleFontSize = 28;
        if (data.title.length > 40) titleFontSize = 24;

        createSelectableText(fabric, fabricCanvas, data.title, {
          id: `title-${Date.now()}`,
          top: canvasHeight * positions.titleY,
          fontSize: titleFontSize,
          fontFamily: fontFamily,
          fontWeight: "bold",
        });
      }

      // 5. SUBTÍTULO
      if (data.subtitle) {
        createSelectableText(fabric, fabricCanvas, data.subtitle, {
          id: `subtitle-${Date.now()}`,
          top: canvasHeight * positions.subtitleY,
          fontSize: 16,
          fontFamily: fontFamily,
          fontStyle: "italic",
          opacity: 0.9,
        });
      }

      // 6. AUTOR
      if (data.author) {
        createSelectableText(fabric, fabricCanvas, data.author, {
          id: `author-${Date.now()}`,
          top: canvasHeight * positions.authorY,
          fontSize: 18,
          fontFamily: fontFamily, // Usar la misma fuente que el título
        });
      }

      fabricCanvas.renderAll();
      console.log("Cover reconstruction complete");
    } catch (error) {
      console.error("Error:", error);
    }
  }, []);

  const handleOpen = useCallback(() => {
    setCanvasKey((prev) => prev + 1);
    setIsOpen(true);
  }, []);

  const handleSave = useCallback(() => {
    if (!canvas) return;
    try {
      const imageData = canvas.toDataURL({
        format: "png",
        quality: 1,
        multiplier: 2,
      });
      onSave?.(imageData);
      clear();
      setIsOpen(false);
    } catch (error) {
      console.error("Error saving:", error);
    }
  }, [canvas, onSave, clear]);

  const handleClose = useCallback(() => {
    clear();
    setIsOpen(false);
    onClose?.();
  }, [clear, onClose]);

  return (
    <>
      <Button onClick={handleOpen} variant="outline" size="sm">
        <Wand2 className="w-4 h-4 mr-2" />
        Edición Avanzada
      </Button>

      <FullscreenModal
        isOpen={isOpen}
        onClose={handleClose}
        title="Editor Avanzado de Portada"
        description="Selecciona cualquier elemento para editarlo"
        onSave={handleSave}
        saveButtonText="Guardar Cambios"
      >
        <div className="flex-1 overflow-hidden flex bg-slate-950">
          <div className="w-16 bg-slate-800 border-r border-slate-700 flex flex-col items-center py-4 gap-2">
            <Toolbar vertical />
          </div>

          <div className="flex-1 flex items-center justify-center p-4">
            <Canvas key={canvasKey} onCanvasReady={handleCanvasReady} />
          </div>

          <div className="w-72 overflow-y-auto bg-slate-800 border-l border-slate-700 p-4">
            <PropertyPanel />
          </div>
        </div>
      </FullscreenModal>
    </>
  );
}
