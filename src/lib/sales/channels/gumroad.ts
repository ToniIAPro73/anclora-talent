/**
 * Gumroad sales channel (F4) — push client.
 *
 * Verified against the LIVE Gumroad source code (2026-08, `main`):
 * - `config/routes.rb`: `resources :links, path: "products", only: [:index,
 *   :show, :update, :create, :destroy]` inside the `v2` scope, drawn both on
 *   `api.gumroad.com` and `gumroad.com/api`.
 *   https://github.com/antiwork/gumroad/blob/main/config/routes.rb
 * - `Api::V2::LinksController#create`: Doorkeeper scope `edit_products`;
 *   products are ALWAYS created as draft (`@product.draft = true`,
 *   `purchase_disabled_at = Time.current`) — exactly the "create draft
 *   product" push this channel needs. Accepted params: `name`, `price`
 *   (cents), `description` (HTML), `native_type` ("ebook" is valid; legacy
 *   podcast/newsletter/audiobook and physical are rejected), `tags` (array of
 *   strings), `custom_permalink`, `custom_summary`, `price_currency_type`.
 *   https://github.com/antiwork/gumroad/blob/main/app/controllers/api/v2/links_controller.rb
 * - `Link::NATIVE_TYPES_TO_TAX_CODE` (app/models/link.rb): "ebook" is a
 *   first-class native type; LEGACY_TYPES = podcast/newsletter/audiobook.
 *
 * NOTE — stale official docs: the Mintlify mirror
 * (https://antiwork-gumroad-98.mintlify.app/api/products/create) currently
 * claims `POST /v2/products` "is not implemented and returns 404". The routes
 * and controller above contradict it; code wins (same policy as the
 * FileStudio integration's documented contract gaps).
 *
 * Auth: user-generated OAuth access token (Gumroad → Settings → Advanced →
 * Applications) sent as `Authorization: Bearer <token>`.
 * Responses: `{ success: true, product: {...} }`; logical errors come back as
 * `{ success: false, message }` (often with HTTP 200) — both are handled.
 *
 * Shape mirrors filestudio/client.ts: injected fetch/sleep/now, retries with
 * backoff on transient failures only, shared circuit breaker.
 */

import { CircuitBreaker, type CircuitBreakerOptions } from '@/lib/filestudio/client';

export const GUMROAD_API_BASE_URL = 'https://api.gumroad.com';

export type GumroadErrorCode = 'AUTH' | 'VALIDATION' | 'TRANSIENT';

export class GumroadApiError extends Error {
  constructor(
    public readonly code: GumroadErrorCode,
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'GumroadApiError';
  }
}

/** Raised when the circuit breaker is open and no request is attempted. */
export class GumroadCircuitOpenError extends Error {
  constructor(public readonly retryAfterMs: number) {
    super('Gumroad circuit breaker is open');
    this.name = 'GumroadCircuitOpenError';
  }
}

export interface GumroadClientDeps {
  /** Per-user access token provider (decrypted credentials server-side). */
  tokenProvider: () => Promise<string>;
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
  /** Retries per request on transient failures (network / 5xx / 429). */
  maxRetries?: number;
  retryBackoffMs?: number[];
  circuit?: Partial<CircuitBreakerOptions>;
}

export interface CreateDraftProductInput {
  name: string;
  /** Price in the smallest currency unit (cents). */
  priceCents: number;
  /** HTML description (see launch-kit buildProductDescriptionHtml). */
  descriptionHtml: string;
  tags?: string[];
  customSummary?: string;
  /** ISO currency code; omitted → the seller's account default. */
  priceCurrencyType?: string;
}

export interface GumroadProduct {
  id: string;
  name: string;
  shortUrl: string | null;
  published: boolean;
}

const DEFAULT_RETRY_BACKOFF_MS = [5_000, 30_000, 120_000];

interface GumroadProblemBody {
  success?: boolean;
  message?: string;
  product?: {
    id?: string;
    name?: string;
    short_url?: string | null;
    published?: boolean;
  };
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class GumroadClient {
  private readonly fetchImpl: typeof fetch;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly maxRetries: number;
  private readonly retryBackoffMs: number[];
  readonly circuit: CircuitBreaker;

  constructor(private readonly deps: GumroadClientDeps) {
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

  private assertCircuit(): void {
    try {
      this.circuit.assertCanRequest();
    } catch (error) {
      if (error instanceof Error && 'retryAfterMs' in error) {
        throw new GumroadCircuitOpenError((error as { retryAfterMs: number }).retryAfterMs);
      }
      throw error;
    }
  }

  /**
   * One HTTP call with retry queue + circuit breaker. Only transient failures
   * (network, 5xx, 429) consume retries; 4xx and `success:false` payloads are
   * contract/auth errors and fail immediately.
   */
  private async request<T>(
    method: string,
    path: string,
    options: { body?: unknown } = {},
  ): Promise<T> {
    const token = await this.deps.tokenProvider();
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      this.assertCircuit();

      let response: Response;
      try {
        response = await this.fetchImpl(`${GUMROAD_API_BASE_URL}${path}`, {
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

      const body = (await response.json().catch(() => null)) as GumroadProblemBody | null;

      if (response.ok && body?.success !== false) {
        this.circuit.onSuccess();
        return body as T;
      }

      const message = body?.message ?? `HTTP ${response.status}`;
      const error =
        response.status === 401 || response.status === 403 || /unauthor/i.test(message)
          ? new GumroadApiError('AUTH', message, response.status)
          : new GumroadApiError('VALIDATION', message, response.status);

      const transient = response.status >= 500 || response.status === 429;
      if (!transient) {
        // Contract/auth errors are caller bugs or revoked tokens, not Gumroad
        // health signals: they never open the circuit.
        throw error;
      }

      this.circuit.onFailure();
      lastError = new GumroadApiError('TRANSIENT', message, response.status);
      if (attempt < this.maxRetries) {
        await this.sleep(this.backoffFor(attempt));
        continue;
      }
      throw lastError;
    }

    throw lastError ?? new Error('Gumroad request failed');
  }

  private backoffFor(attempt: number): number {
    return this.retryBackoffMs[Math.min(attempt, this.retryBackoffMs.length - 1)];
  }

  /**
   * POST /v2/products — creates the product as DRAFT (Gumroad sets
   * `draft=true` + `purchase_disabled_at` server-side; the seller publishes
   * it manually from the dashboard after reviewing the sheet).
   */
  async createDraftProduct(input: CreateDraftProductInput): Promise<GumroadProduct> {
    const body: Record<string, unknown> = {
      name: input.name,
      price: input.priceCents,
      description: input.descriptionHtml,
      // "ebook" is a first-class native type (Link::NATIVE_TYPES); physical
      // and the legacy types are rejected by the create action.
      native_type: 'ebook',
    };
    if (input.tags && input.tags.length > 0) body.tags = input.tags;
    if (input.customSummary) body.custom_summary = input.customSummary;
    if (input.priceCurrencyType) body.price_currency_type = input.priceCurrencyType;

    const response = await this.request<GumroadProblemBody>('POST', '/v2/products', { body });
    const product = response?.product;
    if (!product?.id) {
      throw new GumroadApiError('VALIDATION', 'Gumroad response did not include the product', 200);
    }
    return {
      id: product.id,
      name: product.name ?? input.name,
      shortUrl: product.short_url ?? null,
      published: product.published ?? false,
    };
  }

  /** GET /v2/products — light read used to verify the token is valid. */
  async verifyToken(): Promise<{ ok: true }> {
    await this.request('GET', '/v2/products');
    return { ok: true };
  }
}
