/**
 * AI provider abstraction — Anclora Talent (F3, governed AI over the engine).
 *
 * The engine has no AI vendor baked in: every AI capability receives an
 * `AiProvider` and works unchanged with a fake in tests. The integration is
 * feature-flagged by `OPENAI_API_KEY` (same pattern as FILESTUDIO_API_URL):
 * without a key `getAiProvider()` returns the `NullProvider`, cloud AI is
 * disabled, the UI falls back to deterministic local heuristics and nothing
 * breaks.
 *
 * Processing-mode transparency (F1b rule): callers must declare to the user
 * when an operation was processed in the cloud. `AiProvider.kind` is the
 * signal the UI uses to render the equivalent of ProcessingModeBadge.
 */

export interface AiCompletionRequest {
  /** Full prompt (instructions + context), provider-agnostic. */
  prompt: string;
  /** JSON Schema (draft-07 subset) describing the expected response object. */
  schema: Record<string, unknown>;
  /** Schema identifier for structured-output APIs. */
  schemaName?: string;
  /** Model override; defaults to the provider model. */
  model?: string;
}

export interface AiProvider {
  /** 'openai' = cloud processing · 'none' = integration disabled. */
  readonly kind: 'openai' | 'none';
  /**
   * Returns the parsed JSON response, or `null` when the integration is
   * disabled. Throws `AiProviderError` on transport/API/parse failures so
   * callers can fall back to deterministic heuristics.
   */
  completeJson(request: AiCompletionRequest): Promise<unknown | null>;
}

export class AiProviderError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'AiProviderError';
  }
}

/** Disabled provider: every completion resolves to `null`. */
export class NullProvider implements AiProvider {
  readonly kind = 'none' as const;

  async completeJson(request: AiCompletionRequest): Promise<unknown | null> {
    void request;
    return null;
  }
}

export const OPENAI_DEFAULT_MODEL = 'gpt-4o-mini';
const OPENAI_DEFAULT_BASE_URL = 'https://api.openai.com/v1';

interface OpenAIProviderOptions {
  apiKey: string;
  model?: string;
  baseUrl?: string;
  /** Injectable for tests; defaults to global fetch. */
  fetchImpl?: typeof fetch;
}

/**
 * Minimal OpenAI chat-completions client over native fetch (no SDK
 * dependency). Requests structured output (`response_format: json_schema`)
 * and returns the parsed JSON message content.
 */
export class OpenAIProvider implements AiProvider {
  readonly kind = 'openai' as const;

  private readonly apiKey: string;
  private readonly model: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: OpenAIProviderOptions) {
    this.apiKey = options.apiKey;
    this.model = options.model ?? OPENAI_DEFAULT_MODEL;
    this.baseUrl = (options.baseUrl ?? OPENAI_DEFAULT_BASE_URL).replace(/\/+$/, '');
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async completeJson(request: AiCompletionRequest): Promise<unknown> {
    const response = await this.fetchImpl(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: request.model ?? this.model,
        temperature: 0.2,
        messages: [
          {
            role: 'system',
            content:
              'You are an editorial structure assistant. Answer only with JSON matching the requested schema.',
          },
          { role: 'user', content: request.prompt },
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: request.schemaName ?? 'ai_response',
            strict: true,
            schema: request.schema,
          },
        },
      }),
    });

    if (!response.ok) {
      throw new AiProviderError(`OpenAI request failed with status ${response.status}`, response.status);
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new AiProviderError('OpenAI response was not valid JSON');
    }

    const content = (payload as {
      choices?: Array<{ message?: { content?: string } }>;
    })?.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || !content.trim()) {
      throw new AiProviderError('OpenAI response carried no message content');
    }

    try {
      return JSON.parse(content) as unknown;
    } catch {
      throw new AiProviderError('OpenAI message content was not valid JSON');
    }
  }
}

/** Feature flag (FILESTUDIO_API_URL pattern): cloud AI only with a key. */
export function isAiCloudEnabled(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

/**
 * Resolves the active provider from the environment. `OPENAI_MODEL` selects
 * the model (default gpt-4o-mini). Without `OPENAI_API_KEY` the integration
 * is disabled (`NullProvider`).
 */
export function getAiProvider(): AiProvider {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return new NullProvider();
  return new OpenAIProvider({
    apiKey,
    model: process.env.OPENAI_MODEL ?? OPENAI_DEFAULT_MODEL,
  });
}
