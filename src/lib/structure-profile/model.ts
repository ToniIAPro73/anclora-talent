/**
 * StructureProfile — canonical structure model (FASE 3, dual-profiles addendum).
 *
 * A StructureProfile is a *governed scaffolding contract*: hierarchy (levels
 * mapped to headings), rhetorical macro-pattern, chapter open/close patterns,
 * enumeration style, table usage and source metrics, versioned per user
 * (unique id + version + status). It NEVER captures tone, lexicon or sentence
 * style — that belongs to the BrandProfile (G3) — and a BrandProfile never
 * captures hierarchy. Both profiles are fully decoupled (G1): a project may
 * use one, the other, both or neither.
 *
 * Governance:
 * - G2: no structural profile is ever applied silently. Applying one requires
 *   an explicit human confirmation of the inferred schema; a freshly
 *   extracted schema is `draft` (≙ `pendiente_confirmacion_usuario` in the
 *   v2 contract JSON) until confirmed.
 * - G4: every structural profile records its source document
 *   (`sourceFileName`).
 *
 * The inferred-schema shape mirrors
 * `sdd/features/structure_profile_exito_sin_compania_v2.json`.
 */

/** Per-section extraction confidence, as marked in the v2 contract. */
export type StructureConfidence = 'verificado_en_fuente' | 'inferido_de_un_documento';

export type StructureProfileStatus = 'draft' | 'active' | 'deprecated';

/** Canonical hierarchy level names, in depth order (parte → capítulo → subsección). */
export const STRUCTURE_LEVEL_NAMES = ['parte', 'capitulo', 'subseccion'] as const;
export type StructureLevelName = (typeof STRUCTURE_LEVEL_NAMES)[number];

export interface StructureHierarchy {
  depth: number;
  levels: StructureLevelName[];
  /** Level name → heading tag (e.g. { parte: 'H1', capitulo: 'H2' }). */
  headingMap: Partial<Record<StructureLevelName, string>>;
  maxObservedDepth: number;
  regla: string;
  confianza: StructureConfidence;
}

export interface MacroPatternPart {
  parte: string;
  /**
   * Rhetorical function of the part. Heuristic and conservative: either a
   * generic rhetorical-arc label or `null` when nothing safe can be inferred.
   * Never mandatory — the human confirms or edits it (G2).
   */
  funcionRetorica: string | null;
}

export interface StructureMacroPattern {
  /** Human-named pattern (e.g. diagnostico_mecanismo_reconstruccion_sistema); null when inferred. */
  nombre: string | null;
  numPartes: number;
  secuencia: MacroPatternPart[];
  /** Chapters observed before the first part (book opening; usually 0 or 1). */
  capitulosDeApertura: number;
  /** Chapters per part, in part order (sums to numCapitulos - capitulosDeApertura). */
  capitulosPorParte: number[];
  regla: string;
  confianza: StructureConfidence;
}

export interface ChapterEdgePattern {
  /** Inferred pattern type (e.g. pregunta_retorica_o_afirmacion_provocadora); null when absent. */
  tipo: string | null;
  /** Observed example from the source, when any. */
  ejemplo: string | null;
  /** Always false: inferred patterns are recommendations, never laws (contract). */
  obligatorio: false;
  confianza: 'inferido_de_un_documento';
  nota: string;
}

export interface ChapterClosePattern extends ChapterEdgePattern {
  variantes: string[];
}

export interface SubsectionsPerChapter {
  promedio: number;
  rangoObservado: [number, number];
  distribucionReal: number[];
  nota: string;
}

export interface StructureChapterPattern {
  apertura: ChapterEdgePattern;
  cierre: ChapterClosePattern;
  subseccionesPorCapitulo: SubsectionsPerChapter;
}

export interface StructureEnumerationStyle {
  activador: string;
  /** Detected format, e.g. "Concepto N · Nombre del concepto". */
  formato: string;
  ejemplo: string[];
  regla: string;
  confianza: StructureConfidence;
}

export interface StructureTableUsage {
  reglaActivacion: string;
  ejemplo: string | null;
  prohibido: string;
  tablasEnFuente: number;
  confianza: StructureConfidence;
}

export interface StructureMetrics {
  totalHeadings: number;
  desglose: {
    h1Partes: number;
    h2Capitulos: number;
    h3Subsecciones: number;
  };
  tablas: number;
  imagenes: number;
}

/**
 * The full inferred structure schema — the artifact the human must confirm
 * before anything is applied (G2). Mirrors the v2 contract JSON.
 */
export interface InferredStructureSchema {
  profileType: 'structure';
  hierarchy: StructureHierarchy;
  macroPattern: StructureMacroPattern;
  chapterPattern: StructureChapterPattern;
  enumerationStyle: StructureEnumerationStyle | null;
  tableUsage: StructureTableUsage;
  voiceScopeNote: string;
  metrics: StructureMetrics;
}

export interface StructureProfile {
  id: string;
  userId: string;
  name: string;
  version: number;
  status: StructureProfileStatus;
  schema: InferredStructureSchema;
  /** Source document the schema was extracted from (G4). */
  sourceFileName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateStructureProfileInput {
  name: string;
  version?: number;
  status?: StructureProfileStatus;
  schema: InferredStructureSchema;
  sourceFileName?: string | null;
}

/** Builds a canonical StructureProfile record (new draft by default — G2). */
export function createStructureProfileRecord(
  userId: string,
  input: CreateStructureProfileInput,
  id: string = crypto.randomUUID(),
  now: string = new Date().toISOString(),
): StructureProfile {
  return {
    id,
    userId,
    name: input.name,
    version: input.version ?? 1,
    status: input.status ?? 'draft',
    schema: input.schema,
    sourceFileName: input.sourceFileName ?? null,
    createdAt: now,
    updatedAt: now,
  };
}
