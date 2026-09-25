import fs from 'node:fs';
import path from 'node:path';

export interface TestPackBuffers {
  manuscriptDocx: Buffer;
  manuscriptMd: Buffer;
  referenceDocx: Buffer;
  brandPdf: Buffer;
}

const CORPUS_DIR = path.resolve(process.cwd(), 'src/lib/test-fixtures/corpus');

export function getTestPackPaths() {
  return {
    manuscriptDocx: path.join(CORPUS_DIR, 'ANCLORA_TALENT_TEST_MANUSCRIPT.docx'),
    manuscriptMd: path.join(CORPUS_DIR, 'ANCLORA_TALENT_TEST_MANUSCRIPT.md'),
    referenceDocx: path.join(CORPUS_DIR, 'ANCLORA_TALENT_REFERENCE_STYLE.docx'),
    brandPdf: path.join(CORPUS_DIR, 'ANCLORA_INSIGHTS_BRAND_IDENTITY_REFERENCE.pdf'),
  };
}

export function loadTestPackBuffers(): TestPackBuffers {
  const paths = getTestPackPaths();
  return {
    manuscriptDocx: fs.readFileSync(paths.manuscriptDocx),
    manuscriptMd: fs.readFileSync(paths.manuscriptMd),
    referenceDocx: fs.readFileSync(paths.referenceDocx),
    brandPdf: fs.readFileSync(paths.brandPdf),
  };
}
