'use client';

import { useState } from 'react';
import { ChromePicker } from 'react-color';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Italic,
  Type,
} from 'lucide-react';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type {
  SurfaceFieldKey,
  SurfaceLayer,
} from '@/lib/projects/cover-surface';
import type { AppMessages } from '@/lib/i18n/messages';
import { FontSelector } from './FontSelector';
import type { ComputedLayerStyle } from './surface-layer-style';

export type LayerStylePatch = Partial<
  Pick<
    SurfaceLayer,
    | 'fill'
    | 'fontSize'
    | 'fontFamily'
    | 'fontWeight'
    | 'fontStyle'
    | 'textAlign'
    | 'lineHeight'
    | 'charSpacing'
    | 'opacity'
  >
>;

type SurfaceInspectorProps = {
  fieldKey: SurfaceFieldKey;
  computed: ComputedLayerStyle;
  value: string;
  copy: AppMessages['project'];
  /** D.3: the layer no longer follows the product metadata (manual override). */
  isManualOverride?: boolean;
  /** D.3: reattach the layer to the product metadata chain. */
  onResync?: () => void;
  onTextChange: (value: string) => void;
  onStyleChange: (patch: LayerStylePatch) => void;
};

/**
 * Property panel for the selected text layer. Operates on the surface state
 * (single source of truth) — every change re-renders the DOM canvas.
 */
export function SurfaceInspector({
  fieldKey,
  computed,
  value,
  copy,
  isManualOverride = false,
  onResync,
  onTextChange,
  onStyleChange,
}: SurfaceInspectorProps) {
  const [showColorPicker, setShowColorPicker] = useState(false);

  const isBold =
    computed.fontWeight === 'bold' ||
    (typeof computed.fontWeight === 'number' && computed.fontWeight >= 700);
  const isItalic = computed.fontStyle === 'italic';

  return (
    <div className="space-y-5" data-testid={`inspector-${fieldKey}`}>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Label className="text-xs font-semibold">{copy.coverStudioContentLabel}</Label>
          {isManualOverride && onResync && (
            <button
              type="button"
              onClick={onResync}
              data-testid={`inspector-resync-${fieldKey}`}
              title={copy.coverFieldResync}
              className="text-xs font-semibold text-[var(--accent)] hover:underline"
            >
              {copy.coverFieldResync}
            </button>
          )}
        </div>
        <Textarea
          aria-label={copy.coverStudioContentLabel}
          data-testid={`inspector-${fieldKey}-content-input`}
          value={value}
          onChange={(event) => onTextChange(event.target.value)}
          className="min-h-20 border-[var(--border-subtle)] bg-[var(--surface-soft)] text-sm focus:border-[var(--accent)]"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-semibold">{copy.advancedCoverFontLabel}</Label>
        <FontSelector
          selectedFont={computed.fontFamily}
          onFontSelect={(fontFamily) => onStyleChange({ fontFamily })}
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-semibold">{copy.coverStudioAlignLabel}</Label>
        <div className="ac-editor-inspector__segmented">
          <button
            type="button"
            onClick={() => onStyleChange({ textAlign: 'left' })}
            data-testid={`inspector-${fieldKey}-align-left-button`}
            className="ac-button ac-button--ghost ac-button--icon ac-button--sm"
            data-active={computed.textAlign === 'left' ? 'true' : 'false'}
            title="Left"
          >
            <AlignLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onStyleChange({ textAlign: 'center' })}
            data-testid={`inspector-${fieldKey}-align-center-button`}
            className="ac-button ac-button--ghost ac-button--icon ac-button--sm"
            data-active={computed.textAlign === 'center' ? 'true' : 'false'}
            title="Center"
          >
            <AlignCenter className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onStyleChange({ textAlign: 'right' })}
            data-testid={`inspector-${fieldKey}-align-right-button`}
            className="ac-button ac-button--ghost ac-button--icon ac-button--sm"
            data-active={computed.textAlign === 'right' ? 'true' : 'false'}
            title="Right"
          >
            <AlignRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onStyleChange({ fontWeight: isBold ? 400 : 700 })}
            data-testid={`inspector-${fieldKey}-bold-button`}
            className="ac-button ac-button--ghost ac-button--icon ac-button--sm"
            data-active={isBold ? 'true' : 'false'}
            title="Bold"
          >
            <Bold className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onStyleChange({ fontStyle: isItalic ? 'normal' : 'italic' })}
            data-testid={`inspector-${fieldKey}-italic-button`}
            className="ac-button ac-button--ghost ac-button--icon ac-button--sm"
            data-active={isItalic ? 'true' : 'false'}
            title="Italic"
          >
            <Italic className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold">{copy.coverStudioFontSizeLabel}</Label>
            <span className="font-mono text-[10px] text-[var(--text-tertiary)]">
              {computed.fontSize}px
            </span>
          </div>
          <Slider
            value={[computed.fontSize]}
            min={8}
            max={120}
            step={1}
            onValueChange={(val) => onStyleChange({ fontSize: val[0] })}
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold">{copy.coverStudioLineHeightLabel}</Label>
            <span className="font-mono text-[10px] text-[var(--text-tertiary)]">
              {computed.lineHeight.toFixed(1)}
            </span>
          </div>
          <Slider
            value={[computed.lineHeight]}
            min={0.8}
            max={3}
            step={0.05}
            onValueChange={(val) => onStyleChange({ lineHeight: val[0] })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold">{copy.coverStudioCharSpacingLabel}</Label>
          <span className="font-mono text-[10px] text-[var(--text-tertiary)]">
            {computed.charSpacing}
          </span>
        </div>
        <Slider
          value={[computed.charSpacing]}
          min={-100}
          max={1000}
          step={10}
          onValueChange={(val) => onStyleChange({ charSpacing: val[0] })}
        />
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-semibold">{copy.coverStudioColorLabel}</Label>
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowColorPicker((open) => !open)}
            data-testid={`inspector-${fieldKey}-color-button`}
            className="flex h-10 w-full items-center gap-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-soft)] px-3"
          >
            <div
              className="h-5 w-5 rounded-md border border-black/10"
              style={{ backgroundColor: computed.fill }}
            />
            <span className="font-mono text-xs uppercase">{computed.fill}</span>
          </button>
          {showColorPicker && (
            <div className="absolute left-0 z-50 mt-2 shadow-2xl">
              <div className="fixed inset-0" onClick={() => setShowColorPicker(false)} />
              <div className="relative">
                <ChromePicker
                  color={computed.fill}
                  onChange={(color) => onStyleChange({ fill: color.hex })}
                  disableAlpha
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-semibold">{copy.coverOpacityLabel}</Label>
          <span className="font-mono text-[10px] text-[var(--text-tertiary)]">
            {Math.round(computed.opacity * 100)}%
          </span>
        </div>
        <Slider
          value={[Math.round(computed.opacity * 100)]}
          min={0}
          max={100}
          step={1}
          onValueChange={(val) => onStyleChange({ opacity: val[0] / 100 })}
        />
      </div>
    </div>
  );
}

export function SurfaceInspectorEmpty({ copy }: { copy: AppMessages['project'] }) {
  return (
    <div className="ac-editor-inspector__empty">
      <div className="ac-editor-inspector__empty-mark">
        <Type className="h-8 w-8 text-[var(--text-tertiary)]" />
      </div>
      <p className="text-xs text-[var(--text-secondary)]">{copy.coverStudioInspectorEmpty}</p>
    </div>
  );
}
