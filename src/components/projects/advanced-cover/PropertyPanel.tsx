'use client';

import { useState, useEffect } from 'react';
import { ChromePicker } from 'react-color';
import { useCanvasStore } from '@/lib/canvas-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Trash2, Copy, Bold, Italic, AlignCenter } from 'lucide-react';

const fontFamilies = [
  { value: 'ui-sans-serif, system-ui, sans-serif', label: 'Sans Serif' },
  { value: 'ui-serif, Georgia, serif', label: 'Serif' },
  { value: 'ui-monospace, monospace', label: 'Monospace' },
  { value: 'Libre Baskerville, Georgia, serif', label: 'Libre Baskerville' },
  { value: 'Playfair Display, Georgia, serif', label: 'Playfair Display' },
  { value: 'Inter, system-ui, sans-serif', label: 'Inter' },
  { value: 'Poppins, system-ui, sans-serif', label: 'Poppins' },
];

export function CoverPropertyPanel() {
  const { selectedElement, canvas, removeElement } = useCanvasStore();
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [localProps, setLocalProps] = useState<any>({});

  useEffect(() => {
    if (selectedElement?.object) {
      const obj = selectedElement.object;
      setLocalProps({
        text: obj.text || '',
        fill: typeof obj.fill === 'string' ? obj.fill : '#ffffff',
        fontSize: obj.fontSize || 24,
        fontFamily: obj.fontFamily || 'ui-sans-serif, system-ui, sans-serif',
        opacity: Math.round((obj.opacity || 1) * 100),
        fontWeight: obj.fontWeight || 'normal',
        fontStyle: obj.fontStyle || 'normal',
      });
    }
  }, [selectedElement]);

  if (!selectedElement || !canvas) {
    return (
      <div className="flex h-full flex-col items-center justify-center space-y-4 p-8 text-center">
        <div className="rounded-full bg-[var(--surface-soft)] p-4 border border-[var(--border-subtle)]">
          <AlignCenter className="h-8 w-8 text-[var(--text-tertiary)]" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-[var(--text-primary)]">Sin selección</p>
          <p className="text-xs text-[var(--text-secondary)]">Haz clic en un elemento del diseño para editar sus propiedades.</p>
        </div>
      </div>
    );
  }

  const fabricObject = selectedElement.object;
  const isText = fabricObject.type.includes('text');

  const updateFabric = (props: any) => {
    fabricObject.set(props);
    canvas.renderAll();
    setLocalProps((prev: any) => ({ ...prev, ...props }));
    // Also push to history if significant change? 
    // Usually better to push on mouse up or debounce
  };

  const handleTextChange = (text: string) => updateFabric({ text });
  const handleColorChange = (color: any) => updateFabric({ fill: color.hex });
  const handleFontSizeChange = (val: number[]) => updateFabric({ fontSize: val[0] });
  const handleFontFamilyChange = (fontFamily: string) => updateFabric({ fontFamily });
  const handleOpacityChange = (val: number[]) => updateFabric({ opacity: val[0] / 100 });
  
  const handleBoldToggle = () => {
    const next = localProps.fontWeight === 'bold' ? 'normal' : 'bold';
    updateFabric({ fontWeight: next });
  };

  const handleItalicToggle = () => {
    const next = localProps.fontStyle === 'italic' ? 'normal' : 'italic';
    updateFabric({ fontStyle: next });
  };

  const handleDuplicate = () => {
    fabricObject.clone((cloned: any) => {
      cloned.set({
        left: (cloned.left || 0) + 20,
        top: (cloned.top || 0) + 20,
        id: `clone-${Date.now()}`,
      });
      canvas.add(cloned);
      canvas.setActiveObject(cloned);
      canvas.renderAll();
    });
  };

  const handleDelete = () => {
    removeElement(selectedElement.id);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <div>
        <h3 className="text-sm font-bold uppercase tracking-widest text-[var(--accent)] mb-4">
          Propiedades {isText ? 'de Texto' : 'de Imagen'}
        </h3>
        
        <div className="space-y-5">
          {isText && (
            <>
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Contenido</Label>
                <Textarea
                  value={localProps.text}
                  onChange={(e) => handleTextChange(e.target.value)}
                  className="min-h-20 bg-[var(--surface-soft)] border-[var(--border-subtle)] focus:border-[var(--accent-mint)]"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold">Tipografía</Label>
                <Select value={localProps.fontFamily} onValueChange={handleFontFamilyChange}>
                  <SelectTrigger className="bg-[var(--surface-soft)] border-[var(--border-subtle)]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {fontFamilies.map((f) => (
                      <SelectItem key={f.value} value={f.value} style={{ fontFamily: f.value }}>
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Tamaño ({localProps.fontSize}px)</Label>
                  <Slider
                    value={[localProps.fontSize]}
                    min={8}
                    max={120}
                    step={1}
                    onValueChange={handleFontSizeChange}
                  />
                </div>
                <div className="flex items-end gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBoldToggle}
                    className={`flex-1 h-10 ${localProps.fontWeight === 'bold' ? 'bg-[var(--accent-mint)] text-black border-[var(--accent-mint)]' : ''}`}
                  >
                    <Bold className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleItalicToggle}
                    className={`flex-1 h-10 ${localProps.fontStyle === 'italic' ? 'bg-[var(--accent-mint)] text-black border-[var(--accent-mint)]' : ''}`}
                  >
                    <Italic className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold">Color</Label>
                <div className="relative">
                  <button
                    onClick={() => setShowColorPicker(!showColorPicker)}
                    className="w-full h-10 rounded-lg border border-[var(--border-subtle)] flex items-center px-3 gap-3 bg-[var(--surface-soft)]"
                  >
                    <div className="w-5 h-5 rounded-md border border-black/10" style={{ backgroundColor: localProps.fill }} />
                    <span className="text-xs font-mono uppercase">{localProps.fill}</span>
                  </button>
                  {showColorPicker && (
                    <div className="absolute z-50 mt-2 left-0 shadow-2xl">
                      <div className="fixed inset-0" onClick={() => setShowColorPicker(false)} />
                      <div className="relative">
                        <ChromePicker color={localProps.fill} onChange={handleColorChange} disableAlpha />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label className="text-xs font-semibold">Opacidad ({localProps.opacity}%)</Label>
            <Slider
              value={[localProps.opacity]}
              min={0}
              max={100}
              step={1}
              onValueChange={handleOpacityChange}
            />
          </div>
        </div>
      </div>

      <div className="pt-6 border-t border-[var(--border-subtle)] flex flex-col gap-3">
        <Button
          variant="outline"
          className="w-full justify-start gap-2 bg-[var(--surface-soft)] border-[var(--border-subtle)] hover:bg-[var(--surface-highlight)]"
          onClick={handleDuplicate}
        >
          <Copy className="h-4 w-4" />
          <span>Duplicar elemento</span>
        </Button>
        <Button
          variant="outline"
          className="w-full justify-start gap-2 text-red-500 bg-red-500/5 border-red-500/20 hover:bg-red-500/10 hover:border-red-500/40"
          onClick={handleDelete}
        >
          <Trash2 className="h-4 w-4" />
          <span>Eliminar elemento</span>
        </Button>
      </div>
    </div>
  );
}
