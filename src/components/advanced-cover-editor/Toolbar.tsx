"use client";

/**
 * Toolbar - VERSION CON SOPORTE VERTICAL
 *
 * Puede mostrarse horizontal (original) o vertical (sidebar)
 */

import { useRef } from "react";
import { useCanvasStore } from "@/lib/canvas-store";
import {
  addTextToCanvas,
  addImageToCanvas,
  exportCanvasToImage,
  getFabric,
} from "@/lib/canvas-utils";
import { Button } from "@/components/ui/button";
import {
  Type,
  Image as ImageIcon,
  RotateCcw,
  RotateCw,
  Download,
  Copy,
  Trash2,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ToolbarProps {
  vertical?: boolean;
}

export default function Toolbar({ vertical = false }: ToolbarProps) {
  const { canvas, addElement, undo, redo } = useCanvasStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAddText = async () => {
    if (!canvas) return;
    const fabricText = await addTextToCanvas(canvas, "Nuevo Texto");
    canvas.setActiveObject(fabricText);
    canvas.renderAll();
    addElement({
      id: `text-${Date.now()}`,
      type: "text",
      object: fabricText,
      properties: {
        fill: "#000000",
        fontSize: 24,
        fontFamily: "Arial",
        opacity: 1,
      },
    });
  };

  const handleAddImage = () => {
    fileInputRef.current?.click();
  };

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file || !canvas) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const imageUrl = e.target?.result as string;
      try {
        const fabricImage = await addImageToCanvas(canvas, imageUrl);
        canvas.setActiveObject(fabricImage);
        canvas.renderAll();
        addElement({
          id: `image-${Date.now()}`,
          type: "image",
          object: fabricImage,
          properties: {
            opacity: 1,
          },
        });
      } catch (error) {
        console.error("Error adding image:", error);
      }
    };
    reader.readAsDataURL(file);

    // Limpiar input para permitir subir la misma imagen de nuevo
    event.target.value = "";
  };

  const handleExport = () => {
    if (!canvas) return;
    const dataUrl = exportCanvasToImage(canvas, "png");
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = "portada.png";
    link.click();
  };

  const handleDuplicate = async () => {
    if (!canvas) return;
    const activeObject = canvas.getActiveObject();
    if (!activeObject) return;

    try {
      activeObject.clone((cloned: any) => {
        cloned.set({
          left: (cloned.left || 0) + 20,
          top: (cloned.top || 0) + 20,
          id: `clone-${Date.now()}`,
        });
        canvas.add(cloned);
        canvas.setActiveObject(cloned);
        canvas.renderAll();
      });
    } catch (error) {
      console.error("Error duplicating:", error);
    }
  };

  const handleClear = () => {
    if (!canvas) return;
    if (confirm("¿Estás seguro de que deseas limpiar el canvas?")) {
      canvas.clear();
      canvas.set({ backgroundColor: "#ffffff" });
      canvas.renderAll();
    }
  };

  const buttonClass = vertical
    ? "w-10 h-10 p-0 bg-slate-700 text-white border-slate-600 hover:bg-slate-600"
    : "bg-slate-700 text-white border-slate-600 hover:bg-slate-600 hover:text-white";

  const containerClass = vertical
    ? "flex flex-col gap-2"
    : "flex flex-wrap gap-2 bg-slate-800";

  // Botones con tooltip para modo vertical
  const ToolButton = ({
    icon: Icon,
    label,
    onClick,
  }: {
    icon: any;
    label: string;
    onClick: () => void;
  }) => {
    if (vertical) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={onClick}
              variant="outline"
              size="sm"
              className={buttonClass}
            >
              <Icon className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>{label}</p>
          </TooltipContent>
        </Tooltip>
      );
    }

    return (
      <Button
        onClick={onClick}
        variant="outline"
        size="sm"
        className={buttonClass}
        title={label}
      >
        <Icon className="w-4 h-4 mr-2" />
        {label}
      </Button>
    );
  };

  return (
    <div className={containerClass}>
      <ToolButton icon={Type} label="Texto" onClick={handleAddText} />
      <ToolButton icon={ImageIcon} label="Imagen" onClick={handleAddImage} />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageUpload}
        className="hidden"
      />

      {vertical && <div className="border-t border-slate-600 my-2" />}
      {!vertical && <div className="border-l border-slate-600" />}

      <ToolButton icon={RotateCcw} label="Deshacer" onClick={undo} />
      <ToolButton icon={RotateCw} label="Rehacer" onClick={redo} />

      {vertical && <div className="border-t border-slate-600 my-2" />}
      {!vertical && <div className="border-l border-slate-600" />}

      <ToolButton icon={Copy} label="Duplicar" onClick={handleDuplicate} />
      <ToolButton icon={Trash2} label="Limpiar" onClick={handleClear} />

      {vertical && <div className="border-t border-slate-600 my-2" />}
      {!vertical && <div className="border-l border-slate-600" />}

      <ToolButton icon={Download} label="Exportar" onClick={handleExport} />
    </div>
  );
}
