#!/usr/bin/env tsx
/**
 * EPUB gate (F1): builds an EPUB from the REAL fixture
 * (`fixtures/exito_sin_compania.docx`, 46-page book) through the canonical
 * pipeline — import → compose → buildEpub — and validates it with EPUBCheck.
 * Any FATAL/ERROR reported by EPUBCheck fails the gate (exit 1).
 *
 * Usage:
 *   EPUBCHECK_JAR=.epubcheck/epubcheck-5.1.0/epubcheck.jar npx tsx scripts/check-epub.ts
 *
 * EPUBCheck is a Java tool (pinned v5.1.0); CI downloads the distribution
 * into `.epubcheck/` (see .github/workflows/ci.yml). The npm `epubcheck`
 * package was evaluated and discarded: it is an abandoned 0.x wrapper.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  buildImportedDocumentSeed,
  extractTextFromBuffer,
  normalizeText,
} from '../src/lib/projects/import-pipeline';
import { createProjectRecord } from '../src/lib/projects/factories';
import { composeProjectPreview } from '../src/lib/compose/preview-adapter';
import { DEVICE_PAGINATION_CONFIGS } from '../src/lib/preview/device-configs';
import { buildEpub } from '../src/lib/epub';

const FIXTURE_NAME = 'exito_sin_compania.docx';
const FIXTURE_PATH = resolve(process.cwd(), 'fixtures', FIXTURE_NAME);
const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const OUTPUT_DIR = resolve(process.cwd(), '.epub-check');
const EPUBCHECK_JAR = resolve(
  process.env.EPUBCHECK_JAR ?? resolve(process.cwd(), '.epubcheck/epubcheck-5.1.0/epubcheck.jar'),
);

async function main() {
  if (!existsSync(FIXTURE_PATH)) {
    console.error(`[check-epub] FALTA el fixture real ${FIXTURE_PATH} — el gate EPUB no se puede ejecutar.`);
    process.exit(1);
  }
  if (!existsSync(EPUBCHECK_JAR)) {
    console.error(
      `[check-epub] EPUBCheck no encontrado en ${EPUBCHECK_JAR}.\n` +
        'Descarga la distribución pineada (v5.1.0) de ' +
        'https://github.com/w3c/epubcheck/releases/tag/v5.1.0 o define EPUBCHECK_JAR.',
    );
    process.exit(1);
  }

  const buffer = readFileSync(FIXTURE_PATH);
  const extracted = await extractTextFromBuffer(FIXTURE_NAME, DOCX_MIME, buffer);
  const seed = buildImportedDocumentSeed({
    fileName: FIXTURE_NAME,
    mimeType: DOCX_MIME,
    text: normalizeText(extracted.text),
    html: extracted.html,
    sourcePageCount: extracted.pageCount,
  });
  const project = createProjectRecord('epub-check-user', {
    title: seed.title,
    importedDocument: seed,
  });

  // EPUB is reflowable: the laptop template only drives refs/numbering; the
  // engine TOC is forced to depth 3 (NAV + NCX carry real H1-H3 levels).
  const composed = composeProjectPreview(project, DEVICE_PAGINATION_CONFIGS.laptop, undefined, {
    tocDepth: 3,
  });
  const epub = await buildEpub(project, composed);

  mkdirSync(OUTPUT_DIR, { recursive: true });
  const epubPath = resolve(OUTPUT_DIR, 'exito_sin_compania.epub');
  writeFileSync(epubPath, epub);
  const tocLevels = [...new Set(composed.result.toc.map((entry) => entry.level))].sort();
  console.info('[check-epub] EPUB generado desde el fixture real', {
    path: epubPath,
    bytes: epub.byteLength,
    tocEntries: composed.result.toc.length,
    tocLevels,
  });

  const result = spawnSync('java', ['-jar', EPUBCHECK_JAR, epubPath], {
    stdio: 'inherit',
  });
  if (result.error) {
    console.error('[check-epub] no se pudo ejecutar EPUBCheck (¿java instalado?)', result.error);
    process.exit(1);
  }
  if (result.status !== 0) {
    console.error(`[check-epub] EPUBCheck reportó FATAL/ERROR (exit ${result.status}).`);
    process.exit(result.status ?? 1);
  }
  console.info('[check-epub] EPUBCheck OK: EPUB 3 válido sin FATAL/ERROR.');
}

main().catch((error) => {
  console.error('[check-epub] fallo inesperado', error);
  process.exit(1);
});
