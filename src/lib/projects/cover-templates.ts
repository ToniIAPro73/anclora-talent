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
    | 'statement';
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

export const BACK_COVER_TEMPLATES: EditorialTemplate[] = [
  {
    id: 'essay-premium-back',
    surface: 'back-cover',
    category: 'essay',
    name: 'Ensayo premium back',
    description: 'Texto de solapa elegante y balanceado.',
    previewTone: 'obsidian',
    visibility: { title: true, body: true, authorBio: true },
    layout: { kind: 'body-led' },
    layerStyles: {
      title: { fontFamily: 'Playfair Display', fontSize: 26, fontWeight: 700, lineHeight: 1.15 },
      body: { fontFamily: 'DM Sans', fontSize: 15, fontWeight: 500, lineHeight: 1.5 },
      authorBio: { fontFamily: 'DM Sans', fontSize: 13, fontWeight: 400, lineHeight: 1.4 },
    },
  },
  {
    id: 'business-leadership-back',
    surface: 'back-cover',
    category: 'business',
    name: 'Negocio / liderazgo back',
    description: 'Resumen de valor y promesa del libro.',
    previewTone: 'teal',
    visibility: { title: true, body: true, authorBio: true },
    layout: { kind: 'summary-card' },
    layerStyles: {
      title: { fontFamily: 'Archivo', fontSize: 26, fontWeight: 800, lineHeight: 1.1 },
      body: { fontFamily: 'DM Sans', fontSize: 15, fontWeight: 500, lineHeight: 1.5 },
      authorBio: { fontFamily: 'Archivo', fontSize: 13, fontWeight: 500, lineHeight: 1.4 },
    },
  },
  {
    id: 'workbook-back',
    surface: 'back-cover',
    category: 'workbook',
    name: 'Workbook back',
    description: 'Beneficios y estructura de uso.',
    previewTone: 'sand',
    visibility: { title: true, body: true, authorBio: false },
    layout: { kind: 'benefits-grid' },
    layerStyles: {
      title: { fontFamily: 'Inter', fontSize: 24, fontWeight: 800, lineHeight: 1.15 },
      body: { fontFamily: 'Inter', fontSize: 15, fontWeight: 500, lineHeight: 1.5 },
    },
  },
  {
    id: 'fiction-back',
    surface: 'back-cover',
    category: 'fiction',
    name: 'Ficcion back',
    description: 'Sinopsis y tono narrativo.',
    previewTone: 'obsidian',
    visibility: { title: true, body: true, authorBio: false },
    layout: { kind: 'synopsis-focus' },
    layerStyles: {
      title: { fontFamily: 'Cormorant Garamond', fontSize: 26, fontWeight: 700, lineHeight: 1.15 },
      body: { fontFamily: 'Cormorant Garamond', fontSize: 17, fontWeight: 500, lineHeight: 1.5 },
    },
  },
  {
    id: 'minimal-editorial-back',
    surface: 'back-cover',
    category: 'minimal',
    name: 'Minimal editorial back',
    description: 'Texto limpio con mucho aire.',
    previewTone: 'sand',
    visibility: { title: false, body: true, authorBio: true },
    layout: { kind: 'minimal-body' },
    layerStyles: {
      body: { fontFamily: 'DM Sans', fontSize: 15, fontWeight: 500, lineHeight: 1.55 },
      authorBio: { fontFamily: 'DM Sans', fontSize: 13, fontWeight: 400, lineHeight: 1.4 },
    },
  },
  {
    id: 'memoir-back',
    surface: 'back-cover',
    category: 'memoir',
    name: 'Memoria back',
    description: 'Bio y contexto humano del autor.',
    previewTone: 'teal',
    visibility: { title: true, body: true, authorBio: true },
    layout: { kind: 'bio-balanced' },
    layerStyles: {
      title: { fontFamily: 'Lora', fontSize: 26, fontWeight: 700, lineHeight: 1.15 },
      body: { fontFamily: 'Lora', fontSize: 15, fontWeight: 500, lineHeight: 1.5 },
      authorBio: { fontFamily: 'DM Sans', fontSize: 13, fontWeight: 400, lineHeight: 1.4 },
    },
  },
  {
    id: 'statement-back',
    surface: 'back-cover',
    category: 'statement',
    name: 'Statement back',
    description: 'Mensaje corto e impactante.',
    previewTone: 'obsidian',
    visibility: { title: false, body: true, authorBio: false },
    layout: { kind: 'statement-body' },
    layerStyles: {
      body: { fontFamily: 'Archivo', fontSize: 20, fontWeight: 700, lineHeight: 1.3 },
    },
  },
];
