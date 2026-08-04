import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { DocumentBlock, DocumentMetadata, SemanticDocument } from '@/lib/document/model';
import { compose } from '@/lib/compose/compose';
import {
  countPreflightErrors,
  preflight,
  preflightIngramSpark,
  preflightKdp,
  preflightKobo,
  type PreflightInput,
} from './preflight';

/** Complete metadata baseline: every check should stay silent with it. */
const COMPLETE_METADATA: DocumentMetadata = {
  title: 'Título del libro',
  author: 'Autora Ejemplo',
  isbn: '978-84-1111111-1-1',
  description: 'Descripción de la publicación.',
  language: 'es',
};

function paragraph(id: string, text = 'Texto de relleno.'): DocumentBlock {
  return { type: 'paragraph', id, content: [{ type: 'text', text }] };
}

function heading(id: string, level: 1 | 2 | 3 | 4 | 5 | 6, text = 'Sección'): DocumentBlock {
  return { type: 'heading', id, level, content: [{ type: 'text', text }] };
}

function makeDocument(
  blocks: DocumentBlock[] = [paragraph('p1')],
  metadata: Partial<DocumentMetadata> = {},
): SemanticDocument {
  return { version: 1, metadata: { ...COMPLETE_METADATA, ...metadata }, blocks };
}

function makeInput(
  blocks: DocumentBlock[] = [paragraph('p1')],
  metadata: Partial<DocumentMetadata> = {},
  extra: Partial<PreflightInput> = {},
): PreflightInput {
  const document = makeDocument(blocks, metadata);
  return { document, composed: compose(document), ...extra };
}

describe('preflight KDP', () => {
  it('passes clean with complete metadata and content', () => {
    expect(preflightKdp(makeInput())).toEqual([]);
  });

  it('errors when title is missing and stays silent when present', () => {
    const checks = preflightKdp(makeInput([paragraph('p1')], { title: ' ' }));
    expect(checks).toContainEqual(
      expect.objectContaining({ channel: 'kdp', severity: 'error', rule: 'kdp.metadata.title' }),
    );
    expect(preflightKdp(makeInput()).some((c) => c.rule === 'kdp.metadata.title')).toBe(false);
  });

  it('errors when author is missing', () => {
    const checks = preflightKdp(makeInput([paragraph('p1')], { author: undefined }));
    expect(checks).toContainEqual(
      expect.objectContaining({ channel: 'kdp', severity: 'error', rule: 'kdp.metadata.author' }),
    );
  });

  it('informs (not blocks) when ISBN is missing', () => {
    const checks = preflightKdp(makeInput([paragraph('p1')], { isbn: undefined }));
    expect(checks).toContainEqual(
      expect.objectContaining({ channel: 'kdp', severity: 'info', rule: 'kdp.metadata.isbn' }),
    );
    expect(preflightKdp(makeInput()).some((c) => c.rule === 'kdp.metadata.isbn')).toBe(false);
  });

  it('warns when language is not declared', () => {
    const checks = preflightKdp(makeInput([paragraph('p1')], { language: undefined }));
    expect(checks).toContainEqual(
      expect.objectContaining({ channel: 'kdp', severity: 'warning', rule: 'kdp.metadata.language' }),
    );
  });

  it('warns for content images without alt, anchored to their page', () => {
    const image: DocumentBlock = { type: 'image', id: 'img1', src: 'blob:https://app/img-1' };
    const checks = preflightKdp(makeInput([paragraph('p1'), image]));
    const altCheck = checks.find((c) => c.rule === 'kdp.image.alt');
    expect(altCheck).toMatchObject({ severity: 'warning', blockId: 'img1' });
    expect(altCheck?.page).toBe(0);
    // Negative: image with alt passes.
    const withAlt: DocumentBlock = { ...image, alt: 'Portada ilustrada' } as DocumentBlock;
    expect(
      preflightKdp(makeInput([paragraph('p1'), withAlt])).some((c) => c.rule === 'kdp.image.alt'),
    ).toBe(false);
  });

  it('only hints resolution for explicitly tiny images (conservative)', () => {
    const tiny: DocumentBlock = {
      type: 'image',
      id: 'img1',
      src: 'blob:x',
      alt: 'Separador',
      estimatedLines: 2,
    };
    expect(preflightKdp(makeInput([tiny]))).toContainEqual(
      expect.objectContaining({ severity: 'info', rule: 'kdp.image.resolution', params: { lines: '2' } }),
    );
    // Negative: no estimate or a normal estimate stays silent.
    const normal: DocumentBlock = { type: 'image', id: 'img2', src: 'blob:y', alt: 'Figura', estimatedLines: 12 };
    const noEstimate: DocumentBlock = { type: 'image', id: 'img3', src: 'blob:z', alt: 'Figura' };
    expect(
      preflightKdp(makeInput([normal, noEstimate])).some((c) => c.rule === 'kdp.image.resolution'),
    ).toBe(false);
  });

  it('warns for a declared non-embeddable font, passes with Liberation/generic', () => {
    expect(preflightKdp(makeInput([paragraph('p1')], {}, { fontFamily: 'Papyrus' }))).toContainEqual(
      expect.objectContaining({
        severity: 'warning',
        rule: 'kdp.fonts.embed',
        params: { font: 'Papyrus' },
      }),
    );
    expect(
      preflightKdp(makeInput([paragraph('p1')], {}, { fontFamily: 'Liberation Serif' })).some(
        (c) => c.rule === 'kdp.fonts.embed',
      ),
    ).toBe(false);
    expect(
      preflightKdp(makeInput([paragraph('p1')], {}, { fontFamily: 'serif' })).some(
        (c) => c.rule === 'kdp.fonts.embed',
      ),
    ).toBe(false);
  });
});

describe('preflight IngramSpark', () => {
  it('passes clean with ISBN, description and packageable images', () => {
    expect(preflightIngramSpark(makeInput())).toEqual([]);
  });

  it('errors when ISBN is missing (hard requirement)', () => {
    const checks = preflightIngramSpark(makeInput([paragraph('p1')], { isbn: undefined }));
    expect(checks).toContainEqual(
      expect.objectContaining({ channel: 'ingramspark', severity: 'error', rule: 'ingram.metadata.isbn' }),
    );
  });

  it('informs when description is missing', () => {
    const checks = preflightIngramSpark(makeInput([paragraph('p1')], { description: undefined }));
    expect(checks).toContainEqual(
      expect.objectContaining({ severity: 'info', rule: 'ingram.metadata.description' }),
    );
  });

  it('warns for legacy data URIs and external URLs, passes blob/relative src', () => {
    const dataUri: DocumentBlock = { type: 'image', id: 'img1', src: 'data:image/png;base64,AAAA', alt: 'x' };
    const external: DocumentBlock = { type: 'image', id: 'img2', src: 'https://cdn.example.com/a.png', alt: 'x' };
    const checks = preflightIngramSpark(makeInput([dataUri, external]));
    const packaging = checks.filter((c) => c.rule === 'ingram.image.packaging');
    expect(packaging).toHaveLength(2);
    expect(packaging.map((c) => c.params.origin).sort()).toEqual(['data-uri', 'external-url']);
    expect(packaging.every((c) => c.severity === 'warning')).toBe(true);

    const blob: DocumentBlock = { type: 'image', id: 'img3', src: 'blob:https://app/img', alt: 'x' };
    const relative: DocumentBlock = { type: 'image', id: 'img4', src: '/uploads/img.png', alt: 'x' };
    expect(
      preflightIngramSpark(makeInput([blob, relative])).some((c) => c.rule === 'ingram.image.packaging'),
    ).toBe(false);
  });
});

describe('preflight Kobo', () => {
  it('passes clean with complete metadata and ordered headings', () => {
    expect(preflightKobo(makeInput([heading('h1', 1), paragraph('p1'), heading('h2', 2)]))).toEqual([]);
  });

  it('errors on missing title, author or language', () => {
    const checks = preflightKobo(
      makeInput([paragraph('p1')], { title: '', author: undefined, language: undefined }),
    );
    expect(checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ severity: 'error', rule: 'kobo.metadata.title' }),
        expect.objectContaining({ severity: 'error', rule: 'kobo.metadata.author' }),
        expect.objectContaining({ severity: 'error', rule: 'kobo.metadata.language' }),
      ]),
    );
  });

  it('warns for images without alt (accessibility)', () => {
    const image: DocumentBlock = { type: 'image', id: 'img1', src: 'blob:x' };
    expect(preflightKobo(makeInput([image]))).toContainEqual(
      expect.objectContaining({ severity: 'warning', rule: 'kobo.a11y.imageAlt', blockId: 'img1' }),
    );
    const withAlt: DocumentBlock = { ...image, alt: 'Descrita' } as DocumentBlock;
    expect(preflightKobo(makeInput([withAlt])).some((c) => c.rule === 'kobo.a11y.imageAlt')).toBe(false);
  });

  it('warns on heading level jumps (H1 → H3) but not on ordered hierarchies', () => {
    const jump = preflightKobo(makeInput([heading('h1', 1), paragraph('p1'), heading('h3', 3)]));
    expect(jump).toContainEqual(
      expect.objectContaining({
        severity: 'warning',
        rule: 'kobo.a11y.headingJump',
        blockId: 'h3',
        params: { from: '1', to: '3' },
      }),
    );
    // Negative: ordered hierarchy and a document starting below H1 stay silent.
    const ordered = preflightKobo(
      makeInput([heading('h2', 2), paragraph('p1'), heading('h3', 3), heading('h1', 1), heading('h2', 2)]),
    );
    expect(ordered.some((c) => c.rule === 'kobo.a11y.headingJump')).toBe(false);
  });
});

describe('preflight aggregate', () => {
  it('runs all channels by default and counts only errors as blocking', () => {
    const checks = preflight(
      makeInput([{ type: 'image', id: 'img1', src: 'data:image/png;base64,AAAA' }], {
        author: undefined,
        isbn: undefined,
      }),
    );
    const rules = checks.map((c) => c.rule);
    expect(rules).toEqual(
      expect.arrayContaining([
        'kdp.metadata.author',
        'kdp.metadata.isbn',
        'kdp.image.alt',
        'ingram.metadata.isbn',
        'ingram.image.packaging',
        'kobo.metadata.author',
        'kobo.a11y.imageAlt',
      ]),
    );
    // Errors: kdp author + kobo author + ingram isbn. Warnings/info never block.
    expect(countPreflightErrors(checks)).toBe(3);
    expect(countPreflightErrors(preflight(makeInput()))).toBe(0);
  });

  it('can run a single channel subset', () => {
    const checks = preflight(makeInput(), ['kobo']);
    expect(checks.every((c) => c.channel === 'kobo')).toBe(true);
  });
});

/**
 * Hard acceptance gate: ZERO false positives over the clean real fixture
 * (`fixtures/exito_sin_compania.docx`) through the real import + compose
 * pipeline (same setup as src/lib/compose/compose.perf.test.ts).
 *
 * Verified fixture facts (import pipeline dump):
 * - Metadata: title + subtitle + language 'es'; NO author, NO isbn, NO
 *   description → the missing-author errors (KDP/Kobo) and the missing-ISBN
 *   error (IngramSpark) on the as-imported fixture are TRUE positives: real
 *   metadata gaps the author fills in the product before publishing.
 * - No image blocks survive the import → image checks cannot fire.
 * - Heading hierarchy has no level jumps → a11y check stays silent.
 *
 * The strict 0-false-positives assertion runs with metadata completed
 * (author/isbn/description), isolating check logic from fixture data gaps.
 */
const FIXTURE_NAME = 'exito_sin_compania.docx';
const FIXTURE_PATH = resolve(process.cwd(), 'fixtures', FIXTURE_NAME);
const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const fixtureAvailable = existsSync(FIXTURE_PATH);

describe.skipIf(!fixtureAvailable)(`preflight sobre fixture limpio ${FIXTURE_NAME}`, () => {
  async function importFixture() {
    const { buildImportedDocumentSeed, extractTextFromBuffer, normalizeText } = await import(
      '@/lib/projects/import-pipeline'
    );
    const { createProjectRecord } = await import('@/lib/projects/factories');
    const { projectToSemanticDocument, templateFromPaginationConfig } = await import(
      '@/lib/compose/preview-adapter'
    );
    const { DEVICE_PAGINATION_CONFIGS } = await import('@/lib/preview/device-configs');
    const { createHeuristicMeasurer } = await import('@/lib/compose/measure');

    const buffer = readFileSync(FIXTURE_PATH);
    const extracted = await extractTextFromBuffer(FIXTURE_NAME, DOCX_MIME, buffer);
    const seed = buildImportedDocumentSeed({
      fileName: FIXTURE_NAME,
      mimeType: DOCX_MIME,
      text: normalizeText(extracted.text),
      html: extracted.html,
      sourcePageCount: extracted.pageCount,
    });
    const project = createProjectRecord('preflight-user', {
      title: seed.title,
      importedDocument: seed,
    });
    const { document, chapterStartIds } = projectToSemanticDocument(project);
    const composed = compose(
      document,
      null,
      templateFromPaginationConfig(DEVICE_PAGINATION_CONFIGS.laptop),
      createHeuristicMeasurer(),
      { chapterStartIds },
    );
    return { document, composed };
  }

  it(
    '0 falsos positivos: con metadatos completos, ningún canal emite findings',
    async () => {
      const { document, composed } = await importFixture();
      const completedMetadata: DocumentMetadata = {
        ...document.metadata,
        author: document.metadata.author ?? 'Autora del fixture',
        isbn: document.metadata.isbn ?? '978-84-1111111-1-1',
        description: document.metadata.description ?? 'Descripción del fixture.',
      };
      const checks = preflight({ document, composed, metadata: completedMetadata });
      expect(checks).toEqual([]);
      expect(countPreflightErrors(checks)).toBe(0);
    },
    60_000,
  );

  it(
    'verdaderos positivos documentados: sin autor/ISBN el fixture solo emite esos gaps reales',
    async () => {
      const { document, composed } = await importFixture();
      const checks = preflight({ document, composed });
      const byRule = checks.map((c) => `${c.severity}:${c.rule}`).sort();
      // Exactly the real metadata gaps of the fixture — nothing else fires.
      expect(byRule).toEqual([
        'error:ingram.metadata.isbn',
        'error:kdp.metadata.author',
        'error:kobo.metadata.author',
        'info:ingram.metadata.description',
        'info:kdp.metadata.isbn',
      ]);
      // In particular: KDP/Kobo errors come ONLY from the missing author.
      expect(
        checks.filter(
          (c) => c.severity === 'error' && (c.channel === 'kdp' || c.channel === 'kobo'),
        ),
      ).toEqual([
        expect.objectContaining({ rule: 'kdp.metadata.author' }),
        expect.objectContaining({ rule: 'kobo.metadata.author' }),
      ]);
    },
    60_000,
  );
});
