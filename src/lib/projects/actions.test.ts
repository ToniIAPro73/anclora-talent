import { describe, expect, test, vi } from 'vitest';
import { createProjectRecord, updateProjectCover, updateProjectDocument } from './factories';
import { buildImportedDocumentSeed } from './import';

vi.mock('server-only', () => ({}));

describe('project factories', () => {
  test('creates a canonical project with editor, preview, and cover state', () => {
    const project = createProjectRecord('user_123', { title: 'Manual de pruebas' });

    expect(project.title).toBe('Manual de pruebas');
    expect(project.document.chapters).toHaveLength(1);
    expect(project.document.chapters[0].blocks.length).toBeGreaterThan(2);
    expect(project.cover.title).toBe('Manual de pruebas');
  });

  test('updates document blocks while preserving the project structure', () => {
    const project = createProjectRecord('user_123', { title: 'Manual de pruebas' });
    const chapter = project.document.chapters[0];
    const updated = updateProjectDocument(project, {
      title: 'Manual actualizado',
      subtitle: 'Subtítulo actualizado',
      chapterTitle: 'Capítulo renovado',
      blocks: chapter.blocks.map((block) => ({
        id: block.id,
        content: `${block.content} editado`,
      })),
    });

    expect(updated.document.title).toBe('Manual actualizado');
    expect(updated.document.chapters[0].title).toBe('Capítulo renovado');
    expect(updated.document.chapters[0].blocks[0].content).toContain('editado');
  });

  test('updates cover metadata and background references', () => {
    const project = createProjectRecord('user_123', { title: 'Manual de pruebas' });
    const updated = updateProjectCover(project, {
      title: 'Nueva portada',
      subtitle: 'Subtítulo de portada',
      palette: 'teal',
      backgroundImageUrl: 'https://blob.vercel-storage.com/cover.png',
      thumbnailUrl: 'https://blob.vercel-storage.com/thumb.png',
    });

    expect(updated.cover.palette).toBe('teal');
    expect(updated.cover.backgroundImageUrl).toContain('cover.png');
    expect(updated.cover.title).toBe('Nueva portada');
  });

  test('creates a project seeded from an imported document', () => {
    const importedDocument = buildImportedDocumentSeed({
      fileName: 'ebook.md',
      mimeType: 'text/markdown',
      text: 'Propuesta editorial\n\nSubtitulo orientado a conversion\n\nPrimer bloque del documento.\n\nSegundo bloque del documento.',
    });

    const project = createProjectRecord('user_123', {
      title: 'Ebook base',
      importedDocument,
    });

    expect(project.document.title).toBe('Propuesta editorial');
    expect(project.document.subtitle).toContain('Subtitulo orientado');
    expect(project.document.chapters[0].blocks.some((block) => block.content.includes('Primer bloque'))).toBe(true);
    expect(project.cover.title).toBe('Propuesta editorial');
  });
});
