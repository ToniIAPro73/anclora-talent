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

export interface PropertiesPanelProps {
  selectedLayers: DesignLayer[];
  copy: AppMessages['coverDesignSurface'];
  brandColors?: string[];
  onLayerChange: (layerId: string, patch: Partial<DesignLayer>) => void;
  onReplaceImage: (layerId: string, file: File) => void;
}

export function PropertiesPanel({ selectedLayers, copy, brandColors, onLayerChange, onReplaceImage }: PropertiesPanelProps) {
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
    return (
      <TextLayerProperties
        layer={layer as DesignLayer & TextLayerProps}
        copy={copy}
        brandColors={brandColors}
        onChange={(patch) => onLayerChange(layer.id, patch)}
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

  // Shape layers are minimal helper visuals (safe-area/ISBN markers) with no
  // dedicated property panel yet — selecting one still shows a contextual,
  // honest message instead of a blank panel.
  return (
    <div className="ac-editor-inspector__empty" data-testid="properties-panel-shape">
      <p className="text-xs text-[var(--text-secondary)]">{copy.noSelection}</p>
    </div>
  );
}
