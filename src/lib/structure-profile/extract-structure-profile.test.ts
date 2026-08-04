import { describe, expect, it } from 'vitest';
import {
  createEmptyDocument,
  type DocumentBlock,
  type SemanticDocument,
} from '@/lib/document/model';
import { extractStructureFromDocument } from './extract-structure-profile';

/**
 * Unit tests for the structural extractor (FASE 3): each field of the
 * inferred schema, confidence marking, TOC-zone exclusion, image counting
 * and conservative null heuristics. Synthetic documents only — the fixture
 * hard contract lives in `extract-structure-profile.contract.test.ts`.
 */

let idCounter = 0;
function nextId() {
  idCounter += 1;
  return `t-${idCounter}`;
}

function heading(level: 1 | 2 | 3 | 4, text: string): DocumentBlock {
  return { type: 'heading', id: nextId(), level, content: [{ type: 'text', text }] };
}

function paragraph(text: string): DocumentBlock {
  return { type: 'paragraph', id: nextId(), content: [{ type: 'text', text }] };
}

function table(): DocumentBlock {
  return {
    type: 'table',
    id: nextId(),
    rows: [[[{ type: 'text', text: 'a' }]]],
    hasHeader: false,
  };
}

function doc(blocks: DocumentBlock[]): SemanticDocument {
  return { ...createEmptyDocument({ title: 'Test' }), blocks };
}

describe('extractStructureFromDocument', () => {
  it('maps parte/capitulo/subseccion to H1/H2/H3 and counts per level', () => {
    const schema = extractStructureFromDocument(
      doc([
        heading(1, 'Parte uno'),
        heading(2, 'Capítulo uno'),
        heading(3, 'Subsección uno'),
        heading(3, 'Subsección dos'),
        paragraph('Texto del capítulo.'),
        heading(2, 'Capítulo dos'),
        paragraph('Cierre.'),
      ]),
    );

    expect(schema.hierarchy.depth).toBe(3);
    expect(schema.hierarchy.levels).toEqual(['parte', 'capitulo', 'subseccion']);
    expect(schema.hierarchy.headingMap).toEqual({ parte: 'H1', capitulo: 'H2', subseccion: 'H3' });
    expect(schema.metrics.desglose).toEqual({ h1Partes: 1, h2Capitulos: 2, h3Subsecciones: 2 });
    expect(schema.metrics.totalHeadings).toBe(5);
  });

  it('marks hierarchy/table confidences as verificado_en_fuente and inferred patterns as inferido_de_un_documento', () => {
    const schema = extractStructureFromDocument(
      doc([heading(1, 'Parte'), heading(2, 'Capítulo'), paragraph('Texto.')]),
    );

    expect(schema.hierarchy.confianza).toBe('verificado_en_fuente');
    expect(schema.tableUsage.confianza).toBe('verificado_en_fuente');
    expect(schema.macroPattern.confianza).toBe('inferido_de_un_documento');
    expect(schema.chapterPattern.apertura.confianza).toBe('inferido_de_un_documento');
    expect(schema.chapterPattern.cierre.confianza).toBe('inferido_de_un_documento');
    expect(schema.chapterPattern.apertura.obligatorio).toBe(false);
    expect(schema.chapterPattern.cierre.obligatorio).toBe(false);
  });

  it('excludes TOC zones (Índice) so duplicated outline headings are never double-counted', () => {
    const schema = extractStructureFromDocument(
      doc([
        heading(2, 'Índice'),
        heading(2, 'El diagnóstico'),
        heading(2, 'La reconstrucción'),
        heading(1, 'El diagnóstico'),
        heading(2, 'Capítulo real'),
        heading(1, 'La reconstrucción'),
        heading(2, 'Otro capítulo'),
      ]),
    );

    expect(schema.metrics.desglose.h2Capitulos).toBe(2);
    expect(schema.metrics.desglose.h1Partes).toBe(2);
    expect(schema.macroPattern.secuencia.map((part) => part.parte)).toEqual([
      'El diagnóstico',
      'La reconstrucción',
    ]);
  });

  it('infers rhetorical functions with the conservative keyword heuristic, null otherwise', () => {
    const schema = extractStructureFromDocument(
      doc([
        heading(1, 'El diagnóstico inicial'),
        heading(1, 'Los mecanismos ocultos'),
        heading(1, 'La reconstrucción'),
        heading(1, 'El sistema que sostiene'),
        heading(1, 'Apéndice sin patrón'),
      ]),
    );

    expect(schema.macroPattern.numPartes).toBe(5);
    expect(schema.macroPattern.secuencia.map((part) => part.funcionRetorica)).toEqual([
      'identificar el problema y legitimarlo',
      'explicar por qué ocurre',
      'ofrecer vía de salida',
      'convertir la solución en hábito sostenible',
      null,
    ]);
  });

  it('detects the "Concepto N · Nombre" enumeration style only with 2+ matching headings', () => {
    const withEnumeration = extractStructureFromDocument(
      doc([
        heading(1, 'Parte'),
        heading(2, 'Capítulo'),
        heading(3, 'Coraza 1 · La competencia'),
        heading(3, 'Coraza 2 · La utilidad'),
      ]),
    );
    expect(withEnumeration.enumerationStyle?.formato).toBe('Concepto N · Nombre del concepto');
    expect(withEnumeration.enumerationStyle?.ejemplo).toEqual([
      'Coraza 1 · La competencia',
      'Coraza 2 · La utilidad',
    ]);

    const single = extractStructureFromDocument(
      doc([heading(1, 'Parte'), heading(2, 'Capítulo'), heading(3, 'Coraza 1 · Solitaria')]),
    );
    expect(single.enumerationStyle).toBeNull();

    const plain = extractStructureFromDocument(
      doc([heading(1, 'Parte'), heading(2, 'Capítulo'), heading(3, 'Sin enumeración')]),
    );
    expect(plain.enumerationStyle).toBeNull();
  });

  it('computes the per-chapter subsection distribution, average and range', () => {
    const schema = extractStructureFromDocument(
      doc([
        heading(1, 'Parte'),
        heading(2, 'Capítulo apertura'),
        heading(3, 'Una'),
        heading(3, 'Dos'),
        heading(2, 'Capítulo central'),
        heading(3, 'A'),
        heading(3, 'B'),
        heading(3, 'C'),
        heading(3, 'D'),
        heading(2, 'Capítulo cierre'),
      ]),
    );

    const subsecciones = schema.chapterPattern.subseccionesPorCapitulo;
    expect(subsecciones.distribucionReal).toEqual([2, 4, 0]);
    expect(subsecciones.promedio).toBe(2);
    expect(subsecciones.rangoObservado).toEqual([0, 4]);
  });

  it('infers apertura from a question chapter title and cierre from actionable synthesis titles', () => {
    const schema = extractStructureFromDocument(
      doc([
        heading(1, 'Parte'),
        heading(2, '¿Por qué te sientes así?'),
        heading(3, 'Primera idea'),
        paragraph('Contenido.'),
        heading(2, 'Capítulo de práctica'),
        heading(3, 'Cómo se practica, paso a paso'),
        paragraph('Contenido.'),
      ]),
    );

    expect(schema.chapterPattern.apertura.tipo).toBe('pregunta_retorica_o_afirmacion_provocadora');
    expect(schema.chapterPattern.apertura.ejemplo).toBe('¿Por qué te sientes así?');
    expect(schema.chapterPattern.cierre.tipo).toBe('sintesis_accionable');
    expect(schema.chapterPattern.cierre.ejemplo).toBe('Cómo se practica, paso a paso');
  });

  it('leaves apertura/cierre types null when no consistent pattern is observed', () => {
    const schema = extractStructureFromDocument(
      doc([
        heading(1, 'Parte'),
        heading(2, 'Capítulo descriptivo'),
        paragraph('Texto sin patrón.'),
      ]),
    );

    expect(schema.chapterPattern.apertura.tipo).toBeNull();
    expect(schema.chapterPattern.apertura.ejemplo).toBeNull();
    expect(schema.chapterPattern.cierre.tipo).toBeNull();
    expect(schema.chapterPattern.cierre.ejemplo).toBeNull();
  });

  it('counts tables from the AST and images from sourceHtml when provided', () => {
    const schema = extractStructureFromDocument(
      doc([heading(1, 'Parte'), table(), table()]),
      { sourceHtml: '<p>x</p><img src="a.png"><p>y</p><img src="b.png" />' },
    );

    expect(schema.metrics.tablas).toBe(2);
    expect(schema.tableUsage.tablasEnFuente).toBe(2);
    expect(schema.metrics.imagenes).toBe(2);
  });

  it('falls back to AST image blocks when no sourceHtml is given', () => {
    const schema = extractStructureFromDocument(
      doc([
        heading(1, 'Parte'),
        { type: 'image', id: nextId(), src: 'data:image/png;base64,x' },
      ]),
    );

    expect(schema.metrics.imagenes).toBe(1);
  });

  it('declares the no-H4 rule and trims deeper observed hierarchies honestly', () => {
    const schema = extractStructureFromDocument(
      doc([heading(1, 'Parte'), heading(2, 'Capítulo'), heading(3, 'Sub'), heading(4, 'H4 profundo')]),
    );

    expect(schema.hierarchy.maxObservedDepth).toBe(4);
    expect(schema.hierarchy.depth).toBe(3);
    expect(schema.hierarchy.regla).toContain('H4');
  });
});
