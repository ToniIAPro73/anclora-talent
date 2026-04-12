import { describe, expect, test } from 'vitest';
import mammoth from 'mammoth';
import { createProjectRecord } from './factories';
import { createDefaultSurfaceState } from './cover-surface';
import {
  buildExportPreview,
  buildProjectDocxBuffer,
  buildProjectPdf,
  renderProjectExportHtml,
} from './export-builder';

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

  test('renders HTML export with the preview page shell and rendered assets', () => {
    const html = renderProjectExportHtml(makeProject());

    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('export-document');
    expect(html).toContain(TINY_PNG_DATA_URL);
    expect(html).toContain('page-break-after: always');
    expect(html).not.toContain('Anclora Talent');
  });

  test('builds a PDF document object', () => {
    const pdfDoc = buildProjectPdf(makeProject());
    expect(pdfDoc).toBeTruthy();
  });

  test('builds a non-empty DOCX buffer without synthetic cover text when a rendered cover exists', async () => {
    const buffer = await buildProjectDocxBuffer(makeProject());
    expect(buffer.byteLength).toBeGreaterThan(0);

    const extracted = await mammoth.extractRawText({ buffer });
    expect(extracted.value).not.toContain('Anclora Talent');
  });
});
