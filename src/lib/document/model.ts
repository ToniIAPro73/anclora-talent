/**
 * Semantic Document Model — Anclora Talent (FASE C)
 *
 * Canonical typed representation of project content as a block tree.
 * This model is the single source of truth for content: the rich editor
 * and the DOCX importer produce it, the composition engine consumes it,
 * and it is persisted as JSON on the project record.
 *
 * Design notes:
 * - Plain serializable objects only (no class instances, no Maps) so the
 *   document can be stored as JSONB and diffed structurally.
 * - Every block carries a stable `id` so the composer can anchor
 *   incremental recomposition and cross-reference tokens can target it.
 * - Cross references are *live tokens* (`ref` inline nodes), never plain
 *   text: their visible label is materialized by the composition engine. */

import type { CompositionSettings } from '@/lib/projects/composition';

export type InlineMarkType = 'bold' | 'italic' | 'link';

export interface InlineMark {
  type: InlineMarkType;
  /** Only for `link` marks. */
  href?: string;
}

export interface TextInlineNode {
  type: 'text';
  text: string;
  marks?: InlineMark[];
}

export type RefKind = 'chapter' | 'figure' | 'table';

/**
 * Live cross-reference token. `targetId` points at the id of a chapter
 * heading, an image block (figure) or a table block. The composition
 * engine resolves it to a concrete label (e.g. "3", "2.1") on every run.
 */
export interface RefInlineNode {
  type: 'ref';
  refKind: RefKind;
  targetId: string;
  /** Optional text to show if the target cannot be resolved. */
  fallback?: string;
}

export type InlineNode = TextInlineNode | RefInlineNode;

interface BlockBase {
  id: string;
}

export interface HeadingBlock extends BlockBase {
  type: 'heading';
  level: 1 | 2 | 3 | 4 | 5 | 6;
  content: InlineNode[];
}

export interface ParagraphBlock extends BlockBase {
  type: 'paragraph';
  content: InlineNode[];
}

export interface ListBlock extends BlockBase {
  type: 'list';
  ordered: boolean;
  /** One inline flow per item. */
  items: InlineNode[][];
}

export interface TableBlock extends BlockBase {
  type: 'table';
  /** Rows of cells; each cell is an inline flow. First row may be a header. */
  rows: InlineNode[][][];
  hasHeader: boolean;
  caption?: string;
}

export interface ImageBlock extends BlockBase {
  type: 'image';
  src: string;
  alt?: string;
  caption?: string;
  /** Estimated height in base lines used by the composer before real layout. */
  estimatedLines?: number;
}

export interface QuoteBlock extends BlockBase {
  type: 'quote';
  content: InlineNode[];
}

export type CalloutKind = 'note' | 'info' | 'tip' | 'warning';

export interface CalloutBlock extends BlockBase {
  type: 'callout';
  kind: CalloutKind;
  content: InlineNode[];
}

export interface CodeBlock extends BlockBase {
  type: 'code';
  language?: string;
  code: string;
}

export interface PageBreakBlock extends BlockBase {
  type: 'pageBreak';
}

export type DocumentBlock =
  | HeadingBlock
  | ParagraphBlock
  | ListBlock
  | TableBlock
  | ImageBlock
  | QuoteBlock
  | CalloutBlock
  | CodeBlock
  | PageBreakBlock;

export type DocumentBlockType = DocumentBlock['type'];

/**
 * Digital product metadata (C7). Lives inside the document model so it is
 * the single source injected into front matter, TOC, footer and export.
 * cover-studio will read it through the model resolvers in a later phase.
 */
export interface DocumentMetadata {
  title: string;
  subtitle?: string;
  author?: string;
  isbn?: string;
  description?: string;
  keywords?: string[];
  language?: string;
  /** U6: per-project composition overrides (hierarchy: project > user > system). */
  composition?: CompositionSettings | null;
  /** U6: explicit "no brand" marker; wins over any default brand profile. */
  brandChoice?: 'none';
}

export interface SemanticDocument {
  version: 1;
  metadata: DocumentMetadata;
  blocks: DocumentBlock[];
}

/** Extracts the plain text of an inline flow (ref tokens use their fallback). */
export function inlineToPlainText(nodes: InlineNode[]): string {
  return nodes
    .map((node) => (node.type === 'text' ? node.text : node.fallback ?? ''))
    .join('')
    .trim();
}

/** djb2 hash, hex-encoded. Used for deterministic block ids from HTML. */
export function stableHash(input: string): string {
  let hash = 5381;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 33) ^ input.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
}

/**
 * Assigns deterministic ids to blocks that lack one, derived from their
 * serialized content. Guarantees uniqueness inside the document by suffix.
 */
export function ensureBlockIds(blocks: DocumentBlock[]): DocumentBlock[] {
  const seen = new Set<string>();
  return blocks.map((block) => {
    if (block.id && !seen.has(block.id)) {
      seen.add(block.id);
      return block;
    }
    const base = `b-${stableHash(JSON.stringify({ ...block, id: undefined }))}`;
    let id = base;
    let counter = 1;
    while (seen.has(id)) {
      counter += 1;
      id = `${base}-${counter}`;
    }
    seen.add(id);
    return { ...block, id };
  });
}

export function createEmptyDocument(metadata: DocumentMetadata): SemanticDocument {
  return { version: 1, metadata, blocks: [] };
}
