import { afterEach, describe, expect, test, vi } from 'vitest';
import {
  AiProviderError,
  NullProvider,
  OpenAIProvider,
  getAiProvider,
  isAiCloudEnabled,
} from './provider';

const REQUEST = {
  prompt: 'Fix this violation',
  schema: { type: 'object', properties: { summary: { type: 'string' } } },
};

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('AI provider feature flag', () => {
  test('is disabled without OPENAI_API_KEY', () => {
    vi.stubEnv('OPENAI_API_KEY', '');
    expect(isAiCloudEnabled()).toBe(false);
    const provider = getAiProvider();
    expect(provider.kind).toBe('none');
    expect(provider).toBeInstanceOf(NullProvider);
  });

  test('is enabled with OPENAI_API_KEY and honors OPENAI_MODEL', () => {
    vi.stubEnv('OPENAI_API_KEY', 'sk-test');
    vi.stubEnv('OPENAI_MODEL', 'gpt-4o');
    expect(isAiCloudEnabled()).toBe(true);
    const provider = getAiProvider();
    expect(provider.kind).toBe('openai');
  });
});

describe('NullProvider', () => {
  test('resolves every completion to null (integration disabled, nothing breaks)', async () => {
    const provider = new NullProvider();
    await expect(provider.completeJson(REQUEST)).resolves.toBeNull();
  });
});

describe('OpenAIProvider', () => {
  function jsonResponse(body: unknown, ok = true, status = 200): Response {
    return {
      ok,
      status,
      json: () => Promise.resolve(body),
    } as unknown as Response;
  }

  test('posts a structured-output request and parses the JSON content', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({ choices: [{ message: { content: '{"summary":"ok"}' } }] }),
    );
    const provider = new OpenAIProvider({ apiKey: 'sk-test', model: 'gpt-4o-mini', fetchImpl });

    const result = await provider.completeJson(REQUEST);

    expect(result).toEqual({ summary: 'ok' });
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.openai.com/v1/chat/completions');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>).authorization).toBe('Bearer sk-test');
    const body = JSON.parse(String(init.body));
    expect(body.model).toBe('gpt-4o-mini');
    expect(body.response_format.type).toBe('json_schema');
    expect(body.response_format.json_schema.schema).toEqual(REQUEST.schema);
  });

  test('throws AiProviderError on HTTP failure', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({}, false, 429));
    const provider = new OpenAIProvider({ apiKey: 'sk-test', fetchImpl });

    await expect(provider.completeJson(REQUEST)).rejects.toBeInstanceOf(AiProviderError);
    await expect(provider.completeJson(REQUEST)).rejects.toMatchObject({ status: 429 });
  });

  test('throws AiProviderError when the message content is not valid JSON', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({ choices: [{ message: { content: 'not json at all' } }] }),
    );
    const provider = new OpenAIProvider({ apiKey: 'sk-test', fetchImpl });

    await expect(provider.completeJson(REQUEST)).rejects.toThrow(/not valid JSON/);
  });

  test('throws AiProviderError when the response carries no content', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ choices: [] }));
    const provider = new OpenAIProvider({ apiKey: 'sk-test', fetchImpl });

    await expect(provider.completeJson(REQUEST)).rejects.toThrow(/no message content/);
  });
});
