import type { Editor } from '@tiptap/core';
import { TextSelection } from '@tiptap/pm/state';

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

type TopLevelBlock = { pos: number; size: number; column: number; top: number; bottom: number };

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
  geometry: {
    stride: number;
    flowLeft: number;
    currentColumn: number;
    scale?: number;
    /** Vertical geometry (layout px) used to find where the image still fits going back. */
    flowTop?: number;
    columnHeight?: number;
    imageHeight?: number;
  },
): boolean {
  const { state, view } = editor;
  const node = (state.selection as unknown as { node?: { type: { name: string }; attrs: Record<string, unknown> } }).node;
  if (!node || node.type.name !== 'image') return false;

  const from = state.selection.from;
  const targetColumn = geometry.currentColumn + direction;
  if (targetColumn < 0) return false;

  const scale = geometry.scale || 1;
  const columnOf = (left: number) => columnIndexAt((left - geometry.flowLeft) / scale, geometry.stride);
  const blocks: TopLevelBlock[] = [];
  state.doc.forEach((child, offset) => {
    if (offset === from) return;
    const dom = view.nodeDOM(offset) as HTMLElement | null;
    const rects: Array<{ left: number; top: number; bottom?: number }> = Array.from(dom?.getClientRects?.() ?? []);
    if (!rects.length) return;
    // Floated image wrappers have no height of their own: the picture's box is what takes room.
    const imageBox = child.type.name === 'image'
      ? (dom?.querySelector?.('[data-testid="image-node-box"]') as HTMLElement | null)?.getBoundingClientRect()
      : null;
    const column = columnOf(rects[0].left);
    const occupied = [...rects, ...(imageBox ? [imageBox] : [])].filter((rect) => columnOf(rect.left) === column);
    const top = ((imageBox ?? rects[0]).top - (geometry.flowTop ?? 0)) / scale;
    const bottom = Math.max(
      top,
      ...occupied.map((rect) => ((rect.bottom ?? rect.top) - (geometry.flowTop ?? 0)) / scale),
    );
    blocks.push({ pos: offset, size: child.nodeSize, column, top, bottom });
  });

  // Going forward: land after the first block that starts on the target page,
  // i.e. near its top (inserting before that block would be the very page
  // boundary, which the column flow may still fill on the current page). With
  // no such block -> end of document, where the layout opens a new page.
  //
  // Going back: the previous page is already full of the text that flowed up
  // when the image left it, so "end of the previous page" has no room and the
  // column flow would push the image straight back. Land before the lowest
  // block of the previous page that still leaves room for the image below it
  // (the text under that point then flows to the next page).
  let anchor: TopLevelBlock | undefined;
  if (direction > 0) {
    anchor = blocks.filter((block) => block.column >= targetColumn)[1];
  } else {
    // Candidate boundaries on the previous page: before each of its blocks and
    // after the last one. A boundary fits when everything above it plus the
    // image stays inside the page; pick the lowest fitting one.
    const previous = blocks.filter((block) => block.column === targetColumn);
    const needed = (geometry.imageHeight ?? 0) + 16;
    const limit = geometry.columnHeight;
    let usedAbove = 0;
    let best: TopLevelBlock | undefined;
    for (const block of previous) {
      if (!limit || usedAbove + needed <= limit) best = block;
      usedAbove = Math.max(usedAbove, block.bottom);
    }
    const afterLast = blocks.find((block) => block.column > targetColumn);
    if (limit && usedAbove + needed <= limit && afterLast) best = afterLast;
    anchor = best ?? previous[0]
      ?? blocks.find((block) => block.column >= geometry.currentColumn && block.pos < from);
  }

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

/**
 * Scroll the nearest vertically scrollable ancestor just enough to bring
 * `element` fully into view. Vertical only: the page flow is positioned with
 * horizontal transforms, which must never be disturbed by scrollIntoView.
 */
export function revealVertically(element: HTMLElement, margin = 12): void {
  let container: HTMLElement | null = element.parentElement;
  while (container) {
    const overflowY = window.getComputedStyle(container).overflowY;
    if ((overflowY === 'auto' || overflowY === 'scroll') && container.scrollHeight > container.clientHeight) break;
    container = container.parentElement;
  }
  if (!container) return;
  const containerRect = container.getBoundingClientRect();
  const rect = element.getBoundingClientRect();
  if (rect.top < containerRect.top + margin) {
    container.scrollTop -= containerRect.top + margin - rect.top;
  } else if (rect.bottom > containerRect.bottom - margin && rect.height <= containerRect.height) {
    container.scrollTop += rect.bottom - (containerRect.bottom - margin);
  }
}

/**
 * Put a real text caret right before/after the image at `imagePos`, reusing an
 * adjacent empty paragraph or materializing one (canonical, undoable content)
 * only when the user shows intent to edit there. One transaction.
 */
export function placeCaretBesideImage(editor: Editor, imagePos: number, side: 'before' | 'after'): boolean {
  const { state, view } = editor;
  const node = state.doc.nodeAt(imagePos);
  if (!node || node.type.name !== 'image') return false;
  const paragraph = state.schema.nodes.paragraph;
  const boundary = side === 'before' ? imagePos : imagePos + node.nodeSize;
  const $boundary = state.doc.resolve(boundary);
  const neighbour = side === 'before' ? $boundary.nodeBefore : $boundary.nodeAfter;
  const tr = state.tr;
  let caret: number;
  if (side === 'after' && neighbour?.isTextblock) {
    // the paragraph after the image already is the place to continue typing
    caret = boundary + 1;
  } else if (neighbour && neighbour.type === paragraph && neighbour.content.size === 0) {
    caret = side === 'before' ? boundary - 1 : boundary + 1;
  } else {
    tr.insert(boundary, paragraph.create());
    caret = boundary + 1;
  }
  tr.setSelection(TextSelection.create(tr.doc, caret));
  view.dispatch(tr.scrollIntoView());
  view.focus();
  return true;
}

/**
 * Snap distance as the user perceives it (screen px). It is divided by the
 * canvas scale before comparing, so the pull feels identical at any zoom.
 */
export const SNAP_THRESHOLD_SCREEN_PX = 8;

export type SnapTarget = {
  axis: 'x' | 'y';
  /** Wanted *center* of the image, in page-column-local layout px. */
  value: number;
  kind: 'page-center';
};

/**
 * Alignment targets for the page the image is on. Currently the centre of the
 * editable content box; edges / other blocks can be appended here later
 * without touching the snapping or the guide rendering.
 */
export function alignmentTargets(box: FloatingBox): SnapTarget[] {
  return [
    { axis: 'x', value: box.containerWidth / 2, kind: 'page-center' },
    { axis: 'y', value: box.containerHeight / 2, kind: 'page-center' },
  ];
}

export type SnapResult = {
  x: number;
  y: number;
  guides: { x: SnapTarget | null; y: SnapTarget | null };
};

const roundCents = (value: number) => Number(value.toFixed(2));

/**
 * Clamp a dragged floating offset to its page and snap the image centre to the
 * alignment targets within `threshold` (layout px). Pure and page-local: it
 * never sees screen or flow coordinates.
 */
export function snapFloatingPosition(
  x: number,
  y: number,
  box: FloatingBox,
  threshold: number,
): SnapResult {
  const minX = -box.naturalLeft;
  const maxX = Math.max(minX, box.containerWidth - box.naturalLeft - box.width);
  const minY = -box.naturalTop;
  const maxY = Math.max(minY, box.containerHeight - box.naturalTop - box.height);
  let nextX = Math.min(Math.max(x, minX), maxX);
  let nextY = Math.min(Math.max(y, minY), maxY);
  const guides: SnapResult['guides'] = { x: null, y: null };

  for (const target of alignmentTargets(box)) {
    const size = target.axis === 'x' ? box.width : box.height;
    const natural = target.axis === 'x' ? box.naturalLeft : box.naturalTop;
    const current = target.axis === 'x' ? nextX : nextY;
    const center = natural + current + size / 2;
    if (Math.abs(center - target.value) > threshold) continue;
    const snapped = target.value - size / 2 - natural;
    const [low, high] = target.axis === 'x' ? [minX, maxX] : [minY, maxY];
    if (snapped < low - 0.001 || snapped > high + 0.001) continue; // cannot reach it inside the page
    if (target.axis === 'x') nextX = snapped;
    else nextY = snapped;
    guides[target.axis] = target;
  }

  return {
    x: guides.x ? roundCents(nextX) : Math.round(nextX),
    y: guides.y ? roundCents(nextY) : Math.round(nextY),
    guides,
  };
}
