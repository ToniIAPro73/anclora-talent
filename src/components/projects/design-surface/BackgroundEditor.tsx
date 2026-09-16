'use client';

/**
 * Cover Studio v2 — background editor (mission §11): solid color, gradient,
 * or image, shared by cover and back cover since both use the same
 * `DesignSurface.background` field.
 */

import { useRef } from 'react';
import { Plus, X } from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import type { AppMessages } from '@/lib/i18n/messages';
import type { BackgroundSpec } from '@/lib/projects/design-surface';
import { ColorPickerField } from './ColorPickerField';

type Copy = AppMessages['coverDesignSurface']['background'];
type ColorPickerCopy = AppMessages['coverDesignSurface']['colorPicker'];

export interface BackgroundEditorProps {
  background: BackgroundSpec;
  copy: Copy;
  colorPickerCopy: ColorPickerCopy;
  brandColors?: string[];
  onChange: (background: BackgroundSpec) => void;
  onUploadFile: (file: File) => void;
}

export function BackgroundEditor({ background, copy, colorPickerCopy, brandColors, onChange, onUploadFile }: BackgroundEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-4" data-testid="background-editor">
      <Label className="text-xs font-semibold">{copy.label}</Label>
      <div className="ac-editor-inspector__segmented" role="group" aria-label={copy.label}>
        <button
          type="button"
          data-testid="background-kind-solid-button"
          onClick={() => onChange({ kind: 'solid', color: background.kind === 'solid' ? background.color : '#0b133f' })}
          className="ac-button ac-button--ghost ac-button--sm"
          data-active={background.kind === 'solid' ? 'true' : 'false'}
        >
          {copy.solid}
        </button>
        <button
          type="button"
          data-testid="background-kind-gradient-button"
          onClick={() =>
            onChange(
              background.kind === 'gradient'
                ? background
                : { kind: 'gradient', angle: 160, stops: [{ color: '#0b133f', offset: 0 }, { color: '#07252f', offset: 1 }] },
            )
          }
          className="ac-button ac-button--ghost ac-button--sm"
          data-active={background.kind === 'gradient' ? 'true' : 'false'}
        >
          {copy.gradient}
        </button>
        <button
          type="button"
          data-testid="background-kind-image-button"
          onClick={() =>
            onChange(
              background.kind === 'image'
                ? background
                : { kind: 'image', src: '', fit: 'cover', opacity: 1 },
            )
          }
          className="ac-button ac-button--ghost ac-button--sm"
          data-active={background.kind === 'image' ? 'true' : 'false'}
        >
          {copy.image}
        </button>
      </div>

      {background.kind === 'solid' && (
        <ColorPickerField
          label={copy.solid}
          value={background.color}
          onChange={(color) => onChange({ kind: 'solid', color })}
          copy={colorPickerCopy}
          brandColors={brandColors}
          testId="background-solid-color"
        />
      )}

      {background.kind === 'gradient' && (
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">{copy.gradientAngleLabel}</Label>
              <span className="font-mono text-[10px] text-[var(--text-tertiary)]">{background.angle}°</span>
            </div>
            <Slider
              value={[background.angle]}
              min={0}
              max={360}
              step={1}
              onValueChange={(val) => onChange({ ...background, angle: val[0] })}
              data-testid="background-gradient-angle-slider"
            />
          </div>

          {background.stops.map((stop, index) => (
            <div key={index} className="flex items-center gap-2">
              <div className="flex-1">
                <ColorPickerField
                  label={`${copy.solid} ${index + 1}`}
                  value={stop.color}
                  onChange={(color) => {
                    const stops = [...background.stops];
                    stops[index] = { ...stops[index], color };
                    onChange({ ...background, stops });
                  }}
                  copy={colorPickerCopy}
                  brandColors={brandColors}
                  testId={`background-gradient-stop-${index}`}
                />
              </div>
              {background.stops.length > 2 && (
                <button
                  type="button"
                  data-testid={`background-gradient-remove-stop-${index}`}
                  title={copy.removeColorStopButton}
                  onClick={() => onChange({ ...background, stops: background.stops.filter((_, i) => i !== index) })}
                  className="ac-button ac-button--ghost ac-button--icon ac-button--sm"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}

          <button
            type="button"
            data-testid="background-gradient-add-stop-button"
            onClick={() => onChange({ ...background, stops: [...background.stops, { color: '#ffffff', offset: 1 }] })}
            className="ac-button ac-button--ghost ac-button--sm inline-flex items-center gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            {copy.addColorStopButton}
          </button>
        </div>
      )}

      {background.kind === 'image' && (
        <div className="space-y-4">
          <button
            type="button"
            data-testid="background-image-upload-button"
            onClick={() => fileInputRef.current?.click()}
            className="ac-button ac-button--secondary w-full"
          >
            {copy.image}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            data-testid="background-image-file-input"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) onUploadFile(file);
              event.target.value = '';
            }}
          />

          <div className="space-y-2">
            <Label className="text-xs font-semibold">{copy.fitLabel}</Label>
            <div className="ac-editor-inspector__segmented" role="group" aria-label={copy.fitLabel}>
              {(['cover', 'contain'] as const).map((fit) => (
                <button
                  key={fit}
                  type="button"
                  data-testid={`background-image-fit-${fit}-button`}
                  onClick={() => onChange({ ...background, fit })}
                  className="ac-button ac-button--ghost ac-button--sm"
                  data-active={background.fit === fit ? 'true' : 'false'}
                >
                  {fit === 'cover' ? copy.fitCover : copy.fitContain}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">{copy.opacityLabel}</Label>
              <span className="font-mono text-[10px] text-[var(--text-tertiary)]">{Math.round(background.opacity * 100)}%</span>
            </div>
            <Slider
              value={[Math.round(background.opacity * 100)]}
              min={0}
              max={100}
              step={1}
              onValueChange={(val) => onChange({ ...background, opacity: val[0] / 100 })}
              data-testid="background-image-opacity-slider"
            />
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm text-[var(--text-primary)]">
              <input
                type="checkbox"
                data-testid="background-image-grayscale-checkbox"
                checked={Boolean(background.filters?.grayscale)}
                onChange={(event) => onChange({ ...background, filters: { grayscale: event.target.checked } })}
              />
              {copy.grayscaleLabel}
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
