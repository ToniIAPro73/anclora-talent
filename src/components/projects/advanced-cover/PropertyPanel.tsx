'use client';

import { useState, useEffect } from 'react';
import { ChromePicker } from 'react-color';
import { useCanvasStore } from '@/lib/canvas-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { 
  Trash2, 
  Copy, 
  Bold, 
  Italic, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  Type, 
  ArrowUp, 
  ArrowDown,
  Layers
} from 'lucide-react';

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
  const { selectedElement, canvas, removeElement, updateElement } = useCanvasStore();
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
        textAlign: obj.textAlign || 'center',
        lineHeight: obj.lineHeight || 1.2,
        charSpacing: obj.charSpacing || 0,
      });
    }
  }, [selectedElement]);

  if (!selectedElement || !canvas) {
    return (
      <div className="flex h-full flex-col items-center justify-center space-y-4 p-8 text-center">
        <div className="rounded-full bg-[var(--surface-soft)] p-4 border border-[var(--border-subtle)]">
          <Type className="h-8 w-8 text-[var(--text-tertiary)]" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-[var(--text-primary)]">Sin selección</p>
          <p className="text-xs text-[var(--text-secondary)]">Haz clic en un elemento para editarlo.</p>
        </div>
      </div>
    );
  }

  const fabricObject = selectedElement.object;
  const isText = fabricObject.type.includes('text');

  const updateProperties = (props: any) => {
    updateElement(selectedElement.id, props);
    setLocalProps((prev: any) => ({ ...prev, ...props }));
  };

  const handleTextChange = (text: string) => updateProperties({ text });
  const handleColorChange = (color: any) => updateProperties({ fill: color.hex });
  const handleFontSizeChange = (val: number[]) => updateProperties({ fontSize: val[0] });
  const handleFontFamilyChange = (fontFamily: string) => updateProperties({ fontFamily });
  const handleOpacityChange = (val: number[]) => updateProperties({ opacity: val[0] / 100 });
  const handleAlignChange = (textAlign: string) => updateProperties({ textAlign });
  const handleLineHeightChange = (val: number[]) => updateProperties({ lineHeight: val[0] });
  const handleCharSpacingChange = (val: number[]) => updateProperties({ charSpacing: val[0] });
  
  const handleBoldToggle = () => {
    const next = localProps.fontWeight === 'bold' ? 'normal' : 'bold';
    updateProperties({ fontWeight: next });
  };

  const handleItalicToggle = () => {
    const next = localProps.fontStyle === 'italic' ? 'normal' : 'italic';
    updateProperties({ fontStyle: next });
  };

  const handleBringForward = () => {
    fabricObject.bringForward();
    canvas.renderAll();
  };

  const handleSendBackward = () => {
    fabricObject.sendBackwards();
    canvas.renderAll();
  };

  const handleDuplicate = async () => {
    try {
      const cloned = await fabricObject.clone();
      cloned.set({
        left: (cloned.left || 0) + 20,
        top: (cloned.top || 0) + 20,
        id: `clone-${Date.now()}`,
      });
      canvas.add(cloned);
      canvas.setActiveObject(cloned);
      canvas.renderAll();
    } catch (error) {
      console.error('[PropertyPanel] Error duplicating:', error);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <div>
        <h3 className="text-sm font-bold uppercase tracking-widest text-[var(--accent)] mb-4 flex items-center gap-2">
          {isText ? <Type className="h-4 w-4" /> : <Layers className="h-4 w-4" />}
          Propiedades
        </h3>
        
        <div className="space-y-5">
          {isText && (
            <>
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Contenido</Label>
                <Textarea
                  value={localProps.text}
                  onChange={(e) => handleTextChange(e.target.value)}
                  className="min-h-20 bg-[var(--surface-soft)] border-[var(--border-subtle)] focus:border-[var(--accent-mint)] text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold">Tipografía</Label>
                <Select value={localProps.fontFamily} onValueChange={handleFontFamilyChange}>
                  <SelectTrigger className="bg-[var(--surface-soft)] border-[var(--border-subtle)] h-10 text-sm">
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

              <div className="space-y-2">
                <Label className="text-xs font-semibold">Alineación y Estilo</Label>
                <div className="flex gap-1 bg-[var(--surface-soft)] p-1 rounded-lg border border-[var(--border-subtle)]">
                  <button
                    onClick={() => handleAlignChange('left')}
                    className={`flex-1 flex justify-center py-2 rounded-md transition ${localProps.textAlign === 'left' ? 'bg-[var(--accent-mint)] text-black' : 'hover:bg-white/5'}`}
                    title="Alinear izquierda"
                  >
                    <AlignLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleAlignChange('center')}
                    className={`flex-1 flex justify-center py-2 rounded-md transition ${localProps.textAlign === 'center' ? 'bg-[var(--accent-mint)] text-black' : 'hover:bg-white/5'}`}
                    title="Centrar"
                  >
                    <AlignCenter className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleAlignChange('right')}
                    className={`flex-1 flex justify-center py-2 rounded-md transition ${localProps.textAlign === 'right' ? 'bg-[var(--accent-mint)] text-black' : 'hover:bg-white/5'}`}
                    title="Alinear derecha"
                  >
                    <AlignRight className="h-4 w-4" />
                  </button>
                  <div className="w-px bg-white/10 mx-1" />
                  <button
                    onClick={handleBoldToggle}
                    className={`flex-1 flex justify-center py-2 rounded-md transition ${localProps.fontWeight === 'bold' ? 'bg-[var(--accent-mint)] text-black' : 'hover:bg-white/5'}`}
                    title="Negrita"
                  >
                    <Bold className="h-4 w-4" />
                  </button>
                  <button
                    onClick={handleItalicToggle}
                    className={`flex-1 flex justify-center py-2 rounded-md transition ${localProps.fontStyle === 'italic' ? 'bg-[var(--accent-mint)] text-black' : 'hover:bg-white/5'}`}
                    title="Cursiva"
                  >
                    <Italic className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label className="text-xs font-semibold">Tamaño</Label>
                    <span className="text-[10px] font-mono text-[var(--text-tertiary)]">{localProps.fontSize}px</span>
                  </div>
                  <Slider value={[localProps.fontSize]} min={8} max={120} step={1} onValueChange={handleFontSizeChange} />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label className="text-xs font-semibold">Interlineado</Label>
                    <span className="text-[10px] font-mono text-[var(--text-tertiary)]">{localProps.lineHeight}</span>
                  </div>
                  <Slider value={[localProps.lineHeight]} min={0.5} max={3} step={0.1} onValueChange={handleLineHeightChange} />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label className="text-xs font-semibold">Espaciado letras</Label>
                  <span className="text-[10px] font-mono text-[var(--text-tertiary)]">{localProps.charSpacing}</span>
                </div>
                <Slider value={[localProps.charSpacing]} min={-100} max={1000} step={10} onValueChange={handleCharSpacingChange} />
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
            <div className="flex justify-between items-center">
              <Label className="text-xs font-semibold">Opacidad</Label>
              <span className="text-[10px] font-mono text-[var(--text-tertiary)]">{localProps.opacity}%</span>
            </div>
            <Slider value={[localProps.opacity]} min={0} max={100} step={1} onValueChange={handleOpacityChange} />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold">Capas (Orden)</Label>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleBringForward} className="flex-1 gap-2 bg-[var(--surface-soft)]">
                <ArrowUp className="h-3 w-3" /> Subir
              </Button>
              <Button variant="outline" size="sm" onClick={handleSendBackward} className="flex-1 gap-2 bg-[var(--surface-soft)]">
                <ArrowDown className="h-3 w-3" /> Bajar
              </Button>
            </div>
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
          onClick={() => removeElement(selectedElement.id)}
        >
          <Trash2 className="h-4 w-4" />
          <span>Eliminar elemento</span>
        </Button>
      </div>
    </div>
  );
}
