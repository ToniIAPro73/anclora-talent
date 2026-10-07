/**
 * Cover Studio v2 — layer groups (08B). A group is just a shared `groupId` on the member layers:
 * serializable with the surface, covered by undo/redo (it lives in the layer array) and independent of any
 * Fabric runtime state. Selecting one member selects the whole group; moving/scaling/rotating the multi-selection
 * keeps every member's geometry relative to the others.
 */

import { createUuid } from '@/lib/utils/uuid';
import type { DesignLayer } from './design-surface';

/** Selection ids plus every other member of the groups they belong to. */
export function expandSelectionToGroups(layers: DesignLayer[], selectedIds: string[]): string[] {
  const groupIds = new Set(layers.filter((layer) => selectedIds.includes(layer.id) && layer.groupId).map((layer) => layer.groupId as string));
  if (groupIds.size === 0) return selectedIds;
  const expanded = new Set(selectedIds);
  for (const layer of layers) if (layer.groupId && groupIds.has(layer.groupId)) expanded.add(layer.id);
  // Same reference when no group member was missing from the selection (keeps selection state stable).
  return expanded.size === selectedIds.length ? selectedIds : layers.map((layer) => layer.id).filter((id) => expanded.has(id));
}

/** Members of the selection's groups, merged into one new group (needs 2+ layers). */
export function groupLayers(layers: DesignLayer[], selectedIds: string[], groupId: string = `group-${createUuid()}`): DesignLayer[] {
  const members = new Set(expandSelectionToGroups(layers, selectedIds));
  if (members.size < 2) return layers;
  return layers.map((layer) => (members.has(layer.id) ? { ...layer, groupId } : layer));
}

/** Removes the groups of the selection; every member keeps its exact geometry. */
export function ungroupLayers(layers: DesignLayer[], selectedIds: string[]): DesignLayer[] {
  const groupIds = new Set(layers.filter((layer) => selectedIds.includes(layer.id) && layer.groupId).map((layer) => layer.groupId as string));
  if (groupIds.size === 0) return layers;
  return layers.map((layer) => {
    if (!layer.groupId || !groupIds.has(layer.groupId)) return layer;
    const rest = { ...layer };
    delete rest.groupId;
    return rest;
  });
}

export function groupMemberCount(layers: DesignLayer[], groupId: string): number {
  return layers.filter((layer) => layer.groupId === groupId).length;
}
