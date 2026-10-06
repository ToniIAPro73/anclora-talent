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
  AlignJustify,
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
import { Textarea } from '@/components/ui/textarea';
import type { AppMessages } from '@/lib/i18n/messages';
import type { DesignLayer, TextLayerProps } from '@/lib/projects/design-surface';
import { FontSelector } from '../cover-studio/FontSelector';
import { ColorPickerField } from './ColorPickerField';
import { CompactNumberField, CompactSlider, PropertySection, SegmentedGroup } from './PropertyControls';

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

  const ws = copy.workspace;
  const alignButton = (align: TextLayerProps['textAlign'], Icon: typeof AlignLeft, label: string) => (
    <button
      key={align}
      type="button"
      onClick={() => onChange({ textAlign: align })}
      data-testid={`text-layer-align-${align}-button`}
      className="cover-prop-icon"
      data-active={layer.textAlign === align ? 'true' : 'false'}
      title={label}
      aria-label={label}
      aria-pressed={layer.textAlign === align}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
  const verticalButton = (value: TextLayerProps['verticalAlign'], Icon: typeof AlignLeft, label: string) => (
    <button
      key={value}
      type="button"
      onClick={() => onChange({ verticalAlign: value })}
      data-testid={`text-layer-vertical-${value}-button`}
      className="cover-prop-icon"
      data-active={layer.verticalAlign === value ? 'true' : 'false'}
      title={label}
      aria-label={label}
      aria-pressed={layer.verticalAlign === value}
    >
      <Icon className="h-4 w-4" />
    </button>
  );

  return (
    <div className="cover-prop-stack" data-testid="text-layer-properties">
      <PropertySection title={t.contentLabel}>
        {canSyncFromMetadata && (
          <button
            type="button"
            data-testid="text-layer-sync-from-metadata-button"
            onClick={handleSyncFromMetadata}
            className="cover-prop-link"
            title={copy.origin.syncFromMetadataLabel}
          >
            <RefreshCw className="h-3 w-3" />
            {copy.origin.syncFromMetadataLabel}
          </button>
        )}
        <Textarea
          aria-label={t.contentLabel}
          data-testid="text-layer-content-input"
          value={layer.content}
          rows={2}
          onChange={(event) => onChange({ content: event.target.value })}
          className="cover-prop-textarea"
        />
      </PropertySection>

      <PropertySection title={t.fontFamilyLabel}>
        <div className="cover-prop-row cover-prop-row--font">
          <FontSelector selectedFont={layer.fontFamily} onFontSelect={(fontFamily) => onChange({ fontFamily })} compact />
          <CompactNumberField
            label="Aa"
            value={layer.fontSize}
            min={8}
            max={160}
            suffix="px"
            onChange={(fontSize) => onChange({ fontSize: Math.min(160, Math.max(8, fontSize)) })}
            testId="text-layer-font-size-input"
          />
        </div>

        <div className="cover-prop-row">
          <SegmentedGroup label={t.boldLabel}>
            <button type="button" onClick={() => onChange({ fontWeight: isBold ? 400 : 700 })} data-testid="text-layer-bold-button" className="cover-prop-icon" data-active={isBold ? 'true' : 'false'} title={t.boldLabel} aria-label={t.boldLabel} aria-pressed={isBold}>
              <Bold className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => onChange({ fontStyle: isItalic ? 'normal' : 'italic' })} data-testid="text-layer-italic-button" className="cover-prop-icon" data-active={isItalic ? 'true' : 'false'} title={t.italicLabel} aria-label={t.italicLabel} aria-pressed={isItalic}>
              <Italic className="h-4 w-4" />
            </button>
            <button type="button" onClick={() => onChange({ textDecoration: isUnderline ? 'none' : 'underline' })} data-testid="text-layer-underline-button" className="cover-prop-icon" data-active={isUnderline ? 'true' : 'false'} title={t.underlineLabel} aria-label={t.underlineLabel} aria-pressed={isUnderline}>
              <Underline className="h-4 w-4" />
            </button>
          </SegmentedGroup>
          <SegmentedGroup label={t.alignLeftLabel}>
            {alignButton('left', AlignLeft, t.alignLeftLabel)}
            {alignButton('center', AlignCenter, t.alignCenterLabel)}
            {alignButton('right', AlignRight, t.alignRightLabel)}
            {alignButton('justify', AlignJustify, t.alignJustifyLabel)}
          </SegmentedGroup>
        </div>

        <div className="cover-prop-row">
          <SegmentedGroup label={t.verticalAlignLabel}>
            {verticalButton('top', AlignStartVertical, t.verticalAlignTopLabel)}
            {verticalButton('middle', AlignVerticalSpaceAround, t.verticalAlignMiddleLabel)}
            {verticalButton('bottom', AlignEndVertical, t.verticalAlignBottomLabel)}
          </SegmentedGroup>
        </div>

        <SegmentedGroup label={t.textTransformLabel}>
          {(['none', 'uppercase', 'lowercase'] as const).map((transform) => (
            <button
              key={transform}
              type="button"
              onClick={() => onChange({ textTransform: transform })}
              data-testid={`text-layer-transform-${transform}-button`}
              className="cover-prop-text-button"
              data-active={layer.textTransform === transform ? 'true' : 'false'}
              aria-pressed={layer.textTransform === transform}
            >
              {transform === 'none' ? t.textTransformNone : transform === 'uppercase' ? t.textTransformUppercase : t.textTransformLowercase}
            </button>
          ))}
        </SegmentedGroup>
      </PropertySection>

      <PropertySection title={ws.sectionSpacing} defaultOpen={false}>
        <CompactSlider label={t.lineHeightLabel} value={layer.lineHeight} min={0.8} max={3} step={0.05} onChange={(lineHeight) => onChange({ lineHeight })} display={(value) => value.toFixed(2)} testId="text-layer-line-height-slider" />
        <CompactSlider label={t.letterSpacingLabel} value={layer.letterSpacing} min={-100} max={1000} step={10} onChange={(letterSpacing) => onChange({ letterSpacing })} testId="text-layer-letter-spacing-slider" />
      </PropertySection>

      <PropertySection title={ws.sectionAppearance} defaultOpen={false}>
        <ColorPickerField label={t.colorLabel} value={layer.color} onChange={(color) => onChange({ color })} copy={copy.colorPicker} brandColors={brandColors} testId="text-layer-color" />
        <CompactSlider label={t.opacityLabel} value={Math.round(layer.opacity * 100)} min={0} max={100} step={1} onChange={(value) => onChange({ opacity: value / 100 })} display={(value) => `${value}%`} testId="text-layer-opacity-slider" />
      </PropertySection>

      <PropertySection title={ws.sectionPosition}>
        <div className="cover-prop-grid">
          <CompactNumberField label={t.xLabel} value={layer.x} onChange={(x) => onChange({ x })} testId="text-layer-x-input" />
          <CompactNumberField label={t.yLabel} value={layer.y} onChange={(y) => onChange({ y })} testId="text-layer-y-input" />
          <CompactNumberField label={t.widthLabel} value={layer.width} onChange={(width) => onChange({ width })} testId="text-layer-width-input" />
          <CompactNumberField label={t.heightLabel} value={layer.height} onChange={(height) => onChange({ height })} testId="text-layer-height-input" />
          <CompactNumberField label={t.rotationLabel} value={layer.rotation} onChange={(rotation) => onChange({ rotation })} testId="text-layer-rotation-input" suffix="°" />
        </div>
      </PropertySection>
    </div>
  );
}
