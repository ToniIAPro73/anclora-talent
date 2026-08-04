import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  buildImportedDocumentSeed,
  extractTextFromBuffer,
  normalizeText,
} from '@/lib/projects/import-pipeline';
import { createProjectRecord } from '@/lib/projects/factories';
import {
  projectToSemanticDocument,
  templateFromPaginationConfig,
} from '@/lib/compose/preview-adapter';
import { DEVICE_PAGINATION_CONFIGS } from '@/lib/preview/device-configs';
import { compose, composeIncremental } from './compose';
import { createHeuristicMeasurer } from './measure';

/**
 * Recomposition budget gate (F0.2): the incremental recomposition after a
 * single edit must stay well under the 300 ms budget on a real book. The
 * gate runs against the real DOCX fixture — never a synthetic document.
 *
 * The fixture (`fixtures/exito_sin_compania.docx`, 46-page real book: 4 H1,
 * 12 H2, 42 H3, 14 tables, 3 images, 42 manual page breaks, cached TOC) is
 * provided by the repo owner. While it is absent the suite is skipped.
 */

const FIXTURE_NAME = 'exito_sin_compania.docx';
const FIXTURE_PATH = fileURLToPath(new URL(`../../../fixtures/${FIXTURE_NAME}`, import.meta.url));
const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

const fixtureAvailable = existsSync(FIXTURE_PATH);
if (!fixtureAvailable) {
  console.info(
    `[compose.perf] pendiente fixture ${FIXTURE_NAME}: ` +
      `colócalo en fixtures/ para activar el test de presupuesto de recomposición (<300 ms).`,
  );
}

const BUDGET_MS = 300;
const ITERATIONS = 5;

async function importFixtureToSemanticDocument() {
  const buffer = readFileSync(FIXTURE_PATH);
  const extracted = await extractTextFromBuffer(FIXTURE_NAME, DOCX_MIME, buffer);
  const seed = buildImportedDocumentSeed({
    fileName: FIXTURE_NAME,
    mimeType: DOCX_MIME,
    text: normalizeText(extracted.text),
    html: extracted.html,
    sourcePageCount: extracted.pageCount,
  });
  const project = createProjectRecord('perf-user', {
    title: seed.title,
    importedDocument: seed,
  });
  return projectToSemanticDocument(project);
}

describe.skipIf(!fixtureAvailable)(
  `recomposition budget (<${BUDGET_MS} ms) — fixture real ${FIXTURE_NAME}`,
  () => {
    it(
      'incremental recomposition after one edit averages under the budget',
      async () => {
        const { document, chapterStartIds } = await importFixtureToSemanticDocument();
        const measurer = createHeuristicMeasurer();
        const template = templateFromPaginationConfig(DEVICE_PAGINATION_CONFIGS.laptop);
        const options = { chapterStartIds };

        const base = compose(document, null, template, measurer, options);
        expect(base.pages.length).toBeGreaterThan(0);

        // Edit: append one paragraph to a middle chapter.
        const middleChapterStartId = chapterStartIds[Math.floor(chapterStartIds.length / 2)];
        const insertAfter = document.blocks.findIndex((block) => block.id === middleChapterStartId);
        expect(insertAfter).toBeGreaterThanOrEqual(0);
        const editedParagraph = {
          type: 'paragraph' as const,
          id: 'perf-edit-paragraph',
          content: [
            {
              type: 'text' as const,
              text: 'Párrafo añadido por el test de presupuesto para forzar una recomposición incremental del capítulo.',
            },
          ],
        };
        const edited = {
          ...document,
          blocks: [
            ...document.blocks.slice(0, insertAfter + 1),
            editedParagraph,
            ...document.blocks.slice(insertAfter + 1),
          ],
        };

        // Warm-up (JIT) before measuring.
        composeIncremental(base, edited, editedParagraph.id, null, template, measurer, options);

        const durations: number[] = [];
        for (let iteration = 0; iteration < ITERATIONS; iteration += 1) {
          const startedAt = performance.now();
          composeIncremental(base, edited, editedParagraph.id, null, template, measurer, options);
          durations.push(performance.now() - startedAt);
        }

        const avgMs = durations.reduce((total, ms) => total + ms, 0) / durations.length;
        console.info('[compose.perf] métricas de recomposición incremental', {
          pages: base.pages.length,
          blocks: document.blocks.length,
          iterations: ITERATIONS,
          durationsMs: durations.map((ms) => Math.round(ms * 100) / 100),
          avgMs: Math.round(avgMs * 100) / 100,
          budgetMs: BUDGET_MS,
        });

        // The incremental path actually engaged: pages of earlier chapters
        // are reused verbatim from the previous composition.
        const incremental = composeIncremental(
          base,
          edited,
          editedParagraph.id,
          null,
          template,
          measurer,
          options,
        );
        expect(incremental.pages[0]).toBe(base.pages[0]);
        expect(incremental.pages.length).toBe(
          compose(edited, null, template, measurer, options).pages.length,
        );

        expect(avgMs).toBeLessThan(BUDGET_MS);
      },
      60_000,
    );
  },
);
