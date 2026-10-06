'use client';

import type { AppMessages } from '@/lib/i18n/messages';
import type { DesignLayer, ShapeLayerProps } from '@/lib/projects/design-surface';
import { ColorPickerField } from './ColorPickerField';
import { CompactNumberField, PropertySection } from './PropertyControls';

type ShapeLayer = DesignLayer & ShapeLayerProps;

export function ShapeLayerProperties({
  layer,
  copy,
  workspace: ws,
  onChange,
}: {
  layer: ShapeLayer;
  copy: AppMessages['coverDesignSurface']['shape'];
  workspace: AppMessages['coverDesignSurface']['workspace'];
  onChange: (patch: Partial<ShapeLayerProps> & Partial<Pick<DesignLayer, 'x' | 'y' | 'width' | 'height' | 'rotation' | 'opacity'>>) => void;
}) {
  return (
    <div className="cover-prop-stack" data-testid="shape-layer-properties">
      <PropertySection title={ws.sectionAppearance}>
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
        <div className="cover-prop-grid">
          <CompactNumberField label={copy.strokeWidthLabel} value={layer.strokeWidth ?? 0} min={0} onChange={(strokeWidth) => onChange({ strokeWidth: Math.max(0, strokeWidth) })} testId="shape-layer-stroke-width-input" suffix="px" />
          <CompactNumberField label={copy.opacityLabel} value={Math.round(layer.opacity * 100)} min={0} max={100} onChange={(value) => onChange({ opacity: Math.min(100, Math.max(0, value)) / 100 })} testId="shape-layer-opacity-input" suffix="%" />
        </div>
      </PropertySection>
      <PropertySection title={ws.sectionPosition}>
        <div className="cover-prop-grid" data-testid="shape-layer-transform-fields">
          <CompactNumberField label={copy.xLabel} value={layer.x} onChange={(x) => onChange({ x })} testId="shape-layer-x-input" />
          <CompactNumberField label={copy.yLabel} value={layer.y} onChange={(y) => onChange({ y })} testId="shape-layer-y-input" />
          <CompactNumberField label={copy.widthLabel} value={layer.width} onChange={(width) => onChange({ width })} testId="shape-layer-width-input" />
          <CompactNumberField label={copy.heightLabel} value={layer.height} onChange={(height) => onChange({ height })} testId="shape-layer-height-input" />
          <CompactNumberField label={copy.rotationLabel} value={layer.rotation} onChange={(rotation) => onChange({ rotation })} testId="shape-layer-rotation-input" suffix="°" />
        </div>
      </PropertySection>
    </div>
  );
}
