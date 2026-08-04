/**
 * Co-author (F3, Capa 2) — AI as editorial assistant with human gates.
 *
 * Three LLM operations, ALL of them producing an `AiProposal` (a diff over
 * the document AST) — never loose text and never a direct write:
 *
 * a. Style rewrite (`proposeStyleRewrite`): rewrites the paragraphs of one
 *    chapter keeping the ideas. When the project has an active BrandProfile,
 *    its voice pairs ("sounds like" / "doesn't sound like", F2) are injected
 *    as few-shot contrast examples; without a profile the prompt asks for a
 *    conservative neutral style. Each rewritten paragraph becomes one
 *    `update` operation with full before/after. Paragraphs containing live
 *    ref tokens are skipped (rewriting would flatten them).
 * b. Content architecture (`proposeChapterArchitecture`): given a chapter,
 *    proposes a restructure — moving blocks and splitting long sections into
 *    subsections with proposed headings — as `move`/`insert` operations.
 *    Inserted heading ids are generated server-side; the LLM only anchors
 *    against existing block ids.
 * c. Derived summary (`proposeDerivedSummary`): from the whole AST (not
 *    plain text), proposes a new "Resumen"/"Summary" chapter appended at the
 *    END of the same document as `insert` operations. Rationale: appending
 *    to the current document is the simplest option coherent with R3 — the
 *    accepted proposal flows through the existing save route like any other
 *    edit, with no parallel project-creation path.
 *
 * Governance rules shared by the three:
 * - LLM is mandatory: without a cloud provider the operation is unavailable
 *   (`available: false`) — the UI declares this and hides the entry point;
 *   there is no fake local heuristic for creative rewriting.
 * - The LLM response is schema-validated (zod); an invalid response yields
 *   NO proposal (`proposal: null`) — a corrupt diff never reaches the UI.
 * - Every result declares `mode: 'cloud'` (processing transparency, F1b).
 */

import { z } from 'zod';
import { splitChapters, type ChapterSlice } from '@/lib/compose/compose';
import {
  inlineToPlainText,
  type DocumentBlock,
  type HeadingBlock,
  type ParagraphBlock,
  type SemanticDocument,
} from '@/lib/document/model';
import type { BrandVoicePair } from '@/lib/brand/brand-profile';
import {
  createProposal,
  createProposalIdentity,
  type AiProposal,
  type BlockOperation,
  type ProposalIdentity,
} from './ast-diff-proposal';
import type { AiProvider } from './provider';
import type { AiLocale, AiProcessingMode } from './structural-assistant';

export type CoAuthorOperation = 'style' | 'architecture' | 'summary';

export interface CoAuthorChapter {
  /** Stable anchor: id of the first block of the chapter slice. */
  key: string;
  title: string;
}

export interface CoAuthorInput {
  document: SemanticDocument;
  /** Chapter anchor (`CoAuthorChapter.key`); required by style/architecture. */
  chapterKey?: string;
  /** Voice contrast pairs from the active BrandProfile (F2), if any. */
  voicePairs?: BrandVoicePair[];
  locale?: AiLocale;
}

export interface CoAuthorResult {
  /** Null when the operation is unavailable or the LLM output did not validate. */
  proposal: AiProposal | null;
  /** Co-author operations always run in the cloud when they run at all. */
  mode: AiProcessingMode;
  /** False without a cloud provider — the operation does not exist locally. */
  available: boolean;
}

/** Paragraphs sent to the LLM in a single bounded style-rewrite prompt. */
const STYLE_MAX_PARAGRAPHS = 12;
/** Blocks sent to the LLM in a single bounded architecture prompt. */
const ARCHITECTURE_MAX_BLOCKS = 40;
/** Characters of document outline sent to the summary prompt. */
const SUMMARY_MAX_OUTLINE_CHARS = 6000;

const UNAVAILABLE: Pick<CoAuthorResult, 'proposal' | 'mode' | 'available'> = {
  proposal: null,
  mode: 'cloud',
  available: false,
};

function hasProvider(provider?: AiProvider): provider is AiProvider {
  return Boolean(provider && provider.kind !== 'none');
}

// ── Chapter resolution ───────────────────────────────────────────────────────

function blockPreview(block: DocumentBlock, max = 80): string {
  const text =
    block.type === 'heading' ||
    block.type === 'paragraph' ||
    block.type === 'quote' ||
    block.type === 'callout'
      ? inlineToPlainText(block.content)
      : block.type === 'code'
        ? block.code
        : block.type;
  const trimmed = text.trim();
  return trimmed.length > max ? `${trimmed.slice(0, max)}…` : trimmed;
}

function chapterHeadingText(slice: ChapterSlice): string {
  return slice.heading?.type === 'heading' ? inlineToPlainText(slice.heading.content) : '';
}

/**
 * Lists the document chapters as co-author targets, using the engine's
 * `splitChapters` (level-1 headings) so the keys anchor real AST slices.
 */
export function listCoAuthorChapters(document: SemanticDocument): CoAuthorChapter[] {
  return splitChapters(document.blocks, 1)
    .filter((slice) => slice.blocks.length > 0)
    .map((slice) => {
      const first = slice.blocks[0];
      const title = chapterHeadingText(slice) || blockPreview(first, 40);
      return { key: first.id, title: title || first.id };
    });
}

function resolveChapter(document: SemanticDocument, chapterKey: string): ChapterSlice | null {
  const slice = splitChapters(document.blocks, 1).find(
    (candidate) => candidate.blocks[0]?.id === chapterKey,
  );
  return slice ?? null;
}

/** Fresh block id that cannot collide with the document or within a batch. */
function freshBlockId(taken: Set<string>, seed: string): string {
  let id = `ai-${seed}`;
  let counter = 1;
  while (taken.has(id)) {
    counter += 1;
    id = `ai-${seed}-${counter}`;
  }
  taken.add(id);
  return id;
}

// ── a. Style rewrite ─────────────────────────────────────────────────────────

const styleRewriteResponseSchema = z.object({
  rewrites: z.array(
    z.object({
      blockId: z.string().min(1),
      text: z.string().min(1),
    }),
  ),
});

export type StyleRewriteSuggestion = z.infer<typeof styleRewriteResponseSchema>['rewrites'][number];

/** Validation boundary: invalid LLM output yields an empty list, never a throw. */
export function parseStyleRewriteResponse(raw: unknown): StyleRewriteSuggestion[] {
  const parsed = styleRewriteResponseSchema.safeParse(raw);
  return parsed.success ? parsed.data.rewrites : [];
}

/** Paragraphs eligible for rewriting: text-only (live ref tokens are kept safe). */
function rewritableParagraphs(slice: ChapterSlice): ParagraphBlock[] {
  return slice.blocks.filter(
    (block): block is ParagraphBlock =>
      block.type === 'paragraph' &&
      block.content.length > 0 &&
      block.content.every((node) => node.type === 'text'),
  );
}

function buildVoiceSection(voicePairs: BrandVoicePair[] | undefined, locale: AiLocale): string {
  if (!voicePairs || voicePairs.length === 0) {
    return locale === 'en'
      ? 'Style: conservative neutral editorial voice. Improve clarity and rhythm without changing the register.'
      : 'Estilo: voz editorial neutra y conservadora. Mejora claridad y ritmo sin cambiar el registro.';
  }
  const header =
    locale === 'en'
      ? 'Brand voice — rewrite so every paragraph SOUNDS LIKE the examples and never like the counter-examples:'
      : 'Voz de marca — reescribe para que cada párrafo SUENE ASÍ y nunca como los contraejemplos:';
  const pairs = voicePairs
    .slice(0, 6)
    .map((pair) =>
      locale === 'en'
        ? `- SOUNDS LIKE: "${pair.soundsLike}" / DOES NOT SOUND LIKE: "${pair.doesntSoundLike}"`
        : `- ASÍ SUENA: "${pair.soundsLike}" / ASÍ NO SUENA: "${pair.doesntSoundLike}"`,
    )
    .join('\n');
  return `${header}\n${pairs}`;
}

function buildStylePrompt(
  paragraphs: ParagraphBlock[],
  voicePairs: BrandVoicePair[] | undefined,
  locale: AiLocale,
): string {
  const items = paragraphs.map((block) => ({
    blockId: block.id,
    text: inlineToPlainText(block.content),
  }));
  const instructions =
    locale === 'en'
      ? [
          'You are an editorial style assistant rewriting paragraphs of a book chapter.',
          'Rewrite EACH paragraph keeping its ideas and facts intact; do not add or remove content.',
          'Return one entry per paragraph with the SAME blockId and the full rewritten text.',
        ]
      : [
          'Eres un asistente editorial de estilo que reescribe párrafos de un capítulo.',
          'Reescribe CADA párrafo manteniendo intactas sus ideas y datos; no añadas ni quites contenido.',
          'Devuelve una entrada por párrafo con el MISMO blockId y el texto reescrito completo.',
        ];
  return [
    ...instructions,
    buildVoiceSection(voicePairs, locale),
    `Paragraphs (JSON):\n${JSON.stringify(items, null, 2)}`,
  ].join('\n');
}

const STYLE_RESPONSE_JSON_SCHEMA = {
  type: 'object',
  properties: {
    rewrites: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          blockId: { type: 'string' },
          text: { type: 'string' },
        },
        required: ['blockId', 'text'],
        additionalProperties: false,
      },
    },
  },
  required: ['rewrites'],
  additionalProperties: false,
};

/**
 * Style rewrite of one chapter as a single accept/rejectable proposal.
 * LLM-obligatory: without a provider the result is `available: false`.
 */
export async function proposeStyleRewrite(
  input: CoAuthorInput,
  provider?: AiProvider,
  identity: () => ProposalIdentity = createProposalIdentity,
): Promise<CoAuthorResult> {
  if (!hasProvider(provider)) return UNAVAILABLE;
  const locale = input.locale ?? 'es';
  const slice = input.chapterKey ? resolveChapter(input.document, input.chapterKey) : null;
  if (!slice) return { proposal: null, mode: 'cloud', available: true };

  const paragraphs = rewritableParagraphs(slice).slice(0, STYLE_MAX_PARAGRAPHS);
  if (paragraphs.length === 0) return { proposal: null, mode: 'cloud', available: true };

  let suggestions: StyleRewriteSuggestion[];
  try {
    const raw = await provider.completeJson({
      prompt: buildStylePrompt(paragraphs, input.voicePairs, locale),
      schema: STYLE_RESPONSE_JSON_SCHEMA,
      schemaName: 'style_rewrite',
    });
    suggestions = parseStyleRewriteResponse(raw);
  } catch {
    return { proposal: null, mode: 'cloud', available: true };
  }

  const eligible = new Map(paragraphs.map((block) => [block.id, block]));
  const operations: BlockOperation[] = [];
  for (const suggestion of suggestions) {
    const before = eligible.get(suggestion.blockId);
    if (!before) continue;
    const text = suggestion.text.trim();
    if (!text || text === inlineToPlainText(before.content)) continue;
    const after: ParagraphBlock = { ...before, content: [{ type: 'text', text }] };
    operations.push({ type: 'update', blockId: before.id, before, after });
  }

  if (operations.length === 0) return { proposal: null, mode: 'cloud', available: true };

  const chapterTitle = chapterHeadingText(slice);
  const summary =
    locale === 'en'
      ? `Rewrite ${operations.length} paragraph(s) of "${chapterTitle}" keeping the ideas (editorial style).`
      : `Reescribir ${operations.length} párrafo(s) de «${chapterTitle}» manteniendo las ideas (estilo editorial).`;

  return {
    proposal: createProposal(
      { kind: 'style-rewrite', summary, operations },
      input.document,
      identity(),
    ),
    mode: 'cloud',
    available: true,
  };
}

// ── b. Content architecture ──────────────────────────────────────────────────

const architectureResponseSchema = z.object({
  moves: z
    .array(
      z.object({
        blockId: z.string().min(1),
        afterBlockId: z.string().min(1),
      }),
    )
    .default([]),
  headings: z
    .array(
      z.object({
        afterBlockId: z.string().min(1),
        text: z.string().min(1),
        level: z.union([z.literal(2), z.literal(3)]).default(2),
      }),
    )
    .default([]),
});

export type ArchitectureSuggestion = z.infer<typeof architectureResponseSchema>;

/** Validation boundary: invalid LLM output yields null, never a throw. */
export function parseArchitectureResponse(raw: unknown): ArchitectureSuggestion | null {
  const parsed = architectureResponseSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

function buildArchitecturePrompt(slice: ChapterSlice, locale: AiLocale): string {
  const items = slice.blocks.slice(0, ARCHITECTURE_MAX_BLOCKS).map((block) => ({
    blockId: block.id,
    type: block.type,
    preview: blockPreview(block, 60),
  }));
  const instructions =
    locale === 'en'
      ? [
          'You are a content architect restructuring a book chapter (block AST).',
          'Propose: (1) moves to regroup blocks that belong together, and',
          '(2) subsection headings (level 2-3) that split long stretches of text,',
          'each anchored AFTER an existing block. Only reference existing blockIds.',
          'Do not rewrite content. If the chapter is already well structured, return empty arrays.',
        ]
      : [
          'Eres un arquitecto de contenido que reestructura un capítulo (AST de bloques).',
          'Propón: (1) movimientos para reagrupar bloques afines y',
          '(2) encabezados de subsección (nivel 2-3) que dividan tramos largos de texto,',
          'cada uno anclado DESPUÉS de un bloque existente. Referencia solo blockIds existentes.',
          'No reescribas contenido. Si el capítulo ya está bien estructurado, devuelve arrays vacíos.',
        ];
  return [
    ...instructions,
    `Chapter blocks (JSON):\n${JSON.stringify(items, null, 2)}`,
  ].join('\n');
}

const ARCHITECTURE_RESPONSE_JSON_SCHEMA = {
  type: 'object',
  properties: {
    moves: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          blockId: { type: 'string' },
          afterBlockId: { type: 'string' },
        },
        required: ['blockId', 'afterBlockId'],
        additionalProperties: false,
      },
    },
    headings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          afterBlockId: { type: 'string' },
          text: { type: 'string' },
          level: { type: 'number' },
        },
        required: ['afterBlockId', 'text'],
        additionalProperties: false,
      },
    },
  },
  required: ['moves', 'headings'],
  additionalProperties: false,
};

/**
 * Content architecture of one chapter as move/insert operations. LLM-only
 * (no fake local restructure): without a provider, `available: false`.
 */
export async function proposeChapterArchitecture(
  input: CoAuthorInput,
  provider?: AiProvider,
  identity: () => ProposalIdentity = createProposalIdentity,
): Promise<CoAuthorResult> {
  if (!hasProvider(provider)) return UNAVAILABLE;
  const locale = input.locale ?? 'es';
  const slice = input.chapterKey ? resolveChapter(input.document, input.chapterKey) : null;
  if (!slice || slice.blocks.length < 2) return { proposal: null, mode: 'cloud', available: true };

  let suggestion: ArchitectureSuggestion | null;
  try {
    const raw = await provider.completeJson({
      prompt: buildArchitecturePrompt(slice, locale),
      schema: ARCHITECTURE_RESPONSE_JSON_SCHEMA,
      schemaName: 'chapter_architecture',
    });
    suggestion = parseArchitectureResponse(raw);
  } catch {
    return { proposal: null, mode: 'cloud', available: true };
  }
  if (!suggestion) return { proposal: null, mode: 'cloud', available: true };

  const documentIds = new Set(input.document.blocks.map((block) => block.id));
  const chapterIds = new Set(slice.blocks.map((block) => block.id));
  const taken = new Set(documentIds);
  const batch = identity();
  const operations: BlockOperation[] = [];

  for (const move of suggestion.moves) {
    // Moves stay inside the chapter; a block cannot anchor after itself.
    if (!chapterIds.has(move.blockId) || !chapterIds.has(move.afterBlockId)) continue;
    if (move.blockId === move.afterBlockId) continue;
    operations.push({
      type: 'move',
      blockId: move.blockId,
      fromPreviousBlockId: null,
      toPreviousBlockId: move.afterBlockId,
    });
  }

  suggestion.headings.forEach((heading, index) => {
    if (!documentIds.has(heading.afterBlockId)) return;
    const text = heading.text.trim();
    if (!text) return;
    const block: HeadingBlock = {
      id: freshBlockId(taken, `${batch.id}-h${index}`),
      type: 'heading',
      level: heading.level,
      content: [{ type: 'text', text }],
    };
    operations.push({ type: 'insert', previousBlockId: heading.afterBlockId, block });
  });

  if (operations.length === 0) return { proposal: null, mode: 'cloud', available: true };

  const chapterTitle = chapterHeadingText(slice);
  const summary =
    locale === 'en'
      ? `Restructure "${chapterTitle}": ${suggestion.moves.length} move(s), ${suggestion.headings.length} new subsection heading(s).`
      : `Reestructurar «${chapterTitle}»: ${suggestion.moves.length} movimiento(s), ${suggestion.headings.length} encabezado(s) de subsección nuevos.`;

  return {
    proposal: createProposal(
      { kind: 'content-architecture', summary, operations },
      input.document,
      identity(),
    ),
    mode: 'cloud',
    available: true,
  };
}

// ── c. Derived summary ───────────────────────────────────────────────────────

const summaryResponseSchema = z.object({
  title: z.string().min(1),
  paragraphs: z.array(z.string().min(1)).min(1),
});

export type DerivedSummarySuggestion = z.infer<typeof summaryResponseSchema>;

/** Validation boundary: invalid LLM output yields null, never a throw. */
export function parseDerivedSummaryResponse(raw: unknown): DerivedSummarySuggestion | null {
  const parsed = summaryResponseSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

/** Compact outline of the whole AST (headings + paragraph previews), bounded. */
function buildDocumentOutline(document: SemanticDocument): string {
  const lines: string[] = [];
  for (const block of document.blocks) {
    if (block.type === 'heading') {
      lines.push(`${'#'.repeat(block.level)} ${inlineToPlainText(block.content)}`);
    } else if (block.type === 'paragraph') {
      lines.push(blockPreview(block, 160));
    }
    if (lines.join('\n').length > SUMMARY_MAX_OUTLINE_CHARS) break;
  }
  return lines.join('\n').slice(0, SUMMARY_MAX_OUTLINE_CHARS);
}

function buildSummaryPrompt(document: SemanticDocument, locale: AiLocale): string {
  const instructions =
    locale === 'en'
      ? [
          'You are an editorial assistant deriving a summary chapter from a book (block AST outline).',
          'Write a short "Summary" chapter (title + a few paragraphs) faithful to the outline:',
          'key ideas only, no new content, same language as the source.',
        ]
      : [
          'Eres un asistente editorial que deriva un capítulo de resumen de un libro (esquema del AST).',
          'Escribe un capítulo breve de «Resumen» (título + unos párrafos) fiel al esquema:',
          'solo las ideas clave, sin contenido nuevo, en el mismo idioma de la fuente.',
        ];
  return [
    ...instructions,
    `Document outline:\n${buildDocumentOutline(document)}`,
  ].join('\n');
}

const SUMMARY_RESPONSE_JSON_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    paragraphs: { type: 'array', items: { type: 'string' } },
  },
  required: ['title', 'paragraphs'],
  additionalProperties: false,
};

/**
 * Derived summary chapter appended at the END of the same document (insert
 * operations). Simplest option coherent with R3: the accepted proposal flows
 * through the existing save route — no parallel project-creation path.
 */
export async function proposeDerivedSummary(
  input: CoAuthorInput,
  provider?: AiProvider,
  identity: () => ProposalIdentity = createProposalIdentity,
): Promise<CoAuthorResult> {
  if (!hasProvider(provider)) return UNAVAILABLE;
  const locale = input.locale ?? 'es';
  if (input.document.blocks.length === 0) return { proposal: null, mode: 'cloud', available: true };

  let suggestion: DerivedSummarySuggestion | null;
  try {
    const raw = await provider.completeJson({
      prompt: buildSummaryPrompt(input.document, locale),
      schema: SUMMARY_RESPONSE_JSON_SCHEMA,
      schemaName: 'derived_summary',
    });
    suggestion = parseDerivedSummaryResponse(raw);
  } catch {
    return { proposal: null, mode: 'cloud', available: true };
  }
  if (!suggestion) return { proposal: null, mode: 'cloud', available: true };

  const taken = new Set(input.document.blocks.map((block) => block.id));
  const batch = identity();
  const operations: BlockOperation[] = [];
  let anchor: string | null = input.document.blocks[input.document.blocks.length - 1].id;

  const heading: HeadingBlock = {
    id: freshBlockId(taken, `${batch.id}-title`),
    type: 'heading',
    level: 1,
    content: [{ type: 'text', text: suggestion.title.trim() }],
  };
  operations.push({ type: 'insert', previousBlockId: anchor, block: heading });
  anchor = heading.id;

  suggestion.paragraphs.forEach((text, index) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const block: ParagraphBlock = {
      id: freshBlockId(taken, `${batch.id}-p${index}`),
      type: 'paragraph',
      content: [{ type: 'text', text: trimmed }],
    };
    operations.push({ type: 'insert', previousBlockId: anchor, block });
    anchor = block.id;
  });

  const summary =
    locale === 'en'
      ? `Append derived chapter "${suggestion.title.trim()}" (${operations.length - 1} paragraph(s)) at the end of the document.`
      : `Añadir el capítulo derivado «${suggestion.title.trim()}» (${operations.length - 1} párrafo(s)) al final del documento.`;

  return {
    proposal: createProposal(
      { kind: 'derived-summary', summary, operations },
      input.document,
      identity(),
    ),
    mode: 'cloud',
    available: true,
  };
}
