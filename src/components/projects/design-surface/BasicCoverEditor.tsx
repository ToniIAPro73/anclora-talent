'use client';

/**
 * Cover Studio v2 — Basic editor (mission §24-26). Template-driven, no
 * manual layer dragging: field-shaped controls (visible/content/font/size/
 * weight/italic/color/alignment) for the role-tagged title/subtitle/author
 * layers, plus background and a single optional image layer, plus a
 * palette picker.
 *
 * Edits the exact same `DesignSurface`/`DesignLayer[]` the Advanced editor
 * uses (mission §61-62 hard rule: Advanced ⊇ Basic, switching modes never
 * loses data) — this component never keeps its own copy of the design, it
 * is fully controlled via `surface`/`onChange`.
 */

import { useRef } from 'react';
import { AlignCenter, AlignJustify, AlignLeft, AlignRight, Bold, Eye, EyeOff, Italic, Trash2 } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { AppMessages } from '@/lib/i18n/messages';
import {
  createDesignLayer,
  isEmptyDesignSurface,
  type DesignLayer,
  type DesignSurface,
  type ImageLayerProps,
  type TextLayerProps,
  type TextLayerRole,
} from '@/lib/projects/design-surface';
import { COVER_TEMPLATES, BACK_COVER_TEMPLATES, type EditorialTemplate } from '@/lib/projects/cover-templates';
import { buildDesignSurfaceFromTemplate, applyPaletteToSurface, PALETTE_PRESETS, type SurfacePalette } from '@/lib/projects/design-surface-templates';
import { FontSelector } from '../cover-studio/FontSelector';
import { ColorPickerField } from './ColorPickerField';
import { ImageLayerProperties } from './ImageLayerProperties';
import { BackgroundEditor } from './BackgroundEditor';
import { DesignSurfaceRenderer } from './DesignSurfaceRenderer';

type TextLayer = DesignLayer & TextLayerProps;
type ImageLayer = DesignLayer & ImageLayerProps;

export interface BasicCoverEditorProps {
  surface: DesignSurface;
  onChange: (surface: DesignSurface) => void;
  copy: AppMessages['coverDesignSurface'];
  palette: SurfacePalette;
  onPaletteChange: (palette: SurfacePalette) => void;
  brandColors?: string[];
}

type BasicFieldRole = Extract<TextLayerRole, 'title' | 'subtitle' | 'author'>;

const FIELD_ROLES: BasicFieldRole[] = ['title', 'subtitle', 'author'];

const PALETTE_SWATCH: Record<SurfacePalette, string> = {
  obsidian: '#0b133f',
  teal: '#124a50',
  sand: '#f2e3b3',
};

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function defaultGeometryForRole(surface: DesignSurface, role: BasicFieldRole) {
  const isCover = surface.surface === 'cover';
  const order = isCover ? ['title', 'subtitle', 'author'] : ['title', 'subtitle', 'author'];
  const index = order.indexOf(role);
  const y = surface.height * (0.3 + index * 0.18);
  return { x: surface.width * 0.1, y, width: surface.width * 0.8, height: 60 };
}

function FieldEditor({
  role,
  layer,
  copy,
  brandColors,
  onChange,
  onCreate,
  onRemove,
}: {
  role: BasicFieldRole;
  layer: TextLayer | undefined;
  copy: AppMessages['coverDesignSurface'];
  brandColors?: string[];
  onChange: (patch: Partial<TextLayerProps> & Partial<Pick<DesignLayer, 'visible'>>) => void;
  onCreate: () => void;
  onRemove: () => void;
}) {
  const t = copy.text;
  const roleLabel = copy.fields[role];
  const isBold = layer ? layer.fontWeight === 'bold' || (typeof layer.fontWeight === 'number' && layer.fontWeight >= 700) : false;
  const isItalic = layer?.fontStyle === 'italic';

  return (
    <div className="space-y-3 rounded-lg border border-[var(--border-subtle)] p-3" data-testid={`basic-field-${role}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">{roleLabel}</span>
        <button
          type="button"
          data-testid={`basic-field-${role}-visibility-toggle`}
          onClick={() => (layer ? onChange({ visible: !layer.visible }) : onCreate())}
          className="ac-button ac-button--ghost ac-button--icon ac-button--sm"
        >
          {layer && layer.visible !== false ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
        </button>
      </div>

      {!layer && (
        <button type="button" data-testid={`basic-field-${role}-add-button`} onClick={onCreate} className="ac-button ac-button--secondary w-full text-xs">
          {copy.fields.addFieldButtonLabel}
        </button>
      )}

      {layer && (
        <div className="space-y-3">
          <Textarea
            aria-label={t.contentLabel}
            data-testid={`basic-field-${role}-content-input`}
            value={layer.content}
            onChange={(event) => onChange({ content: event.target.value })}
            className="min-h-16 border-[var(--border-subtle)] bg-[var(--surface-soft)] text-sm"
          />

          <FontSelector selectedFont={layer.fontFamily} onFontSelect={(fontFamily) => onChange({ fontFamily })} />

          <div className="flex items-center gap-2">
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">{t.fontSizeLabel}</Label>
                <span className="font-mono text-[10px] text-[var(--text-tertiary)]">{layer.fontSize}px</span>
              </div>
              <Slider
                value={[layer.fontSize]}
                min={10}
                max={96}
                step={1}
                onValueChange={(val) => onChange({ fontSize: val[0] })}
                data-testid={`basic-field-${role}-size-slider`}
              />
            </div>
            <button
              type="button"
              data-testid={`basic-field-${role}-bold-button`}
              onClick={() => onChange({ fontWeight: isBold ? 500 : 800 })}
              data-active={isBold ? 'true' : 'false'}
              className="ac-button ac-button--ghost ac-button--icon ac-button--sm"
            >
              <Bold className="h-4 w-4" />
            </button>
            <button
              type="button"
              data-testid={`basic-field-${role}-italic-button`}
              onClick={() => onChange({ fontStyle: isItalic ? 'normal' : 'italic' })}
              data-active={isItalic ? 'true' : 'false'}
              className="ac-button ac-button--ghost ac-button--icon ac-button--sm"
            >
              <Italic className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div className="ac-editor-inspector__segmented" role="group" aria-label={t.alignLeftLabel}>
              {(
                [
                  { value: 'left', Icon: AlignLeft, label: t.alignLeftLabel },
                  { value: 'center', Icon: AlignCenter, label: t.alignCenterLabel },
                  { value: 'right', Icon: AlignRight, label: t.alignRightLabel },
                  { value: 'justify', Icon: AlignJustify, label: t.alignJustifyLabel },
                ] as const
              ).map(({ value, Icon, label }) => (
                <button
                  key={value}
                  type="button"
                  title={label}
                  aria-label={label}
                  aria-pressed={layer.textAlign === value}
                  data-testid={`basic-field-${role}-align-${value}-button`}
                  onClick={() => onChange({ textAlign: value })}
                  data-active={layer.textAlign === value ? 'true' : 'false'}
                  className="ac-button ac-button--ghost ac-button--icon ac-button--sm"
                >
                  <Icon className="h-4 w-4" />
                </button>
              ))}
            </div>
            <button
              type="button"
              data-testid={`basic-field-${role}-remove-button`}
              onClick={onRemove}
              className="ac-button ac-button--ghost ac-button--icon ac-button--sm"
              title={copy.layers.deleteLabel}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>

          <ColorPickerField
            label={t.colorLabel}
            value={layer.color}
            onChange={(color) => onChange({ color })}
            copy={copy.colorPicker}
            brandColors={brandColors}
            testId={`basic-field-${role}-color`}
          />
        </div>
      )}
    </div>
  );
}

export function BasicCoverEditor({ surface, onChange, copy, palette, onPaletteChange, brandColors }: BasicCoverEditorProps) {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const templates: EditorialTemplate[] = surface.surface === 'cover' ? COVER_TEMPLATES : BACK_COVER_TEMPLATES;
  const imageLayer = surface.layers.find((layer): layer is ImageLayer => layer.type === 'image');

  const fieldLayer = (role: BasicFieldRole) =>
    surface.layers.find((layer): layer is TextLayer => layer.type === 'text' && layer.role === role);

  const patchField = (role: BasicFieldRole, patch: Partial<TextLayerProps> & Partial<Pick<DesignLayer, 'visible'>>) => {
    const layer = fieldLayer(role);
    if (!layer) return;
    const isContentEdit = typeof patch.content === 'string';
    onChange({
      ...surface,
      layers: surface.layers.map((l) =>
        l.id === layer.id
          ? ({ ...l, ...patch, ...(isContentEdit ? { source: 'manual' } : {}) } as DesignLayer)
          : l,
      ),
    });
  };

  const createField = (role: BasicFieldRole) => {
    const geometry = defaultGeometryForRole(surface, role);
    const newLayer = createDesignLayer(
      { type: 'text', role, source: 'manual', textAlign: 'center', ...geometry },
      surface.layers.length + 1,
    );
    onChange({ ...surface, layers: [...surface.layers, newLayer] });
  };

  const removeField = (role: BasicFieldRole) => {
    const layer = fieldLayer(role);
    if (!layer) return;
    onChange({ ...surface, layers: surface.layers.filter((l) => l.id !== layer.id) });
  };

  const applyTemplate = (template: EditorialTemplate) => {
    if (!isEmptyDesignSurface(surface) && !window.confirm(copy.origin.resetToTemplateConfirm)) return;
    const existingContentByRole = new Map<string, string>();
    for (const layer of surface.layers) {
      if (layer.type === 'text' && layer.role && layer.content) {
        existingContentByRole.set(layer.role, layer.content);
      }
    }

    const next = buildDesignSurfaceFromTemplate(template, { palette });
    const preservedLayers = next.layers.map((layer) => {
      if (layer.type === 'text' && layer.role && existingContentByRole.has(layer.role)) {
        return {
          ...layer,
          content: existingContentByRole.get(layer.role)!,
          source: 'manual' as const,
        };
      }
      return layer;
    });

    onChange({
      ...next,
      layers: preservedLayers,
      guides: surface.guides,
      safeArea: surface.safeArea,
      isbnArea: surface.isbnArea,
      originAssetId: null,
      originMode: 'blank',
    });
  };

  const handlePaletteSelect = (next: SurfacePalette) => {
    onPaletteChange(next);
    onChange(applyPaletteToSurface(surface, next));
  };

  const handleCustomPalette = (hex: string) => {
    onChange(applyPaletteToSurface(surface, { custom: hex }));
  };

  const handleAddImage = async (file: File) => {
    const src = await readFileAsDataUrl(file);
    const newLayer = createDesignLayer(
      { type: 'image', src, fit: 'cover', x: surface.width * 0.1, y: surface.height * 0.1, width: surface.width * 0.8, height: surface.height * 0.35 },
      1,
    );
    onChange({ ...surface, layers: [newLayer, ...surface.layers.map((l) => ({ ...l, zIndex: l.zIndex + 1 }) as DesignLayer)] });
  };

  const handleReplaceImage = async (file: File) => {
    if (!imageLayer) return;
    const src = await readFileAsDataUrl(file);
    onChange({ ...surface, layers: surface.layers.map((l) => (l.id === imageLayer.id ? { ...l, src } : l)) });
  };

  const patchImage = (patch: Partial<ImageLayerProps> & Partial<Pick<DesignLayer, 'x' | 'y' | 'width' | 'height' | 'rotation' | 'opacity'>>) => {
    if (!imageLayer) return;
    onChange({ ...surface, layers: surface.layers.map((l) => (l.id === imageLayer.id ? ({ ...l, ...patch } as DesignLayer) : l)) });
  };

  return (
    <div className="space-y-6" data-testid="basic-cover-editor">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[380px_minmax(0,1fr)] items-start">
        {/* Live Preview Column */}
        <div className="lg:sticky lg:top-8 order-2 lg:order-1 space-y-3">
          <div className="ac-surface-panel p-4 shadow-[var(--shadow-strong)] rounded-2xl border border-[var(--border-subtle)]">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-tertiary)]">
                Vista previa en tiempo real
              </span>
              <span className="text-xs text-[var(--accent-text)] font-semibold">
                {surface.surface === 'cover' ? 'Portada' : 'Contraportada'}
              </span>
            </div>
            <div className="overflow-hidden rounded-xl border border-[var(--border-subtle)] shadow-md bg-[var(--surface-canvas)]">
              <DesignSurfaceRenderer surface={surface} />
            </div>
          </div>
        </div>

        {/* Controls Column */}
        <div className="order-1 lg:order-2 space-y-6">
          <div className="space-y-2">
            <Label className="text-xs font-semibold">{copy.templatesLabel}</Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" data-testid="basic-template-grid">
              {templates.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  data-testid={`basic-template-${template.id}`}
                  onClick={() => applyTemplate(template)}
                  className="ac-button ac-button--secondary flex flex-col items-start gap-1 p-2 text-left text-xs"
                  title={template.description}
                >
                  <span className="font-semibold">{template.name}</span>
                </button>
              ))}
            </div>
          </div>

      <div className="space-y-3">
        {FIELD_ROLES.map((role) => (
          <FieldEditor
            key={role}
            role={role}
            layer={fieldLayer(role)}
            copy={copy}
            brandColors={brandColors}
            onChange={(patch) => patchField(role, patch)}
            onCreate={() => createField(role)}
            onRemove={() => removeField(role)}
          />
        ))}
      </div>

      <BackgroundEditor
        background={surface.background}
        copy={copy.background}
        colorPickerCopy={copy.colorPicker}
        brandColors={brandColors}
        onChange={(background) => onChange({ ...surface, background })}
        onUploadFile={async (file) => {
          const src = await readFileAsDataUrl(file);
          onChange({ ...surface, background: { kind: 'image', src, fit: 'cover', opacity: 1 } });
        }}
      />

      <div className="space-y-2">
        <Label className="text-xs font-semibold">{copy.image.uploadLabel}</Label>
        {imageLayer ? (
          <div className="space-y-2">
            <ImageLayerProperties layer={imageLayer} copy={copy.image} onChange={patchImage} onReplaceFile={handleReplaceImage} />
            <button
              type="button"
              data-testid="basic-image-remove-button"
              onClick={() => onChange({ ...surface, layers: surface.layers.filter((l) => l.id !== imageLayer.id) })}
              className="ac-button ac-button--ghost ac-button--sm w-full"
            >
              {copy.layers.deleteLabel}
            </button>
          </div>
        ) : (
          <>
            <button
              type="button"
              data-testid="basic-image-add-button"
              onClick={() => imageInputRef.current?.click()}
              className="ac-button ac-button--secondary w-full"
            >
              {copy.image.uploadLabel}
            </button>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              data-testid="basic-image-file-input"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleAddImage(file);
                event.target.value = '';
              }}
            />
          </>
        )}
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-semibold">{copy.colorPicker.paletteLabel}</Label>
        <div className="flex flex-wrap items-center gap-2">
          {PALETTE_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              data-testid={`basic-palette-${preset}-button`}
              onClick={() => handlePaletteSelect(preset)}
              data-active={palette === preset ? 'true' : 'false'}
              className="h-8 w-8 rounded-full border border-[var(--border-subtle)]"
              style={{ backgroundColor: PALETTE_SWATCH[preset] }}
              title={preset}
            />
          ))}
          {brandColors?.map((color) => (
            <button
              key={color}
              type="button"
              data-testid={`basic-palette-brand-${color}`}
              onClick={() => handleCustomPalette(color)}
              className="h-8 w-8 rounded-full border border-[var(--border-subtle)]"
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
          <ColorPickerField
            label={copy.colorPicker.customLabel}
            value={surface.background.kind === 'solid' ? surface.background.color : '#0b133f'}
            onChange={handleCustomPalette}
            copy={copy.colorPicker}
            testId="basic-palette-custom"
          />
        </div>
      </div>
        </div>
      </div>
    </div>
  );
}
