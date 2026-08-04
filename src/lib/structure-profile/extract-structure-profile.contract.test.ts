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
import { extractStructureFromDocument } from './extract-structure-profile';

/**
 * Hard contract test (FASE 3): the structural extractor, run over the real
 * `exito_sin_compania.docx` fixture through the production import pipeline,
 * must reproduce EXACTLY the validated metrics of
 * `sdd/features/structure_profile_exito_sin_compania_v2.json`:
 * hierarchy depth 3 (parte/capitulo/subseccion → H1/H2/H3), 4 H1 / 12 H2 /
 * 41 H3 = 57 headings (the DOCX has 42 Heading-3 paragraphs but one is empty
 * and is not counted), 14 tables, 3 images, and the exact per-chapter
 * subsection distribution [2,4,4,4,3,4,4,4,4,4,4,0] (avg 3.42, range [0,4]).
 *
 * The fixture is provided by the repo owner; while absent the suite skips.
 */

const FIXTURE_NAME = 'exito_sin_compania.docx';
const FIXTURE_PATH = resolve(process.cwd(), 'fixtures', FIXTURE_NAME);
const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

const fixtureAvailable = existsSync(FIXTURE_PATH);

async function extractFixtureSchema() {
  const buffer = readFileSync(FIXTURE_PATH);
  const extracted = await extractTextFromBuffer(FIXTURE_NAME, DOCX_MIME, buffer);
  const seed = buildImportedDocumentSeed({
    fileName: FIXTURE_NAME,
    mimeType: DOCX_MIME,
    text: normalizeText(extracted.text),
    html: extracted.html,
    sourcePageCount: extracted.pageCount,
  });
  const project = createProjectRecord('contract-user', {
    title: seed.title,
    importedDocument: seed,
  });
  const { document } = projectToSemanticDocument(project);
  return extractStructureFromDocument(document, {
    sourceDocumentName: FIXTURE_NAME,
    sourceHtml: extracted.html,
  });
}

describe.skipIf(!fixtureAvailable)(
  `structure profile contract — fixture real ${FIXTURE_NAME} (v2 JSON)`,
  () => {
    it('reproduces the exact v2 hierarchy contract', async () => {
      const schema = await extractFixtureSchema();

      expect(schema.hierarchy).toEqual({
        depth: 3,
        levels: ['parte', 'capitulo', 'subseccion'],
        headingMap: { parte: 'H1', capitulo: 'H2', subseccion: 'H3' },
        maxObservedDepth: 3,
        regla:
          'No se admite un cuarto nivel (H4). Si el contenido lo requiere, se resuelve con lista o tabla dentro del H3.',
        confianza: 'verificado_en_fuente',
      });
    });

    it('reproduces the exact v2 metrics: 4 H1 / 12 H2 / 41 H3 = 57, 14 tables, 3 images', async () => {
      const schema = await extractFixtureSchema();

      expect(schema.metrics).toEqual({
        totalHeadings: 57,
        desglose: { h1Partes: 4, h2Capitulos: 12, h3Subsecciones: 41 },
        tablas: 14,
        imagenes: 3,
      });
    });

    it('reproduces the exact v2 subsections-per-chapter distribution', async () => {
      const schema = await extractFixtureSchema();
      const subsecciones = schema.chapterPattern.subseccionesPorCapitulo;

      expect(subsecciones.promedio).toBe(3.42);
      expect(subsecciones.rangoObservado).toEqual([0, 4]);
      expect(subsecciones.distribucionReal).toEqual([2, 4, 4, 4, 3, 4, 4, 4, 4, 4, 4, 0]);
    });

    it('reproduces the v2 macro-pattern: 4 parts with their rhetorical functions', async () => {
      const schema = await extractFixtureSchema();

      expect(schema.macroPattern.numPartes).toBe(4);
      expect(schema.macroPattern.secuencia).toEqual([
        { parte: 'El diagnóstico', funcionRetorica: 'identificar el problema y legitimarlo' },
        { parte: 'Los mecanismos invisibles', funcionRetorica: 'explicar por qué ocurre' },
        { parte: 'La reconstrucción', funcionRetorica: 'ofrecer vía de salida' },
        { parte: 'El sistema que sostiene', funcionRetorica: 'convertir la solución en hábito sostenible' },
      ]);
      // Heuristic field: confidence marked, never mandatory.
      expect(schema.macroPattern.confianza).toBe('inferido_de_un_documento');
    });

    it('infers chapter open/close patterns as non-mandatory, confidence-marked heuristics', async () => {
      const schema = await extractFixtureSchema();

      expect(schema.chapterPattern.apertura).toMatchObject({
        tipo: 'pregunta_retorica_o_afirmacion_provocadora',
        ejemplo: 'Lo tienes todo, entonces ¿por qué te sientes así?',
        obligatorio: false,
        confianza: 'inferido_de_un_documento',
      });
      expect(schema.chapterPattern.cierre).toMatchObject({
        tipo: 'sintesis_accionable',
        ejemplo: 'Cómo se practica, paso a paso',
        obligatorio: false,
        confianza: 'inferido_de_un_documento',
      });
    });

    it('reproduces the v2 enumeration style (Concepto N · Nombre)', async () => {
      const schema = await extractFixtureSchema();

      expect(schema.enumerationStyle).toEqual({
        activador: 'contenido_taxonomico_o_tipologico',
        formato: 'Concepto N · Nombre del concepto',
        ejemplo: [
          'Coraza 1 · La competencia',
          'Coraza 2 · La utilidad',
          'Coraza 3 · El control',
          'Coraza 4 · La ocupación',
        ],
        regla:
          'Se usa numeración solo cuando los elementos son mutuamente excluyentes y del mismo orden lógico. No se usa para listas simplemente secuenciales.',
        confianza: 'verificado_en_fuente',
      });
    });

    it('declares the voice-scope boundary (G3): form is transferred, never voice', async () => {
      const schema = await extractFixtureSchema();

      expect(schema.voiceScopeNote).toContain('NO captura tono, léxico ni estilo de frase');
      expect(schema.tableUsage.tablasEnFuente).toBe(14);
    });
  },
);
