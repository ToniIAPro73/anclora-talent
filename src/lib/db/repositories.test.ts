import { describe, expect, test, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { createProjectRecord, updateProjectDocument } from '@/lib/projects/factories';
import { persistDocumentUpdate, persistProjectGraph } from './repositories';

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
  };
}

describe('repository persistence helpers', () => {
  test('persists a new project without relying on transactions', async () => {
    const db = createDbMock();
    const project = createProjectRecord('user_123', { title: 'Proyecto transaccional' });

    await persistProjectGraph(db as never, project);

    expect(db.insert).toHaveBeenCalledTimes(4);
  });

  test('persists a document update without relying on transactions', async () => {
    const db = createDbMock();
    const current = createProjectRecord('user_123', { title: 'Proyecto actual' });
    const chapter = current.document.chapters[0];
    const next = updateProjectDocument(current, {
      title: 'Proyecto actualizado',
      subtitle: 'Subtitulo actualizado',
      chapterTitle: 'Capitulo actualizado',
      blocks: chapter.blocks.map((block) => ({
        id: block.id,
        content: `${block.content} actualizado`,
      })),
    });

    await persistDocumentUpdate(db as never, next);

    expect(db.update).toHaveBeenCalledTimes(3);
    expect(db.delete).toHaveBeenCalledTimes(1);
    expect(db.insert).toHaveBeenCalledTimes(1);
  });
});
