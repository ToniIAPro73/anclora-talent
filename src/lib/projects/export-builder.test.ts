import { describe, expect, test } from 'vitest';
import { createProjectRecord } from './factories';
import { createDefaultSurfaceState } from './cover-surface';
import {
  buildExportPreview,
  buildProjectDocxBuffer,
  buildProjectPdf,
  renderProjectExportHtml,
} from './export-builder';

function makeProject() {
  const project = createProjectRecord('user-1', { title: 'Nunca más en la sombra' });
  project.slug = 'nunca-mas-en-la-sombra';
  project.document.author = 'Antonio';
  project.cover.renderedImageUrl = 'https://example.com/cover-render.png';
  project.backCover.renderedImageUrl = 'https://example.com/back-cover-render.png';
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
    expect(html).toContain('https://example.com/cover-render.png');
    expect(html).toContain('https://example.com/back-cover-render.png');
    expect(html).toContain('page-break-after: always');
  });

  test('builds a PDF document object', () => {
    const pdfDoc = buildProjectPdf(makeProject());
    expect(pdfDoc).toBeTruthy();
  });

  test('builds a non-empty DOCX buffer', async () => {
    const buffer = await buildProjectDocxBuffer(makeProject());
    expect(buffer.byteLength).toBeGreaterThan(0);
  });
});
