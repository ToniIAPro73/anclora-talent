import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { importSessionRepository } from './import-session';
import type { ImportedDocumentSeed } from './types';

const mockSeed: ImportedDocumentSeed = {
  title: 'Documento de Prueba',
  subtitle: 'Subtítulo',
  author: 'Autor',
  chapterTitle: 'Capítulo 1',
  chapters: [
    {
      title: 'Capítulo 1',
      blocks: [
        {
          type: 'paragraph',
          content: '<p>Contenido del capítulo 1</p>',
        },
      ],
    },
  ],
  blocks: [],
  sourceFileName: 'prueba.docx',
  sourceMimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};

describe('importSessionRepository security and lifecycle', () => {
  it('creates an import session and retrieves it for the owning user', async () => {
    const session = await importSessionRepository.createImportSession('user-a', {
      sourceFileName: 'prueba.docx',
      sourceMimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      extractedSeed: mockSeed,
    });

    expect(session.id).toBeTruthy();
    expect(session.userId).toBe('user-a');
    expect(session.status).toBe('ready');

    const retrieved = await importSessionRepository.getImportSession('user-a', session.id);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.id).toBe(session.id);
  });

  it('rejects cross-user access (user-b cannot get user-a session)', async () => {
    const session = await importSessionRepository.createImportSession('user-a', {
      sourceFileName: 'prueba.docx',
      sourceMimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      extractedSeed: mockSeed,
    });

    const unauthorized = await importSessionRepository.getImportSession('user-b', session.id);
    expect(unauthorized).toBeNull();

    const cannotConsume = await importSessionRepository.consumeImportSession('user-b', session.id);
    expect(cannotConsume).toBeNull();
  });

  it('consumes a session once and marks it consumed (cannot consume twice)', async () => {
    const session = await importSessionRepository.createImportSession('user-a', {
      sourceFileName: 'prueba.docx',
      sourceMimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      extractedSeed: mockSeed,
    });

    const consumed = await importSessionRepository.consumeImportSession('user-a', session.id);
    expect(consumed).not.toBeNull();
    expect(consumed?.status).toBe('consumed');

    // Second consume attempt must fail
    const secondConsume = await importSessionRepository.consumeImportSession('user-a', session.id);
    expect(secondConsume).toBeNull();

    // Get must also return null for consumed session
    const getAfterConsume = await importSessionRepository.getImportSession('user-a', session.id);
    expect(getAfterConsume).toBeNull();
  });

  it('rejects expired sessions', async () => {
    // Expire immediately (-1000 ms)
    const session = await importSessionRepository.createImportSession('user-a', {
      sourceFileName: 'prueba.docx',
      sourceMimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      extractedSeed: mockSeed,
      expiresInMs: -1000,
    });

    const expiredGet = await importSessionRepository.getImportSession('user-a', session.id);
    expect(expiredGet).toBeNull();

    const expiredConsume = await importSessionRepository.consumeImportSession('user-a', session.id);
    expect(expiredConsume).toBeNull();
  });

  it('deletes an import session only by the owning user', async () => {
    const session = await importSessionRepository.createImportSession('user-a', {
      sourceFileName: 'prueba.docx',
      sourceMimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      extractedSeed: mockSeed,
    });

    // Cross-user delete must return false
    const deleteCross = await importSessionRepository.deleteImportSession('user-b', session.id);
    expect(deleteCross).toBe(false);

    // Owner delete succeeds
    const deleteOwner = await importSessionRepository.deleteImportSession('user-a', session.id);
    expect(deleteOwner).toBe(true);

    const getAfterDelete = await importSessionRepository.getImportSession('user-a', session.id);
    expect(getAfterDelete).toBeNull();
  });
});
