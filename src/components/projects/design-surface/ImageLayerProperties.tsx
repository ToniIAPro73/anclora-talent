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
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import type { AppMessages } from '@/lib/i18n/messages';
import type { DesignLayer, ImageLayerFilters, ImageLayerProps } from '@/lib/projects/design-surface';

type ImgLayer = DesignLayer & ImageLayerProps;
type Copy = AppMessages['coverDesignSurface']['image'];

export interface ImageLayerPropertiesProps {
  layer: ImgLayer;
  copy: Copy;
  onChange: (patch: Partial<ImageLayerProps> & Partial<Pick<DesignLayer, 'opacity'>>) => void;
  onReplaceFile: (file: File) => void;
}

function setFilter(filters: ImageLayerFilters | undefined, patch: Partial<ImageLayerFilters>): ImageLayerFilters {
  return { ...filters, ...patch };
}

export function ImageLayerProperties({ layer, copy, onChange, onReplaceFile }: ImageLayerPropertiesProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const filters = layer.filters ?? {};

  return (
    <div className="space-y-5" data-testid="image-layer-properties">
      <div className="space-y-2">
        <button
          type="button"
          data-testid="image-layer-replace-button"
          onClick={() => fileInputRef.current?.click()}
          className="ac-button ac-button--secondary w-full"
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
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-semibold">{copy.fitLabel}</Label>
        <div className="ac-editor-inspector__segmented" role="group" aria-label={copy.fitLabel}>
          {(['cover', 'contain', 'fill'] as const).map((fit) => (
            <button
              key={fit}
              type="button"
              data-testid={`image-layer-fit-${fit}-button`}
              onClick={() => onChange({ fit })}
              className="ac-button ac-button--ghost ac-button--sm"
              data-active={layer.fit === fit ? 'true' : 'false'}
            >
              {fit === 'cover' ? copy.fitCover : fit === 'contain' ? copy.fitContain : copy.fitFill}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold">{copy.opacityLabel}</Label>
          <span className="font-mono text-[10px] text-[var(--text-tertiary)]">{Math.round(layer.opacity * 100)}%</span>
        </div>
        <Slider value={[Math.round(layer.opacity * 100)]} min={0} max={100} step={1} onValueChange={(val) => onChange({ opacity: val[0] / 100 })} />
      </div>

      <div className="space-y-2">
        <label className="flex items-center gap-2 text-sm text-[var(--text-primary)]">
          <input
            type="checkbox"
            data-testid="image-layer-grayscale-checkbox"
            checked={Boolean(filters.grayscale)}
            onChange={(event) => onChange({ filters: setFilter(filters, { grayscale: event.target.checked }) })}
          />
          {copy.grayscaleLabel}
        </label>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold">{copy.brightnessLabel}</Label>
          <span className="font-mono text-[10px] text-[var(--text-tertiary)]">{Math.round((filters.brightness ?? 0) * 100)}</span>
        </div>
        <Slider
          value={[Math.round((filters.brightness ?? 0) * 100)]}
          min={-100}
          max={100}
          step={1}
          onValueChange={(val) => onChange({ filters: setFilter(filters, { brightness: val[0] / 100 }) })}
          data-testid="image-layer-brightness-slider"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold">{copy.contrastLabel}</Label>
          <span className="font-mono text-[10px] text-[var(--text-tertiary)]">{Math.round((filters.contrast ?? 0) * 100)}</span>
        </div>
        <Slider
          value={[Math.round((filters.contrast ?? 0) * 100)]}
          min={-100}
          max={100}
          step={1}
          onValueChange={(val) => onChange({ filters: setFilter(filters, { contrast: val[0] / 100 }) })}
          data-testid="image-layer-contrast-slider"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold">{copy.saturationLabel}</Label>
          <span className="font-mono text-[10px] text-[var(--text-tertiary)]">{Math.round((filters.saturation ?? 0) * 100)}</span>
        </div>
        <Slider
          value={[Math.round((filters.saturation ?? 0) * 100)]}
          min={-100}
          max={100}
          step={1}
          onValueChange={(val) => onChange({ filters: setFilter(filters, { saturation: val[0] / 100 }) })}
          data-testid="image-layer-saturation-slider"
        />
      </div>

      <button
        type="button"
        data-testid="image-layer-reset-filters-button"
        onClick={() => onChange({ filters: {} })}
        className="ac-button ac-button--ghost ac-button--sm w-full"
      >
        {copy.resetFiltersLabel}
      </button>
    </div>
  );
}
