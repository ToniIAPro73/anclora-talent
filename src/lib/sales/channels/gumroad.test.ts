import { describe, expect, test, vi } from 'vitest';
import {
  GUMROAD_API_BASE_URL,
  GumroadApiError,
  GumroadCircuitOpenError,
  GumroadClient,
} from './gumroad';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function buildClient(overrides: Partial<ConstructorParameters<typeof GumroadClient>[0]> = {}) {
  const fetchImpl = vi.fn<typeof fetch>();
  const sleep = vi.fn<(ms: number) => Promise<void>>().mockResolvedValue(undefined);
  let now = 1_000_000;
  const client = new GumroadClient({
    tokenProvider: async () => 'gumroad-user-token',
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

describe('GumroadClient.createDraftProduct', () => {
  test('POSTs the documented payload to /v2/products with the bearer token', async () => {
    const { client, fetchImpl } = buildClient();
    fetchImpl.mockResolvedValue(
      jsonResponse({
        success: true,
        product: { id: 'abc==', name: 'Éxito sin compañía', short_url: 'https://gum.co/l/exito', published: false },
      }),
    );

    const product = await client.createDraftProduct({
      name: 'Éxito sin compañía',
      priceCents: 900,
      descriptionHtml: '<p>Descripción</p><ul><li>Bullet</li></ul>',
      tags: ['ensayo', 'relaciones'],
      customSummary: 'Resumen corto',
    });

    expect(product).toEqual({
      id: 'abc==',
      name: 'Éxito sin compañía',
      shortUrl: 'https://gum.co/l/exito',
      published: false,
    });

    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${GUMROAD_API_BASE_URL}/v2/products`);
    expect(init.method).toBe('POST');
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer gumroad-user-token');
    // Payload pinned against Api::V2::LinksController#create (price in cents,
    // description as HTML, native_type ebook, tags array of strings).
    expect(JSON.parse(init.body as string)).toEqual({
      name: 'Éxito sin compañía',
      price: 900,
      description: '<p>Descripción</p><ul><li>Bullet</li></ul>',
      native_type: 'ebook',
      tags: ['ensayo', 'relaciones'],
      custom_summary: 'Resumen corto',
    });
  });

  test('maps success:false payloads to a non-retryable VALIDATION error', async () => {
    const { client, fetchImpl, sleep } = buildClient();
    fetchImpl.mockResolvedValue(jsonResponse({ success: false, message: 'Name has already been taken' }));

    await expect(
      client.createDraftProduct({ name: 'X', priceCents: 100, descriptionHtml: '<p>x</p>' }),
    ).rejects.toMatchObject({ name: 'GumroadApiError', code: 'VALIDATION' });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  test('maps 401/403 to AUTH without consuming retries', async () => {
    const { client, fetchImpl, sleep } = buildClient();
    fetchImpl.mockResolvedValue(jsonResponse({ success: false, message: 'Unauthorized' }, 401));

    const error = await client
      .createDraftProduct({ name: 'X', priceCents: 100, descriptionHtml: '<p>x</p>' })
      .catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(GumroadApiError);
    expect((error as GumroadApiError).code).toBe('AUTH');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  test('retries transient failures with backoff, then succeeds', async () => {
    const { client, fetchImpl, sleep } = buildClient();
    fetchImpl
      .mockRejectedValueOnce(new TypeError('network down'))
      .mockResolvedValueOnce(jsonResponse({ success: false, message: 'rate limited' }, 429))
      .mockResolvedValue(
        jsonResponse({ success: true, product: { id: 'p1', name: 'X', published: false } }),
      );

    const product = await client.createDraftProduct({
      name: 'X',
      priceCents: 100,
      descriptionHtml: '<p>x</p>',
    });

    expect(product.id).toBe('p1');
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(sleep.mock.calls.map(([ms]) => ms)).toEqual([5_000, 30_000]);
  });

  test('opens the circuit after the failure threshold and rejects without fetching', async () => {
    const { client, fetchImpl } = buildClient({
      maxRetries: 0,
      circuit: { failureThreshold: 2, cooldownMs: 60_000 },
    });
    fetchImpl.mockResolvedValue(jsonResponse({ success: false, message: 'boom' }, 500));

    await expect(client.verifyToken()).rejects.toMatchObject({ code: 'TRANSIENT' });
    await expect(client.verifyToken()).rejects.toMatchObject({ code: 'TRANSIENT' });
    await expect(client.verifyToken()).rejects.toBeInstanceOf(GumroadCircuitOpenError);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  test('a half-open probe after the cooldown closes the circuit on success', async () => {
    const { client, fetchImpl, advance } = buildClient({
      maxRetries: 0,
      circuit: { failureThreshold: 1, cooldownMs: 60_000 },
    });
    fetchImpl.mockResolvedValueOnce(jsonResponse({ success: false, message: 'boom' }, 500));
    await expect(client.verifyToken()).rejects.toMatchObject({ code: 'TRANSIENT' });

    fetchImpl.mockResolvedValue(jsonResponse({ success: true, products: [] }));
    advance(61_000);
    await expect(client.verifyToken()).resolves.toEqual({ ok: true });
  });
});
