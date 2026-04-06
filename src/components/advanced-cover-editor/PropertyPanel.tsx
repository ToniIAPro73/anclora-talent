"use client";

/**
 * PropertyPanel - VERSION 3
 *
 * Features:
 * - Soporte para overlay de color en imágenes
 * - Controles de texto mejorados
 * - Mejor UX
 */

import { useState, useEffect } from "react";
import { ChromePicker } from "react-color";
import { useCanvasStore } from "@/lib/canvas-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Trash2, Copy, Bold, Italic, AlignCenter } from "lucide-react";

const fontFamilies = [
  // Serif Clásicos
  { value: "Libre Baskerville, Georgia, serif", label: "Libre Baskerville" },
  { value: "Playfair Display, Georgia, serif", label: "Playfair Display" },
  { value: "Lora, Georgia, serif", label: "Lora" },
  { value: "Merriweather, Georgia, serif", label: "Merriweather" },
  { value: "Crimson Text, Georgia, serif", label: "Crimson Text" },
  { value: "Cormorant Garamond, Georgia, serif", label: "Cormorant Garamond" },
  { value: "Georgia, serif", label: "Georgia" },
  // Sans-Serif Modernos
  { value: "Inter, system-ui, sans-serif", label: "Inter" },
  { value: "Poppins, system-ui, sans-serif", label: "Poppins" },
  { value: "Raleway, system-ui, sans-serif", label: "Raleway" },
  { value: "Roboto, system-ui, sans-serif", label: "Roboto" },
  { value: "Montserrat, system-ui, sans-serif", label: "Montserrat" },
  { value: "Oswald, system-ui, sans-serif", label: "Oswald" },
  { value: "Bebas Neue, system-ui, sans-serif", label: "Bebas Neue" },
  // Especiales
  { value: "JetBrains Mono, monospace", label: "JetBrains Mono" },
  { value: "Caveat, cursive", label: "Caveat" },
  { value: "Pacifico, cursive", label: "Pacifico" },
];

export default function PropertyPanel() {
  const { selectedElement, canvas } = useCanvasStore();
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showFillColorPicker, setShowFillColorPicker] = useState(false);
  const [localProps, setLocalProps] = useState<any>({});

  // Sincronizar propiedades locales
  useEffect(() => {
    if (selectedElement?.object) {
      const obj = selectedElement.object;
      setLocalProps({
        text: obj.text || "",
        fill: obj.fill || "#ffffff",
        fontSize: obj.fontSize || 24,
        fontFamily: obj.fontFamily || "Georgia, serif",
        opacity: Math.round((obj.opacity || 1) * 100),
        fontWeight: obj.fontWeight || "normal",
        fontStyle: obj.fontStyle || "normal",
        // Para rectángulos (overlay)
        isOverlay: obj.type === "rect",
        overlayColor: obj.fill || "#000000",
      });
    }
  }, [selectedElement]);

  // Sin elemento seleccionado
  if (!selectedElement || !canvas) {
    return (
      <Card className="w-full bg-slate-800 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white text-lg">Propiedades</CardTitle>
          <CardDescription className="text-slate-400">
            Haz clic en un elemento para editarlo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-slate-500 text-sm">
            💡 Arrastra los elementos para moverlos. Las guías te ayudarán a
            alinearlos.
          </p>
        </CardContent>
      </Card>
    );
  }

  const fabricObject = selectedElement.object;
  const objType = fabricObject?.type;

  const isTextElement =
    objType === "textbox" || objType === "i-text" || objType === "text";
  const isImageElement = objType === "image";
  const isOverlayElement = objType === "rect";

  // ═══════════════════════════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════

  const handleTextChange = (newText: string) => {
    if (fabricObject) {
      fabricObject.set({ text: newText });
      canvas.renderAll();
      setLocalProps({ ...localProps, text: newText });
    }
  };

  const handleColorChange = (color: any) => {
    if (fabricObject) {
      fabricObject.set({ fill: color.hex });
      canvas.renderAll();
      setLocalProps({ ...localProps, fill: color.hex });
    }
  };

  const handleOverlayColorChange = (color: any) => {
    if (fabricObject && isOverlayElement) {
      fabricObject.set({ fill: color.hex });
      canvas.renderAll();
      setLocalProps({ ...localProps, overlayColor: color.hex });
    }
  };

  const handleFontSizeChange = (value: number[]) => {
    if (fabricObject && isTextElement) {
      fabricObject.set({ fontSize: value[0] });
      canvas.renderAll();
      setLocalProps({ ...localProps, fontSize: value[0] });
    }
  };

  const handleFontFamilyChange = (family: string) => {
    if (fabricObject && isTextElement) {
      fabricObject.set({ fontFamily: family });
      canvas.renderAll();
      setLocalProps({ ...localProps, fontFamily: family });
    }
  };

  const handleOpacityChange = (value: number[]) => {
    if (fabricObject) {
      fabricObject.set({ opacity: value[0] / 100 });
      canvas.renderAll();
      setLocalProps({ ...localProps, opacity: value[0] });
    }
  };

  const handleBoldToggle = () => {
    if (fabricObject && isTextElement) {
      const newWeight = localProps.fontWeight === "bold" ? "normal" : "bold";
      fabricObject.set({ fontWeight: newWeight });
      canvas.renderAll();
      setLocalProps({ ...localProps, fontWeight: newWeight });
    }
  };

  const handleItalicToggle = () => {
    if (fabricObject && isTextElement) {
      const newStyle = localProps.fontStyle === "italic" ? "normal" : "italic";
      fabricObject.set({ fontStyle: newStyle });
      canvas.renderAll();
      setLocalProps({ ...localProps, fontStyle: newStyle });
    }
  };

  const handleCenterText = () => {
    if (fabricObject) {
      const canvasCenter = canvas.width / 2;
      fabricObject.set({
        left: canvasCenter,
        originX: "center",
      });
      canvas.renderAll();
    }
  };

  const handleDelete = () => {
    if (fabricObject) {
      canvas.remove(fabricObject);
      canvas.discardActiveObject();
      canvas.renderAll();
      useCanvasStore.getState().selectElement(null);
    }
  };

  const handleDuplicate = () => {
    if (!fabricObject) return;

    try {
      fabricObject.clone((cloned: any) => {
        cloned.set({
          left: (fabricObject.left || 0) + 20,
          top: (fabricObject.top || 0) + 20,
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

  // Determinar título según tipo
  const getElementTitle = () => {
    if (isTextElement) return "📝 Texto";
    if (isImageElement) return "🖼️ Imagen";
    if (isOverlayElement) return "🎨 Capa de Color";
    return "📦 Elemento";
  };

  return (
    <Card className="w-full bg-slate-800 border-slate-700">
      <CardHeader className="pb-3">
        <CardTitle className="text-white text-lg">Propiedades</CardTitle>
        <CardDescription className="text-slate-400">
          {getElementTitle()}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* TEXTO */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {isTextElement && (
          <>
            <div className="space-y-2">
              <Label className="text-white text-sm">Contenido</Label>
              <Textarea
                value={localProps.text || ""}
                onChange={(e) => handleTextChange(e.target.value)}
                placeholder="Escribe aquí..."
                className="bg-slate-700 text-white border-slate-600 min-h-20 resize-none"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-white text-sm">Fuente</Label>
              <Select
                value={localProps.fontFamily || "Georgia, serif"}
                onValueChange={handleFontFamilyChange}
              >
                <SelectTrigger className="bg-slate-700 text-white border-slate-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-700 text-white border-slate-600">
                  {fontFamilies.map((font) => (
                    <SelectItem
                      key={font.value}
                      value={font.value}
                      style={{ fontFamily: font.value }}
                    >
                      {font.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-white text-sm">
                Tamaño: {localProps.fontSize || 24}px
              </Label>
              <Slider
                value={[localProps.fontSize || 24]}
                onValueChange={handleFontSizeChange}
                min={10}
                max={72}
                step={1}
                className="py-2"
              />
            </div>

            {/* Botones de estilo */}
            <div className="flex gap-2">
              <Button
                onClick={handleBoldToggle}
                variant="outline"
                size="sm"
                className={`flex-1 ${
                  localProps.fontWeight === "bold"
                    ? "bg-lime-500 text-black border-lime-500"
                    : "bg-slate-700 text-white border-slate-600"
                }`}
              >
                <Bold className="w-4 h-4" />
              </Button>
              <Button
                onClick={handleItalicToggle}
                variant="outline"
                size="sm"
                className={`flex-1 ${
                  localProps.fontStyle === "italic"
                    ? "bg-lime-500 text-black border-lime-500"
                    : "bg-slate-700 text-white border-slate-600"
                }`}
              >
                <Italic className="w-4 h-4" />
              </Button>
              <Button
                onClick={handleCenterText}
                variant="outline"
                size="sm"
                className="flex-1 bg-slate-700 text-white border-slate-600 hover:bg-slate-600"
              >
                <AlignCenter className="w-4 h-4" />
              </Button>
            </div>

            {/* Color del texto */}
            <div className="space-y-2">
              <Label className="text-white text-sm">Color del texto</Label>
              <div
                onClick={() => setShowColorPicker(!showColorPicker)}
                className="w-full h-10 rounded-md cursor-pointer border-2 border-slate-600 hover:border-slate-500 transition-colors"
                style={{ backgroundColor: localProps.fill || "#ffffff" }}
              />
              {showColorPicker && (
                <div className="relative z-50">
                  <div
                    className="fixed inset-0"
                    onClick={() => setShowColorPicker(false)}
                  />
                  <div className="absolute">
                    <ChromePicker
                      color={localProps.fill || "#ffffff"}
                      onChange={handleColorChange}
                      disableAlpha
                    />
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* OVERLAY DE COLOR */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {isOverlayElement && (
          <div className="space-y-2">
            <Label className="text-white text-sm">Color de la capa</Label>
            <div
              onClick={() => setShowFillColorPicker(!showFillColorPicker)}
              className="w-full h-10 rounded-md cursor-pointer border-2 border-slate-600 hover:border-slate-500 transition-colors"
              style={{ backgroundColor: localProps.overlayColor || "#000000" }}
            />
            {showFillColorPicker && (
              <div className="relative z-50">
                <div
                  className="fixed inset-0"
                  onClick={() => setShowFillColorPicker(false)}
                />
                <div className="absolute">
                  <ChromePicker
                    color={localProps.overlayColor || "#000000"}
                    onChange={handleOverlayColorChange}
                    disableAlpha
                  />
                </div>
              </div>
            )}
            <p className="text-slate-500 text-xs">
              Esta capa aplica un tinte de color sobre la imagen
            </p>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* OPACIDAD (para todos) */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <div className="space-y-2">
          <Label className="text-white text-sm">
            Opacidad: {localProps.opacity || 100}%
          </Label>
          <Slider
            value={[localProps.opacity || 100]}
            onValueChange={handleOpacityChange}
            min={0}
            max={100}
            step={1}
            className="py-2"
          />
        </div>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* ACCIONES */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <div className="flex gap-2 pt-4 border-t border-slate-700">
          <Button
            onClick={handleDuplicate}
            variant="outline"
            size="sm"
            className="flex-1 bg-slate-700 text-white border-slate-600 hover:bg-slate-600"
          >
            <Copy className="w-4 h-4 mr-1" />
            Duplicar
          </Button>
          <Button
            onClick={handleDelete}
            variant="outline"
            size="sm"
            className="flex-1 bg-red-900/50 text-red-300 border-red-800 hover:bg-red-900"
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Eliminar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
