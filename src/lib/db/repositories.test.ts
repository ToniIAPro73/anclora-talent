import { describe, expect, test, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { createProjectRecord, updateProjectDocument } from '@/lib/projects/factories';
import { isFixedPdfProject } from '@/lib/projects/types';
import {
  mapRowsToProject,
  persistDocumentUpdate,
  persistProjectGraph,
  projectRepository,
  reconstructChaptersFromBlockRows,
} from './repositories';

function baseProjectRow() {
  return {
    id: 'project-1',
    userId: 'user-1',
    workspaceId: null,
    slug: 'ebook',
    title: 'Ebook',
    status: 'draft',
    workflowStep: 1,
    brandProfileId: null,
    templateId: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };
}

function baseCoverRow() {
  return {
    id: 'cover-1',
    projectId: 'project-1',
    title: 'Ebook',
    subtitle: '',
    palette: 'obsidian',
    backgroundImageUrl: null,
    thumbnailUrl: null,
    layout: 'centered',
    fontFamily: null,
    accentColor: null,
    renderedImageUrl: null,
    showSubtitle: true,
  };
}

function createDbMock() {
  return {
    insert: vi.fn(() => ({
      values: vi.fn().mockResolvedValue(undefined),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn().mockResolvedValue(undefined),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn().mockResolvedValue(undefined),
    })),
    query: {
      backCoverDesigns: {
        findFirst: vi.fn().mockResolvedValue({ id: 'bc-1' }),
      },
    },
  };
}

describe('repository persistence helpers', () => {
  test('persists a new project without relying on transactions', async () => {
    const db = createDbMock();
    const project = createProjectRecord('user_123', { title: 'Proyecto transaccional' });

    await persistProjectGraph(db as never, project);

    expect(db.insert).toHaveBeenCalledTimes(6);
  });

  test('persists source assets when the imported project contains them', async () => {
    const db = createDbMock();
    const project = createProjectRecord('user_123', {
      title: 'Proyecto importado',
      importedDocument: {
        title: 'Proyecto importado',
        subtitle: 'Subtitulo',
        author: 'Autor Demo',
        chapterTitle: 'Legado',
        blocks: [{ type: 'paragraph', content: 'Bloque legado' }],
        sourceFileName: 'source.docx',
        sourceMimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      },
    });

    await persistProjectGraph(db as never, project);

    expect(db.insert).toHaveBeenCalledTimes(7);
  });

  test('persists a document update without relying on transactions', async () => {
    const db = createDbMock();
    const current = createProjectRecord('user_123', { title: 'Proyecto actual' });
    const chapter = current.document.chapters[0];
    const next = updateProjectDocument(current, {
      title: 'Proyecto actualizado',
      subtitle: 'Subtitulo actualizado',
      author: 'Autor Actualizado',
      chapterTitle: 'Capitulo actualizado',
      blocks: chapter.blocks.map((block) => ({
        id: block.id,
        content: `${block.content} actualizado`,
      })),
    });

    await persistDocumentUpdate(db as never, next);

    expect(db.update).toHaveBeenCalledTimes(4);
    expect(db.delete).toHaveBeenCalledTimes(2);
    expect(db.insert).toHaveBeenCalledTimes(2);
  });

  test('reconstructs multiple chapters from flattened block rows', () => {
    const chapters = reconstructChaptersFromBlockRows([
      {
        id: 'block-1',
        projectDocumentId: 'doc-1',
        chapterId: 'chapter-a',
        chapterOrder: 1,
        chapterTitle: 'Capitulo A',
        blockOrder: 2,
        blockType: 'paragraph',
        content: 'Segundo bloque A',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      },
      {
        id: 'block-2',
        projectDocumentId: 'doc-1',
        chapterId: 'chapter-b',
        chapterOrder: 2,
        chapterTitle: 'Capitulo B',
        blockOrder: 1,
        blockType: 'heading',
        content: 'Primer bloque B',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      },
      {
        id: 'block-3',
        projectDocumentId: 'doc-1',
        chapterId: 'chapter-a',
        chapterOrder: 1,
        chapterTitle: 'Capitulo A',
        blockOrder: 1,
        blockType: 'heading',
        content: 'Primer bloque A',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      },
    ] as never);

    expect(chapters).toHaveLength(2);
    expect(chapters[0].id).toBe('chapter-a');
    expect(chapters[0].blocks.map((block) => block.content)).toEqual([
      'Primer bloque A',
      'Segundo bloque A',
    ]);
    expect(chapters[1].id).toBe('chapter-b');
    expect(chapters[1].blocks[0].content).toBe('Primer bloque B');
  });

  test('deletes a project from the memory repository', async () => {
    const created = await projectRepository.createProject('memory-user', {
      title: 'Proyecto eliminable',
    });

    const beforeDelete = await projectRepository.getProjectById('memory-user', created.id);
    expect(beforeDelete?.id).toBe(created.id);

    await projectRepository.deleteProject('memory-user', created.id);

    const afterDelete = await projectRepository.getProjectById('memory-user', created.id);
    expect(afterDelete).toBeNull();
  });

  test('mapRowsToProject round-trips fixed-pdf source metadata and asset blobUrl', () => {
    const documentRow = {
      id: 'doc-1',
      projectId: 'project-1',
      title: 'El Plan de Escape de la Mediana Edad',
      subtitle: 'Cómo desatascarte profesionalmente sin dinamitar tu vida',
      author: 'Antonio Ballesteros Alonso',
      language: 'es',
      rules: null,
      documentModel: null,
      metadata: null,
      provenance: null,
      sourceMetadata: {
        fileName: 'El_Plan_de_Escape_EBOOK.pdf',
        mimeType: 'application/pdf',
        importedAt: '2026-01-01T00:00:00.000Z',
        mode: 'fixed-pdf',
        pageCount: 122,
        sizeBytes: 4_500_000,
        sha256: 'a'.repeat(64),
        sourceAssetId: 'asset-1',
        sourceAccessLevel: 'public-proxy-only',
      },
    };
    const assetRows = [
      {
        id: 'asset-1',
        projectId: 'project-1',
        workspaceId: null,
        kind: 'document',
        usage: 'source-document',
        blobUrl: 'projects/project-1/source/1700000000000-el-plan.pdf',
        alt: 'El_Plan_de_Escape_EBOOK.pdf',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      },
    ];

    const project = mapRowsToProject(
      baseProjectRow() as never,
      documentRow as never,
      [] as never,
      baseCoverRow() as never,
      null,
      [] as never,
      assetRows as never,
    );

    expect(project.document.source?.mode).toBe('fixed-pdf');
    expect(project.document.source?.sha256).toBe('a'.repeat(64));
    expect(project.document.source?.sizeBytes).toBe(4_500_000);
    expect(project.document.source?.sourceAssetId).toBe('asset-1');
    expect(project.document.source?.sourceAccessLevel).toBe('public-proxy-only');
    expect(project.assets[0].blobUrl).toBe('projects/project-1/source/1700000000000-el-plan.pdf');
    expect(isFixedPdfProject(project)).toBe(true);
  });

  test('mapRowsToProject treats a legacy row with no mode field as editable', () => {
    const legacyDocumentRow = {
      id: 'doc-legacy',
      projectId: 'project-1',
      title: 'Proyecto legado',
      subtitle: '',
      author: '',
      language: 'es',
      rules: null,
      documentModel: null,
      metadata: null,
      provenance: null,
      sourceMetadata: {
        fileName: 'manuscrito.docx',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        importedAt: '2025-01-01T00:00:00.000Z',
      },
    };

    const project = mapRowsToProject(
      baseProjectRow() as never,
      legacyDocumentRow as never,
      [] as never,
      baseCoverRow() as never,
      null,
      [] as never,
      [] as never,
    );

    expect(project.document.source?.mode).toBeUndefined();
    expect(isFixedPdfProject(project)).toBe(false);
  });
});
