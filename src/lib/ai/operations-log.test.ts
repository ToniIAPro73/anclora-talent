import { describe, expect, test, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { aiOperationsLog } from './operations-log';

describe('aiOperationsLog (in-memory path)', () => {
  test('records and lists accepted operations in order', async () => {
    const projectId = 'proj-log-1';
    await aiOperationsLog.record('user_1', projectId, {
      proposalId: 'ai-1',
      kind: 'style-rewrite',
      summary: 'Reescribir 2 párrafos',
      mode: 'cloud',
      affectedBlockIds: ['p1', 'p2'],
    });
    await aiOperationsLog.record('user_1', projectId, {
      proposalId: 'ai-2',
      kind: 'derived-summary',
      summary: 'Añadir capítulo Resumen',
      mode: 'cloud',
      affectedBlockIds: ['s1'],
    });

    const records = await aiOperationsLog.list('user_1', projectId);
    expect(records).toHaveLength(2);
    expect(records[0]).toMatchObject({
      projectId,
      userId: 'user_1',
      proposalId: 'ai-1',
      kind: 'style-rewrite',
      summary: 'Reescribir 2 párrafos',
      mode: 'cloud',
      affectedBlockIds: ['p1', 'p2'],
    });
    expect(records[0].id).toBeTruthy();
    expect(records[0].createdAt).toBeTruthy();
  });

  test('scopes records per project and per user', async () => {
    await aiOperationsLog.record('user_2', 'proj-log-2', {
      proposalId: 'ai-3',
      kind: 'content-architecture',
      summary: 'Reestructurar',
      mode: 'local',
      affectedBlockIds: [],
    });

    expect(await aiOperationsLog.list('user_2', 'proj-log-other')).toEqual([]);
    expect(await aiOperationsLog.list('user_other', 'proj-log-2')).toEqual([]);
    expect(await aiOperationsLog.list('user_2', 'proj-log-2')).toHaveLength(1);
  });
});
