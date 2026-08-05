import { describe, expect, test, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { FileStudioClient, REQUESTING_APP, REQUESTING_ORG } from './client';
import {
  loadCoverImageFromUrl,
  optimizeCoverForUser,
  resolveCoverImageUrl,
  resolveProcessingMode,
  type EmissionClient,
  type OptimizeCoverDeps,
} from './emission';
import { COVER_OPTIMIZE_OPERATION, COVER_OPTIMIZE_WIDTHS } from './operations';
import type { FileStudioConnection } from './pairing';
import type { ProjectRecord } from '@/lib/projects/types';

const USER = 'user_1';
const PROJECT = '11111111-1111-1111-1111-111111111111';

function projectWithCover(url: string | null): ProjectRecord {
  return {
    cover: { renderedImageUrl: url, backgroundImageUrl: null },
  } as unknown as ProjectRecord;
}

const PAIRED: FileStudioConnection = {
  userId: USER,
  deviceId: 'dev_1',
  deviceName: null,
  publicKey: null,
  status: 'paired',
  preferredMode: 'local',
};

/**
 * DB mock whose select() calls resolve the queued row sets in order and
 * whose insert().values() works both awaited directly (consent) and with
 * .returning() (job persistence).
 */
function createDbMock(opts: { selectResults?: unknown[][]; jobIds?: string[] } = {}) {
  const selectQueue = [...(opts.selectResults ?? [])];
  const jobIdQueue = [...(opts.jobIds ?? [])];
  const insertValues = vi.fn((values: unknown) => {
    void values;
    return {
      returning: vi.fn().mockResolvedValue([{ id: jobIdQueue.shift() ?? 'job-row' }]),
      then: (resolve: (value: unknown) => void) => resolve(undefined),
    };
  });

  return {
    insert: vi.fn(() => ({ values: insertValues })),
    select: vi.fn(() => {
      const rows = selectQueue.shift() ?? [];
      const limit = vi.fn().mockResolvedValue(rows);
      const orderBy = vi.fn(() => ({
        limit,
        then: (resolve: (value: unknown) => void) => resolve(rows),
      }));
      return {
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            orderBy,
            then: (resolve: (value: unknown) => void) => resolve(rows),
          })),
        })),
      };
    }),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn().mockResolvedValue(undefined),
      })),
    })),
    insertValues,
  };
}

function createClientMock(): EmissionClient & {
  uploadFile: ReturnType<typeof vi.fn>;
  createServiceJob: ReturnType<typeof vi.fn>;
  enqueueAgentJob: ReturnType<typeof vi.fn>;
} {
  return {
    uploadFile: vi.fn().mockResolvedValue({ id: 'upl_1' }),
    createServiceJob: vi.fn().mockImplementation(async (input: { options: { width: number } }) => ({
      jobId: `job_${input.options.width}`,
      status: 'queued',
      operation: COVER_OPTIMIZE_OPERATION,
    })),
    enqueueAgentJob: vi.fn().mockImplementation(async (input: { options?: { width: number } }) => ({
      id: `ajob_${input.options?.width}`,
      status: 'available',
    })),
  };
}

function coverFetch(): typeof fetch {
  return vi.fn().mockResolvedValue(
    new Response(new Uint8Array([0xff, 0xd8, 0xff]), {
      status: 200,
      headers: { 'Content-Type': 'image/jpeg' },
    }),
  ) as unknown as typeof fetch;
}

function createDeps(overrides: Partial<OptimizeCoverDeps> = {}): OptimizeCoverDeps & {
  db: ReturnType<typeof createDbMock>;
  client: ReturnType<typeof createClientMock>;
} {
  const db = createDbMock(overrides.db ? undefined : {});
  const client = createClientMock();
  return {
    db: (overrides.db ?? db) as OptimizeCoverDeps['db'],
    loadProject: vi.fn().mockResolvedValue(projectWithCover('https://blob.example/cover.jpg')),
    loadConnection: vi.fn().mockResolvedValue(null),
    createClient: vi.fn().mockResolvedValue(client),
    fetchImpl: coverFetch(),
    ...overrides,
    client,
  } as OptimizeCoverDeps & { db: ReturnType<typeof createDbMock>; client: ReturnType<typeof createClientMock> };
}

describe('resolveProcessingMode (routing-policy.md)', () => {
  test('paired agent → Mode 1 (local); otherwise Mode 2 (service) as declared fallback', () => {
    expect(resolveProcessingMode(PAIRED)).toBe('local');
    expect(resolveProcessingMode(null)).toBe('service');
    expect(resolveProcessingMode({ ...PAIRED, status: 'revoked' })).toBe('service');
  });
});

describe('resolveCoverImageUrl', () => {
  test('prefers the rasterized cover and falls back to the uploaded asset', () => {
    const project = {
      cover: { renderedImageUrl: 'https://blob/render.jpg', backgroundImageUrl: 'https://blob/bg.png' },
    } as unknown as ProjectRecord;
    expect(resolveCoverImageUrl(project)).toBe('https://blob/render.jpg');
    expect(
      resolveCoverImageUrl({
        cover: { renderedImageUrl: null, backgroundImageUrl: 'https://blob/bg.png' },
      } as unknown as ProjectRecord),
    ).toBe('https://blob/bg.png');
  });
});

describe('loadCoverImageFromUrl', () => {
  test('loads bytes from a data URL', async () => {
    const dataUrl = `data:image/png;base64,${Buffer.from([1, 2, 3]).toString('base64')}`;
    const image = await loadCoverImageFromUrl(dataUrl);
    expect(image.mimeType).toBe('image/png');
    expect(image.filename).toBe('cover.png');
    expect(Array.from(image.bytes)).toEqual([1, 2, 3]);
  });

  test('loads bytes from a remote URL with its content type', async () => {
    const image = await loadCoverImageFromUrl('https://blob.example/cover.jpg', coverFetch());
    expect(image.mimeType).toBe('image/jpeg');
    expect(image.bytes.length).toBe(3);
  });
});

describe('optimizeCoverForUser — limits (hardening.md §2)', () => {
  test('refuses when the user already has 3 active jobs', async () => {
    const deps = createDeps({
      db: createDbMock({ selectResults: [[{ id: 'a' }, { id: 'b' }, { id: 'c' }]] }) as never,
    });

    const result = await optimizeCoverForUser(deps, { userId: USER, projectId: PROJECT });

    expect(result).toEqual({ ok: false, error: 'limitConcurrent' });
    expect(deps.client.createServiceJob).not.toHaveBeenCalled();
  });

  test('refuses when the user reached 50 jobs today', async () => {
    const deps = createDeps({
      db: createDbMock({
        selectResults: [[], Array.from({ length: 50 }, (_, i) => ({ id: `j${i}` }))],
      }) as never,
    });

    const result = await optimizeCoverForUser(deps, { userId: USER, projectId: PROJECT });

    expect(result).toEqual({ ok: false, error: 'limitDaily' });
    expect(deps.client.createServiceJob).not.toHaveBeenCalled();
  });
});

describe('optimizeCoverForUser — validation', () => {
  test('project not found', async () => {
    const deps = createDeps({ loadProject: vi.fn().mockResolvedValue(null) });
    await expect(
      optimizeCoverForUser(deps, { userId: USER, projectId: PROJECT }),
    ).resolves.toEqual({ ok: false, error: 'notFound' });
  });

  test('project without cover image', async () => {
    const deps = createDeps({ loadProject: vi.fn().mockResolvedValue(projectWithCover(null)) });
    await expect(
      optimizeCoverForUser(deps, { userId: USER, projectId: PROJECT }),
    ).resolves.toEqual({ ok: false, error: 'noCover' });
  });
});

describe('optimizeCoverForUser — Mode 2 (service fallback)', () => {
  test('uploads once and emits one image:resize job per width, persisted with provenance', async () => {
    const deps = createDeps();

    const result = await optimizeCoverForUser(deps, { userId: USER, projectId: PROJECT });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.mode).toBe('service');
    expect(result.jobs.map((job) => job.width)).toEqual([...COVER_OPTIMIZE_WIDTHS]);

    expect(deps.client.uploadFile).toHaveBeenCalledTimes(1);
    expect(deps.client.createServiceJob).toHaveBeenCalledTimes(3);
    for (const width of COVER_OPTIMIZE_WIDTHS) {
      expect(deps.client.createServiceJob).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: COVER_OPTIMIZE_OPERATION,
          uploadId: 'upl_1',
          options: { width, fit: 'inside', quality: 85 },
          idempotencyKey: expect.stringContaining(`cover-optimize:${PROJECT}:${width}:`),
        }),
      );
    }

    // Provenance persisted per job: status, mode, operation, options (F2 manifest).
    const persisted = deps.db.insertValues.mock.calls.map(([values]) => values as Record<string, unknown>);
    expect(persisted).toHaveLength(3);
    for (const [index, width] of COVER_OPTIMIZE_WIDTHS.entries()) {
      expect(persisted[index]).toMatchObject({
        userId: USER,
        projectId: PROJECT,
        externalJobId: `job_${width}`,
        operation: COVER_OPTIMIZE_OPERATION,
        mode: 'service',
        status: 'queued',
        options: { width, fit: 'inside', quality: 85 },
      });
    }
  });
});

describe('optimizeCoverForUser — Mode 1 (ask-always consent)', () => {
  test('refuses with requiresConsent when no decision is on record', async () => {
    const deps = createDeps({
      loadConnection: vi.fn().mockResolvedValue(PAIRED),
      // select order: active jobs, daily jobs, latest consent (empty).
      db: createDbMock({ selectResults: [[], [], []] }) as never,
    });

    const result = await optimizeCoverForUser(deps, { userId: USER, projectId: PROJECT });

    expect(result).toMatchObject({
      ok: false,
      requiresConsent: true,
      operation: COVER_OPTIMIZE_OPERATION,
      mode: 'local',
    });
    expect(deps.client.enqueueAgentJob).not.toHaveBeenCalled();
  });

  test('records the granted decision before emitting to the paired device', async () => {
    const db = createDbMock({ selectResults: [[], []] });
    const deps = createDeps({
      loadConnection: vi.fn().mockResolvedValue(PAIRED),
      db: db as never,
    });

    const result = await optimizeCoverForUser(deps, {
      userId: USER,
      projectId: PROJECT,
      consent: 'granted',
    });

    expect(result.ok).toBe(true);
    // First insert is the consent record, before any job emission.
    expect(db.insertValues.mock.calls[0]?.[0]).toMatchObject({
      userId: USER,
      operation: COVER_OPTIMIZE_OPERATION,
      mode: 'local',
      decision: 'granted',
      jobId: null,
    });

    expect(deps.client.enqueueAgentJob).toHaveBeenCalledTimes(3);
    for (const width of COVER_OPTIMIZE_WIDTHS) {
      expect(deps.client.enqueueAgentJob).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: COVER_OPTIMIZE_OPERATION,
          deviceId: 'dev_1',
          inputMimeType: 'image/jpeg',
          options: { width, fit: 'inside', quality: 85 },
        }),
      );
    }
    if (result.ok) expect(result.mode).toBe('local');
  });

  test('emits with a previously recorded granted consent', async () => {
    const deps = createDeps({
      loadConnection: vi.fn().mockResolvedValue(PAIRED),
      db: createDbMock({ selectResults: [[], [], [{ decision: 'granted' }]] }) as never,
    });

    const result = await optimizeCoverForUser(deps, { userId: USER, projectId: PROJECT });

    expect(result.ok).toBe(true);
    expect(deps.client.enqueueAgentJob).toHaveBeenCalledTimes(3);
  });

  test('records a denial and refuses the emission', async () => {
    const db = createDbMock({ selectResults: [[], []] });
    const deps = createDeps({
      loadConnection: vi.fn().mockResolvedValue(PAIRED),
      db: db as never,
    });

    const result = await optimizeCoverForUser(deps, {
      userId: USER,
      projectId: PROJECT,
      consent: 'denied',
    });

    expect(result).toEqual({ ok: false, error: 'consentRejected' });
    expect(db.insertValues.mock.calls[0]?.[0]).toMatchObject({ decision: 'denied' });
    expect(deps.client.enqueueAgentJob).not.toHaveBeenCalled();
  });
});

describe('wire payloads against the real FileStudioClient (code wins)', () => {
  test('service mode speaks the CreateJobSchema contract of POST /api/v1/jobs', async () => {
    const requests: Array<{ url: string; init: RequestInit }> = [];
    const fetchImpl = vi.fn().mockImplementation(async (url: string, init: RequestInit) => {
      requests.push({ url, init });
      if (url.endsWith('/api/v1/uploads')) {
        return new Response(
          JSON.stringify({
            id: 'upl_1',
            filename: 'cover.jpg',
            mimeType: 'image/jpeg',
            sizeBytes: 3,
            sha256: 'abc',
          }),
          { status: 201 },
        );
      }
      const body = JSON.parse(String(init.body)) as { options: { width: number } };
      return new Response(
        JSON.stringify({ jobId: `job_${body.options.width}`, status: 'queued', operation: COVER_OPTIMIZE_OPERATION }),
        { status: 202 },
      );
    }) as unknown as typeof fetch;

    const client = new FileStudioClient({
      baseUrl: 'https://filestudio.example',
      tokenProvider: async () => 'service-token',
      fetchImpl,
    });

    const deps = createDeps({ createClient: vi.fn().mockResolvedValue(client) });
    const result = await optimizeCoverForUser(deps, { userId: USER, projectId: PROJECT });
    expect(result.ok).toBe(true);

    const jobCalls = requests.filter((request) => request.url.endsWith('/api/v1/jobs'));
    expect(jobCalls).toHaveLength(3);
    for (const [index, width] of COVER_OPTIMIZE_WIDTHS.entries()) {
      const body = JSON.parse(String(jobCalls[index]?.init.body)) as Record<string, unknown>;
      // Shape verified against apps/api/src/routes/jobs.ts CreateJobSchema.
      expect(body).toMatchObject({
        operation: 'image:resize',
        input: { uploadId: 'upl_1' },
        options: { width, fit: 'inside', quality: 85 },
        metadata: { sourceApplication: REQUESTING_APP },
      });
      expect(typeof body.idempotencyKey).toBe('string');
      const headers = jobCalls[index]?.init.headers as Record<string, string>;
      expect(headers['Idempotency-Key']).toBe(body.idempotencyKey);
    }
  });

  test('agent mode carries the consumer identity in the meta payload', async () => {
    const requests: Array<{ url: string; init: RequestInit }> = [];
    const fetchImpl = vi.fn().mockImplementation(async (url: string, init: RequestInit) => {
      requests.push({ url, init });
      const form = init.body as FormData;
      const meta = JSON.parse(String(form.get('meta'))) as { options: { width: number } };
      return new Response(JSON.stringify({ id: `ajob_${meta.options.width}`, status: 'available' }), {
        status: 201,
      });
    }) as unknown as typeof fetch;

    const client = new FileStudioClient({
      baseUrl: 'https://filestudio.example',
      tokenProvider: async () => 'device-token',
      fetchImpl,
    });

    const deps = createDeps({
      loadConnection: vi.fn().mockResolvedValue(PAIRED),
      createClient: vi.fn().mockResolvedValue(client),
    });
    const result = await optimizeCoverForUser(deps, {
      userId: USER,
      projectId: PROJECT,
      consent: 'granted',
    });
    expect(result.ok).toBe(true);

    expect(requests.every((request) => request.url.endsWith('/api/v1/agent-jobs'))).toBe(true);
    const metas = requests.map((request) =>
      JSON.parse(String((request.init.body as FormData).get('meta'))) as Record<string, unknown>,
    );
    for (const [index, width] of COVER_OPTIMIZE_WIDTHS.entries()) {
      expect(metas[index]).toMatchObject({
        operation: 'image:resize',
        options: { width, fit: 'inside', quality: 85 },
        requestingOrg: REQUESTING_ORG,
        requestingApp: REQUESTING_APP,
        deviceId: 'dev_1',
        retentionMinutes: 60,
        timeoutMs: 120_000,
      });
    }
  });
});
