'use client';

/**
 * Cover Studio v2 — full typography controls for a selected text layer
 * (mission §6-7). Generalizes `SurfaceInspector.tsx`'s pattern (same UI
 * primitives, same FontSelector) to the new `DesignLayer` model: adds
 * underline, vertical align, letter-case transform, and explicit
 * width/height/x/y/rotation fields the old fixed-field model never had.
 */

import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  AlignEndVertical,
  AlignStartVertical,
  AlignVerticalSpaceAround,
  Bold,
  Italic,
  RefreshCw,
  Underline,
} from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import type { AppMessages } from '@/lib/i18n/messages';
import type { DesignLayer, TextLayerProps } from '@/lib/projects/design-surface';
import { FontSelector } from '../cover-studio/FontSelector';
import { ColorPickerField } from './ColorPickerField';

type TextLayer = DesignLayer & TextLayerProps;
type Copy = AppMessages['coverDesignSurface'];

export interface TextLayerPropertiesProps {
  layer: TextLayer;
  copy: Copy;
  brandColors?: string[];
  onChange: (patch: Partial<TextLayerProps> & Partial<Pick<DesignLayer, 'x' | 'y' | 'width' | 'height' | 'rotation' | 'opacity'>>) => void;
  /**
   * The value the metadata precedence chain (`resolveCoverText`, mission
   * §40-41) would currently produce for this layer's role — the caller
   * (which holds the `ProjectRecord`) computes it. Shown only for a
   * role !== 'free' layer as an explicit "Actualizar desde metadatos"
   * action, gated by confirmation: it must never silently overwrite a
   * manual edit.
   */
  metadataValue?: string;
  onSyncFromMetadata?: () => void;
}

function segmentButtonClass(active: boolean) {
  return `ac-button ac-button--ghost ac-button--icon ac-button--sm${active ? '' : ''}`;
}

export function TextLayerProperties({ layer, copy, brandColors, onChange, metadataValue, onSyncFromMetadata }: TextLayerPropertiesProps) {
  const t = copy.text;
  const isBold = layer.fontWeight === 'bold' || (typeof layer.fontWeight === 'number' && layer.fontWeight >= 700);
  const isItalic = layer.fontStyle === 'italic';
  const isUnderline = layer.textDecoration === 'underline';
  const canSyncFromMetadata =
    layer.role !== 'free' && onSyncFromMetadata && typeof metadataValue === 'string' && metadataValue.trim() !== layer.content.trim();

  const handleSyncFromMetadata = () => {
    if (!onSyncFromMetadata) return;
    if (!window.confirm(copy.origin.syncFromMetadataConfirm)) return;
    onSyncFromMetadata();
  };

  return (
    <div className="space-y-5" data-testid="text-layer-properties">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold">{t.contentLabel}</Label>
          {canSyncFromMetadata && (
            <button
              type="button"
              data-testid="text-layer-sync-from-metadata-button"
              onClick={handleSyncFromMetadata}
              className="ac-button ac-button--ghost ac-button--sm inline-flex items-center gap-1"
              title={copy.origin.syncFromMetadataLabel}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              {copy.origin.syncFromMetadataLabel}
            </button>
          )}
        </div>
        <Textarea
          aria-label={t.contentLabel}
          data-testid="text-layer-content-input"
          value={layer.content}
          onChange={(event) => onChange({ content: event.target.value })}
          className="min-h-20 border-[var(--border-subtle)] bg-[var(--surface-soft)] text-sm focus:border-[var(--accent)]"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-semibold">{t.fontFamilyLabel}</Label>
        <FontSelector selectedFont={layer.fontFamily} onFontSelect={(fontFamily) => onChange({ fontFamily })} />
      </div>

      <div className="ac-editor-inspector__segmented" role="group" aria-label={t.fontFamilyLabel}>
        <button
          type="button"
          onClick={() => onChange({ textAlign: 'left' })}
          data-testid="text-layer-align-left-button"
          className={segmentButtonClass(layer.textAlign === 'left')}
          data-active={layer.textAlign === 'left' ? 'true' : 'false'}
          title={t.alignLeftLabel}
          aria-label={t.alignLeftLabel}
        >
          <AlignLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => onChange({ textAlign: 'center' })}
          data-testid="text-layer-align-center-button"
          className={segmentButtonClass(layer.textAlign === 'center')}
          data-active={layer.textAlign === 'center' ? 'true' : 'false'}
          title={t.alignCenterLabel}
          aria-label={t.alignCenterLabel}
        >
          <AlignCenter className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => onChange({ textAlign: 'right' })}
          data-testid="text-layer-align-right-button"
          className={segmentButtonClass(layer.textAlign === 'right')}
          data-active={layer.textAlign === 'right' ? 'true' : 'false'}
          title={t.alignRightLabel}
          aria-label={t.alignRightLabel}
        >
          <AlignRight className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => onChange({ fontWeight: isBold ? 400 : 700 })}
          data-testid="text-layer-bold-button"
          className={segmentButtonClass(isBold)}
          data-active={isBold ? 'true' : 'false'}
          title={t.boldLabel}
          aria-label={t.boldLabel}
        >
          <Bold className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => onChange({ fontStyle: isItalic ? 'normal' : 'italic' })}
          data-testid="text-layer-italic-button"
          className={segmentButtonClass(isItalic)}
          data-active={isItalic ? 'true' : 'false'}
          title={t.italicLabel}
          aria-label={t.italicLabel}
        >
          <Italic className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => onChange({ textDecoration: isUnderline ? 'none' : 'underline' })}
          data-testid="text-layer-underline-button"
          className={segmentButtonClass(isUnderline)}
          data-active={isUnderline ? 'true' : 'false'}
          title={t.underlineLabel}
          aria-label={t.underlineLabel}
        >
          <Underline className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-semibold">{t.verticalAlignTopLabel}</Label>
        <div className="ac-editor-inspector__segmented" role="group" aria-label={t.verticalAlignTopLabel}>
          <button
            type="button"
            onClick={() => onChange({ verticalAlign: 'top' })}
            data-testid="text-layer-vertical-top-button"
            className={segmentButtonClass(layer.verticalAlign === 'top')}
            data-active={layer.verticalAlign === 'top' ? 'true' : 'false'}
            title={t.verticalAlignTopLabel}
            aria-label={t.verticalAlignTopLabel}
          >
            <AlignStartVertical className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onChange({ verticalAlign: 'middle' })}
            data-testid="text-layer-vertical-middle-button"
            className={segmentButtonClass(layer.verticalAlign === 'middle')}
            data-active={layer.verticalAlign === 'middle' ? 'true' : 'false'}
            title={t.verticalAlignMiddleLabel}
            aria-label={t.verticalAlignMiddleLabel}
          >
            <AlignVerticalSpaceAround className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onChange({ verticalAlign: 'bottom' })}
            data-testid="text-layer-vertical-bottom-button"
            className={segmentButtonClass(layer.verticalAlign === 'bottom')}
            data-active={layer.verticalAlign === 'bottom' ? 'true' : 'false'}
            title={t.verticalAlignBottomLabel}
            aria-label={t.verticalAlignBottomLabel}
          >
            <AlignEndVertical className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-semibold">{t.textTransformLabel}</Label>
        <div className="ac-editor-inspector__segmented" role="group" aria-label={t.textTransformLabel}>
          {(['none', 'uppercase', 'lowercase'] as const).map((transform) => (
            <button
              key={transform}
              type="button"
              onClick={() => onChange({ textTransform: transform })}
              data-testid={`text-layer-transform-${transform}-button`}
              className={`ac-button ac-button--ghost ac-button--sm`}
              data-active={layer.textTransform === transform ? 'true' : 'false'}
            >
              {transform === 'none' ? t.textTransformNone : transform === 'uppercase' ? t.textTransformUppercase : t.textTransformLowercase}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold">{t.fontSizeLabel}</Label>
            <span className="font-mono text-[10px] text-[var(--text-tertiary)]">{layer.fontSize}px</span>
          </div>
          <Slider value={[layer.fontSize]} min={8} max={160} step={1} onValueChange={(val) => onChange({ fontSize: val[0] })} />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold">{t.lineHeightLabel}</Label>
            <span className="font-mono text-[10px] text-[var(--text-tertiary)]">{layer.lineHeight.toFixed(2)}</span>
          </div>
          <Slider value={[layer.lineHeight]} min={0.8} max={3} step={0.05} onValueChange={(val) => onChange({ lineHeight: val[0] })} />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold">{t.letterSpacingLabel}</Label>
          <span className="font-mono text-[10px] text-[var(--text-tertiary)]">{layer.letterSpacing}</span>
        </div>
        <Slider value={[layer.letterSpacing]} min={-100} max={1000} step={10} onValueChange={(val) => onChange({ letterSpacing: val[0] })} />
      </div>

      <ColorPickerField
        label={t.colorLabel}
        value={layer.color}
        onChange={(color) => onChange({ color })}
        copy={copy.colorPicker}
        brandColors={brandColors}
        testId="text-layer-color"
      />

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold">{t.opacityLabel}</Label>
          <span className="font-mono text-[10px] text-[var(--text-tertiary)]">{Math.round(layer.opacity * 100)}%</span>
        </div>
        <Slider value={[Math.round(layer.opacity * 100)]} min={0} max={100} step={1} onValueChange={(val) => onChange({ opacity: val[0] / 100 })} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <NumericField label={t.xLabel} value={layer.x} onChange={(x) => onChange({ x })} testId="text-layer-x-input" />
        <NumericField label={t.yLabel} value={layer.y} onChange={(y) => onChange({ y })} testId="text-layer-y-input" />
        <NumericField label={t.widthLabel} value={layer.width} onChange={(width) => onChange({ width })} testId="text-layer-width-input" />
        <NumericField label={t.heightLabel} value={layer.height} onChange={(height) => onChange({ height })} testId="text-layer-height-input" />
        <NumericField label={t.rotationLabel} value={layer.rotation} onChange={(rotation) => onChange({ rotation })} testId="text-layer-rotation-input" />
      </div>
    </div>
  );
}

function NumericField({
  label,
  value,
  onChange,
  testId,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  testId: string;
}) {
  return (
    <label className="space-y-1.5">
      <span className="text-xs font-semibold text-[var(--text-primary)]">{label}</span>
      <Input
        type="number"
        data-testid={testId}
        value={Math.round(value)}
        onChange={(event) => {
          const parsed = Number(event.target.value);
          if (Number.isFinite(parsed)) onChange(parsed);
        }}
        className="h-9 border-[var(--border-subtle)] bg-[var(--surface-soft)] text-sm"
      />
    </label>
  );
}
