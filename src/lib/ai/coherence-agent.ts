/**
 * Coherence agent (F3) — live references / TOC coherence over the AST.
 *
 * Detection is pure and deterministic (`analyzeCoherence`):
 * - `broken-ref`: a live `ref` inline token whose `targetId` no longer
 *   exists in the document (deleted heading/figure/table);
 * - `duplicate-heading`: two headings with the same normalized text at the
 *   same level (ambiguous TOC entries and ref targets);
 * - `missing-chapter-heading`: a chapter slice (beyond the front matter)
 *   that opens without a level-1 heading.
 *
 * Fixes are proposals as AST diffs (accept/reject by a human), never direct
 * writes: a broken ref is materialized to plain text (its fallback), a
 * duplicated heading is renamed. Missing chapter headings are advisory only
 * (R6: inventing a chapter title is editorial, never automatic). An optional
 * LLM pass (cloud-declared) can suggest better deduplication titles; its
 * response is schema-validated and falls back to numeric suffixes.
 */

import { z } from 'zod';
import { splitChapters } from '@/lib/compose/compose';
import {
  inlineToPlainText,
  type DocumentBlock,
  type HeadingBlock,
  type InlineNode,
  type SemanticDocument,
} from '@/lib/document/model';
import {
  createProposal,
  createProposalIdentity,
  type AiProposal,
  type BlockOperation,
  type ProposalIdentity,
} from './ast-diff-proposal';
import type { AiProvider } from './provider';
import type { AiLocale, AiProcessingMode } from './structural-assistant';

export type CoherenceIssueType = 'broken-ref' | 'duplicate-heading' | 'missing-chapter-heading';

export interface CoherenceIssue {
  type: CoherenceIssueType;
  /** Block where the problem lives (slice's first block for missing headings). */
  blockId: string;
  /** broken-ref: unresolved ref target id. */
  targetId?: string;
  /** duplicate-heading: normalized text and level of the repeated heading. */
  headingText?: string;
  level?: number;
}

export interface CoherenceAgentResult {
  issues: CoherenceIssue[];
  proposals: AiProposal[];
  mode: AiProcessingMode;
}

function eachInlineFlow(block: DocumentBlock, visit: (nodes: InlineNode[]) => void): void {
  switch (block.type) {
    case 'heading':
    case 'paragraph':
    case 'quote':
    case 'callout':
      visit(block.content);
      break;
    case 'list':
      block.items.forEach(visit);
      break;
    case 'table':
      block.rows.forEach((row) => row.forEach(visit));
      break;
    default:
      break;
  }
}

function mapInlineFlows(block: DocumentBlock, map: (nodes: InlineNode[]) => InlineNode[]): DocumentBlock {
  switch (block.type) {
    case 'heading':
    case 'paragraph':
    case 'quote':
    case 'callout':
      return { ...block, content: map(block.content) };
    case 'list':
      return { ...block, items: block.items.map(map) };
    case 'table':
      return { ...block, rows: block.rows.map((row) => row.map(map)) };
    default:
      return block;
  }
}

function normalizeHeadingText(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Pure detection pass over the AST. */
export function analyzeCoherence(document: SemanticDocument): CoherenceIssue[] {
  const issues: CoherenceIssue[] = [];
  const blockIds = new Set(document.blocks.map((block) => block.id));

  for (const block of document.blocks) {
    const brokenTargets = new Set<string>();
    eachInlineFlow(block, (nodes) => {
      for (const node of nodes) {
        if (node.type === 'ref' && !blockIds.has(node.targetId)) {
          brokenTargets.add(node.targetId);
        }
      }
    });
    for (const targetId of brokenTargets) {
      issues.push({ type: 'broken-ref', blockId: block.id, targetId });
    }
  }

  const seenHeadings = new Map<string, string>();
  for (const block of document.blocks) {
    if (block.type !== 'heading') continue;
    const text = normalizeHeadingText(inlineToPlainText(block.content));
    if (!text) continue;
    const key = `${block.level}:${text}`;
    const firstId = seenHeadings.get(key);
    if (firstId === undefined) {
      seenHeadings.set(key, block.id);
    } else {
      issues.push({
        type: 'duplicate-heading',
        blockId: block.id,
        headingText: inlineToPlainText(block.content),
        level: block.level,
      });
    }
  }

  // Chapter slices beyond the front matter that open without a level-1 heading.
  const slices = splitChapters(document.blocks, 1);
  slices.forEach((slice, index) => {
    if (index === 0) return; // front matter is not a chapter
    if (slice.heading === null && slice.blocks.length > 0) {
      issues.push({ type: 'missing-chapter-heading', blockId: slice.blocks[0].id });
    }
  });

  return issues;
}

const SUMMARIES = {
  brokenRef: {
    es: (targetId: string) =>
      `Sustituir la referencia rota a «${targetId}» por texto plano (su contenido alternativo).`,
    en: (targetId: string) =>
      `Replace the broken reference to "${targetId}" with plain text (its fallback).`,
  },
  duplicateHeading: {
    es: (text: string, suggestion: string) => `Renombrar el encabezado duplicado «${text}» a «${suggestion}».`,
    en: (text: string, suggestion: string) => `Rename the duplicated heading "${text}" to "${suggestion}".`,
  },
  missingChapterHeading: {
    es: () =>
      'Capítulo sin encabezado de nivel 1; el título es una decisión editorial: añádelo manualmente.',
    en: () =>
      'Chapter without a level-1 heading; the title is an editorial decision: add it manually.',
  },
} as const;

function brokenRefFix(
  document: SemanticDocument,
  issue: CoherenceIssue,
  locale: AiLocale,
): { kind: 'broken-ref'; summary: string; operations: BlockOperation[] } | null {
  const block = document.blocks.find((candidate) => candidate.id === issue.blockId);
  if (!block || !issue.targetId) return null;
  const after = mapInlineFlows(block, (nodes) =>
    nodes.map((node) =>
      node.type === 'ref' && node.targetId === issue.targetId
        ? ({ type: 'text', text: node.fallback ?? '' } satisfies InlineNode)
        : node,
    ),
  );
  if (JSON.stringify(after) === JSON.stringify(block)) return null;
  return {
    kind: 'broken-ref',
    summary: SUMMARIES.brokenRef[locale](issue.targetId),
    operations: [{ type: 'update', blockId: block.id, before: block, after }],
  };
}

function renameHeading(
  heading: HeadingBlock,
  title: string,
): HeadingBlock {
  // Replace the heading text keeping inline structure minimal: the renamed
  // title becomes the whole flow (a heading is a single short text run).
  return { ...heading, content: [{ type: 'text', text: title }] };
}

const llmRenameResponseSchema = z.object({
  renames: z.array(
    z.object({
      blockId: z.string().min(1),
      title: z.string().min(1),
    }),
  ),
});

/** Validation boundary for the LLM dedup response (invalid → empty). */
export function parseLlmRenameResponse(raw: unknown): Array<{ blockId: string; title: string }> {
  const parsed = llmRenameResponseSchema.safeParse(raw);
  return parsed.success ? parsed.data.renames : [];
}

const LLM_RENAME_JSON_SCHEMA = {
  type: 'object',
  properties: {
    renames: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          blockId: { type: 'string' },
          title: { type: 'string' },
        },
        required: ['blockId', 'title'],
        additionalProperties: false,
      },
    },
  },
  required: ['renames'],
  additionalProperties: false,
};

/**
 * Detection + fix proposals. With a cloud provider, duplicated headings get
 * LLM-suggested unique titles (schema-validated); anything invalid falls
 * back to deterministic numeric suffixes.
 */
export async function proposeCoherenceFixes(
  document: SemanticDocument,
  options: {
    provider?: AiProvider;
    locale?: AiLocale;
    identity?: () => ProposalIdentity;
  } = {},
): Promise<CoherenceAgentResult> {
  const locale = options.locale ?? 'es';
  const identity = options.identity ?? createProposalIdentity;
  const issues = analyzeCoherence(document);
  const proposals: AiProposal[] = [];
  let mode: AiProcessingMode = 'local';

  for (const issue of issues) {
    if (issue.type === 'broken-ref') {
      const fix = brokenRefFix(document, issue, locale);
      if (fix) proposals.push(createProposal(fix, document, identity()));
    }
  }

  const duplicates = issues.filter((issue) => issue.type === 'duplicate-heading');

  // Optional LLM titles for duplicated headings (validated before use).
  const llmTitles = new Map<string, string>();
  if (options.provider && options.provider.kind !== 'none' && duplicates.length > 0) {
    try {
      const raw = await options.provider.completeJson({
        prompt: [
          'These headings are duplicated in a book. Suggest a unique, faithful',
          'title for each blockId (same language as the original title).',
          JSON.stringify(
            duplicates.map((issue) => ({ blockId: issue.blockId, title: issue.headingText })),
          ),
        ].join('\n'),
        schema: LLM_RENAME_JSON_SCHEMA,
        schemaName: 'heading_dedup',
      });
      const duplicateIds = new Set(duplicates.map((issue) => issue.blockId));
      const usedTitles = new Set(
        document.blocks
          .filter((block) => block.type === 'heading')
          .map((block) => normalizeHeadingText(inlineToPlainText((block as HeadingBlock).content))),
      );
      for (const rename of parseLlmRenameResponse(raw)) {
        if (!duplicateIds.has(rename.blockId)) continue;
        if (usedTitles.has(normalizeHeadingText(rename.title))) continue;
        llmTitles.set(rename.blockId, rename.title);
        usedTitles.add(normalizeHeadingText(rename.title));
      }
    } catch {
      // Provider failure → deterministic suffix fallback below.
    }
  }

  const suffixByBlockId = new Map<string, number>();
  for (const issue of duplicates) {
    const heading = document.blocks.find((block) => block.id === issue.blockId);
    if (!heading || heading.type !== 'heading') continue;
    const base = inlineToPlainText(heading.content);
    const suggested = llmTitles.get(issue.blockId);
    let title = suggested;
    if (!title) {
      const suffix = (suffixByBlockId.get(base) ?? 1) + 1;
      suffixByBlockId.set(base, suffix);
      title = `${base} (${suffix})`;
    }
    if (suggested) mode = 'cloud';
    proposals.push(
      createProposal(
        {
          kind: 'duplicate-heading',
          summary: SUMMARIES.duplicateHeading[locale](base, title),
          operations: [
            { type: 'update', blockId: heading.id, before: heading, after: renameHeading(heading, title) },
          ],
        },
        document,
        identity(),
      ),
    );
  }

  for (const issue of issues) {
    if (issue.type !== 'missing-chapter-heading') continue;
    proposals.push(
      createProposal(
        {
          kind: 'chapter-heading',
          summary: SUMMARIES.missingChapterHeading[locale](),
          operations: [],
        },
        document,
        identity(),
      ),
    );
  }

  return { issues, proposals, mode };
}
