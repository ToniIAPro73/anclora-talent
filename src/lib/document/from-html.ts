/**
 * HTML → SemanticDocument adapter.
 *
 * Bridges the existing TipTap/preview HTML pipeline into the canonical
 * block model so existing projects keep working without a data migration:
 * the adapter runs lazily whenever a persisted HTML chapter is loaded.
 * Ref tokens arrive as `<span data-ref-kind data-ref-target>` (or anchors
 * with the same data attributes) and become live `ref` inline nodes.
 */

import { getPaginationDomRuntime } from '@/lib/preview/content-paginator';
import {
  DocumentBlock,
  InlineMark,
  InlineNode,
  RefKind,
  SemanticDocument,
  ensureBlockIds,
} from './model';

const REF_KINDS: RefKind[] = ['chapter', 'figure', 'table'];

type DomNode = {
  nodeType: number;
  nodeName: string;
  textContent: string | null;
  childNodes: ArrayLike<DomNode>;
};

type DomElement = DomNode & {
  getAttribute(name: string): string | null;
  tagName: string;
  outerHTML: string;
  children: ArrayLike<DomElement>;
  querySelectorAll(selector: string): ArrayLike<DomElement>;
};

function asElement(node: DomNode): DomElement | null {
  return node.nodeType === 1 ? (node as DomElement) : null;
}

function parseRefNode(element: DomElement): InlineNode | null {
  const kind = element.getAttribute('data-ref-kind');
  const target = element.getAttribute('data-ref-target');
  if (!kind || !target || !REF_KINDS.includes(kind as RefKind)) {
    return null;
  }
  const fallback = (element.textContent ?? '').trim() || undefined;
  return { type: 'ref', refKind: kind as RefKind, targetId: target, fallback };
}

function parseInlineChildren(element: DomElement, marks: InlineMark[]): InlineNode[] {
  const nodes: InlineNode[] = [];
  for (let i = 0; i < element.childNodes.length; i += 1) {
    const child = element.childNodes[i];
    if (child.nodeType === 3) {
      const text = child.textContent ?? '';
      if (text.length > 0) {
        nodes.push({ type: 'text', text, marks: marks.length ? [...marks] : undefined });
      }
      continue;
    }
    const childEl = asElement(child);
    if (!childEl) continue;

    const ref = parseRefNode(childEl);
    if (ref) {
      nodes.push(ref);
      continue;
    }

    const tag = childEl.tagName.toLowerCase();
    if (tag === 'br') {
      nodes.push({ type: 'text', text: '\n', marks: marks.length ? [...marks] : undefined });
      continue;
    }

    const nextMarks = [...marks];
    if (tag === 'b' || tag === 'strong') nextMarks.push({ type: 'bold' });
    else if (tag === 'i' || tag === 'em') nextMarks.push({ type: 'italic' });
    else if (tag === 'a') {
      const href = childEl.getAttribute('href') ?? undefined;
      nextMarks.push({ type: 'link', href });
    }
    nodes.push(...parseInlineChildren(childEl, nextMarks));
  }
  return mergeAdjacentText(nodes);
}

function mergeAdjacentText(nodes: InlineNode[]): InlineNode[] {
  const merged: InlineNode[] = [];
  for (const node of nodes) {
    const prev = merged[merged.length - 1];
    if (
      node.type === 'text' &&
      prev?.type === 'text' &&
      JSON.stringify(prev.marks ?? null) === JSON.stringify(node.marks ?? null)
    ) {
      prev.text += node.text;
    } else {
      merged.push(node);
    }
  }
  return merged;
}

function parseInline(element: DomElement): InlineNode[] {
  return parseInlineChildren(element, []);
}

function headingLevel(tag: string): 1 | 2 | 3 | 4 | 5 | 6 | null {
  const match = /^h([1-6])$/.exec(tag);
  return match ? (Number(match[1]) as 1 | 2 | 3 | 4 | 5 | 6) : null;
}

function parseList(element: DomElement, ordered: boolean, id: string): DocumentBlock {
  const items: InlineNode[][] = [];
  for (let i = 0; i < element.children.length; i += 1) {
    const item = element.children[i];
    if (item.tagName?.toLowerCase() === 'li') {
      items.push(parseInline(item));
    }
  }
  return { type: 'list', ordered, items, id };
}

function parseTable(element: DomElement, id: string): DocumentBlock {
  const rows: InlineNode[][][] = [];
  let hasHeader = false;
  const trs = element.querySelectorAll('tr');
  for (let r = 0; r < trs.length; r += 1) {
    const cells: InlineNode[][] = [];
    const tr = trs[r];
    for (let c = 0; c < tr.children.length; c += 1) {
      const cell = tr.children[c];
      const tag = cell.tagName?.toLowerCase();
      if (tag === 'td' || tag === 'th') {
        if (tag === 'th' && r === 0) hasHeader = true;
        cells.push(parseInline(cell));
      }
    }
    if (cells.length > 0) rows.push(cells);
  }
  const captionEl = element.querySelectorAll('caption')[0];
  const caption = captionEl ? (captionEl.textContent ?? '').trim() || undefined : undefined;
  return { type: 'table', rows, hasHeader, caption, id };
}

/**
 * Converts a chapter HTML string into semantic blocks. Unknown or
 * unsupported markup degrades to paragraphs, never throws.
 */
export function htmlToBlocks(html: string): DocumentBlock[] {
  const runtime = getPaginationDomRuntime();
  if (!runtime) {
    return [];
  }
  const parsed = new runtime.DOMParser().parseFromString(
    `<body>${html}</body>`,
    'text/html',
  );
  const body = parsed.querySelector('body');
  if (!body) return [];

  const blocks: DocumentBlock[] = [];
  const push = (block: DocumentBlock) => blocks.push(block);
  let counter = 0;
  const nextId = (tag: string) => {
    counter += 1;
    return `h-${counter}-${tag}`;
  };

  for (let i = 0; i < body.children.length; i += 1) {
    const el = body.children[i] as unknown as DomElement;
    const tag = el.tagName.toLowerCase();
    const level = headingLevel(tag);

    if (level) {
      push({ type: 'heading', level, content: parseInline(el), id: nextId(tag) });
    } else if (tag === 'p') {
      push({ type: 'paragraph', content: parseInline(el), id: nextId(tag) });
    } else if (tag === 'ul' || tag === 'ol') {
      push(parseList(el, tag === 'ol', nextId(tag)));
    } else if (tag === 'table') {
      push(parseTable(el, nextId(tag)));
    } else if (tag === 'blockquote') {
      push({ type: 'quote', content: parseInline(el), id: nextId(tag) });
    } else if (tag === 'pre') {
      push({ type: 'code', code: el.textContent ?? '', id: nextId(tag) });
    } else if (tag === 'img') {
      const src = el.getAttribute('src');
      if (src) {
        push({
          type: 'image',
          src,
          alt: el.getAttribute('alt') ?? undefined,
          id: nextId(tag),
        });
      }
    } else if (tag === 'figure') {
      const img = el.querySelectorAll('img')[0];
      const caption = el.querySelectorAll('figcaption')[0];
      if (img?.getAttribute('src')) {
        push({
          type: 'image',
          src: img.getAttribute('src') as string,
          alt: img.getAttribute('alt') ?? undefined,
          caption: caption ? (caption.textContent ?? '').trim() || undefined : undefined,
          id: nextId(tag),
        });
      }
    } else if (tag === 'hr' && el.getAttribute('data-page-break')) {
      push({ type: 'pageBreak', id: nextId(tag) });
    } else if (tag === 'div' || tag === 'section') {
      // Unwrap generic containers one level deep (callouts, wrappers).
      const inner = htmlToBlocks(el.outerHTML ?? '');
      if (inner.length > 0) {
        blocks.push(...inner);
      } else {
        push({ type: 'paragraph', content: parseInline(el), id: nextId(tag) });
      }
    }
  }

  return ensureBlockIds(blocks);
}

/**
 * Builds a full semantic document from chapter HTML fragments, in order.
 * Metadata is supplied by the caller (project record) since HTML carries none.
 */
export function htmlToDocument(
  chapterHtmlList: string[],
  metadata: SemanticDocument['metadata'],
): SemanticDocument {
  const blocks = chapterHtmlList.flatMap((html) => htmlToBlocks(html));
  return { version: 1, metadata, blocks: ensureBlockIds(blocks) };
}
