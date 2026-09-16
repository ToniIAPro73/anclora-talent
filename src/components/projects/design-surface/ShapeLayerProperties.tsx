'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { AppMessages } from '@/lib/i18n/messages';
import type { DesignLayer, ShapeLayerProps } from '@/lib/projects/design-surface';
import { ColorPickerField } from './ColorPickerField';

type ShapeLayer = DesignLayer & ShapeLayerProps;

export function ShapeLayerProperties({
  layer,
  copy,
  onChange,
}: {
  layer: ShapeLayer;
  copy: AppMessages['coverDesignSurface']['shape'];
  onChange: (patch: Partial<ShapeLayerProps> & Partial<Pick<DesignLayer, 'x' | 'y' | 'width' | 'height' | 'rotation' | 'opacity'>>) => void;
}) {
  return (
    <div className="space-y-5" data-testid="shape-layer-properties">
      <ColorPickerField
        label={copy.fillLabel}
        value={layer.fill ?? 'transparent'}
        onChange={(fill) => onChange({ fill })}
        copy={{ customLabel: copy.fillLabel, recentLabel: copy.fillLabel, paletteLabel: copy.fillLabel, brandColorsLabel: copy.fillLabel, hexLabel: copy.fillLabel }}
        testId="shape-layer-fill"
      />
      <ColorPickerField
        label={copy.strokeLabel}
        value={layer.stroke ?? 'transparent'}
        onChange={(stroke) => onChange({ stroke })}
        copy={{ customLabel: copy.strokeLabel, recentLabel: copy.strokeLabel, paletteLabel: copy.strokeLabel, brandColorsLabel: copy.strokeLabel, hexLabel: copy.strokeLabel }}
        testId="shape-layer-stroke"
      />
      <div className="space-y-2">
        <Label className="text-xs font-semibold">{copy.strokeWidthLabel}</Label>
        <Input
          type="number"
          min={0}
          data-testid="shape-layer-stroke-width-input"
          value={layer.strokeWidth ?? 0}
          onChange={(event) => onChange({ strokeWidth: Math.max(0, Number(event.target.value) || 0) })}
          className="h-9 border-[var(--border-subtle)] bg-[var(--surface-soft)] text-sm"
        />
      </div>
      <div className="space-y-2">
        <Label className="text-xs font-semibold">{copy.opacityLabel}</Label>
        <Input
          type="number"
          min={0}
          max={100}
          data-testid="shape-layer-opacity-input"
          value={Math.round(layer.opacity * 100)}
          onChange={(event) => onChange({ opacity: Math.min(100, Math.max(0, Number(event.target.value) || 0)) / 100 })}
          className="h-9 border-[var(--border-subtle)] bg-[var(--surface-soft)] text-sm"
        />
      </div>
      <div className="grid grid-cols-2 gap-3" data-testid="shape-layer-transform-fields">
        <NumericField label={copy.xLabel} value={layer.x} onChange={(x) => onChange({ x })} testId="shape-layer-x-input" />
        <NumericField label={copy.yLabel} value={layer.y} onChange={(y) => onChange({ y })} testId="shape-layer-y-input" />
        <NumericField label={copy.widthLabel} value={layer.width} onChange={(width) => onChange({ width })} testId="shape-layer-width-input" />
        <NumericField label={copy.heightLabel} value={layer.height} onChange={(height) => onChange({ height })} testId="shape-layer-height-input" />
        <NumericField label={copy.rotationLabel} value={layer.rotation} onChange={(rotation) => onChange({ rotation })} testId="shape-layer-rotation-input" />
      </div>
    </div>
  );
}

function NumericField({ label, value, onChange, testId }: { label: string; value: number; onChange: (value: number) => void; testId: string }) {
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
