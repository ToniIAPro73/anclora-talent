import { describe, expect, test, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import type { SemanticDocument } from '@/lib/document/model';
import { hashDocumentAst } from '@/lib/manifest/hash';
import { createProjectRecord } from '@/lib/projects/factories';
import {
  captureAutoSaveSnapshot,
  captureDocumentSnapshot,
  restoreSnapshotAsNewVersion,
} from './capture';
import {
  AUTO_SAVE_SNAPSHOT_THROTTLE_MS,
  SNAPSHOT_RETENTION_LIMIT,
  defaultSnapshotLabel,
  shouldCaptureAutoSaveSnapshot,
  versionsToPrune,
} from './model';
import { createSnapshot, listSnapshots } from './repository';

const PROJECT = '11111111-1111-1111-1111-111111111111';
const NOW = new Date('2026-08-04T12:00:00.000Z');

function ast(text: string): SemanticDocument {
  return {
    version: 1,
    metadata: { title: 'Libro' },
    blocks: [{ id: 'b1', type: 'paragraph', content: [{ type: 'text', text }] }],
  };
}

function row(overrides: Record<string, unknown> = {}) {
  const version = (overrides.version as number | undefined) ?? 1;
  return {
    id: `snap-${version}`,
    projectId: PROJECT,
    version,
    document: ast('Hola'),
    label: `Guardado ${version}`,
    source: 'manual-save',
    sourceHash: 'hash-x',
    createdBy: 'user-1',
    createdAt: new Date('2026-08-04T10:00:00.000Z'),
    ...overrides,
  };
}

/**
 * DB mock: select() drains `selectResults` per call (orderBy/limit chain and
 * plain await both resolve the queued rows); insert().values().returning()
 * echoes the row back; delete().where() records the call.
 */
function createDbMock(opts: { selectResults?: unknown[][] } = {}) {
  const selectQueue = [...(opts.selectResults ?? [])];
  const insertedValues: Record<string, unknown>[] = [];
  const deleteCalls: unknown[] = [];

  const db = {
    select: vi.fn(() => {
      const rows = selectQueue.shift() ?? [];
      return {
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            orderBy: vi.fn(() => ({
              limit: vi.fn().mockResolvedValue(rows),
              then: (resolve: (value: unknown) => void) => resolve(rows),
            })),
          })),
        })),
      };
    }),
    insert: vi.fn(() => ({
      values: vi.fn((values: Record<string, unknown>) => {
        insertedValues.push(values);
        return {
          returning: vi.fn().mockResolvedValue([
            {
              id: `snap-${values.version}`,
              createdAt: new Date('2026-08-04T11:00:00.000Z'),
              ...values,
            },
          ]),
        };
      }),
    })),
    delete: vi.fn(() => ({
      where: vi.fn((condition: unknown) => {
        deleteCalls.push(condition);
        return Promise.resolve();
      }),
    })),
  };

  return { db, insertedValues, deleteCalls };
}

describe('capture policy (model)', () => {
  test('auto save captures when there is no previous snapshot', () => {
    expect(shouldCaptureAutoSaveSnapshot(null, NOW)).toBe(true);
  });

  test('auto save is throttled inside the window', () => {
    const recent = new Date(NOW.getTime() - AUTO_SAVE_SNAPSHOT_THROTTLE_MS + 1000).toISOString();
    expect(shouldCaptureAutoSaveSnapshot(recent, NOW)).toBe(false);
  });

  test('auto save captures again after the window', () => {
    const old = new Date(NOW.getTime() - AUTO_SAVE_SNAPSHOT_THROTTLE_MS).toISOString();
    expect(shouldCaptureAutoSaveSnapshot(old, NOW)).toBe(true);
  });

  test('retention keeps the newest window only', () => {
    expect(versionsToPrune([5, 4, 3, 2, 1], 3)).toEqual([2, 1]);
    expect(versionsToPrune([2, 1], SNAPSHOT_RETENTION_LIMIT)).toEqual([]);
  });

  test('default labels record the origin', () => {
    expect(defaultSnapshotLabel('manual-save', 4)).toBe('Guardado 4');
    expect(defaultSnapshotLabel('reimport', 5)).toBe('Reimportación 5');
    expect(defaultSnapshotLabel('restore', 6, 2)).toBe('Restauración desde v2');
  });
});

describe('snapshot repository', () => {
  test('createSnapshot starts at version 1 with the auto label', async () => {
    const { db, insertedValues } = createDbMock({ selectResults: [[], []] });
    const created = await createSnapshot(db as never, {
      projectId: PROJECT,
      document: ast('Hola'),
      source: 'manual-save',
      sourceHash: 'hash-a',
      createdBy: 'user-1',
    });
    expect(created.version).toBe(1);
    expect(insertedValues[0]).toMatchObject({ version: 1, label: 'Guardado 1', source: 'manual-save' });
  });

  test('createSnapshot is monotonic: latest + 1', async () => {
    const { db, insertedValues } = createDbMock({ selectResults: [[row({ version: 7 })], []] });
    const created = await createSnapshot(db as never, {
      projectId: PROJECT,
      document: ast('Hola'),
      source: 'manual-save',
      sourceHash: 'hash-a',
      createdBy: 'user-1',
    });
    expect(created.version).toBe(8);
    expect(insertedValues[0]).toMatchObject({ version: 8 });
  });

  test('createSnapshot prunes versions beyond the retention limit', async () => {
    const kept = Array.from({ length: SNAPSHOT_RETENTION_LIMIT }, (_, index) =>
      row({ version: SNAPSHOT_RETENTION_LIMIT + 1 - index }),
    );
    const stale = row({ id: 'snap-old', version: 1 });
    const { db, deleteCalls } = createDbMock({
      selectResults: [[row({ version: SNAPSHOT_RETENTION_LIMIT })], [...kept, stale]],
    });
    await createSnapshot(db as never, {
      projectId: PROJECT,
      document: ast('Hola'),
      source: 'manual-save',
      sourceHash: 'hash-a',
      createdBy: 'user-1',
    });
    expect(deleteCalls).toHaveLength(1);
  });

  test('listSnapshots returns metadata without the AST payload, newest first', async () => {
    const { db } = createDbMock({ selectResults: [[row({ version: 2 }), row({ version: 1 })]] });
    const metas = await listSnapshots(db as never, PROJECT);
    expect(metas.map((meta) => meta.version)).toEqual([2, 1]);
    expect(metas[0]).not.toHaveProperty('document');
    expect(metas[0]).toMatchObject({ label: 'Guardado 2', source: 'manual-save' });
  });
});

describe('capture orchestration', () => {
  test('manual save with an identical AST is skipped (nothing to diff)', async () => {
    const document = ast('Hola');
    const latest = row({ sourceHash: hashDocumentAst(document) });
    const { db, insertedValues } = createDbMock({ selectResults: [[latest]] });
    const result = await captureDocumentSnapshot(db as never, {
      projectId: PROJECT,
      document,
      source: 'manual-save',
      createdBy: 'user-1',
    });
    expect(result).toEqual({ created: false, reason: 'unchanged' });
    expect(insertedValues).toHaveLength(0);
  });

  test('reimport always records, even with an identical AST', async () => {
    const document = ast('Hola');
    const latest = row({ sourceHash: hashDocumentAst(document) });
    const { db, insertedValues } = createDbMock({ selectResults: [[latest], [latest], []] });
    const result = await captureDocumentSnapshot(db as never, {
      projectId: PROJECT,
      document,
      source: 'reimport',
      createdBy: 'user-1',
    });
    expect(result.created).toBe(true);
    expect(insertedValues[0]).toMatchObject({ source: 'reimport', label: 'Reimportación 2' });
  });

  test('auto save on chapter save is throttled per project', async () => {
    const project = createProjectRecord('user-1', { title: 'Libro' });
    const latest = row({ createdAt: new Date(NOW.getTime() - 1000) });
    const { db, insertedValues } = createDbMock({ selectResults: [[latest]] });
    const result = await captureAutoSaveSnapshot(db as never, {
      project,
      createdBy: 'user-1',
      now: NOW,
    });
    expect(result).toEqual({ created: false, reason: 'throttled' });
    expect(insertedValues).toHaveLength(0);
  });

  test('auto save captures the current AST after the throttle window', async () => {
    const project = createProjectRecord('user-1', { title: 'Libro' });
    const { db, insertedValues } = createDbMock({ selectResults: [[], [], []] });
    const result = await captureAutoSaveSnapshot(db as never, {
      project,
      createdBy: 'user-1',
      now: NOW,
    });
    expect(result.created).toBe(true);
    expect(insertedValues[0]).toMatchObject({ source: 'manual-save', version: 1 });
    const document = (insertedValues[0] as { document: SemanticDocument }).document;
    expect(document.blocks.length).toBeGreaterThan(0);
    expect(document.blocks.every((block) => Boolean(block.id))).toBe(true);
  });
});

describe('restore', () => {
  test('returns notFound when the version does not exist and applies nothing', async () => {
    const { db } = createDbMock({ selectResults: [[]] });
    const applyDocument = vi.fn();
    const result = await restoreSnapshotAsNewVersion(
      db as never,
      { projectId: PROJECT, version: 9, createdBy: 'user-1' },
      applyDocument,
    );
    expect(result).toEqual({ ok: false, error: 'notFound' });
    expect(applyDocument).not.toHaveBeenCalled();
  });

  test('applies the old AST and captures it as a NEW version (history untouched)', async () => {
    const target = row({ version: 3, document: ast('Versión antigua') });
    const latest = row({ version: 5 });
    const { db, insertedValues } = createDbMock({
      selectResults: [[target], [latest], [latest], []],
    });
    const applyDocument = vi.fn().mockResolvedValue(undefined);

    const result = await restoreSnapshotAsNewVersion(
      db as never,
      { projectId: PROJECT, version: 3, createdBy: 'user-1' },
      applyDocument,
    );

    expect(result.ok).toBe(true);
    expect(applyDocument).toHaveBeenCalledWith(target.document);
    // New version 6 with the restored AST; the target row is never rewritten.
    expect(insertedValues).toHaveLength(1);
    expect(insertedValues[0]).toMatchObject({
      version: 6,
      source: 'restore',
      label: 'Restauración desde v3',
    });
    expect((insertedValues[0] as { document: SemanticDocument }).document).toEqual(target.document);
    if (result.ok) {
      expect(result.snapshot.version).toBe(6);
    }
  });
});
