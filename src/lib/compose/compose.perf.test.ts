import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  buildImportedDocumentSeed,
  extractTextFromBuffer,
  normalizeText,
} from '@/lib/projects/import-pipeline';
import { createProjectRecord } from '@/lib/projects/factories';
import { inlineToPlainText } from '@/lib/document/model';
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
const FIXTURE_PATH = resolve(process.cwd(), 'fixtures', FIXTURE_NAME);
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

    it(
      'demo exit criteria: TOC H1-H3 regenerado, tablas intactas, recomposición en vivo',
      async () => {
        const { document, chapterStartIds } = await importFixtureToSemanticDocument();
        const measurer = createHeuristicMeasurer();
        const baseTemplate = templateFromPaginationConfig(DEVICE_PAGINATION_CONFIGS.laptop);
        const template = { ...baseTemplate, tocDepth: 3 };
        const options = { chapterStartIds };

        // The canonical chapter from the exit criteria exists after import.
        const chapterHeading = document.blocks.find(
          (block) =>
            block.type === 'heading' &&
            inlineToPlainText(block.content).toLowerCase().includes('paradoja del éxito solitario'),
        );
        expect(chapterHeading).toBeDefined();

        // TOC is 100% generated with H1-H3 depth: the H3 sections appear.
        const base = compose(document, null, template, measurer, options);
        const tocLevels = new Set(base.toc.map((entry) => entry.level));
        const h3Count = base.toc.filter((entry) => entry.level === 3).length;
        console.info('[compose.perf] estructura TOC del fixture', {
          levels: [...tocLevels].sort(),
          entries: base.toc.length,
          h3: h3Count,
          tables: document.blocks.filter((block) => block.type === 'table').length,
        });
        expect(tocLevels.has(1)).toBe(true);
        expect(tocLevels.has(2)).toBe(true);
        expect(tocLevels.has(3)).toBe(true);

        // The 14 tables stay intact: no keepTogether.table violation is emitted.
        const tableViolations = base.violations.filter((violation) =>
          violation.rule.includes('table'),
        );
        expect(tableViolations).toEqual([]);

        // No empty intermediate pages (blank padding pages for odd-page
        // chapter starts are legitimate).
        for (const page of base.pages) {
          if (page.blank) continue;
          expect(page.placements.length).toBeGreaterThan(0);
        }

        // Live edit: add a paragraph in "La paradoja del éxito solitario".
        const insertAfter = document.blocks.findIndex((block) => block.id === chapterHeading!.id);
        const editedParagraph = {
          type: 'paragraph' as const,
          id: 'demo-edit-paragraph',
          content: [
            {
              type: 'text' as const,
              text: 'Párrafo añadido en la demo: el índice y la paginación se actualizan solos.',
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

        // Incremental recomposition matches a full recompose exactly: TOC and
        // pagination update themselves, earlier pages reused verbatim.
        const incremental = composeIncremental(
          base,
          edited,
          editedParagraph.id,
          null,
          template,
          measurer,
          options,
        );
        const full = compose(edited, null, template, measurer, options);
        expect(incremental.pages.length).toBe(full.pages.length);
        expect(incremental.toc).toEqual(full.toc);
        expect(incremental.pages[0]).toBe(base.pages[0]);
        expect(incremental.violations.filter((v) => v.rule.includes('table'))).toEqual([]);
      },
      60_000,
    );
  },
);
