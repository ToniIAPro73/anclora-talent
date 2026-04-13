import { describe, expect, test } from 'vitest';
import JSZip from 'jszip';
import mammoth from 'mammoth';
import { createProjectRecord } from './factories';
import { createDefaultSurfaceState } from './cover-surface';
import { DEVICE_PAGINATION_CONFIGS } from '@/lib/preview/device-configs';
import {
  buildExportPreview,
  buildProjectDocxBuffer,
  buildProjectPdf,
  renderProjectExportHtml,
} from './export-builder';
import { buildContentPageExportImageDataUrl } from './export-surface-image';

const TINY_PNG_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9WnR6i4AAAAASUVORK5CYII=';

function makeProject() {
  const project = createProjectRecord('user-1', { title: 'Nunca más en la sombra' });
  project.slug = 'nunca-mas-en-la-sombra';
  project.document.author = 'Antonio';
  project.cover.renderedImageUrl = TINY_PNG_DATA_URL;
  project.backCover.renderedImageUrl = TINY_PNG_DATA_URL;
  project.backCover.title = 'Antonio';
  project.backCover.body = '<p>Texto de contraportada</p>';
  project.backCover.authorBio = 'Bio del autor';

  const backSurface = createDefaultSurfaceState('back-cover');
  if (backSurface.fields.title) backSurface.fields.title = { value: 'Antonio', visible: true };
  if (backSurface.fields.body) backSurface.fields.body = { value: 'Texto de contraportada', visible: true };
  if (backSurface.fields.authorBio) backSurface.fields.authorBio = { value: 'Bio del autor', visible: true };
  project.backCover.surfaceState = backSurface;

  return project;
}

describe('export-builder', () => {
  test('builds export pages from the same preview pagination pipeline', () => {
    const pages = buildExportPreview(makeProject());

    expect(pages[0]?.type).toBe('cover');
    expect(pages.at(-1)?.type).toBe('back-cover');
    expect(pages.some((page) => page.type === 'content')).toBe(true);
  });

  test('renders HTML export with the preview page shell and rendered assets', async () => {
    const html = await renderProjectExportHtml(makeProject());

    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('export-document');
    expect(html).toContain(TINY_PNG_DATA_URL);
    expect(html).toContain('page-break-after: always');
    expect(html).not.toContain('Anclora Talent');
  });

  test('builds a PDF document object', async () => {
    const pdfDoc = await buildProjectPdf(makeProject());
    expect(pdfDoc).toBeTruthy();
  });

  test('content page image generator returns a PNG data URL for DOCX page locking', async () => {
    const first = await buildContentPageExportImageDataUrl(
      {
        type: 'content',
        content: '<h2>Primera página</h2><p>Contenido A</p>',
        pageNumber: 2,
      },
      DEVICE_PAGINATION_CONFIGS.laptop,
    );

    expect(first).toMatch(/^data:image\/png;base64,/);
  });

  test('builds a DOCX with one locked image frame per preview page and no synthetic cover text', async () => {
    const project = makeProject();
    project.document.chapters = [
      {
        ...project.document.chapters[0],
        title: 'Capítulo 1',
        blocks: [
          { id: 'heading', order: 1, type: 'heading', content: '<h1>Capítulo 1</h1>' },
          {
            id: 'body',
            order: 2,
            type: 'paragraph',
            content: `<p>${'Contenido de prueba '.repeat(900)}</p>`,
          },
        ],
      },
    ];

    const pages = buildExportPreview(project);
    const buffer = await buildProjectDocxBuffer(project);
    expect(buffer.byteLength).toBeGreaterThan(0);

    const extracted = await mammoth.extractRawText({ buffer });
    expect(extracted.value).not.toContain('Anclora Talent');

    const zip = await JSZip.loadAsync(buffer);
    const documentXml = await zip.file('word/document.xml')!.async('string');
    const imageReferences = (documentXml.match(/<a:blip\b/g) ?? []).length;

    expect(imageReferences).toBe(pages.length);
  });
});
