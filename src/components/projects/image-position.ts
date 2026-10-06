import type { Editor } from '@tiptap/core';

export type ImageMode = 'inline' | 'floating';
export type ImageAlign = 'left' | 'center' | 'right';

export type FloatingBox = {
  /** Container (editor content box) size. */
  containerWidth: number;
  containerHeight: number;
  /** Image size. */
  width: number;
  height: number;
  /** Position of the image's natural (x=0,y=0) flow slot inside the container. */
  naturalLeft: number;
  naturalTop: number;
};

/**
 * Keep a floating image inside the editable area. x/y are offsets from the
 * image's natural flow position (its anchor block), so a layout change moves
 * the image together with its anchor instead of detaching it.
 */
export function clampFloatingPosition(
  x: number,
  y: number,
  box: FloatingBox,
): { x: number; y: number } {
  const minX = -box.naturalLeft;
  const maxX = Math.max(minX, box.containerWidth - box.naturalLeft - box.width);
  const minY = -box.naturalTop;
  const maxY = Math.max(minY, box.containerHeight - box.naturalTop - box.height);
  return {
    x: Math.round(Math.min(Math.max(x, minX), maxX)),
    y: Math.round(Math.min(Math.max(y, minY), maxY)),
  };
}

/** Alignment in floating mode only sets the initial x offset. */
export function alignedFloatingX(align: ImageAlign, box: FloatingBox): number {
  const free = box.containerWidth - box.width;
  const target = align === 'left' ? 0 : align === 'right' ? free : free / 2;
  return clampFloatingPosition(target - box.naturalLeft, 0, box).x;
}

/**
 * Move the selected image block one block up/down in the flow. Used by the
 * image toolbar (keyboard/a11y equivalent of drag and drop reordering); the
 * whole move is a single transaction so undo restores the original slot.
 */
export function moveSelectedImage(editor: Editor, direction: -1 | 1): boolean {
  const { state } = editor;
  const { selection, doc } = state;
  const node = (selection as unknown as { node?: { type: { name: string }; nodeSize: number } }).node;
  if (!node || node.type.name !== 'image') return false;

  const from = selection.from;
  const resolved = doc.resolve(from);
  const index = resolved.index();
  const parent = resolved.parent;
  const siblingIndex = index + direction;
  if (siblingIndex < 0 || siblingIndex >= parent.childCount) return false;

  const sibling = parent.child(siblingIndex);
  const imageNode = doc.nodeAt(from);
  if (!imageNode) return false;

  const tr = state.tr.delete(from, from + imageNode.nodeSize);
  const insertAt = direction < 0 ? from - sibling.nodeSize : from + sibling.nodeSize;
  tr.insert(insertAt, imageNode);
  const selectionClass = selection.constructor as unknown as {
    create: (d: typeof doc, pos: number) => typeof selection;
  };
  tr.setSelection(selectionClass.create(tr.doc, insertAt));
  editor.view.dispatch(tr.scrollIntoView());
  return true;
}
