/**
 * FileStudio API client — Talent side.
 *
 * Implements sdd/integrations/filestudio/api-flow.md:
 * - Jobs are emitted server-side only, with `Idempotency-Key` on creation.
 * - Agent-Local jobs carry the consumer identity `requestingOrg: "anclora"`,
 *   `requestingApp: "anclora-talent"` plus `retentionMinutes`/`timeoutMs`.
 * - Results download through a single-use token (TTL 15 min in FileStudio).
 * - Transient failures (network / 5xx / 429) retry up to `maxRetries` with
 *   exponential backoff (default 30 s / 2 min / 10 min).
 * - A circuit breaker opens after `failureThreshold` consecutive failures and
 *   stays open for `cooldownMs`, then allows a single half-open probe. While
 *   open, callers must keep jobs `queued` and surface "processing on hold".
 */

import {
  AGENT_OFFLINE_CODE,
  mapFileStudioError,
  type MappedFileStudioError,
} from './errors';

export const REQUESTING_ORG = 'anclora';
export const REQUESTING_APP = 'anclora-talent';

/** Talent-facing processing modes (sdd/integrations/filestudio/routing-policy.md). */
export type ProcessingMode = 'local' | 'service' | 'browser';

/** Talent-visible job states; FileStudio agent internals are projected onto these. */
export type TalentJobStatus =
  | 'queued'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'expired';

type AgentJobInternalStatus = 'available' | 'leased' | 'completed' | 'failed' | 'rejected' | 'cancelled';

/** Projects FileStudio agent-internal states onto the Talent state machine. */
export function projectAgentStatus(status: AgentJobInternalStatus): TalentJobStatus {
  switch (status) {
    case 'available':
      return 'queued';
    case 'leased':
      return 'processing';
    case 'completed':
      return 'completed';
    case 'failed':
    case 'rejected':
      return 'failed';
    case 'cancelled':
      return 'cancelled';
  }
}

export class FileStudioApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'FileStudioApiError';
  }

  get mapped(): MappedFileStudioError {
    return mapFileStudioError(this.code);
  }
}

/** Raised when the circuit breaker is open and no request is attempted. */
export class FileStudioCircuitOpenError extends Error {
  constructor(public readonly retryAfterMs: number) {
    super('FileStudio circuit breaker is open');
    this.name = 'FileStudioCircuitOpenError';
  }
}

const DEFAULT_RETRY_BACKOFF_MS = [30_000, 120_000, 600_000];

/** Error codes that must never be retried (api-flow.md). */
const NON_RETRYABLE_CODES = new Set([
  'IDEMPOTENCY_CONFLICT',
  'OUTPUT_HASH_MISMATCH',
  'UPLOAD_TOO_LARGE',
  'VALIDATION_FAILED',
  'AUTH_INSUFFICIENT_SCOPE',
]);

export interface CircuitBreakerOptions {
  /** Consecutive failures that open the circuit (api-flow.md proposes 5). */
  failureThreshold: number;
  /** How long the circuit stays open before a half-open probe (60 s). */
  cooldownMs: number;
}

export type CircuitState = 'closed' | 'open' | 'half-open';

export class CircuitBreaker {
  private consecutiveFailures = 0;
  private openedAt: number | null = null;
  private halfOpenInFlight = false;

  constructor(
    private readonly options: CircuitBreakerOptions,
    private readonly now: () => number,
  ) {}

  get state(): CircuitState {
    if (this.openedAt === null) return 'closed';
    if (this.now() - this.openedAt >= this.options.cooldownMs) return 'half-open';
    return 'open';
  }

  /** Milliseconds until a half-open probe is allowed (0 when not open). */
  get retryAfterMs(): number {
    if (this.openedAt === null) return 0;
    return Math.max(0, this.options.cooldownMs - (this.now() - this.openedAt));
  }

  /** Throws FileStudioCircuitOpenError when the request must not be attempted. */
  assertCanRequest(): void {
    const state = this.state;
    if (state === 'open') {
      throw new FileStudioCircuitOpenError(this.retryAfterMs);
    }
    if (state === 'half-open') {
      if (this.halfOpenInFlight) {
        throw new FileStudioCircuitOpenError(this.retryAfterMs);
      }
      this.halfOpenInFlight = true;
    }
  }

  onSuccess(): void {
    this.consecutiveFailures = 0;
    this.openedAt = null;
    this.halfOpenInFlight = false;
  }

  onFailure(): void {
    this.halfOpenInFlight = false;
    this.consecutiveFailures += 1;
    if (this.openedAt !== null && this.state !== 'open') {
      // Failed half-open probe: reopen immediately.
      this.openedAt = this.now();
      return;
    }
    if (this.consecutiveFailures >= this.options.failureThreshold) {
      this.openedAt = this.now();
    }
  }
}

export interface FileStudioClientDeps {
  baseUrl: string;
  tokenProvider: () => Promise<string>;
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
  /** Retries per request on transient failures (api-flow.md: 3). */
  maxRetries?: number;
  retryBackoffMs?: number[];
  circuit?: Partial<CircuitBreakerOptions>;
}

export interface UploadRecord {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
}

export interface ServiceJobRecord {
  jobId: string;
  status: string;
  operation: string;
}

export interface AgentJobEnqueueInput {
  operation: string;
  /** Raw bytes already materialized by Talent (never the AST). */
  input: Uint8Array;
  inputFilename: string;
  inputMimeType: string;
  options?: Record<string, unknown>;
  retentionMinutes: number;
  timeoutMs: number;
  /** Optional device pinning; otherwise any paired device may lease the job. */
  deviceId?: string;
  workspaceId?: string;
}

export interface AgentJobEnqueueResult {
  id: string;
  status: AgentJobInternalStatus;
}

/** Response of the pairing approval endpoint (tokens issued to the device). */
export interface PairingApproval {
  deviceId: string;
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: number;
  refreshTokenExpiresAt: number;
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface ProblemBody {
  code?: string;
  title?: string;
  detail?: string;
}

export class FileStudioClient {
  private readonly fetchImpl: typeof fetch;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly maxRetries: number;
  private readonly retryBackoffMs: number[];
  readonly circuit: CircuitBreaker;

  constructor(private readonly deps: FileStudioClientDeps) {
    this.fetchImpl = deps.fetchImpl ?? fetch;
    this.sleep = deps.sleep ?? defaultSleep;
    this.maxRetries = deps.maxRetries ?? 3;
    this.retryBackoffMs = deps.retryBackoffMs ?? DEFAULT_RETRY_BACKOFF_MS;
    this.circuit = new CircuitBreaker(
      {
        failureThreshold: deps.circuit?.failureThreshold ?? 5,
        cooldownMs: deps.circuit?.cooldownMs ?? 60_000,
      },
      deps.now ?? Date.now,
    );
  }

  private get baseUrl(): string {
    return this.deps.baseUrl.replace(/\/+$/, '');
  }

  /**
   * Performs one HTTP call with retry queue + circuit breaker.
   * Only transient failures (network, 5xx, 429) consume retries.
   */
  private async request<T>(
    method: string,
    path: string,
    options: { body?: unknown; headers?: Record<string, string>; idempotencyKey?: string } = {},
  ): Promise<T> {
    const token = await this.deps.tokenProvider();
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-Anclora-Client-Id': REQUESTING_APP,
      ...options.headers,
    };
    if (options.idempotencyKey) {
      headers['Idempotency-Key'] = options.idempotencyKey;
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      this.circuit.assertCanRequest();

      let response: Response;
      try {
        response = await this.fetchImpl(`${this.baseUrl}${path}`, {
          method,
          headers,
          body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
        });
      } catch (networkError) {
        this.circuit.onFailure();
        lastError = networkError instanceof Error ? networkError : new Error(String(networkError));
        if (attempt < this.maxRetries) {
          await this.sleep(this.backoffFor(attempt));
          continue;
        }
        throw lastError;
      }

      if (response.ok) {
        this.circuit.onSuccess();
        if (response.status === 204) return undefined as T;
        return (await response.json()) as T;
      }

      const problem = (await response.json().catch(() => null)) as ProblemBody | null;
      const code = problem?.code ?? 'UNKNOWN';
      const message = problem?.detail ?? problem?.title ?? `HTTP ${response.status}`;
      const error = new FileStudioApiError(code, message, response.status);

      const transient = response.status >= 500 || response.status === 429;
      if (!transient) {
        // 4xx: only count auth/infra failures towards the circuit; validation
        // and contract errors are emitter bugs, not FileStudio health signals.
        if (!NON_RETRYABLE_CODES.has(code)) {
          this.circuit.onFailure();
        }
        throw error;
      }

      this.circuit.onFailure();
      lastError = error;
      if (attempt < this.maxRetries) {
        await this.sleep(this.backoffFor(attempt));
        continue;
      }
      throw error;
    }

    throw lastError ?? new Error('FileStudio request failed');
  }

  private backoffFor(attempt: number): number {
    return this.retryBackoffMs[Math.min(attempt, this.retryBackoffMs.length - 1)];
  }

  /** POST /api/v1/uploads — Service API route. */
  async uploadFile(file: Blob, filename: string): Promise<UploadRecord> {
    const token = await this.deps.tokenProvider();
    const form = new FormData();
    form.append('file', file, filename);

    this.circuit.assertCanRequest();
    const response = await this.fetchImpl(`${this.baseUrl}/api/v1/uploads`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'X-Anclora-Client-Id': REQUESTING_APP },
      body: form,
    });

    if (!response.ok) {
      this.circuit.onFailure();
      const problem = (await response.json().catch(() => null)) as ProblemBody | null;
      throw new FileStudioApiError(
        problem?.code ?? 'UNKNOWN',
        problem?.detail ?? problem?.title ?? `HTTP ${response.status}`,
        response.status,
      );
    }

    this.circuit.onSuccess();
    return (await response.json()) as UploadRecord;
  }

  /** POST /api/v1/jobs — Service API route, idempotency key mandatory. */
  async createServiceJob(input: {
    operation: string;
    uploadId: string;
    idempotencyKey: string;
    options?: Record<string, unknown>;
    webhookEndpointId?: string;
    metadata?: Record<string, string>;
  }): Promise<ServiceJobRecord> {
    return this.request<ServiceJobRecord>('POST', '/api/v1/jobs', {
      body: {
        operation: input.operation,
        input: { uploadId: input.uploadId },
        options: input.options ?? {},
        callback: input.webhookEndpointId ? { webhookEndpointId: input.webhookEndpointId } : undefined,
        idempotencyKey: input.idempotencyKey,
        metadata: { sourceApplication: REQUESTING_APP, ...input.metadata },
      },
      idempotencyKey: input.idempotencyKey,
    });
  }

  /**
   * Enqueues an Agent-Local job with the Talent consumer identity.
   *
   * NOTE: FileStudio currently creates AgentJobRecords internally only; the
   * public `POST /api/v1/agent-jobs` endpoint is a documented gap of the
   * versioned contract (sdd/integrations/filestudio/api-flow.md). This method
   * already speaks the agreed payload so the wiring is a no-op once the
   * endpoint lands.
   */
  async enqueueAgentJob(input: AgentJobEnqueueInput): Promise<AgentJobEnqueueResult> {
    const form = new FormData();
    form.append(
      'input',
      new Blob([input.input.buffer as ArrayBuffer], { type: input.inputMimeType }),
      input.inputFilename,
    );
    form.append(
      'meta',
      JSON.stringify({
        operation: input.operation,
        options: input.options ?? {},
        requestingOrg: REQUESTING_ORG,
        requestingApp: REQUESTING_APP,
        retentionMinutes: input.retentionMinutes,
        timeoutMs: input.timeoutMs,
        deviceId: input.deviceId,
        workspaceId: input.workspaceId,
        inputFilename: input.inputFilename,
        inputMimeType: input.inputMimeType,
      }),
    );

    const token = await this.deps.tokenProvider();
    this.circuit.assertCanRequest();
    const response = await this.fetchImpl(`${this.baseUrl}/api/v1/agent-jobs`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'X-Anclora-Client-Id': REQUESTING_APP },
      body: form,
    });

    if (!response.ok) {
      this.circuit.onFailure();
      const problem = (await response.json().catch(() => null)) as ProblemBody | null;
      throw new FileStudioApiError(
        problem?.code ?? 'UNKNOWN',
        problem?.detail ?? problem?.title ?? `HTTP ${response.status}`,
        response.status,
      );
    }

    this.circuit.onSuccess();
    return (await response.json()) as AgentJobEnqueueResult;
  }

  /** GET /api/v1/jobs/:id — status read shared by webhook gap-filling and polling. */
  async getJob(jobId: string): Promise<ServiceJobRecord> {
    return this.request<ServiceJobRecord>('GET', `/api/v1/jobs/${jobId}`);
  }

  /** POST /api/v1/jobs/:id/cancel. */
  async cancelJob(jobId: string): Promise<void> {
    await this.request('POST', `/api/v1/jobs/${jobId}/cancel`);
  }

  /**
   * POST /api/v1/admin/agent-pairing-requests/:requestId/approve
   * (scope `filestudio:admin`). Approves a Local Agent pairing with the
   * 6-digit code shown by the agent; the response carries the device tokens.
   */
  async approvePairing(requestId: string, code: string): Promise<PairingApproval> {
    return this.request<PairingApproval>(
      'POST',
      `/api/v1/admin/agent-pairing-requests/${encodeURIComponent(requestId)}/approve`,
      { body: { code } },
    );
  }

  /** POST /api/v1/jobs/:id/result-token — single-use download token (TTL 15 min). */
  async createDownloadToken(jobId: string): Promise<{ token: string; expiresAt: string }> {
    return this.request('POST', `/api/v1/jobs/${jobId}/result-token`);
  }

  /**
   * Downloads the result with a fresh single-use token. The token is used
   * exactly once server-side and discarded immediately (authentication.md).
   */
  async downloadResult(jobId: string): Promise<{
    bytes: Uint8Array;
    sha256: string;
    filename: string;
    mimeType: string;
  }> {
    const { token } = await this.createDownloadToken(jobId);

    this.circuit.assertCanRequest();
    const response = await this.fetchImpl(
      `${this.baseUrl}/api/v1/jobs/${jobId}/result?token=${encodeURIComponent(token)}`,
      { method: 'GET' },
    );

    if (!response.ok) {
      this.circuit.onFailure();
      const problem = (await response.json().catch(() => null)) as ProblemBody | null;
      throw new FileStudioApiError(
        problem?.code ?? 'JOB_NOT_FOUND',
        problem?.detail ?? problem?.title ?? `HTTP ${response.status}`,
        response.status,
      );
    }

    this.circuit.onSuccess();
    const sha256 = response.headers.get('X-Content-SHA256') ?? '';
    const disposition = response.headers.get('Content-Disposition') ?? '';
    const filename = disposition.match(/filename="([^"]+)"/)?.[1] ?? 'result';
    const mimeType = response.headers.get('Content-Type') ?? 'application/octet-stream';
    const bytes = new Uint8Array(await response.arrayBuffer());
    return { bytes, sha256, filename, mimeType };
  }

  /**
   * Polling fallback (api-flow.md): exponential backoff 5 s → 60 s, capped at
   * 10 min, only while the job is active. Used when no webhook arrived.
   */
  async pollJobStatus(
    jobId: string,
    options: { timeoutMs?: number; initialIntervalMs?: number; maxIntervalMs?: number } = {},
  ): Promise<ServiceJobRecord> {
    const timeoutMs = options.timeoutMs ?? 600_000;
    let interval = options.initialIntervalMs ?? 5_000;
    const maxInterval = options.maxIntervalMs ?? 60_000;
    const startedAt = Date.now();
    const terminal = new Set(['completed', 'failed', 'cancelled', 'expired', 'rejected']);

    while (Date.now() - startedAt < timeoutMs) {
      const job = await this.getJob(jobId);
      if (terminal.has(job.status)) return job;
      await this.sleep(interval);
      interval = Math.min(interval * 2, maxInterval);
    }

    throw new FileStudioApiError(
      AGENT_OFFLINE_CODE,
      `Job ${jobId} did not reach a terminal state within ${timeoutMs}ms`,
      408,
    );
  }
}
