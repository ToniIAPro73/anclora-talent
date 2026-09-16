/**
 * Cover Studio v2 — runtime validation for a client-submitted `DesignSurface`
 * (continuation mission Fase 3). TypeScript only guarantees shape at compile
 * time on OUR code; a browser can submit anything to a server action, so the
 * save actions parse every payload through this schema before it ever
 * reaches persistence.
 */

import { z } from 'zod';

const finiteNumber = z.number().finite();

const designLayerBaseSchema = z.object({
  id: z.string().min(1),
  zIndex: finiteNumber,
  x: finiteNumber,
  y: finiteNumber,
  width: finiteNumber,
  height: finiteNumber,
  rotation: finiteNumber,
  opacity: finiteNumber.min(0).max(1),
  visible: z.boolean(),
  locked: z.boolean(),
  name: z.string().optional(),
});

const textLayerRoleSchema = z.enum(['title', 'subtitle', 'author', 'body', 'authorBio', 'free']);

const textLayerSchema = designLayerBaseSchema.extend({
  type: z.literal('text'),
  content: z.string(),
  fontFamily: z.string().min(1),
  fontSize: finiteNumber.positive(),
  fontWeight: z.union([z.string(), z.number()]),
  fontStyle: z.enum(['normal', 'italic']),
  textDecoration: z.enum(['none', 'underline']),
  color: z.string().min(1),
  letterSpacing: finiteNumber,
  lineHeight: finiteNumber.positive(),
  textAlign: z.enum(['left', 'center', 'right', 'justify']),
  verticalAlign: z.enum(['top', 'middle', 'bottom']),
  textTransform: z.enum(['none', 'uppercase', 'lowercase']),
  role: textLayerRoleSchema,
  source: z.enum(['metadata', 'manual']),
});

const imageLayerFiltersSchema = z.object({
  brightness: finiteNumber.min(-1).max(1).optional(),
  contrast: finiteNumber.min(-1).max(1).optional(),
  saturation: finiteNumber.min(-1).max(1).optional(),
  grayscale: z.boolean().optional(),
  blur: finiteNumber.min(0).max(1).optional(),
  sepia: z.boolean().optional(),
});

// A remote asset URL, a private blob path, or a data: URL the save action
// still needs to upload to blob storage — all three are legitimate at the
// validation boundary; upload normalization happens after this parse.
const imageSrcSchema = z.string().refine((value) => value === '' || /^(https?:|data:image\/|\/)/.test(value), {
  message: 'src must be an http(s) URL, a data:image URL, an app-relative path, or empty',
});

const imageLayerSchema = designLayerBaseSchema.extend({
  type: z.literal('image'),
  src: imageSrcSchema,
  fit: z.enum(['cover', 'contain', 'fill']),
  crop: z.object({ x: finiteNumber, y: finiteNumber, width: finiteNumber, height: finiteNumber }).optional(),
  filters: imageLayerFiltersSchema.optional(),
  isOriginalSource: z.boolean().optional(),
});

const shapeLayerSchema = designLayerBaseSchema.extend({
  type: z.literal('shape'),
  shape: z.enum(['rect', 'ellipse', 'line']),
  fill: z.string().optional(),
  stroke: z.string().optional(),
  strokeWidth: finiteNumber.optional(),
});

const designLayerSchema = z.discriminatedUnion('type', [textLayerSchema, imageLayerSchema, shapeLayerSchema]);

const backgroundSpecSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('solid'), color: z.string().min(1) }),
  z.object({
    kind: z.literal('gradient'),
    angle: finiteNumber,
    stops: z.array(z.object({ color: z.string().min(1), offset: finiteNumber.min(0).max(1) })).min(2),
  }),
  z.object({
    kind: z.literal('image'),
    src: imageSrcSchema,
    fit: z.enum(['cover', 'contain']),
    opacity: finiteNumber.min(0).max(1),
    originalUncropped: z.boolean().optional(),
    filters: z.object({ grayscale: z.boolean().optional() }).optional(),
  }),
]);

const safeAreaSchema = z.object({ top: finiteNumber, right: finiteNumber, bottom: finiteNumber, left: finiteNumber });
const rectAreaSchema = z.object({ x: finiteNumber, y: finiteNumber, width: finiteNumber, height: finiteNumber });
const guideSchema = z.object({ id: z.string().min(1), axis: z.enum(['x', 'y']), position: finiteNumber });

export const designSurfaceSchema = z.object({
  version: z.literal(2),
  surface: z.enum(['cover', 'back-cover']),
  width: finiteNumber.positive(),
  height: finiteNumber.positive(),
  background: backgroundSpecSchema,
  layers: z.array(designLayerSchema).max(200),
  safeArea: safeAreaSchema.optional(),
  isbnArea: rectAreaSchema.optional(),
  guides: z.array(guideSchema).max(50).optional(),
  originAssetId: z.string().nullable().optional(),
  originMode: z.enum(['blank', 'use-original', 'edit-original']).optional(),
  status: z.enum(['draft', 'final']).optional(),
});

export type ValidatedDesignSurface = z.infer<typeof designSurfaceSchema>;

export interface DesignSurfaceValidationResult {
  ok: boolean;
  surface?: ValidatedDesignSurface;
  error?: string;
}

/** Parses and validates an arbitrary client payload — never trust `as DesignSurface` on data crossing a server action boundary. */
export function parseDesignSurfacePayload(payload: unknown): DesignSurfaceValidationResult {
  const result = designSurfaceSchema.safeParse(payload);
  if (!result.success) {
    return { ok: false, error: result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ') };
  }
  return { ok: true, surface: result.data };
}
