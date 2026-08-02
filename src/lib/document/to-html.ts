/**
 * SemanticDocument → HTML serializer.
 *
 * Produces the HTML dialect the existing pipeline already understands
 * (TipTap editor, preview flow, export builder), including page-break
 * markers (`<hr data-page-break="manual">`) and ref tokens as
 * `<span data-ref-kind data-ref-target>` carrying the resolved label
 * computed by the last composition (or the fallback text).
 */

import {
  DocumentBlock,
  InlineMark,
  InlineNode,
  SemanticDocument,
} from './model';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Resolved labels for ref tokens, keyed by targetId (from ComposeResult.refs). */
export type ResolvedRefs = Record<string, string>;

function serializeInline(nodes: InlineNode[], refs?: ResolvedRefs): string {
  return nodes
    .map((node) => {
      if (node.type === 'ref') {
        const label = refs?.[node.targetId] ?? node.fallback ?? '';
        return (
          `<span data-ref-kind="${node.refKind}" data-ref-target="${escapeHtml(node.targetId)}">` +
          `${escapeHtml(label)}</span>`
        );
      }
      let text = escapeHtml(node.text).replace(/\n/g, '<br/>');
      const marks = [...(node.marks ?? [])];
      // Deterministic mark nesting order: link outermost, then bold, then italic.
      const applyMark = (mark: InlineMark, inner: string): string => {
        if (mark.type === 'bold') return `<strong>${inner}</strong>`;
        if (mark.type === 'italic') return `<em>${inner}</em>`;
        return `<a href="${escapeHtml(mark.href ?? '')}">${inner}</a>`;
      };
      for (const mark of marks.filter((m) => m.type === 'italic')) text = applyMark(mark, text);
      for (const mark of marks.filter((m) => m.type === 'bold')) text = applyMark(mark, text);
      for (const mark of marks.filter((m) => m.type === 'link')) text = applyMark(mark, text);
      return text;
    })
    .join('');
}

function serializeBlock(block: DocumentBlock, refs?: ResolvedRefs): string {
  switch (block.type) {
    case 'heading':
      return `<h${block.level}>${serializeInline(block.content, refs)}</h${block.level}>`;
    case 'paragraph':
      return `<p>${serializeInline(block.content, refs)}</p>`;
    case 'list': {
      const tag = block.ordered ? 'ol' : 'ul';
      const items = block.items.map((item) => `<li>${serializeInline(item, refs)}</li>`).join('');
      return `<${tag}>${items}</${tag}>`;
    }
    case 'table': {
      const rows = block.rows
        .map((row, rowIndex) => {
          const cellTag = block.hasHeader && rowIndex === 0 ? 'th' : 'td';
          const cells = row
            .map((cell) => `<${cellTag}>${serializeInline(cell, refs)}</${cellTag}>`)
            .join('');
          return `<tr>${cells}</tr>`;
        })
        .join('');
      const caption = block.caption ? `<caption>${escapeHtml(block.caption)}</caption>` : '';
      return `<table>${caption}${rows}</table>`;
    }
    case 'image': {
      const alt = block.alt ? ` alt="${escapeHtml(block.alt)}"` : '';
      const img = `<img src="${escapeHtml(block.src)}"${alt}/>`;
      if (block.caption) {
        return `<figure>${img}<figcaption>${escapeHtml(block.caption)}</figcaption></figure>`;
      }
      return img;
    }
    case 'quote':
      return `<blockquote>${serializeInline(block.content, refs)}</blockquote>`;
    case 'callout':
      return `<div data-callout="${block.kind}">${serializeInline(block.content, refs)}</div>`;
    case 'code': {
      const lang = block.language ? ` data-language="${escapeHtml(block.language)}"` : '';
      return `<pre${lang}><code>${escapeHtml(block.code)}</code></pre>`;
    }
    case 'pageBreak':
      return '<hr data-page-break="manual"/>';
  }
}

/** Serializes blocks to HTML in document order. */
export function blocksToHtml(blocks: DocumentBlock[], refs?: ResolvedRefs): string {
  return blocks.map((block) => serializeBlock(block, refs)).join('');
}

/** Serializes a full document body (metadata is not part of the body HTML). */
export function documentToHtml(document: SemanticDocument, refs?: ResolvedRefs): string {
  return blocksToHtml(document.blocks, refs);
}
