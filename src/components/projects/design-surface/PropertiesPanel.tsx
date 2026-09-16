'use client';

/**
 * Cover Studio v2 — properties panel dispatcher. Renders the right control
 * set for whatever is selected on the canvas: nothing, one text/image/shape
 * layer, or multiple layers (mission §20 wants a "contextual panel" on
 * selection; a genuine per-property multi-edit UI is a further-out
 * refinement — for now multi-select shows a clear, honest empty state
 * rather than editing only the first layer silently).
 */

import type { AppMessages } from '@/lib/i18n/messages';
import type { DesignLayer, ImageLayerProps, TextLayerProps } from '@/lib/projects/design-surface';
import { TextLayerProperties } from './TextLayerProperties';
import { ImageLayerProperties } from './ImageLayerProperties';
import { ShapeLayerProperties } from './ShapeLayerProperties';

export interface PropertiesPanelProps {
  selectedLayers: DesignLayer[];
  copy: AppMessages['coverDesignSurface'];
  brandColors?: string[];
  onLayerChange: (layerId: string, patch: Partial<DesignLayer>) => void;
  onReplaceImage: (layerId: string, file: File) => void;
  /** role -> value the metadata precedence chain currently resolves to (mission §40-41). The caller holds the `ProjectRecord`, so it computes this. */
  metadataValues?: Partial<Record<string, string>>;
}

export function PropertiesPanel({ selectedLayers, copy, brandColors, onLayerChange, onReplaceImage, metadataValues }: PropertiesPanelProps) {
  if (selectedLayers.length === 0) {
    return (
      <div className="ac-editor-inspector__empty" data-testid="properties-panel-empty">
        <p className="text-xs text-[var(--text-secondary)]">{copy.noSelection}</p>
      </div>
    );
  }

  if (selectedLayers.length > 1) {
    return (
      <div className="ac-editor-inspector__empty" data-testid="properties-panel-multi">
        <p className="text-xs text-[var(--text-secondary)]">{copy.multiSelection}</p>
      </div>
    );
  }

  const layer = selectedLayers[0];

  if (layer.type === 'text') {
    const textLayer = layer as DesignLayer & TextLayerProps;
    const metadataValue = metadataValues?.[textLayer.role];
    return (
      <TextLayerProperties
        layer={textLayer}
        copy={copy}
        brandColors={brandColors}
        onChange={(patch) => onLayerChange(layer.id, patch)}
        metadataValue={metadataValue}
        onSyncFromMetadata={
          metadataValue !== undefined
            ? () => onLayerChange(layer.id, { content: metadataValue, source: 'metadata' } as Partial<DesignLayer>)
            : undefined
        }
      />
    );
  }

  if (layer.type === 'image') {
    return (
      <ImageLayerProperties
        layer={layer as DesignLayer & ImageLayerProps}
        copy={copy.image}
        onChange={(patch) => onLayerChange(layer.id, patch)}
        onReplaceFile={(file) => onReplaceImage(layer.id, file)}
      />
    );
  }

  return <ShapeLayerProperties layer={layer} copy={copy.shape} onChange={(patch) => onLayerChange(layer.id, patch)} />;
}
