import { describe, expect, it } from 'vitest';
import { createProjectRecord } from './factories';
import { isEditableProject, isFixedPdfProject } from './types';

describe('createProjectRecord — fixed-pdf document mode', () => {
  it('sets document.source.mode and a real asset blobUrl for fixed-pdf', () => {
    const project = createProjectRecord('user-1', {
      title: 'Ebook importado',
      importedDocument: {
        title: 'El Plan de Escape de la Mediana Edad',
        subtitle: 'Cómo desatascarte profesionalmente sin dinamitar tu vida',
        author: 'Antonio Ballesteros Alonso',
        chapterTitle: 'Capítulo 1',
        blocks: [{ type: 'heading', content: 'Capítulo 1' }],
        sourceFileName: 'El_Plan_de_Escape_EBOOK.pdf',
        sourceMimeType: 'application/pdf',
        mode: 'fixed-pdf',
        sourceBlobUrl: 'projects/p1/source/1700000000000-el-plan.pdf',
        sourceSha256: 'a'.repeat(64),
        sourceSizeBytes: 123456,
        sourcePageCount: 122,
        sourceAccessLevel: 'private',
      },
    });

    expect(project.document.source?.mode).toBe('fixed-pdf');
    expect(project.document.source?.sha256).toBe('a'.repeat(64));
    expect(project.document.source?.sizeBytes).toBe(123456);
    expect(project.document.source?.sourceAssetId).toBeTruthy();
    expect(project.document.source?.sourceAccessLevel).toBe('private');

    const asset = project.assets.find((a) => a.usage === 'source-document');
    expect(asset?.blobUrl).toBe('projects/p1/source/1700000000000-el-plan.pdf');
    expect(asset?.id).toBe(project.document.source?.sourceAssetId);

    expect(isFixedPdfProject(project)).toBe(true);
    expect(isEditableProject(project)).toBe(false);
  });

  it('regression: editable import keeps a null asset blobUrl and mode "editable"', () => {
    const project = createProjectRecord('user-1', {
      title: 'Manuscrito importado',
      importedDocument: {
        title: 'Doc importado',
        subtitle: '',
        author: '',
        chapterTitle: 'Capítulo importado',
        blocks: [{ type: 'heading', content: 'Capítulo importado' }],
        sourceFileName: 'doc.md',
        sourceMimeType: 'text/markdown',
      },
    });

    expect(project.document.source?.mode).toBe('editable');
    const asset = project.assets.find((a) => a.usage === 'source-document');
    expect(asset?.blobUrl).toBeNull();

    expect(isFixedPdfProject(project)).toBe(false);
    expect(isEditableProject(project)).toBe(true);
  });

  it('legacy compatibility: no source document at all behaves as editable', () => {
    const project = createProjectRecord('user-1', { title: 'Proyecto en blanco' });
    expect(project.document.source).toBeNull();
    expect(isFixedPdfProject(project)).toBe(false);
    expect(isEditableProject(project)).toBe(true);
  });
});
