import { describe, expect, test, vi } from 'vitest';
import {
  CircuitBreaker,
  FileStudioApiError,
  FileStudioCircuitOpenError,
  FileStudioClient,
  REQUESTING_APP,
  REQUESTING_ORG,
  projectAgentStatus,
} from './client';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function problemResponse(code: string, status: number): Response {
  return jsonResponse({ type: 'about:blank', title: 'Error', status, code }, status);
}

function buildClient(overrides: Partial<ConstructorParameters<typeof FileStudioClient>[0]> = {}) {
  const fetchImpl = vi.fn<typeof fetch>();
  const sleep = vi.fn<(ms: number) => Promise<void>>().mockResolvedValue(undefined);
  let now = 1_000_000;
  const client = new FileStudioClient({
    baseUrl: 'https://filestudio.test',
    tokenProvider: async () => 'service-token',
    fetchImpl,
    sleep,
    now: () => now,
    ...overrides,
  });
  return {
    client,
    fetchImpl,
    sleep,
    advance: (ms: number) => {
      now += ms;
    },
  };
}

describe('FileStudioClient job emission', () => {
  test('createServiceJob sends idempotency key, client id and Talent identity metadata', async () => {
    const { client, fetchImpl } = buildClient();
    fetchImpl.mockResolvedValue(jsonResponse({ jobId: 'job_1', status: 'queued', operation: 'pdf.merge' }, 202));

    const job = await client.createServiceJob({
      operation: 'pdf.merge',
      uploadId: 'upl_1',
      idempotencyKey: 'talent-proj-1-v3',
    });

    expect(job.jobId).toBe('job_1');
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://filestudio.test/api/v1/jobs');
    const headers = init.headers as Record<string, string>;
    expect(headers['Idempotency-Key']).toBe('talent-proj-1-v3');
    expect(headers['X-Anclora-Client-Id']).toBe(REQUESTING_APP);
    expect(headers.Authorization).toBe('Bearer service-token');
    const body = JSON.parse(init.body as string);
    expect(body.metadata.sourceApplication).toBe(REQUESTING_APP);
  });

  test('enqueueAgentJob posts the AgentJobRecord identity fields', async () => {
    const { client, fetchImpl } = buildClient();
    fetchImpl.mockResolvedValue(jsonResponse({ id: 'ajob_1', status: 'available' }, 201));

    const result = await client.enqueueAgentJob({
      operation: 'ocr.ingest',
      input: new Uint8Array([1, 2, 3]),
      inputFilename: 'scan.pdf',
      inputMimeType: 'application/pdf',
      retentionMinutes: 60,
      timeoutMs: 240_000,
    });

    expect(result).toEqual({ id: 'ajob_1', status: 'available' });
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://filestudio.test/api/v1/agent-jobs');
    const form = init.body as FormData;
    const meta = JSON.parse(form.get('meta') as string);
    expect(meta.requestingOrg).toBe(REQUESTING_ORG);
    expect(meta.requestingApp).toBe(REQUESTING_APP);
    expect(meta.retentionMinutes).toBe(60);
    expect(meta.timeoutMs).toBe(240_000);
    expect(form.get('input')).toBeInstanceOf(Blob);
  });
});

describe('FileStudioClient retry queue', () => {
  test('retries transient 5xx with the configured backoff and succeeds', async () => {
    const { client, fetchImpl, sleep } = buildClient({ retryBackoffMs: [10, 20, 40] });
    fetchImpl
      .mockResolvedValueOnce(problemResponse('ENGINE_UNAVAILABLE', 503))
      .mockResolvedValueOnce(problemResponse('ENGINE_UNAVAILABLE', 500))
      .mockResolvedValue(jsonResponse({ jobId: 'job_9', status: 'queued', operation: 'op' }, 202));

    const job = await client.createServiceJob({
      operation: 'op',
      uploadId: 'upl_9',
      idempotencyKey: 'key-9',
    });

    expect(job.jobId).toBe('job_9');
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(sleep.mock.calls.map((call) => call[0])).toEqual([10, 20]);
  });

  test('gives up after maxRetries on persistent 5xx', async () => {
    const { client, fetchImpl, sleep } = buildClient({ retryBackoffMs: [10, 20, 40] });
    // New Response per attempt: a real fetch returns a fresh body each time.
    fetchImpl.mockImplementation(async () => problemResponse('ENGINE_UNAVAILABLE', 503));

    await expect(client.getJob('job_x')).rejects.toMatchObject({ code: 'ENGINE_UNAVAILABLE', status: 503 });
    expect(fetchImpl).toHaveBeenCalledTimes(4); // initial + 3 retries
    expect(sleep.mock.calls.map((call) => call[0])).toEqual([10, 20, 40]);
  });

  test('does not retry non-retryable contract errors', async () => {
    const { client, fetchImpl, sleep } = buildClient();
    fetchImpl.mockResolvedValue(problemResponse('IDEMPOTENCY_CONFLICT', 409));

    await expect(client.getJob('job_x')).rejects.toBeInstanceOf(FileStudioApiError);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  test('retries network errors and feeds the circuit breaker', async () => {
    const { client, fetchImpl, sleep } = buildClient({ retryBackoffMs: [1, 2, 4], maxRetries: 1 });
    fetchImpl.mockRejectedValue(new TypeError('fetch failed'));

    await expect(client.getJob('job_y')).rejects.toThrow('fetch failed');
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(1);
  });
});

describe('CircuitBreaker', () => {
  test('opens after the failure threshold and blocks requests while open', () => {
    let now = 0;
    const breaker = new CircuitBreaker({ failureThreshold: 5, cooldownMs: 60_000 }, () => now);

    for (let i = 0; i < 4; i++) breaker.onFailure();
    expect(breaker.state).toBe('closed');

    breaker.onFailure();
    expect(breaker.state).toBe('open');
    expect(() => breaker.assertCanRequest()).toThrow(FileStudioCircuitOpenError);

    now = 59_999;
    expect(breaker.state).toBe('open');
  });

  test('allows one half-open probe after cooldown and closes on success', () => {
    let now = 0;
    const breaker = new CircuitBreaker({ failureThreshold: 5, cooldownMs: 60_000 }, () => now);
    for (let i = 0; i < 5; i++) breaker.onFailure();

    now = 60_000;
    expect(breaker.state).toBe('half-open');
    breaker.assertCanRequest();
    expect(() => breaker.assertCanRequest()).toThrow(FileStudioCircuitOpenError); // one probe only

    breaker.onSuccess();
    expect(breaker.state).toBe('closed');
  });

  test('reopens when the half-open probe fails', () => {
    let now = 0;
    const breaker = new CircuitBreaker({ failureThreshold: 5, cooldownMs: 60_000 }, () => now);
    for (let i = 0; i < 5; i++) breaker.onFailure();

    now = 60_000;
    breaker.assertCanRequest();
    breaker.onFailure();
    expect(breaker.state).toBe('open');
    expect(() => breaker.assertCanRequest()).toThrow(FileStudioCircuitOpenError);
  });

  test('client short-circuits without calling fetch while the circuit is open', async () => {
    const { client, fetchImpl, advance } = buildClient({
      circuit: { failureThreshold: 2, cooldownMs: 60_000 },
      maxRetries: 0,
    });
    fetchImpl.mockResolvedValue(problemResponse('ENGINE_UNAVAILABLE', 503));

    await expect(client.getJob('a')).rejects.toBeInstanceOf(FileStudioApiError);
    await expect(client.getJob('b')).rejects.toBeInstanceOf(FileStudioApiError);
    expect(fetchImpl).toHaveBeenCalledTimes(2);

    await expect(client.getJob('c')).rejects.toBeInstanceOf(FileStudioCircuitOpenError);
    expect(fetchImpl).toHaveBeenCalledTimes(2); // no new HTTP call

    advance(61_000);
    fetchImpl.mockResolvedValue(jsonResponse({ jobId: 'c', status: 'completed', operation: 'op' }));
    await expect(client.getJob('c')).resolves.toMatchObject({ jobId: 'c' });
  });
});

describe('FileStudioClient result download', () => {
  test('downloads with a fresh single-use token', async () => {
    const { client, fetchImpl } = buildClient();
    fetchImpl
      .mockResolvedValueOnce(jsonResponse({ token: 'tok_once', expiresAt: '2030-01-01T00:00:00Z' }))
      .mockResolvedValueOnce(
        new Response(new Uint8Array([9, 8, 7]), {
          status: 200,
          headers: {
            'Content-Type': 'application/pdf',
            'X-Content-SHA256': 'abc123',
            'Content-Disposition': 'attachment; filename="merged.pdf"',
          },
        }),
      );

    const result = await client.downloadResult('job_1');

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    const [tokenUrl] = fetchImpl.mock.calls[0] as [string];
    expect(tokenUrl).toBe('https://filestudio.test/api/v1/jobs/job_1/result-token');
    const [downloadUrl] = fetchImpl.mock.calls[1] as [string];
    expect(downloadUrl).toBe('https://filestudio.test/api/v1/jobs/job_1/result?token=tok_once');
    expect(result.filename).toBe('merged.pdf');
    expect(result.sha256).toBe('abc123');
    expect(Array.from(result.bytes)).toEqual([9, 8, 7]);
  });
});

describe('FileStudioClient polling fallback', () => {
  test('polls with exponential backoff until a terminal state', async () => {
    const { client, fetchImpl, sleep } = buildClient();
    fetchImpl
      .mockResolvedValueOnce(jsonResponse({ jobId: 'j', status: 'queued', operation: 'op' }))
      .mockResolvedValueOnce(jsonResponse({ jobId: 'j', status: 'processing', operation: 'op' }))
      .mockResolvedValueOnce(jsonResponse({ jobId: 'j', status: 'completed', operation: 'op' }));

    const job = await client.pollJobStatus('j', { initialIntervalMs: 5_000, maxIntervalMs: 60_000 });

    expect(job.status).toBe('completed');
    expect(sleep.mock.calls.map((call) => call[0])).toEqual([5_000, 10_000]);
  });

  test('times out with the agent-offline mapped error code', async () => {
    const { client, fetchImpl } = buildClient();
    fetchImpl.mockResolvedValue(jsonResponse({ jobId: 'j', status: 'queued', operation: 'op' }));

    await expect(client.pollJobStatus('j', { timeoutMs: 0 })).rejects.toMatchObject({
      code: 'AGENT_OFFLINE',
    });
  });
});

describe('projectAgentStatus', () => {
  test('projects agent-internal states onto the Talent state machine', () => {
    expect(projectAgentStatus('available')).toBe('queued');
    expect(projectAgentStatus('leased')).toBe('processing');
    expect(projectAgentStatus('completed')).toBe('completed');
    expect(projectAgentStatus('failed')).toBe('failed');
    expect(projectAgentStatus('rejected')).toBe('failed');
    expect(projectAgentStatus('cancelled')).toBe('cancelled');
  });
});
