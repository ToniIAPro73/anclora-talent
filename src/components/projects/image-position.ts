import type { Editor } from '@tiptap/core';

export type ImageMode = 'inline' | 'floating';
export type ImageAlign = 'left' | 'center' | 'right';

export type FloatingBox = {
  /**
   * Size of the image's own page column. The editor is one ProseMirror laid
   * out in CSS columns (one column = one page), so bounds are per column,
   * never the width of the whole flow.
   */
  containerWidth: number;
  containerHeight: number;
  /** Image size. */
  width: number;
  height: number;
  /** Position of the image's natural (x=0,y=0) flow slot inside its column. */
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

/** Which page column an x position (relative to the flow's left edge) falls in. */
export function columnIndexAt(relativeLeft: number, stride: number): number {
  if (!Number.isFinite(stride) || stride <= 0) return 0;
  return Math.max(0, Math.floor((relativeLeft + 1) / stride));
}

/**
 * Decide whether an (unclamped) floating offset has been dragged past its page
 * column far enough to change page: -1 previous, 1 next, 0 stay. The
 * threshold avoids accidental page jumps when merely touching an edge.
 */
export function pageCrossingFor(x: number, y: number, box: FloatingBox): -1 | 0 | 1 {
  const thresholdX = box.width * 0.25;
  const thresholdY = box.height * 0.25;
  const left = box.naturalLeft + x;
  const top = box.naturalTop + y;
  if (left + box.width > box.containerWidth + thresholdX) return 1;
  if (left < -thresholdX) return -1;
  if (top + box.height > box.containerHeight + thresholdY) return 1;
  if (top < -thresholdY) return -1;
  return 0;
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

type TopLevelBlock = { pos: number; size: number; column: number };

/**
 * Re-anchor the selected floating image to the neighbouring page column.
 *
 * The image keeps being an ordinary block of the document: moving across a
 * page changes which block it is anchored to (document order), never a CSS
 * transform of a shared wrapper. The move is one transaction (single undo
 * step), the offsets reset so the image lands at the top of its new page, and
 * the layout (CSS columns) creates the extra page by itself when needed.
 */
export function reanchorImageAcrossPages(
  editor: Editor,
  direction: -1 | 1,
  geometry: { stride: number; flowLeft: number; currentColumn: number; scale?: number },
): boolean {
  const { state, view } = editor;
  const node = (state.selection as unknown as { node?: { type: { name: string }; attrs: Record<string, unknown> } }).node;
  if (!node || node.type.name !== 'image') return false;

  const from = state.selection.from;
  const targetColumn = geometry.currentColumn + direction;
  if (targetColumn < 0) return false;

  const blocks: TopLevelBlock[] = [];
  state.doc.forEach((child, offset) => {
    if (offset === from) return;
    const dom = view.nodeDOM(offset) as HTMLElement | null;
    const rect = dom?.getClientRects?.()[0];
    if (!rect) return;
    blocks.push({
      pos: offset,
      size: child.nodeSize,
      column: columnIndexAt((rect.left - geometry.flowLeft) / (geometry.scale || 1), geometry.stride),
    });
  });

  // Going forward: land after the first block that starts on the target page,
  // i.e. near its top (inserting before that block would be the very page
  // boundary, which the column flow may still fill on the current page). With
  // no such block -> end of document, where the layout opens a new page.
  // Going back: right before the first block of the current page that
  // precedes the image, else before the last block of the previous page.
  const anchor =
    direction > 0
      ? blocks.filter((block) => block.column >= targetColumn)[1]
      : (blocks.find((block) => block.column >= geometry.currentColumn && block.pos < from)
          ?? [...blocks].reverse().find((block) => block.column < geometry.currentColumn));
  const imageSize = state.doc.nodeAt(from)?.nodeSize ?? 1;
  const tr = state.tr.delete(from, from + imageSize);
  const insertAt = anchor ? tr.mapping.map(anchor.pos) : tr.doc.content.size;
  if (insertAt === from) return false;

  tr.insert(insertAt, state.schema.nodes.image.create({ ...node.attrs, x: 0, y: 0 }));
  const selectionClass = state.selection.constructor as unknown as {
    create: (d: typeof tr.doc, pos: number) => typeof state.selection;
  };
  tr.setSelection(selectionClass.create(tr.doc, insertAt));
  view.dispatch(tr.scrollIntoView());
  return true;
}
