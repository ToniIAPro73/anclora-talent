'use client';

/**
 * Cover Studio v2 — background editor (mission §11): solid color, gradient,
 * or image, shared by cover and back cover since both use the same
 * `DesignSurface.background` field.
 */

import { useRef } from 'react';
import { Plus, X } from 'lucide-react';
import type { AppMessages } from '@/lib/i18n/messages';
import type { BackgroundSpec } from '@/lib/projects/design-surface';
import { ColorPickerField } from './ColorPickerField';
import { CompactSlider, PropertySection, SegmentedGroup } from './PropertyControls';

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
    <div className="cover-prop-stack" data-testid="background-editor">
      <PropertySection title={copy.label}>
        <SegmentedGroup label={copy.label}>
          <button
            type="button"
            data-testid="background-kind-solid-button"
            onClick={() => onChange({ kind: 'solid', color: background.kind === 'solid' ? background.color : '#0b133f' })}
            className="cover-prop-text-button"
            data-active={background.kind === 'solid' ? 'true' : 'false'}
            aria-pressed={background.kind === 'solid'}
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
            className="cover-prop-text-button"
            data-active={background.kind === 'gradient' ? 'true' : 'false'}
            aria-pressed={background.kind === 'gradient'}
          >
            {copy.gradient}
          </button>
          <button
            type="button"
            data-testid="background-kind-image-button"
            onClick={() => onChange(background.kind === 'image' ? background : { kind: 'image', src: '', fit: 'cover', opacity: 1 })}
            className="cover-prop-text-button"
            data-active={background.kind === 'image' ? 'true' : 'false'}
            aria-pressed={background.kind === 'image'}
          >
            {copy.image}
          </button>
        </SegmentedGroup>

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
        <>
          <CompactSlider
            label={copy.gradientAngleLabel}
            value={background.angle}
            min={0}
            max={360}
            step={1}
            onChange={(angle) => onChange({ ...background, angle })}
            display={(value) => `${value}°`}
            testId="background-gradient-angle-slider"
          />
          {background.stops.map((stop, index) => (
            <div key={index} className="flex items-center gap-1">
              <div className="min-w-0 flex-1">
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
                  aria-label={copy.removeColorStopButton}
                  onClick={() => onChange({ ...background, stops: background.stops.filter((_, i) => i !== index) })}
                  className="cover-prop-icon"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            data-testid="background-gradient-add-stop-button"
            onClick={() => onChange({ ...background, stops: [...background.stops, { color: '#ffffff', offset: 1 }] })}
            className="ac-button ac-button--secondary cover-prop-button inline-flex items-center justify-center gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            {copy.addColorStopButton}
          </button>
        </>
      )}

      {background.kind === 'image' && (
        <>
          <button
            type="button"
            data-testid="background-image-upload-button"
            onClick={() => fileInputRef.current?.click()}
            className="ac-button ac-button--secondary cover-prop-button"
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
          <SegmentedGroup label={copy.fitLabel}>
            {(['cover', 'contain'] as const).map((fit) => (
              <button
                key={fit}
                type="button"
                data-testid={`background-image-fit-${fit}-button`}
                onClick={() => onChange({ ...background, fit })}
                className="cover-prop-text-button"
                data-active={background.fit === fit ? 'true' : 'false'}
                aria-pressed={background.fit === fit}
              >
                {fit === 'cover' ? copy.fitCover : copy.fitContain}
              </button>
            ))}
          </SegmentedGroup>
          <CompactSlider
            label={copy.opacityLabel}
            value={Math.round(background.opacity * 100)}
            min={0}
            max={100}
            step={1}
            onChange={(value) => onChange({ ...background, opacity: value / 100 })}
            display={(value) => `${value}%`}
            testId="background-image-opacity-slider"
          />
          <label className="cover-prop-check">
            <input
              type="checkbox"
              data-testid="background-image-grayscale-checkbox"
              checked={Boolean(background.filters?.grayscale)}
              onChange={(event) => onChange({ ...background, filters: { grayscale: event.target.checked } })}
            />
            {copy.grayscaleLabel}
          </label>
        </>
      )}
      </PropertySection>
    </div>
  );
}
