'use client';

/**
 * Cover Studio v2 — image layer controls (mission §8-10): replace, fit,
 * opacity, and non-destructive filters (grayscale/brightness/contrast/
 * saturation — the "quality over Photoshop" set the mission asks for).
 * The original uploaded image is never modified: filters are Fabric object
 * properties applied at render time (see design-surface-fabric.ts), so
 * turning grayscale back off restores the original colors exactly.
 */

import { useRef } from 'react';
import { FlipHorizontal2, FlipVertical2 } from 'lucide-react';
import type { AppMessages } from '@/lib/i18n/messages';
import type { DesignLayer, ImageLayerFilters, ImageLayerProps } from '@/lib/projects/design-surface';
import { CompactNumberField, CompactSlider, PropertySection, SegmentedGroup } from './PropertyControls';

type ImgLayer = DesignLayer & ImageLayerProps;
type Copy = AppMessages['coverDesignSurface']['image'];

export interface ImageLayerPropertiesProps {
  layer: ImgLayer;
  copy: Copy;
  workspace: AppMessages['coverDesignSurface']['workspace'];
  onChange: (patch: Partial<ImageLayerProps> & Partial<Pick<DesignLayer, 'x' | 'y' | 'width' | 'height' | 'rotation' | 'opacity' | 'flipX' | 'flipY'>>) => void;
  onReplaceFile: (file: File) => void;
  onReorder?: (direction: 'up' | 'down' | 'front' | 'back') => void;
  onUseAsBackground?: () => void;
}

function setFilter(filters: ImageLayerFilters | undefined, patch: Partial<ImageLayerFilters>): ImageLayerFilters {
  return { ...filters, ...patch };
}

export function ImageLayerProperties({ layer, copy, workspace: ws, onChange, onReplaceFile, onReorder, onUseAsBackground }: ImageLayerPropertiesProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const filters = layer.filters ?? {};
  const filterSlider = (label: string, key: 'brightness' | 'contrast' | 'saturation') => (
    <CompactSlider
      label={label}
      value={Math.round((filters[key] ?? 0) * 100)}
      min={-100}
      max={100}
      step={1}
      onChange={(value) => onChange({ filters: setFilter(filters, { [key]: value / 100 }) })}
      testId={`image-layer-${key}-slider`}
    />
  );

  return (
    <div className="cover-prop-stack" data-testid="image-layer-properties">
      <PropertySection title={ws.images}>
        <button
          type="button"
          data-testid="image-layer-replace-button"
          onClick={() => fileInputRef.current?.click()}
          className="ac-button ac-button--secondary cover-prop-button"
        >
          {copy.replaceLabel}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          data-testid="image-layer-file-input"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) onReplaceFile(file);
            event.target.value = '';
          }}
        />
        <SegmentedGroup label={copy.fitLabel}>
          {(['cover', 'contain', 'fill'] as const).map((fit) => (
            <button
              key={fit}
              type="button"
              data-testid={`image-layer-fit-${fit}-button`}
              onClick={() => onChange({ fit })}
              className="cover-prop-text-button"
              data-active={layer.fit === fit ? 'true' : 'false'}
              aria-pressed={layer.fit === fit}
            >
              {fit === 'cover' ? copy.fitCover : fit === 'contain' ? copy.fitContain : copy.fitFill}
            </button>
          ))}
        </SegmentedGroup>
      </PropertySection>

      {(onReorder || onUseAsBackground) && (
        <PropertySection title={ws.sectionLayering}>
          {onReorder && (
            <div className="cover-prop-grid" role="group" aria-label={ws.sectionLayering} data-testid="image-layer-layering">
              {([
                ['front', 'Traer al frente'],
                ['up', 'Subir'],
                ['down', 'Bajar'],
                ['back', 'Enviar al fondo'],
              ] as const).map(([direction, label]) => (
                <button key={direction} type="button" data-testid={`image-layer-order-${direction}`} onClick={() => onReorder(direction)} className="ac-button ac-button--secondary cover-prop-button" title={label} aria-label={label}>
                  {label}
                </button>
              ))}
            </div>
          )}
          {onUseAsBackground && (
            <button type="button" data-testid="image-layer-use-as-background" onClick={onUseAsBackground} className="ac-button ac-button--secondary cover-prop-button">
              {copy.useAsBackgroundLabel}
            </button>
          )}
        </PropertySection>
      )}

      <PropertySection title={ws.sectionPosition}>
        <div className="cover-prop-grid" data-testid="image-layer-transform-fields">
          <CompactNumberField label={copy.xLabel} value={layer.x} onChange={(x) => onChange({ x })} testId="image-layer-x-input" />
          <CompactNumberField label={copy.yLabel} value={layer.y} onChange={(y) => onChange({ y })} testId="image-layer-y-input" />
          <CompactNumberField label={copy.widthLabel} value={layer.width} onChange={(width) => onChange({ width })} testId="image-layer-width-input" />
          <CompactNumberField label={copy.heightLabel} value={layer.height} onChange={(height) => onChange({ height })} testId="image-layer-height-input" />
          <CompactNumberField label={copy.rotationLabel} value={layer.rotation} onChange={(rotation) => onChange({ rotation })} testId="image-layer-rotation-input" suffix="°" />
        </div>
        <SegmentedGroup label={ws.flipHorizontalLabel}>
          <button type="button" className="cover-prop-icon" data-testid="image-layer-flip-x-button" data-active={layer.flipX ? 'true' : 'false'} aria-pressed={Boolean(layer.flipX)} onClick={() => onChange({ flipX: !layer.flipX })} title={ws.flipHorizontalLabel} aria-label={ws.flipHorizontalLabel}>
            <FlipHorizontal2 className="h-4 w-4" />
          </button>
          <button type="button" className="cover-prop-icon" data-testid="image-layer-flip-y-button" data-active={layer.flipY ? 'true' : 'false'} aria-pressed={Boolean(layer.flipY)} onClick={() => onChange({ flipY: !layer.flipY })} title={ws.flipVerticalLabel} aria-label={ws.flipVerticalLabel}>
            <FlipVertical2 className="h-4 w-4" />
          </button>
        </SegmentedGroup>

      </PropertySection>

      <PropertySection title={ws.sectionAppearance}>
        <CompactSlider label={copy.opacityLabel} value={Math.round(layer.opacity * 100)} min={0} max={100} step={1} onChange={(value) => onChange({ opacity: value / 100 })} display={(value) => `${value}%`} />
        {filterSlider(copy.brightnessLabel, 'brightness')}
        {filterSlider(copy.contrastLabel, 'contrast')}
        {filterSlider(copy.saturationLabel, 'saturation')}
        <label className="cover-prop-check">
          <input
            type="checkbox"
            data-testid="image-layer-grayscale-checkbox"
            checked={Boolean(filters.grayscale)}
            onChange={(event) => onChange({ filters: setFilter(filters, { grayscale: event.target.checked }) })}
          />
          {copy.grayscaleLabel}
        </label>
        <button type="button" data-testid="image-layer-reset-filters-button" onClick={() => onChange({ filters: {} })} className="cover-prop-link">
          {copy.resetFiltersLabel}
        </button>
      </PropertySection>
    </div>
  );
}
