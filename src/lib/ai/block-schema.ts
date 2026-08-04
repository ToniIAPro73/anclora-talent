/**
 * Zod schema for document blocks — Anclora Talent (F3).
 *
 * Validation boundary for anything an LLM returns: a model-suggested block
 * is only ever turned into a proposal operation after parsing against this
 * schema, so malformed JSON or unknown block shapes are rejected before they
 * can reach the AST. (zod is already a project dependency — no new dep.)
 */

import { z } from 'zod';
import type { DocumentBlock } from '@/lib/document/model';

const markSchema = z.object({
  type: z.enum(['bold', 'italic', 'link']),
  href: z.string().optional(),
});

const textNodeSchema = z.object({
  type: z.literal('text'),
  text: z.string(),
  marks: z.array(markSchema).optional(),
});

const refNodeSchema = z.object({
  type: z.literal('ref'),
  refKind: z.enum(['chapter', 'figure', 'table']),
  targetId: z.string(),
  fallback: z.string().optional(),
});

const inlineNodeSchema = z.union([textNodeSchema, refNodeSchema]);

const headingLevelSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
  z.literal(5),
  z.literal(6),
]);

const idField = { id: z.string().min(1) };

export const documentBlockSchema: z.ZodType<DocumentBlock> = z.discriminatedUnion('type', [
  z.object({ ...idField, type: z.literal('heading'), level: headingLevelSchema, content: z.array(inlineNodeSchema) }),
  z.object({ ...idField, type: z.literal('paragraph'), content: z.array(inlineNodeSchema) }),
  z.object({ ...idField, type: z.literal('list'), ordered: z.boolean(), items: z.array(z.array(inlineNodeSchema)) }),
  z.object({
    ...idField,
    type: z.literal('table'),
    rows: z.array(z.array(z.array(inlineNodeSchema))),
    hasHeader: z.boolean(),
    caption: z.string().optional(),
  }),
  z.object({
    ...idField,
    type: z.literal('image'),
    src: z.string(),
    alt: z.string().optional(),
    caption: z.string().optional(),
    estimatedLines: z.number().optional(),
  }),
  z.object({ ...idField, type: z.literal('quote'), content: z.array(inlineNodeSchema) }),
  z.object({
    ...idField,
    type: z.literal('callout'),
    kind: z.enum(['note', 'info', 'tip', 'warning']),
    content: z.array(inlineNodeSchema),
  }),
  z.object({ ...idField, type: z.literal('code'), language: z.string().optional(), code: z.string() }),
  z.object({ ...idField, type: z.literal('pageBreak') }),
]) as z.ZodType<DocumentBlock>;
