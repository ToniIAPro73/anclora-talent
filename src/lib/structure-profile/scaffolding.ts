/**
 * Governed scaffolding builder (FASE 3, dual-profiles addendum).
 *
 * Turns a human-confirmed `InferredStructureSchema` into an
 * `ImportedDocumentSeed` — the *andamiaje* (scaffold) of a new book: part
 * dividers, chapters and subsections with proposed placeholder headlines
 * ("Parte 1 · [tu diagnóstico]"), all of them EMPTY.
 *
 * Hard rule (G3, "forma, no voz"): the scaffold NEVER copies source text —
 * no part titles, chapter titles or sentences from the reference document.
 * Every headline is a generic structural placeholder so applying a structure
 * profile transfers shape only. The rhetorical function of a part, when
 * inferred, only informs a generic bracketed hint.
 *
 * This builder is invoked exclusively after explicit human confirmation of
 * the inferred schema (G2) — the UI never calls it from a silent path.
 */

import type { ImportedDocumentSeed } from '@/lib/projects/types';
import type { InferredStructureSchema } from './model';

/** Generic bracketed hint per known rhetorical function (never source text). */
const PART_HINT_BY_FUNCTION: Record<string, string> = {
  'identificar el problema y legitimarlo': 'tu diagnóstico',
  'explicar por qué ocurre': 'el mecanismo',
  'ofrecer vía de salida': 'la salida',
  'convertir la solución en hábito sostenible': 'el sistema',
};

const DEFAULT_PART_HINT = 'título de la parte';
const CHAPTER_TITLE_PLACEHOLDER = '[título del capítulo]';
const SUBSECTION_PLACEHOLDER = '[idea de la subsección]';
const CHAPTER_BODY_PLACEHOLDER = '<p><em>[Escribe aquí el contenido de este capítulo]</em></p>';

type SeedBlock = { type: 'heading' | 'paragraph'; content: string };
type SeedChapter = { title: string; blocks: SeedBlock[] };

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function partHint(funcionRetorica: string | null): string {
  if (!funcionRetorica) return DEFAULT_PART_HINT;
  return PART_HINT_BY_FUNCTION[funcionRetorica] ?? DEFAULT_PART_HINT;
}

function partDividerChapter(index: number, hint: string): SeedChapter {
  const title = `Parte ${index} · [${hint}]`;
  return {
    title,
    blocks: [{ type: 'heading', content: `<h1>${escapeHtml(title)}</h1>` }],
  };
}

function chapterSeed(title: string, headingHtml: string, subsectionCount: number): SeedChapter {
  const blocks: SeedBlock[] = [{ type: 'heading', content: headingHtml }];
  for (let k = 1; k <= subsectionCount; k += 1) {
    blocks.push({ type: 'heading', content: `<h3>${escapeHtml(SUBSECTION_PLACEHOLDER)}</h3>` });
  }
  blocks.push({ type: 'paragraph', content: CHAPTER_BODY_PLACEHOLDER });
  return { title, blocks };
}

export interface StructureScaffoldingOptions {
  /** Project title used for the seed metadata. */
  title?: string;
  /** Registered source document name of the confirmed profile (G4). */
  sourceFileName?: string | null;
}

/**
 * Builds the empty scaffold from a confirmed schema. Chapter subsection
 * counts come from `chapterPattern.subseccionesPorCapitulo.distribucionReal`;
 * part attribution comes from `macroPattern.capitulosPorParte` (plus the
 * optional opening chapters before the first part).
 */
export function buildStructureScaffolding(
  schema: InferredStructureSchema,
  options: StructureScaffoldingOptions = {},
): ImportedDocumentSeed {
  const title = options.title?.trim() || 'Nuevo proyecto';
  const chapters: SeedChapter[] = [];

  const distribucion = schema.chapterPattern.subseccionesPorCapitulo.distribucionReal;
  let chapterCursor = 0;
  const takeSubsectionCount = (): number => {
    const count = distribucion[chapterCursor] ?? 0;
    chapterCursor += 1;
    return count;
  };

  // Opening chapters (before the first part).
  for (let k = 1; k <= schema.macroPattern.capitulosDeApertura; k += 1) {
    const chapterTitle = `Capítulo de apertura ${k} · ${CHAPTER_TITLE_PLACEHOLDER}`;
    chapters.push(
      chapterSeed(chapterTitle, `<h2>${escapeHtml(chapterTitle)}</h2>`, takeSubsectionCount()),
    );
  }

  // Parts and their chapters.
  schema.macroPattern.secuencia.forEach((parte, parteIndex) => {
    const hint = partHint(parte.funcionRetorica);
    chapters.push(partDividerChapter(parteIndex + 1, hint));

    const chapterCount = schema.macroPattern.capitulosPorParte[parteIndex] ?? 0;
    for (let j = 1; j <= chapterCount; j += 1) {
      const chapterTitle = `Capítulo ${parteIndex + 1}.${j} · ${CHAPTER_TITLE_PLACEHOLDER}`;
      chapters.push(
        chapterSeed(chapterTitle, `<h2>${escapeHtml(chapterTitle)}</h2>`, takeSubsectionCount()),
      );
    }
  });

  // Defensive: any chapter count not attributed to a part still scaffolds.
  while (chapterCursor < distribucion.length) {
    const chapterTitle = `Capítulo adicional ${chapterCursor + 1} · ${CHAPTER_TITLE_PLACEHOLDER}`;
    chapters.push(
      chapterSeed(chapterTitle, `<h2>${escapeHtml(chapterTitle)}</h2>`, takeSubsectionCount()),
    );
  }

  if (chapters.length === 0) {
    chapters.push({
      title: 'Capítulo 1 · [título del capítulo]',
      blocks: [
        { type: 'heading', content: '<h2>Capítulo 1 · [título del capítulo]</h2>' },
        { type: 'paragraph', content: CHAPTER_BODY_PLACEHOLDER },
      ],
    });
  }

  return {
    title,
    subtitle: 'Estructura generada a partir de un perfil de estructura confirmado',
    author: '',
    warnings: [
      'Andamiaje generado desde un perfil de estructura: solo se ha transferido la forma (partes, capítulos, subsecciones), nunca contenido ni voz de la fuente.',
    ],
    chapterTitle: chapters[0].title,
    blocks: chapters[0].blocks.map((block) => ({ ...block })),
    chapters,
    sourceFileName: options.sourceFileName ?? '',
    sourceMimeType: 'application/x-anclora-structure-scaffolding',
  };
}

/**
 * Serializes every scaffold headline/paragraph to plain text — used by the
 * no-voice-transfer guard (tests) and available to callers that want to
 * double-check the G3 boundary.
 */
export function scaffoldingPlainText(seed: ImportedDocumentSeed): string {
  const chunks: string[] = [];
  for (const chapter of seed.chapters ?? []) {
    chunks.push(chapter.title);
    for (const block of chapter.blocks) {
      chunks.push(block.content.replace(/<[^>]+>/g, ' '));
    }
  }
  return chunks.join(' ').replace(/\s+/g, ' ').trim();
}
