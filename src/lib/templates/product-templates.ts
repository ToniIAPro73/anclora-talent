/**
 * Editorial product template library (FASE 2).
 *
 * A product template is a declarative bundle of:
 * - `chapters`: seed structure (guide chapter titles with empty content) used
 *   to seed the project document at creation time.
 * - `rules`: partial composition rules, merged over `defaultDocumentRules`
 *   via `resolveDocumentRules` when the project is created.
 * - `derivedAssets`: declarative list of deliverables the product will
 *   produce (F2.3 turns this into a manifest; here it is only exposed).
 *
 * Templates are structure + rules only: they never carry brand decisions.
 * The BrandProfile (F2, G1) is applied separately as templateOverrides of the
 * composer, so brand and structure stay decoupled.
 *
 * Model notes:
 * - The project document is a flat chapter list, so every template is ONE
 *   document. `bundle` groups its parts as chapters titled "Parte N · …"
 *   instead of nesting documents — the simplest shape that does not break
 *   the canonical model.
 * - Every template includes an "Índice" chapter: the generated TOC is always
 *   materialized in that chapter by the preview/export adapter.
 */

import type { DocumentRules } from '@/lib/compose/rules';
import type { DocumentBlockType } from '@/lib/projects/types';

export type ProductTemplateId =
  | 'standard-book'
  | 'technical-manual'
  | 'lead-magnet'
  | 'modular-course'
  | 'bundle';

/** Keys into `AppMessages['project']['productTemplates']` (ES/EN copy). */
export type ProductTemplateCopyKey =
  | 'standardBook'
  | 'technicalManual'
  | 'leadMagnet'
  | 'modularCourse'
  | 'bundle';

export interface ProductTemplateChapterSeed {
  title: string;
  blocks: Array<{
    type: DocumentBlockType;
    content: string;
  }>;
}

export interface ProductTemplate {
  id: ProductTemplateId;
  nameKey: ProductTemplateCopyKey;
  descriptionKey: ProductTemplateCopyKey;
  chapters: ProductTemplateChapterSeed[];
  rules: Partial<DocumentRules>;
  derivedAssets: string[];
  /** Optional brand hint; never enforced — brand stays decoupled (G1). */
  recommendedBrand?: string;
}

/** Heading + empty paragraph: a guide title ready to be filled in. */
function guideChapter(title: string, extraBlocks: ProductTemplateChapterSeed['blocks'] = []) {
  return {
    title,
    blocks: [
      { type: 'heading' as const, content: title },
      ...extraBlocks,
      { type: 'paragraph' as const, content: '' },
    ],
  };
}

/** Lesson-style subheading inside a module chapter (course template). */
function lessonHeading(title: string): ProductTemplateChapterSeed['blocks'][number] {
  return { type: 'heading', content: title };
}

export const PRODUCT_TEMPLATES: ProductTemplate[] = [
  {
    id: 'standard-book',
    nameKey: 'standardBook',
    descriptionKey: 'standardBook',
    chapters: [
      guideChapter('Portadilla'),
      guideChapter('Aviso legal'),
      guideChapter('Índice'),
      guideChapter('Prólogo'),
      guideChapter('Capítulo 1'),
      guideChapter('Capítulo 2'),
      guideChapter('Capítulo 3'),
      guideChapter('Epílogo'),
    ],
    rules: {
      chapterStartsOnOddPage: true,
      pageBreakBeforeChapter: true,
    },
    derivedAssets: ['pdf', 'epub', 'docx'],
  },
  {
    id: 'technical-manual',
    nameKey: 'technicalManual',
    descriptionKey: 'technicalManual',
    chapters: [
      guideChapter('Índice'),
      guideChapter('1. Introducción'),
      guideChapter('2. Requisitos del sistema'),
      guideChapter('3. Instalación'),
      guideChapter('4. Configuración'),
      guideChapter('5. Referencia'),
      guideChapter('6. Resolución de problemas'),
      guideChapter('Apéndice A · Glosario'),
      guideChapter('Apéndice B · Recursos'),
    ],
    rules: {
      keepTogether: {
        table: true,
        tableFillGap: 'leave-space',
        list: { maxItems: 8 },
        code: true,
        quote: true,
        callout: true,
        imageWithCaption: true,
      },
      chapterStartsOnOddPage: false,
      pageBreakBeforeChapter: true,
    },
    derivedAssets: ['pdf', 'html', 'docx'],
  },
  {
    id: 'lead-magnet',
    nameKey: 'leadMagnet',
    descriptionKey: 'leadMagnet',
    chapters: [
      guideChapter('Índice'),
      guideChapter('1. El problema que resolvemos'),
      guideChapter('2. La idea clave'),
      guideChapter('3. Tres pasos accionables'),
      guideChapter('4. Errores comunes'),
      guideChapter('5. Recursos recomendados'),
      guideChapter('6. Tu siguiente paso'),
    ],
    rules: {
      chapterStartsOnOddPage: false,
      pageBreakBeforeChapter: true,
    },
    derivedAssets: ['pdf', 'epub', 'landing-copy'],
  },
  {
    id: 'modular-course',
    nameKey: 'modularCourse',
    descriptionKey: 'modularCourse',
    chapters: [
      guideChapter('Índice'),
      guideChapter('Bienvenida y cómo usar este curso'),
      guideChapter('Módulo 1 · Fundamentos', [
        lessonHeading('Lección 1.1 · Conceptos base'),
        lessonHeading('Lección 1.2 · Primeros pasos'),
        lessonHeading('Recursos del módulo 1'),
      ]),
      guideChapter('Módulo 2 · Práctica guiada', [
        lessonHeading('Lección 2.1 · Ejercicio guiado'),
        lessonHeading('Lección 2.2 · Casos reales'),
        lessonHeading('Recursos del módulo 2'),
      ]),
      guideChapter('Módulo 3 · Proyecto final', [
        lessonHeading('Lección 3.1 · Definición del proyecto'),
        lessonHeading('Lección 3.2 · Entrega y revisión'),
        lessonHeading('Recursos del módulo 3'),
      ]),
      guideChapter('Próximos pasos'),
    ],
    rules: {
      chapterStartsOnOddPage: false,
      pageBreakBeforeChapter: true,
    },
    derivedAssets: ['pdf', 'epub', 'slides', 'audio-video'],
  },
  {
    id: 'bundle',
    nameKey: 'bundle',
    descriptionKey: 'bundle',
    // One document, parts as grouped chapters — see module doc note.
    chapters: [
      guideChapter('Índice'),
      guideChapter('Parte I · Libro principal'),
      guideChapter('Parte II · Workbook'),
      guideChapter('Parte III · Plantillas y recursos'),
      guideChapter('Licencia y condiciones de uso'),
    ],
    rules: {
      chapterStartsOnOddPage: true,
      pageBreakBeforeChapter: true,
    },
    derivedAssets: ['pdf', 'epub', 'bundle-manifest'],
  },
];

export function getProductTemplate(id?: string | null): ProductTemplate | undefined {
  if (!id) return undefined;
  return PRODUCT_TEMPLATES.find((template) => template.id === id);
}
