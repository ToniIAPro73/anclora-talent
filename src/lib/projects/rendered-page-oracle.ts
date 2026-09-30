import type { CanonicalPage, ContentSlice } from './source-page-map';

export interface RenderedPageDomSnapshot {
  pageNumber: number;
  localIndex: number;
  expectedStartAnchor?: { blockId: string; textOffset: number };
  expectedEndAnchor?: { blockId: string; textOffset: number };
  firstVisibleBlockId: string | null;
  firstVisibleTextOffset: number | null;
  lastVisibleBlockId: string | null;
  lastVisibleTextOffset: number | null;
  visibleBlockIds: string[];
  visibleSlices: ContentSlice[];
  visibleText: string;
  bodyClientWidth: number;
  bodyScrollWidth: number;
  bodyClientHeight: number;
  bodyScrollHeight: number;
  overflowX: boolean;
  overflowY: boolean;
  footerRect: DOMRect | null;
  bodyRect: DOMRect | null;
  footnoteRect: DOMRect | null;
  footnoteIntersection: boolean;
  footerIntersection: boolean;
  frameRect: DOMRect | null;
  membership: boolean;
  result: boolean;
}

function intersects(left: DOMRect | null, right: DOMRect | null): boolean {
  if (!left || !right) return false;
  return left.left < right.right && left.right > right.left && left.top < right.bottom && left.bottom > right.top;
}

function sliceFromElement(element: HTMLElement): ContentSlice | null {
  const blockId = element.dataset.blockId;
  const fromOffset = Number(element.dataset.sourceFromOffset);
  const toOffset = Number(element.dataset.sourceToOffset);
  if (!blockId || !Number.isFinite(fromOffset) || !Number.isFinite(toOffset)) return null;
  return { blockId, fromOffset, toOffset };
}

export function inspectRenderedSourcePage(
  root: ParentNode,
  page: CanonicalPage,
  localIndex: number,
): RenderedPageDomSnapshot {
  const frame = Array.from(root.querySelectorAll<HTMLElement>('[data-canonical-page="true"]'))
    .find((candidate) => Number(candidate.dataset.sourcePage) === page.globalPageNumber) ?? null;
  const body = frame?.querySelector<HTMLElement>('.flow-content-root') ?? null;
  const blockElements = body ? Array.from(body.querySelectorAll<HTMLElement>('[data-block-id]')) : [];
  const visibleSlices = blockElements.map(sliceFromElement).filter((slice): slice is ContentSlice => Boolean(slice));
  const first = visibleSlices[0] ?? null;
  const last = visibleSlices.at(-1) ?? null;
  const footer = frame?.querySelector<HTMLElement>('[data-testid="source-footer"]') ?? null;
  const footnote = frame?.querySelector<HTMLElement>('[data-footnote-region], [data-testid="footnote-region"]') ?? null;
  const bodyRect = body?.getBoundingClientRect() ?? null;
  const footerRect = footer?.getBoundingClientRect() ?? null;
  const footnoteRect = footnote?.getBoundingClientRect() ?? null;
  const membership = Boolean(
    frame
    && visibleSlices.length === page.contentSlices.length
    && visibleSlices.every((slice, index) => {
      const expected = page.contentSlices[index];
      return slice.blockId === expected.blockId
        && slice.fromOffset === expected.fromOffset
        && slice.toOffset === expected.toOffset;
    }),
  );
  const overflowX = Boolean(body && body.scrollWidth > body.clientWidth + 2);
  const overflowY = Boolean(body && body.scrollHeight > body.clientHeight + 2);
  const footerIntersection = intersects(bodyRect, footerRect);
  const footnoteIntersection = intersects(footnoteRect, footerRect);
  return {
    pageNumber: page.globalPageNumber,
    localIndex,
    expectedStartAnchor: page.contentSlices[0] ? { blockId: page.contentSlices[0].blockId, textOffset: page.contentSlices[0].fromOffset } : undefined,
    expectedEndAnchor: page.contentSlices.at(-1) ? { blockId: page.contentSlices.at(-1)!.blockId, textOffset: page.contentSlices.at(-1)!.toOffset } : undefined,
    firstVisibleBlockId: first?.blockId ?? null,
    firstVisibleTextOffset: first?.fromOffset ?? null,
    lastVisibleBlockId: last?.blockId ?? null,
    lastVisibleTextOffset: last?.toOffset ?? null,
    visibleBlockIds: visibleSlices.map((slice) => slice.blockId),
    visibleSlices,
    visibleText: body?.innerText ?? '',
    bodyClientWidth: body?.clientWidth ?? 0,
    bodyScrollWidth: body?.scrollWidth ?? 0,
    bodyClientHeight: body?.clientHeight ?? 0,
    bodyScrollHeight: body?.scrollHeight ?? 0,
    overflowX,
    overflowY,
    footerRect,
    bodyRect,
    footnoteRect,
    footnoteIntersection,
    footerIntersection,
    frameRect: frame?.getBoundingClientRect() ?? null,
    membership,
    result: membership && !overflowX && !overflowY && !footerIntersection && !footnoteIntersection,
  };
}

export function certifyRenderedPageFrameCount(root: ParentNode, canonicalPages: CanonicalPage[]) {
  const frames = Array.from(root.querySelectorAll<HTMLElement>('[data-canonical-page="true"]'));
  const sourcePages = frames.map((frame) => Number(frame.dataset.sourcePage)).filter(Number.isFinite);
  const expectedPages = canonicalPages.map((page) => page.globalPageNumber);
  return {
    expectedCanonicalPageCount: canonicalPages.length,
    renderedPhysicalFrameCount: frames.length,
    globalSourcePageNumbers: sourcePages,
    uniqueGlobalSourcePageNumbers: new Set(sourcePages).size,
    result: frames.length === canonicalPages.length
      && sourcePages.length === new Set(sourcePages).size
      && sourcePages.every((pageNumber, index) => pageNumber === expectedPages[index]),
  };
}
