'use client';

/**
 * Cover Studio v2 — layers panel (mission §19). Lists every layer, highest
 * zIndex (front-most) first — the convention most design tools use.
 * Reorder is exposed as explicit up/down/front/back actions rather than
 * drag-and-drop (mission §19: drag reorder "if stable" — explicit buttons
 * are unconditionally stable and fully keyboard-accessible, mission §54).
 */

import { useState } from 'react';
import {
  Copy,
  Eye,
  EyeOff,
  ImageIcon,
  Lock,
  Shapes,
  Trash2,
  Type,
  Unlock,
} from 'lucide-react';
import type { AppMessages } from '@/lib/i18n/messages';
import type { DesignLayer } from '@/lib/projects/design-surface';

export interface LayersPanelCopy {
  title: string;
  emptyLabel: string;
  renameLabel: string;
  showLabel: string;
  hideLabel: string;
  lockLabel: string;
  unlockLabel: string;
  duplicateLabel: string;
  deleteLabel: string;
  moveUpLabel: string;
  moveDownLabel: string;
  bringToFrontLabel: string;
  sendToBackLabel: string;
  untitledText: string;
  untitledImage: string;
  untitledShape: string;
}

export interface LayersPanelProps {
  layers: DesignLayer[];
  selectedLayerIds: string[];
  copy: LayersPanelCopy;
  onSelect: (layerId: string, options?: { additive?: boolean }) => void;
  onRename: (layerId: string, name: string) => void;
  onToggleVisibility: (layerId: string) => void;
  onToggleLock: (layerId: string) => void;
  onDuplicate: (layerId: string) => void;
  onDelete: (layerId: string) => void;
  onReorder: (layerId: string, direction: 'up' | 'down' | 'front' | 'back') => void;
}

function layerIcon(layer: DesignLayer) {
  if (layer.type === 'text') return Type;
  if (layer.type === 'image') return ImageIcon;
  return Shapes;
}

function layerDefaultName(layer: DesignLayer, copy: LayersPanelCopy): string {
  if (layer.name) return layer.name;
  if (layer.type === 'text') return layer.content.trim() || copy.untitledText;
  if (layer.type === 'image') return copy.untitledImage;
  return copy.untitledShape;
}

export function LayersPanel({
  layers,
  selectedLayerIds,
  copy,
  onSelect,
  onRename,
  onToggleVisibility,
  onToggleLock,
  onDuplicate,
  onDelete,
  onReorder,
}: LayersPanelProps) {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const sorted = [...layers].sort((a, b) => b.zIndex - a.zIndex);

  if (sorted.length === 0) {
    return (
      <div className="ac-editor-inspector__empty" data-testid="layers-panel-empty">
        <p className="text-xs text-[var(--text-secondary)]">{copy.emptyLabel}</p>
      </div>
    );
  }

  return (
    <div data-testid="layers-panel" role="list" aria-label={copy.title} className="space-y-1">
      {sorted.map((layer, index) => {
        const Icon = layerIcon(layer);
        const isSelected = selectedLayerIds.includes(layer.id);
        const isFirst = index === 0;
        const isLast = index === sorted.length - 1;

        return (
          <div
            key={layer.id}
            role="listitem"
            data-testid={`layer-row-${layer.id}`}
            data-selected={isSelected ? 'true' : 'false'}
            className={`flex items-center gap-2 rounded-lg border px-2 py-1.5 ${
              isSelected ? 'border-[var(--accent)] bg-[var(--accent-soft)]' : 'border-transparent hover:bg-[var(--surface-soft)]'
            }`}
          >
            <button
              type="button"
              data-testid={`layer-select-${layer.id}`}
              onClick={(event) => onSelect(layer.id, { additive: event.shiftKey })}
              className="flex min-w-0 flex-1 items-center gap-2 text-left"
            >
              <Icon className="h-4 w-4 shrink-0 text-[var(--text-tertiary)]" aria-hidden="true" />
              {renamingId === layer.id ? (
                <input
                  autoFocus
                  data-testid={`layer-rename-input-${layer.id}`}
                  defaultValue={layerDefaultName(layer, copy)}
                  onBlur={(event) => {
                    onRename(layer.id, event.target.value);
                    setRenamingId(null);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') event.currentTarget.blur();
                    if (event.key === 'Escape') setRenamingId(null);
                  }}
                  onClick={(event) => event.stopPropagation()}
                  className="min-w-0 flex-1 rounded border border-[var(--border-subtle)] bg-[var(--surface-elevated)] px-1 text-xs"
                />
              ) : (
                <span
                  className="min-w-0 flex-1 truncate text-xs"
                  data-testid={`layer-name-${layer.id}`}
                  onDoubleClick={() => setRenamingId(layer.id)}
                  title={copy.renameLabel}
                >
                  {layerDefaultName(layer, copy)}
                </span>
              )}
            </button>

            <button
              type="button"
              data-testid={`layer-visibility-${layer.id}`}
              onClick={() => onToggleVisibility(layer.id)}
              title={layer.visible ? copy.hideLabel : copy.showLabel}
              aria-label={layer.visible ? copy.hideLabel : copy.showLabel}
              className="ac-button ac-button--ghost ac-button--icon ac-button--sm"
            >
              {layer.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
            </button>
            <button
              type="button"
              data-testid={`layer-lock-${layer.id}`}
              onClick={() => onToggleLock(layer.id)}
              title={layer.locked ? copy.unlockLabel : copy.lockLabel}
              aria-label={layer.locked ? copy.unlockLabel : copy.lockLabel}
              className="ac-button ac-button--ghost ac-button--icon ac-button--sm"
            >
              {layer.locked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
            </button>
            <button
              type="button"
              data-testid={`layer-duplicate-${layer.id}`}
              onClick={() => onDuplicate(layer.id)}
              title={copy.duplicateLabel}
              aria-label={copy.duplicateLabel}
              className="ac-button ac-button--ghost ac-button--icon ac-button--sm"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              data-testid={`layer-move-up-${layer.id}`}
              onClick={() => onReorder(layer.id, 'up')}
              disabled={isFirst}
              title={copy.moveUpLabel}
              aria-label={copy.moveUpLabel}
              className="ac-button ac-button--ghost ac-button--compact text-[10px] px-1.5 disabled:opacity-30"
            >
              {copy.moveUpLabel}
            </button>
            <button
              type="button"
              data-testid={`layer-move-down-${layer.id}`}
              onClick={() => onReorder(layer.id, 'down')}
              disabled={isLast}
              title={copy.moveDownLabel}
              aria-label={copy.moveDownLabel}
              className="ac-button ac-button--ghost ac-button--compact text-[10px] px-1.5 disabled:opacity-30"
            >
              {copy.moveDownLabel}
            </button>
            <button
              type="button"
              data-testid={`layer-front-${layer.id}`}
              onClick={() => onReorder(layer.id, 'front')}
              disabled={isFirst}
              title={copy.bringToFrontLabel}
              aria-label={copy.bringToFrontLabel}
              className="ac-button ac-button--ghost ac-button--compact text-[10px] px-1.5 disabled:opacity-30"
            >
              {copy.bringToFrontLabel}
            </button>
            <button
              type="button"
              data-testid={`layer-back-${layer.id}`}
              onClick={() => onReorder(layer.id, 'back')}
              disabled={isLast}
              title={copy.sendToBackLabel}
              aria-label={copy.sendToBackLabel}
              className="ac-button ac-button--ghost ac-button--compact text-[10px] px-1.5 disabled:opacity-30"
            >
              {copy.sendToBackLabel}
            </button>
            <button
              type="button"
              data-testid={`layer-delete-${layer.id}`}
              onClick={() => onDelete(layer.id)}
              title={copy.deleteLabel}
              aria-label={copy.deleteLabel}
              className="ac-button ac-button--ghost ac-button--icon ac-button--sm"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

/** Reassigns zIndex for every layer after one `direction` move — pure, so the caller (the editor's layer-array owner) can unit test and undo/redo it like any other layer-array change. */
export function reorderLayers(layers: DesignLayer[], layerId: string, direction: 'up' | 'down' | 'front' | 'back'): DesignLayer[] {
  const sorted = [...layers].sort((a, b) => a.zIndex - b.zIndex);
  const index = sorted.findIndex((layer) => layer.id === layerId);
  if (index === -1) return layers;

  const [moved] = sorted.splice(index, 1);
  if (direction === 'up') sorted.splice(Math.min(index + 1, sorted.length), 0, moved);
  else if (direction === 'down') sorted.splice(Math.max(index - 1, 0), 0, moved);
  else if (direction === 'front') sorted.push(moved);
  else sorted.unshift(moved);

  return sorted.map((layer, i) => ({ ...layer, zIndex: i + 1 }));
}

export function buildLayersPanelCopy(copy: AppMessages['coverDesignSurface']): LayersPanelCopy {
  return {
    title: copy.layers.title,
    emptyLabel: copy.layers.emptyLabel,
    renameLabel: copy.layers.renameLabel,
    showLabel: copy.layers.showLabel,
    hideLabel: copy.layers.hideLabel,
    lockLabel: copy.layers.lockLabel,
    unlockLabel: copy.layers.unlockLabel,
    duplicateLabel: copy.layers.duplicateLabel,
    deleteLabel: copy.layers.deleteLabel,
    moveUpLabel: copy.layers.moveUpLabel,
    moveDownLabel: copy.layers.moveDownLabel,
    bringToFrontLabel: copy.layers.bringToFrontLabel,
    sendToBackLabel: copy.layers.sendToBackLabel,
    untitledText: copy.layers.untitledText,
    untitledImage: copy.layers.untitledImage,
    untitledShape: copy.layers.untitledShape,
  };
}
