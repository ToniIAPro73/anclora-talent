/**
 * KDP AI-content disclosure (F3, Capa 2 — governance).
 *
 * Builds the declaration text for Amazon KDP's "AI-generated content"
 * question from two governance sources:
 * - the provenance registry (blockId → human/ai on `project_documents`);
 * - the AI operations log (accepted proposals, `operations-log.ts`).
 *
 * Rules:
 * - Any block stamped `ai` → disclosure REQUIRED ("AI-assisted" content):
 *   the text declares AI assistance and summarizes which AI operations were
 *   accepted, and states that a human reviewed and approved every change
 *   (the product only writes through human-accepted proposals).
 * - 100% human content → EXEMPT declaration: no AI operation was applied.
 *
 * Pure and localized (es/en). The F4 launch-pack plan will embed this text
 * in the export pack; this module only generates it (and the export panel
 * displays it) — nothing is wired into the manifest yet.
 */

import { countProvenance, type ProvenanceMap } from './provenance';
import type { AiOperationRecord } from './operations-log';
import type { AiProposalKind } from './ast-diff-proposal';
import type { AiLocale } from './structural-assistant';

export interface KdpDisclosureInput {
  provenance: ProvenanceMap | null | undefined;
  operations: AiOperationRecord[];
  locale?: AiLocale;
}

export interface KdpDisclosure {
  /** True when the book must declare AI-assisted content to KDP. */
  required: boolean;
  aiBlockCount: number;
  humanBlockCount: number;
  /** Ready-to-paste declaration text (localized). */
  text: string;
}

const KIND_LABELS: Record<AiProposalKind, { es: string; en: string }> = {
  'heading-level': { es: 'corrección de jerarquía de encabezados', en: 'heading hierarchy fix' },
  'merge-paragraphs': { es: 'unión de párrafos', en: 'paragraph merge' },
  'broken-ref': { es: 'materialización de referencia rota', en: 'broken reference fix' },
  'duplicate-heading': { es: 'renombrado de encabezado duplicado', en: 'duplicate heading rename' },
  'chapter-heading': { es: 'encabezado de capítulo propuesto', en: 'chapter heading suggestion' },
  'llm-suggested': { es: 'corrección sugerida por IA', en: 'AI-suggested fix' },
  'style-rewrite': { es: 'reescritura de estilo', en: 'style rewrite' },
  'content-architecture': { es: 'reestructura de contenido', en: 'content restructure' },
  'derived-summary': { es: 'capítulo de resumen derivado', en: 'derived summary chapter' },
  advisory: { es: 'aviso editorial', en: 'editorial advisory' },
};

function summarizeOperations(operations: AiOperationRecord[], locale: AiLocale): string {
  const counts = new Map<AiProposalKind, number>();
  for (const operation of operations) {
    counts.set(operation.kind, (counts.get(operation.kind) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([kind, count]) => {
      const label = KIND_LABELS[kind]?.[locale] ?? kind;
      return locale === 'en' ? `${count} × ${label}` : `${count} × ${label}`;
    })
    .join('; ');
}

/**
 * Builds the KDP declaration. `operations` should be the accepted-operation
 * registry of the project; `provenance` the current block registry.
 */
export function buildKdpDisclosure(input: KdpDisclosureInput): KdpDisclosure {
  const locale = input.locale ?? 'es';
  const { ai, human } = countProvenance(input.provenance);
  const required = ai > 0;
  const acceptedSummary = summarizeOperations(input.operations, locale);

  let text: string;
  if (!required) {
    text =
      locale === 'en'
        ? 'AI-generated content declaration (Amazon KDP): not required. All content in this book is human-authored; no AI operation was accepted over the manuscript.'
        : 'Declaración de contenido generado con IA (Amazon KDP): no requerida. Todo el contenido de este libro es de autoría humana; no se aceptó ninguna operación de IA sobre el manuscrito.';
  } else {
    const operationsClause = acceptedSummary
      ? locale === 'en'
        ? ` Accepted AI operations: ${acceptedSummary}.`
        : ` Operaciones de IA aceptadas: ${acceptedSummary}.`
      : '';
    text =
      locale === 'en'
        ? `AI-generated content declaration (Amazon KDP): this book contains AI-assisted content. ${ai} block(s) of the manuscript were created or rewritten by the AI editorial assistant; every change was proposed as a reviewable diff and explicitly approved by the author.${operationsClause}`
        : `Declaración de contenido generado con IA (Amazon KDP): este libro contiene contenido creado con asistencia de IA («AI-assisted»). ${ai} bloque(s) del manuscrito fueron creados o reescritos por el asistente editorial de IA; cada cambio se propuso como un diff revisable y fue aprobado explícitamente por el autor/a.${operationsClause}`;
  }

  return { required, aiBlockCount: ai, humanBlockCount: human, text };
}
