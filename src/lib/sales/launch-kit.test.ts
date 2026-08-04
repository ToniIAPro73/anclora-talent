import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { projectToSemanticDocument } from '@/lib/compose/preview-adapter';
import type { DocumentBlock, SemanticDocument } from '@/lib/document/model';
import type { ProjectAssetManifestItem } from '@/lib/manifest/model';
import {
  buildImportedDocumentSeed,
  extractTextFromBuffer,
  normalizeText,
} from '@/lib/projects/import-pipeline';
import { createProjectRecord } from '@/lib/projects/factories';
import {
  buildLaunchKit,
  buildProductDescriptionHtml,
  deriveDescriptionFromFirstChapter,
  extractBenefitBullets,
} from './launch-kit';

function heading(level: 1 | 2 | 3, text: string): DocumentBlock {
  return { id: `h-${text}`, type: 'heading', level, content: [{ type: 'text', text }] };
}

function paragraph(text: string): DocumentBlock {
  return { id: `p-${text.slice(0, 12)}`, type: 'paragraph', content: [{ type: 'text', text }] };
}

function documentWith(blocks: DocumentBlock[], metadata?: Partial<SemanticDocument['metadata']>): SemanticDocument {
  return {
    version: 1,
    metadata: { title: 'Mi libro', language: 'es', ...metadata },
    blocks,
  };
}

describe('extractBenefitBullets', () => {
  it('takes H2 headings verbatim and skips front-matter (índice)', () => {
    const blocks = [
      heading(1, 'Parte I'),
      heading(2, 'Índice'),
      heading(2, 'El diagnóstico'),
      paragraph('texto'),
      heading(2, 'La reconstrucción'),
      heading(3, 'Subsección'),
    ];
    expect(extractBenefitBullets(blocks)).toEqual(['El diagnóstico', 'La reconstrucción']);
  });

  it('falls back to H3 when the document has no H2', () => {
    const blocks = [heading(1, 'Parte'), heading(3, 'Primera idea'), heading(3, 'Segunda idea')];
    expect(extractBenefitBullets(blocks)).toEqual(['Primera idea', 'Segunda idea']);
  });

  it('never uses H1 (part level) as bullets', () => {
    expect(extractBenefitBullets([heading(1, 'Solo partes')])).toEqual([]);
  });
});

describe('deriveDescriptionFromFirstChapter', () => {
  it('concatenates the first chapter paragraphs until the next same-level heading', () => {
    const blocks = [
      heading(1, 'Parte I'),
      heading(2, 'Capítulo uno'),
      paragraph('Primer párrafo.'),
      paragraph('Segundo párrafo.'),
      heading(2, 'Capítulo dos'),
      paragraph('No debe entrar.'),
    ];
    expect(deriveDescriptionFromFirstChapter(blocks)).toBe('Primer párrafo.\n\nSegundo párrafo.');
  });

  it('returns empty when there are no chapters', () => {
    expect(deriveDescriptionFromFirstChapter([paragraph('solo texto')])).toBe('');
  });
});

describe('buildLaunchKit', () => {
  it('uses the authored metadata description verbatim (not a draft)', () => {
    const kit = buildLaunchKit(
      documentWith([heading(2, 'Cap')], {
        description: 'Descripción editorial.',
        subtitle: 'Subtítulo',
        author: 'Autora',
        isbn: '978-84-000',
        keywords: ['ensayo'],
      }),
    );
    expect(kit.sheet.descriptionSource).toBe('metadata');
    expect(kit.sheet.descriptionIsDraft).toBe(false);
    expect(kit.sheet.longDescription).toBe('Descripción editorial.');
    expect(kit.sheet.subtitle).toBe('Subtítulo');
    expect(kit.sheet.author).toBe('Autora');
    expect(kit.sheet.isbn).toBe('978-84-000');
    expect(kit.sheet.keywords).toEqual(['ensayo']);
  });

  it('without metadata description derives from the first chapter and flags it as draft', () => {
    const kit = buildLaunchKit(
      documentWith([heading(2, 'Capítulo'), paragraph('Texto derivado.')]),
    );
    expect(kit.sheet.descriptionSource).toBe('first-chapter');
    expect(kit.sheet.descriptionIsDraft).toBe(true);
    expect(kit.sheet.longDescription).toBe('Texto derivado.');
  });

  it('falls back to the title (draft) when there is no description nor chapter text', () => {
    const kit = buildLaunchKit(documentWith([]));
    expect(kit.sheet.descriptionSource).toBe('title-only');
    expect(kit.sheet.descriptionIsDraft).toBe(true);
    expect(kit.sheet.longDescription).toBe('Mi libro');
  });

  it('builds the landing copy from title/subtitle, bullets and a localized CTA', () => {
    const kit = buildLaunchKit(
      documentWith([heading(2, 'Primera idea')], { subtitle: 'Guía práctica' }),
    );
    expect(kit.landing.headline).toBe('Mi libro: Guía práctica');
    expect(kit.landing.subheadline).toBe('Primera idea');
    expect(kit.landing.benefitBullets).toEqual(['Primera idea']);
    expect(kit.landing.cta).toBe('Consigue tu copia');
  });

  it('localizes the CTA from the document language', () => {
    const kit = buildLaunchKit(documentWith([], { language: 'en' }));
    expect(kit.landing.cta).toBe('Get your copy');
  });

  it('references only materialized epub/pdf manifest assets', () => {
    const items = [
      { assetId: 'epub', kind: 'epub', url: 'https://blob/l.epub', blobKey: null, provenance: 'compositor', sourceHash: 'h', createdAt: 't' },
      { assetId: 'pdf', kind: 'pdf', url: null, blobKey: null, provenance: 'compositor', sourceHash: 'h', createdAt: 't' },
      { assetId: 'markdown', kind: 'markdown', url: 'https://blob/l.md', blobKey: null, provenance: 'compositor', sourceHash: 'h', createdAt: 't' },
    ] as ProjectAssetManifestItem[];
    const kit = buildLaunchKit(documentWith([]), { manifestItems: items });
    expect(kit.assets).toEqual([{ kind: 'epub', url: 'https://blob/l.epub' }]);
  });

  it('embeds the AI disclosure only when provided (required)', () => {
    expect(buildLaunchKit(documentWith([])).aiDisclosure).toBeNull();
    const kit = buildLaunchKit(documentWith([]), { aiDisclosure: 'Declaración KDP…' });
    expect(kit.aiDisclosure).toBe('Declaración KDP…');
  });
});

describe('buildProductDescriptionHtml', () => {
  it('renders paragraphs + bullet list and escapes markup', () => {
    const html = buildProductDescriptionHtml({
      title: 'T',
      subtitle: null,
      longDescription: 'Uno <b>dos</b>.\n\nTres.',
      descriptionSource: 'metadata',
      descriptionIsDraft: false,
      bullets: ['A & B'],
      author: null,
      isbn: null,
      keywords: [],
      language: 'es',
    });
    expect(html).toBe('<p>Uno &lt;b&gt;dos&lt;/b&gt;.</p>\n<p>Tres.</p>\n<ul><li>A &amp; B</li></ul>');
  });
});

// ── Real fixture contract ────────────────────────────────────────────────────

const FIXTURE_NAME = 'exito_sin_compania.docx';
const FIXTURE_PATH = resolve(process.cwd(), 'fixtures', FIXTURE_NAME);
const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const fixtureAvailable = existsSync(FIXTURE_PATH);

async function loadFixtureDocument(): Promise<SemanticDocument> {
  const buffer = readFileSync(FIXTURE_PATH);
  const extracted = await extractTextFromBuffer(FIXTURE_NAME, DOCX_MIME, buffer);
  const seed = buildImportedDocumentSeed({
    fileName: FIXTURE_NAME,
    mimeType: DOCX_MIME,
    text: normalizeText(extracted.text),
    html: extracted.html,
    sourcePageCount: extracted.pageCount,
  });
  const project = createProjectRecord('launch-kit-user', {
    title: seed.title,
    importedDocument: seed,
  });
  return projectToSemanticDocument(project).document;
}

describe.skipIf(!fixtureAvailable)(`launch kit — fixture real ${FIXTURE_NAME}`, () => {
  it('extracts the real title/subtitle and the chapter bullets without inventing', async () => {
    const document = await loadFixtureDocument();
    const kit = buildLaunchKit(document);

    expect(kit.sheet.title).toBe('Éxito sin compañía');
    expect(kit.sheet.subtitle).toBe(
      'Cómo reconstruir relaciones auténticas cuando tu vida funciona por fuera, pero se siente vacía por dentro.',
    );

    // Every bullet must be a verbatim H2 of the AST (provenance), and the
    // front-matter «Índice» must not be one of them.
    const h2Texts = document.blocks
      .filter((block) => block.type === 'heading' && block.level === 2)
      .map((block) =>
        'content' in block && Array.isArray(block.content)
          ? block.content.map((node) => (node.type === 'text' ? node.text : '')).join('').trim()
          : '',
      );
    expect(kit.sheet.bullets.length).toBeGreaterThanOrEqual(10);
    for (const bullet of kit.sheet.bullets) {
      expect(h2Texts).toContain(bullet);
    }
    expect(kit.sheet.bullets).not.toContain('Índice');
    expect(kit.sheet.bullets[0]).toBe('Lo tienes todo, entonces ¿por qué te sientes así?');
  }, 30000);

  it('derives the description from the first chapter and flags it as draft (fixture has no metadata description)', async () => {
    const document = await loadFixtureDocument();
    const kit = buildLaunchKit(document);

    expect(kit.sheet.descriptionSource).toBe('first-chapter');
    expect(kit.sheet.descriptionIsDraft).toBe(true);
    // The derived text must be AST verbatim: it starts with the real opening.
    expect(kit.sheet.longDescription.startsWith('Es domingo por la tarde.')).toBe(true);
    expect(kit.sheet.longDescription.length).toBeLessThanOrEqual(601);

    expect(kit.landing.headline).toBe(
      'Éxito sin compañía: Cómo reconstruir relaciones auténticas cuando tu vida funciona por fuera, pero se siente vacía por dentro.',
    );
    expect(kit.landing.cta).toBe('Consigue tu copia');
  }, 30000);
});
