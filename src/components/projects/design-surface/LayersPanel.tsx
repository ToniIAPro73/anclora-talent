'use client';

/**
 * Cover Studio v2 — layers panel (mission §19). Lists every layer, highest
 * zIndex (front-most) first — the convention most design tools use.
 * Reorder is exposed as explicit up/down/front/back actions rather than
 * drag-and-drop (mission §19: drag reorder "if stable" — explicit buttons
 * are unconditionally stable and fully keyboard-accessible, mission §54).
 */

import { useEffect, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ChevronsDown,
  ChevronsUp,
  Copy,
  Eye,
  EyeOff,
  GripVertical,
  ImageIcon,
  Lock,
  MoreVertical,
  Shapes,
  Square,
  Trash2,
  Type,
  Unlock,
} from 'lucide-react';
import type { AppMessages } from '@/lib/i18n/messages';
import type { DesignLayer, DesignSurface } from '@/lib/projects/design-surface';
import { resolveLayerLabel, type LayerLabelCopy } from './layer-labels';

export interface LayersPanelCopy extends LayerLabelCopy {
  dragLabel?: string;
  moreOptionsLabel?: string;
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
  coverBackgroundLabel?: string;
}

export interface LayersPanelProps {
  layers: DesignLayer[];
  /** Used to tell a full-bleed background image from an ordinary picture. */
  surfaceSize?: Pick<DesignSurface, 'width' | 'height'>;
  selectedLayerIds: string[];
  copy: LayersPanelCopy;
  onSelect: (layerId: string, options?: { additive?: boolean }) => void;
  onRename: (layerId: string, name: string) => void;
  onToggleVisibility: (layerId: string) => void;
  onToggleLock: (layerId: string) => void;
  onDuplicate: (layerId: string) => void;
  onDelete: (layerId: string) => void;
  onReorder: (layerId: string, direction: 'up' | 'down' | 'front' | 'back') => void;
  /** The structural cover background, always the bottom row (never above a layer). */
  backgroundSelected?: boolean;
  /** True when the background is an image (shows the image icon on its row). */
  backgroundIsImage?: boolean;
  onSelectBackground?: () => void;
}

function layerIcon(layer: DesignLayer) {
  if (layer.type === 'text') return Type;
  if (layer.type === 'image') return ImageIcon;
  return Shapes;
}

export function LayersPanel({
  layers,
  surfaceSize,
  selectedLayerIds,
  copy,
  onSelect,
  onRename,
  onToggleVisibility,
  onToggleLock,
  onDuplicate,
  onDelete,
  onReorder,
  backgroundSelected = false,
  backgroundIsImage = false,
  onSelectBackground,
}: LayersPanelProps) {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const sorted = [...layers].sort((a, b) => b.zIndex - a.zIndex);
  const labelOf = (layer: DesignLayer) => resolveLayerLabel(layer, layers, copy, surfaceSize);

  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  // The row menu is an overlay: any click elsewhere dismisses it.
  useEffect(() => {
    if (!menuOpenId) return;
    const close = () => setMenuOpenId(null);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [menuOpenId]);

  const backgroundRow = onSelectBackground ? (
    <div
      role="listitem"
      data-testid="layer-row-background"
      data-selected={backgroundSelected ? 'true' : 'false'}
      className="cover-layer-row"
    >
      <button
        type="button"
        data-testid="layer-select-background"
        onClick={onSelectBackground}
        className="flex min-w-0 flex-1 items-center gap-2 text-left"
      >
        {backgroundIsImage ? (
          <ImageIcon className="cover-layer-row__icon h-4 w-4 shrink-0" aria-hidden="true" />
        ) : (
          <Square className="cover-layer-row__icon h-4 w-4 shrink-0" aria-hidden="true" />
        )}
        <span className="cover-layer-row__name select-none" data-testid="layer-name-background">
          {copy.coverBackgroundLabel ?? 'Fondo de portada'}
        </span>
      </button>
    </div>
  ) : null;

  if (sorted.length === 0 && !backgroundRow) {
    return (
      <div className="ac-editor-inspector__empty" data-testid="layers-panel-empty">
        <p className="text-xs text-[var(--text-secondary)]">{copy.emptyLabel}</p>
      </div>
    );
  }

  return (
    <div data-testid="layers-panel" role="list" aria-label={copy.title} className="cover-layers-list">
      {sorted.map((layer, index) => {
        const Icon = layerIcon(layer);
        const isSelected = selectedLayerIds.includes(layer.id);
        const isFirst = index === 0;
        const isLast = index === sorted.length - 1;
        const isMenuOpen = menuOpenId === layer.id;

        return (
          <div
            key={layer.id}
            role="listitem"
            data-testid={`layer-row-${layer.id}`}
            data-selected={isSelected ? 'true' : 'false'}
            className="cover-layer-row group"
            data-hidden={layer.visible ? 'false' : 'true'}
          >
            {/* Visibility toggle (08A left) */}
            <button
              type="button"
              data-testid={`layer-visibility-${layer.id}`}
              onClick={(e) => {
                e.stopPropagation();
                onToggleVisibility(layer.id);
              }}
              title={layer.visible ? copy.hideLabel : copy.showLabel}
              aria-label={layer.visible ? copy.hideLabel : copy.showLabel}
              className="p-1 text-[var(--text-tertiary)] hover:text-white rounded transition-colors"
            >
              {layer.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5 opacity-50" />}
            </button>

            {/* Type icon & Layer name */}
            <button
              type="button"
              data-testid={`layer-select-${layer.id}`}
              onClick={(event) => onSelect(layer.id, { additive: event.shiftKey })}
              className="flex min-w-0 flex-1 items-center gap-2 text-left"
            >
              <Icon className="cover-layer-row__icon h-4 w-4 shrink-0" aria-hidden="true" />
              {renamingId === layer.id ? (
                <input
                  autoFocus
                  data-testid={`layer-rename-input-${layer.id}`}
                  defaultValue={labelOf(layer)}
                  onBlur={(event) => {
                    onRename(layer.id, event.target.value);
                    setRenamingId(null);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') event.currentTarget.blur();
                    if (event.key === 'Escape') setRenamingId(null);
                  }}
                  onClick={(event) => event.stopPropagation()}
                  className="cover-layer-row__rename"
                />
              ) : (
                <span
                  className="cover-layer-row__name select-none"
                  data-testid={`layer-name-${layer.id}`}
                  onDoubleClick={() => setRenamingId(layer.id)}
                  title={copy.renameLabel}
                >
                  {labelOf(layer)}
                </span>
              )}
            </button>

            {/* Optional lock indicator */}
            {layer.locked && (
              <button
                type="button"
                data-testid={`layer-lock-${layer.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleLock(layer.id);
                }}
                title={copy.unlockLabel}
                aria-label={copy.unlockLabel}
                className="p-1 text-amber-400 hover:text-amber-300 rounded"
              >
                <Lock className="h-3.5 w-3.5" />
              </button>
            )}

            {/* Drag grip handle (08A) */}
            <span className="cover-layer-row__grip" title={copy.dragLabel ?? 'Arrastrar'}>
              <GripVertical className="h-3.5 w-3.5" />
            </span>

            {/* Actions menu trigger (08A) */}
            <button
              type="button"
              data-testid={`layer-menu-${layer.id}`}
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpenId(isMenuOpen ? null : layer.id);
              }}
              className="p-1 text-[var(--text-tertiary)] hover:text-white rounded"
              title={copy.moreOptionsLabel ?? 'Opciones de capa'}
              aria-label={copy.moreOptionsLabel ?? 'Opciones de capa'}
            >
              <MoreVertical className="h-3.5 w-3.5" />
            </button>

            {/* Action buttons (rendered cleanly, visible on hover or menu open, accessible to tests) */}
            <div className="cover-layer-actions" data-open={isMenuOpen ? 'true' : 'false'}>
              {!layer.locked && (
                <button
                  type="button"
                  data-testid={`layer-lock-${layer.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleLock(layer.id);
                  }}
                  title={copy.lockLabel}
                  aria-label={copy.lockLabel}
                  className="p-1 text-[var(--text-tertiary)] hover:text-white hover:bg-[#12364c] rounded transition-colors"
                >
                  <Unlock className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                type="button"
                data-testid={`layer-duplicate-${layer.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onDuplicate(layer.id);
                  setMenuOpenId(null);
                }}
                title={copy.duplicateLabel}
                aria-label={copy.duplicateLabel}
                className="p-1 text-[var(--text-tertiary)] hover:text-white hover:bg-[#12364c] rounded transition-colors"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                data-testid={`layer-front-${layer.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onReorder(layer.id, 'front');
                  setMenuOpenId(null);
                }}
                disabled={isFirst}
                title={copy.bringToFrontLabel}
                aria-label={copy.bringToFrontLabel}
                className="p-1 text-[var(--text-tertiary)] hover:text-white hover:bg-[#12364c] rounded transition-colors disabled:opacity-20"
              >
                <ChevronsUp className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                data-testid={`layer-move-up-${layer.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onReorder(layer.id, 'up');
                  setMenuOpenId(null);
                }}
                disabled={isFirst}
                title={copy.moveUpLabel}
                aria-label={copy.moveUpLabel}
                className="p-1 text-[var(--text-tertiary)] hover:text-white hover:bg-[#12364c] rounded transition-colors disabled:opacity-20"
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                data-testid={`layer-move-down-${layer.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onReorder(layer.id, 'down');
                  setMenuOpenId(null);
                }}
                disabled={isLast}
                title={copy.moveDownLabel}
                aria-label={copy.moveDownLabel}
                className="p-1 text-[var(--text-tertiary)] hover:text-white hover:bg-[#12364c] rounded transition-colors disabled:opacity-20"
              >
                <ArrowDown className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                data-testid={`layer-back-${layer.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onReorder(layer.id, 'back');
                  setMenuOpenId(null);
                }}
                disabled={isLast}
                title={copy.sendToBackLabel}
                aria-label={copy.sendToBackLabel}
                className="p-1 text-[var(--text-tertiary)] hover:text-white hover:bg-[#12364c] rounded transition-colors disabled:opacity-20"
              >
                <ChevronsDown className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                data-testid={`layer-delete-${layer.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(layer.id);
                  setMenuOpenId(null);
                }}
                title={copy.deleteLabel}
                aria-label={copy.deleteLabel}
                className="p-1 text-red-400 hover:text-red-300 hover:bg-[#12364c] rounded transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        );
      })}
      {backgroundRow}
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
    coverBackgroundLabel: copy.layers.coverBackgroundLabel,
    untitledText: copy.layers.untitledText,
    untitledImage: copy.layers.untitledImage,
    untitledShape: copy.layers.untitledShape,
    roleTitle: copy.layers.roleTitle,
    roleSubtitle: copy.layers.roleSubtitle,
    roleAuthor: copy.layers.roleAuthor,
    roleBody: copy.layers.roleBody,
    roleAuthorBio: copy.layers.roleAuthorBio,
    backgroundImage: copy.layers.backgroundImage,
    lineLabel: copy.layers.lineLabel,
    iconLabel: copy.layers.iconLabel,
    overlayLabel: copy.layers.overlayLabel,
    dragLabel: copy.workspace.drag,
    moreOptionsLabel: copy.workspace.moreOptions,
  };
}
