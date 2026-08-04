import { afterEach, describe, expect, it, vi } from 'vitest';
import JSZip from 'jszip';
import { createProjectRecord } from '@/lib/projects/factories';
import { composeProjectPreview } from '@/lib/compose/preview-adapter';
import { DEVICE_PAGINATION_CONFIGS } from '@/lib/preview/device-configs';
import type { DocumentBlockType, ProjectRecord } from '@/lib/projects/types';
import { buildEpub } from './epub-writer';

const PNG_DATA_URI =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

function buildProject(overrides?: {
  metadata?: Record<string, unknown>;
  language?: string;
  chapters?: { title: string; blocks: { type: DocumentBlockType; content: string }[] }[];
}): ProjectRecord {
  const source = {
    sourceFileName: 'libro-de-prueba.docx',
    sourceMimeType:
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  };
  const project = createProjectRecord('epub-user', {
    title: 'Libro de prueba',
    importedDocument: overrides?.chapters
      ? {
          title: 'Libro de prueba',
          subtitle: 'Subtítulo',
          author: 'Autora de Prueba',
          chapterTitle: overrides.chapters[0].title,
          blocks: overrides.chapters[0].blocks,
          chapters: overrides.chapters,
          ...source,
        }
      : {
          title: 'Libro de prueba',
          subtitle: 'Subtítulo',
          author: 'Autora de Prueba',
          chapterTitle: 'Capítulo 1',
          blocks: [
            { type: 'heading' as const, content: '<h1>Capítulo 1</h1>' },
            { type: 'paragraph' as const, content: 'Texto del primer capítulo.' },
            { type: 'heading' as const, content: '<h2>Sección 1.1</h2>' },
            { type: 'paragraph' as const, content: 'Texto de la sección.' },
            { type: 'heading' as const, content: '<h3>Apartado 1.1.1</h3>' },
            { type: 'paragraph' as const, content: 'Más texto.' },
            // Seed labels match the real import pipeline: tables/images travel
            // as HTML inside paragraph-labelled blocks (htmlToBlocks re-parses).
            { type: 'paragraph' as const, content: '<table><tr><th>A</th><th>B</th></tr><tr><td>1</td><td>2</td></tr></table>' },
            { type: 'heading' as const, content: '<h1>Capítulo 2</h1>' },
            { type: 'paragraph' as const, content: 'Texto del segundo capítulo.' },
          ],
          ...source,
        },
  });
  if (overrides?.language) project.document.language = overrides.language;
  if (overrides?.metadata) {
    project.document.metadata = {
      title: project.document.title,
      language: project.document.language,
      ...overrides.metadata,
    } as never;
  }
  return project;
}

async function buildFixtureEpub(project: ProjectRecord) {
  const composed = composeProjectPreview(project, DEVICE_PAGINATION_CONFIGS.laptop, undefined, {
    tocDepth: 3,
  });
  const buffer = await buildEpub(project, composed);
  const zip = await JSZip.loadAsync(buffer);
  return { buffer, zip, composed };
}

async function readText(zip: JSZip, path: string): Promise<string> {
  const file = zip.file(path);
  expect(file, `expected ${path} in EPUB`).not.toBeNull();
  return file!.async('text');
}

describe('buildEpub', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('packages mimetype first and stored without compression (OCF contract)', async () => {
    const { buffer } = await buildFixtureEpub(buildProject());
    // Local file header: PK\x03\x04, compression method at offset 8 (LE).
    expect(buffer.readUInt32LE(0)).toBe(0x04034b50);
    expect(buffer.readUInt16LE(8)).toBe(0);
    const nameLength = buffer.readUInt16LE(26);
    expect(buffer.subarray(30, 30 + nameLength).toString('utf8')).toBe('mimetype');
    expect(buffer.subarray(30, 30 + nameLength + 20).toString('utf8')).toContain(
      'application/epub+zip',
    );
  });

  it('emits full Dublin Core metadata and font media types in the OPF', async () => {
    const project = buildProject({
      metadata: {
        author: 'Autora de Prueba',
        isbn: '978-84-123456-7-8',
        description: 'Descripción del libro',
        keywords: ['ensayo', 'productividad'],
      },
    });
    const { zip } = await buildFixtureEpub(project);
    const opf = await readText(zip, 'OEBPS/content.opf');

    expect(opf).toContain('<dc:title>Libro de prueba</dc:title>');
    expect(opf).toContain('<dc:creator>Autora de Prueba</dc:creator>');
    expect(opf).toContain('<dc:language>es</dc:language>');
    expect(opf).toContain('<dc:identifier id="bookid">urn:isbn:9788412345678</dc:identifier>');
    expect(opf).toMatch(/<dc:date>\d{4}-\d{2}-\d{2}<\/dc:date>/);
    expect(opf).toContain('<dc:description>Descripción del libro</dc:description>');
    expect(opf).toContain('<dc:subject>ensayo</dc:subject>');
    expect(opf).toContain('<dc:subject>productividad</dc:subject>');
    expect(opf).toContain('<meta property="dcterms:modified">');
    expect(opf).toContain('properties="nav"');
    expect(opf).toContain('media-type="application/x-dtbncx+xml"');
    expect(opf).toContain('media-type="font/ttf"');
    expect(opf).toContain('href="fonts/LiberationSans-Regular.ttf"');
    expect(zip.file('OEBPS/fonts/LiberationSans-Regular.ttf')).not.toBeNull();
  });

  it('uses a stable urn:uuid identifier when no ISBN is present', async () => {
    const project = buildProject();
    const { zip } = await buildFixtureEpub(project);
    const opf = await readText(zip, 'OEBPS/content.opf');
    const match = opf.match(/<dc:identifier id="bookid">urn:uuid:([0-9a-f-]{36})<\/dc:identifier>/);
    expect(match).not.toBeNull();

    // Stable: same project id yields the same identifier on a rebuild.
    const second = await buildFixtureEpub(project);
    const secondOpf = await readText(second.zip, 'OEBPS/content.opf');
    expect(secondOpf).toContain(`urn:uuid:${match![1]}`);
  });

  it('generates the NAV from the engine TOC with real H1-H3 levels', async () => {
    const { zip, composed } = await buildFixtureEpub(buildProject());
    const nav = await readText(zip, 'OEBPS/nav.xhtml');

    expect(nav).toContain('epub:type="toc"');
    const tocLevels = new Set(composed.result.toc.map((entry) => entry.level));
    expect(tocLevels.has(1)).toBe(true);
    expect(tocLevels.has(2)).toBe(true);
    expect(tocLevels.has(3)).toBe(true);

    for (const entry of composed.result.toc) {
      expect(nav).toContain(`>${entry.text}<`);
      expect(nav).toContain(`#${entry.blockId}`);
    }
    // Nesting: the H3 entry lives inside a nested <ol> (two open ols before it).
    const h3 = composed.result.toc.find((entry) => entry.level === 3)!;
    const h3Index = nav.indexOf(`>${h3.text}<`);
    expect(nav.lastIndexOf('<ol>', h3Index)).toBeGreaterThan(nav.indexOf('<ol>'));
  });

  it('generates an NCX with three nested levels for EPUB 2 readers', async () => {
    const { zip } = await buildFixtureEpub(buildProject());
    const ncx = await readText(zip, 'OEBPS/toc.ncx');

    expect(ncx).toContain('<meta name="dtb:depth" content="3"/>');
    expect(ncx).toContain('playOrder="1"');
    // Nested navPoints: a navPoint contains another navPoint before closing.
    expect(ncx).toMatch(/<navPoint[^>]*>(?:(?!navPoint)[\s\S])*<navPoint/);
    expect(ncx).toContain('text/chapter-');
  });

  it('serializes chapter XHTML from the AST, including tables and heading anchors', async () => {
    const { zip, composed } = await buildFixtureEpub(buildProject());
    const firstChapter = await readText(zip, 'OEBPS/text/chapter-1.xhtml');

    expect(firstChapter).toContain('<table>');
    expect(firstChapter).toContain('<th>');
    const heading = composed.result.toc.find((entry) => entry.level === 1)!;
    expect(firstChapter).toContain(`<h1 id="${heading.blockId}">`);
    expect(firstChapter).toContain('xml:lang="es"');
    // Manual page breaks are pagination artifacts, not EPUB content.
    expect(firstChapter).not.toContain('data-page-break');
  });

  it('embeds images under OEBPS/images and rewrites their src (mock fetch)', async () => {
    const pngBytes = Buffer.from(PNG_DATA_URI.split(',', 2)[1], 'base64');
    const fetchMock = vi.fn(async () => ({
      ok: true,
      headers: new Headers({ 'content-type': 'image/png' }),
      arrayBuffer: async () => pngBytes.buffer.slice(pngBytes.byteOffset, pngBytes.byteOffset + pngBytes.byteLength),
    }));
    vi.stubGlobal('fetch', fetchMock);

    const project = buildProject({
      chapters: [
        {
          title: 'Capítulo 1',
          blocks: [
            { type: 'heading', content: '<h1>Capítulo 1</h1>' },
            { type: 'paragraph', content: 'Texto con imágenes.' },
            { type: 'paragraph', content: '<img src="https://blob.example.com/cover.png"/>' },
            { type: 'paragraph', content: `<img src="${PNG_DATA_URI}"/>` },
          ],
        },
      ],
    });
    const { zip } = await buildFixtureEpub(project);

    expect(fetchMock).toHaveBeenCalledWith('https://blob.example.com/cover.png');
    const chapter = await readText(zip, 'OEBPS/text/chapter-1.xhtml');
    expect(chapter).not.toContain('https://blob.example.com/cover.png');
    expect(chapter).not.toContain('data:image/png');
    expect(chapter).toContain('src="../images/image-1.png"');
    expect(chapter).toContain('src="../images/image-2.png"');
    expect(zip.file('OEBPS/images/image-1.png')).not.toBeNull();
    expect(zip.file('OEBPS/images/image-2.png')).not.toBeNull();
    const opf = await readText(zip, 'OEBPS/content.opf');
    expect(opf).toContain('href="images/image-1.png" media-type="image/png"');
  });

  it('honours the document language in OPF, NAV and chapters', async () => {
    const { zip } = await buildFixtureEpub(buildProject({ language: 'en' }));
    const opf = await readText(zip, 'OEBPS/content.opf');
    const nav = await readText(zip, 'OEBPS/nav.xhtml');
    const chapter = await readText(zip, 'OEBPS/text/chapter-1.xhtml');

    expect(opf).toContain('<dc:language>en</dc:language>');
    expect(nav).toContain('xml:lang="en"');
    expect(nav).toContain('<h1>Contents</h1>');
    expect(chapter).toContain('xml:lang="en"');
  });

  it('unwraps intra-document links whose fragment is missing from the EPUB (RSC-012)', async () => {
    // Dead fragments mimic Word's `_Toc…` bookmarks from a manual TOC page.
    const project = buildProject({
      chapters: [
        {
          title: 'Capítulo 1',
          blocks: [
            { type: 'heading', content: '<h1>Capítulo 1</h1>' },
            { type: 'paragraph', content: 'placeholder' },
            { type: 'heading', content: '<h2>Sección destino</h2>' },
          ],
        },
      ],
    });
    const composed = composeProjectPreview(project, DEVICE_PAGINATION_CONFIGS.laptop, undefined, {
      tocDepth: 3,
    });
    const target = composed.result.toc.find((entry) => entry.text === 'Sección destino')!;
    project.document.chapters[0].blocks[1].content =
      `<p>Véase <a href="#_Toc999999">la sección perdida</a> y <a href="#${target.blockId}">la válida</a>.</p>`;

    const { zip } = await buildFixtureEpub(project);
    const chapter = await readText(zip, 'OEBPS/text/chapter-1.xhtml');

    expect(chapter).not.toContain('href="#_Toc999999"');
    expect(chapter).toContain('la sección perdida');
    expect(chapter).toContain(`href="#${target.blockId}"`);
  });

  it('round-trips through jszip with the full OCF structure', async () => {
    const { zip } = await buildFixtureEpub(buildProject());
    for (const path of [
      'mimetype',
      'META-INF/container.xml',
      'OEBPS/content.opf',
      'OEBPS/nav.xhtml',
      'OEBPS/toc.ncx',
      'OEBPS/cover.xhtml',
      'OEBPS/styles/epub.css',
      'OEBPS/text/chapter-1.xhtml',
    ]) {
      expect(zip.file(path), `missing ${path}`).not.toBeNull();
    }
    expect(await readText(zip, 'mimetype')).toBe('application/epub+zip');
    const container = await readText(zip, 'META-INF/container.xml');
    expect(container).toContain('full-path="OEBPS/content.opf"');
  });
});
