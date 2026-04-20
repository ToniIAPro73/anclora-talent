'use client';

import { useState } from 'react';
import { ChromePicker } from 'react-color';
import { useCanvasStore } from '@/lib/canvas-store';
import { FontSelector } from './FontSelector';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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

type EditableFabricObject = {
  type: string;
  rawText?: string;
  text?: string;
  fill?: string;
  fontSize?: number;
  fontFamily?: string;
  opacity?: number;
  fontWeight?: string | number;
  fontStyle?: string;
  textAlign?: string;
  lineHeight?: number;
  charSpacing?: number;
  left?: number;
  top?: number;
  isBackgroundProxy?: boolean;
  set: (props: Record<string, unknown>) => void;
  clone: () => Promise<EditableFabricObject>;
  toObject?: () => Record<string, unknown>;
  bringForward: () => void;
  sendBackwards: () => void;
};

type PropertyPanelValues = {
  text: string;
  fill: string;
  fontSize: number;
  fontFamily: string;
  opacity: number;
  fontWeight: string | number;
  fontStyle: string;
  textAlign: string;
  lineHeight: number;
  charSpacing: number;
};

function getPropertyPanelValues(object: EditableFabricObject): PropertyPanelValues {
  return {
    text: object.rawText || object.text || '',
    fill: typeof object.fill === 'string' ? object.fill : '#ffffff',
    fontSize: object.fontSize || 24,
    fontFamily: object.fontFamily || 'ui-sans-serif, system-ui, sans-serif',
    opacity: Math.round((object.opacity || 1) * 100),
    fontWeight: object.fontWeight || 'normal',
    fontStyle: object.fontStyle || 'normal',
    textAlign: object.textAlign || 'center',
    lineHeight: object.lineHeight || 1.2,
    charSpacing: object.charSpacing || 0,
  };
}

export function CoverPropertyPanel() {
  const { selectedElement, canvas, removeElement, updateElement, addElement } = useCanvasStore();
  const [showColorPicker, setShowColorPicker] = useState(false);

  if (!selectedElement || !canvas) {
    return (
      <div className="ac-editor-inspector__empty">
        <div className="ac-editor-inspector__empty-mark">
          <Type className="h-8 w-8 text-[var(--text-tertiary)]" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-[var(--text-primary)]">Sin selección</p>
          <p className="text-xs text-[var(--text-secondary)]">Haz clic en un elemento para editarlo.</p>
        </div>
      </div>
    );
  }

  const fabricObject = selectedElement.object as EditableFabricObject;
  const localProps = getPropertyPanelValues(fabricObject);
  const isText = fabricObject.type.includes('text');
  const isBackgroundProxy = Boolean(fabricObject.isBackgroundProxy);

  const updateProperties = (props: Partial<PropertyPanelValues>) => {
    updateElement(selectedElement.id, props);
  };

  const handleTextChange = (text: string) => updateProperties({ text });
  const handleColorChange = (color: { hex: string }) => updateProperties({ fill: color.hex });
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
    if (isBackgroundProxy) return;
    fabricObject.bringForward();
    canvas.renderAll();
  };

  const handleSendBackward = () => {
    if (isBackgroundProxy) return;
    fabricObject.sendBackwards();
    canvas.renderAll();
  };

  const handleDuplicate = async () => {
    if (isBackgroundProxy) return;
    try {
      const cloned = await fabricObject.clone();
      const id = `clone-${Date.now()}`;
      cloned.set({
        left: (cloned.left || 0) + 20,
        top: (cloned.top || 0) + 20,
        id: id,
      });
      canvas.add(cloned);
      
      // Add to store
      addElement({
        id,
        type: fabricObject.type.includes('text') ? 'text' : 'image',
        object: cloned,
        properties: { ...(fabricObject.toObject?.() || {}) },
      });

      canvas.setActiveObject(cloned);
      canvas.renderAll();
    } catch (error) {
      console.error('[PropertyPanel] Error duplicating:', error);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
      <div className="ac-editor-inspector__section">
        <h3 className="ac-editor-inspector__title">
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
                <FontSelector
                  selectedFont={localProps.fontFamily}
                  onFontSelect={handleFontFamilyChange}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold">Alineación y Estilo</Label>
                <div className="ac-editor-inspector__segmented">
                  <button
                    type="button"
                    onClick={() => handleAlignChange('left')}
                    className="ac-button ac-button--ghost ac-button--icon ac-button--sm"
                    data-active={localProps.textAlign === 'left' ? 'true' : 'false'}
                    title="Alinear izquierda"
                  >
                    <AlignLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAlignChange('center')}
                    className="ac-button ac-button--ghost ac-button--icon ac-button--sm"
                    data-active={localProps.textAlign === 'center' ? 'true' : 'false'}
                    title="Centrar"
                  >
                    <AlignCenter className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAlignChange('right')}
                    className="ac-button ac-button--ghost ac-button--icon ac-button--sm"
                    data-active={localProps.textAlign === 'right' ? 'true' : 'false'}
                    title="Alinear derecha"
                  >
                    <AlignRight className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleBoldToggle}
                    className="ac-button ac-button--ghost ac-button--icon ac-button--sm"
                    data-active={localProps.fontWeight === 'bold' ? 'true' : 'false'}
                    title="Negrita"
                  >
                    <Bold className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleItalicToggle}
                    className="ac-button ac-button--ghost ac-button--icon ac-button--sm"
                    data-active={localProps.fontStyle === 'italic' ? 'true' : 'false'}
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

          {!isBackgroundProxy && (
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
          )}
        </div>
      </div>

      <div className="ac-editor-inspector__actions">
        {!isBackgroundProxy && (
        <Button
          variant="outline"
          className="w-full justify-start gap-2 bg-[var(--surface-soft)] border-[var(--border-subtle)] hover:bg-[var(--surface-highlight)]"
          onClick={handleDuplicate}
        >
          <Copy className="h-4 w-4" />
          <span>Duplicar elemento</span>
        </Button>
        )}
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
