import { describe, expect, test, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { createProjectRecord, updateProjectDocument } from '@/lib/projects/factories';
import { persistDocumentUpdate, persistProjectGraph, projectRepository, reconstructChaptersFromBlockRows } from './repositories';

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

    expect(db.insert).toHaveBeenCalledTimes(5);
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

    expect(db.insert).toHaveBeenCalledTimes(6);
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
    expect(db.delete).toHaveBeenCalledTimes(1);
    expect(db.insert).toHaveBeenCalledTimes(1);
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
});
