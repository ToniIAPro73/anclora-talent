import { describe, expect, test, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import type { ProjectRecord } from '@/lib/projects/types';
import { generateLaunchPack, resolveLaunchPackPlan, type LaunchPackDeps } from './pack';

const USER = 'user_1';
const PROJECT = '11111111-1111-1111-1111-111111111111';

function project(templateId?: string | null): ProjectRecord {
  return {
    id: PROJECT,
    userId: USER,
    slug: 'mi-libro',
    templateId: templateId ?? null,
    document: { title: 'Mi libro' },
  } as unknown as ProjectRecord;
}

function createDbMock() {
  const inserted: unknown[] = [];
  return {
    inserted,
    db: {
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            orderBy: vi.fn(() => ({
              limit: vi.fn().mockResolvedValue([]),
              then: (resolve: (value: unknown) => void) => resolve([]),
            })),
          })),
        })),
      })),
      insert: vi.fn(() => ({
        values: vi.fn((values: { projectId: string; version: number; items: unknown[] }) => {
          inserted.push(values);
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
    },
  };
}

function createDeps(overrides: Partial<LaunchPackDeps> = {}): {
  deps: LaunchPackDeps;
  uploads: Array<{ projectId: string; name: string; type: string }>;
  inserted: unknown[];
} {
  const { db, inserted } = createDbMock();
  const uploads: Array<{ projectId: string; name: string; type: string }> = [];

  const deps: LaunchPackDeps = {
    db: db as never,
    loadProject: vi.fn().mockResolvedValue(project('standard-book')),
    buildEpub: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
    buildPdf: vi.fn().mockResolvedValue(new Uint8Array([4, 5, 6])),
    buildHtml: vi.fn().mockResolvedValue('<html></html>'),
    buildMarkdown: vi.fn().mockResolvedValue('# Mi libro\n'),
    buildSlides: vi.fn().mockResolvedValue('<html>slides</html>'),
    upload: vi.fn(async (projectId: string, file: File) => {
      uploads.push({ projectId, name: file.name, type: file.type });
      return { url: `https://blob.example/${file.name}`, pathname: `${projectId}/${file.name}` };
    }),
    sourceHashOf: vi.fn().mockReturnValue('hash-abc'),
    now: () => new Date('2026-08-04T10:00:00.000Z'),
    ...overrides,
  };

  return { deps, uploads, inserted };
}

describe('resolveLaunchPackPlan', () => {
  test('projects without a template get the default set', () => {
    expect(resolveLaunchPackPlan(null)).toEqual(['epub', 'pdf', 'html', 'markdown']);
    expect(resolveLaunchPackPlan('does-not-exist')).toEqual(['epub', 'pdf', 'html', 'markdown']);
  });

  test('standard-book declares pdf+epub (+docx out of pack); markdown is always added', () => {
    expect(resolveLaunchPackPlan('standard-book')).toEqual(['epub', 'pdf', 'markdown']);
  });

  test('technical-manual declares pdf+html; modular-course adds slides', () => {
    expect(resolveLaunchPackPlan('technical-manual')).toEqual(['pdf', 'html', 'markdown']);
    expect(resolveLaunchPackPlan('modular-course')).toEqual(['epub', 'pdf', 'markdown', 'slides']);
  });
});

describe('generateLaunchPack', () => {
  test('generates the template assets with compositor provenance and one manifest version', async () => {
    const { deps, uploads, inserted } = createDeps();
    const result = await generateLaunchPack(deps, { userId: USER, projectId: PROJECT });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.generated).toEqual(['epub', 'pdf', 'markdown']);
    expect(result.failed).toEqual([]);
    expect(result.manifest.version).toBe(1);

    // Uploads use the project slug and the right MIME types.
    expect(uploads.map((upload) => upload.name)).toEqual(['mi-libro.epub', 'mi-libro.pdf', 'mi-libro.md']);
    expect(uploads[0].type).toBe('application/epub+zip');
    expect(uploads[2].type).toBe('text/markdown');

    // Every item carries the AST hash and compositor provenance.
    const items = (inserted[0] as { items: Array<Record<string, unknown>> }).items;
    expect(items).toHaveLength(3);
    for (const item of items) {
      expect(item.provenance).toBe('compositor');
      expect(item.sourceHash).toBe('hash-abc');
      expect(item.createdAt).toBe('2026-08-04T10:00:00.000Z');
    }
    expect(items[0]).toMatchObject({
      assetId: 'epub',
      kind: 'epub',
      url: 'https://blob.example/mi-libro.epub',
      blobKey: `${PROJECT}/mi-libro.epub`,
    });
  });

  test('modular-course includes slides uploaded as <slug>.slides.html', async () => {
    const { deps, uploads } = createDeps({
      loadProject: vi.fn().mockResolvedValue(project('modular-course')),
    });
    const result = await generateLaunchPack(deps, { userId: USER, projectId: PROJECT });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.generated).toEqual(['epub', 'pdf', 'markdown', 'slides']);
    expect(uploads.map((upload) => upload.name)).toContain('mi-libro.slides.html');
  });

  test('a failing format does not abort the pack: it lands in failed', async () => {
    const { deps } = createDeps({
      buildPdf: vi.fn().mockRejectedValue(new Error('react-pdf blew up')),
    });
    const result = await generateLaunchPack(deps, { userId: USER, projectId: PROJECT });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.generated).toEqual(['epub', 'markdown']);
    expect(result.failed).toEqual(['pdf']);
    expect(result.manifest.items.map((item) => item.kind)).toEqual(['epub', 'markdown']);
  });

  test('keeps url null when Blob is not configured', async () => {
    const { deps } = createDeps({ upload: vi.fn().mockResolvedValue(null) });
    const result = await generateLaunchPack(deps, { userId: USER, projectId: PROJECT });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.manifest.items.every((item) => item.url === null && item.blobKey === null)).toBe(true);
  });

  test('returns unavailable when every format fails and never writes a manifest', async () => {
    const { deps, inserted } = createDeps({
      buildEpub: vi.fn().mockRejectedValue(new Error('x')),
      buildPdf: vi.fn().mockRejectedValue(new Error('x')),
      buildMarkdown: vi.fn().mockRejectedValue(new Error('x')),
    });
    const result = await generateLaunchPack(deps, { userId: USER, projectId: PROJECT });

    expect(result).toEqual({ ok: false, error: 'unavailable' });
    expect(inserted).toHaveLength(0);
  });

  test('returns notFound for a project the user does not own', async () => {
    const { deps } = createDeps({ loadProject: vi.fn().mockResolvedValue(null) });
    const result = await generateLaunchPack(deps, { userId: USER, projectId: PROJECT });
    expect(result).toEqual({ ok: false, error: 'notFound' });
  });
});
