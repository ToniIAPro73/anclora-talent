/**
 * Structural profile extractor (FASE 3, dual-profiles addendum).
 *
 * Pure heuristic extractor over a `SemanticDocument` (the canonical AST from
 * `src/lib/document/model.ts`). It infers the *form* of a reference document
 * — hierarchy, part/chapter/subsection counts, macro-pattern, enumeration
 * style, table usage — and marks every inferred section with an explicit
 * confidence (`verificado_en_fuente` when it is a direct observation,
 * `inferido_de_un_documento` when it is a single-document heuristic).
 *
 * Governance:
 * - G2: the output is an *inferred schema* that a human must confirm before
 *   anything is applied. Nothing here mutates state.
 * - G3: it never captures tone, lexicon or sentence style (that is the brand
 *   profile's job); only structure, counts and observed formats.
 * - No external/AI calls: the rhetorical function of each part is a
 *   conservative keyword heuristic or `null`, always confidence-marked.
 *
 * Structural notes honored from the import pipeline:
 * - Imported/generated TOC sections ("Índice", "Table of contents", …) mirror
 *   the document outline itself; their headings are excluded from the counts
 *   so duplicated part titles inside the index are never counted twice.
 * - Empty headings never reach the AST, so an empty `Heading 3` paragraph in
 *   a DOCX is naturally not counted.
 * - DOCX images do not survive the HTML→AST conversion; when the caller has
 *   the imported HTML it can pass it as `sourceHtml` so `<img>` tags are
 *   counted (otherwise AST image blocks are counted).
 */

import {
  inlineToPlainText,
  type HeadingBlock,
  type SemanticDocument,
} from '@/lib/document/model';
import { isTocChapter } from '@/lib/preview/preview-builder';
import {
  STRUCTURE_LEVEL_NAMES,
  type InferredStructureSchema,
  type MacroPatternPart,
  type StructureEnumerationStyle,
  type StructureHierarchy,
  type StructureLevelName,
} from './model';

export interface ExtractStructureOptions {
  /** Display name of the source document (for notes only; G4 persistence is the caller's job). */
  sourceDocumentName?: string;
  /** Imported HTML of the source, when available, to count `<img>` images. */
  sourceHtml?: string | null;
}

const NO_H4_RULE =
  'No se admite un cuarto nivel (H4). Si el contenido lo requiere, se resuelve con lista o tabla dentro del H3.';

const MACRO_PATTERN_RULE =
  'Cada parte cumple una función retórica distinta y no se repite función entre partes.';

const VOICE_SCOPE_NOTE =
  'Este perfil NO captura tono, léxico ni estilo de frase — eso pertenece al perfil de marca (voz de la casa), no al perfil estructural. Aplicar este perfil a un documento nuevo transfiere forma, no voz.';

const ENUMERATION_RULE =
  'Se usa numeración solo cuando los elementos son mutuamente excluyentes y del mismo orden lógico. No se usa para listas simplemente secuenciales.';

const TABLE_ACTIVATION_RULE = 'Solo si el contenido es comparativo y cuantificable';
const TABLE_FORBIDDEN_RULE = 'Uso decorativo o para listar sin comparación real';

const APERTURA_NOTA =
  'Patrón frecuente pero no universal; tratar como recomendación, no como ley.';

const CLOSE_VARIANTS = ['paso_a_paso', 'lo_que_no_es_X', 'regla_practica'];

/**
 * Conservative rhetorical-arc heuristic (problem → cause → way out → habit).
 * Matched on generic Spanish rhetorical terms only; anything else is `null`.
 */
const RHETORICAL_FUNCTION_HINTS: Array<{ pattern: RegExp; funcion: string }> = [
  { pattern: /diagn[oó]stic|problema|s[ií]ntoma/i, funcion: 'identificar el problema y legitimarlo' },
  { pattern: /mecanismo|causa|por\s+qu[eé]|origen/i, funcion: 'explicar por qué ocurre' },
  { pattern: /reconstruc|soluci|salida|cambio|camino/i, funcion: 'ofrecer vía de salida' },
  { pattern: /sistema|h[aá]bito|sosten|manten/i, funcion: 'convertir la solución en hábito sostenible' },
];

/** "Concepto N · Nombre" — e.g. "Coraza 1 · La competencia". */
const ENUMERATED_HEADING_RE = /^([A-ZÁÉÍÓÚÑ][\wáéíóúñü]*)\s+(\d+)\s*[·:–—-]\s*(.+)$/u;

const CLOSE_HINT_RE = /paso\s+a\s+paso|c[oó]mo\s+se\s+practica|lo\s+que\s+no\s+es|regla\s+pr[aá]ctica/i;

interface ChapterSpan {
  title: string;
  subsections: string[];
  firstParagraph: string | null;
  lastText: string | null;
}

interface DocumentWalk {
  partes: string[];
  chapters: ChapterSpan[];
  subsectionCount: number;
  maxObservedDepth: number;
  tableCount: number;
  astImageCount: number;
}

function headingText(block: HeadingBlock): string {
  return inlineToPlainText(block.content).trim();
}

/**
 * Walks the AST once, excluding TOC zones (an index section mirrors the
 * outline and would double-count headings) and grouping H3 subsections under
 * their H2 chapter. Headings before the first chapter are not expected in a
 * parte→capítulo→subsección book; subsection totals still count them.
 */
function walkDocument(document: SemanticDocument): DocumentWalk {
  const partes: string[] = [];
  const chapters: ChapterSpan[] = [];
  let subsectionCount = 0;
  let maxObservedDepth = 0;
  let tableCount = 0;
  let astImageCount = 0;
  let currentChapter: ChapterSpan | null = null;
  let tocZoneLevel: number | null = null;

  for (const block of document.blocks) {
    if (block.type === 'table') {
      if (tocZoneLevel === null) tableCount += 1;
      continue;
    }
    if (block.type === 'image') {
      if (tocZoneLevel === null) astImageCount += 1;
      continue;
    }
    if (block.type === 'paragraph') {
      if (tocZoneLevel === null && currentChapter) {
        const text = inlineToPlainText(block.content).trim();
        if (text) {
          if (!currentChapter.firstParagraph) currentChapter.firstParagraph = text;
          currentChapter.lastText = text;
        }
      }
      continue;
    }
    if (block.type !== 'heading') continue;

    const text = headingText(block);
    if (!text) continue;

    if (isTocChapter(text)) {
      // Enter (or stay in) a TOC zone; keep the shallowest TOC heading level.
      tocZoneLevel = tocZoneLevel === null ? block.level : Math.min(tocZoneLevel, block.level);
      continue;
    }
    if (tocZoneLevel !== null) {
      // The zone ends at the next heading strictly above the TOC heading level
      // (e.g. the first real H1 after an H2 "Índice").
      if (block.level < tocZoneLevel) {
        tocZoneLevel = null;
      } else {
        continue;
      }
    }

    maxObservedDepth = Math.max(maxObservedDepth, block.level);

    if (block.level === 1) {
      partes.push(text);
      currentChapter = null;
    } else if (block.level === 2) {
      currentChapter = { title: text, subsections: [], firstParagraph: null, lastText: null };
      chapters.push(currentChapter);
    } else if (block.level === 3) {
      subsectionCount += 1;
      if (currentChapter) {
        currentChapter.subsections.push(text);
        currentChapter.lastText = text;
      }
    }
  }

  return { partes, chapters, subsectionCount, maxObservedDepth, tableCount, astImageCount };
}

function buildHierarchy(walk: DocumentWalk): StructureHierarchy {
  const depth = Math.min(Math.max(walk.maxObservedDepth, 1), STRUCTURE_LEVEL_NAMES.length);
  const levels = STRUCTURE_LEVEL_NAMES.slice(0, depth) as StructureLevelName[];
  const headingMap: StructureHierarchy['headingMap'] = {};
  levels.forEach((level, index) => {
    headingMap[level] = `H${index + 1}`;
  });

  return {
    depth,
    levels,
    headingMap,
    maxObservedDepth: walk.maxObservedDepth,
    regla:
      walk.maxObservedDepth <= STRUCTURE_LEVEL_NAMES.length
        ? NO_H4_RULE
        : `Se observó un nivel H${walk.maxObservedDepth}; el perfil se recorta a ${STRUCTURE_LEVEL_NAMES.length} niveles. ${NO_H4_RULE}`,
    confianza: 'verificado_en_fuente',
  };
}

function inferRhetoricalFunction(partTitle: string): string | null {
  for (const hint of RHETORICAL_FUNCTION_HINTS) {
    if (hint.pattern.test(partTitle)) return hint.funcion;
  }
  return null;
}

function buildMacroPattern(partes: string[]): InferredStructureSchema['macroPattern'] {
  const secuencia: MacroPatternPart[] = partes.map((parte) => ({
    parte,
    funcionRetorica: inferRhetoricalFunction(parte),
  }));

  return {
    nombre: null,
    numPartes: partes.length,
    secuencia,
    regla: MACRO_PATTERN_RULE,
    // The part titles are observed; the rhetorical functions are heuristic.
    confianza: 'inferido_de_un_documento',
  };
}

function buildChapterPattern(chapters: ChapterSpan[]): InferredStructureSchema['chapterPattern'] {
  const questionOpeners = chapters
    .map((chapter) => {
      if (chapter.title.trim().endsWith('?')) return chapter.title.trim();
      const first = chapter.firstParagraph?.trim() ?? '';
      return first.endsWith('?') ? first : null;
    })
    .filter((value): value is string => value !== null);

  const closeExamples = chapters
    .map((chapter) => {
      const fromSubsection = chapter.subsections.find((title) => CLOSE_HINT_RE.test(title));
      if (fromSubsection) return fromSubsection;
      const candidate = chapter.lastText ?? '';
      return CLOSE_HINT_RE.test(candidate) ? candidate : null;
    })
    .filter((value): value is string => value !== null);

  const distribucion = chapters.map((chapter) => chapter.subsections.length);
  const total = distribucion.reduce((sum, count) => sum + count, 0);
  const promedio = chapters.length > 0 ? Math.round((total / chapters.length) * 100) / 100 : 0;
  const rango: [number, number] =
    distribucion.length > 0 ? [Math.min(...distribucion), Math.max(...distribucion)] : [0, 0];

  return {
    apertura: {
      tipo: questionOpeners.length > 0 ? 'pregunta_retorica_o_afirmacion_provocadora' : null,
      ejemplo: questionOpeners[0] ?? null,
      obligatorio: false,
      confianza: 'inferido_de_un_documento',
      nota:
        questionOpeners.length > 0
          ? `${APERTURA_NOTA} Observado en ${questionOpeners.length} de ${chapters.length} capítulos.`
          : 'No se observa un patrón de apertura consistente en la fuente.',
    },
    cierre: {
      tipo: closeExamples.length > 0 ? 'sintesis_accionable' : null,
      variantes: CLOSE_VARIANTS,
      ejemplo: closeExamples[0] ?? null,
      obligatorio: false,
      confianza: 'inferido_de_un_documento',
      nota:
        closeExamples.length > 0
          ? `Observado en ${closeExamples.length} de ${chapters.length} capítulos; recomendación, no ley.`
          : 'No se observa un patrón de cierre consistente en la fuente.',
    },
    subseccionesPorCapitulo: {
      promedio,
      rangoObservado: rango,
      distribucionReal: distribucion,
      nota:
        'Los capítulos de apertura y cierre del libro pueden ser más ligeros que los centrales.',
    },
  };
}

function buildEnumerationStyle(chapters: ChapterSpan[]): StructureEnumerationStyle | null {
  const byConcept = new Map<string, string[]>();

  for (const chapter of chapters) {
    for (const subsection of chapter.subsections) {
      const match = subsection.match(ENUMERATED_HEADING_RE);
      if (!match) continue;
      const [, concept] = match;
      const list = byConcept.get(concept) ?? [];
      list.push(subsection);
      byConcept.set(concept, list);
    }
  }

  let best: string[] = [];
  for (const examples of byConcept.values()) {
    if (examples.length > best.length) best = examples;
  }

  if (best.length < 2) return null;

  return {
    activador: 'contenido_taxonomico_o_tipologico',
    formato: 'Concepto N · Nombre del concepto',
    ejemplo: best,
    regla: ENUMERATION_RULE,
    confianza: 'verificado_en_fuente',
  };
}

function countSourceImages(sourceHtml: string | null | undefined, astImageCount: number): number {
  if (sourceHtml) {
    return (sourceHtml.match(/<img[\s>]/gi) ?? []).length;
  }
  return astImageCount;
}

/**
 * Infers the structural schema of a reference document. Pure: no I/O, no
 * mutation, no external calls (G2/G3). The result must be confirmed by a
 * human before it is applied to anything.
 */
export function extractStructureFromDocument(
  document: SemanticDocument,
  options: ExtractStructureOptions = {},
): InferredStructureSchema {
  const walk = walkDocument(document);
  const imageCount = countSourceImages(options.sourceHtml, walk.astImageCount);

  return {
    profileType: 'structure',
    hierarchy: buildHierarchy(walk),
    macroPattern: buildMacroPattern(walk.partes),
    chapterPattern: buildChapterPattern(walk.chapters),
    enumerationStyle: buildEnumerationStyle(walk.chapters),
    tableUsage: {
      reglaActivacion: TABLE_ACTIVATION_RULE,
      ejemplo: null,
      prohibido: TABLE_FORBIDDEN_RULE,
      tablasEnFuente: walk.tableCount,
      confianza: 'verificado_en_fuente',
    },
    voiceScopeNote: VOICE_SCOPE_NOTE,
    metrics: {
      totalHeadings: walk.partes.length + walk.chapters.length + walk.subsectionCount,
      desglose: {
        h1Partes: walk.partes.length,
        h2Capitulos: walk.chapters.length,
        h3Subsecciones: walk.subsectionCount,
      },
      tablas: walk.tableCount,
      imagenes: imageCount,
    },
  };
}
