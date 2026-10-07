import type { SurfaceTemplateDefinition } from './cover-surface';

export interface EditorialTemplate extends SurfaceTemplateDefinition {
  name: string;
  description: string;
  category:
    | 'essay'
    | 'business'
    | 'workbook'
    | 'fiction'
    | 'minimal'
    | 'memoir'
    | 'statement'
    | 'author'
    | 'guide';
  previewTone: string;
}

export const COVER_TEMPLATES: EditorialTemplate[] = [
  {
    id: 'essay-premium-cover',
    surface: 'cover',
    category: 'essay',
    name: 'Ensayo premium',
    description: 'Jerarquia editorial sobria y portada de no ficcion.',
    previewTone: 'obsidian',
    visibility: { subtitle: true, author: true },
    layout: { kind: 'stacked-center' },
    layerStyles: {
      title: { fontFamily: 'Playfair Display', fontSize: 38, fontWeight: 900, lineHeight: 1.15 },
      subtitle: { fontFamily: 'DM Sans', fontSize: 16, fontWeight: 500, lineHeight: 1.45 },
      author: { fontFamily: 'DM Sans', fontSize: 14, fontWeight: 600, charSpacing: 220 },
    },
  },
  {
    id: 'business-leadership-cover',
    surface: 'cover',
    category: 'business',
    name: 'Negocio / liderazgo',
    description: 'Titular fuerte y tono ejecutivo.',
    previewTone: 'teal',
    visibility: { subtitle: true, author: true },
    layout: { kind: 'title-dominant' },
    layerStyles: {
      title: { fontFamily: 'Archivo', fontSize: 42, fontWeight: 900, lineHeight: 1.05, charSpacing: -20 },
      subtitle: { fontFamily: 'DM Sans', fontSize: 16, fontWeight: 500, lineHeight: 1.4 },
      author: { fontFamily: 'Archivo', fontSize: 14, fontWeight: 700, charSpacing: 180 },
    },
  },
  {
    id: 'workbook-cover',
    surface: 'cover',
    category: 'workbook',
    name: 'Workbook / guia practica',
    description: 'Bloques claros y composicion funcional.',
    previewTone: 'sand',
    visibility: { subtitle: true, author: true },
    layout: { kind: 'functional-grid' },
    layerStyles: {
      title: { fontFamily: 'Inter', fontSize: 36, fontWeight: 800, lineHeight: 1.15 },
      subtitle: { fontFamily: 'Inter', fontSize: 16, fontWeight: 500, lineHeight: 1.45 },
      author: { fontFamily: 'Inter', fontSize: 14, fontWeight: 600 },
    },
  },
  {
    id: 'fiction-cover',
    surface: 'cover',
    category: 'fiction',
    name: 'Ficcion literaria',
    description: 'Composicion atmosferica e imagen dominante.',
    previewTone: 'obsidian',
    visibility: { subtitle: false, author: true },
    layout: { kind: 'image-dominant' },
    layerStyles: {
      title: { fontFamily: 'Cormorant Garamond', fontSize: 40, fontWeight: 700, lineHeight: 1.1 },
      author: { fontFamily: 'Cormorant Garamond', fontSize: 17, fontWeight: 500, charSpacing: 160 },
    },
  },
  {
    id: 'minimal-editorial-cover',
    surface: 'cover',
    category: 'minimal',
    name: 'Minimal editorial',
    description: 'Aire, reticula limpia y jerarquia tipografica.',
    previewTone: 'sand',
    visibility: { subtitle: false, author: true },
    layout: { kind: 'minimal-stack' },
    layerStyles: {
      title: { fontFamily: 'DM Sans', fontSize: 34, fontWeight: 700, lineHeight: 1.2 },
      author: { fontFamily: 'DM Sans', fontSize: 13, fontWeight: 500, charSpacing: 320 },
    },
  },
  {
    id: 'memoir-cover',
    surface: 'cover',
    category: 'memoir',
    name: 'Memoria / autobiografia',
    description: 'Proximidad, retrato y tono personal.',
    previewTone: 'teal',
    visibility: { subtitle: true, author: true },
    layout: { kind: 'portrait-balanced' },
    layerStyles: {
      title: { fontFamily: 'Lora', fontSize: 36, fontWeight: 700, lineHeight: 1.15 },
      subtitle: { fontFamily: 'Lora', fontSize: 16, fontWeight: 500, fontStyle: 'italic', lineHeight: 1.45 },
      author: { fontFamily: 'DM Sans', fontSize: 14, fontWeight: 600, charSpacing: 140 },
    },
  },
  {
    id: 'statement-cover',
    surface: 'cover',
    category: 'statement',
    name: 'High contrast statement',
    description: 'Mensaje frontal con fuerte contraste.',
    previewTone: 'obsidian',
    visibility: { subtitle: false, author: false },
    layout: { kind: 'statement-bold' },
    layerStyles: {
      title: { fontFamily: 'Archivo', fontSize: 46, fontWeight: 900, lineHeight: 1.02, charSpacing: -10 },
    },
  },
];

/**
 * Back-cover catalogue. It is NOT the front-cover one: ids are namespaced (`back-*`), the layouts are real back-cover
 * compositions (`back-cover-layouts.ts`) and the semantic slots include the author name. Fonts come from the canonical
 * registry. Text never lives here: the slots are filled from the project.
 */
export const BACK_COVER_TEMPLATES: EditorialTemplate[] = [
  {
    id: 'back-classic-editorial',
    surface: 'back-cover',
    category: 'essay',
    name: 'Clásica editorial',
    description: 'Referencia arriba, sinopsis centrada en la lectura y autor al pie.',
    previewTone: 'obsidian',
    visibility: { title: true, body: true, author: true, authorBio: true },
    layout: { kind: 'classic-editorial' },
    layerStyles: {
      title: { fontFamily: 'Playfair Display', fontSize: 20, fontWeight: 700, lineHeight: 1.2 },
      body: { fontFamily: 'DM Sans', fontSize: 14, fontWeight: 400, lineHeight: 1.55 },
      author: { fontFamily: 'DM Sans', fontSize: 12, fontWeight: 600, lineHeight: 1.3, charSpacing: 160 },
      authorBio: { fontFamily: 'DM Sans', fontSize: 12, fontWeight: 400, lineHeight: 1.45 },
    },
  },
  {
    id: 'back-author-focus',
    surface: 'back-cover',
    category: 'author',
    name: 'Autor destacado',
    description: 'Sinopsis breve y un bloque propio para el autor y su biografía.',
    previewTone: 'teal',
    visibility: { title: true, body: true, author: true, authorBio: true },
    layout: { kind: 'author-focus' },
    layerStyles: {
      title: { fontFamily: 'DM Sans', fontSize: 14, fontWeight: 600, lineHeight: 1.3, charSpacing: 180 },
      body: { fontFamily: 'DM Sans', fontSize: 14, fontWeight: 400, lineHeight: 1.5 },
      author: { fontFamily: 'Playfair Display', fontSize: 24, fontWeight: 700, lineHeight: 1.15 },
      authorBio: { fontFamily: 'DM Sans', fontSize: 13, fontWeight: 400, lineHeight: 1.55 },
    },
  },
  {
    id: 'back-essay-premium',
    surface: 'back-cover',
    category: 'essay',
    name: 'Ensayo premium',
    description: 'Sinopsis protagonista con filete lateral y un cierre mínimo.',
    previewTone: 'obsidian',
    visibility: { title: true, body: true, author: true, authorBio: true },
    layout: { kind: 'essay-premium' },
    layerStyles: {
      title: { fontFamily: 'DM Sans', fontSize: 12, fontWeight: 600, lineHeight: 1.3, charSpacing: 300 },
      body: { fontFamily: 'Lora', fontSize: 15, fontWeight: 400, lineHeight: 1.6 },
      author: { fontFamily: 'DM Sans', fontSize: 12, fontWeight: 600, lineHeight: 1.3, charSpacing: 200 },
      authorBio: { fontFamily: 'DM Sans', fontSize: 12, fontWeight: 400, lineHeight: 1.45 },
    },
  },
  {
    id: 'back-business',
    surface: 'back-cover',
    category: 'business',
    name: 'Negocio / liderazgo',
    description: 'Promesa clara, cuerpo directo y banda inferior con credenciales.',
    previewTone: 'teal',
    visibility: { title: true, body: true, author: true, authorBio: true },
    layout: { kind: 'business-band' },
    layerStyles: {
      title: { fontFamily: 'Inter', fontSize: 24, fontWeight: 800, lineHeight: 1.12 },
      body: { fontFamily: 'DM Sans', fontSize: 14, fontWeight: 400, lineHeight: 1.5 },
      author: { fontFamily: 'Inter', fontSize: 14, fontWeight: 700, lineHeight: 1.25 },
      authorBio: { fontFamily: 'DM Sans', fontSize: 12, fontWeight: 400, lineHeight: 1.4 },
    },
  },
  {
    id: 'back-literary',
    surface: 'back-cover',
    category: 'fiction',
    name: 'Ficción literaria',
    description: 'Composición centrada y espaciosa, con autor discreto.',
    previewTone: 'obsidian',
    visibility: { title: true, body: true, author: true, authorBio: true },
    layout: { kind: 'literary-quote' },
    layerStyles: {
      title: { fontFamily: 'Cormorant Garamond', fontSize: 24, fontWeight: 700, fontStyle: 'italic', lineHeight: 1.2 },
      body: { fontFamily: 'Cormorant Garamond', fontSize: 17, fontWeight: 500, lineHeight: 1.55 },
      author: { fontFamily: 'Cormorant Garamond', fontSize: 15, fontWeight: 600, lineHeight: 1.3, charSpacing: 240 },
      authorBio: { fontFamily: 'Cormorant Garamond', fontSize: 13, fontWeight: 500, fontStyle: 'italic', lineHeight: 1.4 },
    },
  },
  {
    id: 'back-minimal',
    surface: 'back-cover',
    category: 'minimal',
    name: 'Minimal',
    description: 'Solo sinopsis y autor, con mucho aire.',
    previewTone: 'sand',
    visibility: { title: false, body: true, author: true, authorBio: true },
    layout: { kind: 'minimal-air' },
    layerStyles: {
      title: { fontFamily: 'DM Sans', fontSize: 18, fontWeight: 600, lineHeight: 1.3 },
      body: { fontFamily: 'DM Sans', fontSize: 14, fontWeight: 400, lineHeight: 1.7 },
      author: { fontFamily: 'DM Sans', fontSize: 11, fontWeight: 600, lineHeight: 1.3, charSpacing: 300 },
      authorBio: { fontFamily: 'DM Sans', fontSize: 11, fontWeight: 400, lineHeight: 1.45 },
    },
  },
  {
    id: 'back-guide',
    surface: 'back-cover',
    category: 'guide',
    name: 'Guía / workbook',
    description: 'Resumen estructurado en panel, con autor e información al pie.',
    previewTone: 'sand',
    visibility: { title: true, body: true, author: true, authorBio: true },
    layout: { kind: 'guide-structured' },
    layerStyles: {
      title: { fontFamily: 'Inter', fontSize: 22, fontWeight: 800, lineHeight: 1.15 },
      body: { fontFamily: 'Inter', fontSize: 14, fontWeight: 400, lineHeight: 1.55 },
      author: { fontFamily: 'Inter', fontSize: 13, fontWeight: 700, lineHeight: 1.25 },
      authorBio: { fontFamily: 'Inter', fontSize: 12, fontWeight: 400, lineHeight: 1.45 },
    },
  },
];

/** The safe default for a back cover opened for the first time. */
export const DEFAULT_BACK_COVER_TEMPLATE_ID = 'back-classic-editorial';

/** Ids the first back-cover catalogue used (they reused the front-cover families). Persisted designs may still carry them. */
export const LEGACY_BACK_TEMPLATE_IDS: Record<string, string> = {
  'essay-premium-back': 'back-essay-premium',
  'business-leadership-back': 'back-business',
  'workbook-back': 'back-guide',
  'fiction-back': 'back-literary',
  'minimal-editorial-back': 'back-minimal',
  'memoir-back': 'back-author-focus',
  'statement-back': 'back-minimal',
};

export function normalizeBackTemplateId(id: string | null | undefined): string | null {
  if (!id) return null;
  return LEGACY_BACK_TEMPLATE_IDS[id] ?? id;
}
