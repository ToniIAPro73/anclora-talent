import { describe, expect, test, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import type { SemanticDocument } from '@/lib/document/model';
import { hashDocumentAst } from './hash';
import { compositorAssetId, withStaleStatus, type ProjectAssetManifestItem } from './model';
import { createManifestVersion, getLatestManifest, listManifestVersions } from './repository';

const PROJECT = '11111111-1111-1111-1111-111111111111';

function item(overrides: Partial<ProjectAssetManifestItem> = {}): ProjectAssetManifestItem {
  return {
    assetId: 'epub',
    kind: 'epub',
    url: 'https://blob.example/epub',
    blobKey: 'p/1.epub',
    provenance: 'compositor',
    sourceHash: 'hash-a',
    createdAt: '2026-08-04T10:00:00.000Z',
    ...overrides,
  };
}

/**
 * DB mock: select() drains `selectResults` per call (orderBy/limit chain and
 * plain await both resolve the queued rows); insert().values().returning()
 * echoes the row back with a generated id/date.
 */
function createDbMock(opts: { selectResults?: unknown[][] } = {}) {
  const selectQueue = [...(opts.selectResults ?? [])];
  const insertedValues: unknown[] = [];

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
      values: vi.fn((values: { projectId: string; version: number; items: unknown }) => {
        insertedValues.push(values);
        return {
          returning: vi.fn().mockResolvedValue([
            {
              id: 'manifest-1',
              projectId: values.projectId,
              version: values.version,
              items: values.items,
              createdAt: new Date('2026-08-04T11:00:00.000Z'),
            },
          ]),
        };
      }),
    })),
  };

  return { db, insertedValues };
}

describe('hashDocumentAst', () => {
  const base: SemanticDocument = {
    version: 1,
    metadata: { title: 'Libro' },
    blocks: [{ id: 'b1', type: 'paragraph', content: [{ type: 'text', text: 'Hola' }] }],
  };

  test('is deterministic for the same AST', () => {
    expect(hashDocumentAst(base)).toBe(hashDocumentAst(base));
    expect(hashDocumentAst(base)).toMatch(/^[0-9a-f]{64}$/);
  });

  test('changes when content changes', () => {
    const edited: SemanticDocument = {
      ...base,
      blocks: [{ id: 'b1', type: 'paragraph', content: [{ type: 'text', text: 'Adiós' }] }],
    };
    expect(hashDocumentAst(edited)).not.toBe(hashDocumentAst(base));
  });

  test('changes when metadata changes', () => {
    const edited: SemanticDocument = { ...base, metadata: { title: 'Otro' } };
    expect(hashDocumentAst(edited)).not.toBe(hashDocumentAst(base));
  });
});

describe('withStaleStatus', () => {
  test('marks items whose sourceHash differs from the current AST hash', () => {
    const items = [item({ sourceHash: 'hash-a' }), item({ assetId: 'pdf', kind: 'pdf', sourceHash: 'hash-old' })];
    const flagged = withStaleStatus(items, 'hash-a');
    expect(flagged[0].stale).toBe(false);
    expect(flagged[1].stale).toBe(true);
  });

  test('does not mutate the input items', () => {
    const items = [item()];
    withStaleStatus(items, 'other-hash');
    expect(items[0]).not.toHaveProperty('stale');
  });
});

describe('compositorAssetId', () => {
  test('uses the kind as the stable asset id', () => {
    expect(compositorAssetId('epub')).toBe('epub');
    expect(compositorAssetId('markdown')).toBe('markdown');
  });
});

describe('manifest repository', () => {
  test('getLatestManifest returns the newest version row mapped to the model', async () => {
    const { db } = createDbMock({
      selectResults: [
        [
          {
            id: 'm-2',
            projectId: PROJECT,
            version: 2,
            items: [item()],
            createdAt: new Date('2026-08-04T10:00:00.000Z'),
          },
        ],
      ],
    });

    const manifest = await getLatestManifest(db as never, PROJECT);
    expect(manifest).toEqual({
      id: 'm-2',
      projectId: PROJECT,
      version: 2,
      items: [item()],
      createdAt: '2026-08-04T10:00:00.000Z',
    });
  });

  test('getLatestManifest returns null when the project has no manifest', async () => {
    const { db } = createDbMock({ selectResults: [[]] });
    await expect(getLatestManifest(db as never, PROJECT)).resolves.toBeNull();
  });

  test('createManifestVersion starts at version 1 for a new project', async () => {
    const { db, insertedValues } = createDbMock({ selectResults: [[]] });
    const created = await createManifestVersion(db as never, { projectId: PROJECT, items: [item()] });
    expect(created.version).toBe(1);
    expect(insertedValues[0]).toMatchObject({ projectId: PROJECT, version: 1 });
  });

  test('createManifestVersion is monotonic: latest + 1', async () => {
    const { db, insertedValues } = createDbMock({
      selectResults: [
        [
          {
            id: 'm-7',
            projectId: PROJECT,
            version: 7,
            items: [],
            createdAt: new Date('2026-08-03T10:00:00.000Z'),
          },
        ],
      ],
    });
    const created = await createManifestVersion(db as never, { projectId: PROJECT, items: [item()] });
    expect(created.version).toBe(8);
    expect(insertedValues[0]).toMatchObject({ version: 8 });
  });

  test('listManifestVersions maps every row newest first', async () => {
    const rows = [2, 1].map((version) => ({
      id: `m-${version}`,
      projectId: PROJECT,
      version,
      items: [],
      createdAt: new Date('2026-08-04T10:00:00.000Z'),
    }));
    const { db } = createDbMock({ selectResults: [rows] });
    const versions = await listManifestVersions(db as never, PROJECT);
    expect(versions.map((manifest) => manifest.version)).toEqual([2, 1]);
  });
});
