import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  buildImportedDocumentSeed,
  extractTextFromBuffer,
  normalizeText,
} from '@/lib/projects/import-pipeline';
import { createProjectRecord } from '@/lib/projects/factories';
import { projectToSemanticDocument } from '@/lib/compose/preview-adapter';
import { inlineToPlainText, type SemanticDocument } from '@/lib/document/model';
import { extractStructureFromDocument } from './extract-structure-profile';
import { buildStructureScaffolding, scaffoldingPlainText } from './scaffolding';
import type { InferredStructureSchema } from './model';

/**
 * Governed scaffolding tests (FASE 3):
 * - The scaffold mirrors the confirmed structure (parts, chapters, subsection
 *   counts) with generic placeholder headlines only.
 * - No-voice-transfer guard (G3): a scaffold generated from the real fixture
 *   contains NO 6+ word phrase from the source document — form is
 *   transferred, never voice.
 */

const FIXTURE_NAME = 'exito_sin_compania.docx';
const FIXTURE_PATH = resolve(process.cwd(), 'fixtures', FIXTURE_NAME);
const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const fixtureAvailable = existsSync(FIXTURE_PATH);

function makeSchema(overrides: Partial<InferredStructureSchema> = {}): InferredStructureSchema {
  return {
    profileType: 'structure',
    hierarchy: {
      depth: 3,
      levels: ['parte', 'capitulo', 'subseccion'],
      headingMap: { parte: 'H1', capitulo: 'H2', subseccion: 'H3' },
      maxObservedDepth: 3,
      regla: 'regla',
      confianza: 'verificado_en_fuente',
    },
    macroPattern: {
      nombre: null,
      numPartes: 2,
      secuencia: [
        { parte: 'Parte fuente uno', funcionRetorica: 'identificar el problema y legitimarlo' },
        { parte: 'Parte fuente dos', funcionRetorica: null },
      ],
      capitulosDeApertura: 1,
      capitulosPorParte: [2, 1],
      regla: 'regla',
      confianza: 'inferido_de_un_documento',
    },
    chapterPattern: {
      apertura: { tipo: null, ejemplo: null, obligatorio: false, confianza: 'inferido_de_un_documento', nota: '' },
      cierre: { tipo: null, variantes: [], ejemplo: null, obligatorio: false, confianza: 'inferido_de_un_documento', nota: '' },
      subseccionesPorCapitulo: {
        promedio: 1,
        rangoObservado: [0, 2],
        distribucionReal: [0, 2, 1, 0],
        nota: '',
      },
    },
    enumerationStyle: null,
    tableUsage: {
      reglaActivacion: 'regla',
      ejemplo: null,
      prohibido: 'regla',
      tablasEnFuente: 0,
      confianza: 'verificado_en_fuente',
    },
    voiceScopeNote: 'nota',
    metrics: {
      totalHeadings: 10,
      desglose: { h1Partes: 2, h2Capitulos: 4, h3Subsecciones: 3 },
      tablas: 0,
      imagenes: 0,
    },
    ...overrides,
  };
}

function tokenize(input: string): string[] {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
}

function ngrams(tokens: string[], size: number): Set<string> {
  const grams = new Set<string>();
  for (let i = 0; i + size <= tokens.length; i += 1) {
    grams.add(tokens.slice(i, i + size).join(' '));
  }
  return grams;
}

function sourcePlainText(document: SemanticDocument): string {
  return document.blocks
    .map((block) => {
      if (block.type === 'heading' || block.type === 'paragraph' || block.type === 'quote') {
        return inlineToPlainText(block.content);
      }
      if (block.type === 'list') {
        return block.items.map((item) => inlineToPlainText(item)).join(' ');
      }
      return '';
    })
    .join(' ');
}

async function fixtureSchemaAndDocument() {
  const buffer = readFileSync(FIXTURE_PATH);
  const extracted = await extractTextFromBuffer(FIXTURE_NAME, DOCX_MIME, buffer);
  const seed = buildImportedDocumentSeed({
    fileName: FIXTURE_NAME,
    mimeType: DOCX_MIME,
    text: normalizeText(extracted.text),
    html: extracted.html,
    sourcePageCount: extracted.pageCount,
  });
  const project = createProjectRecord('scaffold-user', {
    title: seed.title,
    importedDocument: seed,
  });
  const { document } = projectToSemanticDocument(project);
  return {
    document,
    schema: extractStructureFromDocument(document, { sourceHtml: extracted.html }),
  };
}

describe('buildStructureScaffolding', () => {
  it('scaffolds parts, chapters and subsections from the confirmed schema', () => {
    const seed = buildStructureScaffolding(makeSchema(), {
      title: 'Mi libro',
      sourceFileName: 'referencia.docx',
    });

    const titles = (seed.chapters ?? []).map((chapter) => chapter.title);
    expect(titles).toEqual([
      'Capítulo de apertura 1 · [título del capítulo]',
      'Parte 1 · [tu diagnóstico]',
      'Capítulo 1.1 · [título del capítulo]',
      'Capítulo 1.2 · [título del capítulo]',
      'Parte 2 · [título de la parte]',
      'Capítulo 2.1 · [título del capítulo]',
    ]);

    // Subsection counts follow the confirmed distribution [0, 2, 1, 0].
    const chapterH3Counts = (seed.chapters ?? [])
      .filter((chapter) => chapter.title.startsWith('Capítulo'))
      .map(
        (chapter) =>
          chapter.blocks.filter(
            (block) => block.type === 'heading' && block.content.startsWith('<h3>'),
          ).length,
      );
    expect(chapterH3Counts).toEqual([0, 2, 1, 0]);

    // Part dividers are H1, chapters H2 — hierarchy preserved (G: forma).
    const divider = (seed.chapters ?? [])[1];
    expect(divider.blocks[0].content).toBe('<h1>Parte 1 · [tu diagnóstico]</h1>');

    // G3: no source part titles leak into the scaffold.
    const text = scaffoldingPlainText(seed);
    expect(text).not.toContain('Parte fuente uno');
    expect(text).not.toContain('Parte fuente dos');
  });

  it('never emits an empty scaffold, even for a degenerate schema', () => {
    const seed = buildStructureScaffolding(
      makeSchema({
        macroPattern: {
          nombre: null,
          numPartes: 0,
          secuencia: [],
          capitulosDeApertura: 0,
          capitulosPorParte: [],
          regla: 'regla',
          confianza: 'inferido_de_un_documento',
        },
      }),
    );
    expect(seed.chapters?.length).toBeGreaterThan(0);
  });
});

describe.skipIf(!fixtureAvailable)(
  `no-voice-transfer guard — fixture real ${FIXTURE_NAME} (G3)`,
  () => {
    it('the scaffold from the fixture schema contains no 6+ word phrase from the source', async () => {
      const { document, schema } = await fixtureSchemaAndDocument();

      const seed = buildStructureScaffolding(schema, {
        title: 'Proyecto andamio',
        sourceFileName: FIXTURE_NAME,
      });

      // Structure mirrors the confirmed schema: 1 opening + 4 parts + 11 chapters.
      expect(seed.chapters).toHaveLength(16);

      const sourceGrams = ngrams(tokenize(sourcePlainText(document)), 6);
      expect(sourceGrams.size).toBeGreaterThan(0);

      const scaffoldTokens = tokenize(scaffoldingPlainText(seed));
      for (let i = 0; i + 6 <= scaffoldTokens.length; i += 1) {
        const gram = scaffoldTokens.slice(i, i + 6).join(' ');
        expect(sourceGrams.has(gram)).toBe(false);
      }
    });

    it('scaffolded chapters contain only placeholder headlines and empty bodies', async () => {
      const { schema } = await fixtureSchemaAndDocument();
      const seed = buildStructureScaffolding(schema, { sourceFileName: FIXTURE_NAME });

      const text = scaffoldingPlainText(seed);
      expect(text).not.toContain('El diagnóstico');
      expect(text).not.toContain('Coraza');
      expect(text).not.toContain('vulnerabilidad');

      for (const chapter of seed.chapters ?? []) {
        for (const block of chapter.blocks) {
          expect(block.content).toMatch(/\[.*\]|<h[123]>/);
        }
      }
    });
  },
);
