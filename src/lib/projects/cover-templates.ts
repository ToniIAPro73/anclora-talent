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
  },
];
