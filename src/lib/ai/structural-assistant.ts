/**
 * Structural assistant (F3, Capa 1) — AI governed by the composition engine.
 *
 * Given the document AST plus engine output (compose violations and/or
 * preflight checks), it produces concrete fix proposals as diffs over the
 * AST (`AiProposal`), never direct writes. Two generation paths:
 *
 * - Deterministic heuristics (always available, no provider): cover the
 *   *safe* cases — a preflight heading jump maps to a concrete heading-level
 *   change; two short paragraphs split by widows/orphans map to a merge.
 *   R6: doubtful cases (oversized keep-together blocks) are NEVER
 *   auto-fixed, only surfaced as advisories without operations.
 * - LLM (optional, cloud-declared): the violation and the affected block are
 *   sent as JSON; the response is schema-validated (zod) and only valid
 *   replacement blocks anchored to existing ids become proposals. Any
 *   provider/parse failure falls back to heuristics — nothing breaks.
 */

import { z } from 'zod';
import type { ComposeViolation } from '@/lib/compose/compose';
import type { PreflightCheck } from '@/lib/preflight/preflight';
import {
  inlineToPlainText,
  type DocumentBlock,
  type HeadingBlock,
  type ParagraphBlock,
  type SemanticDocument,
} from '@/lib/document/model';
import {
  createProposal,
  createProposalIdentity,
  type AiProposal,
  type BlockOperation,
  type ProposalIdentity,
} from './ast-diff-proposal';
import { documentBlockSchema } from './block-schema';
import type { AiProvider } from './provider';

export type AiLocale = 'es' | 'en';
export type AiProcessingMode = 'cloud' | 'local';

export interface StructuralAssistantInput {
  document: SemanticDocument;
  violations?: ComposeViolation[];
  checks?: PreflightCheck[];
  locale?: AiLocale;
}

export interface StructuralAssistantResult {
  proposals: AiProposal[];
  /** 'cloud' when an LLM contributed proposals; heuristics are always local. */
  mode: AiProcessingMode;
}

const HEADING_JUMP_RULE = 'kobo.a11y.headingJump';
/** Combined plain-text length under which merging two paragraphs is safe. */
const MERGE_MAX_CHARS = 280;
/** Violations sent to the LLM in a single bounded prompt. */
const LLM_MAX_VIOLATIONS = 5;

/** Rules the assistant can propose fixes for (UI gating). */
export function isAiFixEligible(rule: string): boolean {
  return (
    rule === 'widowsOrphans' ||
    rule.startsWith('keepTogether') ||
    rule === HEADING_JUMP_RULE
  );
}

const SUMMARIES = {
  headingLevel: {
    es: (text: string, from: number, to: number) =>
      `Corregir jerarquía: «${text}» pasa de H${to} a H${from + 1}.`,
    en: (text: string, from: number, to: number) =>
      `Fix hierarchy: "${text}" moves from H${to} to H${from + 1}.`,
  },
  mergeParagraphs: {
    es: (text: string) => `Unir el párrafo corto «${text}…» con el siguiente para evitar viudas.`,
    en: (text: string) => `Merge the short paragraph "${text}…" with the next one to avoid widows.`,
  },
  oversizedAdvisory: {
    es: (rule: string) =>
      `El bloque supera la capacidad de página (${rule}); no hay autocorrección segura: divide el contenido o relaja la regla manualmente.`,
    en: (rule: string) =>
      `The block exceeds page capacity (${rule}); no safe auto-fix: split the content or relax the rule manually.`,
  },
  widowsAdvisory: {
    es: () =>
      'Párrafo largo partido con viudas/huérfanas; no hay unión segura disponible: revísalo manualmente.',
    en: () =>
      'Long paragraph split with widows/orphans; no safe merge available: review it manually.',
  },
} as const;

function shortText(block: DocumentBlock, max = 60): string {
  const text =
    block.type === 'heading' || block.type === 'paragraph'
      ? inlineToPlainText(block.content)
      : block.id;
  return text.length > max ? text.slice(0, max) : text;
}

function isParagraph(block: DocumentBlock | undefined): block is ParagraphBlock {
  return block?.type === 'paragraph';
}

function headingJumpFix(
  document: SemanticDocument,
  check: PreflightCheck,
  locale: AiLocale,
): { kind: 'heading-level'; summary: string; operations: BlockOperation[] } | null {
  if (!check.blockId) return null;
  const block = document.blocks.find((candidate) => candidate.id === check.blockId);
  if (!block || block.type !== 'heading') return null;
  const from = Number(check.params.from);
  if (!Number.isInteger(from) || from < 1 || from > 5) return null;
  const targetLevel = (from + 1) as HeadingBlock['level'];
  if (block.level <= targetLevel) return null;
  const after: HeadingBlock = { ...block, level: targetLevel };
  return {
    kind: 'heading-level',
    summary: SUMMARIES.headingLevel[locale](shortText(block, 40), from, block.level),
    operations: [{ type: 'update', blockId: block.id, before: block, after }],
  };
}

function widowsOrphansFix(
  document: SemanticDocument,
  violation: ComposeViolation,
  locale: AiLocale,
): { kind: 'merge-paragraphs' | 'advisory'; summary: string; operations: BlockOperation[] } | null {
  const index = document.blocks.findIndex((block) => block.id === violation.blockId);
  const paragraph = document.blocks[index];
  if (!isParagraph(paragraph)) return null;

  // Safe case (R6): both sides short → propose merging with the next paragraph.
  const next = document.blocks[index + 1];
  if (isParagraph(next)) {
    const combined = `${inlineToPlainText(paragraph.content)} ${inlineToPlainText(next.content)}`;
    if (combined.trim().length <= MERGE_MAX_CHARS) {
      const after: ParagraphBlock = {
        ...paragraph,
        content: [...paragraph.content, { type: 'text', text: ' ' }, ...next.content],
      };
      return {
        kind: 'merge-paragraphs',
        summary: SUMMARIES.mergeParagraphs[locale](shortText(paragraph, 40)),
        operations: [
          { type: 'update', blockId: paragraph.id, before: paragraph, after },
          { type: 'remove', block: next, previousBlockId: paragraph.id },
        ],
      };
    }
  }

  return {
    kind: 'advisory',
    summary: SUMMARIES.widowsAdvisory[locale](),
    operations: [],
  };
}

function keepTogetherAdvisory(
  violation: ComposeViolation,
  locale: AiLocale,
): { kind: 'advisory'; summary: string; operations: BlockOperation[] } {
  return {
    kind: 'advisory',
    summary: SUMMARIES.oversizedAdvisory[locale](violation.rule),
    operations: [],
  };
}

const llmFixResponseSchema = z.object({
  suggestions: z.array(
    z.object({
      summary: z.string().min(1),
      replacementBlock: documentBlockSchema.optional(),
    }),
  ),
});

export type LlmFixSuggestion = z.infer<typeof llmFixResponseSchema>['suggestions'][number];

/**
 * Validation boundary for LLM output: parses the raw completion and returns
 * only well-formed suggestions. Invalid JSON/shapes yield an empty list.
 */
export function parseLlmFixResponse(raw: unknown): LlmFixSuggestion[] {
  const parsed = llmFixResponseSchema.safeParse(raw);
  return parsed.success ? parsed.data.suggestions : [];
}

function buildLlmPrompt(document: SemanticDocument, violations: ComposeViolation[]): string {
  const blockById = new Map(document.blocks.map((block) => [block.id, block]));
  const items = violations.map((violation) => ({
    rule: violation.rule,
    message: violation.message,
    block: blockById.get(violation.blockId) ?? null,
  }));
  return [
    'You are fixing composition violations in a semantic document (block AST).',
    'For each violation suggest at most one fix. To change a block, return its',
    'COMPLETE replacement in `replacementBlock`, keeping the SAME block `id`',
    'and a valid block shape. Omit `replacementBlock` when there is no safe fix.',
    'Never invent new block ids. Never rewrite content beyond what the fix needs.',
    `Violations with affected blocks (JSON):\n${JSON.stringify(items, null, 2)}`,
  ].join('\n');
}

const LLM_RESPONSE_JSON_SCHEMA = {
  type: 'object',
  properties: {
    suggestions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          summary: { type: 'string' },
          replacementBlock: { type: 'object' },
        },
        required: ['summary'],
        additionalProperties: false,
      },
    },
  },
  required: ['suggestions'],
  additionalProperties: false,
};

/**
 * Generates fix proposals for the given engine violations/preflight checks.
 * `provider` is optional: without one (or when it is the NullProvider) only
 * deterministic heuristics run. `identity` is injectable for tests.
 */
export async function proposeStructuralFixes(
  input: StructuralAssistantInput,
  provider?: AiProvider,
  identity: () => ProposalIdentity = createProposalIdentity,
): Promise<StructuralAssistantResult> {
  const locale = input.locale ?? 'es';
  const violations = input.violations ?? [];
  const checks = input.checks ?? [];
  const proposals: AiProposal[] = [];

  // 1. Deterministic heuristics (safe cases auto-fixable, rest advisory).
  for (const check of checks) {
    if (check.rule !== HEADING_JUMP_RULE) continue;
    const fix = headingJumpFix(input.document, check, locale);
    if (fix) proposals.push(createProposal(fix, input.document, identity()));
  }
  for (const violation of violations) {
    if (violation.rule === 'widowsOrphans') {
      const fix = widowsOrphansFix(input.document, violation, locale);
      if (fix) proposals.push(createProposal(fix, input.document, identity()));
    } else if (violation.rule.startsWith('keepTogether')) {
      proposals.push(createProposal(keepTogetherAdvisory(violation, locale), input.document, identity()));
    }
  }

  // 2. Optional LLM pass over the same violations (cloud-declared).
  let mode: AiProcessingMode = 'local';
  if (provider && provider.kind !== 'none' && violations.length > 0) {
    try {
      const raw = await provider.completeJson({
        prompt: buildLlmPrompt(input.document, violations.slice(0, LLM_MAX_VIOLATIONS)),
        schema: LLM_RESPONSE_JSON_SCHEMA,
        schemaName: 'structural_fixes',
      });
      const blockIds = new Set(input.document.blocks.map((block) => block.id));
      const blockById = new Map(input.document.blocks.map((block) => [block.id, block]));
      for (const suggestion of parseLlmFixResponse(raw)) {
        const replacement = suggestion.replacementBlock;
        if (!replacement || !blockIds.has(replacement.id)) continue;
        const before = blockById.get(replacement.id);
        if (!before || JSON.stringify(before) === JSON.stringify(replacement)) continue;
        proposals.push(
          createProposal(
            {
              kind: 'llm-suggested',
              summary: suggestion.summary,
              operations: [{ type: 'update', blockId: replacement.id, before, after: replacement }],
            },
            input.document,
            identity(),
          ),
        );
        mode = 'cloud';
      }
    } catch {
      // Provider/transport/parse failure: heuristics already cover the safe
      // cases; the integration degrades to local mode without breaking.
    }
  }

  return { proposals, mode };
}
